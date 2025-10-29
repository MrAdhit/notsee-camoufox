import { Browser, BrowserContext } from "playwright-core";

import { ExtendedPage } from "./page";

import { createProxyClass } from "../utils/proxy_class";

export interface ExtendedBrowser extends Browser {}
export class ExtendedBrowser {
    constructor(private browser: Browser) {
        return createProxyClass(this, this.browser);
    }
    
    async newPage(...args: Parameters<Browser["newPage"]>): Promise<ExtendedPage> {
        return new ExtendedPage(await this.browser.newPage(...args));
    }
    
    async newContext(...args: Parameters<Browser["newContext"]>): Promise<ExtendedBrowserContext> {
        return new ExtendedBrowserContext(await this.browser.newContext(...args));
    }
}

export interface ExtendedBrowserContext extends BrowserContext {}
export class ExtendedBrowserContext {
    constructor(private context: BrowserContext) {
        return createProxyClass(this, this.context);
    }

    async newPage(...args: Parameters<BrowserContext["newPage"]>): Promise<ExtendedPage> {
        return new ExtendedPage(await this.context.newPage(...args));
    }
}
