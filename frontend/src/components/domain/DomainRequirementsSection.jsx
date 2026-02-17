import { useState } from "react";
import {
  Button,
  Heading,
  HStack,
  Text,
  Textarea,
  Box,
  IconButton,
} from "@chakra-ui/react";
import { Pencil, X, Save, FileText } from "lucide-react";
import { Card } from "../ui/card";

export default function DomainRequirementsSection({
  requirementsText,
  loading,
  progress,
  onRequirementsChange,
  onAnalyze,
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

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Heading size="md">Requirements</Heading>
            {!isEditMode && (
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
                  "AI is analyzing domain files and extracting requirements..."}
              </Text>
            </HStack>
          </Box>
        )}
        {isEditMode ? (
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
  );
}
