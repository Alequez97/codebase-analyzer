import { Box, Button, Heading, HStack } from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import { Card } from "../ui/card";

export default function DomainDocumentationSection({
  documentation,
  loading,
  onAnalyze,
}) {
  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Documentation</Heading>
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
        </HStack>
      </Card.Header>
      <Card.Body>
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
            {documentation?.businessPurpose ||
              "Click **Analyze documentation** to generate deep analysis. All files listed above will be analyzed to understand business purpose, responsibilities, and architecture."}
          </ReactMarkdown>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
