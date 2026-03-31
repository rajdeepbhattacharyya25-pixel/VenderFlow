import { VercelClient } from './src/vercel-client';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.VERCEL_API_TOKEN;
const PROJECT_ID = 'prj_fsTOUgr1TjtaVwyXaT8kooI1Dmll';

const client = new VercelClient(TOKEN!);

async function main() {
    try {
        const deployments = await client.listDeployments(PROJECT_ID, 1);
        if (deployments && deployments.length > 0) {
            const depl = deployments[0];
            console.log('Latest Deployment:');
            console.log(`- URL: https://${depl.url}`);
            console.log(`- State: ${depl.state}`);
            console.log(`- Created: ${new Date(depl.created).toLocaleString()}`);
        } else {
            console.log('No deployments found.');
        }
    } catch (e: any) {
        console.error(e.message);
    }
}
main();
