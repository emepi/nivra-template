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

    tx.moveCall({
      target: `${packageId}::court::create_court`,
      arguments: [
        tx.pure.string(entries.category as string),
        tx.pure.string(entries.name as string),
        tx.pure.option('string', null),
        tx.pure.string(entries.description as string),
        tx.pure.vector('string', []),
        tx.pure.u64(entries.min_stake as string),
        tx.pure.u64(entries.fee_rate as string),
        tx.object(courtRegistryId),
        tx.object(nivraAdminCapId),
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