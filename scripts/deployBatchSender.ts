import { toNano, address } from '@ton/core';
import { BatchSender } from '../wrappers/Payment';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const batchSender = provider.open(await BatchSender.fromInit(BigInt(Math.floor(Math.random() * 10000)), toNano("0.09")));

    await batchSender.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );
    
    await provider.waitForDeploy(batchSender.address);
        
    console.log('ID', await batchSender.getId());
}
