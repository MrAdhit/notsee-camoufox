import { mkdir, readFile, writeFile } from "node:fs/promises";

import { Locator, Page } from "playwright-core";

import { createProxyClass } from "../utils/proxy_class";
import { imageSearch } from "../utils/image_search";
import { debugTimestamp } from "../utils/debug";

export interface ExtendedPage extends Page {}
export class ExtendedPage {
    constructor(private page: Page) {
        return createProxyClass(this, this.page);
    }
    
    async imageSearch(
        sourceImagePathOrBinary: Parameters<typeof readFile>[0] | Uint8Array<ArrayBuffer>,
        options?: {
            threshold?: number;
            saveDebugImage?: boolean;
        }
    ) {
        let sourceImage: Uint8Array;
        
        if (sourceImagePathOrBinary instanceof Uint8Array) {
            sourceImage = sourceImagePathOrBinary;
        } else {
            sourceImage = await readFile(sourceImagePathOrBinary);
        }
        
        const sourceImageBase64 = Buffer.from(sourceImage).toString("base64");
        
        const screenshot = await this.page.screenshot({ type: "png", fullPage: true });
        const screenshotBase64 = Buffer.from(screenshot).toString("base64");
        
        if (options?.saveDebugImage) {
            const timestamp = debugTimestamp();
            
            await mkdir("debug/image_search", { recursive: true });
            
            await Promise.all([
                writeFile(`debug/image_search/screenshot_${timestamp}.png`, screenshot),
                writeFile(`debug/image_search/source_image_${timestamp}.png`, sourceImage),
            ]);
        }
        
        // TODO: Request to Python to mark the found locations on the screenshot and save the resulting image with bunch of squares.
        const result = await imageSearch(sourceImageBase64, screenshotBase64, options?.threshold ?? 0.8);
        
        return result;
    }
    
    async imageClick(
        sourceImagePathOrBinary: Parameters<ExtendedPage["imageSearch"]>[0],
        options?: {
            imageSearch?: Parameters<ExtendedPage["imageSearch"]>[1];
            mouse?: Parameters<ExtendedPage["mouse"]["click"]>[2];
            indexOf?: number;
        },
    ) {
        const indexOf = options?.indexOf ?? 0;

        const results = await this.imageSearch(sourceImagePathOrBinary, options?.imageSearch);
        const result = results[indexOf];
        
        if (result === undefined)
            throw new Error("No matching image found.");
        
        const viewport = this.page.viewportSize();
        if (!viewport)
            throw new Error("Viewport size is not available.");
        
        const [pointX, pointY] = result.point;
        let clickY = pointY;
        
        // Get current scroll position.
        const currentScroll = await this.page.evaluate(() => window.scrollY);
        const viewportTop = currentScroll;
        const viewportBottom = currentScroll + viewport.height;
        
        // Check if point is out of bounds and scroll if necessary.
        if (pointY < viewportTop || pointY > viewportBottom) {
            // Calculate relative scroll offset to center the point in viewport.
            const targetScroll = pointY - (viewport.height * 0.5);
            const scrollOffset = targetScroll - currentScroll;

            await this.page.mouse.wheel(0, scrollOffset);
            
            // Adjust click coordinates relative to new viewport position.
            clickY = pointY - targetScroll - (viewport.height * 0.5) + (viewport.height * 0.5);
        }
        
        await this.page.mouse.click(pointX, clickY, options?.mouse);
        
        return result;
    }
    
    async imageType(
        sourceImagePathOrBinary: Parameters<ExtendedPage["imageSearch"]>[0],
        text: string,
        options?: {
            imageSearch?: Parameters<ExtendedPage["imageSearch"]>[1];
            fill?: Parameters<Locator["fill"]>[1];
            indexOf?: number;
        },
    ) {
        await this.imageClick(sourceImagePathOrBinary, options);
        await this.page.waitForTimeout(100); // Small delay to ensure focus.
        await this.keyboard.insertText(text);
    }
}
