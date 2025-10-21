import { Card, Text, Flex, Avatar, DataList, Badge, Separator, Button } from "@radix-ui/themes"
import { StakeDialog } from "./StakeDialog"
import { useEffect, useState } from "react"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "./networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import { DisputeDialog } from "./DisputeDialog";

export const Court = (props) => {
  const [stakeAmount, setStakeAmount] = useState(0);
  const [feeRate, setFeeRate] = useState(0);
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable('package_id');

  useEffect(() => {
    getStakedAmount();
  }, [])

  const getStakedAmount = async () => {
    if (currentAccount) {
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

      // set fee rate
      setFeeRate(innerCourt.data.content.fields.value.fields.fee_rate);

      const stakesDynamicFieldId = innerCourt.data.content.fields.value.fields.stakes.fields.id.id;

      const stakesDynamicFields = await suiClient.getDynamicFields({
        parentId: stakesDynamicFieldId,
      });

      const userStake = stakesDynamicFields.data.find(stakes => stakes.name.value == currentAccount.address);
      
      if (userStake) {
        const stakeId = userStake.objectId;

        const stake = await suiClient.getObject({
          id: stakeId,
          options: { showContent: true},
        });

        const stakedAmount = stake.data.content.fields.value.fields.value.fields.amount;

        setStakeAmount(stakedAmount);
      }
    }
  }

  const withdraw = () => {
    if (currentAccount) {
        const tx = new Transaction();

      const nvr_coins = tx.moveCall({
        target: `${packageId}::court::withdraw`,
        arguments: [
          tx.object(props.id),
        ],
      });

      tx.transferObjects([nvr_coins], tx.pure.address(currentAccount.address));

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: (tx) => {
            location.reload();
          }
        },
        {
          onError: (err) => {
            console.log(err);
          }
        }
      );
    }
  }
    
  return (
    <Card style={{width: "100%",}}>
      <Flex gapX="4">
        <Flex direction="column">
          <Flex gap="4" pb="2">
            <Avatar size="4" radius="full" fallback={props.name.charAt(0)} color="indigo"/>
            <Flex direction="column">
              <Text as="div" size="2" weight="bold">
		        {props.name}
		      </Text>
              <Text as="div" size="2" color="gray">
		        {props.description}
		      </Text>
            </Flex>
          </Flex>
          <Text as="div" size="1">
            category: {props.category}
          </Text>
          <Text as="div" size="1">
            contract: <a href={"https://suiscan.xyz/devnet/object/" + props.id}>{props.id}</a>
          </Text>
        </Flex>
        <Separator orientation="vertical" size="3" my="3"/>
        <Flex direction="column">
          <DataList.Root>
            <DataList.Item>
              <DataList.Label>Min_stake:</DataList.Label>
              <DataList.Value>
			    <Badge color="jade" variant="soft" radius="full">
				  {parseInt(props.min_stake) / 1_000_000} NVR
			    </Badge>
		      </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Staked:</DataList.Label>
              <DataList.Value>
			    <Badge color="jade" variant="soft" radius="full">
				  {stakeAmount / 1_000_000} NVR
			    </Badge>
		      </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Reward:</DataList.Label>
              <DataList.Value>
			    <Badge color="blue" variant="soft" radius="full">
				  {parseInt(props.reward) / 1_000_000_000} SUI
			    </Badge>
		      </DataList.Value>
            </DataList.Item>
          </DataList.Root>
        </Flex>
        <Separator orientation="vertical" size="3" my="3"/>
        <Flex direction="column-reverse">
          <Flex gapX="4">
            <Button onClick={withdraw}>Withdraw</Button>
            <StakeDialog court_id={props.id}/>
            <DisputeDialog court_id={props.id} feeRate={feeRate}/>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}