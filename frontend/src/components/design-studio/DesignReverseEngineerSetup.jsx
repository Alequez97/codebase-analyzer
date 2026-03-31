import { useCallback, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { FileScan, Minus, Plus, ScanLine, X } from "lucide-react";
import { ModelSelector } from "../FloatingChat/ModelSelector";
import { useProjectFilesStore } from "../../store/useProjectFilesStore";

function createPage(index) {
  return {
    id: `page-${Date.now()}-${index}`,
    name: "",
    sourcePaths: [],
  };
}

function FilePathSelector({ selected, onChange }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const { loading, fetchProjectFiles, searchFiles } = useProjectFilesStore();

  const handleFocus = () => {
    setIsOpen(true);
    fetchProjectFiles();
  };

  const results = query.trim() ? searchFiles(query).slice(0, 10) : [];

  const add = (path) => {
    if (!selected.includes(path)) {
      onChange([...selected, path]);
    }
    setQuery("");
    inputRef.current?.focus();
  };

  const remove = (path) => onChange(selected.filter((p) => p !== path));

  return (
    <Box>
      {selected.length > 0 && (
        <HStack flexWrap="wrap" gap={1} mb={2}>
          {selected.map((path) => (
            <HStack
              key={path}
              gap={1}
              px={2}
              py={0.5}
              borderRadius="md"
              bg="blue.50"
              borderWidth="1px"
              borderColor="blue.200"
            >
              <Text
                fontSize="11px"
                fontFamily="mono"
                color="blue.700"
                fontWeight="600"
                maxW="260px"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {path}
              </Text>
              <Box
                as="button"
                onClick={() => remove(path)}
                color="blue.400"
                _hover={{ color: "blue.700" }}
                lineHeight={1}
              >
                <X size={10} />
              </Box>
            </HStack>
          ))}
        </HStack>
      )}

      <Box position="relative">
        <Input
          ref={inputRef}
          size="sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setIsOpen(false), 160)}
          placeholder="Search source files…"
          borderRadius="lg"
          borderColor="rgba(148,163,184,0.35)"
          fontSize="xs"
          fontFamily="mono"
          bg="white"
          _focus={{ borderColor: "orange.300", boxShadow: "none" }}
        />

        {isOpen && (loading || results.length > 0 || query.trim()) && (
          <Box
            position="absolute"
            top="100%"
            left={0}
            right={0}
            mt="4px"
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="xl"
            boxShadow="0 8px 24px rgba(0,0,0,0.1)"
            zIndex={20}
            maxH="200px"
            overflowY="auto"
          >
            {loading ? (
              <HStack justify="center" p={3}>
                <Spinner size="sm" color="orange.400" />
                <Text fontSize="sm" color="gray.500">
                  Loading files…
                </Text>
              </HStack>
            ) : results.length === 0 ? (
              <Text px={3} py={2} fontSize="xs" color="gray.400">
                No files match &ldquo;{query}&rdquo;
              </Text>
            ) : (
              results.map((file) => {
                const alreadyAdded = selected.includes(file);
                return (
                  <Box
                    key={file}
                    px={3}
                    py="7px"
                    fontSize="xs"
                    fontFamily="mono"
                    cursor="pointer"
                    color={alreadyAdded ? "blue.500" : "gray.700"}
                    fontWeight={alreadyAdded ? "700" : "400"}
                    bg={alreadyAdded ? "blue.50" : "transparent"}
                    _hover={{ bg: alreadyAdded ? "blue.50" : "orange.50" }}
                    onClick={() => add(file)}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {file}
                  </Box>
                );
              })
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function PageRow({ page, index, onChange, onRemove, canRemove }) {
  return (
    <Box
      borderWidth="1px"
      borderColor="rgba(148,163,184,0.22)"
      borderRadius="20px"
      bg="rgba(255,255,255,0.8)"
      overflow="visible"
      transition="box-shadow 0.15s"
      _hover={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
    >
      <HStack px={4} pt={3} pb={2} gap={3} align="center">
        <Box
          w="22px"
          h="22px"
          borderRadius="full"
          bg="orange.100"
          color="orange.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Text fontSize="10px" fontWeight="800">
            {index + 1}
          </Text>
        </Box>

        <Box flex={1}>
          <Input
            size="sm"
            value={page.name}
            onChange={(e) => onChange({ ...page, name: e.target.value })}
            placeholder="e.g. Dashboard"
            borderRadius="lg"
            borderColor="rgba(148,163,184,0.35)"
            fontSize="sm"
            bg="white"
            _focus={{ borderColor: "orange.300", boxShadow: "none" }}
          />
        </Box>

        {canRemove && (
          <IconButton
            variant="ghost"
            size="sm"
            borderRadius="full"
            color="gray.400"
            _hover={{ color: "red.500", bg: "red.50" }}
            aria-label="Remove page"
            onClick={onRemove}
          >
            <Minus size={14} />
          </IconButton>
        )}
      </HStack>

      <Box px={4} py={3}>
        <Text
          fontSize="9px"
          fontWeight="800"
          color="gray.400"
          textTransform="uppercase"
          letterSpacing="0.1em"
          mb={2}
        >
          Source files
        </Text>
        <FilePathSelector
          selected={page.sourcePaths}
          onChange={(paths) => onChange({ ...page, sourcePaths: paths })}
        />
      </Box>
    </Box>
  );
}

export function DesignReverseEngineerSetup({
  isSubmitting,
  selectedModel,
  onModelChange,
  defaultModelLabel,
  onReverseEngineer,
  onDesignFromScratch,
}) {
  const [pages, setPages] = useState([createPage(0)]);

  const updatePage = useCallback((id, updated) => {
    setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, []);

  const removePage = useCallback((id) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addPage = () => {
    setPages((prev) => [...prev, createPage(prev.length)]);
  };

  const handleSubmit = () => {
    const valid = pages.filter((p) => p.name.trim());
    if (!valid.length) return;
    const payload = valid.map(({ name, sourcePaths }) => ({
      name: name.trim(),
      route: `/${name.trim().toLowerCase().replace(/\s+/g, "-")}`,
      sourcePaths,
    }));
    onReverseEngineer(payload);
  };

  const canSubmit = !isSubmitting && pages.some((p) => p.name.trim());

  const bg = "linear-gradient(180deg, #fffaf3 0%, #f7fbff 44%, #eef5ff 100%)";

  return (
    <Box
      minH="calc(100vh - 49px)"
      bg={bg}
      position="relative"
      overflow="hidden"
      px={{ base: 4, md: 8 }}
      py={{ base: 8, md: 12 }}
    >
      {/* Background glows */}
      <Box
        position="absolute"
        top="-100px"
        right="-60px"
        w="320px"
        h="320px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0) 70%)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-140px"
        left="-100px"
        w="380px"
        h="380px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0) 72%)"
        pointerEvents="none"
      />

      <VStack gap={7} maxW="860px" mx="auto">
        {/* Header */}
        <VStack gap={3} textAlign="center">
          <HStack
            gap={2}
            px={3}
            py={1.5}
            borderRadius="full"
            bg="rgba(251,191,36,0.14)"
            borderWidth="1px"
            borderColor="rgba(251,191,36,0.3)"
          >
            <ScanLine size={13} color="#b45309" />
            <Text
              fontSize="11px"
              fontWeight="800"
              color="orange.700"
              textTransform="uppercase"
              letterSpacing="0.1em"
            >
              Reverse Engineer
            </Text>
          </HStack>

          <Text
            fontSize={{ base: "3xl", md: "5xl" }}
            lineHeight={{ base: "1.05", md: "0.97" }}
            letterSpacing="-0.055em"
            fontWeight="700"
            fontFamily="'Iowan Old Style', 'Palatino Linotype', serif"
            color="gray.900"
          >
            Recreate your existing UI
          </Text>
          <Text fontSize="md" color="gray.500" maxW="520px" lineHeight="1.65">
            Point the AI at your source pages and it will produce a standalone
            prototype with the same visual design but with mock data — no API
            calls.
          </Text>
        </VStack>

        {/* Main card */}
        <Box
          w="full"
          borderRadius="28px"
          bg="rgba(255,255,255,0.82)"
          borderWidth="1px"
          borderColor="rgba(148,163,184,0.22)"
          boxShadow="0 28px 72px rgba(15,23,42,0.09)"
          backdropFilter="blur(18px)"
          overflow="visible"
        >
          <VStack align="stretch" gap={0}>
            {/* Card header */}
            <HStack
              px={6}
              py={4}
              gap={3}
              borderBottomWidth="1px"
              borderColor="rgba(148,163,184,0.14)"
            >
              <Box
                w="38px"
                h="38px"
                borderRadius="14px"
                bg="orange.100"
                color="orange.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                <FileScan size={17} />
              </Box>
              <Box>
                <Text fontSize="md" fontWeight="800" color="gray.900">
                  Pages to reverse engineer
                </Text>
                <Text fontSize="xs" color="gray.400">
                  Add the pages you want replicated. Attach the source files so
                  the AI can read the design.
                </Text>
              </Box>
            </HStack>

            {/* Page list */}
            <VStack align="stretch" gap={3} px={5} py={5}>
              {pages.map((page, index) => (
                <PageRow
                  key={page.id}
                  page={page}
                  index={index}
                  onChange={(updated) => updatePage(page.id, updated)}
                  onRemove={() => removePage(page.id)}
                  canRemove={pages.length > 1}
                />
              ))}

              <Button
                variant="ghost"
                size="sm"
                borderRadius="full"
                color="gray.500"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="rgba(148,163,184,0.4)"
                _hover={{
                  bg: "orange.50",
                  borderColor: "orange.300",
                  color: "orange.700",
                }}
                alignSelf="flex-start"
                onClick={addPage}
                px={4}
              >
                <Plus size={13} />
                Add another page
              </Button>
            </VStack>

            {/* Footer controls */}
            <HStack
              px={6}
              py={4}
              justify="space-between"
              align={{ base: "start", md: "center" }}
              flexDirection={{ base: "column", md: "row" }}
              gap={4}
              borderTopWidth="1px"
              borderColor="rgba(148,163,184,0.14)"
              bg="rgba(248,250,252,0.6)"
              borderBottomRadius="28px"
            >
              <Box minW={{ base: "full", md: "240px" }}>
                <Text
                  fontSize="9px"
                  fontWeight="800"
                  color="gray.500"
                  textTransform="uppercase"
                  letterSpacing="0.12em"
                  mb={1.5}
                >
                  Model
                </Text>
                <ModelSelector
                  value={selectedModel}
                  onChange={onModelChange}
                  defaultLabel={defaultModelLabel}
                />
              </Box>

              <HStack gap={3} w={{ base: "full", md: "auto" }}>
                <Button
                  bg="gray.950"
                  color="white"
                  borderRadius="full"
                  px={6}
                  _hover={{ bg: "black" }}
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={!canSubmit}
                  flex={{ base: 1, md: "unset" }}
                >
                  <ScanLine size={15} />
                  Start Reverse Engineering
                </Button>
              </HStack>
            </HStack>
          </VStack>
        </Box>

        {/* Design from scratch link */}
        <HStack
          gap={1}
          opacity={0.6}
          _hover={{ opacity: 1 }}
          transition="opacity 0.15s"
        >
          <Text fontSize="sm" color="gray.500">
            Starting a new design?
          </Text>
          <Button
            variant="ghost"
            size="sm"
            color="gray.600"
            fontWeight="700"
            px={1}
            h="auto"
            py={0}
            _hover={{
              color: "gray.900",
              bg: "transparent",
              textDecoration: "underline",
            }}
            onClick={onDesignFromScratch}
          >
            Design from scratch →
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
