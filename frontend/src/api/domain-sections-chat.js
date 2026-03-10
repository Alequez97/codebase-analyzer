import client from "./client";

export const chatWithAI = ({
  domainId,
  sectionType,
  message,
  chatId,
  context,
  agentsOverrides = null,
}) =>
  client.post(`/chat/domain/${domainId}/${sectionType}`, {
    message,
    chatId,
    context,
    agentsOverrides,
  });

export const getDomainSectionChatHistory = (
  domainId,
  sectionType,
  chatId = null,
) =>
  client.get(`/chat/domain/${domainId}/${sectionType}/history`, {
    params: chatId ? { chatId } : undefined,
  });

export const appendDomainSectionChatMessage = (
  domainId,
  sectionType,
  { role, content, chatId },
) =>
  client.post(`/chat/domain/${domainId}/${sectionType}/history`, {
    role,
    content,
    chatId,
  });

export const clearDomainSectionChatHistory = (
  domainId,
  sectionType,
  chatId = null,
) =>
  client.delete(`/chat/domain/${domainId}/${sectionType}/history`, {
    params: chatId ? { chatId } : undefined,
  });

export const listDomainSectionChatSessions = (domainId, sectionType) =>
  client.get(`/chat/domain/${domainId}/${sectionType}/sessions`);
