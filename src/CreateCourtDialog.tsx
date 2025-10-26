import { Form, FormControl, FormField, FormLabel, FormSubmit } from "@radix-ui/react-form"
import { Button, Dialog, Flex, TextArea, TextField } from "@radix-ui/themes"
import React, { FormEvent } from "react";
import { useNetworkVariable } from "./networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";

export const CreateCourtDialog = (props: { adminCapId: string; }) => {
  const [open, setOpen] = React.useState(false);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable('package_id');
  const courtRegistryId = useNetworkVariable("registry_id");
  const nivraAdminCapId = props.adminCapId;

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.target as HTMLFormElement));
    const tx = new Transaction();

    // Build a Move call transaction to invoke the `create_court` function
    // from the `court` module in your on-chain package.
    tx.moveCall({
      target: `${packageId}::court::create_court`,
      arguments: [
        tx.pure.string(entries.category as string), // Court category (e.g., "Civil", "Criminal")
        tx.pure.string(entries.name as string), // Court name 
        tx.pure.option('string', null), // Optional court icon (currently none/null)
        tx.pure.string(entries.description as string), // Text description of the court
        tx.pure.vector('string', []), // List of required skills or tags (empty for now)
        tx.pure.u64(entries.min_stake as string), // Minimum stake required to participate
        tx.pure.u64(entries.fee_rate as string), // Fee rate applied within the court
        tx.pure.u64(900000), // Default evidence submission period (in milliseconds)
        tx.pure.u64(900000), // Default voting period (in milliseconds)
        tx.pure.u64(900000), // Default appeal period (in milliseconds)
        tx.object(courtRegistryId), // Mutable reference to the main Court Registry object
        tx.object(nivraAdminCapId), // Admin capability object, proving caller has permission
        // ctx: &mut TxContext
        // (This argument is automatically added by the Sui runtime; not provided manually)
      ]
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: (tx) => {
          suiClient.waitForTransaction({ digest: tx.digest }).then(async (res) => {
            console.log(res);
            location.reload();
          })
        },
        onError: (err) => {
          console.log(err);
        }
      }
    );

    setOpen(false);
  }
  
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button>Add Court</Button>
      </Dialog.Trigger>

      <Dialog.Content>
        <Dialog.Title>Create a court</Dialog.Title>

        <Form onSubmit={submitForm}>
          <Flex direction="column" gap="3">
            <FormField name="category">
              <FormLabel>Category</FormLabel>
              <FormControl asChild>
                <TextField.Root
                  placeholder="Enter a category"
                  name="category"
                  required
                />
              </FormControl>
            </FormField>
            <FormField name="name">
              <FormLabel>Name</FormLabel>
              <FormControl asChild>
                <TextField.Root
                  placeholder="Enter a name"
                  name="name"
                  required
                />
              </FormControl>
            </FormField>
            <FormField name="description">
              <FormLabel>Description</FormLabel>
              <FormControl asChild>
                <TextArea 
                  placeholder="Enter a description…" 
                  name="description"
                  required
                />
              </FormControl>
            </FormField>
            <Flex gap={"3"}>
              <FormField name="min_stake">
                <Flex direction="column" gap="3">
                  <FormLabel>Minimum stake</FormLabel>
                  <FormControl asChild>
                    <input type="number" name="min_stake" min="0" required/>
                  </FormControl>
                </Flex>
              </FormField>
              <FormField name="fee_rate">
                <Flex direction="column" gap="3">
                  <FormLabel>Fee rate</FormLabel>
                  <FormControl asChild>
                    <input type="number" name="fee_rate" min="0" required/>
                  </FormControl>
                </Flex>
              </FormField>
            </Flex>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <FormSubmit asChild>
              <Button>Save</Button>
            </FormSubmit>
          </Flex>
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  )
}