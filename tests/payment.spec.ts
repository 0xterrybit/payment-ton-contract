import { Blockchain, SandboxContract, TreasuryContract, prettyLogTransaction, printTransactionFees } from '@ton/sandbox';
import { toNano, Address, Dictionary, DictionaryValue, beginCell, fromNano, Cell, Builder } from '@ton/core';

import {
    Payment,
    SendInfo,
    storeSendInfo,
    loadSendInfo,
    // PayTon,
} from '../wrappers/Payment';

import '@ton/test-utils';

import { JettonWallet } from '../build/JettonWallet/tact_JettonWallet';


import { JettonMaster } from '../build/JettonMaster/tact_JettonMaster';
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

    let usdtJettonMaster: SandboxContract<JettonMaster>;
    let deployerJettonWallet: SandboxContract<JettonWallet>;

    let rnsPayment: SandboxContract<Payment>;
    let rnsPaymentWallet: SandboxContract<JettonWallet>;

    // let code: Cell;

    let sender: SandboxContract<TreasuryContract>;
    let recipient: SandboxContract<TreasuryContract>;
    let feeRecipient: SandboxContract<TreasuryContract>;
    
    beforeEach(async () => {

        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        expect(await deployer.getBalance()).toBe(toNano(1000000))

        // ============================================================ //
        // CREATE TEST USDT JETTON
        usdtJettonMaster = blockchain.openContract(
            await JettonMaster.fromInit(
                deployer.address,
                buildOnchainMetadata(usdt_metadata),
                toNano(100000000)
            )
        );

        // mint 100 jetton token to deployer
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

        const deployJettonWalletAddress = await usdtJettonMaster.getGetWalletAddress(deployer.address);
        deployerJettonWallet = blockchain.openContract(await JettonWallet.fromAddress(deployJettonWalletAddress));

        
        // Create wallet for payment contract
        const rnsPaymentWalletAddress = await usdtJettonMaster.getGetWalletAddress(rnsPayment.address);
        rnsPaymentWallet = blockchain.openContract(await JettonWallet.fromAddress(rnsPaymentWalletAddress));
        


        sender = await blockchain.treasury("sender", { balance: toNano(100) });
        recipient = await blockchain.treasury('recipient', { balance: 0n });
        feeRecipient = await blockchain.treasury('feeRecipient', { balance: 0n });

    });


    it('should send native TONs to different addresses', async () => {

     
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
                value: toNano(50.04)
            },
            {
                $$type: 'PayTon',
                queryId: 0n,
                length: 2n,
                sendInfo: dict
            }
        )

        expect(transferResult.transactions).toHaveTransaction({
            from: sender.address,
            to: rnsPayment.address,
            success: true,
        });

        console.log('recipient.getBalance():', await recipient.getBalance());

        // expect(await recipient.getBalance()).toBe(toNano(48))
        // expect(await feeRecipient.getBalance()).toBe(toNano(2))
    });

    it('should send USDT Jettons to different addresses', async () => {

        const inner_op = 0x60;
        const batchTransferPayload = (
            {
                recipient,
                value,
                feeRecipient,
                feeValue
            }:  {
                recipient: Address,
                value: bigint,
                feeRecipient: Address,
                feeValue: bigint
            }
        ) => {

            let dict: Dictionary<bigint, SendInfo> = Dictionary.empty();

            let recipient_sendInfo: SendInfo = {
                $$type: 'SendInfo',
                recipient: recipient,
                value: value,
            };

            let fee_recipient_sendInfo: SendInfo = {
                $$type: 'SendInfo',
                recipient: feeRecipient,
                value: feeValue,
            }

            dict.set(BigInt(0), recipient_sendInfo)
            dict.set(BigInt(1), fee_recipient_sendInfo)

            const totalLength = dict.keys().length

            let payload = beginCell()
                .storeUint(inner_op, 8)
                .storeUint(totalLength, 64)
                .storeRef(
                    beginCell()
                        .storeDict(dict, Dictionary.Keys.BigInt(257), dictValueParserSendInfo())
                        .endCell()
                )
                .endCell();

            return payload;

        }

        const sender = await blockchain.treasury("sender", { balance: toNano(100) });

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
        const senderJettonWallet = blockchain.openContract(JettonWallet.fromAddress(senderJettonWalletAddress));


        // recipient's ton wallet address
        const recipient = await blockchain.treasury('recipient', { balance: 0n });
        const feeRecipient = await blockchain.treasury('feeRecipient', { balance: 0n });

        let batch_transfer_payload = batchTransferPayload(
            {
                recipient: recipient.address, 
                value: toNano(0.8), 
                feeRecipient: feeRecipient.address,
                feeValue: toNano(0.2)
            })

        const transferResult = await senderJettonWallet.send(
            sender.getSender(),
            {
                value: toNano("0.1") * BigInt(2) + toNano(0.02) + toNano('1') * BigInt(2)
            },
            {
                $$type: "TokenTransfer",
                queryId: 0n,
                amount: toNano(1),
                destination: rnsPayment.address,
                response_destination: sender.address,
                custom_payload: null,
                forward_ton_amount: toNano("0.08") * BigInt(2) + toNano('0.02') + (toNano("0.0086") * BigInt(2)),
                forward_payload: batch_transfer_payload.asSlice(),
            }
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

        // const recipientWalletAddress = await usdtJettonMaster.getGetWalletAddress(recipient.address);
        // const feeRecipientWalletAddress = await usdtJettonMaster.getGetWalletAddress(feeRecipient.address);

        const recipientWallet = blockchain.openContract(await JettonWallet.fromInit(usdtJettonMaster.address, recipient.address));
        const feeRecipientWallet = blockchain.openContract(await JettonWallet.fromInit(usdtJettonMaster.address, feeRecipient.address));

        const recipientUSDTBalance = (await recipientWallet.getGetWalletData()).balance
        const feeRecipientUSDTBalance = (await feeRecipientWallet.getGetWalletData()).balance
        const senderUSDTBalance = (await senderJettonWallet.getGetWalletData()).balance

        expect(recipientUSDTBalance).toBe(toNano(0.8))
        expect(feeRecipientUSDTBalance).toBe(toNano(0.2))
        // expect(senderUSDTBalance).toBe(toNano(0))


    });

});
