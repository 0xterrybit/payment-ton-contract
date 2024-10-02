// import BN from "bn.js";
import { toNano, Address, Dictionary, DictionaryValue, beginCell, fromNano, Cell, Builder } from '@ton/core';

export function beginMessage(params: { op: bigint }): Builder {
  return beginCell()
    .storeUint(params.op, 32)
    .storeUint(Math.floor(Math.random() * Math.pow(2, 31)), 64);
}
