import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../networkConfig";
import { useParams } from "react-router";
import { Button, Card, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { SealClient, SessionKey } from "@mysten/seal";
import { fromHex } from "@mysten/sui/utils";
import { SEAL_KEY_SERVERS, WALRUS_AGGREGATOR_URL } from "../constants";

const NivraCourt = () => {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { dispute_id } = useParams();
  const packageId = useNetworkVariable('package_id');
  const courtRegistryId = useNetworkVariable("registry_id");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [dispute, setDispute] = useState(null);
  const [partyCap, setPartyCap] = useState(null);
  const [voterCap, setVoterCap] = useState(null);

  useEffect(() => {
    fetch_dispute_data();
    if (currentAccount?.address) {
      getVoterCap();
      getPartyCap();
    }
  }, [currentAccount?.address])

  const getPartyCap = async () => {
    let cursor = null;
    let hasNextPage = false;
    let partyCapFound = false;

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

      let suitablePartyCap = caps.data.find(cap => cap.data.content.fields.dispute_id == dispute_id);

      if (suitablePartyCap) {
        partyCapFound = true;
        setPartyCap(suitablePartyCap.data.content.fields);
      }

      cursor = caps.nextCursor;
      hasNextPage = caps.hasNextPage;
    } while (hasNextPage && !partyCapFound);
  };

  const getVoterCap = async () => {
    let cursor = null;
    let hasNextPage = false;
    let voterCapFound = false;

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

      let suitableVoterCap = caps.data.find(cap => cap.data.content.fields.dispute_id == dispute_id);

      if (suitableVoterCap) {
        voterCapFound = true;
        setVoterCap(suitableVoterCap.data.content.fields);
      }

      cursor = caps.nextCursor;
      hasNextPage = caps.hasNextPage;
    } while (hasNextPage && !voterCapFound);
  };

  const fetch_dispute_data = async () => {
    if (dispute_id) {
      const dispute = await suiClient.getObject({
        id: dispute_id,
        options: { showContent: true },
      });

      if (dispute) {
        const data = dispute.data?.content.fields;
        console.log(data)
        setDispute(data);
      }
    }
  };

  const status_to_string = (i) => {
    switch(i) {
      case "1":
        return "waiting for the other party to accept..";
      case "2":
        return "waiting for the nivsters to be drawn..";
      case "3":
        return "active";
      case "4":
        return "tie";
      case "5":
        return "tallied";
      case "6":
      case "7":
        return "completed";
      case "8":
        return "cancelled";
    };
  };

  const is_response_period = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = dispute.status;

    let response_period_end = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms);

    return timestamp <= response_period_end && status == 1;
  };

  const is_draw_period = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = dispute.status;

    let draw_period_end = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms);

    return timestamp <= draw_period_end && status == 2;
  };

  const is_incomplete = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = dispute.status;

    let draw_period_end = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms);
    let timetable_end = draw_period_end + parseInt(timetable.evidence_period_ms) + parseInt(timetable.voting_period_ms) + parseInt(timetable.appeal_period_ms);

    let untallied_or_unresolved_tie = timestamp > timetable_end && (status == 3 || status == 4);
    let no_init_nivsters = timestamp > draw_period_end && status == 2;

    return no_init_nivsters || untallied_or_unresolved_tie;
  };

  const party_failed_payment = (dispute) => {
    return !is_response_period(dispute) && dispute.status == 1;
  };

  // TODO:
  const rewards_collected = (dispute, partyCap) => {
    let voters_id = dispute.voters.fields.id.id;
    return true;
  }

  const complete_dispute_one_sided = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::resolve_one_sided_dispute`,
      arguments: [
        tx.object(dispute.court),
        tx.object(dispute.id.id),
        tx.object(courtRegistryId),
        tx.object.clock(),
      ]
    });
    
    signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (_) => location.reload(),
    });
  };

  const accept_dispute = () => {
    // TODO: use bigInt for fee calculation
    let disputeFee = parseInt(dispute.economic_params.fields.dispute_fee);
    let appealCount = dispute.appeals_used;

    let fee = Math.ceil(disputeFee * Math.pow(13 / 5, appealCount));

    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::accept_dispute`,
      arguments: [
        tx.object(dispute.court),
        tx.object(dispute.id.id),
        coinWithBalance({
          balance: BigInt(fee),
        }),
        tx.object(partyCap.id.id),
        tx.object.clock(),
      ]
    });
    
    signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (_) => location.reload(),
    });
  };

  const draw_init_nivsters = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::draw_initial_nivsters`,
      arguments: [
        tx.object(dispute.court),
        tx.object(dispute.id.id),
        tx.object.clock(),
        tx.object.random(),
      ]
    });
    
    signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (_) => location.reload(),
    });
  };

  const cancel_dispute = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::cancel_dispute`,
      arguments: [
        tx.object(dispute.id.id), // TODO: swap order
        tx.object(dispute.court),
        tx.object.clock(),
      ]
    });
    
    signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (_) => location.reload(),
    });
  };

  return (
    <Flex p="4" gap="4" direction="column">
      <Flex p="4" gap="2" direction="column" style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)", width: "100%"}}>
        <Heading>Review</Heading>
        <Text><b>Description:</b> {dispute?.description} </Text>
        <Text><b>status:</b> {dispute && status_to_string(dispute.status)} </Text>
        <Separator />
        <b>Evidence</b>
        <Flex gap="4">

        </Flex>
        <Separator />
        <b>Vote</b>
        <Separator />
        <b>Action</b>
        {
          dispute && is_response_period(dispute) && partyCap &&
          <Button onClick={accept_dispute}>Accept Dispute</Button>
        }
        {
          dispute && is_draw_period(dispute) &&
          <Button onClick={draw_init_nivsters}>Drawn Nivsters</Button>
        }
        {
          dispute && party_failed_payment(dispute) &&
          <Button onClick={complete_dispute_one_sided}>Complete Dispute</Button>
        }
        {
          dispute && is_incomplete(dispute) &&
          <Button onClick={cancel_dispute}>Cancel Dispute</Button>
        }
        {
          dispute && dispute.status == 7 && voterCap && !rewards_collected(dispute, voterCap) &&
          <Button>Collect Rewards</Button>
        }
      </Flex>
    </Flex>
  );
};

export default NivraCourt;