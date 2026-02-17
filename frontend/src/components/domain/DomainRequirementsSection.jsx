import { useState } from "react";
import {
  Button,
  Heading,
  HStack,
  Text,
  Textarea,
  Box,
  IconButton,
  Badge,
  Code,
  VStack,
  Input,
} from "@chakra-ui/react";
import { Pencil, X, Save, FileText, Sparkles } from "lucide-react";
import { Card } from "../ui/card";
import { formatIsoUtcTimestampsInText } from "../../utils/date-time";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
} from "../ui/dialog";

export default function DomainRequirementsSection({
  requirementsText,
  loading,
  progress,
  onRequirementsChange,
  onAnalyze,
  onSave,
  onReset,
  showLogs = false,
  logs = "",
  logsLoading = false,
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [userContext, setUserContext] = useState("");

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

  const handleAnalyzeClick = () => {
    // Show context dialog before analyzing
    setShowContextDialog(true);
  };

  const handleStartAnalysis = () => {
    setShowContextDialog(false);
    onAnalyze?.(userContext);
    setUserContext(""); // Reset for next time
  };

  const handleCancelContext = () => {
    setShowContextDialog(false);
    setUserContext("");
  };

  return (
    <>
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <HStack gap={2}>
              <Heading size="md">Requirements</Heading>
              {!isEditMode && !showLogs && (
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={handleEnterEditMode}
                  title="Edit requirements"
                  disabled={!requirementsText}
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
                  onClick={handleAnalyzeClick}
                  loading={loading}
                  loadingText="Analyzing"
                >
                  <Sparkles size={14} />
                  {requirementsText
                    ? "Re-analyze requirements"
                    : "Analyze requirements"}
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
                    "AI is analyzing domain files and extracting requirements..."}
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
                <Code.Root variant="plain" colorPalette="green" size="xs">
                  <Code.Content>
                    {formatIsoUtcTimestampsInText(logs)}
                  </Code.Content>
                </Code.Root>
              ) : (
                <Text color="gray.500">
                  No logs available. Run analysis to see logs.
                </Text>
              )}
            </Box>
          ) : isEditMode ? (
            <>
              <Text mb={3} color="gray.600" fontSize="sm">
                Edit business rules here. Use format: [Priority] Description
              </Text>
              <Textarea
                minH="220px"
                value={requirementsText}
                onChange={(event) => onRequirementsChange(event.target.value)}
                placeholder="1. [P0] Describe domain requirement"
                fontFamily="mono"
                fontSize="sm"
              />
            </>
          ) : (
            <Box
              color="gray.800"
              fontSize="sm"
              lineHeight="1.8"
              whiteSpace="pre-wrap"
              fontFamily="mono"
            >
              {requirementsText ||
                "Click **Analyze requirements** to extract business rules from code. All files listed above will be analyzed."}
            </Box>
          )}
        </Card.Body>
      </Card.Root>

      {/* Context Input Dialog */}
      <DialogRoot
        open={showContextDialog}
        onOpenChange={(e) => setShowContextDialog(e.open)}
        size="lg"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <HStack gap={2}>
                <Sparkles size={20} />
                <Text>Provide Additional Context (Optional)</Text>
              </HStack>
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack align="stretch" gap={4}>
              <Text fontSize="sm" color="gray.600">
                Help the AI generate better requirements by providing additional
                context about what you're looking for:
              </Text>
              <VStack align="stretch" gap={2}>
                <Text fontSize="sm" fontWeight="medium">
                  Examples of helpful context:
                </Text>
                <Box
                  fontSize="xs"
                  color="gray.600"
                  pl={4}
                  borderLeft="2px solid"
                  borderColor="blue.200"
                >
                  <Text>
                    • Focus on security and authentication requirements
                  </Text>
                  <Text>• Include validation rules for user inputs</Text>
                  <Text>• Identify integration points with payment APIs</Text>
                  <Text>• Extract error handling requirements</Text>
                </Box>
              </VStack>
              <Textarea
                placeholder="Enter additional context here (optional)..."
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                minHeight="150px"
                fontSize="sm"
              />
              <Text fontSize="xs" color="gray.500">
                Leave empty to generate requirements without additional
                guidance.
              </Text>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline" onClick={handleCancelContext}>
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button colorPalette="blue" onClick={handleStartAnalysis}>
              <Sparkles size={14} />
              Start Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
