import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Form, FormControl, FormField, FormLabel, FormSubmit } from "@radix-ui/react-form";
import { Button, Dialog, Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import React from "react";
import { useNetworkVariable } from "./networkConfig";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import { SEAL_KEY_SERVERS, SEAL_PUBLIC_KEYS } from "./constants";

export const DisputeDialog = (props) => {
  const [open, setOpen] = React.useState(false);
  const [nivsters, setNivsters] = React.useState(0);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const currentAccount = useCurrentAccount();
  const packageId = useNetworkVariable("package_id");
  const ckPackageId = useNetworkVariable("ck_package_id");
  const courtId = props.court_id;

  const submitForm = (event) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.target));

    const description = entries.description;
    const options = [entries.option1, entries.option2];
    const nivsters = Number(entries.nivsters);

    const tx = new Transaction();

    // random test contract for the dispute
    const contract_id = tx.moveCall({
      target: `${ckPackageId}::test_contract::create_test_contract`,
      arguments: [
        tx.pure.string(description),
        tx.pure.vector('string', options),
      ]
    });

    tx.moveCall({
      target: `${packageId}::court::open_dispute`,
      arguments: [
        tx.object(courtId), // court
        coinWithBalance({ // fee in SUI coin, amount = court fee rate * nivsters count
          balance: BigInt(props.feeRate * nivsters),
        }),
        contract_id, // parent contract ID (created above)
        tx.pure.string(description), //desc
        tx.pure('vector<address>', [currentAccount.address]), // dispute parties
        tx.pure('vector<string>', options), // voting options
        tx.pure.u8(nivsters), // nivster count (in the first round)
        tx.pure.u8(1), // max appeals
        tx.pure.option('u64', 180000), // evidence period in ms
        tx.pure.option('u64', 180000), // voting period in ms
        tx.pure.option('u64', 180000), // appeal period in ms
        tx.pure('vector<address>', SEAL_KEY_SERVERS), // seal key servers used
        tx.pure('vector<vector<u8>>', SEAL_PUBLIC_KEYS), // matching public keys
        tx.pure.u8(1), // keyserver threshold for decrypting votes
        tx.object.random(), // random sys. object
        tx.object.clock(), // clock sys. object
      ]
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: (tx) => location.reload(),
        onError: (err) => console.log(err),
      }
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button>Open Dispute</Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Open a Test Dispute</Dialog.Title>
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
            <Flex gapX="4" justify="between">
            <FormField name="option1">
              <FormLabel>Option #1</FormLabel>
                <FormControl asChild>
                  <TextField.Root
                    placeholder=""
                    name="option1"
                    required
                  />
                </FormControl>
            </FormField>
            <FormField name="option2">
              <FormLabel>Option #2</FormLabel>
                <FormControl asChild>
                  <TextField.Root
                    placeholder=""
                    name="option2"
                    required
                  />
                </FormControl>
            </FormField>
            <FormField name="nivsters">
              <FormLabel>Nivsters</FormLabel>
                <FormControl asChild>
                  <input 
                    type="number" 
                    name="nivsters" 
                    min="0"
                    onChange={(event) => setNivsters(event.target.value)}
                    required
                />
                </FormControl>
            </FormField>
            </Flex>
            Fee: {props.feeRate * nivsters / 1_000_000_000} SUI
          </Flex>
          <Text size="1">Opening a dispute fails if there's not enough nivsters staking.</Text>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <FormSubmit asChild>
              <Button>Open Dispute</Button>
            </FormSubmit>
          </Flex>
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}