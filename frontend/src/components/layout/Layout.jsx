import {
  Box,
  Button,
  HStack,
  Separator,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { FileText, Palette } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ConfigurationDialog } from "../dashboard/ConfigurationDialog";
import { StatusBar } from "../dashboard/StatusBar";
import { TasksStatusPill } from "./TasksStatusPill";
import { useConfigStore } from "../../store/useConfigStore";
import { useLogsStore } from "../../store/useLogsStore";
import { useSocketStore } from "../../store/useSocketStore";

export function Layout({ children }) {
  const { config, configLoading } = useConfigStore();
  const { socketConnected } = useSocketStore();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    showDashboardLogs,
    toggleDashboardLogs,
    showDomainLogs,
    toggleDomainLogs,
  } = useLogsStore();

  const isDomainPage = location.pathname.startsWith("/domains/");
  const isDesignPage = location.pathname === "/design";
  const isEmptyProject = config?.target?.isEmpty === true;
  const showLogs = isDomainPage ? showDomainLogs : showDashboardLogs;

  const handleLogsToggle = () => {
    if (isDomainPage) {
      toggleDomainLogs();
    } else {
      toggleDashboardLogs();
    }
  };

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      {/* Fixed Header */}
      <Box position="sticky" top={0} zIndex={1000} bg="white" boxShadow="sm">
        <StatusBar
          connected={!configLoading && !!config}
          statusLoading={configLoading}
          socketConnected={socketConnected}
          leftContent={
            <HStack gap={1}>
              <Button
                variant="ghost"
                size="sm"
                px={1}
                onClick={() => navigate("/")}
                fontWeight="semibold"
                color="gray.700"
                _hover={{ color: "blue.600" }}
              >
                {configLoading ? (
                  <HStack gap={2}>
                    <Spinner size="xs" color="blue.500" />
                    <Text fontSize="sm">Loading...</Text>
                  </HStack>
                ) : config?.target ? (
                  <Text fontSize="sm">📁 {config.target.name}</Text>
                ) : (
                  <Text fontSize="sm">Codebase Analyzer</Text>
                )}
              </Button>
              {!isEmptyProject && (
                <Button
                  size="sm"
                  variant={isDesignPage ? "solid" : "ghost"}
                  colorPalette={isDesignPage ? "purple" : "gray"}
                  onClick={() => navigate(isDesignPage ? "/" : "/design")}
                >
                  <Palette size={13} />
                  {isDesignPage ? "Project" : "Design"}
                </Button>
              )}
            </HStack>
          }
          rightContent={
            <HStack gap={2}>
              <TasksStatusPill />
              <Separator orientation="vertical" height="4" />
              {!isDesignPage && (
                <Button
                  size="sm"
                  variant={showLogs ? "solid" : "ghost"}
                  colorPalette={showLogs ? "blue" : "gray"}
                  onClick={handleLogsToggle}
                >
                  <FileText size={14} />
                  Logs
                </Button>
              )}
              <ConfigurationDialog />
            </HStack>
          }
        />
      </Box>

      {/* Scrollable Content */}
      <Box flex={1} overflowY="auto">
        {children}
      </Box>
    </Box>
  );
}
