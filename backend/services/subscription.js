/**
 * Subscription service — owns all per-user plan limits.
 *
 * Currently returns fixed defaults. Once user authentication and subscription
 * management are in place, replace the body of each function with a lookup
 * against the user's active plan (e.g. getSubscription(userId)).
 */

/**
 * Returns the maximum number of competitors the user is allowed to research
 * in a single market research session.
 *
 * @param {string} _userId - User ID (unused until subscriptions are implemented)
 * @returns {Promise<number>}
 */
export async function getNumCompetitors(_userId) {
  // TODO: look up the user's subscription plan and return the plan limit
  return 10;
}
