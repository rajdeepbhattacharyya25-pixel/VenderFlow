import { chromium } from 'playwright';

(async () => {
  console.log("Launching headless browser...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[PAGE LOG] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  page.on('pageerror', exception => {
    console.log(`[PAGE ERROR] Uncaught exception: ${exception}`);
  });

  page.on('response', response => {
    if (response.url().includes('venderflow.vercel.app') || response.url().includes('assets')) {
      console.log(`[NETWORK] ${response.status()} - ${response.url()}`);
    }
  });

  const url = 'https://venderflow.vercel.app/?t=' + Date.now();
  console.log(`Navigating to ${url}...`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    
    console.log("Page loaded. Injecting script to get body content...");
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML : 'NO ROOT ELEMENT FOUND';
    });

    console.log("--- ROOT CONTENT ---");
    console.log(rootContent || '<EMPTY>');
    
  } catch (err) {
    console.error("Error during navigation or evaluation:", err);
  } finally {
    await browser.close();
  }
})();
