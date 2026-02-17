import {
  Button,
  Heading,
  HStack,
  Text,
  Textarea,
  VStack,
  IconButton,
} from "@chakra-ui/react";
import { Save } from "lucide-react";
import { Card } from "../ui/card";

export default function DomainRequirementsSection({
  requirementsText,
  loading,
  onRequirementsChange,
  onAnalyze,
  onSave,
  onReset,
}) {
  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Requirements</Heading>
          <HStack>
            <Button
              size="sm"
              colorPalette="blue"
              variant="outline"
              onClick={onAnalyze}
              loading={loading}
              loadingText="Analyzing"
            >
              {requirementsText
                ? "Re-analyze requirements"
                : "Analyze requirements"}
            </Button>
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Text mb={3} color="gray.600" fontSize="sm">
          Edit business rules here. Click save icon to persist changes.
        </Text>
        <HStack align="start" gap={2}>
          <Textarea
            minH="220px"
            flex="1"
            value={requirementsText}
            onChange={(event) => onRequirementsChange(event.target.value)}
            placeholder="1. [P0] Describe domain requirement"
          />
          <VStack gap={2}>
            <IconButton
              size="sm"
              colorPalette="green"
              onClick={onSave}
              title="Save requirements"
            >
              <Save size={16} />
            </IconButton>
            <Button size="sm" variant="outline" onClick={onReset}>
              Reset
            </Button>
          </VStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
