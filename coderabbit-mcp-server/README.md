# CodeRabbit MCP Server

AI-powered code review and debugging MCP server using CodeRabbit API.

## Features

| Tool | Description |
|------|-------------|
| `coderabbit_generate_report` | Generate code review reports for date ranges |
| `coderabbit_analyze_code` | Static code analysis for bugs and issues |
| `coderabbit_analyze_dependencies` | Scan package.json for vulnerabilities |
| `coderabbit_security_scan` | Security-focused code scanning |
| `coderabbit_refactor_suggestions` | Get refactoring recommendations |
| `coderabbit_test_plan` | Generate test plans for code |
| `coderabbit_health_check` | System health summary with severity ranking |
| `coderabbit_deployment_checklist` | Deployment safety checklists |

## Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

## Environment Variables

Create `.env` file:

```
CODERABBIT_API_KEY=your-api-key
```

## Claude Desktop Config

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "coderabbit": {
      "command": "node",
      "args": ["C:/Users/ASUS/Downloads/e-commerce-landing-page/coderabbit-mcp-server/build/index.js"],
      "env": {
        "CODERABBIT_API_KEY": "cr-196f2325620724f2a5a013d1b8ac346b0e84411052d5c72008282cd8f0"
      }
    }
  }
}
```

## Severity Levels

- 🔴 **CRITICAL** - Security vulnerabilities, data exposure
- 🟠 **HIGH** - Major bugs, performance issues
- 🟡 **MEDIUM** - Code quality concerns
- 🔵 **LOW** - Minor improvements
- ℹ️ **INFO** - Informational notes
