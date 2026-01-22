import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Form, FormControl, FormField, FormLabel, FormSubmit } from "@radix-ui/react-form";
import { Button, Dialog, Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import React from "react";
import { useNetworkVariable } from "../networkConfig";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";

const DisputeDialog = (props) => {
  const [open, setOpen] = React.useState(false);
  const [nivsters, setNivsters] = React.useState(0);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const currentAccount = useCurrentAccount();
  const packageId = useNetworkVariable("package_id");
  const ckPackageId = useNetworkVariable("ck_package_id");
  const courtId = props.courtId;

  const submitForm = (event) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.target));

    const description = entries.description;
    const options = [entries.option1, entries.option2];

    const tx = new Transaction();

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
        tx.object(courtId),
        coinWithBalance({
          balance: BigInt(parseInt(props.disputeFee)),
        }),
        contract_id,
        tx.pure.string(description),
        tx.pure('vector<address>', [currentAccount.address, entries.opponent]),
        tx.pure('vector<string>', options),
        tx.pure.u8(1),
        tx.object.clock(),
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
            <FormField name="opponent">
              <FormLabel>Opponent's address:</FormLabel>
                <FormControl asChild>
                  <TextField.Root
                    placeholder=""
                    name="opponent"
                    required
                  />
                </FormControl>
            </FormField>

            </Flex>
            Fee: {parseInt(props.disputeFee) / 1_000_000_000} SUI
          </Flex>
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

export default DisputeDialog;