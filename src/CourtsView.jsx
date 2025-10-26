import { Box, Card, Container, Flex, Heading, Text } from "@radix-ui/themes"
import { useNetworkVariable } from "./networkConfig";
import { useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { Court } from "./Court";

export const CourtsView = () => {
  const [metadata, setMetadata] = useState([]);
  const courtRegistryId = useNetworkVariable("registry_id");
  const suiClient = useSuiClient();

  // Query the Sui blockchain for the "Court Registry" object
  // This retrieves detailed information about the registry, including its content and type
  const { data, _isPending, _error } = useSuiClientQuery(
    "getObject",
    {
      id: courtRegistryId,
      options: {
        showContent: true,
        showType: true,
      }
    }
  );

  useEffect(()=>{
    getCourts();
  }, [data?.data])

  const getCourts = async () => {
    if (data?.data) {
      // Step 1: Get the ID of the inner dynamic field container within the registry
      const parentId = data.data.content.fields.inner.fields.id.id;

      // Step 2: Fetch all dynamic fields under this parent (the "inner registry" objects)
      const fields = await suiClient.getDynamicFields({
          parentId,
      });

      // Step 3: Get the ID of the first "inner court registry" object
      const courtRegistryInnerId = fields.data[0].objectId;

      // Step 4: Fetch the inner court registry object using its ID
      const courtRegistryInner = await suiClient.getObject({
        id: courtRegistryInnerId,
        options: { showContent: true },
      });

      // Step 5: From this inner object, get the ID of the "courts" dynamic field container
      const courtsId = courtRegistryInner.data?.content.fields.value.fields.courts.fields.id.id;

      // Step 6: Fetch all dynamic fields (individual court entries) under the "courts" container
      const courtFields = await suiClient.getDynamicFields({
          parentId: courtsId,
      });

      // Step 7: Extract the object IDs for each court metadata entry
      const courtMetadataIds = courtFields.data.map(data => data.objectId);
      
      // Step 8: Fetch all the court metadata objects in a single multi-call for efficiency
      const metadata = await suiClient.multiGetObjects({
        ids: courtMetadataIds,
        options: { showContent: true },
      });

      // Step 9: Extract only the useful "fields" data from each metadata object
      const courtsData = metadata.map(data => data.data?.content.fields)

      setMetadata(courtsData);
    }
  }

  const mdCards = metadata.map(md => 
    <Court
      key={md.name}
      id={md.name}
      name={md.value.fields.name}
      description={md.value.fields.description}
      category={md.value.fields.category}
      min_stake={md.value.fields.min_stake}
      reward={md.value.fields.reward}
    />
  )

  return (
    <Container p="4" pt="0">
      <Box style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)", }}>
        <Flex direction="column" align="center" gap="3">
          <Heading as="h1">Courts</Heading>
        </Flex>
        <Flex p="4" gap="4" wrap="wrap">
          {mdCards}
        </Flex>
      </Box>
    </Container>
  )
}