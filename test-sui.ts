import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

async function run() {
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
  const registryObject = await client.getObject({
    id: '0xd569956659ea500747e202fecb9008e95ea197fa9f1e66741acc09bafbf7fcb6',
    options: { showContent: true }
  });
  console.log("Using id + options:", JSON.stringify(registryObject, null, 2));
}

run().catch(console.error);
