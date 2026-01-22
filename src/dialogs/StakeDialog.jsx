import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Form, FormControl, FormField, FormLabel, FormSubmit } from "@radix-ui/react-form";
import { Dialog, Button, Flex } from "@radix-ui/themes";
import React from "react";
import { useNetworkVariable } from "../networkConfig";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";

const StakeDialog = (props) => {
  const [open, setOpen] = React.useState(false);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable('package_id');
  const coinType = useNetworkVariable('nvr_coin_type');
  const courtId = props.courtId;

  const submitForm = (event) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.target));
    const amount = entries.stake_amount * 1_000_000;
    
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::stake`,
      arguments: [
        tx.object(courtId),
        coinWithBalance({
          balance: BigInt(amount),
          type: coinType,
        }),
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
        {
            onError: (err) => {
                console.log(err);
            }
        }
    )

    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button>Stake</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Stake NVR Token</Dialog.Title>
        <Form onSubmit={submitForm}>
          <Flex direction="column">
            <FormField name="stake_amount">
              <Flex direction="column" gapY="2">
                <FormLabel>Amount (NVR):  </FormLabel>
                <FormControl asChild>
                  <input type="number" name="stake_amount" min="0" required/>
                </FormControl>
              </Flex>
            </FormField>
            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">Cancel</Button>
              </Dialog.Close>
              <FormSubmit asChild>
                <Button>Stake</Button>
              </FormSubmit>
            </Flex>
          </Flex>
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default StakeDialog;