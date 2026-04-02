import { useCurrentNetwork } from "@mysten/dapp-kit-react";

type Network = 'testnet';

export const NETWORK_CONFIG: Record<Network, {
  grpcUrl: string;
  packageId: string;
  registryId: string,
  nvrPackageId: string,
  faucetPackageId: string,
  faucetId: string,
}> = {
  testnet: {
    grpcUrl: 'https://fullnode.testnet.sui.io:443',
    packageId: '0x8f019fff9d30b2737ec472940fa6831d7b414dd45ff8c4f16da7852358a96ab1',
    registryId: '0xd569956659ea500747e202fecb9008e95ea197fa9f1e66741acc09bafbf7fcb6',
    nvrPackageId: '0xc8fed8d93971ac293afeb1241d8e1bd8c7e90279b310d4e02307b3bcc02fe50e',
    faucetPackageId: '0xeeefc83fb6c916a81753f84fc64be18f427e8f6cba07fb5acf49f827b4dbf49d',
    faucetId: '0xfd5613a1d943f3be844f35c74bc2ba633a9c6f2b0cf3ad8cfee651d07caeafbb',
  },
};

export function useNetworkConfig() {
  const network = useCurrentNetwork();
  return NETWORK_CONFIG[network];
}