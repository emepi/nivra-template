import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Flex, Heading } from "@radix-ui/themes";
import { useParams } from "react-router"
import { NivraCourt } from "./NivraCourt.jsx";

export const DisputeFullView = () => {
    const { dispute_id } = useParams();

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
          <NivraCourt dispute_id={dispute_id}/>
        </>
    )
}