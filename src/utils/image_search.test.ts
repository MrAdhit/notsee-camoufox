import { describe, it, expect } from "vitest";
import { imageSearch } from "./image_search";

import { input_file, screenshot_file } from "./image_search.test.json"

describe("imageSearch", () => {
  it("should return with the expected object", async () => {
    const result = await imageSearch(input_file, screenshot_file, 0.8) as Array<{ point: [number, number]; confidence: number }>;
    
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    
    if (result.length > 0) {
      result.forEach((match: { point: [number, number]; confidence: number }) => {
        expect(match).toHaveProperty("point");
        expect(match).toHaveProperty("confidence");
        expect(match.point).toHaveLength(2);
        expect(typeof match.point[0]).toBe("number");
        expect(typeof match.point[1]).toBe("number");
        expect(match.confidence).toBeGreaterThanOrEqual(0);
        expect(match.confidence).toBeLessThanOrEqual(1);
      });
    }
  });
  
  it("should match with high confidence for identical images", async () => {
    const result = await imageSearch(input_file, input_file) as Array<{ point: [number, number]; confidence: number }>;

    expect(result.length).toBe(1);
    expect(result[0].confidence).toBeCloseTo(1);
    expect(result[0].point).toEqual([49, 19]);
  });
  
  it("should match with predictable confidence for similar images", async () => {
    const result = await imageSearch(input_file, screenshot_file, 0.9) as Array<{ point: [number, number]; confidence: number }>;
    
    expect(result.length).toBe(1);
    expect(result[0].confidence).toBeCloseTo(0.9638928771018982); /* Pre-calculated expected confidence */
    expect(result[0].point).toEqual([325, 215]);
  });
});


