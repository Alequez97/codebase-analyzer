export function ConfigurationDialog() {
  return (
    <DialogRoot size="xl">
      <DialogTrigger asChild>
        <IconButton
          size="sm"
          variant="ghost"
          title="Open settings"
          aria-label="Open settings"
        >
          <Settings size={16} />
        </IconButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuration</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <ConfigurationPanel />
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">Close</Button>
          </DialogActionTrigger>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
