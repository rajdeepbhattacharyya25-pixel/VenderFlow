import axios from 'axios';
export class CodeRabbitClient {
    client;
    constructor(apiKey) {
        this.client = axios.create({
            baseURL: 'https://api.coderabbit.ai',
            headers: {
                'x-coderabbitai-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            timeout: 600000, // 10 minutes for report generation
        });
    }
    /**
     * Generate a report using CodeRabbit API
     */
    async generateReport(params) {
        const response = await this.client.post('/v1/report.generate', {
            from: params.from,
            to: params.to,
            prompt: params.prompt,
            promptTemplate: params.promptTemplate,
            groupBy: params.groupBy,
            parameters: params.parameters,
        });
        return response.data;
    }
    /**
     * Analyze code for issues (static analysis simulation)
     */
    analyzeCode(code, language) {
        const issues = [];
        const lines = code.split('\n');
        // Pattern-based static analysis
        lines.forEach((line, index) => {
            const lineNum = index + 1;
            // Security: Detect hardcoded secrets
            if (/(?:password|secret|api_?key|token)\s*[:=]\s*['"][^'"]+['"]/i.test(line)) {
                issues.push({
                    severity: 'CRITICAL',
                    type: 'security/hardcoded-secret',
                    message: 'Potential hardcoded secret detected',
                    line: lineNum,
                    suggestion: 'Use environment variables for sensitive data',
                });
            }
            // Security: SQL Injection risk
            if (/(?:query|exec|execute)\s*\(.*\+.*\)|`.*\$\{/i.test(line) && /(?:select|insert|update|delete|drop)/i.test(line)) {
                issues.push({
                    severity: 'HIGH',
                    type: 'security/sql-injection',
                    message: 'Potential SQL injection vulnerability',
                    line: lineNum,
                    suggestion: 'Use parameterized queries or prepared statements',
                });
            }
            // Performance: Console.log in production code
            if (/console\.(log|debug|info)\s*\(/i.test(line)) {
                issues.push({
                    severity: 'LOW',
                    type: 'performance/console-log',
                    message: 'Console statement found - remove for production',
                    line: lineNum,
                    suggestion: 'Use a proper logging library with log levels',
                });
            }
            // Code quality: TODO/FIXME comments
            if (/\/\/\s*(TODO|FIXME|HACK|XXX)/i.test(line)) {
                issues.push({
                    severity: 'INFO',
                    type: 'quality/todo-comment',
                    message: 'TODO/FIXME comment found',
                    line: lineNum,
                    suggestion: 'Address or create a ticket for this item',
                });
            }
            // Security: eval usage
            if (/\beval\s*\(/i.test(line)) {
                issues.push({
                    severity: 'CRITICAL',
                    type: 'security/eval-usage',
                    message: 'Usage of eval() detected - security risk',
                    line: lineNum,
                    suggestion: 'Avoid eval() - use safer alternatives like JSON.parse()',
                });
            }
            // Error handling: Empty catch blocks
            if (/catch\s*\([^)]*\)\s*\{\s*\}/i.test(line)) {
                issues.push({
                    severity: 'MEDIUM',
                    type: 'error-handling/empty-catch',
                    message: 'Empty catch block - errors are silently ignored',
                    line: lineNum,
                    suggestion: 'Log or handle the error appropriately',
                });
            }
            // TypeScript/JavaScript: Any type usage
            if (/:?\s*any\b/i.test(line) && language.includes('typescript')) {
                issues.push({
                    severity: 'LOW',
                    type: 'typescript/no-any',
                    message: 'Usage of "any" type reduces type safety',
                    line: lineNum,
                    suggestion: 'Use specific types or generics instead',
                });
            }
            // Memory: Potential memory leak patterns
            if (/addEventListener|setInterval|setTimeout/i.test(line) && !/removeEventListener|clearInterval|clearTimeout/i.test(code)) {
                issues.push({
                    severity: 'MEDIUM',
                    type: 'memory/potential-leak',
                    message: 'Event listener or timer without cleanup',
                    line: lineNum,
                    suggestion: 'Ensure cleanup in component unmount or destructor',
                });
            }
        });
        return issues;
    }
    /**
     * Analyze dependencies for vulnerabilities
     */
    analyzeDependencies(packageJson) {
        const issues = [];
        try {
            const pkg = JSON.parse(packageJson);
            const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
            // Check for known problematic patterns
            for (const [name, version] of Object.entries(allDeps)) {
                const ver = version;
                // Check for wildcard versions
                if (ver === '*' || ver === 'latest') {
                    issues.push({
                        severity: 'HIGH',
                        type: 'dependency/unpinned-version',
                        message: `Unpinned version for "${name}": ${ver}`,
                        suggestion: 'Pin to a specific version for reproducible builds',
                    });
                }
                // Check for git dependencies
                if (ver.includes('git') || ver.includes('github')) {
                    issues.push({
                        severity: 'MEDIUM',
                        type: 'dependency/git-dependency',
                        message: `Git dependency for "${name}": ${ver}`,
                        suggestion: 'Prefer published npm packages for stability',
                    });
                }
                // Check for file dependencies
                if (ver.startsWith('file:')) {
                    issues.push({
                        severity: 'MEDIUM',
                        type: 'dependency/file-dependency',
                        message: `File dependency for "${name}": ${ver}`,
                        suggestion: 'Consider publishing to npm or using workspaces',
                    });
                }
            }
            // Check for missing important fields
            if (!pkg.name) {
                issues.push({
                    severity: 'LOW',
                    type: 'package/missing-name',
                    message: 'Package name is missing',
                    suggestion: 'Add a "name" field to package.json',
                });
            }
            if (!pkg.version) {
                issues.push({
                    severity: 'LOW',
                    type: 'package/missing-version',
                    message: 'Package version is missing',
                    suggestion: 'Add a "version" field to package.json',
                });
            }
            if (!pkg.license) {
                issues.push({
                    severity: 'INFO',
                    type: 'package/missing-license',
                    message: 'License is not specified',
                    suggestion: 'Add a "license" field to package.json',
                });
            }
        }
        catch (error) {
            issues.push({
                severity: 'HIGH',
                type: 'package/invalid-json',
                message: 'Invalid package.json format',
                suggestion: 'Ensure package.json is valid JSON',
            });
        }
        return issues;
    }
    /**
     * Generate system health summary
     */
    generateHealthSummary(issues) {
        const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
        const highCount = issues.filter(i => i.severity === 'HIGH').length;
        let status = 'healthy';
        if (criticalCount > 0) {
            status = 'critical';
        }
        else if (highCount > 0) {
            status = 'warning';
        }
        return {
            status,
            issues,
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Format analysis results for human-readable output
     */
    formatAnalysisResults(issues) {
        if (issues.length === 0) {
            return '✅ No issues found';
        }
        const grouped = issues.reduce((acc, issue) => {
            if (!acc[issue.severity])
                acc[issue.severity] = [];
            acc[issue.severity].push(issue);
            return acc;
        }, {});
        const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
        const severityIcons = {
            CRITICAL: '🔴',
            HIGH: '🟠',
            MEDIUM: '🟡',
            LOW: '🔵',
            INFO: 'ℹ️',
        };
        let output = `Found ${issues.length} issue(s):\n\n`;
        for (const severity of severityOrder) {
            if (grouped[severity]) {
                output += `${severityIcons[severity]} ${severity} (${grouped[severity].length}):\n`;
                for (const issue of grouped[severity]) {
                    output += `  • [${issue.type}] ${issue.message}`;
                    if (issue.line)
                        output += ` (line ${issue.line})`;
                    output += '\n';
                    if (issue.suggestion) {
                        output += `    💡 ${issue.suggestion}\n`;
                    }
                }
                output += '\n';
            }
        }
        return output;
    }
}
