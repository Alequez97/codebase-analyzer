import { useEffect } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Toaster } from "./components/ui/toaster";
import { FloatingAgentChat } from "./components/FloatingChat";
import Dashboard from "./pages/Dashboard";
import DomainDetailsPage from "./pages/DomainDetailsPage";
import DesignPage from "./pages/DesignPage";
import { useSocketStore } from "./store/useSocketStore";

function App() {
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
            <Route path="/design" element={<DesignPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        <FloatingAgentChat />
      </BrowserRouter>
      <Toaster />
    </ChakraProvider>
  );
}

export default App;
