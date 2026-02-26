export function ExistingTestsTable({ testFiles }) {
  const normalizedTestFiles = (testFiles || [])
    .map((test) => {
      const filePath = test?.filePath || test?.file || "";
      const type = test?.type || test?.testType || "unit";
      const description = test?.description || "No description";

      return {
        filePath,
        type,
        description,
      };
    })
    .filter((test) => test.filePath);

  if (normalizedTestFiles.length === 0) {
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
        {normalizedTestFiles.map((test) => (
          <Table.Row key={test.filePath}>
            <Table.Cell>
              <Text fontSize="sm" fontFamily="mono">
                {test.filePath}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Badge
                colorPalette={
                  test.type === "unit"
                    ? "purple"
                    : test.type === "integration"
                      ? "blue"
                      : "green"
                }
              >
                {test.type || "unit"}
              </Badge>
            </Table.Cell>
            <Table.Cell>
              <Text fontSize="sm" color="gray.600">
                {test.description}
              </Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
