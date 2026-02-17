import { Box, Heading, Text } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

/**
 * Reusable Markdown renderer with VS Code-style syntax highlighting
 * and consistent styling across the application.
 */
export default function MarkdownRenderer({ content, ...props }) {
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
    code: ({ inline, children, className }) => {
      if (inline) {
        return (
          <Box
            as="code"
            display="inline"
            bg="gray.100"
            px={1.5}
            py={0.5}
            borderRadius="sm"
            fontSize="sm"
            fontFamily="mono"
            whiteSpace="nowrap"
          >
            {children}
          </Box>
        );
      }
      // Block code with VS Code-style syntax highlighting
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "text";

      return (
        <Box mb={3} borderRadius="md" overflow="hidden">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: "6px",
              fontSize: "14px",
            }}
            showLineNumbers={true}
            lineNumberStyle={{
              minWidth: "3em",
              paddingRight: "1em",
              color: "#858585",
              textAlign: "right",
            }}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
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
    <ReactMarkdown components={markdownComponents} {...props}>
      {content}
    </ReactMarkdown>
  );
}
