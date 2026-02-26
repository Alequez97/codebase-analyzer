import { useEffect, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Separator,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { ListChecks } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import {
  DialogActionTrigger,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../ui/dialog";

export default function AnalyzeWithContextDialog({
  open,
  onClose,
  onStart,
  title,
  description,
  examples,
  hasRequirements,
  includeRequirementsLabel,
  includeRequirementsHelpEnabled,
  includeRequirementsHelpDisabled,
}) {
  const [analysisDescription, setAnalysisDescription] = useState("");
  const [includeRequirements, setIncludeRequirements] = useState(false);

  useEffect(() => {
    if (open) {
      return;
    }
    setAnalysisDescription("");
    setIncludeRequirements(false);
  }, [open]);

  const handleCancel = () => {
    setAnalysisDescription("");
    setIncludeRequirements(false);
    onClose?.();
  };

  const handleStart = () => {
    onStart?.(includeRequirements, analysisDescription);
    setAnalysisDescription("");
    setIncludeRequirements(false);
  };

  const normalizedExamples = Array.isArray(examples) ? examples : [];

  return (
    <DialogRoot open={open} onOpenChange={(e) => !e.open && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <VStack align="stretch" gap={4}>
            <Text fontSize="sm" color="gray.600">
              {description}
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
                borderColor="purple.200"
              >
                {normalizedExamples.map((example) => (
                  <Text key={example}>• {example}</Text>
                ))}
              </Box>
            </VStack>

            <Textarea
              value={analysisDescription}
              onChange={(e) => setAnalysisDescription(e.target.value)}
              placeholder="Enter additional context here (optional)..."
              minHeight="150px"
              fontSize="sm"
            />

            <Text fontSize="xs" color="gray.500">
              Leave empty to analyze without additional guidance.
            </Text>

            <Separator />

            <Checkbox
              checked={includeRequirements}
              onCheckedChange={(e) => setIncludeRequirements(!!e.checked)}
              disabled={!hasRequirements}
            >
              <HStack gap={2}>
                <ListChecks size={16} />
                <Text fontSize="sm" fontWeight="medium">
                  {includeRequirementsLabel}
                </Text>
              </HStack>
            </Checkbox>

            <Text fontSize="xs" color="gray.500" pl={6}>
              {hasRequirements
                ? includeRequirementsHelpEnabled
                : includeRequirementsHelpDisabled}
            </Text>
          </VStack>
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </DialogActionTrigger>
          <Button colorPalette="purple" size="sm" onClick={handleStart}>
            Start Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
