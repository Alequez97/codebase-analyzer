import { useEffect } from "react";
import { Box, Container, VStack } from "@chakra-ui/react";
import { useAppStore } from "../store/useAppStore";
import { LoadingState, ErrorState } from "../components/dashboard/States";
import { StatusBar } from "../components/dashboard/StatusBar";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { ConfigurationPanel } from "../components/dashboard/ConfigurationPanel";
import { ModulesSection } from "../components/dashboard/ModulesSection";
import { TaskLogs } from "../components/dashboard/TaskLogs";

export default function Dashboard() {
  const {
    loading,
    error,
    status,
    fetchStatus,
    fetchModules,
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
    fetchModules();
  }, [fetchStatus, fetchModules]);

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
          <ConfigurationPanel />
          <ModulesSection />
          <TaskLogs />
        </VStack>
      </Container>
    </Box>
  );
}
