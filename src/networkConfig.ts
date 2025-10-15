import { getFullnodeUrl } from "@mysten/sui/client";
import { DEVNET_PACKAGE_ID, DEVNET_REGISTRY_ID, MAINNET_PACKAGE_ID, MAINNET_REGISTRY_ID, TESTNET_PACKAGE_ID, TESTNET_REGISTRY_ID } from "./constants.tsx";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  devnet: {
    url: getFullnodeUrl("devnet"),
    variables: {
      package_id: DEVNET_PACKAGE_ID,
      registry_id: DEVNET_REGISTRY_ID,
    }
  },
  testnet: {
    url: getFullnodeUrl("testnet"),
    variables: {
      package_id: TESTNET_PACKAGE_ID,
      registry_id: TESTNET_REGISTRY_ID,
    }
  },
  mainnet: {
    url: getFullnodeUrl("mainnet"),
    variables: {
      package_id: MAINNET_PACKAGE_ID,
      registry_id: MAINNET_REGISTRY_ID,
    }
  }
});

export { useNetworkVariable, useNetworkVariables, networkConfig };