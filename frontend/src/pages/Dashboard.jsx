import { useEffect } from "react";
import { Box, Container, VStack } from "@chakra-ui/react";
import { useAppStore } from "../store/useAppStore";
import { LoadingState, ErrorState } from "../components/dashboard/States";
import { StatusBar } from "../components/dashboard/StatusBar";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { CodebaseSelector } from "../components/dashboard/CodebaseSelector";
import { ConfigurationPanel } from "../components/dashboard/ConfigurationPanel";
import { ModulesSection } from "../components/dashboard/ModulesSection";

export default function Dashboard() {
  const {
    loading,
    error,
    status,
    fetchStatus,
    fetchModules,
    selectedCodebase,
    initSocket,
    socketConnected,
  } = useAppStore();

  // Initialize socket connection
  useEffect(() => {
    initSocket();
  }, [initSocket]);

  // Fetch initial data
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (selectedCodebase) {
      fetchModules();
    }
  }, [selectedCodebase, fetchModules]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} port={status?.config?.port} />;
  }

  return (
    <Box>
      <StatusBar
        connected={!error && !!status}
        socketConnected={socketConnected}
      />

      <Container maxW="container.xl" py={8}>
        <VStack gap={8} align="stretch">
          <DashboardHeader />
          <CodebaseSelector />
          <ConfigurationPanel />
          <ModulesSection />
        </VStack>
      </Container>
    </Box>
  );
}
