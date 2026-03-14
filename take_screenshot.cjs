const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:3000');

    // Wait for the Complete Commerce text to appear
    await page.waitForSelector('text=Complete Commerce');

    // Scroll to it
    const element = await page.$('text=Complete Commerce');
    await element.scrollIntoViewIfNeeded();

    // Take a screenshot
    await page.screenshot({ path: 'verify_font.png' });

    await browser.close();
})();
