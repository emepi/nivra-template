import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
const client = new SuiClient({ url: getFullnodeUrl('testnet') });

client.getObject({ id: '0xd569956659ea500747e202fecb9008e95ea197fa9f1e66741acc09bafbf7fcb6', options: { showContent: true } })
  .then(r => console.log("SUCCESS WITH id:", !!r))
  .catch(e => console.error("id error:", e.message));

client.getObject({ objectId: '0xd569956659ea500747e202fecb9008e95ea197fa9f1e66741acc09bafbf7fcb6', options: { showContent: true } })
  .then(r => console.log("SUCCESS WITH objectId:", !!r))
  .catch(e => console.error("objectId error:", e.message));
