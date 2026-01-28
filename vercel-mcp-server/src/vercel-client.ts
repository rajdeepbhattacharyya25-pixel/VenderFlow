import axios, { AxiosInstance } from 'axios';

export class VercelClient {
    private client: AxiosInstance;

    constructor(apiToken: string) {
        this.client = axios.create({
            baseURL: 'https://api.vercel.com',
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
        });
    }

    // Projects
    async listProjects(search?: string) {
        const params = search ? { search } : {};
        const response = await this.client.get('/v9/projects', { params });
        return response.data.projects;
    }

    async createProject(name: string, gitRepository?: { type: string; repo: string }) {
        const response = await this.client.post('/v9/projects', {
            name,
            gitRepository,
        });
        return response.data;
    }

    async deleteProject(idOrName: string) {
        const response = await this.client.delete(`/v9/projects/${idOrName}`);
        return response.data; // usually 204
    }

    // Deployments
    async listDeployments(projectId?: string, limit: number = 20) {
        const params: any = { limit };
        if (projectId) params.projectId = projectId;
        const response = await this.client.get('/v6/deployments', { params });
        return response.data.deployments;
    }

    async getDeployment(id: string) {
        const response = await this.client.get(`/v13/deployments/${id}`);
        return response.data;
    }

    // Domains
    async listDomains(projectId: string) {
        // Domains are usually per project or per team. API v5 is common.
        // /v9/projects/:id/domains
        const response = await this.client.get(`/v9/projects/${projectId}/domains`);
        return response.data.domains;
    }

    async addDomain(projectId: string, name: string) {
        const response = await this.client.post(`/v9/projects/${projectId}/domains`, {
            name,
        });
        return response.data;
    }

    async removeDomain(projectId: string, domainName: string) {
        const response = await this.client.delete(`/v9/projects/${projectId}/domains/${domainName}`);
        return response.data;
    }

    // Env Vars
    async listEnvVars(projectId: string) {
        const response = await this.client.get(`/v9/projects/${projectId}/env`);
        return response.data.envs;
    }

    async createEnvVar(projectId: string, key: string, value: string, target: string[] = ['production', 'preview', 'development']) {
        const response = await this.client.post(`/v10/projects/${projectId}/env`, {
            key,
            value,
            target,
            type: 'encrypted', // default
        });
        return response.data;
    }

    async deleteEnvVar(projectId: string, envId: string) {
        const response = await this.client.delete(`/v9/projects/${projectId}/env/${envId}`);
        return response.data;
    }
}
