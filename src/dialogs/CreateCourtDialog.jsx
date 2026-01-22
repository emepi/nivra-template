import { Form, FormControl, FormField, FormLabel, FormSubmit } from "@radix-ui/react-form"
import { Button, Dialog, Flex, TextArea, TextField } from "@radix-ui/themes"
import React from "react";
import { useNetworkVariable } from "../networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { SEAL_KEY_SERVERS, SEAL_PUBLIC_KEYS } from "../constants";

// TODO: Add inputs for the remaining options
export const CreateCourtDialog = (props) => {
  const [open, setOpen] = React.useState(false);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable('package_id');
  const courtRegistryId = useNetworkVariable("registry_id");
  const nivraAdminCapId = props.adminCapId;

  const submitForm = (event) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.target));
    const tx = new Transaction();

    tx.moveCall({
      target: `${packageId}::court::create_court`,
      arguments: [
        tx.object(courtRegistryId),
        tx.object(nivraAdminCapId),
        tx.pure.bool(false),
        tx.pure.string(entries.category),
        tx.pure.string(entries.name),
        tx.pure.string(entries.description),
        tx.pure.string(entries.skills),
        tx.pure.u64(0),
        tx.pure.u64(15),
        tx.pure.u64(15),
        tx.pure.u64(15),
        tx.pure.u64(5),
        tx.pure.u64(entries.dispute_fee),
        tx.pure.u64(entries.min_stake),
        tx.pure.u64(900000),
        tx.pure.u64(900000),
        tx.pure.u64(900000),
        tx.pure.u64(900000),
        tx.pure.u64(900000),
        tx.pure('vector<address>', SEAL_KEY_SERVERS),
        tx.pure('vector<vector<u8>>', SEAL_PUBLIC_KEYS),
        tx.pure.u8(1),
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
            <FormField name="skills">
              <FormLabel>Skills</FormLabel>
              <FormControl asChild>
                <TextArea 
                  placeholder="Enter skill requirements…" 
                  name="skills"
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
              <FormField name="dispute_fee">
                <Flex direction="column" gap="3">
                  <FormLabel>Dispute fee</FormLabel>
                  <FormControl asChild>
                    <input type="number" name="dispute_fee" min="0" required/>
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
};