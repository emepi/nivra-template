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
      // Fetch the main "court" object from the blockchain using its ID (passed via props)
      const court = await suiClient.getObject({
        id: props.id,
        options: { showContent: true }, // include object content in response
      });

      // Extract the ID of the "inner court" dynamic field from the court object
      const innerCourtDynamicFieldId = court.data.content.fields.inner.fields.id.id;

      // Fetch the list of dynamic fields under the "inner court" parent object
      const innerCourtDynamicField = await suiClient.getDynamicFields({
        parentId: innerCourtDynamicFieldId,
      });

      // Get the ID of the first "inner court" object (assuming only one exists)
      const innerCourtId = innerCourtDynamicField.data[0].objectId;

      // Fetch the full "inner court" object by its ID
      const innerCourt = await suiClient.getObject({
        id: innerCourtId,
        options: { showContent: true},
      });

      setFeeRate(innerCourt.data.content.fields.value.fields.fee_rate);

      // Extract the dynamic field ID for the "stakes" map (which holds user stake data)
      const stakesDynamicFieldId = innerCourt.data.content.fields.value.fields.stakes.fields.id.id;

      // Fetch all dynamic fields (stake records) under the "stakes" parent
      const stakesDynamicFields = await suiClient.getDynamicFields({
        parentId: stakesDynamicFieldId,
      });

      // Find the specific stake object that belongs to the current user's address
      const userStake = stakesDynamicFields.data.find(stakes => stakes.name.value == currentAccount.address);
      
      if (userStake) {
        // Get the ID of the stake object
        const stakeId = userStake.objectId;

        // Fetch the detailed stake object
        const stake = await suiClient.getObject({
          id: stakeId,
          options: { showContent: true},
        });

        // Extract the actual staked amount from the stake object data
        const stakedAmount = stake.data.content.fields.value.fields.value.fields.amount;

        setStakeAmount(stakedAmount);
      }
    }
  }

  const withdraw = () => {
    if (currentAccount) {
      const tx = new Transaction();

      // Call the Move smart contract function `withdraw` from the `court` module
      // passing in the court object ID as an argument
      const nvr_coins = tx.moveCall({
        target: `${packageId}::court::withdraw`,
        arguments: [
          tx.object(props.id),
        ],
      });

      // Transfer the withdrawn NVR coins back to the user's wallet address
      tx.transferObjects([nvr_coins], tx.pure.address(currentAccount.address));

      // Sign the transaction and execute it on the Sui network
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