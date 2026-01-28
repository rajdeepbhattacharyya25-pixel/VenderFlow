import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import dotenv from "dotenv";
import { VercelClient } from "./vercel-client.js";

dotenv.config();

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
                description: "List Vercel projects",
                inputSchema: {
                    type: "object",
                    properties: {
                        search: { type: "string", description: "Search query for projects" },
                    },
                },
            },
            {
                name: "vercel_create_project",
                description: "Create a new Vercel project",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Name of the project" },
                        gitRepository: {
                            type: "object",
                            properties: {
                                type: { type: "string", enum: ["github", "gitlab", "bitbucket"] },
                                repo: { type: "string", description: "Repository name (e.g. user/repo)" },
                            },
                            description: "Optional Git repository to connect",
                        },
                    },
                    required: ["name"],
                },
            },
            {
                name: "vercel_delete_project",
                description: "Delete a Vercel project",
                inputSchema: {
                    type: "object",
                    properties: {
                        idOrName: { type: "string", description: "Project ID or Name" },
                    },
                    required: ["idOrName"],
                },
            },
            {
                name: "vercel_list_deployments",
                description: "List deployments for a project or all deployments",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "Filter by project ID" },
                        limit: { type: "number", description: "Number of deployments to return" },
                    },
                },
            },
            {
                name: "vercel_get_deployment",
                description: "Get details of a specific deployment",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Deployment ID" },
                    },
                    required: ["id"],
                },
            },
            {
                name: "vercel_list_domains",
                description: "List domains for a project",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "Project ID or Name" },
                    },
                    required: ["projectId"],
                },
            },
            {
                name: "vercel_add_domain",
                description: "Add a domain to a project",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "Project ID or Name" },
                        name: { type: "string", description: "Domain name" },
                    },
                    required: ["projectId", "name"],
                },
            },
            {
                name: "vercel_remove_domain",
                description: "Remove a domain from a project",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "Project ID or Name" },
                        domainName: { type: "string", description: "Domain name to remove" },
                    },
                    required: ["projectId", "domainName"],
                },
            },
            {
                name: "vercel_list_env_vars",
                description: "List environment variables for a project",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "Project ID or Name" },
                    },
                    required: ["projectId"],
                },
            },
            {
                name: "vercel_create_env_var",
                description: "Create an environment variable for a project",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "Project ID or Name" },
                        key: { type: "string", description: "Variable key" },
                        value: { type: "string", description: "Variable value" },
                        target: {
                            type: "array",
                            items: { type: "string", enum: ["production", "preview", "development"] },
                            description: "Environments to apply to",
                        },
                    },
                    required: ["projectId", "key", "value"],
                },
            },
            {
                name: "vercel_delete_env_var",
                description: "Delete an environment variable from a project",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectId: { type: "string", description: "Project ID or Name" },
                        envId: { type: "string", description: "Environment Variable ID" },
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
