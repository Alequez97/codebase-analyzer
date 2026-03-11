import client from "./client";

/**
 * Queue a review-changes task.
 *
 * @param {Object} [params]
 * @param {string} [params.baseBranch] - Branch/commit to diff against (defaults to HEAD on backend)
 * @param {string[]} [params.domainIds] - Limit to specific domains
 * @param {string} [params.model] - Override LLM model
 */
export const reviewChanges = ({ baseBranch, domainIds, model } = {}) =>
  client.post("/review-changes", {
    ...(baseBranch && { baseBranch }),
    ...(domainIds && { domainIds }),
    ...(model && { model }),
  });
