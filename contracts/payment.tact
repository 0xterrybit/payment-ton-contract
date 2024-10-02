import "@stdlib/deploy";
import "@stdlib/ownable";
import "@stdlib/stoppable";


// C̲o̲n̲s̲t̲a̲n̲t̲s̲
const SEND_TON_COST: Int = ton("0.000309");
const PAY_TON_COST: Int = ton("0.00012360");
const SEND_TON_PROCESS: Int = ton("0.01");
const MINIMAL_CONTRACT_BALANCE: Int = ton("0.01");
const RESEND_VALUE: Int = ton("0.15");
const NOT_ENOUGTH_VALUE: Int = 1001;


const SwapTonToJetton_Amount: Int = ton("0.2");
const SwapTonToJetton_ForwardGASAmount: Int = ton("0.185");
const SwapJettonToJetton_ForwardGasAmount: Int = ton("0.175");

// S̲t̲r̲u̲c̲t̲s̲ a̲n̲d̲ m̲e̲t̲h̲o̲d̲s̲ f̲r̲o̲m̲ F̲u̲n̲C̲
@name(store_dict)
extends native storeDict(self: Builder, c: Cell): Builder;

struct DictLoadRes{
    slice: Slice;
    dict: Cell;
}

@name(load_dict)
extends native loadDict(self: Slice): DictLoadRes;

struct DictGetRes{
    slice: Slice;
    success: Int;
}

struct DictGetMinRes{
    key: Int;
    slice: Slice;
    success: Int;
}

struct DictGetNextRes{
    key: Int;
    slice: Slice;
    success: Int;
}

struct SendInfo {
    recipient: Address;
    value: Int;
}

@name(udict_get?)
extends native udictGet(self: Cell, kl: Int, k: Int): DictGetRes;

@name(idict_get_min?)
extends native idictGetMin(self: Cell, kl: Int): DictGetNextRes;

@name(idict_get_next?)
extends native idictGetNext(self: Cell, kl: Int, p: Int): DictGetNextRes;
//____________________________________________________________

// message(0x25938561) SwapPayload {
//     queryId: Int as uint64;
//     walletTokenBAddress: Int as coins;
//     fromAddress: Address;
// }

// M̲e̲s̲s̲a̲g̲e̲s̲
message(0x7362d09c) TokenNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    forward_payload: Slice as remaining;
}

message(0xf8a7ea5) TokenTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    response_destination: Address;
    custom_payload: Cell?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining; // Comment Text message when Transfer the jetton
}

// Send native TON
message PayTon {
    queryId: Int as uint64;
    length: Int as uint64;
    sendInfo: map<Int, SendInfo>;
}

message PayTonToJetton {
    queryId: Int as uint64;

    dexTargetRouter: Address;

    askJettonWalletAddress: Address;
    refundAddress: Address;
    excessesAddress: Address;
    deadline: Int as uint64;


    // ref
    minAskAmount: Int as coins;
    receiverAddress: Address
}

message SetSendCost {
    sendCost: Int;
}

contract Payment with Deployable, Ownable, OwnableTransferable, Stoppable, Resumable {

    sendCost: Int;
    owner: Address;
    stopped: Bool;

    init(sendCost: Int) {
        self.owner = sender();
        self.stopped = false;
        self.sendCost = sendCost;
    }
    
    // Method for manually sending native TONs to different recipients
    receive(msg: PayTon) {
        let ctx: Context = context();
        
        //Reserve balance on Contract to avoid freeze
        nativeReserve(
            max(MINIMAL_CONTRACT_BALANCE, myBalance() - ctx.value)
        , 0);
        
        // let hasMore: Bool = true;
        let needBreak: Bool = false;
        let idx: Int = 0;

        // Go through the array of recipients in a loop and send TON
        do {

            if ((msg.sendInfo.get(idx)!!).value != 0) {
                send(SendParameters
                {
                    to: (msg.sendInfo.get(idx)!!).recipient,
                    value: PAY_TON_COST + (msg.sendInfo.get(idx)!!).value,
                    mode: SendPayGasSeparately | SendIgnoreErrors,
                    bounce: false
                });
            }

            idx = idx + 1;

            if ((msg.sendInfo.get(idx) == null) || (idx - msg.length >= 0)) {
                needBreak = true;
            }


        } until (needBreak);

        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            bounce: false,
        });
 
    }

    // Method for manually sending native TONs to different recipients
    receive(msg: PayTonToJetton) {
        let ctx: Context = context();
        send(SendParameters
        {
            to: msg.dexTargetRouter,
            value: self.sendCost,
            mode: SendPayGasSeparately | SendIgnoreErrors,
            body: beginCell()
                    .storeUint(0x6664de2a, 32)
                    .storeAddress(msg.askJettonWalletAddress)
                    .storeAddress(msg.refundAddress)
                    .storeAddress(msg.excessesAddress)
                    .storeUint(msg.deadline, 64)
                    .endCell()

        });
    }

    // Method for sending jetton tokens to different recipients
    receive(msg: TokenNotification) {

        let ctx: Context = context();

        nativeReserve(
            max(MINIMAL_CONTRACT_BALANCE, myBalance() - ctx.value)
        , 0);
        
        // spit token
        let op: Int = msg.forward_payload.loadUint(8);

        if (op == 0x60) {
            self.batchTransferJetton(msg);
        } 
        else if (op == 0x61) {                 // swap jetton to jetton (usdt)
            self.swapJettonToJetton(msg);
        }

        send(SendParameters
        {
            to: msg.from,
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            body: "Finish".asComment()
        });
    }
    
    fun swapJettonToJetton(msg: TokenNotification) {

        let swapPayload: Slice = msg.forward_payload.loadRef().beginParse();
        let targetRouter: Address = swapPayload.loadAddress();
        let amount: Int = swapPayload.loadUint(32);

        send(SendParameters
        {
            to: sender(),
            value: self.sendCost,
            mode: SendPayGasSeparately | SendIgnoreErrors,
            body: beginCell()
                .storeUint(0xf8a7ea5, 32)
                .storeUint(msg.queryId, 64)
                .storeCoins(SwapTonToJetton_Amount)
                .storeSlice(targetRouter.asSlice())
                .storeSlice(self.owner.asSlice())
                .storeUint(0, 1)
                .storeCoins(SwapJettonToJetton_ForwardGasAmount)
                .storeUint(0, 1)
                .endCell()
        });

        // sendInfo = contDict.dict.idictGetNext(257, sendInfo.key);

    }

    fun batchTransferJetton(msg: TokenNotification) {

        // spit token
        let length: Int = msg.forward_payload.loadUint(64);

        let sendersContent: Slice = msg.forward_payload.loadRef().beginParse();

        let contDict: DictLoadRes = sendersContent.loadDict();  
        
        let sendInfo: DictGetNextRes = contDict.dict.idictGetMin(257);
        nativeThrowUnless(907, sendInfo.success == -1);
        
        repeat(length){

            let info: Slice = sendInfo.slice.loadRef().beginParse();
            let recipient: Address = info.loadAddress();
            let amount: Int = info.loadInt(257);

            send(SendParameters
            {
                to: sender(),
                value: self.sendCost,
                mode: SendPayGasSeparately | SendIgnoreErrors,
                body: beginCell()
                    .storeUint(0xf8a7ea5, 32)
                    .storeUint(msg.queryId, 64)
                    .storeCoins(amount)
                    .storeSlice(recipient.asSlice())
                    .storeSlice(self.owner.asSlice())
                    .storeUint(0, 1)
                    .storeCoins(0)
                    .storeUint(0, 1)
                    .endCell()
            });

            sendInfo = contDict.dict.idictGetNext(257, sendInfo.key);
        }
    }


    //Method for manually withdrawing all TONs to the owner’s address
    receive("withdraw") {
        
        self.requireOwner();

        nativeReserve(
            MINIMAL_CONTRACT_BALANCE
        , 0);

        send(SendParameters
        {
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance,
            bounce: false
        });
    }

    
    receive(msg: SetSendCost) {

        self.requireOwner();
        self.sendCost = msg.sendCost;

        nativeReserve(
            MINIMAL_CONTRACT_BALANCE
        , 0);

        send(SendParameters
        {
            to: sender(),
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            bounce: false
        });
    }

    
    // get fun id(): Int {
    //     return self.id;
    // }

    // get fun sendCost(): Int {
    //     return self.sendCost;
    // }

    // get fun fullTonSendAddiction(length: Int): Int {
    //     return length * (SEND_TON_PROCESS) + (length / 120) * RESEND_VALUE;
    // }
}