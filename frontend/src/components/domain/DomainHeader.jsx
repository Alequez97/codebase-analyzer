import {
  Badge,
  Heading,
  HStack,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";

function getPriorityColor(priority) {
  if (priority === "P0") return "red";
  if (priority === "P1") return "orange";
  if (priority === "P2") return "yellow";
  return "gray";
}

export default function DomainHeader({ domain, domainId }) {
  if (!domain) {
    return (
      <HStack justify="flex-start" align="start">
        <VStack align="start" gap={2}>
          <HStack gap={2}>
            <Skeleton height="32px" width="250px" />
            <Skeleton height="24px" width="40px" />
          </HStack>
          <Skeleton height="20px" width="500px" />
        </VStack>
      </HStack>
    );
  }

  return (
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
  );
}
