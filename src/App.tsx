import { Box, Container, Flex, Heading } from "@radix-ui/themes";
import CourtSelector from "./components/CourtSelector.jsx";

function App() {

  return (
    <>
      <Container>
        <Flex p="4">
          { CourtSelector() }
        </Flex>
      </Container>
    </>
  );
}

export default App;
