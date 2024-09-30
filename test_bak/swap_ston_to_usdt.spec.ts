// // import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
// // import { Address, Cell, Dictionary, beginCell, fromNano, toNano } from '@ton/core';
// // import { Master } from '../wrappers/Master';
// // import { Wallet } from '../wrappers/Wallet';
// // import { Payment } from '../wrappers/Payment';
// // import { compile } from '@ton/blueprint';

// import '@ton/test-utils';

// import { toNano } from "@ton/core";
// import { TonClient } from "@ton/ton";
// import { DEX, pTON } from "@ston-fi/sdk";

// describe('swap_usdt_to_pton.spec', () => {


//   // const client = new TonClient({
//   //   endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
//   // });

//   // const router = client.open(
//   //   DEX.v1.Router.create(
//   //     "kQCas2p939ESyXM_BzFJzcIe3GD5S0tbjJDj6EBVn-SPsEkN" // CPI Router v2.0.0
//   //   )
//   // );

//   // const proxyTon = pTON.v1.create(
//   //   "kQDwpyxrmYQlGDViPk-oqP4XK6J11I-bx7fJAlQCWmJB4m74" // pTON v2.0.0
//   // );

//   const client = new TonClient({
//     endpoint: "https://toncenter.com/api/v2/jsonRPC",
//   });
  
//   const router = client.open(new DEX.v1.Router());
  

//   it('swap_usdt_to_pton', async () => {

//     // swap 1 STON to GEMSTON but not less than 1 nano GEMSTON
//     const txParams = await router.getSwapJettonToJettonTxParams({
//       userWalletAddress: "UQAEkuTlMIIt9BogjOCjXyOydYArSH6mS8fuzt0ivpzIP_xS",     // ! replace with your address
//       offerJettonAddress: "EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO",    // token_in     STON
//       offerAmount: toNano("1"),                                                  // amount_in    1
//       askJettonAddress: "EQBX6K9aXVl3nXINCyPPL86C4ONVmQ8vK360u6dykFKXpHCa",      // token_out    GEMSTON
//       minAskAmount: "1",                                                         // amount_out   100
//       queryId: 12345,                                                            // 
//     });

//     console.log('txParams:', txParams)

//   });
// });

