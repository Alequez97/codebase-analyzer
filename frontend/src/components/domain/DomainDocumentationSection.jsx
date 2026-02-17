import { useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Textarea,
  Text,
  Badge,
} from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import { Pencil, X, Save, FileText } from "lucide-react";
import { Card } from "../ui/card";

export default function DomainDocumentationSection({
  documentation,
  loading,
  progress,
  onAnalyze,
  editedDocumentation,
  onDocumentationChange,
  onSave,
  onReset,
}) {
  const [isEditMode, setIsEditMode] = useState(false);

  const handleEnterEditMode = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    onReset?.();
  };

  const handleSave = async () => {
    await onSave?.();
    setIsEditMode(false);
  };

  const displayContent =
    editedDocumentation !== undefined && editedDocumentation !== null
      ? editedDocumentation
      : documentation?.content || "";

  const statusText = documentation?.metadata?.status || null;
  const logFile = documentation?.metadata?.logFile || null;

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Heading size="md">Documentation</Heading>
            {!isEditMode && (
              <IconButton
                size="sm"
                variant="ghost"
                onClick={handleEnterEditMode}
                title="Edit documentation"
                disabled={!documentation}
              >
                <Pencil size={16} />
              </IconButton>
            )}
            {isEditMode && (
              <IconButton
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                title="Cancel editing"
              >
                <X size={16} />
              </IconButton>
            )}
            {statusText && (
              <Badge colorPalette="green" size="sm">
                {statusText}
              </Badge>
            )}
          </HStack>
          <HStack>
            {!isEditMode && (
              <Button
                size="sm"
                colorPalette="blue"
                variant="outline"
                onClick={onAnalyze}
                loading={loading}
                loadingText="Analyzing"
              >
                {documentation
                  ? "Re-analyze documentation"
                  : "Analyze documentation"}
              </Button>
            )}
            {isEditMode && (
              <Button
                size="sm"
                colorPalette="green"
                onClick={handleSave}
                leftIcon={<Save size={14} />}
              >
                Save
              </Button>
            )}
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body>
        {(loading || progress) && (
          <Box
            mb={4}
            p={3}
            bg="blue.50"
            borderRadius="md"
            borderLeft="4px solid"
            borderColor="blue.500"
          >
            <HStack gap={2}>
              <FileText size={16} />
              <Text fontSize="sm" fontWeight="medium" color="blue.800">
                {progress?.message ||
                  "AI is analyzing domain files and generating documentation..."}
              </Text>
            </HStack>
          </Box>
        )}
        {isEditMode ? (
          <Textarea
            value={displayContent}
            onChange={(e) => onDocumentationChange?.(e.target.value)}
            rows={20}
            fontFamily="mono"
            fontSize="sm"
            placeholder="Write documentation in Markdown format..."
          />
        ) : (
          <Box
            color="gray.800"
            fontSize="sm"
            lineHeight="1.8"
            sx={{
              "& h1": { fontSize: "xl", fontWeight: "bold", mt: 4, mb: 2 },
              "& h2": { fontSize: "lg", fontWeight: "bold", mt: 3, mb: 2 },
              "& h3": {
                fontSize: "md",
                fontWeight: "semibold",
                mt: 2,
                mb: 1,
              },
              "& p": { mb: 2 },
              "& ul": { pl: 4, mb: 2 },
              "& li": { mb: 1 },
              "& code": {
                bg: "gray.100",
                px: 1,
                py: 0.5,
                borderRadius: "sm",
                fontSize: "xs",
                fontFamily: "mono",
              },
              "& pre": {
                bg: "gray.50",
                p: 3,
                borderRadius: "md",
                overflowX: "auto",
                mb: 2,
              },
            }}
          >
            <ReactMarkdown>
              {displayContent ||
                "Click **Analyze documentation** to generate deep analysis. All files listed above will be analyzed to understand business purpose, responsibilities, and architecture."}
            </ReactMarkdown>
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  );
}
