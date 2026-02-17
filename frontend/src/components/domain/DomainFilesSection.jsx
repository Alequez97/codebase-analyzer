import { useState, useEffect, useMemo } from "react";
import {
  Heading,
  Text,
  HStack,
  VStack,
  IconButton,
  Input,
  Box,
  Table,
  Button,
} from "@chakra-ui/react";
import { X, Plus, Save, RotateCcw } from "lucide-react";
import { Card } from "../ui/card";
import { useProjectFilesStore } from "../../store/useProjectFilesStore";

export default function DomainFilesSection({
  files = [],
  onFilesChange,
  onSave,
  onReset,
}) {
  // Ensure files is always an array
  const filesArray = Array.isArray(files) ? files : [];

  const {
    files: projectFiles,
    loading,
    fetchProjectFiles,
  } = useProjectFilesStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch project files on mount
  useEffect(() => {
    fetchProjectFiles();
  }, [fetchProjectFiles]);

  // Filter suggestions based on search term
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm) return [];

    const searchLower = searchTerm.toLowerCase();
    return projectFiles
      .filter(
        (file) =>
          file.toLowerCase().includes(searchLower) &&
          !filesArray.includes(file),
      )
      .slice(0, 10); // Limit to 10 suggestions
  }, [searchTerm, projectFiles, filesArray]);

  const handleAddFile = (file) => {
    if (!filesArray.includes(file)) {
      onFilesChange([...filesArray, file]);
    }
    setSearchTerm("");
    setShowSuggestions(false);
  };

  const handleRemoveFile = (fileToRemove) => {
    onFilesChange(filesArray.filter((file) => file !== fileToRemove));
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchTerm) {
      // If exact match exists in suggestions, use it
      const exactMatch = filteredSuggestions.find(
        (f) => f.toLowerCase() === searchTerm.toLowerCase(),
      );
      if (exactMatch) {
        handleAddFile(exactMatch);
      } else if (filteredSuggestions.length > 0) {
        // Otherwise use first suggestion
        handleAddFile(filteredSuggestions[0]);
      } else {
        // Allow manual entry
        handleAddFile(searchTerm);
      }
    }
  };

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Files</Heading>
          <HStack>
            <Button
              size="sm"
              variant="outline"
              onClick={onReset}
              leftIcon={<RotateCcw size={14} />}
            >
              Reset
            </Button>
            <Button
              size="sm"
              colorPalette="green"
              onClick={onSave}
              leftIcon={<Save size={14} />}
            >
              Save
            </Button>
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Text mb={3} color="gray.600" fontSize="sm">
          These files define this domain. Add or remove files to refine the
          analysis scope. Click Save to persist changes.
        </Text>

        <VStack align="stretch" gap={3}>
          {/* File List Table */}
          {filesArray.length > 0 && (
            <Box
              borderWidth="1px"
              borderRadius="md"
              overflow="hidden"
              maxH="300px"
              overflowY="auto"
            >
              <Table.Root size="sm" variant="outline">
                <Table.Body>
                  {filesArray.map((file) => (
                    <Table.Row key={file} _hover={{ bg: "gray.50" }}>
                      <Table.Cell>
                        <Text fontSize="sm" fontFamily="mono" color="gray.700">
                          {file}
                        </Text>
                      </Table.Cell>
                      <Table.Cell width="50px" textAlign="right">
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleRemoveFile(file)}
                          title="Remove file"
                        >
                          <X size={14} />
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}

          {filesArray.length === 0 && (
            <Box
              borderWidth="1px"
              borderRadius="md"
              p={8}
              textAlign="center"
              bg="gray.50"
            >
              <Text color="gray.500" fontSize="sm">
                No files added yet. Use the input below to add files.
              </Text>
            </Box>
          )}

          {/* Add File Input with Autocomplete */}
          <Box position="relative">
            <HStack>
              <Box flex="1" position="relative">
                <Input
                  placeholder="Type to search and add files..."
                  size="sm"
                  value={searchTerm}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 200)
                  }
                  fontFamily="mono"
                  fontSize="sm"
                />

                {/* Autocomplete Suggestions */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <Box
                    position="absolute"
                    top="100%"
                    left={0}
                    right={0}
                    mt={1}
                    bg="white"
                    borderWidth="1px"
                    borderRadius="md"
                    boxShadow="lg"
                    maxH="200px"
                    overflowY="auto"
                    zIndex={10}
                  >
                    {filteredSuggestions.map((file) => (
                      <Box
                        key={file}
                        px={3}
                        py={2}
                        cursor="pointer"
                        _hover={{ bg: "blue.50" }}
                        onClick={() => handleAddFile(file)}
                      >
                        <Text fontSize="sm" fontFamily="mono" color="gray.700">
                          {file}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              <IconButton
                size="sm"
                colorPalette="blue"
                onClick={() => {
                  if (searchTerm) {
                    const exactMatch = filteredSuggestions.find(
                      (f) => f.toLowerCase() === searchTerm.toLowerCase(),
                    );
                    handleAddFile(exactMatch || searchTerm);
                  }
                }}
                disabled={!searchTerm}
                title="Add file"
              >
                <Plus size={16} />
              </IconButton>
            </HStack>

            {loading && (
              <Text fontSize="xs" color="gray.500" mt={1}>
                Loading project files...
              </Text>
            )}
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
