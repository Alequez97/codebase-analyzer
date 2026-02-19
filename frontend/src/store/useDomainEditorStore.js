import { create } from "zustand";
import api from "../api";
import { useCodebaseStore } from "./useCodebaseStore";
import { useDomainDocumentationStore } from "./useDomainDocumentationStore";
import { useDomainRequirementsStore } from "./useDomainRequirementsStore";

function requirementsToEditableText(requirements = []) {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return "";
  }

  return requirements
    .map((item, index) => {
      const priority = item?.priority || "P2";
      return `${index + 1}. [${priority}] ${item.description || ""}`.trim();
    })
    .join("\n");
}

function editableTextToRequirements(text = "") {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const cleaned = line.replace(/^\d+\.\s*/, "");
    const priorityMatch = cleaned.match(/^\[(P[0-3])\]\s*/i);
    const priority = priorityMatch?.[1]?.toUpperCase() || "P2";
    const description = cleaned.replace(/^\[(P[0-3])\]\s*/i, "").trim();

    return {
      id: `REQ-${String(index + 1).padStart(3, "0")}`,
      description,
      source: "Edited in dashboard",
      confidence: "MEDIUM",
      priority,
    };
  });
}

export const useDomainEditorStore = create((set, get) => ({
  // State
  editedRequirementsByDomainId: {},
  editedRequirementsStructuredByDomainId: new Map(),
  editedFilesByDomainId: {},
  editedDocumentationByDomainId: {},

  // Actions
  initializeEditorsForDomain: (domainId) => {
    const docStore = useDomainDocumentationStore.getState();
    const reqStore = useDomainRequirementsStore.getState();

    const documentation = docStore.dataById.get(domainId);
    const requirements = reqStore.dataById.get(domainId);

    set((state) => {
      const updates = {};

      // Initialize requirements if not already set
      if (!state.editedRequirementsByDomainId[domainId]) {
        const requirementsArray = requirements?.requirements || [];
        updates.editedRequirementsByDomainId = {
          ...state.editedRequirementsByDomainId,
          [domainId]: requirementsToEditableText(requirementsArray),
        };
      }

      if (!state.editedRequirementsStructuredByDomainId.has(domainId)) {
        const requirementsArray = requirements?.requirements || [];
        const newMap = new Map(state.editedRequirementsStructuredByDomainId);
        newMap.set(domainId, requirementsArray);
        updates.editedRequirementsStructuredByDomainId = newMap;
      }

      // Initialize documentation if not already set
      if (!state.editedDocumentationByDomainId[domainId]) {
        updates.editedDocumentationByDomainId = {
          ...state.editedDocumentationByDomainId,
          [domainId]: documentation?.content || "",
        };
      }

      return Object.keys(updates).length > 0 ? updates : state;
    });
  },

  updateEditedRequirements: (domainId, text) => {
    set((state) => ({
      editedRequirementsByDomainId: {
        ...state.editedRequirementsByDomainId,
        [domainId]: text,
      },
    }));
  },

  updateEditedRequirementsStructured: (domainId, requirements) => {
    set((state) => {
      const newMap = new Map(state.editedRequirementsStructuredByDomainId);
      newMap.set(domainId, requirements);
      return { editedRequirementsStructuredByDomainId: newMap };
    });
  },

  resetEditedRequirements: (domainId) => {
    const reqStore = useDomainRequirementsStore.getState();
    const requirementsData = reqStore.dataById.get(domainId);

    const requirementsArray = requirementsData?.requirements || [];

    set((state) => ({
      editedRequirementsByDomainId: {
        ...state.editedRequirementsByDomainId,
        [domainId]: requirementsToEditableText(requirementsArray),
      },
      editedRequirementsStructuredByDomainId: new Map(
        state.editedRequirementsStructuredByDomainId,
      ).set(domainId, requirementsArray),
    }));
  },

  updateEditedFiles: (domainId, filesArray) => {
    set((state) => ({
      editedFilesByDomainId: {
        ...state.editedFilesByDomainId,
        [domainId]: filesArray,
      },
    }));
  },

  resetEditedFiles: (domainId) => {
    const codebaseStore = useCodebaseStore.getState();
    const domainData = (codebaseStore.analysis?.domains || []).find(
      (d) => d.id === domainId,
    );
    const filesArray = domainData?.files || [];

    set((state) => ({
      editedFilesByDomainId: {
        ...state.editedFilesByDomainId,
        [domainId]: filesArray,
      },
    }));
  },

  updateEditedDocumentation: (domainId, text) => {
    set((state) => ({
      editedDocumentationByDomainId: {
        ...state.editedDocumentationByDomainId,
        [domainId]: text,
      },
    }));
  },

  resetEditedDocumentation: (domainId) => {
    const docStore = useDomainDocumentationStore.getState();
    const documentation = docStore.dataById.get(domainId);

    set((state) => ({
      editedDocumentationByDomainId: {
        ...state.editedDocumentationByDomainId,
        [domainId]: documentation?.content || "",
      },
    }));
  },

  saveRequirements: async (domainId) => {
    const requirementsText = get().editedRequirementsByDomainId[domainId];
    const structured =
      get().editedRequirementsStructuredByDomainId.get(domainId) || [];

    if (!requirementsText && structured.length === 0) {
      return { success: false, error: "No requirements to save" };
    }

    try {
      const codebaseStore = useCodebaseStore.getState();
      const domainData = (codebaseStore.analysis?.domains || []).find(
        (d) => d.id === domainId,
      );
      const domainName = domainData?.name || domainId;

      const requirements =
        structured.length > 0
          ? structured.map((req, index) => ({
              ...req,
              id: req.id || `REQ-${String(index + 1).padStart(3, "0")}`,
              priority: req.priority?.toUpperCase?.() || req.priority || "P2",
            }))
          : editableTextToRequirements(requirementsText);
      await api.saveRequirements(domainId, domainName, requirements);
      return { success: true };
    } catch (err) {
      const message =
        err?.response?.data?.message || "Failed to save requirements";
      return { success: false, error: message };
    }
  },

  saveFiles: async (domainId) => {
    const filesArray = get().editedFilesByDomainId[domainId];
    if (!filesArray || filesArray.length === 0) {
      return { success: false, error: "No files to save" };
    }

    try {
      await api.saveDomainFiles(domainId, filesArray);

      // Update the domain files in the codebase store directly
      const codebaseStore = useCodebaseStore.getState();
      const currentAnalysis = codebaseStore.analysis;
      if (currentAnalysis?.domains) {
        const updatedDomains = currentAnalysis.domains.map((domainData) =>
          domainData.id === domainId
            ? { ...domainData, files: filesArray }
            : domainData,
        );
        codebaseStore.setAnalysis({
          ...currentAnalysis,
          domains: updatedDomains,
        });
      }

      return { success: true };
    } catch (err) {
      const message = err?.response?.data?.error || "Failed to save files";
      return { success: false, error: message };
    }
  },

  saveDocumentation: async (domainId) => {
    const documentation = get().editedDocumentationByDomainId[domainId];
    if (!documentation) {
      return { success: false, error: "No documentation to save" };
    }

    try {
      await api.saveDocumentation(domainId, documentation);

      // Update the cache in documentation store with correct structure
      const docStore = useDomainDocumentationStore.getState();
      const currentDoc = docStore.dataById.get(domainId);
      const updatedDoc = {
        content: documentation,
        metadata: {
          ...currentDoc?.metadata,
          status: "manually-edited",
          updatedAt: new Date().toISOString(),
        },
      };
      docStore.updateData(domainId, updatedDoc);

      return { success: true };
    } catch (err) {
      const message =
        err?.response?.data?.error || "Failed to save documentation";
      return { success: false, error: message };
    }
  },

  reset: () =>
    set({
      editedRequirementsByDomainId: {},
      editedRequirementsStructuredByDomainId: new Map(),
      editedFilesByDomainId: {},
      editedDocumentationByDomainId: {},
    }),
}));
