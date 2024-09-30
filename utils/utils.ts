
import { Address, Cell, CellMessage, InternalMessage, CommonMessageInfo, WalletContract, SendMode, Wallet, Builder, beginCell, beginDict } from "ton";
import BN from "bn.js";
import Prando from "prando";


export const zeroAddress = new Address(0, Buffer.alloc(32, 0));


export function internalMessage(params: { from?: Address; to?: Address; value?: BN; bounce?: boolean; bounced?: boolean; body?: Cell }) {
    const message = params.body ? new CellMessage(params.body) : undefined;
    return new InternalMessage({
        from: params.from,
        to: params.to ?? zeroAddress,
        value: params.value ?? 0,
        bounce: params.bounce ?? true,
        bounced: params.bounced ?? false,
        body: new CommonMessageInfo({ body: message }),
    });
}

export async function sendInternalMessageWithWallet(params: { 
    walletContract: WalletContract; 
    secretKey: Buffer; 
    to: Address; 
    value: BN; 
    bounce?: boolean; 
    body?: Cell

}) {
    const message = params.body ? new CellMessage(params.body) : undefined;
    const seqno = await params.walletContract.getSeqNo();

    const order = new InternalMessage({
        to: params.to,
        value: params.value,
        bounce: params.bounce ?? false,
        body: new CommonMessageInfo({
            body: message,
        }),
    });

    const transfer = params.walletContract.createTransfer({
        secretKey: params.secretKey,
        seqno: seqno,
        sendMode: SendMode.PAY_GAS_SEPARATLY + SendMode.IGNORE_ERRORS,
        order: order
    });

    await params.walletContract.client.sendExternalMessage(params.walletContract, transfer);

    for (let attempt = 0; attempt < 10; attempt++) {
        await sleep(2000);
        const seqnoAfter = await params.walletContract.getSeqNo();
        if (seqnoAfter > seqno) return;
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
