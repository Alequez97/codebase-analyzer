import { useEffect } from "react";
import { Box, Button, Container, HStack, VStack } from "@chakra-ui/react";
import { useAnalysisStore } from "../store/useAnalysisStore";
import { useConfigStore } from "../store/useConfigStore";
import { useSocketStore } from "../store/useSocketStore";
import { LoadingState, ErrorState } from "../components/dashboard/States";
import { StatusBar } from "../components/dashboard/StatusBar";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { ConfigurationPanel } from "../components/dashboard/ConfigurationPanel";
import { ModulesSection } from "../components/dashboard/ModulesSection";
import { TaskLogs } from "../components/dashboard/TaskLogs";

export default function Dashboard() {
  // Analysis store
  const { loading, error, status, analysis, fetchAnalysis } = useAnalysisStore();

  // Config store
  const { showLogs, toggleLogs } = useConfigStore();

  // Socket store
  const { socketConnected, initSocket } = useSocketStore();

  // Initialize socket connection
  useEffect(() => {
    initSocket();
  }, [initSocket]);

  // Fetch initial data only if not already loaded (which also checks for pending tasks)
  useEffect(() => {
    // Only fetch if we don't have analysis data yet
    // fetchAnalysis handles its own loading states and caching internally
    if (!analysis) {
      fetchAnalysis();
    }
  }, []); // Empty dependency array - only run once on mount

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
          <HStack justify="flex-end">
            <Button
              variant="outline"
              colorPalette="gray"
              onClick={toggleLogs}
              size="sm"
            >
              {showLogs ? "Show codebase anaysis" : "Show Logs"}
            </Button>
          </HStack>
          {showLogs ? <TaskLogs /> : <ModulesSection />}
        </VStack>
      </Container>
    </Box>
  );
}
