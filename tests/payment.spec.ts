import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, Dictionary, beginCell, fromNano, toNano } from '@ton/core';
import { Master } from '../wrappers/Master';
import { Wallet } from '../wrappers/Wallet';
import { Payment } from '../wrappers/Payment';

import '@ton/test-utils';
import { compile } from '@ton/blueprint';

type TonWallet = SandboxContract<TreasuryContract>;
type JettonWallet = SandboxContract<Wallet>;

// @ts-ignore
BigInt.prototype.toJSON = function () {
    return this.toString();
};

describe('payment', () => {

    let blockchain: Blockchain;
    let jettonMaster: SandboxContract<Master>;


    let jettonMasterCode: Cell;
    let jettonWalletCode: Cell;
    let paymentCode: Cell;

    let admin: TonWallet;               // sender
    let bob: TonWallet;                 // recipient

    let adminWallet: JettonWallet;
    let bobWallet: JettonWallet;

    let paymentContract: SandboxContract<Payment>;

    let paymentWallet: JettonWallet;

    beforeAll(async () => {
        jettonMasterCode = await compile('Master');
        jettonWalletCode = await compile('Wallet');
        paymentCode = await compile('Payment');
    });

    beforeEach(async () => {

        blockchain = await Blockchain.create();

        admin = await blockchain.treasury('admin', { balance: toNano('3') });
        bob = await blockchain.treasury('bob', { balance: toNano('3') });

        // payment: await compile('Payment'),
        jettonMaster = blockchain.openContract<Master>(
            Master.createFromConfig(
                {
                    totalSupply: 0,
                    adminAddress: admin.address,
                    content: beginCell().storeUint(1, 1).endCell(),
                    jettonWalletCode: jettonWalletCode,
                },
                jettonMasterCode,
            ),
        );
        await jettonMaster.sendDeploy(admin.getSender(), toNano('0.2'));


        paymentContract = blockchain.openContract<Payment>(
            Payment.createFromConfig(
                {
                    owner: admin.address,
                    fee: toNano('0.01'),
                },
                paymentCode,
            ),
        );
      
        bobWallet = blockchain.openContract<Wallet>(
            Wallet.createFromAddress(await jettonMaster.getWalletAddress(bob.address)),
        );

        adminWallet = blockchain.openContract<Wallet>(
            Wallet.createFromAddress(await jettonMaster.getWalletAddress(admin.address)),
        );

        paymentWallet = blockchain.openContract<Wallet>(
            Wallet.createFromAddress(await jettonMaster.getWalletAddress(paymentContract.address)),
        );


        await adminWallet.sendDeploy(admin.getSender(), toNano('0.2'));
        await bobWallet.sendDeploy(admin.getSender(), toNano('0.2'));
        await paymentWallet.sendDeploy(admin.getSender(), toNano('0.2'));

        await jettonMaster.sendMintJettons(admin.getSender(), toNano("1"));

    });

    it('should transfer (with excesses & with notification)', async () => {

        const admin_balance = await admin.getBalance();
        // console.log('admin ton balance:', fromNano(admin_balance.toString()));

        const adminJettonData = await adminWallet.getWalletData();
        // console.log('admin jetton balance:', fromNano(adminJettonData.balance.toString()));

        await adminWallet.sendTransfer(admin.getSender(), {
            toAddress: paymentContract.address,
            value: toNano('0.5'),
            jettonAmount: toNano('2'),
            fwdAmount: toNano('0.2'),
            fwdPayload: beginCell().endCell(),
            responseAddress: paymentContract.address,
        });


        const payment_alance = await paymentContract.getBalance();
        // console.log('payment ton balace2:', fromNano(payment_alance.toString()));

        const paymentWalletData = await paymentWallet.getWalletData();

        // console.log('paymentWalletData balace2:', fromNano( paymentWalletData.balance.toString()));

        expect(paymentWalletData.balance).toBe(toNano('2'));
    });



});
