import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, Dictionary, beginCell, fromNano, toNano } from '@ton/core';
import { Master } from '../wrappers/Master';
import { Wallet } from '../wrappers/Wallet';
import { Payment } from '../wrappers/Payment';

import '@ton/test-utils';
import { compile } from '@ton/blueprint';

import { TonClient } from "@ton/ton";
import { DEX, pTON } from "@ston-fi/sdk";

describe('swap_usdt_to_pton.spec', () => {

  // const client = new TonClient({
  //   endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
  // });
  
  const client = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
  });
  
  const router = client.open(new DEX.v1.Router());

  it('swap_usdt_to_pton', async () => {

      // swap 1 TON to STON but not less than 1 nano STON
      const txParams = await router.getSwapTonToJettonTxParams({
        userWalletAddress: "", // ! replace with your address
        proxyTon: new pTON.v1(),
        offerAmount: toNano("1"),
        askJettonAddress: "EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO", // STON
        minAskAmount: "1",
        queryId: 12345,
      });
      
      console.log('txParams:', txParams)
  });
});

