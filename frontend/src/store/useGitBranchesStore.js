import { create } from "zustand";
import { getProjectBranches } from "../api/project";

export const useGitBranchesStore = create((set, get) => ({
  /** Currently selected base branch for "Review Changes" */
  baseBranch: "main",

  /** Branches fetched from the backend (empty until first fetch) */
  branches: [],

  /** Currently checked-out branch in the target project */
  currentBranch: null,

  /** True while the branch list is being loaded */
  loadingBranches: false,

  setBaseBranch: (branch) => set({ baseBranch: branch }),

  /**
   * Fetch git branches from the backend.
   * No-ops if already fetched (branches.length > 0) unless force=true.
   */
  fetchBranches: async (force = false) => {
    if (!force && get().branches.length > 0) return;
    set({ loadingBranches: true });
    try {
      const res = await getProjectBranches();
      const branches = res.data?.branches ?? [];
      const currentBranch = res.data?.currentBranch ?? null;

      // Pick sensible default: first of main/master that actually exists
      const defaultBranch =
        ["main", "master"].find((b) => branches.includes(b)) ?? "main";
      set({ branches, currentBranch, baseBranch: defaultBranch });
    } catch {
      // silently ignore — user can still type a branch name
    } finally {
      set({ loadingBranches: false });
    }
  },
}));
