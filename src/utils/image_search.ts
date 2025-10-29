import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const Result = z.array(z.object({
    point: z.tuple([z.number(), z.number()]),
    confidence: z.number(),
}));

let proc: ReturnType<typeof spawn> | null = null;

/**
 * Searches for a template image within a screenshot using OpenCV template matching
 * 
 * Spawns a Python subprocess that performs image template matching and returns matching locations.
 * The Python process is spawned once and reused across all calls throughout the application lifetime.
 * 
 * **Note:** The first execution may take longer due to Python process initialization.
 * Subsequent calls will be significantly faster since the process is already running.
 * 
 * @param template_base64 - Base64-encoded template image to search for
 * @param screenshot_base64 - Base64-encoded screenshot image to search within
 * @param threshold - Confidence threshold (0-1) for match detection. Lower values are more permissive
 * 
 * @returns Array of matching locations with their confidence scores. Each match contains:
 *          - point: [x, y] coordinates of the match
 *          - confidence: Confidence score of the match (0-1)
 * 
 * @throws {Error} If the Python process fails, exits with non-zero code, or result validation fails
 * 
 * @example
 * const matches = await imageSearch(templateBase64, screenshotBase64, 0.85);
 * // Returns: [{ point: [100, 200], confidence: 0.92 }, ...]
 */
export async function imageSearch(
    template_base64: string,
    screenshot_base64: string,
    threshold: number = 0.8,
    cannyMode: boolean = false,
): Promise<z.infer<typeof Result>> {
    return new Promise((resolve, reject) => {
        let errorData = "";

        if (!proc)
            proc = spawn("python", [`${dirname(fileURLToPath(import.meta.url))}/../python/image_search.py`]);

        proc.stdout!.on("data", async (data) => {
            try {
                const result = await Result.parseAsync(JSON.parse(data.toString()));
                resolve(result);
            } catch (err) {
                reject(err);
            } finally {
                proc!.stdout!.removeAllListeners();
                proc!.stderr!.removeAllListeners();
                proc!.removeAllListeners();
            }
        });
        
        proc.stderr!.on("data", (data) => {
            errorData += data.toString();
        });
        
        proc.on("error", (err) => {
            errorData += err.toString();
        });
        
        proc.on("exit", (code) => {
            if (code !== 0 && code !== null) {
                reject(new Error(`Python process exited with code ${code}${errorData ? `: ${errorData}` : ""}`));

                proc!.stdout!.removeAllListeners();
                proc!.stderr!.removeAllListeners();
                proc!.removeAllListeners();
            }
        });
        
        proc.stdin!.write(screenshot_base64 + "\n");
        proc.stdin!.write(template_base64 + "\n");
        proc.stdin!.write(threshold.toString() + "\n");
        proc.stdin!.write((cannyMode ? "true" : "false") + "\n");
    });
}
