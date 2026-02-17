import { useEffect } from "react";
import { Box, Button, Container, HStack, VStack } from "@chakra-ui/react";
import { useAnalysisStore } from "../store/useAnalysisStore";
import { useConfigStore } from "../store/useConfigStore";
import { useLogsStore } from "../store/useLogsStore";
import { useSocketStore } from "../store/useSocketStore";
import { LoadingState, ErrorState } from "../components/dashboard/States";
import { StatusBar } from "../components/dashboard/StatusBar";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { ConfigurationPanel } from "../components/dashboard/ConfigurationPanel";
import { ModulesSection } from "../components/dashboard/ModulesSection";
import { TaskLogs } from "../components/dashboard/TaskLogs";

export default function Dashboard() {
  // Config store (server configuration, agents, target project)
  const { config, configLoading, fetchConfig } = useConfigStore();

  // Analysis store (codebase analysis data)
  const { loading, error, analysis, fetchAnalysis } = useAnalysisStore();

  // Logs store (UI state for showing/hiding logs)
  const { showDashboardLogs, toggleDashboardLogs } = useLogsStore();

  // Socket store
  const { socketConnected, initSocket } = useSocketStore();

  // Initialize socket connection
  useEffect(() => {
    initSocket();
  }, [initSocket]);

  // Fetch initial data on mount
  useEffect(() => {
    // Always fetch config (lightweight, not persisted)
    fetchConfig();

    // Only fetch analysis if not cached
    if (!analysis) {
      fetchAnalysis();
    }
  }, []); // Empty dependency array - only run once on mount

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} port={config?.config?.port} />;
  }

  return (
    <Box>
      <StatusBar
        connected={!error && !!config}
        statusLoading={configLoading}
        socketConnected={socketConnected}
      />

      <Container maxW="container.xl" py={8}>
        <VStack gap={8} align="stretch">
          <DashboardHeader />
          <ConfigurationPanel />
          <HStack justify="flex-end">
            <Button
              variant="outline"
              colorPalette="gray"
              onClick={toggleDashboardLogs}
              size="sm"
            >
              {showDashboardLogs ? "Show codebase anaysis" : "Show Logs"}
            </Button>
          </HStack>
          {showDashboardLogs ? <TaskLogs /> : <ModulesSection />}
        </VStack>
      </Container>
    </Box>
  );
}
