import { ConnectButton, useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";
import { CreateCourtDialog } from "./CreateCourtDialog";
import { CourtsView } from "./CourtsView";
import { DisputesView } from "./DisputesView";

function App() {
  const packageId = useNetworkVariable('package_id');
  const currentAccount = useCurrentAccount();

  // Query the Sui blockchain for objects owned by the current account.
  // Specifically, we're looking for objects of type `NivraAdminCap` within the `court_registry` module of the given package.
  const { data, } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address as string,
      options: {
        showContent: true,
        showType: true, 
      },
      filter: {
        StructType: `${packageId}::court_registry::NivraAdminCap`,
      }
    }
  );

  const isAdmin = () => data?.data ? data.data.length === 1 : false;

  const adminCapId = () => {
    return data?.data[0].data?.objectId;
  }

  return (
    <>
      <Flex position="sticky" p="4" justify="between" align="center" style={{borderBottom: "1px solid var(--gray-a2)",}}>
        <Box>
          <Heading>Nivra Template</Heading>
          <a href="/faucet">NVR Faucet</a>
        </Box>
        <Box>
          <ConnectButton />
        </Box>
      </Flex>
      <Container>
        <Flex p="4" justify={"end"}>
          {isAdmin() && <CreateCourtDialog adminCapId={adminCapId() as string}/>}
        </Flex>
      </Container>
      <CourtsView />
      <DisputesView />
    </>
  );
}

export default App;
