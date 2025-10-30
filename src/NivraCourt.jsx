import { Box, Button, Card, Container, DataList, Flex, Heading, Text } from "@radix-ui/themes";
import { useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage, useSuiClient } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { useNetworkVariable } from "./networkConfig";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import { EvidenceDialog } from "./EvidenceDialog";
import { SealClient, SessionKey } from "@mysten/seal";
import { fromHex } from "@mysten/sui/utils";
import { SEAL_KEY_SERVERS, WALRUS_AGGREGATOR_URL } from "./constants";

export const NivraCourt = (props) => {
    const [dispute, setDispute] = useState(null);
    const [data, setData] = useState([]);
    const [decryptionKey, setDecryptionKey] = useState(new Uint8Array([]));
    const suiClient = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const packageId = useNetworkVariable("package_id");
    const registryId = useNetworkVariable("registry_id");
    const currentAccount = useCurrentAccount();
    const { mutate: signPersonalMessage } = useSignPersonalMessage();

    const sealClient = new SealClient({
        suiClient,
        serverConfigs: SEAL_KEY_SERVERS.map((id) => ({
            objectId: id,
            weight: 1,
        })),
        verifyKeyServers: false,
    })

    // required to exceed the pagination limit of 50 objects
    async function getAllOwnedObjects() {
        const allObjects = [];
        let cursor = null;
        let hasNextPage = false;

        do {
            const response = await suiClient.getOwnedObjects({
                owner: currentAccount.address,
                cursor,
                limit: 50,
                options: {
                    showType: true,
                    showContent: true,
                },
            });

            allObjects.push(...response.data);
            cursor = response.nextCursor;
            hasNextPage = response.hasNextPage;
        } while (cursor && hasNextPage);

        setData(allObjects)
    }

    const isPartyMember = () => data
        .filter(obj => obj.data.type === `${packageId}::dispute::PartyCap`)
        .map(partyCap => partyCap.data.content.fields)
        .filter(fields => dispute.parties.includes(fields.party) && fields.dispute_id == dispute.id.id)
        .length >= 1

    const partyCap = () => data
        .filter(obj => obj.data.type === `${packageId}::dispute::PartyCap`)
        .map(partyCap => partyCap.data.content.fields)
        .filter(fields => dispute.parties.includes(fields.party) && fields.dispute_id == dispute.id.id)[0];
    
    const voterCap = () => data
        .filter(obj => obj.data.type === `${packageId}::dispute::VoterCap`)
        .map(partyCap => partyCap.data.content.fields)
        .filter(fields => dispute.id.id === fields.dispute_id)[0];

    
    const fetch_dispute_data = async () => {
        if (props.dispute_id) {
            const dispute = await suiClient.getObject({
                id: props.dispute_id,
                options: { showContent: true },
            });

            if (dispute) {
                const data = dispute.data?.content.fields;
                setDispute(data);
            }
        }
    }
    
    useEffect(() => {
        fetch_dispute_data();
        if (currentAccount?.address) {
            getAllOwnedObjects();
        }
    }, [currentAccount?.address])

    const status = (i) => {
        switch(i) {
            case "1":
                return "active";
            case "2":
                return "tie";
            case "3":
                return "tallied";
            case "4":
                return "completed";
            case "5":
                return "canceled";
        }
    }

    const period = () => {
        if (dispute) {
            let timestamp = Date.now();
            let init = parseInt(dispute.timetable.fields.round_init_ms);
            let evidence_period_end = init + parseInt(dispute.timetable.fields.evidence_period_ms);
            let voting_period_end = evidence_period_end + parseInt(dispute.timetable.fields.voting_period_ms);
            let appeal_period_end = voting_period_end + parseInt(dispute.timetable.fields.appeal_period_ms);

            if (timestamp < evidence_period_end) return "evidence";
            else if (timestamp < voting_period_end) return "voting";
            else if (timestamp < appeal_period_end) return "appeal";
            else return "reward";
        }
    }

    const cancellable = () => period() === "reward" && (dispute.status === "1" || dispute.status === "2");

    const cancel_dispute = () => {
        if (dispute) {
            const tx = new Transaction();

            const contract_id = tx.moveCall({
                target: `${packageId}::court::cancel_dispute`,
                arguments: [
                    tx.object(dispute.court),
                    tx.object(dispute.id.id),
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
        }
    }

    const show_verdict = () => {
        const winner_option = dispute?.options[dispute?.winner_option]
        
        return winner_option ? winner_option : "Not decided yet";
    }

    const EvidenceItem = (props) => {
        const [evData, setEvData] = useState(null);

        useEffect(() => {
            suiClient.getObject({
                id: props.id,
                options: { showContent: true },
            }).then(res => setEvData(res));
        }, [])

        return (
            evData &&
            <Box p="4" style={{border: "1px solid gray", borderRadius: "5px"}}>
            <DataList.Root size="1">
                <DataList.Item>
                    <DataList.Label minWidth="88px">No:</DataList.Label>
			        <DataList.Value>{props.i + 1}</DataList.Value>
                </DataList.Item>
                <DataList.Item>
                    <DataList.Label minWidth="88px">Description:</DataList.Label>
			        <DataList.Value>{evData.data.content.fields.description}</DataList.Value>
                </DataList.Item>
                {evData.data.content.fields.blob_id && 
                <DataList.Item>
                    <DataList.Label minWidth="88px">File:</DataList.Label>
			        <DataList.Value><a href={`${WALRUS_AGGREGATOR_URL}/v1/blobs/${evData.data.content.fields.blob_id}`}>Link</a></DataList.Value>
                </DataList.Item>
                }
            </DataList.Root>
            </Box>
        );
    }

    const evidenceItems = (ev) => ev.fields.value.map((ev, i) => 
        <EvidenceItem id={ev} i={i} key={i}/>
    );

    const evidence = () => dispute?.evidence.fields.contents.map((ev) =>
        <Card key={ev.fields.key}>
            <Text size="1">Evidence by: <a href={"https://suiscan.xyz/testnet/account/" + ev.fields.key}>{ev.fields.key}</a></Text>
            <Flex gap="4" pt="4">
                {evidenceItems(ev)}
            </Flex>
        </Card>
    );

    const vote_option = async (opt) => {
        const cap = voterCap();
        const tx = new Transaction();
        
        // encrypt the vote on client side
        const { encryptedObject, key } = await sealClient.encrypt({
          threshold: 1,
          packageId: packageId,
          id: dispute.id.id,
          data: new Uint8Array([opt]), // vote has to fit in 1 byte
          aad: fromHex(currentAccount.address),
          demType: 1, // Hmac256Ctr
        });

        // could be used to decrypt the users vote for display
        setDecryptionKey(key);

        tx.moveCall({
          target: `${packageId}::dispute::cast_vote`,
          arguments: [
            tx.object(dispute.id.id),
            tx.pure.vector('u8', encryptedObject),
            tx.object(cap.id.id),
            tx.object.clock(),
          ]
        });

        signAndExecute({transaction: tx});
    }

    const grayed_voting_options = () => dispute?.options.map((option, i) =>
        <Button key={"option-g-" + i} style={{backgroundColor: "gray"}}>
            {option}
        </Button>
    );

    const voting_options = () => dispute?.options.map((option, i) =>
        <Button key={"option-" + i} onClick={() => vote_option(i)}>
            {option}
        </Button>
    );

    const tally_votes = async () => {
        // Step 1: Create a temporary session key for this account
        // - Session keys are short-lived signing keys that can be used
        //   to authorize certain operations without using the main wallet signature every time.
        const sessionKey = await SessionKey.create({
            address: currentAccount.address,
            packageId: packageId,
            ttlMin: 10,
            suiClient,
        });

        // Step 2: Get the message that must be signed by the wallet to authorize the session key
        const message = sessionKey.getPersonalMessage();

        // Step 3: Ask the wallet to sign the session key message
        // - This ensures the user approves this temporary authorization.
        // - The signed message links the session key to their real wallet.
        const signed = await new Promise((resolve, reject) => {
            signPersonalMessage(
                {
                    message,
                },
                {
                    onSuccess: (result) => {
                        // Save the wallet signature inside the session key instance
                        sessionKey.setPersonalMessageSignature(result.signature);
                        resolve();
                    },
                    onError: (err) => reject(),
                }
            );
        });

        // Step 4: Create a new transaction to seal or "approve" the dispute results
        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::dispute::seal_approve`, 
            arguments: [
                tx.pure.vector("u8", fromHex(dispute.id.id)),
                tx.object(dispute.id.id),
                tx.object.clock(),
            ]
        });

        // Step 5: Build transaction bytes without signing yet
        // - We build only the transaction kind (the core data)
        //   because this will be used for threshold key derivation.
        const txBytes = await tx.build( { client: suiClient, onlyTransactionKind: true });

        // Step 6: Request derived encryption keys from the seal service
        // - This uses a Key Encapsulation Mechanism (KEM) to fetch encrypted keys
        //   from key servers, ensuring distributed cryptographic security.
        const derivedKeys = await sealClient.getDerivedKeys({
            kemType: 0,
            id: dispute.id.id,
            txBytes,
            sessionKey,
            threshold: 1,
        });

        // Step 7: Extract which key servers were used and their corresponding derived keys
        const keyServersUsed = Array.from(derivedKeys.keys());
        const derivedKeysUsed = Array.from(derivedKeys.values()).map((dk) =>
            fromHex(dk.representation)
        );

        // Step 8: Create another transaction to finalize the vote
        const tx2 = new Transaction();
        
        tx2.moveCall({
            target: `${packageId}::dispute::finalize_vote`,
            arguments: [
                tx2.object(dispute.id.id),
                tx2.pure.address(packageId),
                tx2.pure.vector('vector<u8>', derivedKeysUsed),
                tx2.pure.vector('address', keyServersUsed),
                tx2.object.clock(),
            ]
        });

        signAndExecute(
            {
                transaction: tx2,
            },
            {
                onSuccess: (tx) => {
                    console.log(tx);
                },
                onError: (err) => {
                    console.log(err);
                }
            }
        );
    }

    const votes = () => dispute?.result.reduce((partialSum, a) => partialSum + parseInt(a), 0);

    const appeal = async () => {
        const tx = new Transaction();

        // get fee rate from the court
        let court = await suiClient.getObject({
            id: dispute.court,
            options: { showContent: true},
        });

        let innerCourtDynamicFieldId = court.data.content.fields.inner.fields.id.id;

        const innerCourtDynamicField = await suiClient.getDynamicFields({
            parentId: innerCourtDynamicFieldId,
        });

        let innerCourtId = innerCourtDynamicField.data[0].objectId;

        let innerCourt = await suiClient.getObject({
            id: innerCourtId,
            options: { showContent: true},
        });

        const fee_rate = innerCourt.data.content.fields.value.fields.fee_rate;

        tx.moveCall({
            target: `${packageId}::court::open_appeal`,
            arguments: [
                tx.object(dispute.court),
                tx.object(dispute.id.id),
                coinWithBalance({ // appeal fee = fee rate * current nivster count
                    balance: BigInt(fee_rate * parseInt(dispute.voters.fields.size)),
                }),
                tx.object(partyCap().id.id),
                tx.object.clock(),
                tx.object.random(),
            ]
        });

        signAndExecute({transaction: tx});
    }

    const claimRewards = () => {
        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::court::distribute_rewards`,
            arguments: [
                tx.object(dispute.court),
                tx.object(dispute.id.id),
                tx.object(registryId),
                tx.object.clock(),
            ]
        });

        signAndExecute({transaction: tx});
    }

    const handleDisputeTie = () => {
        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::court::handle_dispute_tie`,
            arguments: [
                tx.object(dispute.court),
                tx.object(dispute.id.id),
                tx.object.clock(),
                tx.object.random(),
            ]
        });

        signAndExecute({transaction: tx});
    }

    return (
        <Container p="4" pt="0" mt="4">
            <Box style={{ backgroundColor: "var(--gray-a2)", borderRadius: "var(--radius-3)", }}>
                <Flex direction="column" align="center">
                    <Heading as="h1">Court View (Testnet)</Heading>
                    <Flex direction="column" p="4" style={{width: "100%",}}>
                        <Card style={{width: "100%",}} >
                            <Flex gap="4" justify="between">
                              <Flex direction="column" gap="6">
                                <DataList.Root size="1">
                                    <DataList.Item>
                                        <DataList.Label minWidth="88px">Status:</DataList.Label>
			                            <DataList.Value>{dispute && status(dispute.status)}</DataList.Value>
                                    </DataList.Item>
                                    <DataList.Item>
                                        <DataList.Label minWidth="88px">Period:</DataList.Label>
			                            <DataList.Value>{dispute && period()}</DataList.Value>
                                    </DataList.Item>
                                    <DataList.Item>
                                        <DataList.Label minWidth="88px">Round:</DataList.Label>
			                            <DataList.Value>{dispute && dispute.round}</DataList.Value>
                                    </DataList.Item>
                                </DataList.Root>
                              </Flex>

                              <Flex direction="column" gap="6">
                                <DataList.Root size="1">
                                    <DataList.Item>
                                        <DataList.Label minWidth="88px">Dispute ID:</DataList.Label>
			                            <DataList.Value>{dispute && <a href={"https://suiscan.xyz/testnet/object/" + dispute.id.id}>{dispute.id.id}</a>}</DataList.Value>
                                    </DataList.Item>
                                    <DataList.Item>
                                        <DataList.Label minWidth="88px">Contract ID:</DataList.Label>
			                            <DataList.Value>{dispute && <a href={"https://suiscan.xyz/testnet/object/" + dispute.contract}>{dispute.contract}</a>}</DataList.Value>
                                    </DataList.Item>
                                    <DataList.Item>
                                        <DataList.Label minWidth="88px">Initiator:</DataList.Label>
			                            <DataList.Value>{dispute && <a href={"https://suiscan.xyz/testnet/account/" + dispute.initiator}>{dispute.initiator}</a>}</DataList.Value>
                                    </DataList.Item>
                                </DataList.Root>
                              </Flex>
                            </Flex>
                            <Flex direction="column" pt="4" gap="4">
                                <div style={{width: "100%", border: "1px solid gray"}}></div>
                                <Flex justify="center">
                                    <Heading>About</Heading>
                                </Flex>
                                <Flex gap="4" justify="between">
                                <DataList.Root size="1">
                                    <DataList.Item>
                                        <DataList.Label minWidth="88px">Description:</DataList.Label>
			                            <DataList.Value>{dispute && dispute.description}</DataList.Value>
                                    </DataList.Item>
                                    <DataList.Item>
                                        <DataList.Label minWidth="88px">Date:</DataList.Label>
			                            <DataList.Value>{dispute && (new Date(parseInt(dispute.timetable.fields.round_init_ms))).toLocaleString()}</DataList.Value>
                                    </DataList.Item>
                                </DataList.Root>
                                <DataList.Root size="1">
                                    <DataList.Item>
                                        <DataList.Label minWidth="88px">Verdict:</DataList.Label>
			                            <DataList.Value>{dispute && show_verdict()}</DataList.Value>
                                    </DataList.Item>
                                    <DataList.Item>
                                        <DataList.Label minWidth="88px">Votes:</DataList.Label>
			                            <DataList.Value>{votes()}</DataList.Value>
                                    </DataList.Item>
                                </DataList.Root>
                                </Flex>
                                <div style={{width: "100%", border: "1px solid gray"}}></div>
                                <Flex justify="center">
                                    <Heading>Evidence</Heading>
                                </Flex>
                                {evidence()}
                                {period() === "evidence" && isPartyMember && <EvidenceDialog disputeID={dispute.id.id} partyCap={partyCap()}/>}
                                <div style={{width: "100%", border: "1px solid gray"}}></div>
                                <Flex justify="center">
                                    <Heading>Vote</Heading>
                                </Flex>
                                <Flex gap="4" justify="center">
                                    {period() === "voting" && voting_options()}
                                    {period() !== "voting" && grayed_voting_options()}
                                </Flex>
                                {period() == "appeal" && status(dispute.status) == "active" && <Button onClick={tally_votes}>Tally Votes</Button>}
                                {period() == "appeal" && status(dispute.status) == "tallied" && <Button onClick={appeal}>Appeal</Button>}
                                {period() == "appeal" && status(dispute.status) == "tie" && <Button onClick={handleDisputeTie}>Draw 1 More Nivster</Button>}
                                {period() == "reward" && status(dispute.status) == "tallied" && <Button onClick={claimRewards}>Claim Rewards</Button>}
                                {isPartyMember && cancellable() && <Button onClick={cancel_dispute}>Cancel Dispute</Button>}
                            </Flex>
                        </Card>
                    </Flex>
                </Flex>
            </Box>
        </Container>
    );
}