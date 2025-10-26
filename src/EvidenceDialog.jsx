import { Form, FormControl, FormField, FormLabel, FormSubmit } from "@radix-ui/react-form"
import { Button, Dialog, Flex, TextArea, TextField } from "@radix-ui/themes"
import React, { FormEvent } from "react";
import { useNetworkVariable } from "./networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";

export const EvidenceDialog = (props) => {
  const [open, setOpen] = React.useState(false);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const packageId = useNetworkVariable('package_id');
  const partyCap = props.partyCap;

  const publisherUrl = 'https://publisher.walrus-testnet.walrus.space';

  const submitForm = async (event) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.target));
    const tx = new Transaction();

    // Upload file to walrus publisher if it exists
    if (entries.file.size > 0) {
      const file_type = entries.file.type.split("/");

      await fetch(`${publisherUrl}/v1/blobs?epochs=${3}`, {
        method: 'PUT',
        body: entries.file,
      }).then((response) => {
        if (response.status === 200) {
          response.json().then((info) => {
            let type = file_type[0];
            let subtype = file_type[1];
            let blobId = info.newlyCreated.blobObject.blobId;

            console.log(partyCap.id.id);

            tx.moveCall({
              target: `${packageId}::dispute::add_evidence`,
              arguments: [
                tx.object(props.disputeID), // dispute
                tx.pure.string(entries.description), // desc
                tx.pure.option('string', blobId), // walrus blob id
                tx.pure.option('string', type), // file type
                tx.pure.option('string', subtype), // file subtype
                tx.object(partyCap.id.id), // party cap
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
          })
        }
      });
    } else {
      tx.moveCall({
        target: `${packageId}::dispute::add_evidence`,
        arguments: [
          tx.object(props.disputeID),
          tx.pure.string(entries.description),
          tx.pure.option('string', null),
          tx.pure.option('string', null),
          tx.pure.option('string', null),
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