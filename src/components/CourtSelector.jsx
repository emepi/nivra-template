import { useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../networkConfig";
import { useEffect, useState } from "react";
import { Flex, Heading, Text } from "@radix-ui/themes";
import CourtView from "./CourtView.jsx";

const CourtSelector = () => {
  const suiClient = useSuiClient();
  const courtRegistryId = useNetworkVariable("registry_id");
  const [courts, setCourts] = useState(new Map());
  const [category, setCategory] = useState("");

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

    let map = new Map();

    courtsData.forEach(court => {
      let category = court.value.fields.category;

      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category).push(court);
    });

    setCourts(map);
    setCategory(map.keys().next().value);
  };

  const changeCategory = (category) => {
    setCategory(category);
  }

  return (
    <Flex direction="column">
      <Heading>Courts</Heading>
      <Flex gap="2" pb="2">
        {Array.from(courts.keys()).map(key => {
          if(key === category) {
            return (
              <Text key={key} style={{ color: "blue",}}>
                {key}
              </Text>
            );
          } else {
            return (
              <Text key={key} onClick={() => changeCategory(key)}>
                {key}
              </Text>
            );
          }
        })}
      </Flex>
      <Flex gap="2" direction="column">
        {courts.get(category)?.map(courtData => 
          <CourtView
            key={courtData.name}
            id={courtData.name}
            name={courtData.value.fields.name}
            description={courtData.value.fields.description}
            skills={courtData.value.fields.skills}
          />
        )}
      </Flex>
    </Flex>
  );
};

export default CourtSelector;