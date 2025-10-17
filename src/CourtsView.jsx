import { Box, Card, Container, Flex, Heading, Text } from "@radix-ui/themes"
import { useNetworkVariable } from "./networkConfig";
import { useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { Court } from "./Court";

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
      });

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