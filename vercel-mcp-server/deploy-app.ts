import { VercelClient } from './src/vercel-client';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import path from 'path';

dotenv.config();

const TOKEN = process.env.VERCEL_API_TOKEN;
const PROJECT_NAME = 'venderflow';
const APP_DIR = path.resolve(__dirname, '..');

if (!TOKEN) {
    console.error('No VERCEL_API_TOKEN found');
    process.exit(1);
}

const client = new VercelClient(TOKEN);

// Env vars to deploy
const ENVS = {
    VITE_SUPABASE_URL: 'https://gqwgvhxcssooxbmwgiwt.supabase.co',
    VITE_SUPABASE_ANON_KEY: '[SECRET]'
};

async function main() {
    console.log(`🚀 Starting deployment for ${PROJECT_NAME}...`);

    let projectId: string | undefined;

    // 1. Create Project
    try {
        console.log('Creating/Checking project...');
        const projectData = await client.createProject(PROJECT_NAME);
        console.log('Project created.');
        projectId = projectData.id;
    } catch (error: any) {
        if (error.response?.status === 409 || error.response?.data?.error?.code === 'conflict_project_exists' || error.message.includes('409') || error.message.includes('conflict')) {
            console.log('Project already exists, retrieving details...');
            // Try to find it
            const projects = await client.listProjects(PROJECT_NAME);
            const project = projects.find((p: any) => p.name === PROJECT_NAME);
            if (project) {
                projectId = project.id;
            } else {
                console.log("Could not find project by name in list. Listing all...");
                // Fallback: list all
                const allProjects = await client.listProjects();
                const p = allProjects.find((p: any) => p.name === PROJECT_NAME);
                if (p) projectId = p.id;
            }
        } else {
            console.error('Create project failed:', error.message);
            if (error.response) console.error(JSON.stringify(error.response.data));
        }
    }

    if (!projectId) {
        console.error('❌ Could not resolve Project ID. Aborting.');
        process.exit(1);
    }

    console.log('Project ID resolved:', projectId);

    // 2. Set Env Vars
    console.log('Setting Environment Variables...');
    // We should first list existing ones to avoid duplicates or errors?
    // Vercel API for createEnvVar might create another instance if we run it again.
    // My client helper didn't implement logic to check existence.
    // Let's implement a naive "delete all and recreate" or "check if exists".
    // "listEnvVars" is available.

    // Fetch project ID first? My listEnvVars needs projectId. 
    // Wait, createEnvVar needs projectId too. PROJECT_NAME works as ID in many endpoints?
    // Usually Vercel allows Project Name in place of ID. Let's try.

    // Actually, getting the project ID is safer.
    const existingEnvs = await client.listEnvVars(projectId);

    for (const [key, value] of Object.entries(ENVS)) {
        const exists = existingEnvs.find((e: any) => e.key === key);
        if (exists) {
            console.log(`Env var ${key} already exists. Skipping...`);
            // Optionally update it? My client doesn't have updateEnvVar yet.
            // We could delete and recreate:
            // await client.deleteEnvVar(projectId, exists.id);
            // await client.createEnvVar(projectId, key, value);
        } else {
            console.log(`Creating env var ${key}...`);
            await client.createEnvVar(projectId, key, value);
        }
    }

    // 3. Trigger Deployment via CLI
    console.log('Triggering Vercel CLI deployment...');
    // We point to the parent directory (APP_DIR)
    // We pass --name PROJECT_NAME to ensure it links to the right one
    // --yes to skip confirmation
    // --prod to go to production
    try {
        const cmd = `npx vercel deploy "${APP_DIR}" --prod --name ${PROJECT_NAME} --token ${TOKEN} --yes`;
        console.log(`Running: npx vercel deploy ...`);
        const output = execSync(cmd, {
            stdio: 'pipe', // Capture output
            encoding: 'utf-8',
            cwd: process.cwd(), // Run from current dir
        });
        console.log('Deployment Output:');
        console.log(output);

        // Extract URL? The output usually ends with the URL.
        const lines = output.trim().split('\n');
        const url = lines[lines.length - 1];
        console.log(`\n✅ Deployment Successful! URL: ${url}`);

    } catch (error: any) {
        console.error('CLI Deployment failed:');
        console.error(error.stdout || error.message);
        console.error(error.stderr);
        process.exit(1);
    }
}

main();
