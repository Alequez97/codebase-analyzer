import { useState, useEffect } from "react";
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
import { Pencil, X, Save, FileText, Sparkles } from "lucide-react";
import { Card } from "../ui/card";
import MarkdownRenderer from "../MarkdownRenderer";
import { formatIsoUtcTimestampsInText } from "../../utils/date-time";

export default function DomainDocumentationSection({
  documentation,
  loading,
  progress,
  onAnalyze,
  editedDocumentation,
  onDocumentationChange,
  onSave,
  onReset,
  showLogs = false,
  logs = "",
  logsLoading = false,
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

  // ESC key to exit edit mode
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode]);

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
            {!isEditMode && !showLogs && (
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
            {showLogs && (
              <Badge colorPalette="purple" size="sm">
                Logs View
              </Badge>
            )}
          </HStack>
          <HStack>
            {!isEditMode && !showLogs && (
              <Button
                size="sm"
                colorPalette="blue"
                variant="outline"
                onClick={onAnalyze}
                loading={loading}
                loadingText="Analyzing"
              >
                <Sparkles size={14} />
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
        {(loading || progress) && !showLogs && (
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
        {showLogs ? (
          <Box
            bg="gray.900"
            color="green.300"
            p={4}
            borderRadius="md"
            fontFamily="mono"
            fontSize="xs"
            maxH="500px"
            overflowY="auto"
            whiteSpace="pre-wrap"
            wordBreak="break-word"
          >
            {logsLoading ? (
              <Text color="gray.500">Loading logs...</Text>
            ) : logs ? (
              <Text as="pre" color="green.300" fontFamily="mono" fontSize="xs">
                {formatIsoUtcTimestampsInText(logs)}
              </Text>
            ) : (
              <Text color="gray.500">
                No logs available. Run analysis to see logs.
              </Text>
            )}
          </Box>
        ) : isEditMode ? (
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
            onDoubleClick={handleEnterEditMode}
            cursor={documentation ? "text" : "default"}
            title={documentation ? "Double-click to edit" : ""}
          >
            <MarkdownRenderer
              content={
                displayContent ||
                "Click **Analyze documentation** to generate deep analysis. All files listed above will be analyzed to understand business purpose, responsibilities, and architecture."
              }
            />
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  );
}
