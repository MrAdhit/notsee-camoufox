import { Camoufox, LaunchOptions } from "camoufox-js";
import { Browser, BrowserContext } from "playwright-core";

import { ExtendedBrowser, ExtendedBrowserContext } from "./browser";

export async function ExtendedCamoufox<
    UserDataDir extends string | undefined = undefined,
    ReturnType = UserDataDir extends string ? ExtendedBrowserContext : ExtendedBrowser,
>(
    launch_options:
        | LaunchOptions
        | { headless?: boolean | "virtual"; user_data_dir: UserDataDir } = { humanize: .5, screen: { maxHeight: 768, maxWidth: 1366 } },
): Promise<ReturnType> {
    const browser = await Camoufox(launch_options);
    
    // So that Typescript is happy.
    const isContext = (unk: Browser | BrowserContext): unk is BrowserContext => typeof launch_options.user_data_dir === "string";
    if (isContext(browser))
        return new ExtendedBrowserContext(browser) as ReturnType;

    return new ExtendedBrowser(browser) as ReturnType;
}
