import readline from "readline/promises";

import { ExtendedCamoufox, ExtendedPage } from "notsee-camoufox";

async function enterToExit() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    await rl.question("Press Enter to exit...");
    
    process.exit(0);
}

(async () => {
    const browser = await ExtendedCamoufox();
    const context = await browser.newContext();

    const page = await context.newPage();
    
    console.log("=== IMAGE SEARCH DEMO ===");

    await page.goto("https://formsmarts.com/html-form-example");

    await page.image.type(require("../assets/first_name.png"), "John");
    await page.image.click(require("../assets/payment_form.png"));

    await page.waitForTimeout(500);
    
    const [newPage] = await Promise.all([
        context.waitForEvent("page").then(p => new ExtendedPage(p)),
        page.image.click(require("../assets/try_booking_form.png"), { search: { threshold: 0.5 } }),
    ]);

    await newPage.waitForLoadState();
    await newPage.image.click(require("../assets/1_year.png"), { search: { saveDebugImage: true } });
    
    await enterToExit();
})();
