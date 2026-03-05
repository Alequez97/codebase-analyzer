import { useMatch } from "react-router-dom";
import { ChatButton } from "./ChatButton";
import { ChatPanel } from "./ChatPanel";
import { useAgentChatStore } from "../../store/useAgentChatStore";

/**
 * FloatingAgentChat - Container for the floating chat UI
 *
 * Renders only on domain detail pages (/domains/:domainId).
 * Mounts both the floating button and the sliding chat panel.
 */
export function FloatingAgentChat() {
  const match = useMatch("/domains/:domainId");
  const { isOpen, closeChat } = useAgentChatStore();

  // Only render on domain detail pages
  if (!match) return null;

  const domainId = match.params.domainId;

  return (
    <>
      {isOpen && <ChatPanel onClose={closeChat} />}
      <ChatButton domainId={domainId} />
    </>
  );
}
