import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../networkConfig";
import { Button, Card, Flex, Separator, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import StakeDialog from "../dialogs/StakeDialog";
import WithdrawDialog from "../dialogs/WithdrawDialog";
import { Transaction } from "@mysten/sui/transactions";
import DisputeDialog from "../dialogs/DisputeDialog";

const CourtView = (props) => {
  const packageId = useNetworkVariable('package_id');
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [courtInner, setCourtInner] = useState(null);
  const [userStake, setUserStake] = useState(null);
  const currentAccount = useCurrentAccount();

  useEffect(() => {
    getCourtData();
  }, [])

  const getCourtData = async () => {
    const court = await suiClient.getObject({
      id: props.id,
      options: { showContent: true },
    });

    const innerCourtDynamicFieldId = court.data.content.fields.inner.fields.id.id;

    const innerCourtDynamicField = await suiClient.getDynamicFields({
      parentId: innerCourtDynamicFieldId,
    });

    const innerCourtId = innerCourtDynamicField.data[0].objectId;

    const innerCourt = await suiClient.getObject({
      id: innerCourtId,
      options: { showContent: true},
    });

    let innerCourtFields = innerCourt.data.content.fields.value.fields;

    setCourtInner(innerCourtFields);

    if (currentAccount) {
      const stakesDynamicFieldId = innerCourt.data.content.fields.value.fields.stakes.fields.id.id;

      let cursor = null;
      let hasNextPage = false;
      let userStakeFound = false;

      do {
        const stakesDynamicFields = await suiClient.getDynamicFields({
          parentId: stakesDynamicFieldId,
          cursor,
        });

        const userStake = stakesDynamicFields.data.find(stakes => stakes.name.value == currentAccount.address);

        if (userStake) {
          userStakeFound = true;

          const stake = await suiClient.getObject({
            id: userStake.objectId,
            options: { showContent: true},
          });

          const stakeFields = stake.data.content.fields.value.fields.value.fields;

          setUserStake(stakeFields);
        }

        cursor = stakesDynamicFields.nextCursor;
        hasNextPage = stakesDynamicFields.hasNextPage;

      } while (hasNextPage && !userStakeFound);
    }
  };

  const joinWorkerPool = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::join_worker_pool`,
      arguments: [
        tx.object(props.id),
      ]
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: (tx) => {
          location.reload();
        }
      },
    )
  }

  const leaveWorkerPool = () => {
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::leave_worker_pool`,
      arguments: [
        tx.object(props.id),
      ]
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: (tx) => {
          location.reload();
        }
      },
    )
  }

  const workerPool = () => {
    if (userStake) {
      if (parseInt(userStake.amount) > parseInt(courtInner.min_stake) && !userStake.in_worker_pool) {
        return (
          <Button onClick={joinWorkerPool}>Join worker pool</Button>
        );
      }

      if (userStake.in_worker_pool) {
        return (
          <Button onClick={leaveWorkerPool}>Leave worker pool</Button>
        );
      }
    }
  }

  return (
    <Card style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)",}}>
      <Flex direction="column" gap="2">
        <Text>{props.name}</Text>
        <Text><b>Description: </b>{props.description}</Text>
        <Text><b>Required skills: </b>{props.skills}</Text>
        <Text><b>Dispute fee: </b>{(parseInt(courtInner?.dispute_fee) / 1_000_000_000)} Sui</Text>
        <Text><b>Min stake: </b>{(parseInt(courtInner?.min_stake) / 1_000_000)} NVR</Text>
        <Separator />
        <Flex gap="2">
          staked_amount: {userStake ? parseInt(userStake.amount) / 1_000_000 : 0} NVR, 
          locked_amount: {userStake ? parseInt(userStake.locked_amount) / 1_000_000 : 0} NVR, 
          unclaimed_rewards: {userStake ? parseInt(userStake.reward_amount) / 1_000_000_000 : 0} Sui
        </Flex>
        <Separator />
        <Flex gap="2">
          <StakeDialog courtId={props.id}/>
          <WithdrawDialog courtId={props.id}/>
          {workerPool()}
          <DisputeDialog courtId={props.id} disputeFee={courtInner?.dispute_fee} />
        </Flex>
      </Flex>
    </Card>
  );
}

export default CourtView;