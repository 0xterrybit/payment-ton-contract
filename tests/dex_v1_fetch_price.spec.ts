
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

  let dex_v1: OpenedContract<RouterV1>;
  let dex_v2: OpenedContract<RouterV2_1>;

  const endpoint = process.env["ENDPOINT_URL"]!
  const apiKey = process.env["ENDPOINT_KEY"]!
  const mnemonics = process.env["OWNER_MNEMONIC"]!
  const publicKey = process.env["OWNER_PUBKEY"]!

  const ROUTEER_V1 = process.env['ROUTEER_V1']!

  const jetton_master_TestRED = 'kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5'  // test_red(usdt)
  const jetton_master_TestBLUE = "kQB_TOJSB7q3-Jm1O8s0jKFtqLElZDPjATs5uJGsujcjznq3"
  
  const jetton_master_USDT = "kQB_TOJSB7q3-Jm1O8s0jKFtqLElZDPjATs5uJGsujcjznq3"
   
  beforeAll(async () => {


    keyPair = await mnemonicToPrivateKey([mnemonics]);
    wallet = WalletContractV4.create({workchain: 0, publicKey: keyPair.publicKey});

    client = new TonClient({ endpoint, apiKey });
    
    dex_v1 = client.open(new DEX.v1.Router(ROUTEER_V1));

  });

  it("fetch price from ston.fi", async() => {

    let stonClient = new StonApiClient({
    //   baseURL: 'https://api.ston.fi'
    });

    const reverse_simulate_detail = await stonClient.simulateReverseSwap({
      askAddress: jetton_master_TestRED,                                            // usdt
      askUnits: '1000000',                                                          // 1 USDT
      slippageTolerance: '0.01',
      offerAddress: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',             // ton
    });

    // console.log('reverse_simulate_detail:', reverse_simulate_detail.offerUnits);

    console.log('swap_rate:', reverse_simulate_detail.swapRate);

    // const swap_details = await client.simulateSwap({
    //   offerAddress: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', // ton
    //   offerUnits: toNano('1').toString(),                               // offer_units
    //   askAddress: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO',   // ston
    //   slippageTolerance: '0.01',
    // });

    // console.log('swap_rate:', swap_details.swapRate)
    // console.log('Blockchain fee:', swap_details.swapRate)
    // console.log('swap_rate:', swap_details.swapRate)
    
    // console.log('swap_details:', swap_details)

    // expect(swap_details).not.toBeNull()
  });
 

});

