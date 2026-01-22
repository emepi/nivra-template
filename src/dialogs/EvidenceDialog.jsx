import { Form, FormControl, FormField, FormLabel, FormSubmit } from "@radix-ui/react-form"
import { Button, Dialog, Flex, TextArea, TextField } from "@radix-ui/themes"
import React from "react";
import { useNetworkVariable } from "../networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { WALRUS_PUBLISHER_URL } from "../constants";

export const EvidenceDialog = (props) => {
  const [open, setOpen] = React.useState(false);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable('package_id');
  const partyCap = props.partyCap;

  const submitForm = async (event) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.target));
    const tx = new Transaction();

    let type = null;
    let subtype = null;
    let blobId = null;
    let file_name = null;

    if (entries.file.size > 0) {
      const file_type = entries.file.type.split("/");

      const res = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=${3}`, {
        method: 'PUT',
        body: entries.file,
      });

      if (res.status === 200) {
        const info = await res.json();

        type = file_type[0];
        subtype = file_type[1];
        blobId = info.newlyCreated.blobObject.blobId;
        file_name = entries.file.name;
      }
    } 

    tx.moveCall({
      target: `${packageId}::evidence::create_evidence`,
      arguments: [
        tx.object(props.disputeID),
        tx.pure.string(entries.description),
        tx.pure.option('string', blobId),
        tx.pure.option('string', file_name),
        tx.pure.option('string', type),
        tx.pure.option('string', subtype),
        tx.pure.bool(false),
        tx.object(partyCap.id.id),
        tx.object.clock(),
      ]
    });

    signAndExecute(
      {
        transaction: tx
      },
      {
        onSuccess: (_) => location.reload(),
      }
    );
  }
  
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button>Add Evidence</Button>
      </Dialog.Trigger>

      <Dialog.Content>
        <Dialog.Title>Add Evidence</Dialog.Title>

        <Form onSubmit={submitForm}>
          <Flex direction="column" gap="3">
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
            <FormField name="file">
              <FormControl asChild>
                <input type="file" name="file" />
              </FormControl>
            </FormField>
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