import { useCurrentAccount, useSuiClientQuery, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Container, Flex, Heading, Box, Text, Button } from "@radix-ui/themes";
import { Form, FormControl, FormField, FormLabel, FormSubmit } from "@radix-ui/react-form";
import { useNetworkVariable } from "../networkConfig";
import { CreateCourtDialog } from "../dialogs/CreateCourtDialog";
import { useEffect, useState } from "react";
import { Transaction } from "@mysten/sui/transactions";

const Admin = () => {
  const [metadata, setMetadata] = useState([]);
  const courtRegistryId = useNetworkVariable("registry_id");
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable('package_id');
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

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

  const submitForm = (event) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.target));
    const addr = entries.address;

    const tx = new Transaction();
    
    tx.moveCall({
      target: `${packageId}::court_registry::mint_admin_cap`,
      arguments: [
        tx.object(courtRegistryId),
        tx.object(adminCapId),
        tx.pure.address(addr)
      ]
    });
    
    signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (_) => location.reload(),
    });
  };

  return (
    <Container p="4">
      <Box mb="4" style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)", }}>
        <Flex direction="column" p="4">
          <Heading>Courts</Heading>
          {courts}
          <CreateCourtDialog adminCapId={adminCapId()}/>
        </Flex>
      </Box>
      <Box p="4" style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)", }}>
        <Form onSubmit={submitForm}>
          <Flex gap="4" align="end">
          <FormField name="address">
            <Flex direction="column" gapY="2">
              <FormLabel>User address:</FormLabel>
              <FormControl asChild>
                <input name="address" required/>
              </FormControl>
            </Flex>
            </FormField>
            <FormSubmit asChild>
              <Button>Mint Admin Cap</Button>
            </FormSubmit>
          </Flex>
        </Form>
      </Box>
    </Container>
  );
};

export default Admin;