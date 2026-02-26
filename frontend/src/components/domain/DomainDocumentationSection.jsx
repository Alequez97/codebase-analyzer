import { useState, useEffect } from "react";
import {
  Badge,
  Box,
  Button,
  Collapsible,
  Heading,
  HStack,
  IconButton,
  Skeleton,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  MessageSquare,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import ReactDiffViewer from "react-diff-viewer-continued";
import MarkdownRenderer from "../MarkdownRenderer";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
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
  onOpenChat,
  isChatOpen = false,
  pendingSuggestion,
  onApplyChanges,
  onDismissChanges,
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
              <>
                {/* Show "Edit with AI" if content exists, otherwise "Analyze" */}
                {documentation ? (
                  <Button
                    size="sm"
                    colorPalette="purple"
                    variant={isChatOpen ? "solid" : "outline"}
                    onClick={onOpenChat}
                  >
                    <MessageSquare size={14} />
                    Edit with AI
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    colorPalette="blue"
                    variant="outline"
                    onClick={onAnalyze}
                    loading={loading}
                    loadingText="Analyzing"
                  >
                    <Sparkles size={14} />
                    Analyze documentation
                  </Button>
                )}
              </>
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
            ) : pendingSuggestion ? (
              // Show diff view when AI has generated a suggestion
              <VStack align="stretch" gap={4}>
                <Box
                  p={3}
                  bg="purple.50"
                  borderRadius="md"
                  borderLeft="4px solid"
                  borderColor="purple.500"
                >
                  <HStack justify="space-between" alignItems="center">
                    <Text fontSize="sm" fontWeight="medium" color="purple.800">
                      AI has suggested changes to your documentation
                    </Text>
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        colorPalette="green"
                        onClick={() =>
                          onApplyChanges?.(pendingSuggestion.newContent)
                        }
                      >
                        <Check size={14} />
                        Apply Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="gray"
                        onClick={onDismissChanges}
                      >
                        <X size={14} />
                        Dismiss
                      </Button>
                    </HStack>
                  </HStack>
                </Box>
                <Box
                  borderRadius="md"
                  overflow="hidden"
                  border="1px solid"
                  borderColor="gray.200"
                >
                  <ReactDiffViewer
                    oldValue={pendingSuggestion.oldContent || ""}
                    newValue={pendingSuggestion.newContent || ""}
                    splitView={false}
                    showDiffOnly={false}
                    useDarkTheme={false}
                    styles={{
                      variables: {
                        light: {
                          diffViewerBackground: "#ffffff",
                          addedBackground: "#e6ffed",
                          addedColor: "#24292e",
                          removedBackground: "#ffeef0",
                          removedColor: "#24292e",
                          wordAddedBackground: "#acf2bd",
                          wordRemovedBackground: "#fdb8c0",
                          addedGutterBackground: "#cdffd8",
                          removedGutterBackground: "#ffdce0",
                          gutterBackground: "#f6f8fa",
                          gutterBackgroundDark: "#f0f0f0",
                          highlightBackground: "#fffbdd",
                          highlightGutterBackground: "#fff5b1",
                        },
                      },
                    }}
                  />
                </Box>
              </VStack>
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
