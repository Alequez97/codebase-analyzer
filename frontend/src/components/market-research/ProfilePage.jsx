import { Box, Button, HStack, Text, VStack, Badge } from "@chakra-ui/react";
import {
  User,
  Clock,
  BarChart2,
  Search,
  FileText,
  LogOut,
  Inbox,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useMarketResearchStore } from "../../store/useMarketResearchStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(email) {
  if (!email) return "?";
  const [local] = email.split("@");
  return local.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProfileHeader({ user, onSignOut }) {
  const initials = getInitials(user.email);

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="#e2e8f0"
      borderRadius="16px"
      p={6}
      mb={5}
    >
      <HStack gap={5} align="start" flexWrap="wrap">
        {/* Avatar */}
        <Box
          w="64px"
          h="64px"
          borderRadius="50%"
          bg="linear-gradient(135deg, #6366f1, #7c3aed)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Text
            fontSize="20px"
            fontWeight="800"
            color="white"
            letterSpacing="-0.01em"
          >
            {initials}
          </Text>
        </Box>

        {/* Details */}
        <Box flex="1" minW={0}>
          <HStack gap={2} mb={1} flexWrap="wrap">
            <Text
              fontSize="18px"
              fontWeight="800"
              color="#0f172a"
              letterSpacing="-0.02em"
            >
              {user.name ?? user.email}
            </Text>
            <Badge
              px={2}
              py={0.5}
              borderRadius="20px"
              bg="#f1f5f9"
              color="#64748b"
              fontSize="10px"
              fontWeight="700"
              letterSpacing="0.06em"
            >
              FREE
            </Badge>
          </HStack>

          <HStack gap={1.5} mb={3}>
            <User size={12} color="#94a3b8" strokeWidth={2} />
            <Text fontSize="13px" color="#64748b" fontWeight="500">
              {user.email}
            </Text>
          </HStack>

          <Button
            size="sm"
            variant="outline"
            fontSize="12px"
            fontWeight="600"
            borderColor="#fecdd3"
            color="#e11d48"
            borderRadius="8px"
            h="30px"
            px={3}
            gap={1.5}
            _hover={{ bg: "#fff1f2", borderColor: "#fb7185" }}
            onClick={onSignOut}
          >
            <LogOut size={12} />
            Sign out
          </Button>
        </Box>
      </HStack>
    </Box>
  );
}

function HistoryRow({ entry, isLast, onOpen }) {
  return (
    <Box
      py={3.5}
      px={4}
      borderBottomWidth={isLast ? "0" : "1px"}
      borderColor="#f1f5f9"
      _hover={{ bg: "#f5f7ff" }}
      transition="background 0.12s"
      cursor="pointer"
      onClick={onOpen}
    >
      <HStack gap={4} align="center" flexWrap="wrap">
        {/* Icon */}
        <Box
          w="32px"
          h="32px"
          borderRadius="8px"
          bg="#eef2ff"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Search size={14} color="#6366f1" strokeWidth={2} />
        </Box>

        {/* Idea text */}
        <Box flex="1" minW={0}>
          <Text
            fontSize="13px"
            fontWeight="600"
            color="#0f172a"
            truncate
            mb={0.5}
          >
            {entry.idea || "Untitled analysis"}
          </Text>
          <HStack gap={2}>
            <Clock size={11} color="#94a3b8" strokeWidth={2} />
            <Text fontSize="11px" color="#94a3b8" fontWeight="500">
              {formatDate(entry.completedAt)} · {formatTime(entry.completedAt)}
            </Text>
          </HStack>
        </Box>

        {/* Competitor count badge */}
        <HStack
          gap={1.5}
          bg="#f8fafc"
          borderWidth="1px"
          borderColor="#e2e8f0"
          borderRadius="20px"
          px={2.5}
          py={1}
          flexShrink={0}
        >
          <BarChart2 size={11} color="#6366f1" strokeWidth={2} />
          <Text fontSize="11px" fontWeight="600" color="#374151">
            {entry.competitorCount} competitors
          </Text>
        </HStack>

        {/* Status */}
        <HStack
          gap={1}
          bg="rgba(22,163,74,0.08)"
          borderWidth="1px"
          borderColor="rgba(22,163,74,0.25)"
          borderRadius="20px"
          px={2.5}
          py={1}
          flexShrink={0}
        >
          <Box w="5px" h="5px" borderRadius="50%" bg="#16a34a" />
          <Text fontSize="11px" fontWeight="600" color="#15803d">
            Complete
          </Text>
        </HStack>

        {/* Arrow */}
        <Box color="#c7d2fe" flexShrink={0}>
          <ChevronRight size={15} strokeWidth={2.5} />
        </Box>
      </HStack>
    </Box>
  );
}

function EmptyHistory() {
  return (
    <Box py={12} textAlign="center">
      <Box
        w="48px"
        h="48px"
        borderRadius="12px"
        bg="#f1f5f9"
        display="flex"
        alignItems="center"
        justifyContent="center"
        mx="auto"
        mb={3}
      >
        <Inbox size={22} color="#94a3b8" strokeWidth={1.5} />
      </Box>
      <Text fontSize="14px" fontWeight="700" color="#374151" mb={1}>
        No analyses yet
      </Text>
      <Text fontSize="13px" color="#94a3b8">
        Run your first competitor analysis to see history here.
      </Text>
    </Box>
  );
}

function AnalysisHistory({ history, onClear, onOpen }) {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="#e2e8f0"
      borderRadius="16px"
      overflow="hidden"
    >
      {/* Header */}
      <HStack
        px={4}
        py={3.5}
        borderBottomWidth="1px"
        borderColor="#f1f5f9"
        justify="space-between"
      >
        <HStack gap={2}>
          <Box color="#6366f1">
            <FileText size={15} strokeWidth={2} />
          </Box>
          <Text fontSize="14px" fontWeight="700" color="#0f172a">
            Analysis history
          </Text>
          {history.length > 0 && (
            <Box bg="#eef2ff" borderRadius="20px" px={2} py={0.5}>
              <Text fontSize="11px" fontWeight="700" color="#6366f1">
                {history.length}
              </Text>
            </Box>
          )}
        </HStack>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            fontSize="11px"
            fontWeight="500"
            color="#94a3b8"
            borderRadius="6px"
            h="24px"
            px={2}
            _hover={{ bg: "#fef2f2", color: "#dc2626" }}
            onClick={onClear}
          >
            Clear all
          </Button>
        )}
      </HStack>

      {/* List */}
      {history.length === 0 ? (
        <EmptyHistory />
      ) : (
        <VStack gap={0} align="stretch">
          {history.map((entry, i) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              isLast={i === history.length - 1}
              onOpen={() => onOpen(entry)}
            />
          ))}
        </VStack>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const analysisHistory = useProfileStore((s) => s.analysisHistory);
  const clearHistory = useProfileStore((s) => s.clearHistory);
  const goToLanding = useMarketResearchStore((s) => s.goToLanding);
  const openHistoryAnalysis = useMarketResearchStore(
    (s) => s.openHistoryAnalysis,
  );

  // If not signed in, redirect to landing
  if (!user) {
    goToLanding();
    return null;
  }

  return (
    <Box minH="100vh" bg="#f8fafc" pt="116px" pb="80px">
      <Box maxW="720px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Page title */}
        <Text
          fontSize="22px"
          fontWeight="800"
          color="#0f172a"
          letterSpacing="-0.02em"
          mb={5}
        >
          My profile
        </Text>

        <ProfileHeader user={user} onSignOut={signOut} />
        <AnalysisHistory
          history={analysisHistory}
          onClear={clearHistory}
          onOpen={(entry) => openHistoryAnalysis(entry.idea)}
        />
      </Box>
    </Box>
  );
}
