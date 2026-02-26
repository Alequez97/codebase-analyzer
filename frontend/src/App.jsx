import { useEffect } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { useSocketStore } from "./store/useSocketStore";
import { Layout } from "./components/layout";
import Dashboard from "./pages/Dashboard";
import DomainDetailsPage from "./pages/DomainDetailsPage";

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
