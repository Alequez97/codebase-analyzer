import { Badge, Button, Heading, HStack, Skeleton, Text, VStack } from "@chakra-ui/react";
import { ArrowLeft, Eye, FileText } from "lucide-react";
import { useLogsStore } from "../../store/useLogsStore";

function getPriorityColor(priority) {
  if (priority === "P0") return "red";
  if (priority === "P1") return "orange";
  if (priority === "P2") return "yellow";
  return "gray";
}

export default function DomainHeader({ domain, domainId, onBack }) {
  const { showDomainLogs, toggleDomainLogs } = useLogsStore();

  if (!domain) {
    return (
      <HStack justify="space-between" align="start">
        <VStack align="start" gap={2}>
          <HStack gap={2}>
            <Skeleton height="32px" width="250px" />
            <Skeleton height="24px" width="40px" />
          </HStack>
          <Skeleton height="20px" width="500px" />
        </VStack>
        <HStack>
          <Skeleton height="40px" width="150px" />
          <Skeleton height="40px" width="100px" />
        </HStack>
      </HStack>
    );
  }

  return (
    <HStack justify="space-between" align="start">
      <VStack align="start" gap={1}>
        <HStack>
          <Heading size="lg">{domain?.name || domainId}</Heading>
          {domain?.priority && (
            <Badge colorPalette={getPriorityColor(domain.priority)}>
              {domain.priority}
            </Badge>
          )}
        </HStack>
        <Text color="gray.600">
          {domain?.businessPurpose || "No domain summary available."}
        </Text>
      </VStack>
      <HStack>
        <Button variant="outline" onClick={toggleDomainLogs}>
          {showDomainLogs ? (
            <>
              <Eye size={16} />
              Show Domain Analysis
            </>
          ) : (
            <>
              <FileText size={16} />
              Show Logs
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </Button>
      </HStack>
    </HStack>
  );
}
