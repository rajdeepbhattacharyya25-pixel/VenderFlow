import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { VercelClient } from "./vercel-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const API_TOKEN = process.env.VERCEL_API_TOKEN;

if (!API_TOKEN) {
    console.error("Error: VERCEL_API_TOKEN environment variable is required.");
    process.exit(1);
}

const vercel = new VercelClient(API_TOKEN);

const server = new Server(
    {
        name: "vercel-mcp-server",
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
        return `Vercel API Error: ${error.response?.status} - ${JSON.stringify(
            error.response?.data
        )}`;
    }
    return `Error: ${error.message}`;
}

import axios from "axios";

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "vercel_list_projects",
                description: "List projects",
                inputSchema: {
                    type: "object",
                    properties: {
                        search: { type: "string", description: "Search query" },
                    },
                },
            },
            {
                name: "vercel_create_project",
                description: "Create project",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        gitRepository: {
                            type: "object",
                            properties: {
                                type: { type: "string", enum: ["github", "gitlab", "bitbucket"] },
                                repo: { type: "string" },
                            },
                        },
                    },
                    required: ["name"],
                },
            },
            {
                name: "vercel_delete_project",
                description: "Delete project",
                inputSchema: {
                    type: "object",
                    properties: {
                        idOrName: { type: "string" },
                    },
                    required: ["idOrName"],
                },
            },
            {
                name: "vercel_list_deployments",
                description: "List deployments",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        limit: { type: "number" },
                    },
                },
            },
            {
                name: "vercel_get_deployment",
                description: "Get deployment details",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                    },
                    required: ["id"],
                },
            },
            {
                name: "vercel_list_domains",
                description: "List domains",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                    },
                    required: ["projectId"],
                },
            },
            {
                name: "vercel_add_domain",
                description: "Add domain",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        name: { type: "string" },
                    },
                    required: ["projectId", "name"],
                },
            },
            {
                name: "vercel_remove_domain",
                description: "Remove domain",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        domainName: { type: "string" },
                    },
                    required: ["projectId", "domainName"],
                },
            },
            {
                name: "vercel_list_env_vars",
                description: "List environment variables",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                    },
                    required: ["projectId"],
                },
            },
            {
                name: "vercel_create_env_var",
                description: "Create environment variable",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        key: { type: "string" },
                        value: { type: "string" },
                        target: {
                            type: "array",
                            items: { type: "string", enum: ["production", "preview", "development"] },
                        },
                    },
                    required: ["projectId", "key", "value"],
                },
            },
            {
                name: "vercel_delete_env_var",
                description: "Delete environment variable",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string" },
                        envId: { type: "string" },
                    },
                    required: ["projectId", "envId"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;

        switch (name) {
            case "vercel_list_projects": {
                const { search } = args as { search?: string };
                const projects = await vercel.listProjects(search);
                return {
                    content: [{ type: "text", text: JSON.stringify(projects, null, 2) }],
                };
            }
            case "vercel_create_project": {
                const { name, gitRepository } = args as { name: string; gitRepository?: any };
                const project = await vercel.createProject(name, gitRepository);
                return {
                    content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
                };
            }
            case "vercel_delete_project": {
                const { idOrName } = args as { idOrName: string };
                await vercel.deleteProject(idOrName);
                return {
                    content: [{ type: "text", text: `Project ${idOrName} deleted successfully` }],
                };
            }
            case "vercel_list_deployments": {
                const { projectId, limit } = args as { projectId?: string; limit?: number };
                const deployments = await vercel.listDeployments(projectId, limit);
                return {
                    content: [{ type: "text", text: JSON.stringify(deployments, null, 2) }],
                };
            }
            case "vercel_get_deployment": {
                const { id } = args as { id: string };
                const deployment = await vercel.getDeployment(id);
                return {
                    content: [{ type: "text", text: JSON.stringify(deployment, null, 2) }],
                };
            }
            case "vercel_list_domains": {
                const { projectId } = args as { projectId: string };
                const domains = await vercel.listDomains(projectId);
                return {
                    content: [{ type: "text", text: JSON.stringify(domains, null, 2) }],
                };
            }
            case "vercel_add_domain": {
                const { projectId, name: domainName } = args as { projectId: string; name: string };
                const domain = await vercel.addDomain(projectId, domainName);
                return {
                    content: [{ type: "text", text: JSON.stringify(domain, null, 2) }],
                };
            }
            case "vercel_remove_domain": {
                const { projectId, domainName } = args as { projectId: string; domainName: string };
                await vercel.removeDomain(projectId, domainName);
                return {
                    content: [{ type: "text", text: `Domain ${domainName} removed from ${projectId}` }],
                };
            }
            case "vercel_list_env_vars": {
                const { projectId } = args as { projectId: string };
                const envs = await vercel.listEnvVars(projectId);
                return {
                    content: [{ type: "text", text: JSON.stringify(envs, null, 2) }],
                };
            }
            case "vercel_create_env_var": {
                const { projectId, key, value, target } = args as {
                    projectId: string;
                    key: string;
                    value: string;
                    target?: string[];
                };
                const env = await vercel.createEnvVar(projectId, key, value, target);
                return {
                    content: [{ type: "text", text: JSON.stringify(env, null, 2) }],
                };
            }
            case "vercel_delete_env_var": {
                const { projectId, envId } = args as { projectId: string; envId: string };
                await vercel.deleteEnvVar(projectId, envId);
                return {
                    content: [{ type: "text", text: `Env var ${envId} deleted from ${projectId}` }],
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
    console.error("Vercel MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
