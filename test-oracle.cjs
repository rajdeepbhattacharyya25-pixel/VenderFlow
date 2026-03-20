/* eslint-disable @typescript-eslint/no-require-imports */
const https = require('https');

const data = JSON.stringify({
  query: "What is the impact of a 15% reserve rate on our liquidity?",
  seller_id: "4168bc25-058d-420b-aed1-177ea6f5952a",
  scenario_overrides: {
    reserve_rate: 0.15,
    payout_delay_days: 10
  }
});

const options = {
  hostname: 'gqwgvhxcssooxbmwgiwt.functions.supabase.co',
  path: '/ai-oracle-brain',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxd2d2aHhjc3Nvb3hibXdnaXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjczMjAsImV4cCI6MjA4MDQ0MzMyMH0.TYY0G0XRICGWS2jdWY9lR3dGMOeip52U6DAM6WaWHhI',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseBody = '';
  res.on('data', (d) => { responseBody += d; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', responseBody);
  });
});

req.on('error', (error) => { console.error(error); });
req.write(data);
req.end();
