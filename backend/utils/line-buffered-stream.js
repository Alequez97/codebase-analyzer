/**
 * Create a small line-buffered stream helper.
 * It accepts chunked text and emits complete lines via callback.
 */
export function createLineBufferedStream(onLine) {
  let buffer = "";

  return {
    push(text) {
      if (!text) {
        return;
      }

      buffer += text;
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() ?? "";

      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        onLine(trimmed);
      }
    },
    flush() {
      const remainder = buffer.trim();
      buffer = "";
      if (remainder) {
        onLine(remainder);
      }
    },
  };
}
