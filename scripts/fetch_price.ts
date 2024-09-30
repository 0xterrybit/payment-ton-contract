import { Address, beginCell, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';

// import { Master } from '../wrappers/Master';
import { AssetTag, StonApiClient, StonApiClientOptions } from "@ston-fi/api";

export async function run(provider: NetworkProvider) {

    let client = new StonApiClient();
    
    const swap_details = await client.simulateSwap({
      offerAddress: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c', // ton
      offerUnits: toNano('1').toString(),                               // offer_units
      askAddress: 'EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO',   // ston
      slippageTolerance: '0.01',
    });

    console.log('swap_details:', swap_details)

    // expect(swap_details).not.toBeNull()

}

