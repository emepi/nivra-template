import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { Form, FormControl, FormField, FormLabel, FormSubmit } from "@radix-ui/react-form";
import { Dialog, Button, Flex } from "@radix-ui/themes";
import React from "react";
import { useNetworkVariable } from "../networkConfig";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";

const WithdrawDialog = (props) => {
  const [open, setOpen] = React.useState(false);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable('package_id');
  const courtId = props.courtId;
  const currentAccount = useCurrentAccount();

  const submitForm = (event) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.target));
    const amount = entries.stake_amount;
    const reward_amount = entries.reward_amount;
    
    const tx = new Transaction();

    let [nvr, sui] = tx.moveCall({
      target: `${packageId}::court::withdraw`,
      arguments: [
        tx.object(courtId),
        tx.pure.u64(amount),
        tx.pure.u64(reward_amount)
      ]
    });

    tx.transferObjects([nvr], tx.pure.address(currentAccount.address));
    tx.transferObjects([sui], tx.pure.address(currentAccount.address));

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
        <Button>Withdraw</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Withdraw stakes & rewards</Dialog.Title>
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
            <FormField name="reward_amount">
              <Flex direction="column" gapY="2">
                <FormLabel>Amount (SUI):  </FormLabel>
                <FormControl asChild>
                  <input type="number" name="reward_amount" min="0" required/>
                </FormControl>
              </Flex>
            </FormField>
            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">Cancel</Button>
              </Dialog.Close>
              <FormSubmit asChild>
                <Button>Withdraw</Button>
              </FormSubmit>
            </Flex>
          </Flex>
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  )
}

export default WithdrawDialog;