import {
  Activity,
  BarChart2,
  CheckCircle,
  FileText,
  Search,
  Users,
} from "lucide-react";

export const EXAMPLE_IDEAS = [
  "AI code review tool",
  "No-code mobile builder",
  "Dev expense tracker",
  "Open-source Notion",
];

export const FEATURES = [
  { icon: Search, label: "Find competitors", color: "#3b82f6" },
  { icon: Activity, label: "Deep intelligence", color: "#d97706" },
  { icon: BarChart2, label: "Map the gaps", color: "#16a34a" },
  { icon: CheckCircle, label: "Go / No-go verdict", color: "#7c3aed" },
  { icon: FileText, label: "Exportable PDF report", color: "#3b82f6" },
];

export const HERO_STATS = [
  { icon: Users, value: "2,400+", label: "reports run" },
  { icon: Search, value: "18,000+", label: "companies analyzed" },
  { icon: Activity, value: "Avg 5 min", label: "per report" },
  { icon: CheckCircle, value: "No credit card", label: "required to try" },
];

const PLAN_FEATURES_FREE = [
  { text: "2 reports/month", included: true },
  { text: "~20 competitors per report", included: true },
  { text: "Basic gap analysis", included: true },
  { text: "PDF export", included: false },
  { text: "Report history", included: false },
  { text: "Deep intelligence", included: false },
];

const PLAN_FEATURES_STARTER = [
  { text: "15 reports/month", included: true },
  { text: "~20 competitors per report", included: true },
  { text: "Full gap analysis", included: true },
  { text: "PDF export", included: true },
  { text: "90-day report history", included: true },
  { text: "Deep intelligence", included: false },
];

const PLAN_FEATURES_PRO = [
  { text: "50 reports/month", included: true },
  { text: "Deep intelligence mode", included: true },
  { text: "Full gap analysis", included: true },
  { text: "PDF export", included: true },
  { text: "Unlimited history", included: true },
  { text: "Priority processing", included: true },
];

const PLAN_FEATURES_AGENCY = [
  { text: "200 reports/month", included: true },
  { text: "Everything in Pro", included: true },
  { text: "5 team seats", included: true },
  { text: "API access", included: true },
  { text: "White-label PDF reports", included: true },
  { text: "Dedicated support", included: true },
];

export const PRICING_PLANS = {
  monthly: [
    {
      name: "Free",
      credits: "2 credits / month",
      price: 0,
      tagline: "Try it out, no commitment.",
      cta: "Start for free",
      ctaStyle: "outline",
      features: PLAN_FEATURES_FREE,
    },
    {
      name: "Starter",
      credits: "15 credits / month",
      price: 19,
      tagline: "For solo founders validating ideas regularly.",
      cta: "Get Starter",
      ctaStyle: "outline",
      featured: true,
      features: PLAN_FEATURES_STARTER,
    },
    {
      name: "Pro",
      credits: "50 credits / month",
      price: 49,
      tagline: "For PMs and founders running frequent research.",
      cta: "Get Pro",
      ctaStyle: "primary",
      features: PLAN_FEATURES_PRO,
    },
    {
      name: "Agency",
      credits: "200 credits / month",
      price: 149,
      tagline: "For teams and agencies with multiple clients.",
      cta: "Get Agency",
      ctaStyle: "outline",
      features: PLAN_FEATURES_AGENCY,
    },
  ],
  annual: [
    {
      name: "Free",
      credits: "2 credits / month",
      price: 0,
      tagline: "Try it out, no commitment.",
      cta: "Start for free",
      ctaStyle: "outline",
      features: PLAN_FEATURES_FREE,
    },
    {
      name: "Starter",
      credits: "15 credits / month",
      price: 15,
      tagline: "For solo founders validating ideas regularly.",
      cta: "Get Starter",
      ctaStyle: "outline",
      featured: true,
      features: PLAN_FEATURES_STARTER,
    },
    {
      name: "Pro",
      credits: "50 credits / month",
      price: 39,
      tagline: "For PMs and founders running frequent research.",
      cta: "Get Pro",
      ctaStyle: "primary",
      features: PLAN_FEATURES_PRO,
    },
    {
      name: "Agency",
      credits: "200 credits / month",
      price: 119,
      tagline: "For teams and agencies with multiple clients.",
      cta: "Get Agency",
      ctaStyle: "outline",
      features: PLAN_FEATURES_AGENCY,
    },
  ],
};

// ---------------------------------------------------------------------------
// Mock competitor data for the analysis simulation
// ---------------------------------------------------------------------------

export const MOCK_COMPETITORS = [
  {
    id: "snyk",
    name: "Snyk",
    url: "snyk.io",
    logoChar: "S",
    logoColor: "#ef4444",
    logoBg: "#fef2f2",
    description:
      "Developer security platform focusing on open-source vulnerabilities, container security, and IaC scanning. Integrates with GitHub, GitLab, and CI/CD pipelines.",
    tags: ["Security focus", "OSS scanning", "CI/CD native", "Free tier"],
    pricing: "$25/dev",
    pricingPeriod: "/mo",
    customers: "2.5M+",
  },
  {
    id: "sonarqube",
    name: "SonarQube",
    url: "sonarqube.org",
    logoChar: "SQ",
    logoColor: "#0284c7",
    logoBg: "#f0f9ff",
    description:
      "Static code analysis for 30+ languages. Detects bugs, code smells, and security vulnerabilities. Strong enterprise presence with self-hosted and cloud editions.",
    tags: ["Static analysis", "Multi-language", "Enterprise"],
    pricing: "$150/mo",
    pricingPeriod: "cloud",
    customers: "400K+",
  },
  {
    id: "codeclimate",
    name: "Code Climate",
    url: "codeclimate.com",
    logoChar: "CC",
    logoColor: "#16a34a",
    logoBg: "#f0fdf4",
    description:
      "Code quality and test coverage platform. Tracks technical debt trends over time. Popular with open-source projects via the free Velocity plan.",
    tags: ["Tech debt", "Coverage", "OSS friendly"],
    pricing: "$16/seat",
    pricingPeriod: "/mo",
    customers: "100K+",
  },
  {
    id: "deepsource",
    name: "DeepSource",
    url: "deepsource.io",
    logoChar: "D",
    logoColor: "#0891b2",
    logoBg: "#ecfeff",
    description:
      "Automated code review with auto-fix capabilities. Continuously monitors code quality, analyzes pull requests, and suggests targeted refactors.",
    tags: ["Auto-fix", "PR analysis", "Multi-language"],
    pricing: "$12/dev",
    pricingPeriod: "/mo",
    customers: "50K+",
  },
  {
    id: "ghas",
    name: "GitHub Advanced Security",
    url: "github.com/features/security",
    logoChar: "GH",
    logoColor: "#1f2937",
    logoBg: "#f9fafb",
    description:
      "Native GitHub security features including CodeQL code scanning, secret scanning, and Dependabot. Best for teams already on GitHub.",
    tags: ["GitHub native", "CodeQL", "Secret scanning"],
    pricing: "$4/user",
    pricingPeriod: "/mo",
    customers: "80M+ repos",
  },
  {
    id: "codescene",
    name: "CodeScene",
    url: "codescene.io",
    logoChar: "CS",
    logoColor: "#7c3aed",
    logoBg: "#f5f3ff",
    description:
      "Behavioral code analysis using git history to find hidden technical debt, identify refactoring targets, and visualize team patterns over time.",
    tags: ["Behavioral analysis", "Tech debt", "Team insights"],
    pricing: "$150/dev",
    pricingPeriod: "/mo",
    customers: "Fortune 500",
  },
  {
    id: "qodana",
    name: "Qodana",
    url: "jetbrains.com/qodana",
    logoChar: "QD",
    logoColor: "#db2777",
    logoBg: "#fdf2f8",
    description:
      "JetBrains code quality platform with 40+ inspections. Designed for CI/CD pipelines and uses the same analysis engines as IntelliJ IDEA.",
    tags: ["JetBrains ecosystem", "IDE-grade analysis", "CI/CD ready"],
    pricing: "$249/dev",
    pricingPeriod: "/yr",
    customers: "JetBrains users",
  },
];

// ---------------------------------------------------------------------------
// Simulation event sequence — drives the mock analysis animation
//
// Types:
//   "activity"          → adds an event to the activity feed
//   "add_competitors"   → initialises all competitors as "queued"
//   "competitor_status" → transitions a competitor to "analyzing" | "done"
//   "analysis_complete" → marks the analysis as finished
//
// Activity payload types: "search" | "found" | "navigate" | "extract"
// ---------------------------------------------------------------------------

export const SIMULATION_EVENTS = [
  // --- Discovery phase ---
  {
    delay: 400,
    type: "activity",
    payload: {
      kind: "search",
      message: "Web search",
      detail: '"AI code review CI/CD security analysis tools 2025"',
    },
  },
  {
    delay: 900,
    type: "activity",
    payload: {
      kind: "search",
      message: "Web search",
      detail: '"static analysis bug detection developer tools 2025"',
    },
  },
  { delay: 1500, type: "add_competitors" },
  {
    delay: 1600,
    type: "activity",
    payload: {
      kind: "found",
      message: "Found 7 competitors to analyze",
      detail:
        "Snyk, SonarQube, Code Climate, DeepSource, GitHub Advanced Security, CodeScene, Qodana",
    },
  },

  // --- Wave 1: Snyk, SonarQube, CodeClimate run in parallel ---
  { delay: 1800, type: "competitor_status", id: "snyk", status: "analyzing" },
  {
    delay: 1850,
    type: "competitor_status",
    id: "sonarqube",
    status: "analyzing",
  },
  {
    delay: 1900,
    type: "competitor_status",
    id: "codeclimate",
    status: "analyzing",
  },

  {
    delay: 2100,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "SNYK AGENT",
      agentColor: "#ef4444",
      message: "Navigate",
      url: "https://snyk.io",
    },
  },
  {
    delay: 2300,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "SONARQUBE AGENT",
      agentColor: "#0284c7",
      message: "Navigate",
      url: "https://www.sonarqube.org",
    },
  },
  {
    delay: 2500,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "CODECLIMATE AGENT",
      agentColor: "#16a34a",
      message: "Navigate",
      url: "https://codeclimate.com",
    },
  },
  {
    delay: 2800,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "SNYK AGENT",
      agentColor: "#ef4444",
      message: "Extract features from homepage",
      detail: "23 feature mentions identified — OSS, container, IaC, SAST, SCA",
    },
  },
  {
    delay: 3050,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "SONARQUBE AGENT",
      agentColor: "#0284c7",
      message: "Navigate docs",
      url: "https://docs.sonarqube.org/latest/analyzing-source-code/",
    },
  },
  {
    delay: 3200,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "CODECLIMATE AGENT",
      agentColor: "#16a34a",
      message: "Extract features",
      detail: "15 mentions — maintainability, test coverage, velocity tracking",
    },
  },
  {
    delay: 3500,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "SNYK AGENT",
      agentColor: "#ef4444",
      message: "Navigate pricing page",
      url: "https://snyk.io/plans/",
    },
  },
  {
    delay: 3700,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "SONARQUBE AGENT",
      agentColor: "#0284c7",
      message: "Extract features",
      detail: "30+ language support. OWASP Top 10, CWE, CERT coverage.",
    },
  },
  {
    delay: 3900,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "SNYK AGENT",
      agentColor: "#ef4444",
      message: "Extract pricing",
      detail:
        "Free — Team $25/dev/mo — Business $82/dev/mo — Enterprise custom",
    },
  },
  {
    delay: 4100,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "CODECLIMATE AGENT",
      agentColor: "#16a34a",
      message: "Navigate pricing",
      url: "https://codeclimate.com/pricing",
    },
  },
  { delay: 4450, type: "competitor_status", id: "snyk", status: "done" },
  {
    delay: 4500,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "CODECLIMATE AGENT",
      agentColor: "#16a34a",
      message: "Extract pricing",
      detail: "Free OSS — Team $16/seat/mo — 100K+ customers",
    },
  },
  { delay: 4800, type: "competitor_status", id: "sonarqube", status: "done" },
  {
    delay: 5000,
    type: "competitor_status",
    id: "codeclimate",
    status: "done",
  },

  // --- Wave 2: DeepSource and GHAS ---
  {
    delay: 5100,
    type: "competitor_status",
    id: "deepsource",
    status: "analyzing",
  },
  { delay: 5150, type: "competitor_status", id: "ghas", status: "analyzing" },

  {
    delay: 5300,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "DEEPSOURCE AGENT",
      agentColor: "#0891b2",
      message: "Navigate",
      url: "https://deepsource.io",
    },
  },
  {
    delay: 5500,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "GHAS AGENT",
      agentColor: "#1f2937",
      message: "Navigate",
      url: "https://github.com/features/security",
    },
  },
  {
    delay: 5700,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "DEEPSOURCE AGENT",
      agentColor: "#0891b2",
      message: "Extract navigation",
      detail:
        "Found links: /autofix, /pricing, /docs, /blog/comparing-static-analysis",
    },
  },
  {
    delay: 5900,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "GHAS AGENT",
      agentColor: "#1f2937",
      message: "Extract features",
      detail:
        "Code scanning, secret scanning, Dependabot alerts — native GitHub integration",
    },
  },
  {
    delay: 6100,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "DEEPSOURCE AGENT",
      agentColor: "#0891b2",
      message: "Navigate → AutoFix feature page",
      url: "https://deepsource.io/autofix",
    },
  },
  {
    delay: 6300,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "GHAS AGENT",
      agentColor: "#1f2937",
      message: "Navigate pricing",
      url: "https://github.com/pricing",
    },
  },
  {
    delay: 6500,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "DEEPSOURCE AGENT",
      agentColor: "#0891b2",
      message: "Extract pricing",
      detail: "Free for OSS — Team $12/dev/mo — Enterprise custom",
    },
  },
  {
    delay: 6700,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "GHAS AGENT",
      agentColor: "#1f2937",
      message: "Extract pricing",
      detail:
        "Included with GitHub Advanced — Enterprise $21/user/mo additional",
    },
  },
  { delay: 7000, type: "competitor_status", id: "deepsource", status: "done" },
  { delay: 7200, type: "competitor_status", id: "ghas", status: "done" },

  // --- Wave 3: CodeScene, Qodana ---
  {
    delay: 7300,
    type: "competitor_status",
    id: "codescene",
    status: "analyzing",
  },
  { delay: 7350, type: "competitor_status", id: "qodana", status: "analyzing" },

  {
    delay: 7500,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "CODESCENE AGENT",
      agentColor: "#7c3aed",
      message: "Navigate",
      url: "https://codescene.io",
    },
  },
  {
    delay: 7700,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "QODANA AGENT",
      agentColor: "#db2777",
      message: "Navigate",
      url: "https://www.jetbrains.com/qodana",
    },
  },
  {
    delay: 7900,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "CODESCENE AGENT",
      agentColor: "#7c3aed",
      message: "Extract features",
      detail:
        "Behavioral code analysis, tech debt visualization, refactoring targets",
    },
  },
  {
    delay: 8100,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "QODANA AGENT",
      agentColor: "#db2777",
      message: "Extract features",
      detail:
        "40+ JetBrains code inspections, CI/CD integration, team quality profiles",
    },
  },
  {
    delay: 8300,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "CODESCENE AGENT",
      agentColor: "#7c3aed",
      message: "Navigate pricing",
      url: "https://codescene.io/pricing",
    },
  },
  {
    delay: 8500,
    type: "activity",
    payload: {
      kind: "navigate",
      agent: "QODANA AGENT",
      agentColor: "#db2777",
      message: "Navigate pricing",
      url: "https://www.jetbrains.com/qodana/buy/",
    },
  },
  {
    delay: 8700,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "CODESCENE AGENT",
      agentColor: "#7c3aed",
      message: "Extract pricing",
      detail: "Free — Business $150/dev/mo — Enterprise custom",
    },
  },
  {
    delay: 8900,
    type: "activity",
    payload: {
      kind: "extract",
      agent: "QODANA AGENT",
      agentColor: "#db2777",
      message: "Extract pricing",
      detail:
        "Free (community) — IDE plan $249/dev/yr — All products $779/dev/yr",
    },
  },
  {
    delay: 9200,
    type: "competitor_status",
    id: "codescene",
    status: "done",
  },
  { delay: 9400, type: "competitor_status", id: "qodana", status: "done" },
  { delay: 9600, type: "analysis_complete" },
];
