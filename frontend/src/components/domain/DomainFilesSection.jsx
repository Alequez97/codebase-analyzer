import {
  Heading,
  Text,
  Textarea,
  HStack,
  VStack,
  IconButton,
  Button,
} from "@chakra-ui/react";
import { Save } from "lucide-react";
import { Card } from "../ui/card";

export default function DomainFilesSection({
  filesText,
  onFilesChange,
  onReset,
}) {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">Files</Heading>
      </Card.Header>
      <Card.Body>
        <Text mb={3} color="gray.600" fontSize="sm">
          These files define this domain. Edit to refine scope before running
          analysis.
        </Text>
        <HStack align="start" gap={2}>
          <Textarea
            minH="180px"
            flex="1"
            fontFamily="mono"
            fontSize="sm"
            value={filesText}
            onChange={(event) => onFilesChange(event.target.value)}
            placeholder="backend/services/domain/file.js&#10;frontend/src/pages/DomainPage.jsx"
          />
          <VStack gap={2}>
            <IconButton
              size="sm"
              colorPalette="green"
              title="Save files (updates domain scope)"
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
