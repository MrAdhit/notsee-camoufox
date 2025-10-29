import { mkdir, readFile, writeFile } from "node:fs/promises";

import { Locator, Page } from "playwright-core";

import { createProxyClass } from "../utils/proxy_class";
import { imageSearch } from "../utils/image_search";
import { debugTimestamp } from "../utils/debug";

export interface ExtendedPage extends Page {}
export class ExtendedPage {
    #proxy;

    constructor(private page: Page) {
        this.#proxy = createProxyClass(this, this.page);
        return this.#proxy;
    }
    
    get image() {
        return new Image(this.#proxy);
    }
}

class Image {
    constructor(private page: ExtendedPage) {}
    
    async search(
        sourceImagePathOrBinary: Parameters<typeof readFile>[0] | Uint8Array<ArrayBuffer>,
        options?: {
            threshold?: number;
            saveDebugImage?: boolean;
            timeout?: number;
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
        let screenshotBase64 = Buffer.from(screenshot).toString("base64");
        
        if (options?.saveDebugImage) {
            const timestamp = debugTimestamp();
            
            await mkdir("debug/image_search", { recursive: true });
            
            await Promise.all([
                writeFile(`debug/image_search/screenshot_${timestamp}.png`, screenshot),
                writeFile(`debug/image_search/source_image_${timestamp}.png`, sourceImage),
            ]);
        }
        
        const startTime = Date.now();
        let tries = 0;
        
        while ((Date.now() - startTime) < (options?.timeout ?? 30000)) {
            tries += 1;
            await this.page.waitForTimeout(1000);

            const screenshot = await this.page.screenshot({ type: "png", fullPage: true });
            screenshotBase64 = Buffer.from(screenshot).toString("base64");
            
            if (options?.saveDebugImage) {
                const timestamp = debugTimestamp();

                writeFile(`debug/image_search/screenshot_try${tries}_${timestamp}.png`, screenshot)
            }

            // TODO: Request to Python to mark the found locations on the screenshot and save the resulting image with bunch of squares.
            const result = await imageSearch(sourceImageBase64, screenshotBase64, options?.threshold ?? 0.8);
            if (result.length === 0) continue;

            return result;
        }
        
        throw new Error("No matching image found.");
    }
    
    async click(
        sourceImagePathOrBinary: Parameters<Image["search"]>[0],
        options?: {
            search?: Parameters<Image["search"]>[1];
            mouse?: Parameters<ExtendedPage["mouse"]["click"]>[2];
            indexOf?: number;
        },
    ) {
        const indexOf = options?.indexOf ?? 0;

        const results = await this.search(sourceImagePathOrBinary, options?.search);
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
    
    async type(
        sourceImagePathOrBinary: Parameters<Image["search"]>[0],
        text: string,
        options?: {
            search?: Parameters<Image["search"]>[1];
            fill?: Parameters<Locator["fill"]>[1];
            indexOf?: number;
        },
    ) {
        await this.click(sourceImagePathOrBinary, options);
        await this.page.waitForTimeout(100); // Small delay to ensure focus.
        await this.page.keyboard.insertText(text);
    }
}
