import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, toNano } from '@ton/core';

import { beginMessage, crc32, emptyCell, JettonMinterContractBase, JettonMinterContractDiscoverable, jMinterOpcodes } from "../helpers";



export type Config = {
    owner: Address
    fee: bigint
}

export function ConfigToCell(config: Config): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .storeCoins(config.fee)
        .endCell()
}

export function decodeConfig(cell: Cell): Config {
    let slice = cell.beginParse()

    return {
        owner: slice.loadAddress(),
        fee: slice.loadCoins(),
    }
}

export class Payment implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell, data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Payment(address)
    }

    static createFromConfig(config: Config, code: Cell, workchain = 0) {
        const data = ConfigToCell(config)
        const init = { code, data }
        return new Payment(contractAddress(workchain, init), init)
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        })
    }

    async sendUpdateData(provider: ContractProvider, via: Sender, newData: Cell) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(crc32('op::update_data'), 32).storeRef(newData).endCell(),
        })
    }

    async sendUpdateCode(provider: ContractProvider, via: Sender, newCode: Cell) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(crc32("op::update_code"), 32).storeRef(newCode).endCell(),
        })
    }

    async sendTopup(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(crc32("op::topup"), 32).endCell(),
        })
    }

    async getfee(provider: ContractProvider) {
        return (await provider.get('processing_price', [])).stack.readBigNumber()
    }

    async getOwner(provider: ContractProvider) {
        return (await provider.get('owner', [])).stack.readAddress()
    }

    async getConfig(provider: ContractProvider) {
        let configCell = (await provider.get('config', [])).stack.readCell()
        return decodeConfig(configCell)
    }

    async getBalance(provider: ContractProvider) {
        return (await provider.getState()).balance
    }
}