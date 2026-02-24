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
  Collapsible,
} from "@chakra-ui/react";
import {
  FileText,
  Sparkles,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ChevronDown,
  MessageSquare,
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
  onOpenChat,
  isChatOpen = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDiagramIndex, setSelectedDiagramIndex] = useState(0);
  const [viewerError, setViewerError] = useState(null);
  const [diagramXml, setDiagramXml] = useState(null);
  const [loadingDiagram, setLoadingDiagram] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [iframeInit, setIframeInit] = useState(false);
  const iframeRef = useRef(null);
  const diagramXmlRef = useRef(null);
  const hasLoggedIframeMessageRef = useRef(false);

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
    const maxAttempts = 25;

    const sendDiagram = () => {
      if (!iframeRef.current?.contentWindow) {
        return;
      }
      iframeRef.current.contentWindow.postMessage(
        {
          action: "load",
          xml: diagramXmlRef.current,
        },
        "https://embed.diagrams.net",
      );
    };

    const attemptSendDiagram = () => {
      if (sendAttempts >= maxAttempts) {
        console.warn("Max attempts reached to send diagram data to iframe");
        setViewerError(true);
        return;
      }

      try {
        sendDiagram();
        sendAttempts += 1;
        setTimeout(attemptSendDiagram, 200);
      } catch (error) {
        console.error("Error sending diagram to iframe:", error);
        sendAttempts += 1;
        setTimeout(attemptSendDiagram, 200);
      }
    };

    messageHandler = (event) => {
      // Accept messages from embed.diagrams.net
      if (!event.origin.includes("diagrams.net")) {
        return;
      }

      if (!hasLoggedIframeMessageRef.current) {
        hasLoggedIframeMessageRef.current = true;
        console.info("Draw.io iframe message:", event.data);
      }

      const data = event.data;
      if (
        data === "init" ||
        data?.event === "init" ||
        data?.event === "ready"
      ) {
        setIframeInit(true);
        return;
      }

      if (data && typeof data === "object" && data.event === "save") {
        return;
      }

      sendAttempts = maxAttempts;
    };

    // Wait for init before sending, but keep retrying after init to be safe
    if (iframeInit) {
      attemptSendDiagram();
    }

    window.addEventListener("message", messageHandler);
    return () => {
      window.removeEventListener("message", messageHandler);
      sendAttempts = maxAttempts; // Stop retrying on cleanup
    };
  }, [diagramXml, iframeReady, iframeInit]);

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
    setIframeInit(false);
  };

  const handleNextDiagram = () => {
    const maxIndex = (diagrams?.diagrams?.length || 1) - 1;
    setSelectedDiagramIndex((prev) => Math.min(maxIndex, prev + 1));
    setViewerError(null);
    setDiagramXml(null);
    setIframeReady(false);
    setIframeInit(false);
  };

  // Loading state
  if (loading) {
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
              <Heading size="md">Diagrams</Heading>
            </HStack>
          </HStack>
        </Card.Header>
        <Collapsible.Root open={isExpanded}>
          <Collapsible.Content>
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
          </Collapsible.Content>
        </Collapsible.Root>
      </Card.Root>
    );
  }

  // Empty state
  if (!diagrams?.diagrams || diagrams.diagrams.length === 0) {
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
              <Heading size="md">Diagrams</Heading>
            </HStack>
            <HStack onClick={(e) => e.stopPropagation()} alignItems="center">
              {!showLogs && (
                <Button
                  size="sm"
                  colorPalette="blue"
                  variant="outline"
                  onClick={handleAnalyze}
                >
                  <Sparkles size={14} />
                  Generate Diagrams
                </Button>
              )}
            </HStack>
          </HStack>
        </Card.Header>
        <Collapsible.Root open={isExpanded}>
          <Collapsible.Content>
            <Card.Body>
              <VStack align="stretch" gap={4}>
                <EmptyState
                  icon={FileText}
                  title="No diagrams generated yet"
                  description="Analyze this domain to generate architecture and flow diagrams"
                  variant="simple"
                />
              </VStack>
              {showLogs && logs && (
                <Box mt={6}>
                  <LogsViewer logs={logs} loading={logsLoading} />
                </Box>
              )}
            </Card.Body>
          </Collapsible.Content>
        </Collapsible.Root>
      </Card.Root>
    );
  }

  const diagramCount = diagrams.diagrams.length;

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
            <Heading size="md">Diagrams</Heading>
            <Badge colorPalette="blue" size="sm">
              {diagramCount} diagram{diagramCount !== 1 ? "s" : ""}
            </Badge>
          </HStack>
          <HStack onClick={(e) => e.stopPropagation()} alignItems="center">
            {!showLogs && (
              <>
                {/* Show "Edit with AI" if diagrams exist, otherwise "Generate Diagrams" */}
                {diagrams?.diagrams?.length > 0 ? (
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
                    onClick={handleAnalyze}
                    loading={loading}
                    loadingText="Generating"
                  >
                    <Sparkles size={14} />
                    Generate Diagrams
                  </Button>
                )}
              </>
            )}
          </HStack>
        </HStack>
      </Card.Header>

      <Collapsible.Root open={isExpanded}>
        <Collapsible.Content>
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
                      <Button
                        onClick={handleDownload}
                        size="sm"
                        variant="outline"
                      >
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
                          setIframeInit(false);
                        }}
                      >
                        <Badge
                          colorScheme={
                            DIAGRAM_TYPE_COLORS[diagram.type] || "gray"
                          }
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
        </Collapsible.Content>
      </Collapsible.Root>
    </Card.Root>
  );
}
