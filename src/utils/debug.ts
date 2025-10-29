/**
 * Generates a debug timestamp string in the format YYYY-MM-DD_HH-MM-SS
 * 
 * @returns A formatted timestamp string combining the current date and time.
 * 
 * @example
 * debugTimestamp() // Returns something like "2025-10-29_14-30-45"
 */
export function debugTimestamp(): string {
    const now = new Date();

    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS

    return `${dateStr}_${timeStr}`;
}
