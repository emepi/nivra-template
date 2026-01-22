import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../networkConfig";
import { Flex, Heading } from "@radix-ui/themes";
import { useEffect, useState } from "react";

const MyCases = () => {
  const packageId = useNetworkVariable('package_id');
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [partyCaps, setPartyCaps] = useState([]);
  const [voterCaps, setVoterCaps] = useState([]);

  useEffect(() => {
    if (currentAccount?.address) {
      getPartyCaps();
      getVoterCaps();
    }
  }, [currentAccount?.address])

  const getPartyCaps = async () => {
    const allCaps = [];
    let cursor = null;
    let hasNextPage = false;

    do {
      const caps = await suiClient.getOwnedObjects({
        owner: currentAccount.address,
        cursor,
        filter: {
          StructType: `${packageId}::dispute::PartyCap`
        },
        options: {
            showContent: true,
        }
      });
      allCaps.push(...caps.data);
      cursor = caps.nextCursor;
      hasNextPage = caps.hasNextPage;
    } while (hasNextPage);

    setPartyCaps(allCaps);
  };

  const getVoterCaps = async () => {
    const allCaps = [];
    let cursor = null;
    let hasNextPage = false;

    do {
      const caps = await suiClient.getOwnedObjects({
        owner: currentAccount.address,
        cursor,
        filter: {
          StructType: `${packageId}::dispute::VoterCap`
        },
        options: {
            showContent: true,
        }
      });
      allCaps.push(...caps.data);
      cursor = caps.nextCursor;
      hasNextPage = caps.hasNextPage;
    } while (hasNextPage);

    setVoterCaps(allCaps);
  };

  return (
    <Flex p="4" gap="4">
      <Flex direction="column" p="2" style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)", width: "100%"}}>
        <Heading>I'm voter on cases:</Heading>
        {voterCaps.map(cap => 
          <a href={"/cases/" + cap.data.content.fields.dispute_id} key={cap.data.content.fields.dispute_id}>
            {cap.data.content.fields.dispute_id.substring(0,15)}...
          </a>
        )}
      </Flex>
      <Flex direction="column" p="2" style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)", width: "100%"}}>
        <Heading>I'm party on cases:</Heading>
        {partyCaps.map(cap => 
          <a href={"/cases/" + cap.data.content.fields.dispute_id} key={cap.data.content.fields.dispute_id}>
            {cap.data.content.fields.dispute_id.substring(0,15)}...
          </a>
        )}
      </Flex>
    </Flex>
  )
};

export default MyCases;