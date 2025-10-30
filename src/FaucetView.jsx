import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Box, Flex, Heading, Container, Text, Button } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";
import { useEffect, useState } from "react";
import { Form, FormControl, FormField, FormLabel, FormSubmit } from "@radix-ui/react-form";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";

export const FaucetView = () => {
    const suiClient = useSuiClient();
    const faucetPackageId = useNetworkVariable("faucet_package_id");
    const faucetId = useNetworkVariable("faucet_id");
    const coinType = useNetworkVariable("nvr_coin_type");
    const [faucetData, setFaucetData] = useState(null);
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const currentAccount = useCurrentAccount();

    useEffect(() => {
        suiClient.getObject({
            id: faucetId,
            options: { showContent: true },
        }).then(res => setFaucetData(res));
    }, []);

    const submitForm = (event) => {
        event.preventDefault();
        const entries = Object.fromEntries(new FormData(event.target));

        const depositAmount = parseInt(entries.depositAmount);

        const tx = new Transaction();

        tx.moveCall({
            target: `${faucetPackageId}::faucet::load_balance`,
            arguments: [
                tx.object(faucetId),
                coinWithBalance({
                  balance: BigInt(depositAmount),
                  type: coinType,
                }),
            ]
        });

        signAndExecute({
            transaction: tx,
        }, {
            onSuccess: (_) => location.reload(),
        })
    }

    const claimDailyCoins = () => {
        const tx = new Transaction();

        const nvr_coins = tx.moveCall({
            target: `${faucetPackageId}::faucet::withdraw`,
            arguments: [
                tx.object(faucetId),
                tx.object.clock(),
            ]
        });

        tx.transferObjects([nvr_coins], tx.pure.address(currentAccount.address));

        signAndExecute({
            transaction: tx,
        });
    }

    return (
        <>
          <Flex position="sticky" p="4" justify="between" align="center" style={{borderBottom: "1px solid var(--gray-a2)",}}>
            <Box>
              <Heading>Nivra Template</Heading>
            </Box>
            <Box>
              <ConnectButton />
            </Box>
          </Flex>
          <Container p="4" mt="4">
            <Box style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)", }}>
              <Flex direction="column" align="center" gap="3">
                <Heading as="h1">Faucet</Heading>
              </Flex>
              <Flex direction="column" p="4">
                <Text>Available balance: {faucetData && parseInt(faucetData.data.content.fields.balance) / 1_000_000}</Text>
                <Text>Daily limit: 1000 NVR</Text>
              </Flex>
              <Flex p="4" align="end" gap="4">
                <Form onSubmit={submitForm}>
                    <Flex gap="4" align="end">
                    <FormField name="depositAmount">
                        <Flex direction="column" gapY="2">
                            <FormLabel>Deposit (NVR):</FormLabel>
                            <FormControl asChild>
                                <input type="number" name="depositAmount" min="0" required/>
                            </FormControl>
                        </Flex>
                    </FormField>
                    <FormSubmit asChild>
                        <Button>Deposit</Button>
                    </FormSubmit>
                    </Flex>
                </Form>
                <Button onClick={claimDailyCoins}>Claim Daily Coins</Button>
              </Flex>
            </Box>
          </Container>
        </>
    )
}