
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
    
    dex_v1 = client.open(new DEX.v1.Router(ROUTEER_V1));
    dex_v2 = client.open(new DEX.v2_1.Router(ROUTEER_V2));

  });
 
  it('dex v1 swap_usdt_to_pton', async () => {
    //  swap 1 TON to STON but not less than 1 nano STON
    const txParams = await dex_v2.getSwapTonToJettonTxParams({
      userWalletAddress: "UQAEkuTlMIIt9BogjOCjXyOydYArSH6mS8fuzt0ivpzIP_xS", // ! replace with your address
      proxyTon: new pTON.v1(),
      offerAmount: toNano("0.01"),
      askJettonAddress: "EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO", // STON
      minAskAmount: "1",
      queryId: 12345,
    });

    // end it manually later
    // await contract.sendTransfer({
    //   seqno: await contract.getSeqno(),
    //   secretKey: keyPair.secretKey,
    //   messages: [internal(txParams)],
    // });


    // // send it to payment contract
    // const paymentContractAddress = ''
    // const payloadCell = beginMessage('pay_with_ton_swap')
    // .endCell();

    // const {to, value, body} = txParams;

    // const op = crc32('pay_with_swap');

    // const message = internal({
    //   to: paymentContractAddress,
    //   value: toNano("0.01"), // 发送的TON数量
    //   body: beginCell()
    //     .storeUint(op, 32)          // 操作码
    //     .storeRef(txParams.body!)   // 将 txParams 作为消息体发送
    //     .endCell(),
    // });

    // await contract.sendTransfer({
    //   seqno: await contract.getSeqno(),
    //   secretKey: keyPair.secretKey,
    //   messages: [internal(txParams)],
    // });
 

    // // --> user wallet --> ston.fi swap
    // // --> user wallet --> payment --> ston.fi swap 
    // // --> 

    // expect(txParams).not.toBeNull()
  });
 

});

