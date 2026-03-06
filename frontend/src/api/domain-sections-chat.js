import client from "./client";

export const chatWithAI = ({
  domainId,
  sectionType,
  message,
  context,
  history,
}) =>
  client.post(`/chat/domain/${domainId}/${sectionType}`, {
    message,
    context,
    history,
  });

export const getDomainSectionChatHistory = (domainId, sectionType) =>
  client.get(`/chat/domain/${domainId}/${sectionType}/history`);

export const appendDomainSectionChatMessage = (
  domainId,
  sectionType,
  { role, content },
) =>
  client.post(`/chat/domain/${domainId}/${sectionType}/history`, {
    role,
    content,
  });

export const clearDomainSectionChatHistory = (domainId, sectionType) =>
  client.delete(`/chat/domain/${domainId}/${sectionType}/history`);
