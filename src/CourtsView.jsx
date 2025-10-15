import { Box, Card, Container, Flex, Heading, Text } from "@radix-ui/themes"
import { useNetworkVariable } from "./networkConfig";
import { useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";

export const CourtsView = () => {
  const [metadata, setMetadata] = useState([]);
  const courtRegistryId = useNetworkVariable("registry_id");
  const suiClient = useSuiClient();

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
      const parentId = data.data.content.fields.inner.fields.id.id;

      const fields = await suiClient.getDynamicFields({
          parentId,
      });

      const courtRegistryInnerId = fields.data[0].objectId;

      const courtRegistryInner = await suiClient.getObject({
        id: courtRegistryInnerId,
        options: { showContent: true },
      });

      const courtsId = courtRegistryInner.data?.content.fields.value.fields.courts.fields.id.id;

      const courtFields = await suiClient.getDynamicFields({
          parentId: courtsId,
      });

      const courtMetadataIds = courtFields.data.map(data => data.objectId);
      
      const metadata = await suiClient.multiGetObjects({
        ids: courtMetadataIds,
        options: { showContent: true },
      })
      .then(metadata => metadata
        .map(data => data.data?.content.fields.value.fields));

      //console.log(metadata);

      setMetadata(metadata);
    }
  }

  const mdCards = metadata.map(md => 
    <Card key={md.name} size="4">
      <Box>
		<Text as="div" size="2" weight="bold">
		  {md.name}
		</Text>
		<Text as="div" size="2" color="gray">
		  {md.description}
		</Text>
          <Text as="div" size="1" color="gray">
            category: {md.category}
          </Text>
        <Flex gap="4">
          <Text as="div" size="1">
            min_stake: {md.min_stake} NVR
          </Text>
          <Text as="div" size="1">
            reward: {md.reward} SUI
          </Text>
        </Flex>
	  </Box>
    </Card>
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