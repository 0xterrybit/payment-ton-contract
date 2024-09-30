import 'dotenv/config';

import { TonClient, WalletContractV4, } from "@ton/ton";

import { AddressType, DEX, pTON } from "@ston-fi/sdk";
import { StonApiClient } from "@ston-fi/api";

import { Address, internal, OpenedContract, toNano, } from '@ton/core';
import { RouterV1 } from "@ston-fi/sdk/dist/contracts/dex/v1/RouterV1";
import { KeyPair, mnemonicToPrivateKey } from "@ton/crypto";


type ROUter_TYPE = {
    address: string;
    majorVersion: number;
    minorVersion: number;
    ptonMasterAddress: string;
    ptonVersion: string;
    ptonWalletAddress: string;
    routerType: string;
};

describe('swap_usdt_to_pton.spec', () => {

    let keyPair: KeyPair;
    let wallet: WalletContractV4;

    let tonClient: TonClient;
    let stonApi: StonApiClient;

    let dex_v1: OpenedContract<RouterV1>;

    const endpoint = process.env["ENDPOINT_URL"]!
    const apiKey = process.env["ENDPOINT_KEY"]!
    const mnemonics = process.env["OWNER_MNEMONIC"]!

    const jetton_master_TestRED = 'kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5'  // test_red(usdt)
    const jetton_master_TestBLUE = "kQB_TOJSB7q3-Jm1O8s0jKFtqLElZDPjATs5uJGsujcjznq3"

    let routers: ROUter_TYPE[];
    let router: ROUter_TYPE;

    let publicKey: Address;

    beforeAll(async () => {

        keyPair = await mnemonicToPrivateKey([mnemonics]);
        wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        publicKey = wallet.address;

        tonClient = new TonClient({ endpoint, apiKey });
        stonApi = new StonApiClient();


        routers = await stonApi.getRouters({ dexV2: true });
        router = await stonApi.getRouter(routers[0].address);
        dex_v1 = tonClient.open(new DEX.v1.Router(router.address));

    });

    it('dex fetch price on-chain & call ston.fi ', async () => {

        const usdt = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'
        const quote = await stonApi.simulateReverseSwap({
            askAddress: usdt, 
            askUnits: '10000',
            slippageTolerance: '0.01',      // 
            offerAddress: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c' // ton
        })

        const proxyTon = pTON.v1.create(quote.offerJettonWallet);

        console.log('publicKey:', publicKey.toString({bounceable: true}))

        const txParams = await dex_v1.getSwapTonToJettonTxParams({
            userWalletAddress: 'UQAEkuTlMIIt9BogjOCjXyOydYArSH6mS8fuzt0ivpzIP_xS',                                       
            offerAmount: quote.offerUnits,
            proxyTon: proxyTon,
            askJettonAddress: usdt,     
            minAskAmount: quote.minAskUnits,
            queryId: 123456,
        });

        console.log('txParams:', txParams)

        const tonWallet = tonClient.open(wallet);
        await tonWallet.sendTransfer({
            seqno: await tonWallet.getSeqno(),
            secretKey: keyPair.secretKey,
            messages: [internal(txParams)],
        });

    });

    afterAll(async () => {

    });

});

