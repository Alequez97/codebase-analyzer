import { Box, Container, VStack } from '@chakra-ui/react';
import { useAppStore } from '../store/useAppStore';
import { useFetchStatus, useFetchModules } from '../hooks/useApi';
import { LoadingState, ErrorState } from '../components/dashboard/States';
import { StatusBar } from '../components/dashboard/StatusBar';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { CodebaseSelector } from '../components/dashboard/CodebaseSelector';
import { ConfigurationPanel } from '../components/dashboard/ConfigurationPanel';
import { ModulesSection } from '../components/dashboard/ModulesSection';

export default function Dashboard() {
  const { loading, error, status } = useAppStore();

  // Fetch initial data
  useFetchStatus();
  useFetchModules();

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} port={status?.config?.port} />;
  }

  return (
    <Box>
      <StatusBar connected={!error && !!status} />
      
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
