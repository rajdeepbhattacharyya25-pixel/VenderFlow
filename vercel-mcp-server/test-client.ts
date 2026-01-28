import { VercelClient } from './src/vercel-client';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.VERCEL_API_TOKEN;
if (!token) {
    console.error('No token found');
    process.exit(1);
}

const client = new VercelClient(token);

async function main() {
    try {
        console.log('Testing Vercel connection...');
        const projects = await client.listProjects();
        console.log('Success! Found projects:', projects.length);
        projects.forEach((p: any) => console.log(`- ${p.name} (${p.id})`));
    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    }
}

main();
