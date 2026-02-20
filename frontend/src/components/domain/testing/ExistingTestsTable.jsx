import { Text, Badge, Table } from "@chakra-ui/react";
import { Alert } from "../../ui/alert";

export function ExistingTestsTable({ testFiles }) {
  if (testFiles.length === 0) {
    return (
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Description>
          No existing test files identified for this domain.
        </Alert.Description>
      </Alert.Root>
    );
  }

  return (
    <Table.Root size="sm" variant="outline">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>File</Table.ColumnHeader>
          <Table.ColumnHeader>Type</Table.ColumnHeader>
          <Table.ColumnHeader>Description</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {testFiles.map((test) => (
          <Table.Row key={test.file}>
            <Table.Cell>
              <Text fontSize="sm" fontFamily="mono">
                {test.file}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Badge
                colorPalette={
                  test.testType === "unit"
                    ? "purple"
                    : test.testType === "integration"
                      ? "blue"
                      : "green"
                }
              >
                {test.testType || "unit"}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Text fontSize="sm" color="gray.600">
                {test.description || "No description"}
              </Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
