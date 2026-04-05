import { SuiClient } from '@mysten/sui/client';
const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
client.getObject({ id: '0xd569956659ea500747e202fecb9008e95ea197fa9f1e66741acc09bafbf7fcb6', options: { showContent: true } })
  .then(console.log)
  .catch(console.error);
