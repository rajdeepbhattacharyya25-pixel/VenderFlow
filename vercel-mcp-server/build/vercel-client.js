"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VercelClient = void 0;
const axios_1 = __importDefault(require("axios"));
class VercelClient {
    client;
    constructor(apiToken) {
        this.client = axios_1.default.create({
            baseURL: 'https://api.vercel.com',
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        });
    }
    // Projects
    async listProjects(search) {
        const params = search ? { search } : {};
        const response = await this.client.get('/v9/projects', { params });
        return response.data.projects;
    }
    async createProject(name, gitRepository) {
        const response = await this.client.post('/v9/projects', {
            name,
            gitRepository,
        });
        return response.data;
    }
    async deleteProject(idOrName) {
        const response = await this.client.delete(`/v9/projects/${idOrName}`);
        return response.data; // usually 204
    }
    // Deployments
    async listDeployments(projectId, limit = 20) {
        const params = { limit };
        if (projectId)
            params.projectId = projectId;
        const response = await this.client.get('/v6/deployments', { params });
        return response.data.deployments;
    }
    async getDeployment(id) {
        const response = await this.client.get(`/v13/deployments/${id}`);
        return response.data;
    }
    // Domains
    async listDomains(projectId) {
        // Domains are usually per project or per team. API v5 is common.
        // /v9/projects/:id/domains
        const response = await this.client.get(`/v9/projects/${projectId}/domains`);
        return response.data.domains;
    }
    async addDomain(projectId, name) {
        const response = await this.client.post(`/v9/projects/${projectId}/domains`, {
            name,
        });
        return response.data;
    }
    async removeDomain(projectId, domainName) {
        const response = await this.client.delete(`/v9/projects/${projectId}/domains/${domainName}`);
        return response.data;
    }
    // Env Vars
    async listEnvVars(projectId) {
        const response = await this.client.get(`/v9/projects/${projectId}/env`);
        return response.data.envs;
    }
    async createEnvVar(projectId, key, value, target = ['production', 'preview', 'development']) {
        const response = await this.client.post(`/v10/projects/${projectId}/env`, {
            key,
            value,
            target,
            type: 'encrypted', // default
        });
        return response.data;
    }
    async deleteEnvVar(projectId, envId) {
        const response = await this.client.delete(`/v9/projects/${projectId}/env/${envId}`);
        return response.data;
    }
}
exports.VercelClient = VercelClient;
