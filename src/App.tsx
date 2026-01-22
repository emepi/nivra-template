import { Flex } from "@radix-ui/themes";
import CourtSelector from "./components/CourtSelector.jsx";

function App() {

  return (
    <>
      <Flex p="4">
        { CourtSelector() }
      </Flex>
    </>
  );
}

export default App;
