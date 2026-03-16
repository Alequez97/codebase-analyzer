// ---------------------------------------------------------------------------
// Plan definitions — single source of truth for all monetization limits.
// When Stripe is integrated, getSubscription(userId) will return the plan
// name and this config will drive all enforcement.
// ---------------------------------------------------------------------------

export const PLANS = {
  free: {
    name: "free",
    creditsPerMonth: 2,
    numCompetitors: 10,
    historyDays: 0, // no saved history
    deepIntelligence: false,
    pdfExport: false,
    teamSeats: 1,
    apiAccess: false,
  },
  starter: {
    name: "starter",
    creditsPerMonth: 15,
    numCompetitors: 15,
    historyDays: 90,
    deepIntelligence: false,
    pdfExport: true,
    teamSeats: 1,
    apiAccess: false,
  },
  pro: {
    name: "pro",
    creditsPerMonth: 50,
    numCompetitors: 20,
    historyDays: Infinity,
    deepIntelligence: true,
    pdfExport: true,
    teamSeats: 1,
    apiAccess: false,
  },
  agency: {
    name: "agency",
    creditsPerMonth: 200,
    numCompetitors: 25,
    historyDays: Infinity,
    deepIntelligence: true,
    pdfExport: true,
    teamSeats: 5,
    apiAccess: true,
  },
};

// ---------------------------------------------------------------------------
// Subscription lookup — stub until payment processor is integrated.
// Replace with a real DB/Stripe lookup when subscriptions go live.
// ---------------------------------------------------------------------------

async function getSubscription(_userId) {
  // TODO: look up the user's active subscription record (e.g. from Stripe or
  // a subscriptions/{userId}.json persistence file) and return the plan name.
  return "free";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the full plan details for a user based on their active subscription.
 *
 * @param {string} userId
 * @returns {Promise<typeof PLANS[keyof typeof PLANS]>}
 */
export async function getSubscriptionPlanDetails(userId) {
  const planName = await getSubscription(userId);
  return PLANS[planName] ?? PLANS.free;
}
