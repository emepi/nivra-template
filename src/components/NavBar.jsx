import { ConnectButton, useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { Box, Flex, Heading } from "@radix-ui/themes";
import { useNetworkVariable } from "../networkConfig";

const NavBar = () => {
  return (
    <Flex position="sticky" p="4" justify="between" align="center" style={{borderBottom: "1px solid var(--gray-a2)",}}>
      <Box>
        <Heading>Nivra Template</Heading>
        <Flex gap="2">
          <a href="/">Home</a>
          <a href="/admin">Admin</a>
          <a href="/faucet">Faucet</a>
          <a href="/cases">My Cases</a>
        </Flex>
      </Box>
      <Box>
        <ConnectButton />
      </Box>
    </Flex>
  );
};

export default NavBar;