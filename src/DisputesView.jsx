import { useCurrentAccount, useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import { Box, Card, Container, Flex, Heading, Text, Separator } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useNetworkVariable } from "./networkConfig";

export const DisputesView = () => {
  const [disputes, setDisputes] = useState([]);
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const packageId = useNetworkVariable("package_id");

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

  const getDisputes = async () => {
    if (data) {
      const dispute_ids = data.data.map((data) => data.data.content.fields.dispute_id);
      
      const disputes = await suiClient.multiGetObjects({
        ids: dispute_ids,
        options: { showContent: true },
      });

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