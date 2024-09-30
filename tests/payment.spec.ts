import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransaction, printTransactionFees } from '@ton/sandbox';
import { toNano, Address, Dictionary, DictionaryValue, beginCell, fromNano, Cell, Builder } from '@ton/core';

import {
    Payment,
    SendInfo,
    storeSendInfo,
    loadSendInfo,
    PayTon,
    PayTonToJetton
} from '../wrappers/Payment';

import '@ton/test-utils';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';
import { SampleJetton } from '../build/Jetton/tact_SampleJetton';
import { buildOnchainMetadata } from "../utils/jetton-helpers";

export function dictValueParserSendInfo(): DictionaryValue<SendInfo> {
    return {
        serialize: (src, buidler) => {
            buidler.storeRef(beginCell().store(storeSendInfo(src)).endCell());
        },
        parse: (src) => {
            return loadSendInfo(src.loadRef().beginParse());
        }
    }
}

const usdt_metadata = {
    name: "USDT Jetton Token",
    description: "This is description of Test USDT jetton token",
    symbol: "USDT",
    image: "https://play-lh.googleusercontent.com/ahJtMe0vfOlAu1XJVQ6rcaGrQBgtrEZQefHy7SXB7jpijKhu1Kkox90XDuH8RmcBOXNn",
};

describe('Payment', () => {

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;

    let usdtJettonMaster: SandboxContract<SampleJetton>;
    let usdtJettonWallet: SandboxContract<JettonDefaultWallet>;

    let rnsPayment: SandboxContract<Payment>;
    let rnsPaymentWallet: SandboxContract<JettonDefaultWallet>;

    // let code: Cell;

    beforeEach(async () => {

        blockchain = await Blockchain.create();

        // blockchain.verbosity = {
        //     print: true,
        //     blockchainLogs: false,
        //     vmLogs: 'none',
        //     debugLogs: true,
        // }

        deployer = await blockchain.treasury('deployer');
        expect(await deployer.getBalance()).toBe(toNano(1000000))

        // ============================================================ //
        // CREATE TEST USDT JETTON
        usdtJettonMaster = blockchain.openContract(
            await SampleJetton.fromInit(
                deployer.address,
                buildOnchainMetadata(usdt_metadata),
                toNano(100000000)
            )
        );

        // mint 100 token to deployer
        await usdtJettonMaster.send(deployer.getSender(),
            {
                value: toNano("0.05")
            },
            {
                $$type: 'Mint',
                amount: toNano(0),
                receiver: deployer.address,
            }
        );

        const jettonWalletAddress = await usdtJettonMaster.getGetWalletAddress(deployer.address);
        usdtJettonWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(jettonWalletAddress));


        // ============================================================ //
        // Deploy Payment Contract
        rnsPayment = blockchain.openContract(await Payment.fromInit(toNano(0.09)));
        await rnsPayment.send(deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        // Create wallet for payment contract
        const rnsPaymentWalletAddress = await usdtJettonMaster.getGetWalletAddress(rnsPayment.address);
        rnsPaymentWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(rnsPaymentWalletAddress));

    });


    it('should send native TONs to different senders', async () => {

        const sender = await blockchain.treasury("sender", { balance: toNano(100) });
        expect(await sender.getBalance()).toBe(toNano(100))


        // recipient's ton wallet address
        const recipient = await blockchain.treasury('recipient', { balance: 0n });
        const feeRecipient = await blockchain.treasury('feeRecipient', { balance: 0n });

        let dict: Dictionary<bigint, SendInfo> = Dictionary.empty();

        let recipient_sendInfo: SendInfo = {
            $$type: 'SendInfo',
            recipient: recipient.address,
            value: toNano(48),
        };

        let fee_recipient_sendInfo: SendInfo = {
            $$type: 'SendInfo',
            recipient: feeRecipient.address,
            value: toNano(2),
        }

        dict.set(BigInt(0), recipient_sendInfo)
        dict.set(BigInt(1), fee_recipient_sendInfo)

        let transferResult = await rnsPayment.send(
            sender.getSender(),
            {
                value: toNano(90)
            },
            {
                $$type: 'PayTon',
                queryId: BigInt(99),
                length: BigInt(5),
                sendInfo: dict
            }
        )
        
        expect(transferResult.transactions).toHaveTransaction({
            from: sender.address,
            to: rnsPayment.address,
            success: true,
        });

        expect(await recipient.getBalance()).toBe(toNano(48))
        expect(await feeRecipient.getBalance()).toBe(toNano(2))
    });

    it('should send USDT Jettons to different senders', async () => {

        const sender = await blockchain.treasury("sender", { balance: toNano(100) });

        // expect sender ton balance eq 100
        expect(await sender.getBalance()).toBe(toNano(100))

        // mint 100 usdt to sender address
        await usdtJettonMaster.send(
            deployer.getSender(),
            {
                value: toNano('0.25')
            },
            {
                $$type: "Mint",
                amount: toNano(100),
                receiver: sender.address,
            }
        );

        // sender's usdt wallet address
        const senderJettonWalletAddress = await usdtJettonMaster.getGetWalletAddress(sender.address);
        const senderJettonWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(senderJettonWalletAddress));


        // recipient's ton wallet address
        const recipient = await blockchain.treasury('recipient', { balance: 0n });
        const feeRecipient = await blockchain.treasury('feeRecipient', { balance: 0n });

        let dict: Dictionary<bigint, SendInfo> = Dictionary.empty();

        let recipient_sendInfo: SendInfo = {
            $$type: 'SendInfo',
            recipient: recipient.address,
            value: toNano(98),
        };

        let fee_recipient_sendInfo: SendInfo = {
            $$type: 'SendInfo',
            recipient: feeRecipient.address,
            value: toNano(2),
        }

        dict.set(BigInt(0), recipient_sendInfo)
        dict.set(BigInt(1), fee_recipient_sendInfo)

        let payload = beginCell()
            .storeUint(2, 64)
            .storeRef(
                beginCell()
                    .storeUint(0, 8)
                    .storeDict(dict, Dictionary.Keys.BigInt(257), dictValueParserSendInfo())
                    .endCell()
            )
            .endCell();

        const transferResult = await senderJettonWallet.send(
            sender.getSender(),
            {
                value: toNano("0.1") * BigInt(2) + toNano(0.02) + toNano('1') * BigInt(2)
            },
            {
                $$type: "TokenTransfer",
                queryId: 0n,
                amount: toNano(100),
                destination: rnsPayment.address,
                response_destination: sender.address,
                custom_payload: null,
                forward_ton_amount: toNano("0.09") * BigInt(2) + toNano('0.02') + (toNano("0.0086") * BigInt(2)),
                forward_payload: payload.asSlice(),
            },
        );

        // expect(transferResult.transactions).toHaveTransaction({
        //     from: sender.address,
        //     to: senderJettonWallet.address,
        //     success: true,
        // });

        transferResult.transactions.forEach((tx) => {
            //@ts-ignore
            if (tx.description.aborted == true) {
                console.log(tx.vmLogs);
            }
        })

        const recipientWalletAddress = await usdtJettonMaster.getGetWalletAddress(recipient.address);
        const feeRecipientWalletAddress = await usdtJettonMaster.getGetWalletAddress(feeRecipient.address);

        const recipientWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(recipientWalletAddress));
        const feeRecipientWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(feeRecipientWalletAddress));

        const recipientUSDTBalance = (await recipientWallet.getGetWalletData()).balance
        const feeRecipientUSDTBalance = (await feeRecipientWallet.getGetWalletData()).balance
        const senderUSDTBalance = (await senderJettonWallet.getGetWalletData()).balance

        expect(recipientUSDTBalance).toBe(toNano(98))
        expect(feeRecipientUSDTBalance).toBe(toNano(2))
        expect(senderUSDTBalance).toBe(toNano(0))


    });
});
