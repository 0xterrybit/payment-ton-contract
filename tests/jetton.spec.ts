import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, Dictionary, beginCell, fromNano, toNano } from '@ton/core';
import { Master } from '../wrappers/Master';
import { Wallet } from '../wrappers/Wallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

type TonWallet = SandboxContract<TreasuryContract>;
type JettonWallet = SandboxContract<Wallet>;

// @ts-ignore
BigInt.prototype.toJSON = function () {
    return this.toString();
};

describe('jetton', () => {
    let jettonMasterCode: Cell;
    let jettonWalletCode: Cell;

    let admin: TonWallet;
    let alice: TonWallet;
    let bob: TonWallet;

    let aliceWallet: JettonWallet;
    let bobWallet: JettonWallet;
    let adminWallet: JettonWallet;

    let blockchain: Blockchain;
    let master: SandboxContract<Master>;

    beforeAll(async () => {
        jettonMasterCode = await compile('Master'); 
        jettonWalletCode = await compile('Wallet');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        admin = await blockchain.treasury('admin', { balance: toNano('3') });
        alice = await blockchain.treasury('alice', { balance: toNano('3') });
        bob = await blockchain.treasury('bob', { balance: toNano('3') });

        master = blockchain.openContract<Master>(
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

        await master.sendDeploy(admin.getSender(), toNano('0.2'));

        aliceWallet = blockchain.openContract<Wallet>(
            Wallet.createFromAddress(await master.getWalletAddress(alice.address)),
        );
        bobWallet = blockchain.openContract<Wallet>(
            Wallet.createFromAddress(await master.getWalletAddress(bob.address)),
        );
        adminWallet = blockchain.openContract<Wallet>(
            Wallet.createFromAddress(await master.getWalletAddress(admin.address)),
        );

        await aliceWallet.sendDeploy(admin.getSender(), toNano('0.2'));
        await bobWallet.sendDeploy(admin.getSender(), toNano('0.2'));
        await adminWallet.sendDeploy(admin.getSender(), toNano('0.2'));


    });

    describe('Transfers', () => {
        beforeEach(async () => {
            await master.sendMintJettons(admin.getSender(), toNano("1"));
        });

        it('should transfer (with excesses & no notification)', async () => {
            // const admin_balance = await admin.getBalance();
            // console.log('admin ton balance:', fromNano(admin_balance.toString()));

            // const adminJettonData = await adminWallet.getWalletData();
            // console.log('admin jetton balance:', fromNano(adminJettonData.balance.toString()));

            await adminWallet.sendTransfer(admin.getSender(), {
                toAddress: bob.address,
                value: toNano('0.5'),
                jettonAmount: toNano('2'),
                fwdAmount: toNano('0'),
                fwdPayload: beginCell().endCell(),
                responseAddress: bob.address,
            });

            // const admin_balance2 = await admin.getBalance();
            // console.log('admin ton balance2:', fromNano(admin_balance2.toString()));

            // const adminJettonData2 = await adminWallet.getWalletData();
            // console.log('admin jetton balace2:', fromNano(adminJettonData2.balance.toString()));

            // const bob_alance = await bob.getBalance();
            // console.log('bob ton balace2:', fromNano(bob_alance.toString()));

            const bobWalletData = await bobWallet.getWalletData();

            // console.log('bob jetton balace2:', fromNano( bobWalletData.balance.toString()));

            expect(bobWalletData.balance).toBe(toNano('2'));

        });
    });
});
