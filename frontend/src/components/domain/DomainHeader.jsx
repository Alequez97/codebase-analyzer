import { Button, Heading, HStack, Text, VStack, Badge } from "@chakra-ui/react";
import { Eye, FileText, ArrowLeft } from "lucide-react";
import { useLogsStore } from "../../store/useLogsStore";

function getPriorityColor(priority) {
  if (priority === "P0") return "red";
  if (priority === "P1") return "orange";
  if (priority === "P2") return "yellow";
  return "gray";
}

export default function DomainHeader({ domain, domainId, analyzing, onBack }) {
  const { showDomainLogs, toggleDomainLogs } = useLogsStore();

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
