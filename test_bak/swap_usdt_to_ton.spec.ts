// import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
// import { Address, Cell, Dictionary, beginCell, fromNano, toNano } from '@ton/core';
// import { Master } from '../wrappers/Master';
// import { Wallet } from '../wrappers/Wallet';
// import { Payment } from '../wrappers/Payment';

// import '@ton/test-utils';
// import { compile } from '@ton/blueprint';

// import { TonClient } from "@ton/ton";
// import { DEX, pTON } from "@ston-fi/sdk";

// describe('swap_usdt_to_pton.spec', () => {


//   const client = new TonClient({
//     endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
//   });
  
//   const router = client.open(
//     DEX.v1.Router.create(
//       "kQCas2p939ESyXM_BzFJzcIe3GD5S0tbjJDj6EBVn-SPsEkN" // CPI Router v2.0.0
//     )
//   );

//   it('swap_usdt_to_pton', async () => {

//       // swap 1 TesREED to TestBlue but not less than 1 nano TestBlue
//     const txParams = await router.getSwapJettonToJettonTxParams({
//       userWalletAddress: "UQAEkuTlMIIt9BogjOCjXyOydYArSH6mS8fuzt0ivpzIP_xS", // ! replace with your address
//       offerJettonAddress: "kQDLvsZol3juZyOAVG8tWsJntOxeEZWEaWCbbSjYakQpuYN5", // TesREED
//       offerAmount: toNano("1"),
//       askJettonAddress: "kQB_TOJSB7q3-Jm1O8s0jKFtqLElZDPjATs5uJGsujcjznq3", // TestBlue
//       minAskAmount: "1",
//       queryId: 12345,
//     });
//   });
// });

