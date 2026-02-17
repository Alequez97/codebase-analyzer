import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api from "../services/api";
import { useAnalysisStore } from "./useAnalysisStore";

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

export const useDomainEditorStore = create(
  persist(
    (set, get) => ({
      // State
      editedRequirementsByDomainId: {},
      editedFilesByDomainId: {},
      editedDocumentationByDomainId: {},

      // Actions
      initializeEditorsForDomain: (domainId) => {
        const analysisStore = useAnalysisStore.getState();
        const detail = analysisStore.domainAnalysisById.get(domainId);
        const documentation = analysisStore.domainDocumentationById.get(domainId);

        set((state) => {
          const updates = {};

          // Initialize requirements if not already set
          if (!state.editedRequirementsByDomainId[domainId]) {
            updates.editedRequirementsByDomainId = {
              ...state.editedRequirementsByDomainId,
              [domainId]: requirementsToEditableText(detail?.requirements),
            };
          }

          // Initialize documentation if not already set
          if (!state.editedDocumentationByDomainId[domainId]) {
            updates.editedDocumentationByDomainId = {
              ...state.editedDocumentationByDomainId,
              [domainId]: documentation?.documentation?.businessPurpose || "",
            };
          }

          // Don't initialize files - they should come from codebase analysis (domain.files)
          // Only track edited files when user actually modifies them

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

      resetEditedRequirements: (domainId) => {
        const analysisStore = useAnalysisStore.getState();
        const existing = analysisStore.domainAnalysisById.get(domainId);

        set((state) => ({
          editedRequirementsByDomainId: {
            ...state.editedRequirementsByDomainId,
            [domainId]: requirementsToEditableText(existing?.requirements),
          },
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
        const analysisStore = useAnalysisStore.getState();
        const domain = (analysisStore.analysis?.domains || []).find(
          (d) => d.id === domainId,
        );
        const filesArray = domain?.files || [];

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
        const analysisStore = useAnalysisStore.getState();
        const documentation = analysisStore.domainDocumentationById.get(domainId);

        set((state) => ({
          editedDocumentationByDomainId: {
            ...state.editedDocumentationByDomainId,
            [domainId]: documentation?.documentation?.businessPurpose || "",
          },
        }));
      },

      saveRequirements: async (domainId) => {
        const requirementsText = get().editedRequirementsByDomainId[domainId];
        if (!requirementsText) {
          return { success: false, error: "No requirements to save" };
        }

        try {
          const analysisStore = useAnalysisStore.getState();
          const domain = (analysisStore.analysis?.domains || []).find(
            (d) => d.id === domainId,
          );
          const domainName = domain?.name || domainId;

          const requirements = editableTextToRequirements(requirementsText);
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

          // Update the domain files in the analysis store directly
          const analysisStore = useAnalysisStore.getState();
          const currentAnalysis = analysisStore.analysis;
          if (currentAnalysis?.domains) {
            const updatedDomains = currentAnalysis.domains.map((domain) =>
              domain.id === domainId ? { ...domain, files: filesArray } : domain
            );
            analysisStore.setAnalysis({
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

          // Update the cache in analysis store
          const analysisStore = useAnalysisStore.getState();
          const currentDoc = analysisStore.domainDocumentationById.get(domainId);
          if (currentDoc) {
            const updatedDoc = {
              ...currentDoc,
              documentation: {
                businessPurpose: documentation,
              },
              timestamp: new Date().toISOString(),
            };
            const newMap = new Map(analysisStore.domainDocumentationById);
            newMap.set(domainId, updatedDoc);
            analysisStore.setAnalysis({
              ...analysisStore.analysis,
              domainDocumentationById: newMap,
            });
          }

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
          editedFilesByDomainId: {},
          editedDocumentationByDomainId: {},
        }),
    }),
    {
      name: "domain-editor-store",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
