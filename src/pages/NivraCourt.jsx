import { useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../networkConfig";
import { useParams } from "react-router";
import { Button, Card, Flex, Heading, Separator, Text, Box, DataList } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { SealClient, SessionKey } from "@mysten/seal";
import { fromHex } from "@mysten/sui/utils";
import { SEAL_KEY_SERVERS, WALRUS_AGGREGATOR_URL } from "../constants";
import { EvidenceDialog } from "../dialogs/EvidenceDialog";
import { Form } from "radix-ui";

const NivraCourt = () => {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { mutate: signPersonalMessage } = useSignPersonalMessage();
  const { dispute_id } = useParams();
  const packageId = useNetworkVariable('package_id');
  const courtRegistryId = useNetworkVariable("registry_id");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [dispute, setDispute] = useState(null);
  const [partyCap, setPartyCap] = useState(null);
  const [voterCap, setVoterCap] = useState(null);
  const [voterDetails, setVoterDetails] = useState(null);
  const [sealClient, setSealClient] = useState(null);

  useEffect(() => {
    fetch_dispute_data();
    if (currentAccount?.address) {
      getVoterCap();
      getPartyCap();
    }
  }, [currentAccount?.address]);

  useEffect(() => {
    if (dispute) {
      initSealCli();
    }
    if (dispute && voterCap) {
      getVoterDetails();
    }
  }, [dispute && voterCap]);

  const initSealCli = () => {
    const sealClient = new SealClient({
      suiClient,
      serverConfigs: dispute.key_servers.map((id) => ({
        objectId: id,
        weight: dispute.threshold,
      })),
      verifyKeyServers: false,
    });

    setSealClient(sealClient);
  }

  const getVoterDetails = async () => {
    let votersId = dispute.voters.fields.id.id;
    let userAddr = voterCap.voter;
    let cursor = null;
    let hasNextPage = false;
    let voterDetailsFound = false;

    do {
      const fields = await suiClient.getDynamicFields({
        parentId: votersId,
        cursor,
      });

      let voterDetails = fields.data.find(field => field.name.value == userAddr);

      if (voterDetails) {
        let objectId = voterDetails.objectId;

        const vdObject = await suiClient.getObject({
          id: objectId,
          options: { showContent: true },
        });

        setVoterDetails(vdObject.data.content.fields.value.fields.value.fields);
        voterDetailsFound = true;
      }

      cursor = fields.nextCursor;
      hasNextPage = fields.hasNextPage;
    } while (hasNextPage && !voterDetailsFound);
  }

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
          StructType: `${packageId}::dispute::VoterCap`
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

  const period_to_string = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;

    let evidence_period_end = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms)
    + parseInt(timetable.evidence_period_ms);

    if (timestamp <= evidence_period_end) {
      return "evidence";
    }

    let voting_period_end = evidence_period_end + parseInt(timetable.voting_period_ms);

    if (timestamp > evidence_period_end && timestamp <= voting_period_end) {
      return "voting";
    }

    let appeal_period_end = voting_period_end + parseInt(timetable.appeal_period_ms);

    if (timestamp > voting_period_end && timestamp <= appeal_period_end) {
      return "appeal";
    }
  }

  const is_response_period = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = parseInt(dispute.status);

    let response_period_end = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms);

    return timestamp <= response_period_end && status == 1;
  };

  const is_draw_period = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = parseInt(dispute.status);

    let draw_period_end = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms);

    return timestamp <= draw_period_end && status == 2;
  };

  const is_evidence_period = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = parseInt(dispute.status);

    let evidence_period_end = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms)
    + parseInt(timetable.evidence_period_ms);

    return timestamp <= evidence_period_end && status == 3;
  };

  const is_voting_period = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = parseInt(dispute.status);

    let voting_period_start = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms)
    + parseInt(timetable.evidence_period_ms);
    let voting_period_end = voting_period_start + parseInt(timetable.voting_period_ms);

    return timestamp > voting_period_start && timestamp <= voting_period_end && status == 3;
  }

  const is_appeal_period_untallied = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = parseInt(dispute.status);

    let appeal_period_start = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms)
    + parseInt(timetable.evidence_period_ms) + parseInt(timetable.voting_period_ms);
    let appeal_period_end = appeal_period_start + parseInt(timetable.appeal_period_ms);

    return timestamp > appeal_period_start && timestamp <= appeal_period_end && status == 3;
  }

  const is_appeal_period_tie = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = parseInt(dispute.status);

    let appeal_period_start = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms)
    + parseInt(timetable.evidence_period_ms) + parseInt(timetable.voting_period_ms);
    let appeal_period_end = appeal_period_start + parseInt(timetable.appeal_period_ms);

    return timestamp > appeal_period_start && timestamp <= appeal_period_end && status == 4;
  }

  const is_appeal_period_tallied = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = parseInt(dispute.status);

    let appeal_period_start = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms)
    + parseInt(timetable.evidence_period_ms) + parseInt(timetable.voting_period_ms);
    let appeal_period_end = appeal_period_start + parseInt(timetable.appeal_period_ms);

    return timestamp > appeal_period_start && timestamp <= appeal_period_end && status == 5;
  }

  const is_completed = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = parseInt(dispute.status);

    let timetable_end = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms)
    + parseInt(timetable.evidence_period_ms) + parseInt(timetable.voting_period_ms) + parseInt(timetable.appeal_period_ms);

    return timestamp > timetable_end && status == 5;
  }

  const is_incomplete = (dispute) => {
    let timestamp = Date.now();
    let timetable = dispute.timetable.fields;
    let status = parseInt(dispute.status);

    let draw_period_end = parseInt(timetable.round_init_ms) + parseInt(timetable.response_period_ms) + parseInt(timetable.draw_period_ms);
    let timetable_end = draw_period_end + parseInt(timetable.evidence_period_ms) + parseInt(timetable.voting_period_ms) + parseInt(timetable.appeal_period_ms);

    let untallied_or_unresolved_tie = timestamp > timetable_end && (status == 3 || status == 4);
    let no_init_nivsters = timestamp > draw_period_end && status == 2;

    return no_init_nivsters || untallied_or_unresolved_tie;
  };

  const party_failed_payment = (dispute) => {
    return !is_response_period(dispute) && parseInt(dispute.status) == 1;
  };

  const rewards_collected = () => {
    if (voterDetails) {
      return voterDetails.reward_collected;
    }

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
        tx.object(dispute.id.id),
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

  const collect_rewards_cancelled = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::collect_rewards_cancelled`,
      arguments: [
        tx.object(dispute.court),
        tx.object(dispute.id.id),
        tx.object(voterCap.id.id)
      ]
    });
    
    signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (_) => location.reload(),
    });
  };

  const EvidenceItem = (props) => {
    const [evData, setEvData] = useState(null);

    useEffect(() => {
      suiClient.getObject({
        id: props.id,
        options: { showContent: true },
      }).then(res => setEvData(res));
    }, [])

    return (
      evData &&
      <Box p="4" style={{border: "1px solid gray", borderRadius: "5px"}}>
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label minWidth="88px">No:</DataList.Label>
			      <DataList.Value>{props.i + 1}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Description:</DataList.Label>
			      <DataList.Value>{evData.data.content.fields.description}</DataList.Value>
          </DataList.Item>
          {evData.data.content.fields.blob_id && 
          <DataList.Item>
            <DataList.Label minWidth="88px">File:</DataList.Label>
			      <DataList.Value><a href={`${WALRUS_AGGREGATOR_URL}/v1/blobs/${evData.data.content.fields.blob_id}`}>Link</a></DataList.Value>
          </DataList.Item>
          }
        </DataList.Root>
      </Box>
    );
  }

  const evidence = () => dispute?.evidence.fields.contents.map((ev) =>
    <Card key={ev.fields.key}>
      <Text size="1">Evidence by: <a href={"https://suiscan.xyz/testnet/account/" + ev.fields.key}>{ev.fields.key}</a></Text>
      <Flex gap="4" pt="4" direction="column">
        {ev.fields.value.map((ev, i) => 
          <EvidenceItem id={ev} i={i} key={i}/>
        )}
      </Flex>
    </Card>
  );

  const submit_vote = async () => {
    let voteForm = new FormData(document.getElementById("vote-form"));
    let option = voteForm.get("option");
    let party = voteForm.get("party");

    let option_idx = dispute.options.findIndex(opt => opt == option);
    let party_idx = dispute.parties.findIndex(pt => pt == party);

    const { encryptedObject, key } = await sealClient.encrypt({
      threshold: dispute.threshold,
      packageId: packageId,
      id: dispute.id.id,
      data: new Uint8Array([option_idx, party_idx]),
      aad: fromHex(currentAccount.address),
      demType: 1,
    });

    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::dispute::cast_vote`,
      arguments: [
        tx.object(dispute.id.id),
        tx.pure.vector('u8', encryptedObject),
        tx.object(voterCap.id.id),
        tx.object.clock(),
      ]
    });

    signAndExecute({transaction: tx});
  };

  const tally_votes = async () => {
    const sessionKey = await SessionKey.create({
      address: currentAccount.address,
      packageId: packageId,
      ttlMin: 10,
      suiClient,
    });

    const message = sessionKey.getPersonalMessage();

    const signed = await new Promise((resolve, reject) => {
      signPersonalMessage(
      {
        message,
      },
      {
        onSuccess: (result) => {
          sessionKey.setPersonalMessageSignature(result.signature);
          resolve();
        },
        onError: (err) => reject(),
      });
    });

    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::dispute::seal_approve`, 
      arguments: [
        tx.pure.vector("u8", fromHex(dispute.id.id)),
        tx.object(dispute.id.id),
        tx.object.clock(),
      ]
    });

    const txBytes = await tx.build( { client: suiClient, onlyTransactionKind: true });

    const derivedKeys = await sealClient.getDerivedKeys({
      kemType: 0,
      id: dispute.id.id,
      txBytes,
      sessionKey,
      threshold: 1,
    });

    const keyServersUsed = Array.from(derivedKeys.keys());
    const derivedKeysUsed = Array.from(derivedKeys.values()).map((dk) =>
      fromHex(dk.representation)
    );

    const tx2 = new Transaction();
        
    tx2.moveCall({
      target: `${packageId}::dispute::finalize_vote`,
      arguments: [
        tx2.object(dispute.id.id),
        tx2.pure.address(packageId),
        tx2.pure.vector('vector<u8>', derivedKeysUsed),
        tx2.pure.vector('address', keyServersUsed),
        tx2.object.clock(),
      ]
    });

    signAndExecute(
    {
      transaction: tx2,
    },
    {
      onSuccess: (tx) => {
        location.reload();
      },
    });
  };

  const handle_dispute_tie = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::handle_dispute_tie`,
      arguments: [
        tx.object(dispute.court),
        tx.object(dispute.id.id),
        tx.object.clock(),
        tx.object.random()
      ]
    });
    
    signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (_) => location.reload(),
    });
  };

  const appeal = () => {
    // TODO: use bigInt for fee calculation
    let disputeFee = parseInt(dispute.economic_params.fields.dispute_fee);
    let appealCount = dispute.appeals_used + 1;

    let fee = Math.ceil(disputeFee * Math.pow(13 / 5, appealCount));

    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::open_appeal`,
      arguments: [
        tx.object(dispute.court),
        tx.object(dispute.id.id),
        coinWithBalance({
          balance: BigInt(fee),
        }),
        tx.object(partyCap.id.id),
        tx.object.clock(),
        tx.object.random()
      ]
    });
    
    signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (_) => location.reload(),
    });
  };

  const complete_dispute = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::complete_dispute`,
      arguments: [
        tx.object(dispute.court),
        tx.object(dispute.id.id),
        tx.object(courtRegistryId),
        tx.object.clock()
      ]
    });
    
    signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (_) => location.reload(),
    });
  };

  const collect_rewards_one_sided = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::collect_rewards_one_sided`,
      arguments: [
        tx.object(dispute.court),
        tx.object(dispute.id.id),
        tx.object(voterCap.id.id)
      ]
    });
    
    signAndExecute({
      transaction: tx,
    }, {
      onSuccess: (_) => location.reload(),
    });
  };

  const collect_rewards_completed = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::collect_rewards_completed`,
      arguments: [
        tx.object(dispute.court),
        tx.object(dispute.id.id),
        tx.object(voterCap.id.id)
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
        <Flex gap="4">
          <Flex direction="column">
            <Text><b>Description:</b> {dispute?.description} </Text>
            <Text><b>Status:</b> {dispute && status_to_string(dispute.status)} </Text>
            {
              dispute && dispute.status >= 3 && dispute.status <= 5 &&
              <Text><b>Period: </b>{period_to_string(dispute)}</Text> 
            }
          </Flex>
          <Flex direction="column">
            <Text><b>Round: </b> {dispute?.round}</Text>
            <Text><b>Appeals used: </b> {dispute?.appeals_used} / {dispute?.max_appeals}</Text>
            {
              dispute && dispute.winner_option != null && dispute.winner_option >= 0 &&
              <Text><b>Winner Option: </b>{dispute.options[dispute.winner_option]}</Text>
            }
          </Flex>
          <Flex direction="column">
            {
              dispute && dispute.winner_party != null && dispute.winner_party >= 0 &&
              <Text><b>Winner Party: </b>{dispute.parties[dispute.winner_party].substring(0, 15)}...</Text>
            }
          </Flex>
        </Flex>
        <Separator />
        <b>Evidence</b>
        <Flex gap="4">
          {evidence()}
        </Flex>
        <Separator />
        <b>Vote</b>
        <Form.Root id="vote-form">
          <Flex direction="column" gap="2">
          <Form.Field name="option">
	          <Form.Label>Option: </Form.Label>
	          <Form.Control asChild>
		          <select>
                {dispute?.options.map(option => 
                  <option key={option} value={option}>{option}</option>
                )}
		          </select>
	          </Form.Control>
         </Form.Field>
         <Form.Field name="party">
	          <Form.Label>Party:  </Form.Label>
	          <Form.Control asChild>
		          <select>
                {dispute?.parties.map(party => 
                  <option key={party} value={party}>{party}</option>
                )}
		          </select>
	          </Form.Control>
         </Form.Field>
         </Flex>
        </Form.Root>
        <Separator />
        <b>Action</b>
        {
          dispute && is_response_period(dispute) && partyCap &&
          <Button onClick={accept_dispute}>Accept Dispute (Has to be done by the other party)</Button>
        }
        {
          dispute && is_draw_period(dispute) &&
          <Button onClick={draw_init_nivsters}>Draw Nivsters</Button>
        }
        {
          dispute && partyCap && is_evidence_period(dispute) &&
          <EvidenceDialog disputeID={dispute_id} partyCap={partyCap}/>
        }
        {
          dispute && voterCap && is_voting_period(dispute) &&
          <Button onClick={submit_vote}>Submit Vote</Button>
        }
        {
          dispute && is_appeal_period_untallied(dispute) &&
          <Button onClick={tally_votes}>Tally Votes</Button>
        }
        {
          dispute && is_appeal_period_tie(dispute) &&
          <Button onClick={handle_dispute_tie}>Draw an additional nivster</Button>
        }
        {
          dispute && partyCap && is_appeal_period_tallied(dispute) && dispute.appeals_used < dispute.max_appeals &&
          <Button onClick={appeal}>Appeal</Button>
        }
        {
          dispute && is_completed(dispute) &&
          <Button onClick={complete_dispute}>Complete Dispute</Button>
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
          dispute && dispute.status == 6 && voterCap && !rewards_collected() &&
          <Button onClick={collect_rewards_completed}>Collect Rewards</Button>
        }
        {
          dispute && dispute.status == 7 && voterCap && !rewards_collected() &&
          <Button onClick={collect_rewards_one_sided}>Collect Rewards</Button>
        }
        {
          dispute && dispute.status == 8 && voterCap && !rewards_collected() &&
          <Button onClick={collect_rewards_cancelled}>Refund Stake</Button>
        }
      </Flex>
    </Flex>
  );
};

export default NivraCourt;