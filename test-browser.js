import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log("Browser Error:", msg.text());
        }
    });

    page.on('pageerror', err => {
        console.log("Page Error:", err.message, err.stack);
    });

    try {
        await page.goto("http://localhost:3000/apply", { waitUntil: 'networkidle', timeout: 5000 });
        console.log("Navigation successful");
    } catch (e) {
        console.log("Nav failed:", e.message);
    }

    try {
        await page.goto("http://localhost:3001/apply", { waitUntil: 'networkidle', timeout: 5000 });
        console.log("Navigation successful (3001)");
    } catch (e) {
        console.log("Nav failed (3001):", e.message);
    }

    await browser.close();
})();
