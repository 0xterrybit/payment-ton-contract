import BN from "bn.js";
import { Cell, beginCell, Address } from "@ton/core";
import { beginMessage } from "./helpers";

export function data(params: { isLocked: boolean; adminAddress: Address; LPWalletCode: Cell; poolCode: Cell; LPAccountCode: Cell; }): Cell {
  return beginCell()
    .storeUint(params.isLocked ? 1 : 0, 1)
    .storeAddress(params.adminAddress)
    .storeRef(params.LPWalletCode)
    .storeRef(params.poolCode)
    .storeRef(params.LPAccountCode)
    .storeRef(beginCell()
      .storeUint(0, 64)
      .storeUint(0, 64)
      .storeAddress(null)
      .storeRef(beginCell().endCell())
      .endCell())
    .endCell();
}
 
export function initCodeUpgrade(params: { newCode: Cell; }): Cell {
  return beginMessage({ op: BigInt(0xdf1e233d) })
    .storeRef(params.newCode)
    .endCell();
}
 
export function swap(params: { jettonAmount: bigint; fromAddress: Address; toWalletAddress: Address; toAddress: Address; expectedOutput: bigint; hasRef?: Boolean,refAddress?: Address; }): Cell {
  
  let swapPayload = beginCell()
    .storeUint(0x25938561, 32)                      // op: swap
    .storeAddress(params.toWalletAddress)           // token_out wallet
    .storeCoins(params.expectedOutput)              // amount_out
    .storeAddress(params.toAddress)                 // to address
    .storeBit(!!params.hasRef);

  let swap_op = 0x25938561;
    let payload = beginCell()
    .storeUint(swap_op, 32)
    .storeAddress(params.fromAddress)
    .storeRef(
      swapPayload.endCell()
    )
    .endCell();

  return payload;
  
}
