
import 'dotenv/config';

import { TonClient, WalletContractV4 ,  } from "@ton/ton";

import { AddressType, DEX, pTON } from "@ston-fi/sdk";
import { StonApiClient } from "@ston-fi/api";

import { Address, internal, OpenedContract, toNano, } from '@ton/core';
import { RouterV1 } from "@ston-fi/sdk/dist/contracts/dex/v1/RouterV1";
import { RouterV2_1 } from "@ston-fi/sdk/dist/contracts/dex/v2_1/router/RouterV2_1";
import { KeyPair, mnemonicToPrivateKey } from "@ton/crypto";

describe('swap_usdt_to_pton.spec', () => {

  let keyPair: KeyPair;
  let wallet: WalletContractV4;

  let client: TonClient;

  let dex_v2: OpenedContract<RouterV2_1>;

  const endpoint = process.env["ENDPOINT_URL"]!
  const apiKey = process.env["ENDPOINT_KEY"]!
  const mnemonics = process.env["OWNER_MNEMONIC"]!
  const publicKey = process.env["OWNER_PUBKEY"]!

  const ROUTEER_V2 = process.env["ROUTEER_V2"]!
  const ROUTEER_V1 = process.env['ROUTEER_V1']!

    // 0QAEkuTlMIIt9BogjOCjXyOydYArSH6mS8fuzt0ivpzIP0fY   wallet_v4r2
    // kQAqFriGhLjSIC7shDTzv3HQmytDDagfoT_-D65dhq3tnPB9   jetton_wallet
    // kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5   jetton_master TestRED

    // kQDZwYOajSRXMeg2YQKEXvcZT0lnnWkDDib0xCBZfbJWLKHJ   jetton_wallet
    // kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5   testRED

    // kQBw6tuHsnMXTz92pz820zdTZmRYUN-grIrGLWVMadGeszQ3   jetton_wallet
    // kQB_TOJSB7q3-Jm1O8s0jKFtqLElZDPjATs5uJGsujcjznq3   testBlue
    // red <--> blue pool

  const jetton_master_TestRED = 'kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5'  // test_red(usdt)
  const jetton_master_TestBLUE = "kQB_TOJSB7q3-Jm1O8s0jKFtqLElZDPjATs5uJGsujcjznq3"
   
  beforeAll(async () => {


    keyPair = await mnemonicToPrivateKey([mnemonics]);
    wallet = WalletContractV4.create({workchain: 0, publicKey: keyPair.publicKey});

    client = new TonClient({ endpoint, apiKey });
    
    dex_v2 = client.open(new DEX.v2_1.Router(ROUTEER_V2));

  });

  it('dex v2 fetch price on-chain & call ston.fi ', async ()=> {

    const poolAddress = await dex_v2.getPoolAddressByJettonMinters({
      token0: jetton_master_TestRED,
      token1: jetton_master_TestBLUE,
    });

    let pool_v2 = client.open(new DEX.v2_1.Pool(poolAddress));

    let pool_data = await pool_v2.getPoolData()

    // 计算 token0 和 token1 的汇率   1 token0 == 2 token1
    const price_token0_in_token1 = Number(pool_data.reserve1) / Number(pool_data.reserve0); // 1.9999231394436856


    // swap 1 TON to TestRED but not less than 1 nano TestRED
    const txParams = await dex_v2.getSwapJettonToJettonTxParams({
      userWalletAddress: publicKey,                 // ! replace with your address
      offerAmount: toNano("0.5"),                   
      offerJettonAddress: jetton_master_TestRED,
      askJettonAddress: jetton_master_TestBLUE,     // TestRED
      minAskAmount: "1",
      queryId: 123456,
    });
    

    // console.log('txParams:', txParams)
    const contract = client.open(wallet);
    await contract.sendTransfer({
        seqno: await contract.getSeqno(),
        secretKey: keyPair.secretKey,
        messages: [internal(txParams)],
    });

  });

});

