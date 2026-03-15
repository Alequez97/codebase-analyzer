import { useEffect } from "react";
import { Container, VStack } from "@chakra-ui/react";
import { AnalyzingState } from "../components/dashboard/AnalyzingState";
import { CodebaseAnalysisLogs } from "../components/dashboard/CodebaseAnalysisLogs";
import { EmptyProjectState } from "../components/dashboard/EmptyProjectState";
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
  const { showDashboardLogs, fetchCodebaseAnalysisLogs } = useLogsStore();

  // Fetch logs when showDashboardLogs changes
  useEffect(() => {
    if (!showDashboardLogs) {
      return;
    }

    fetchCodebaseAnalysisLogs(analysis, false, analyzingCodebase);
  }, [showDashboardLogs, analysis?.taskId, analyzingCodebase]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} port={config?.config?.port} />;
  }

  const domains = analysis?.domains || [];
  const isEmptyProject = config?.target?.isEmpty === true;
  const isHeroState = !analyzingCodebase && domains.length === 0;
  const isAnalyzingEmptyState = analyzingCodebase && domains.length === 0;
  const isFullScreenState =
    (isHeroState || isAnalyzingEmptyState) && !showDashboardLogs;

  // Empty project (no source files yet) — show the "start here" screen
  if (isEmptyProject && isHeroState && !showDashboardLogs) {
    return <EmptyProjectState />;
  }

  return (
    <>
      {isFullScreenState ? (
        isAnalyzingEmptyState ? (
          <AnalyzingState />
        ) : (
          <ModulesSection />
        )
      ) : (
        <Container maxW="container.xl" py={8}>
          <VStack gap={8} align="stretch">
            {showDashboardLogs ? <CodebaseAnalysisLogs /> : <ModulesSection />}
          </VStack>
        </Container>
      )}
    </>
  );
}
