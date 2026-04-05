import { useCurrentNetwork } from "@mysten/dapp-kit-react";

type Network = 'testnet';

export const NETWORK_CONFIG: Record<Network, {
  grpcUrl: string;
  packageId: string;
  registryId: string,
  nvrPackageId: string,
  faucetPackageId: string,
  faucetId: string,
  sealKeyServers: string[],
  sealPublicKeys: number[][],
}> = {
  testnet: {
    grpcUrl: 'https://fullnode.testnet.sui.io:443',
    packageId: '0x8f019fff9d30b2737ec472940fa6831d7b414dd45ff8c4f16da7852358a96ab1',
    registryId: '0xd569956659ea500747e202fecb9008e95ea197fa9f1e66741acc09bafbf7fcb6',
    nvrPackageId: '0xc8fed8d93971ac293afeb1241d8e1bd8c7e90279b310d4e02307b3bcc02fe50e',
    faucetPackageId: '0xeeefc83fb6c916a81753f84fc64be18f427e8f6cba07fb5acf49f827b4dbf49d',
    faucetId: '0xfd5613a1d943f3be844f35c74bc2ba633a9c6f2b0cf3ad8cfee651d07caeafbb',
    sealKeyServers: [
      "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
      "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
    ],
    sealPublicKeys: [
      [160, 64, 181, 84, 139, 176, 66, 143, 186, 21, 152, 149, 192, 112, 128, 203, 253, 199, 110, 240, 27, 184, 140, 162, 206, 213, 200, 91, 7, 120, 46, 9, 151, 10, 31, 86, 132, 226, 160, 221, 61, 62, 49, 190, 182, 203, 215, 234, 2, 196, 154, 55, 148, 178, 108, 109, 61, 159, 253, 201, 158, 73, 132, 204, 152, 29, 13, 114, 233, 51, 194, 175, 51, 9, 33, 107, 247, 1, 30, 158, 130, 199, 182, 130, 118, 136, 47, 24, 186, 14, 167, 244, 90, 119, 33, 219],
      [168, 203, 111, 89, 2, 125, 20, 224, 163, 233, 126, 161, 189, 121, 170, 106, 148, 47, 54, 255, 200, 53, 245, 2, 85, 145, 198, 128, 213, 152, 165, 84, 31, 8, 127, 172, 179, 159, 177, 42, 29, 157, 113, 179, 165, 16, 148, 43, 23, 96, 229, 246, 104, 95, 134, 102, 10, 76, 56, 177, 120, 146, 139, 182, 208, 54, 42, 108, 126, 36, 73, 133, 82, 120, 50, 199, 131, 168, 181, 25, 93, 183, 67, 255, 34, 137, 222, 59, 35, 34, 109, 173, 134, 205, 112, 241]
    ],
  },
};

export function useNetworkConfig() {
  const network = useCurrentNetwork();
  return NETWORK_CONFIG[network];
}