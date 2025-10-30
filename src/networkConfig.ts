import { getFullnodeUrl } from "@mysten/sui/client";
import { DEVNET_CK_PACKAGE_ID, DEVNET_COIN_TYPE, DEVNET_FAUCET_ID, DEVNET_FAUCET_PACKAGE_ID, DEVNET_PACKAGE_ID, DEVNET_REGISTRY_ID, MAINNET_CK_PACKAGE_ID, MAINNET_COIN_TYPE, MAINNET_FAUCET_ID, MAINNET_FAUCET_PACKAGE_ID, MAINNET_PACKAGE_ID, MAINNET_REGISTRY_ID, TESTNET_CK_PACKAGE_ID, TESTNET_COIN_TYPE, TESTNET_FAUCET_ID, TESTNET_FAUCET_PACKAGE_ID, TESTNET_PACKAGE_ID, TESTNET_REGISTRY_ID } from "./constants.tsx";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  devnet: {
    url: getFullnodeUrl("devnet"),
    variables: {
      package_id: DEVNET_PACKAGE_ID,
      registry_id: DEVNET_REGISTRY_ID,
      nvr_coin_type: DEVNET_COIN_TYPE,
      ck_package_id: DEVNET_CK_PACKAGE_ID,
      faucet_package_id: DEVNET_FAUCET_PACKAGE_ID,
      faucet_id: DEVNET_FAUCET_ID,
    }
  },
  testnet: {
    url: getFullnodeUrl("testnet"),
    variables: {
      package_id: TESTNET_PACKAGE_ID,
      registry_id: TESTNET_REGISTRY_ID,
      nvr_coin_type: TESTNET_COIN_TYPE,
      ck_package_id: TESTNET_CK_PACKAGE_ID,
      faucet_package_id: TESTNET_FAUCET_PACKAGE_ID,
      faucet_id: TESTNET_FAUCET_ID,
    }
  },
  mainnet: {
    url: getFullnodeUrl("mainnet"),
    variables: {
      package_id: MAINNET_PACKAGE_ID,
      registry_id: MAINNET_REGISTRY_ID,
      nvr_coin_type: MAINNET_COIN_TYPE,
      ck_package_id: MAINNET_CK_PACKAGE_ID,
      faucet_package_id: MAINNET_FAUCET_PACKAGE_ID,
      faucet_id: MAINNET_FAUCET_ID,
    }
  }
});

export { useNetworkVariable, useNetworkVariables, networkConfig };