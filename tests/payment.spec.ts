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

import Prando from "prando";
import { randomAddress } from './helpers';

import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';


import { SampleJetton } from '../build/Jetton/tact_SampleJetton';
import { buildOnchainMetadata } from "../utils/jetton-helpers";
import * as router from "../contracts/router";
import BN from "bn.js";

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

// export function randomAddress(seed: string, workchain?: number) {
//     const random = new Prando(seed);
//     const hash = Buffer.alloc(32);
//     for (let i = 0; i < hash.length; i++) {
//         hash[i] = random.nextInt(0, 255);
//     }
//     return new Address(workchain ?? 0, hash);
// }

describe('Payment', () => {

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;

    let usdtJettonMaster: SandboxContract<SampleJetton>;
    let deployerJettonWallet: SandboxContract<JettonDefaultWallet>;

    let rnsPayment: SandboxContract<Payment>;
    let rnsPaymentWallet: SandboxContract<JettonDefaultWallet>;

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
            await SampleJetton.fromInit(
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
        deployerJettonWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(deployJettonWalletAddress));

        
        // Create wallet for payment contract
        const rnsPaymentWalletAddress = await usdtJettonMaster.getGetWalletAddress(rnsPayment.address);
        rnsPaymentWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(rnsPaymentWalletAddress));
        


        sender = await blockchain.treasury("sender", { balance: toNano(100) });
        recipient = await blockchain.treasury('recipient', { balance: 0n });
        feeRecipient = await blockchain.treasury('feeRecipient', { balance: 0n });

    });


    it('should send native TONs to different senders', async () => {

     
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

        // expect(await recipient.getBalance()).toBe(toNano(48))
        // expect(await feeRecipient.getBalance()).toBe(toNano(2))
    });

    it('should send USDT Jettons to different senders', async () => {

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
        const senderJettonWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(senderJettonWalletAddress));


        // recipient's ton wallet address
        const recipient = await blockchain.treasury('recipient', { balance: 0n });
        const feeRecipient = await blockchain.treasury('feeRecipient', { balance: 0n });

        let batch_transfer_payload = batchTransferPayload(
            {
                recipient: recipient.address, 
                value: toNano(98), 
                feeRecipient: feeRecipient.address,
                feeValue: toNano(2)
            })

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
                forward_payload: batch_transfer_payload.asSlice(),
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

    it("should send Jetton Swap to Jetton USDT", async () => {

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
        await usdtJettonMaster.send(
            deployer.getSender(),
            {
                value: toNano('0.25')
            },
            {
                $$type: "Mint",
                amount: toNano(0),
                receiver: recipient.address,
            }
        );
        
        // sender's usdt wallet address
        const senderJettonWalletAddress = await usdtJettonMaster.getGetWalletAddress(sender.address);
        const senderJettonWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(senderJettonWalletAddress));

        recipient = await blockchain.treasury('recipient', { balance: 0n });
        const recipientWalletAddress = await usdtJettonMaster.getGetWalletAddress(recipient.address);
        const recipientWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(recipientWalletAddress));
        
        let router = await blockchain.treasury('router', { balance: 0n });
        let router_WalletAddress = await usdtJettonMaster.getGetWalletAddress(router.address);
        let router_Wallet = blockchain.openContract(JettonDefaultWallet.fromAddress(router_WalletAddress));

        const swapPayload = beginCell()
            .storeUint(0x25938561, 32)                              // op: swap
            .storeAddress(recipientWalletAddress)                   // token_out wallet
            .storeCoins(100n)                                       // amount_out
            .storeAddress(recipient.address)                        // to address
            .storeBit(false)
            .endCell()

        let swap_op = 0x61;
        let forward_payload = beginCell()
            .storeUint(swap_op, 8)                                 // op
            .storeRef(
                beginCell()
                .storeAddress(router.address)
                .storeUint(20n, 32)
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
                forward_payload: forward_payload.asSlice(),
            }, 
        );

        console.log('transferResult:', transferResult)

        // const recipientUSDTBalance = (await recipientWallet.getGetWalletData()).balance
        // const senderUSDTBalance = (await senderJettonWallet.getGetWalletData()).balance

        // expect(recipientUSDTBalance).toBe(toNano(98))
        // expect(senderUSDTBalance).toBe(toNano(0))

    })
});
