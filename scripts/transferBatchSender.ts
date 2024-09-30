import { openContract, Contract, address, Cell, beginCell, Address, toNano, fromNano, SendMode, Dictionary, DictionaryValue, Builder,} from '@ton/core';

import { NetworkProvider } from '@ton/blueprint';
import { TokenTransfer, storeTokenTransfer } from '../build/Jetton/tact_SampleJetton';
import { BatchSender, TokenSendInfo, storeTokenSendInfo, loadTokenSendInfo } from '../wrappers/Payment';
import { Blockchain } from '@ton/sandbox';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';
import dotenv from "dotenv";

import { getHttpEndpoint } from "@orbs-network/ton-access";

const TestParams: [string, number][] = [
  ["UQCxNYjemj5i60KBuuXN71tY_TvrTg7Jpuzxd43_yT5ISALo", 131.0],
  ["UQAOc2-v70u975bLYuMrU8F5GaU_ZQJtgB-TT7LQbjcy7s1M", 123.0],
  ["UQCxNYjemj5i60KBuuXN71tY_TvrTg7Jpuzxd43_yT5ISALo", 142.0],
  ["UQCxNYjemj5i60KBuuXN71tY_TvrTg7Jpuzxd43_yT5ISALo", 124.0],
  ["UQCxNYjemj5i60KBuuXN71tY_TvrTg7Jpuzxd43_yT5ISALo", 131.0],
  ["UQCxNYjemj5i60KBuuXN71tY_TvrTg7Jpuzxd43_yT5ISALo", 123.0],
  ["UQCxNYjemj5i60KBuuXN71tY_TvrTg7Jpuzxd43_yT5ISALo", 142.0],
  ["EQBgmi4dsim7qBiu_6rzPnJaj7s9FlKKYDNkXwaivQmIhhxb", 124.0]
]

function payload_body(tonSender: Address, length: bigint, sendInfo: Dictionary<bigint, TokenSendInfo>): Cell {
  return beginCell()
    .storeRef(
      beginCell()
      .storeUint(length, 64) // queryid
      .storeAddress(tonSender)
      .endCell()
      
    )
    .storeRef(
      // internal transfer message
      beginCell()
        .storeUint(0,8)
        .storeDict(sendInfo, Dictionary.Keys.BigInt(257), dictValueParserTokenSendInfo())
        .endCell()
    )
    .endCell();
}


function dictValueParserTokenSendInfo(): DictionaryValue<TokenSendInfo> {
  return {
      serialize: (src, buidler) => {
          buidler.storeRef(beginCell().store(storeTokenSendInfo(src)).endCell());
      },
      parse: (src) => {
          return loadTokenSendInfo(src.loadRef().beginParse());
      }
  }
}


dotenv.config();


export async function run(
    provider: NetworkProvider
    ) {

    console.log(`=================================================================`);
    console.log(`Deploy script running, let's find some contracts to deploy..`);
    const blockchain = await Blockchain.create();
  
    //const isTestnet = process.env.TESTNET || process.env.npm_lifecycle_event == "deploy:testnet";
    const isTestnet = true;
    // check input arguments (given through environment variables)
    if (isTestnet) {
      console.log(`\n* We are working with 'testnet' (https://t.me/testgiver_ton_bot will give you test TON)`);
    } else {
      console.log(`\n* We are working with 'mainnet'`);
    }
  
    console.log(`Initial parameters....`);
    let message_dict = Dictionary.empty(Dictionary.Keys.BigUint(257), dictValueParserTokenSendInfo())
    let send_sum = 0;
    for (let i = 0; i < TestParams.length; i++){
        message_dict.set(BigInt(i), { 
          $$type: 'TokenSendInfo',
          recipient: address(TestParams[i][0]),
          value: toNano(TestParams[i][1]),
        })
        send_sum += TestParams[i][1];
    }

    console.log(`Open contracts....`);
    //РАБОЧИЙ
    //const batchSender = provider.open(BatchSender.fromAddress(address("EQCp9JUfe1rLfPZgc0Sj2e0ZaHHYk2nZPNxf-r1bvtZGraP8")));
    //PROD
    const batchSender = provider.open(BatchSender.fromAddress(address("0QCbVMWAMeUXQzW-ANL7X794p8EYcmNedACqXL4bMBSzR7-u")));
    const JettonAddress2 = address("EQCpx8W6yIfsNh_fpUSpPWo-HEcRj06PEjByq3za4QcduFwL")
    const walletAddress = address("0QCItp_BXJSu2m4qgtUcbKy7gTTQ6fIdokNInFoHIBJ2Fjnm")
    const senderWallet = blockchain.openContract(JettonDefaultWallet.fromAddress(walletAddress));

    console.log(`Building payload....`);
    const payload = payload_body(JettonAddress2, BigInt(TestParams.length), message_dict)
    

  const transferMessage: TokenTransfer = {
      $$type: "TokenTransfer",
      queryId: 0n,
      amount: toNano(send_sum),
      destination: batchSender.address,
      response_destination: provider.sender().address!,
      custom_payload: null,
      forward_ton_amount: toNano("0.05") * BigInt(TestParams.length) + toNano('0.02') + (toNano("0.0086") * BigInt(TestParams.length)),
      forward_payload: payload,
  };
  const buidler = new Builder()
  storeTokenTransfer(transferMessage)(buidler)
 
  await senderWallet.send(provider.sender(), { value: toNano("0.1") * BigInt(TestParams.length) + toNano(1) }, transferMessage, true);

}