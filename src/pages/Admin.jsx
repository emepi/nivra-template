import { useCurrentAccount, useSuiClientQuery, useSuiClient, } from "@mysten/dapp-kit";
import { Container, Flex, Heading, Box, Text } from "@radix-ui/themes";
import { useNetworkVariable } from "../networkConfig";
import { CreateCourtDialog } from "../dialogs/CreateCourtDialog";
import { useEffect, useState } from "react";

const Admin = () => {
  const [metadata, setMetadata] = useState([]);
  const courtRegistryId = useNetworkVariable("registry_id");
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable('package_id');
  const currentAccount = useCurrentAccount();

  const { data, } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address,
      options: {
        showContent: true,
        showType: true, 
      },
      filter: {
        StructType: `${packageId}::court_registry::NivraAdminCap`,
      }
    }
  );

  const adminCapId = () => {
    return data?.data[0].data?.objectId;
  }

  useEffect(() => {
    getCourts();
  }, [])

  const getCourts = async () => {
    const courtRegistry = await suiClient.getObject({
      id: courtRegistryId,
      options: { showContent: true },
    });

    const parentId = courtRegistry.data.content.fields.inner.fields.id.id;

    const fields = await suiClient.getDynamicFields({
      parentId,
    });

    const courtRegistryInnerId = fields.data[0].objectId;

    const courtRegistryInner = await suiClient.getObject({
      id: courtRegistryInnerId,
      options: { showContent: true },
    });

    const courtsId = courtRegistryInner.data?.content.fields.value.fields.courts.fields.id.id;

    const allCourtData = [];
    let cursor = null;
    let hasNextPage = false;

    do {
      const courtFields = await suiClient.getDynamicFields({
        parentId: courtsId,
        cursor,
      });

      allCourtData.push(...courtFields.data);
      cursor = courtFields.nextCursor;
      hasNextPage = courtFields.hasNextPage;
    } while (cursor && hasNextPage);

    const courtMetadataIds = allCourtData.map(data => data.objectId);

    const metadata = await suiClient.multiGetObjects({
      ids: courtMetadataIds,
      options: { showContent: true },
    });

    const courtsData = metadata.map(data => data.data?.content.fields)

    setMetadata(courtsData);
  };

  const courts = metadata.map(md => 
    <Flex key={md.name}>
      <Text>{md.value.fields.name}</Text>
    </Flex>
  );

  return (
    <Container p="4">
      <Box style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)", }}>
        <Flex direction="column" p="4">
          <Heading>Courts</Heading>
          {courts}
          <CreateCourtDialog adminCapId={adminCapId()}/>
        </Flex>
      </Box>
    </Container>
  );
};

export default Admin;