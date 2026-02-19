import { useEffect } from "react";
import { Box, Button, Container, HStack, VStack } from "@chakra-ui/react";
import { useCodebaseStore } from "../store/useCodebaseStore";
import { useConfigStore } from "../store/useConfigStore";
import { useLogsStore } from "../store/useLogsStore";
import { useSocketStore } from "../store/useSocketStore";
import { LoadingState, ErrorState } from "../components/dashboard/States";
import { StatusBar } from "../components/dashboard/StatusBar";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { ConfigurationPanel } from "../components/dashboard/ConfigurationPanel";
import { ModulesSection } from "../components/dashboard/ModulesSection";
import { CodebaseAnalysisLogs } from "../components/dashboard/CodebaseAnalysisLogs";

export default function Dashboard() {
  // Config store (server configuration, agents, target project)
  const { config, configLoading, fetchConfig } = useConfigStore();

  // Codebase store (codebase analysis data)
  const { loading, error, analysis, analyzingCodebase, fetchAnalysis } =
    useCodebaseStore();

  // Logs store (UI state for showing/hiding logs)
  const { showDashboardLogs, toggleDashboardLogs, fetchCodebaseAnalysisLogs } =
    useLogsStore();

  // Socket store
  const { socketConnected } = useSocketStore();

  // Fetch initial data on mount
  useEffect(() => {
    // Always fetch config (lightweight, not persisted)
    fetchConfig();

    // Only fetch analysis if not cached
    if (!analysis) {
      fetchAnalysis();
    }
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if (!showDashboardLogs) {
      return;
    }

    fetchCodebaseAnalysisLogs(analysis, false, analyzingCodebase);
  }, [showDashboardLogs, analysis?.taskId, analyzingCodebase]);

  const handleToggleDashboardLogs = () => {
    const shouldShowLogs = !showDashboardLogs;
    toggleDashboardLogs();

    if (shouldShowLogs) {
      fetchCodebaseAnalysisLogs(analysis, false, analyzingCodebase);
    }
  };

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
              onClick={handleToggleDashboardLogs}
              size="sm"
            >
              {showDashboardLogs ? "Show codebase analysis" : "Show Logs"}
            </Button>
          </HStack>
          {showDashboardLogs ? <CodebaseAnalysisLogs /> : <ModulesSection />}
        </VStack>
      </Container>
    </Box>
  );
}
