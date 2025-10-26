import { useCurrentAccount, useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import { Box, Card, Container, Flex, Heading, Text, Separator } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useNetworkVariable } from "./networkConfig";

export const DisputesView = () => {
  const [disputes, setDisputes] = useState([]);
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const packageId = useNetworkVariable("package_id");

  // Query the Sui blockchain for all objects owned by the current account
  // that match the struct type `${packageId}::dispute::VoterCap`.
  const {data} = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address,
      options: {
        showContent: true,
        showType: true,
      },
      filter: {
        StructType: `${packageId}::dispute::VoterCap`,
      }
    }
  );

  // Async function to fetch all dispute data associated with the user's VoterCap objects
  const getDisputes = async () => {
    if (data) {
      // Step 1: Extract the `dispute_id` field from each VoterCap object
      // Each VoterCap links the voter to a specific dispute on-chain
      const dispute_ids = data.data.map((data) => data.data.content.fields.dispute_id);
      
      // Step 2: Fetch all disputes at once using their object IDs
      // `multiGetObjects` is more efficient than fetching each one separately
      const disputes = await suiClient.multiGetObjects({
        ids: dispute_ids,
        options: { showContent: true },
      });

      // Step 3: Extract just the useful field data from each dispute object
      const dispute_data = disputes.map((dispute) => dispute.data.content.fields);

      setDisputes(dispute_data);
    }
  };

  useEffect(() => {
    getDisputes();
  }, [data?.data])

  const dispute_cards = disputes.map(dispute => 
    <Card key={dispute.id.id} style={{width: "100%",}}>
      <Flex gap="4">
        <Flex direction="column">
          <Text as="div" size="1">
            Dispute ID: <a href={"https://suiscan.xyz/devnet/object/" + dispute.id.id}>{dispute.id.id}</a>
          </Text>
          <Text as="div" size="1">
            Contract ID: <a href={"https://suiscan.xyz/devnet/object/" + dispute.contract}>{dispute.contract}</a>
          </Text>
          <Text as="div" size="1">
            Description: {dispute.description}
          </Text>
          <Text as="div" size="1">
            Voting Options: {dispute.options.toString()}
          </Text>
        </Flex>
        <Separator orientation="vertical" size="3" my="3"/>
        <Flex direction="column">
          <Text as="div" size="1">
            Round: {dispute.round}
          </Text>
          <Text as="div" size="1">
            Evidence Period Ends: {(new Date(parseInt(dispute.timetable.fields.round_init_ms) + parseInt(dispute.timetable.fields.evidence_period_ms))).toLocaleString()}
          </Text>
          <Text as="div" size="1">
            Voting Period Ends: {(new Date(parseInt(dispute.timetable.fields.round_init_ms) + parseInt(dispute.timetable.fields.voting_period_ms) + parseInt(dispute.timetable.fields.evidence_period_ms))).toLocaleString()}
          </Text>
          <Text as="div" size="1">
            Appeal Period Ends: {(new Date(parseInt(dispute.timetable.fields.round_init_ms) + parseInt(dispute.timetable.fields.appeal_period_ms) + parseInt(dispute.timetable.fields.evidence_period_ms) + parseInt(dispute.timetable.fields.voting_period_ms))).toLocaleString()}
          </Text>
        </Flex>
        <Separator orientation="vertical" size="3" my="3"/>
        <Flex direction="column-reverse">
          <a href={"/disputes/" + dispute.id.id}>Enter Court</a>
        </Flex>
      </Flex>
    </Card>
  )

  return (
    <Container p="4" pt="0">
      <Box style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)", }}>
        <Flex direction="column" align="center" gap="3">
          <Heading as="h1">My Cases</Heading>
        </Flex>
        <Flex p="4" gap="4" wrap="wrap">
          {dispute_cards}
        </Flex>
      </Box>
    </Container>
  );
}