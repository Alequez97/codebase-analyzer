import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  VStack,
  Text,
  Badge,
  Flex,
  Skeleton,
  IconButton,
  Stack,
} from "@chakra-ui/react";
import {
  FileText,
  Sparkles,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Card } from "../ui/card";
import { EmptyState } from "../ui/empty-state";
import { toaster } from "../ui/toaster";
import LogsViewer from "./LogsViewer";
import { getDiagramFile, openDiagramInEditor } from "../../api/domain-diagrams";

const DIAGRAM_TYPE_LABELS = {
  architecture: "Architecture",
  sequence: "Sequence",
  "data-flow": "Data Flow",
  "entity-relationship": "Entity Relationship",
  "state-machine": "State Machine",
};

const DIAGRAM_TYPE_COLORS = {
  architecture: "blue",
  sequence: "green",
  "data-flow": "purple",
  "entity-relationship": "orange",
  "state-machine": "cyan",
};

export default function DomainDiagramsSection({
  diagrams,
  loading,
  progress,
  onAnalyze,
  domainId,
  showLogs = false,
  logs = "",
  logsLoading = false,
}) {
  const [selectedDiagramIndex, setSelectedDiagramIndex] = useState(0);
  const [viewerError, setViewerError] = useState(null);
  const [diagramXml, setDiagramXml] = useState(null);
  const [loadingDiagram, setLoadingDiagram] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef(null);
  const diagramXmlRef = useRef(null);

  const selectedDiagram = diagrams?.diagrams?.[selectedDiagramIndex];

  // Fetch diagram XML when selection changes
  useEffect(() => {
    if (!selectedDiagram || !domainId) {
      diagramXmlRef.current = null;
      setDiagramXml(null);
      return;
    }

    let cancelled = false;

    const fetchDiagram = async () => {
      setLoadingDiagram(true);
      setViewerError(null);

      try {
        const response = await getDiagramFile(
          domainId,
          selectedDiagram.fileName,
        );
        if (!cancelled) {
          diagramXmlRef.current = response.data;
          setDiagramXml(response.data);
        }
      } catch (error) {
        console.error("Failed to load diagram:", error);
        if (!cancelled) {
          setViewerError(true);
          toaster.create({
            title: "Failed to load diagram",
            description: "Could not fetch diagram file",
            type: "error",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingDiagram(false);
        }
      }
    };

    fetchDiagram();

    return () => {
      cancelled = true;
    };
  }, [selectedDiagram, domainId]);

  // Setup iframe message handler and send diagram data when ready
  useEffect(() => {
    if (
      !diagramXmlRef.current ||
      !iframeRef.current?.contentWindow ||
      !iframeReady
    ) {
      return;
    }

    let messageHandler = null;
    let sendAttempts = 0;
    const maxAttempts = 10;

    const attemptSendDiagram = () => {
      if (sendAttempts >= maxAttempts) {
        console.warn("Max attempts reached to send diagram data to iframe");
        setViewerError(true);
        return;
      }

      try {
        // Avoid sending while iframe is still about:blank (same-origin)
        if (iframeRef.current?.contentWindow?.location) {
          const href = iframeRef.current.contentWindow.location.href;
          if (
            !href ||
            href.startsWith("about:blank") ||
            href.startsWith(window.location.origin)
          ) {
            setTimeout(attemptSendDiagram, 200);
            return;
          }
        }
        // Send the diagram data using draw.io JSON protocol
        // Try multiple target origins to ensure message gets through
        iframeRef.current.contentWindow.postMessage(
          {
            action: "load",
            xml: diagramXmlRef.current,
          },
          "https://embed.diagrams.net",
        );
        sendAttempts++;

        // Retry if needed - sometimes the iframe isn't ready immediately
        setTimeout(attemptSendDiagram, 200);
      } catch (error) {
        // If cross-origin blocks access, assume iframe is ready and send
        try {
          iframeRef.current.contentWindow.postMessage(
            {
              action: "load",
              xml: diagramXmlRef.current,
            },
            "https://embed.diagrams.net",
          );
          sendAttempts++;
          setTimeout(attemptSendDiagram, 200);
        } catch (sendError) {
          console.error("Error sending diagram to iframe:", sendError);
        }
      }
    };

    messageHandler = (event) => {
      // Accept messages from embed.diagrams.net
      if (!event.origin.includes("diagrams.net")) {
        return;
      }

      // Draw.io sends various events - when we get any message, stop retrying
      if (event.data) {
        if (typeof event.data === "object" && event.data.event === "save") {
          // Don't stop on save events
          return;
        }
        // Message received - diagram is loaded, stop attempting
        sendAttempts = maxAttempts;
      }
    };

    // Start sending attempts immediately
    attemptSendDiagram();

    window.addEventListener("message", messageHandler);
    return () => {
      window.removeEventListener("message", messageHandler);
      sendAttempts = maxAttempts; // Stop retrying on cleanup
    };
  }, [diagramXml, iframeReady]);

  const handleAnalyze = () => {
    if (onAnalyze) {
      onAnalyze();
    }
  };

  const handleEditInVSCode = async () => {
    if (!selectedDiagram) return;

    try {
      await openDiagramInEditor(domainId, selectedDiagram.fileName);
      toaster.create({
        title: "Opening in VS Code",
        description: "Diagram file opening in VS Code editor",
        type: "success",
      });
    } catch (error) {
      console.error("Failed to open diagram in VS Code:", error);
      toaster.create({
        title: "Failed to open in VS Code",
        description:
          error.response?.data?.message ||
          "Make sure VS Code is installed and accessible",
        type: "error",
      });
    }
  };

  const handleDownload = async () => {
    if (!selectedDiagram) return;

    try {
      const response = await getDiagramFile(domainId, selectedDiagram.fileName);
      const content = response.data;

      const blob = new Blob([content], { type: "application/xml" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedDiagram.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toaster.create({
        title: "Download started",
        description: `Downloading ${selectedDiagram.fileName}`,
        type: "success",
      });
    } catch (error) {
      console.error("Failed to download diagram:", error);
      toaster.create({
        title: "Download failed",
        description: "Failed to download diagram file",
        type: "error",
      });
    }
  };

  const handlePrevDiagram = () => {
    setSelectedDiagramIndex((prev) => Math.max(0, prev - 1));
    setViewerError(null);
    setDiagramXml(null);
    setIframeReady(false);
  };

  const handleNextDiagram = () => {
    const maxIndex = (diagrams?.diagrams?.length || 1) - 1;
    setSelectedDiagramIndex((prev) => Math.min(maxIndex, prev + 1));
    setViewerError(null);
    setDiagramXml(null);
    setIframeReady(false);
  };

  // Loading state
  if (loading) {
    return (
      <Card.Root>
        <Card.Header>
          <Heading size="md">Diagrams</Heading>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={4}>
            <Skeleton height="40px" />
            <Skeleton height="400px" />
            {progress && (
              <Box p={4} bg="blue.50" borderRadius="md">
                <Text fontSize="sm" color="blue.800">
                  {progress.message || "Analyzing..."}
                </Text>
              </Box>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    );
  }

  // Empty state
  if (!diagrams?.diagrams || diagrams.diagrams.length === 0) {
    return (
      <Card.Root>
        <Card.Header>
          <Heading size="md">Diagrams</Heading>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={4}>
            <EmptyState
              icon={FileText}
              title="No diagrams generated yet"
              description="Analyze this domain to generate architecture and flow diagrams"
              variant="simple"
            />
            <Button
              onClick={handleAnalyze}
              colorScheme="blue"
              size="lg"
              alignSelf="center"
            >
              <Sparkles />
              Generate Diagrams
            </Button>
          </VStack>
          {showLogs && logs && (
            <Box mt={6}>
              <LogsViewer logs={logs} loading={logsLoading} />
            </Box>
          )}
        </Card.Body>
      </Card.Root>
    );
  }

  const diagramCount = diagrams.diagrams.length;

  return (
    <Card.Root>
      <Card.Header>
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <VStack align="start" gap={1}>
            <Heading size="md">Diagrams</Heading>
            <Text fontSize="sm" color="gray.600">
              {diagramCount} diagram{diagramCount !== 1 ? "s" : ""} available
            </Text>
          </VStack>
          <Button onClick={handleAnalyze} colorScheme="blue" size="sm">
            <Sparkles />
            Re-analyze
          </Button>
        </Flex>
      </Card.Header>

      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Diagram selector and actions */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <HStack>
              <IconButton
                aria-label="Previous diagram"
                onClick={handlePrevDiagram}
                disabled={selectedDiagramIndex === 0}
                size="sm"
                variant="outline"
              >
                <ChevronLeft />
              </IconButton>

              <VStack align="start" gap={1} minW="300px">
                <HStack>
                  <Heading size="sm">{selectedDiagram?.title}</Heading>
                  <Badge
                    colorScheme={
                      DIAGRAM_TYPE_COLORS[selectedDiagram?.type] || "gray"
                    }
                  >
                    {DIAGRAM_TYPE_LABELS[selectedDiagram?.type] ||
                      selectedDiagram?.type}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="gray.600">
                  {selectedDiagram?.description}
                </Text>
              </VStack>

              <IconButton
                aria-label="Next diagram"
                onClick={handleNextDiagram}
                disabled={selectedDiagramIndex >= diagramCount - 1}
                size="sm"
                variant="outline"
              >
                <ChevronRight />
              </IconButton>
            </HStack>

            <HStack>
              <Button
                onClick={handleEditInVSCode}
                size="sm"
                variant="outline"
                leftIcon={<ExternalLink size={16} />}
              >
                Edit in VS Code
              </Button>
              <Button
                onClick={handleDownload}
                size="sm"
                variant="outline"
                leftIcon={<Download size={16} />}
              >
                Download
              </Button>
            </HStack>
          </Flex>

          {/* Diagram viewer */}
          <Box
            borderWidth="1px"
            borderRadius="lg"
            overflow="hidden"
            bg="gray.50"
            position="relative"
            minH="600px"
          >
            {loadingDiagram ? (
              <VStack align="center" justify="center" minH="600px">
                <Skeleton height="400px" width="100%" />
                <Text fontSize="sm" color="gray.600">
                  Loading diagram...
                </Text>
              </VStack>
            ) : viewerError || !diagramXml ? (
              <VStack
                align="center"
                justify="center"
                minH="600px"
                gap={4}
                p={6}
              >
                <AlertCircle size={48} color="orange" />
                <VStack gap={2} align="center">
                  <Heading size="md">View Diagrams in VS Code</Heading>
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    Embedded diagram viewer requires a public URL. Use these
                    options instead:
                  </Text>
                </VStack>
                <Stack direction="row" gap={2}>
                  <Button
                    onClick={handleEditInVSCode}
                    size="sm"
                    colorScheme="blue"
                  >
                    <ExternalLink size={16} />
                    Open in VS Code
                  </Button>
                  <Button onClick={handleDownload} size="sm" variant="outline">
                    <Download size={16} />
                    Download File
                  </Button>
                </Stack>
              </VStack>
            ) : diagramXml ? (
              <iframe
                ref={iframeRef}
                src="https://embed.diagrams.net/?proto=json&spin=1"
                onLoad={() => setIframeReady(true)}
                style={{
                  width: "100%",
                  height: "600px",
                  border: "none",
                  borderRadius: "8px",
                }}
                title={selectedDiagram?.title || "Diagram"}
                sandbox="allow-same-origin allow-scripts allow-popups"
              />
            ) : null}
          </Box>

          {/* Diagram list */}
          {diagramCount > 1 && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                All Diagrams
              </Text>
              <Stack direction="row" gap={2} wrap="wrap">
                {diagrams.diagrams.map((diagram, index) => (
                  <Button
                    key={diagram.id}
                    size="sm"
                    variant={
                      index === selectedDiagramIndex ? "solid" : "outline"
                    }
                    colorScheme={
                      index === selectedDiagramIndex ? "blue" : "gray"
                    }
                    onClick={() => {
                      setSelectedDiagramIndex(index);
                      setViewerError(null);
                      setDiagramXml(null);
                      setIframeReady(false);
                    }}
                  >
                    <Badge
                      colorScheme={DIAGRAM_TYPE_COLORS[diagram.type] || "gray"}
                      mr={2}
                    >
                      {DIAGRAM_TYPE_LABELS[diagram.type] || diagram.type}
                    </Badge>
                    {diagram.title}
                  </Button>
                ))}
              </Stack>
            </Box>
          )}
        </VStack>

        {showLogs && logs && (
          <Box mt={6}>
            <LogsViewer logs={logs} loading={logsLoading} />
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  );
}
