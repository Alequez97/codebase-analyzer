import { useRef, useEffect, useState } from "react";
import { Box, IconButton } from "@chakra-ui/react";
import { Sparkles, X } from "lucide-react";
import { useAgentChatStore } from "../../store/useAgentChatStore";

export const BUTTON_SIZE = 60;
// Minimum pixels moved before we consider it a drag (not a click)
const DRAG_THRESHOLD = 5;

const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
  }
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.5), 0 8px 32px rgba(147, 51, 234, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(147, 51, 234, 0), 0 8px 32px rgba(147, 51, 234, 0.6); }
  }
  @keyframes orbit {
    from { transform: rotate(0deg) translateX(32px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(32px) rotate(-360deg); }
  }
  @keyframes orbit2 {
    from { transform: rotate(180deg) translateX(28px) rotate(-180deg); }
    to   { transform: rotate(540deg) translateX(28px) rotate(-540deg); }
  }
  @keyframes sparkle-pop {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.4); opacity: 1; }
  }
  .chat-btn-idle {
    animation: float 3s ease-in-out infinite, glow-pulse 2.5s ease-in-out infinite;
  }
  .chat-btn-idle:hover {
    animation: none !important;
    transform: scale(1.12) translateY(-2px) !important;
  }
  .chat-btn-dragging {
    animation: none !important;
    cursor: grabbing !important;
  }
  .orbit-dot-1 {
    animation: orbit 4s linear infinite;
  }
  .orbit-dot-2 {
    animation: orbit2 6s linear infinite;
  }
  .sparkle-icon {
    animation: sparkle-pop 2s ease-in-out infinite;
  }
`;

/**
 * ChatButton - Draggable floating button
 * Only rendered on domain detail pages.
 *
 * Props:
 *   posRef   – mutable ref { x, y } shared with parent (never causes re-renders)
 *   onDrag   – (pos) => void  called while dragging (updates posRef + panel DOM)
 *   domainId – current domain
 */
export function ChatButton({ domainId, posRef, onDrag }) {
  const { isOpen, currentTaskId, chatStateById, openChat, closeChat } =
    useAgentChatStore();
  const isAiWorking = chatStateById.get(currentTaskId)?.isWorking ?? false;

  // Ref to the outermost wrapper so we can move it directly without setState
  const wrapperRef = useRef(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });
  // Only used for visual class toggle (2 renders max, not per-mousemove)
  const [dragging, setDragging] = useState(false);

  // Stable refs so the effect never needs to re-run
  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const openChatRef = useRef(openChat);
  openChatRef.current = openChat;
  const closeChatRef = useRef(closeChat);
  closeChatRef.current = closeChat;
  const domainIdRef = useRef(domainId);
  domainIdRef.current = domainId;

  // Attach global listeners once — no deps that change during drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;

      const newX = Math.max(
        0,
        Math.min(
          window.innerWidth - BUTTON_SIZE,
          e.clientX - dragOffset.current.x,
        ),
      );
      const newY = Math.max(
        0,
        Math.min(
          window.innerHeight - BUTTON_SIZE,
          e.clientY - dragOffset.current.y,
        ),
      );

      // Direct DOM update — zero React re-renders
      if (wrapperRef.current) {
        wrapperRef.current.style.left = `${newX}px`;
        wrapperRef.current.style.top = `${newY}px`;
      }
      onDragRef.current({ x: newX, y: newY });
    };

    const handleMouseUp = (e) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setDragging(false);

      // If the mouse barely moved, treat as a click
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
        if (isOpenRef.current) {
          closeChatRef.current();
        } else {
          openChatRef.current(domainIdRef.current);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []); // empty — all live values accessed via refs

  const handleMouseDown = (e) => {
    // Only primary button
    if (e.button !== 0) return;
    isDragging.current = true;
    setDragging(true);
    const pos = posRef.current;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault(); // prevent text selection while dragging
  };

  const initialPos = posRef.current;

  return (
    <>
      <style>{styles}</style>
      <Box
        ref={wrapperRef}
        position="fixed"
        left={`${initialPos.x}px`}
        top={`${initialPos.y}px`}
        zIndex={1001}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <Box
          position="relative"
          display="inline-block"
          onMouseDown={handleMouseDown}
          cursor={dragging ? "grabbing" : "grab"}
        >
          {/* Decorative outer ring */}
          {!isOpen && !dragging && (
            <Box
              position="absolute"
              inset="-5px"
              borderRadius="full"
              border="2px solid"
              borderColor="purple.300"
              opacity={0.5}
              pointerEvents="none"
              css={{
                animation: "glow-pulse 2.5s ease-in-out infinite",
              }}
            />
          )}

          {/* Orbiting sparkle particles */}
          {!isOpen && !dragging && (
            <>
              <Box
                className="orbit-dot-1"
                position="absolute"
                top="50%"
                left="50%"
                marginTop="-4px"
                marginLeft="-4px"
                w="8px"
                h="8px"
                borderRadius="full"
                bg="purple.200"
                boxShadow="0 0 6px rgba(216, 180, 254, 0.9)"
                pointerEvents="none"
              />
              <Box
                className="orbit-dot-2"
                position="absolute"
                top="50%"
                left="50%"
                marginTop="-3px"
                marginLeft="-3px"
                w="6px"
                h="6px"
                borderRadius="full"
                bg="violet.300"
                boxShadow="0 0 5px rgba(167, 139, 250, 0.9)"
                pointerEvents="none"
              />
            </>
          )}

          <IconButton
            className={
              dragging
                ? "chat-btn-dragging"
                : !isOpen
                  ? "chat-btn-idle"
                  : undefined
            }
            size="lg"
            borderRadius="full"
            color="white"
            aria-label="Open AI chat"
            transition={
              dragging ? "none" : "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)"
            }
            width={`${BUTTON_SIZE}px`}
            height={`${BUTTON_SIZE}px`}
            css={{
              background: isOpen
                ? "linear-gradient(135deg, #374151 0%, #1f2937 100%)"
                : "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%)",
              boxShadow: dragging
                ? "0 16px 48px rgba(147, 51, 234, 0.55), 0 4px 12px rgba(109, 40, 217, 0.4)"
                : isOpen
                  ? "0 4px 20px rgba(0,0,0,0.3)"
                  : "0 8px 32px rgba(147, 51, 234, 0.45), 0 2px 8px rgba(109, 40, 217, 0.3)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(4px)",
              transform: dragging ? "scale(1.08)" : undefined,
              "&:hover": {
                background: isOpen
                  ? "linear-gradient(135deg, #4b5563 0%, #374151 100%)"
                  : "linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7c3aed 100%)",
                boxShadow: isOpen
                  ? "0 4px 24px rgba(0,0,0,0.4)"
                  : "0 12px 40px rgba(168, 85, 247, 0.6), 0 4px 12px rgba(124, 58, 237, 0.4)",
              },
            }}
          >
            <Box
              transition="transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
              transform={isOpen ? "rotate(90deg) scale(1.1)" : "rotate(0deg)"}
            >
              {isOpen ? (
                <X size={22} />
              ) : (
                <Box className={dragging ? undefined : "sparkle-icon"}>
                  <Sparkles size={22} />
                </Box>
              )}
            </Box>
          </IconButton>

          {/* AI working indicator dot */}
          {isAiWorking && (
            <Box
              position="absolute"
              top="-2px"
              right="-2px"
              w="14px"
              h="14px"
              borderRadius="full"
              bg="emerald.400"
              border="2.5px solid white"
              boxShadow="0 0 8px rgba(52, 211, 153, 0.8)"
              css={{ animation: "glow-pulse 1.5s ease-in-out infinite" }}
            />
          )}
        </Box>
      </Box>
    </>
  );
}
