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
  Code,
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

  // Custom components for ReactMarkdown
  const markdownComponents = {
    h1: ({ children }) => (
      <Heading as="h1" size="xl" mt={6} mb={3}>
        {children}
      </Heading>
    ),
    h2: ({ children }) => (
      <Heading as="h2" size="lg" mt={5} mb={2}>
        {children}
      </Heading>
    ),
    h3: ({ children }) => (
      <Heading as="h3" size="md" mt={4} mb={2}>
        {children}
      </Heading>
    ),
    h4: ({ children }) => (
      <Heading as="h4" size="sm" mt={3} mb={1}>
        {children}
      </Heading>
    ),
    p: ({ children }) => (
      <Text mb={3} lineHeight="tall">
        {children}
      </Text>
    ),
    ul: ({ children }) => (
      <Box as="ul" pl={6} mb={3}>
        {children}
      </Box>
    ),
    ol: ({ children }) => (
      <Box as="ol" pl={6} mb={3}>
        {children}
      </Box>
    ),
    li: ({ children }) => (
      <Box as="li" mb={1}>
        {children}
      </Box>
    ),
    code: ({ inline, children }) => {
      if (inline) {
        return (
          <Code
            bg="gray.100"
            px={1.5}
            py={0.5}
            borderRadius="sm"
            fontSize="sm"
            colorPalette="gray"
          >
            {children}
          </Code>
        );
      }
      // Block code
      return (
        <Box
          as="pre"
          bg="gray.900"
          color="gray.100"
          p={4}
          borderRadius="md"
          overflowX="auto"
          mb={3}
          fontSize="sm"
          fontFamily="mono"
        >
          <Code
            as="code"
            bg="transparent"
            color="inherit"
            p={0}
            fontSize="inherit"
            fontFamily="inherit"
          >
            {children}
          </Code>
        </Box>
      );
    },
    pre: ({ children }) => <>{children}</>, // Pre is handled by code component
    strong: ({ children }) => (
      <Box as="strong" fontWeight="bold">
        {children}
      </Box>
    ),
    em: ({ children }) => (
      <Box as="em" fontStyle="italic">
        {children}
      </Box>
    ),
    blockquote: ({ children }) => (
      <Box
        as="blockquote"
        borderLeft="4px solid"
        borderColor="blue.500"
        pl={4}
        py={2}
        my={3}
        bg="blue.50"
        fontStyle="italic"
      >
        {children}
      </Box>
    ),
    hr: () => <Box as="hr" my={4} borderColor="gray.300" />,
  };

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
          <Box color="gray.800" fontSize="sm" lineHeight="1.8">
            <ReactMarkdown components={markdownComponents}>
              {displayContent ||
                "Click **Analyze documentation** to generate deep analysis. All files listed above will be analyzed to understand business purpose, responsibilities, and architecture."}
            </ReactMarkdown>
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  );
}
