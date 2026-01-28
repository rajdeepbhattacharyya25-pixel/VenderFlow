import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";
import { CodeRabbitClient, AnalysisResult } from "./coderabbit-client.js";

dotenv.config();

const API_KEY = process.env.CODERABBIT_API_KEY;

if (!API_KEY) {
    console.error("Error: CODERABBIT_API_KEY environment variable is required.");
    process.exit(1);
}

const coderabbit = new CodeRabbitClient(API_KEY);

const server = new Server(
    {
        name: "coderabbit-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Helper to format error responses
function formatError(error: any): string {
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 401) {
            return "CRITICAL: Unauthorized - Invalid API key. Check your CODERABBIT_API_KEY.";
        }
        if (status === 429) {
            return "HIGH: Rate limited - Too many requests. Please wait before retrying.";
        }
        return `CodeRabbit API Error: ${status} - ${JSON.stringify(data)}`;
    }
    return `Error: ${error.message}`;
}

// List all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "coderabbit_generate_report",
                description: "Generate a code review report for a specified date range using CodeRabbit API. Reports can include developer activity, review trends, etc.",
                inputSchema: {
                    type: "object",
                    properties: {
                        from: {
                            type: "string",
                            description: "Start date in ISO 8601 format (YYYY-MM-DD)"
                        },
                        to: {
                            type: "string",
                            description: "End date in ISO 8601 format (YYYY-MM-DD)"
                        },
                        prompt: {
                            type: "string",
                            description: "Custom prompt for additional report information"
                        },
                        promptTemplate: {
                            type: "string",
                            enum: ["Daily Standup Report", "Sprint Report", "Weekly Summary"],
                            description: "Pre-defined report template"
                        },
                        groupBy: {
                            type: "string",
                            description: "Primary grouping for the report (e.g., 'developer', 'repository')"
                        },
                    },
                    required: ["from", "to"],
                },
            },
            {
                name: "coderabbit_analyze_code",
                description: "Perform static code analysis to detect security issues, code quality problems, and potential bugs",
                inputSchema: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "The code to analyze"
                        },
                        language: {
                            type: "string",
                            description: "Programming language (e.g., 'typescript', 'javascript', 'python')"
                        },
                        filename: {
                            type: "string",
                            description: "Optional filename for context"
                        },
                    },
                    required: ["code", "language"],
                },
            },
            {
                name: "coderabbit_analyze_dependencies",
                description: "Analyze package.json for dependency vulnerabilities, version conflicts, and best practices",
                inputSchema: {
                    type: "object",
                    properties: {
                        packageJson: {
                            type: "string",
                            description: "The package.json content as a string"
                        },
                    },
                    required: ["packageJson"],
                },
            },
            {
                name: "coderabbit_security_scan",
                description: "Perform a comprehensive security scan on code to identify injection risks, auth flaws, secrets exposure, and permission issues",
                inputSchema: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "The code to scan"
                        },
                        language: {
                            type: "string",
                            description: "Programming language"
                        },
                        context: {
                            type: "string",
                            enum: ["frontend", "backend", "api", "database", "infrastructure"],
                            description: "Code context for targeted scanning"
                        },
                    },
                    required: ["code", "language"],
                },
            },
            {
                name: "coderabbit_refactor_suggestions",
                description: "Get refactoring suggestions to improve code readability, performance, and maintainability",
                inputSchema: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "The code to analyze for refactoring"
                        },
                        language: {
                            type: "string",
                            description: "Programming language"
                        },
                        focus: {
                            type: "string",
                            enum: ["performance", "readability", "maintainability", "all"],
                            description: "Focus area for refactoring suggestions"
                        },
                    },
                    required: ["code", "language"],
                },
            },
            {
                name: "coderabbit_test_plan",
                description: "Generate a test plan for code including unit, integration, and test case suggestions",
                inputSchema: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "The code to generate tests for"
                        },
                        language: {
                            type: "string",
                            description: "Programming language"
                        },
                        testType: {
                            type: "string",
                            enum: ["unit", "integration", "e2e", "all"],
                            description: "Type of tests to generate"
                        },
                    },
                    required: ["code", "language"],
                },
            },
            {
                name: "coderabbit_health_check",
                description: "Get a system health summary with severity-ranked issues and root cause analysis",
                inputSchema: {
                    type: "object",
                    properties: {
                        code: {
                            type: "string",
                            description: "The code to check"
                        },
                        language: {
                            type: "string",
                            description: "Programming language"
                        },
                    },
                    required: ["code", "language"],
                },
            },
            {
                name: "coderabbit_deployment_checklist",
                description: "Generate a deployment checklist with safety verifications and rollback strategies",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectType: {
                            type: "string",
                            enum: ["web", "api", "microservice", "mobile", "serverless"],
                            description: "Type of project being deployed"
                        },
                        environment: {
                            type: "string",
                            enum: ["development", "staging", "production"],
                            description: "Target deployment environment"
                        },
                        changes: {
                            type: "string",
                            description: "Description of changes being deployed"
                        },
                    },
                    required: ["projectType", "environment"],
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;

        switch (name) {
            case "coderabbit_generate_report": {
                const { from, to, prompt, promptTemplate, groupBy } = args as {
                    from: string;
                    to: string;
                    prompt?: string;
                    promptTemplate?: string;
                    groupBy?: string;
                };

                const report = await coderabbit.generateReport({
                    from,
                    to,
                    prompt,
                    promptTemplate,
                    groupBy,
                });

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            status: "success",
                            report,
                            meta: {
                                dateRange: { from, to },
                                generatedAt: new Date().toISOString(),
                            },
                        }, null, 2),
                    }],
                };
            }

            case "coderabbit_analyze_code": {
                const { code, language, filename } = args as {
                    code: string;
                    language: string;
                    filename?: string;
                };

                const issues = coderabbit.analyzeCode(code, language);
                const humanReadable = coderabbit.formatAnalysisResults(issues);

                return {
                    content: [{
                        type: "text",
                        text: `# Code Analysis Results${filename ? ` for ${filename}` : ''}\n\n${humanReadable}\n\n## JSON Output\n\`\`\`json\n${JSON.stringify({ issues, count: issues.length, language }, null, 2)}\n\`\`\``,
                    }],
                };
            }

            case "coderabbit_analyze_dependencies": {
                const { packageJson } = args as { packageJson: string };

                const issues = coderabbit.analyzeDependencies(packageJson);
                const humanReadable = coderabbit.formatAnalysisResults(issues);

                return {
                    content: [{
                        type: "text",
                        text: `# Dependency Analysis Results\n\n${humanReadable}\n\n## JSON Output\n\`\`\`json\n${JSON.stringify({ issues, count: issues.length }, null, 2)}\n\`\`\``,
                    }],
                };
            }

            case "coderabbit_security_scan": {
                const { code, language, context } = args as {
                    code: string;
                    language: string;
                    context?: string;
                };

                const allIssues = coderabbit.analyzeCode(code, language);
                const securityIssues = allIssues.filter(i =>
                    i.type.startsWith('security/') ||
                    i.severity === 'CRITICAL' ||
                    i.severity === 'HIGH'
                );

                const summary = coderabbit.generateHealthSummary(securityIssues);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            securityScan: {
                                status: summary.status,
                                context: context || 'general',
                                findings: securityIssues,
                                summary: {
                                    critical: securityIssues.filter(i => i.severity === 'CRITICAL').length,
                                    high: securityIssues.filter(i => i.severity === 'HIGH').length,
                                    medium: securityIssues.filter(i => i.severity === 'MEDIUM').length,
                                },
                                timestamp: summary.timestamp,
                            },
                        }, null, 2),
                    }],
                };
            }

            case "coderabbit_refactor_suggestions": {
                const { code, language, focus = 'all' } = args as {
                    code: string;
                    language: string;
                    focus?: string;
                };

                const lines = code.split('\n');
                const suggestions: Array<{
                    type: string;
                    line?: number;
                    current: string;
                    suggested: string;
                    reason: string;
                }> = [];

                lines.forEach((line, index) => {
                    // Long lines
                    if (line.length > 120) {
                        suggestions.push({
                            type: 'readability',
                            line: index + 1,
                            current: line.substring(0, 50) + '...',
                            suggested: 'Break into multiple lines',
                            reason: 'Lines over 120 characters reduce readability',
                        });
                    }

                    // Nested ternary
                    if ((line.match(/\?/g) || []).length > 1) {
                        suggestions.push({
                            type: 'readability',
                            line: index + 1,
                            current: line.trim().substring(0, 50),
                            suggested: 'Use if-else or extract to function',
                            reason: 'Nested ternaries are hard to read',
                        });
                    }

                    // Magic numbers
                    if (/[^0-9a-zA-Z_](?:[-]?\d+\.?\d*)[^0-9a-zA-Z_]/.test(line) &&
                        !/const|let|var|=/.test(line) &&
                        !/0|1|2/.test(line.match(/\d+/)?.[0] || '999')) {
                        suggestions.push({
                            type: 'maintainability',
                            line: index + 1,
                            current: line.trim(),
                            suggested: 'Extract magic number to named constant',
                            reason: 'Magic numbers reduce code clarity',
                        });
                    }
                });

                const filteredSuggestions = focus === 'all'
                    ? suggestions
                    : suggestions.filter(s => s.type === focus);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            refactoringSuggestions: {
                                focus,
                                count: filteredSuggestions.length,
                                suggestions: filteredSuggestions,
                            },
                        }, null, 2),
                    }],
                };
            }

            case "coderabbit_test_plan": {
                const { code, language, testType = 'all' } = args as {
                    code: string;
                    language: string;
                    testType?: string;
                };

                // Extract function/method names for test suggestions
                const functionPattern = /(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:=\s*)?function\s*\([^)]*\)|\([^)]*\)\s*{)/g;
                const classPattern = /class\s+(\w+)/g;

                const functions: string[] = [];
                const classes: string[] = [];

                let match;
                while ((match = functionPattern.exec(code)) !== null) {
                    functions.push(match[1]);
                }
                while ((match = classPattern.exec(code)) !== null) {
                    classes.push(match[1]);
                }

                const testPlan = {
                    language,
                    testType,
                    unitTests: testType === 'all' || testType === 'unit' ? {
                        description: 'Unit tests for isolated function behavior',
                        targets: functions.map(fn => ({
                            function: fn,
                            testCases: [
                                `should handle valid input correctly`,
                                `should handle edge cases (null, undefined, empty)`,
                                `should throw appropriate errors for invalid input`,
                            ],
                        })),
                    } : undefined,
                    integrationTests: testType === 'all' || testType === 'integration' ? {
                        description: 'Integration tests for component interactions',
                        targets: classes.map(cls => ({
                            class: cls,
                            testCases: [
                                `should initialize correctly`,
                                `should interact with dependencies as expected`,
                                `should handle state changes properly`,
                            ],
                        })),
                    } : undefined,
                    e2eTests: testType === 'all' || testType === 'e2e' ? {
                        description: 'End-to-end tests for complete user flows',
                        recommendations: [
                            'Test happy path scenarios',
                            'Test error recovery flows',
                            'Test authentication/authorization flows',
                            'Test data persistence across sessions',
                        ],
                    } : undefined,
                    recommendations: {
                        framework: language.includes('typescript') || language.includes('javascript')
                            ? 'Jest or Vitest for unit/integration, Playwright for E2E'
                            : 'Use language-appropriate testing framework',
                        coverage: 'Aim for 80%+ line coverage on critical paths',
                        mocking: 'Mock external dependencies and API calls',
                    },
                };

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ testPlan }, null, 2),
                    }],
                };
            }

            case "coderabbit_health_check": {
                const { code, language } = args as {
                    code: string;
                    language: string;
                };

                const issues = coderabbit.analyzeCode(code, language);
                const summary = coderabbit.generateHealthSummary(issues);

                const severityCounts = {
                    CRITICAL: issues.filter(i => i.severity === 'CRITICAL').length,
                    HIGH: issues.filter(i => i.severity === 'HIGH').length,
                    MEDIUM: issues.filter(i => i.severity === 'MEDIUM').length,
                    LOW: issues.filter(i => i.severity === 'LOW').length,
                    INFO: issues.filter(i => i.severity === 'INFO').length,
                };

                const humanReadable = `
# System Health Summary

**Status**: ${summary.status.toUpperCase()} ${summary.status === 'healthy' ? '✅' : summary.status === 'warning' ? '⚠️' : '🔴'}
**Timestamp**: ${summary.timestamp}

## Issue Breakdown
- 🔴 Critical: ${severityCounts.CRITICAL}
- 🟠 High: ${severityCounts.HIGH}
- 🟡 Medium: ${severityCounts.MEDIUM}
- 🔵 Low: ${severityCounts.LOW}
- ℹ️ Info: ${severityCounts.INFO}

## Detailed Findings
${coderabbit.formatAnalysisResults(issues)}
`;

                return {
                    content: [{
                        type: "text",
                        text: humanReadable + `\n\n## JSON Output\n\`\`\`json\n${JSON.stringify({ summary, severityCounts, issues }, null, 2)}\n\`\`\``,
                    }],
                };
            }

            case "coderabbit_deployment_checklist": {
                const { projectType, environment, changes } = args as {
                    projectType: string;
                    environment: string;
                    changes?: string;
                };

                const isProduction = environment === 'production';

                const checklist = {
                    projectType,
                    environment,
                    changes: changes || 'Not specified',
                    preDeployment: [
                        { item: 'All tests passing', required: true },
                        { item: 'Code review approved', required: true },
                        { item: 'Security scan completed', required: isProduction },
                        { item: 'Performance tested', required: isProduction },
                        { item: 'Documentation updated', required: false },
                        { item: 'Database migrations tested', required: true },
                        { item: 'Environment variables verified', required: true },
                        { item: 'Secrets rotated if needed', required: isProduction },
                    ],
                    deployment: [
                        { item: 'Backup current state', required: isProduction },
                        { item: 'Enable maintenance mode (if applicable)', required: false },
                        { item: 'Deploy to staging first', required: isProduction },
                        { item: 'Run smoke tests', required: true },
                        { item: 'Monitor logs during rollout', required: true },
                    ],
                    postDeployment: [
                        { item: 'Verify health endpoints', required: true },
                        { item: 'Check error rates in monitoring', required: true },
                        { item: 'Test critical user paths', required: true },
                        { item: 'Notify stakeholders', required: isProduction },
                        { item: 'Update status page if applicable', required: false },
                    ],
                    rollbackPlan: {
                        strategy: isProduction ? 'Blue-green deployment with instant rollback' : 'Revert to previous deployment',
                        steps: [
                            'Identify failure criteria',
                            'Trigger rollback procedure',
                            'Verify rollback success',
                            'Document incident',
                            'Post-mortem analysis',
                        ],
                        timeLimit: isProduction ? '5 minutes' : '15 minutes',
                    },
                    warnings: isProduction ? [
                        '⚠️ Production deployment - extra caution required',
                        '⚠️ Ensure on-call team is notified',
                        '⚠️ Have rollback ready before proceeding',
                    ] : [],
                };

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ deploymentChecklist: checklist }, null, 2),
                    }],
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [{ type: "text", text: formatError(error) }],
            isError: true,
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("CodeRabbit MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
