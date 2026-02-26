import { Box } from "@chakra-ui/react";
import { ConfigurationDialog } from "../dashboard/ConfigurationDialog";
import { StatusBar } from "../dashboard/StatusBar";
import { useConfigStore } from "../../store/useConfigStore";
import { useSocketStore } from "../../store/useSocketStore";

export function Layout({ children }) {
  const { config, configLoading } = useConfigStore();
  const { socketConnected } = useSocketStore();

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      {/* Fixed Header */}
      <Box position="sticky" top={0} zIndex={1000} bg="white" boxShadow="sm">
        <StatusBar
          connected={!configLoading && !!config}
          statusLoading={configLoading}
          socketConnected={socketConnected}
          rightContent={<ConfigurationDialog />}
        />
      </Box>

      {/* Scrollable Content */}
      <Box flex={1} overflowY="auto">
        {children}
      </Box>
    </Box>
  );
}
