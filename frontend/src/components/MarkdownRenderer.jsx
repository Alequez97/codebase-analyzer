import { useEffect, useRef, useState } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import mermaid from "mermaid";

// Initialize Mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "inherit",
});

// Counter for unique IDs
let diagramCounter = 0;

/**
 * Mermaid diagram component that renders diagrams from code blocks
 */
function MermaidDiagram({ chart }) {
  const containerRef = useRef(null);
  const [svg, setSvg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chart) return;

    const renderDiagram = async () => {
      try {
        // Generate unique ID for each diagram instance
        const id = `mermaid-diagram-${++diagramCounter}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err.message);
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return (
      <Box
        mb={4}
        p={4}
        bg="red.50"
        borderRadius="md"
        borderWidth="1px"
        borderColor="red.200"
      >
        <Text color="red.700" fontSize="sm">
          Failed to render diagram: {error}
        </Text>
        <Box as="pre" mt={2} fontSize="xs" color="red.600">
          {chart}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      mb={4}
      p={4}
      bg="white"
      borderRadius="md"
      borderWidth="1px"
      borderColor="gray.200"
      overflow="auto"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}

/**
 * Reusable Markdown renderer with VS Code-style syntax highlighting,
 * Mermaid diagram support, and consistent styling across the application.
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
      <Box as="ul" pl={6} mb={3} listStyleType="disc" listStylePos="outside">
        {children}
      </Box>
    ),
    ol: ({ children }) => (
      <Box as="ol" pl={6} mb={3} listStyleType="decimal" listStylePos="outside">
        {children}
      </Box>
    ),
    li: ({ children }) => (
      <Box as="li" mb={1} display="list-item">
        {children}
      </Box>
    ),
    code: ({ inline, children, className }) => {
      const codeValue = String(children || "");
      const isInlineCode =
        inline === true || (!className && !codeValue.includes("\n"));

      if (isInlineCode) {
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
            {codeValue}
          </Box>
        );
      }

      // Check if it's a Mermaid diagram
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "text";

      if (language === "mermaid") {
        return <MermaidDiagram chart={String(children).trim()} />;
      }

      // Block code with VS Code-style syntax highlighting
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
            {codeValue.replace(/\n$/, "")}
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
