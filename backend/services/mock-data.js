/**
 * Centralized mock data service
 *
 * This module serves as the single source of truth for mock data during development.
 * When USE_MOCK_DATA=true in config, the backend will return this data instead of
 * executing real LLM analysis.
 *
 * To switch to production:
 * 1. Set USE_MOCK_DATA=false in backend/.env
 * 2. Configure your LLM API keys
 * 3. No code changes needed - endpoints remain the same
 */

export const mockCodebaseAnalysis = {
  timestamp: new Date().toISOString(),
  summary:
    "AeroHub is a ground handling management platform that coordinates aircraft turnaround operations, crew scheduling, fueling, maintenance, and cargo handling at airports.",
  domains: [
    {
      id: "aircraft-turnaround",
      name: "Aircraft Turnaround",
      businessPurpose:
        "Coordinates all ground operations during aircraft turnaround from arrival to departure.",
      files: [
        "backend/services/turnaround/orchestrator.js",
        "backend/services/turnaround/timeline.js",
        "backend/services/turnaround/tasks.js",
        "backend/models/turnaround.js",
      ],
      priority: "P0",
      testCoverage: "72%",
      hasAnalysis: true,
    },
    {
      id: "crew-scheduling",
      name: "Crew Scheduling",
      businessPurpose:
        "Manages ground crew shifts, assignments, certifications, and availability tracking.",
      files: [
        "backend/services/crew/scheduler.js",
        "backend/services/crew/assignments.js",
        "backend/services/crew/certifications.js",
        "backend/models/crew-member.js",
      ],
      priority: "P0",
      testCoverage: "58%",
      hasAnalysis: true,
    },
    {
      id: "fueling-operations",
      name: "Fueling Operations",
      businessPurpose:
        "Tracks fuel delivery, quality checks, defueling, and generates billing records.",
      files: [
        "frontend/src/pages/FuelingDashboard.jsx",
        "frontend/src/components/fueling/FuelRequest.jsx",
        "frontend/src/store/fuelingStore.js",
        "backend/services/fueling/delivery.js",
        "backend/services/fueling/quality-control.js",
      ],
      priority: "P1",
      testCoverage: "45%",
      hasAnalysis: true,
    },
    {
      id: "maintenance-tracking",
      name: "Maintenance Tracking",
      businessPurpose:
        "Schedules preventive maintenance, tracks work orders, and ensures compliance with aviation regulations.",
      files: [
        "backend/services/maintenance/work-orders.js",
        "backend/services/maintenance/compliance.js",
        "backend/models/maintenance-record.js",
      ],
      priority: "P0",
      testCoverage: "35%",
      hasAnalysis: true,
    },
    {
      id: "cargo-baggage",
      name: "Cargo & Baggage",
      businessPurpose:
        "Manages cargo loading plans, baggage handling, weight distribution, and hazmat compliance.",
      files: [
        "backend/services/cargo/loading-plan.js",
        "backend/services/cargo/weight-balance.js",
        "backend/services/baggage/handler.js",
      ],
      priority: "P1",
      testCoverage: "51%",
      hasAnalysis: false,
    },
  ],
};

export const mockDomainAnalyses = {
  "aircraft-turnaround": {
    domainId: "aircraft-turnaround",
    domainName: "Aircraft Turnaround",
    timestamp: new Date().toISOString(),
    documentation: {
      businessPurpose: `# Aircraft Turnaround Operations

Coordinates all ground operations during aircraft turnaround from arrival to departure.

## Core Responsibilities

- Manage turnaround timeline and task dependencies
- Coordinate multiple teams (fueling, cleaning, catering, maintenance)
- Track critical path activities to prevent departure delays
- Generate turnaround reports and performance metrics

## Why it matters

Aircraft turnaround time directly impacts airline profitability and operational efficiency. Every minute saved translates to better on-time performance and reduced operational costs.

## Key Components

### Orchestrator (\`orchestrator.js\`)
Main controller that coordinates all turnaround activities and ensures proper sequencing.

### Timeline Manager (\`timeline.js\`)
Tracks scheduled vs actual timing for each turnaround phase.

### Task Coordinator (\`tasks.js\`)
Manages individual ground handling tasks and their dependencies.`,
    },
    requirements: [
      {
        id: "REQ-001",
        description:
          "The system must track arrival time, scheduled departure time, and actual departure time for each turnaround.",
        source: "backend/services/turnaround/timeline.js",
        confidence: "HIGH",
        priority: "P0",
      },
      {
        id: "REQ-002",
        description:
          "When a critical task is delayed, the system should automatically recalculate the estimated departure time.",
        source: "backend/services/turnaround/orchestrator.js",
        confidence: "HIGH",
        priority: "P0",
      },
      {
        id: "REQ-003",
        description:
          "The platform should send alerts when turnaround is at risk of missing scheduled departure.",
        source: "backend/services/turnaround/orchestrator.js",
        confidence: "MEDIUM",
        priority: "P0",
      },
      {
        id: "REQ-004",
        description:
          "Task dependencies must be enforced - e.g., fueling cannot start until fire safety check is complete.",
        source: "backend/services/turnaround/tasks.js",
        confidence: "HIGH",
        priority: "P0",
      },
    ],
    testing: {
      currentCoverage: {
        overall: "72%",
        statements: "75%",
        branches: "68%",
        functions: "72%",
        lines: "74%",
      },
      existingTests: [
        {
          file: "backend/services/turnaround/orchestrator.test.js",
          testsCount: 12,
          passRate: "100%",
          lastRun: new Date().toISOString(),
        },
        {
          file: "backend/services/turnaround/timeline.test.js",
          testsCount: 8,
          passRate: "100%",
          lastRun: new Date().toISOString(),
        },
      ],
      missingTests: {
        unit: [
          {
            id: "MISS-U-001",
            description:
              "Test timeline recalculation logic with various delay scenarios",
            priority: "P0",
            estimatedEffort: "Low",
            suggestedTestFile: "backend/services/turnaround/timeline.test.js",
          },
          {
            id: "MISS-U-002",
            description: "Test task dependency validation rules",
            priority: "P0",
            estimatedEffort: "Low",
            suggestedTestFile: "backend/services/turnaround/tasks.test.js",
          },
          {
            id: "MISS-U-003",
            description: "Test alert threshold calculations",
            priority: "P1",
            estimatedEffort: "Low",
            suggestedTestFile:
              "backend/services/turnaround/orchestrator.test.js",
          },
        ],
        integration: [
          {
            id: "MISS-I-001",
            description:
              "Test full turnaround lifecycle from arrival to departure",
            priority: "P0",
            estimatedEffort: "Medium",
            suggestedTestFile:
              "backend/services/turnaround/orchestrator.test.js",
          },
          {
            id: "MISS-I-002",
            description:
              "Test handling of emergency maintenance during turnaround",
            priority: "P1",
            estimatedEffort: "Medium",
            suggestedTestFile:
              "backend/services/turnaround/integration.test.js",
          },
          {
            id: "MISS-I-003",
            description: "Test task coordination between multiple teams",
            priority: "P1",
            estimatedEffort: "Medium",
            suggestedTestFile:
              "backend/services/turnaround/integration.test.js",
          },
        ],
        e2e: [
          {
            id: "MISS-E-001",
            description:
              "Test concurrent turnarounds don't interfere with each other",
            priority: "P0",
            estimatedEffort: "High",
            suggestedTestFile: "e2e/turnaround/concurrent-operations.test.js",
          },
          {
            id: "MISS-E-002",
            description: "Test complete turnaround flow with real-time updates",
            priority: "P1",
            estimatedEffort: "High",
            suggestedTestFile: "e2e/turnaround/full-flow.test.js",
          },
        ],
      },
      recommendations: [
        "Add integration tests for full turnaround lifecycle",
        "Add performance tests for high-traffic airport scenarios",
        "Test task dependency edge cases (circular dependencies, missing prerequisites)",
        "Add stress tests for system behavior during irregular operations",
      ],
    },
    tests: [
      {
        id: "TEST-001",
        scenario:
          "Turnaround orchestrator creates timeline on aircraft arrival",
        type: "integration",
        priority: "P0",
        testFile: "backend/services/turnaround/orchestrator.test.js",
      },
      {
        id: "TEST-002",
        scenario:
          "Timeline recalculation triggers when critical task is delayed",
        type: "unit",
        priority: "P0",
        testFile: "backend/services/turnaround/timeline.test.js",
      },
      {
        id: "TEST-003",
        scenario: "Task dependency validation prevents out-of-order execution",
        type: "unit",
        priority: "P0",
        testFile: "backend/services/turnaround/tasks.test.js",
      },
    ],
  },
  "crew-scheduling": {
    domainId: "crew-scheduling",
    domainName: "Crew Scheduling",
    timestamp: new Date().toISOString(),
    documentation: {
      businessPurpose: `# Crew Scheduling & Management

Manages ground crew shifts, assignments, certifications, and availability tracking.

## Core Responsibilities

- Schedule crew shifts based on flight schedules and workload
- Assign qualified crew members to specific tasks
- Track certifications and ensure compliance with safety regulations
- Manage crew availability and time-off requests

## Compliance Requirements

All crew members must:
- Hold valid certifications for their assigned tasks
- Not exceed maximum working hours per shift/week
- Have required rest periods between shifts
- Undergo regular safety training updates`,
    },
    requirements: [
      {
        id: "REQ-001",
        description:
          "Crew members can only be assigned to tasks matching their active certifications.",
        source: "backend/services/crew/assignments.js",
        confidence: "HIGH",
        priority: "P0",
      },
      {
        id: "REQ-002",
        description:
          "The system must prevent scheduling crew members beyond maximum working hours regulations.",
        source: "backend/services/crew/scheduler.js",
        confidence: "HIGH",
        priority: "P0",
      },
      {
        id: "REQ-003",
        description:
          "When certifications are about to expire (within 30 days), the system should alert crew managers.",
        source: "backend/services/crew/certifications.js",
        confidence: "HIGH",
        priority: "P1",
      },
    ],
    testing: {
      currentCoverage: {
        overall: "58%",
        statements: "62%",
        branches: "52%",
        functions: "60%",
        lines: "58%",
      },
      existingTests: [
        {
          file: "backend/services/crew/scheduler.test.js",
          testsCount: 6,
          passRate: "100%",
          lastRun: new Date().toISOString(),
        },
      ],
      missingTests: {
        unit: [
          {
            id: "MISS-U-001",
            description: "Test certification validation logic",
            priority: "P0",
            estimatedEffort: "Low",
            suggestedTestFile: "backend/services/crew/certifications.test.js",
          },
          {
            id: "MISS-U-002",
            description: "Test maximum working hours calculation",
            priority: "P0",
            estimatedEffort: "Low",
            suggestedTestFile: "backend/services/crew/scheduler.test.js",
          },
          {
            id: "MISS-U-003",
            description: "Test expiration alert generation logic",
            priority: "P1",
            estimatedEffort: "Low",
            suggestedTestFile: "backend/services/crew/certifications.test.js",
          },
        ],
        integration: [
          {
            id: "MISS-I-001",
            description: "Test certification validation before task assignment",
            priority: "P0",
            estimatedEffort: "Medium",
            suggestedTestFile: "backend/services/crew/assignments.test.js",
          },
          {
            id: "MISS-I-002",
            description: "Test shift scheduling with availability conflicts",
            priority: "P1",
            estimatedEffort: "Medium",
            suggestedTestFile: "backend/services/crew/scheduler.test.js",
          },
        ],
        e2e: [
          {
            id: "MISS-E-001",
            description:
              "Test complete crew assignment flow from scheduling to task completion",
            priority: "P1",
            estimatedEffort: "High",
            suggestedTestFile: "e2e/crew/assignment-flow.test.js",
          },
        ],
      },
      recommendations: [
        "Add compliance audit tests for regulatory violations",
        "Add scenario tests for crew shortage situations",
        "Test time-off request conflicts with scheduled shifts",
      ],
    },
    tests: [],
  },
  "fueling-operations": {
    domainId: "fueling-operations",
    domainName: "Fueling Operations",
    timestamp: new Date().toISOString(),
    documentation: {
      businessPurpose: `# Fueling Operations

Tracks fuel delivery, quality checks, defueling, and generates billing records for aircraft refueling services.

## Core Responsibilities

- Manage fuel delivery requests and scheduling
- Perform quality control checks on fuel samples
- Track fuel quantities and generate billing
- Handle defueling operations when needed
- Ensure compliance with safety protocols

## Safety Critical

Fueling operations are safety-critical and require:
- Proper grounding procedures
- Quality verification before delivery
- Real-time monitoring during fueling
- Emergency stop capabilities

## Key Components

### Delivery Service (\`delivery.js\`)
Manages fuel delivery scheduling, quantity tracking, and delivery completion.

### Quality Control (\`quality-control.js\`)
Handles fuel sample testing, quality verification, and compliance checks.`,
    },
    requirements: [
      {
        id: "REQ-001",
        description:
          "All fuel deliveries must have a quality check performed before delivery begins.",
        source: "backend/services/fueling/delivery.js",
        confidence: "HIGH",
        priority: "P0",
      },
      {
        id: "REQ-002",
        description:
          "The system must track fuel quantities delivered and generate billing records automatically.",
        source: "backend/services/fueling/delivery.js",
        confidence: "HIGH",
        priority: "P0",
      },
      {
        id: "REQ-003",
        description:
          "If fuel quality test fails, delivery must be blocked and alerts sent to operations.",
        source: "backend/services/fueling/quality-control.js",
        confidence: "HIGH",
        priority: "P0",
      },
      {
        id: "REQ-004",
        description:
          "Defueling operations must track removed fuel quantity separately for disposal or reuse.",
        source: "backend/services/fueling/delivery.js",
        confidence: "MEDIUM",
        priority: "P1",
      },
    ],
    testing: {
      currentCoverage: {
        overall: "45%",
        statements: "48%",
        branches: "40%",
        functions: "44%",
        lines: "46%",
      },
      existingTests: [
        {
          file: "backend/services/fueling/delivery.test.js",
          testsCount: 5,
          passRate: "100%",
          lastRun: new Date().toISOString(),
        },
      ],
      missingTests: {
        unit: [
          {
            id: "MISS-U-001",
            description:
              "Test fuel quality validation logic with different contamination levels",
            priority: "P0",
            estimatedEffort: "Low",
            suggestedTestFile:
              "backend/services/fueling/quality-control.test.js",
          },
          {
            id: "MISS-U-002",
            description:
              "Test billing calculation for various fuel quantities and rates",
            priority: "P0",
            estimatedEffort: "Low",
            suggestedTestFile: "backend/services/fueling/delivery.test.js",
          },
          {
            id: "MISS-U-003",
            description:
              "Test emergency stop functionality during active fueling",
            priority: "P0",
            estimatedEffort: "Medium",
            suggestedTestFile: "backend/services/fueling/delivery.test.js",
          },
          {
            id: "MISS-U-004",
            description: "Test defuel quantity tracking and disposal records",
            priority: "P1",
            estimatedEffort: "Low",
            suggestedTestFile: "backend/services/fueling/delivery.test.js",
          },
        ],
        integration: [
          {
            id: "MISS-I-001",
            description: "Test delivery blocked when quality check fails",
            priority: "P0",
            estimatedEffort: "Medium",
            suggestedTestFile: "backend/services/fueling/integration.test.js",
          },
          {
            id: "MISS-I-002",
            description: "Test alert system when fuel quality issues detected",
            priority: "P0",
            estimatedEffort: "Medium",
            suggestedTestFile: "backend/services/fueling/integration.test.js",
          },
          {
            id: "MISS-I-003",
            description: "Test concurrent fueling requests prioritization",
            priority: "P1",
            estimatedEffort: "High",
            suggestedTestFile: "backend/services/fueling/integration.test.js",
          },
        ],
        e2e: [
          {
            id: "MISS-E-001",
            description:
              "Test complete fueling workflow from request to billing",
            priority: "P0",
            estimatedEffort: "High",
            suggestedTestFile: "e2e/fueling/complete-delivery.test.js",
          },
          {
            id: "MISS-E-002",
            description:
              "Test emergency scenarios during active fueling operations",
            priority: "P0",
            estimatedEffort: "High",
            suggestedTestFile: "e2e/fueling/emergency-handling.test.js",
          },
        ],
      },
      recommendations: [
        "Add load testing for concurrent fueling operations",
        "Test edge cases for fuel quantity limits",
        "Add security tests for unauthorized delivery attempts",
      ],
    },
    tests: [],
  },
};

/**
 * Get mock codebase analysis
 */
export function getMockCodebaseAnalysis() {
  return {
    ...mockCodebaseAnalysis,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get mock domain analysis by ID
 */
export function getMockDomainAnalysis(domainId) {
  const analysis = mockDomainAnalyses[domainId];
  if (!analysis) {
    return null;
  }

  return {
    ...analysis,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get mock domain documentation section
 */
export function getMockDomainDocumentation(domainId) {
  const analysis = mockDomainAnalyses[domainId];
  if (!analysis) {
    return null;
  }

  return {
    domainId,
    domainName: analysis.domainName,
    timestamp: new Date().toISOString(),
    documentation: analysis.documentation,
  };
}

/**
 * Get mock domain requirements section
 */
export function getMockDomainRequirements(domainId) {
  const analysis = mockDomainAnalyses[domainId];
  if (!analysis) {
    return null;
  }

  return {
    domainId,
    domainName: analysis.domainName,
    timestamp: new Date().toISOString(),
    requirements: analysis.requirements,
  };
}

/**
 * Get mock domain testing section
 */
export function getMockDomainTesting(domainId) {
  const analysis = mockDomainAnalyses[domainId];
  if (!analysis) {
    return null;
  }

  return {
    domainId,
    domainName: analysis.domainName,
    timestamp: new Date().toISOString(),
    testing: analysis.testing,
  };
}

/**
 * Simulate async analysis task delay
 */
export async function simulateAnalysisDelay(ms = 2000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
