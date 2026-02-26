import { useEffect } from "react";
import { Button, Container, HStack, VStack } from "@chakra-ui/react";
import { CodebaseAnalysisLogs } from "../components/dashboard/CodebaseAnalysisLogs";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { ModulesSection } from "../components/dashboard/ModulesSection";
import { ErrorState, LoadingState } from "../components/dashboard/States";
import { useCodebaseStore } from "../store/useCodebaseStore";
import { useConfigStore } from "../store/useConfigStore";
import { useLogsStore } from "../store/useLogsStore";

export default function Dashboard() {
  // Config store (server configuration, agents, target project)
  const { config } = useConfigStore();

  // Codebase store (codebase analysis data)
  const { loading, error, analysis, analyzingCodebase } = useCodebaseStore();

  // Logs store (UI state for showing/hiding logs)
  const { showDashboardLogs, toggleDashboardLogs, fetchCodebaseAnalysisLogs } =
    useLogsStore();

  // Fetch logs when showDashboardLogs changes
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
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        <DashboardHeader />
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
  );
}
