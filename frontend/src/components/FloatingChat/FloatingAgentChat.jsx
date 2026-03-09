import { useMatch } from "react-router-dom";
import { useRef } from "react";
import { ChatButton } from "./ChatButton";
import { ChatPanel } from "./ChatPanel";
import { useAgentChatStore } from "../../store/useAgentChatStore";

const BUTTON_SIZE = 60;
const MARGIN = 28;

/**
 * FloatingAgentChat - Container for the floating chat UI
 *
 * Renders only on domain detail pages (/domains/:domainId).
 * Position is tracked via refs so dragging never triggers React re-renders.
 */
export function FloatingAgentChat() {
  const match = useMatch("/domains/:domainId");
  const { isOpen, closeChat } = useAgentChatStore();

  // Mutable ref — updates never cause re-renders
  const posRef = useRef({
    x: window.innerWidth - BUTTON_SIZE - MARGIN,
    y: window.innerHeight - BUTTON_SIZE - MARGIN,
  });

  // ChatPanel registers its imperative updater here
  const panelUpdateRef = useRef(null);

  // Called by ChatButton on every mousemove — no setState, no re-renders
  const onDrag = (pos) => {
    posRef.current = pos;
    panelUpdateRef.current?.(pos);
  };

  // Only render on domain detail pages
  if (!match) return null;

  const domainId = match.params.domainId;

  return (
    <>
      {isOpen && (
        <ChatPanel
          onClose={closeChat}
          posRef={posRef}
          registerPositionUpdate={(fn) => {
            panelUpdateRef.current = fn;
          }}
        />
      )}
      <ChatButton domainId={domainId} posRef={posRef} onDrag={onDrag} />
    </>
  );
}
