import { Button, Heading, HStack, Text, VStack, Badge } from "@chakra-ui/react";

function getPriorityColor(priority) {
  if (priority === "P0") return "red";
  if (priority === "P1") return "orange";
  if (priority === "P2") return "yellow";
  return "gray";
}

export default function DomainHeader({ domain, domainId, analyzing, onBack }) {
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
      <Button variant="outline" onClick={onBack}>
        Back
      </Button>
    </HStack>
  );
}
