import { useEffect } from "react";
import { defaultSystem } from "@chakra-ui/react";
import { useSocketStore } from "./store/useSocketStore";

function App() {
  // Initialize socket connection before any routing
  const { initSocket } = useSocketStore();

  useEffect(() => {
    initSocket();
  }, [initSocket]);

  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/domains/:domainId" element={<DomainDetailsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster />
    </ChakraProvider>
  );
}

export default App;
