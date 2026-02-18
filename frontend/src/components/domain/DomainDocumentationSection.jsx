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
  Collapsible,
  Skeleton,
  VStack,
} from "@chakra-ui/react";
import {
  Pencil,
  X,
  Save,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import MarkdownRenderer from "../MarkdownRenderer";
import LogsViewer from "./LogsViewer";

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
  const [isExpanded, setIsExpanded] = useState(false);

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
      <Card.Header py="4">
        <HStack justify="space-between" alignItems="center">
          <HStack
            gap={2}
            flex={1}
            cursor="pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            alignItems="center"
          >
            <IconButton
              size="xs"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </IconButton>
            <Heading size="md">Documentation</Heading>
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
          <HStack onClick={(e) => e.stopPropagation()} alignItems="center">
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
      <Collapsible.Root open={isExpanded}>
        <Collapsible.Content>
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
              <LogsViewer logs={logs} loading={logsLoading} />
            ) : isEditMode ? (
              <Textarea
                value={displayContent}
                onChange={(e) => onDocumentationChange?.(e.target.value)}
                rows={20}
                fontFamily="mono"
                fontSize="sm"
                placeholder="Write documentation in Markdown format..."
              />
            ) : loading && !documentation ? (
              <VStack align="stretch" gap={3}>
                <Skeleton height="20px" width="60%" />
                <Skeleton height="16px" width="90%" />
                <Skeleton height="16px" width="85%" />
                <Skeleton height="16px" width="95%" />
                <Skeleton height="20px" width="40%" mt={4} />
                <Skeleton height="16px" width="88%" />
                <Skeleton height="16px" width="92%" />
                <Skeleton height="16px" width="80%" />
              </VStack>
            ) : documentation ? (
              <Box
                color="gray.800"
                fontSize="sm"
                lineHeight="1.8"
                onDoubleClick={handleEnterEditMode}
                cursor="text"
                title="Double-click to edit"
              >
                <MarkdownRenderer content={displayContent} />
              </Box>
            ) : (
              <EmptyState
                icon={FileText}
                title="No documentation analyzed yet"
                description="Click 'Analyze documentation' to generate deep analysis of this domain's business purpose, responsibilities, and architecture."
                variant="simple"
              />
            )}
          </Card.Body>
        </Collapsible.Content>
      </Collapsible.Root>
    </Card.Root>
  );
}
