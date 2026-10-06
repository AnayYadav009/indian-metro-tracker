import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fetchOverpassDataForCity } from "@/scripts/pipeline/fetch-overpass";

describe("fetchOverpassDataForCity Pipeline Resilience", () => {
  const testCityId = "test-resilience-city";
  const rawDir = path.resolve(process.cwd(), "data", "raw");
  const testCacheFile = path.join(rawDir, `${testCityId}.json`);

  beforeEach(() => {
    if (fs.existsSync(testCacheFile)) {
      fs.unlinkSync(testCacheFile);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(testCacheFile)) {
      fs.unlinkSync(testCacheFile);
    }
    if (fs.existsSync(`${testCacheFile}.tmp`)) {
      fs.unlinkSync(`${testCacheFile}.tmp`);
    }
  });

  it("reads directly from existing cache file when force is false", async () => {
    const cachedData = {
      elements: [{ type: "node", id: 12345, tags: { name: "Cached Station" } }],
    };
    fs.writeFileSync(testCacheFile, JSON.stringify(cachedData), "utf-8");

    const fetchSpy = vi.spyOn(global, "fetch");

    const result = await fetchOverpassDataForCity(
      testCityId,
      [77.0, 28.0, 77.5, 28.5],
      false
    );

    expect(result).toEqual(cachedData);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("gracefully falls back to existing cache if remote endpoints fail during force fetch", async () => {
    const cachedData = {
      elements: [{ type: "node", id: 67890, tags: { name: "Fallback Station" } }],
    };
    fs.writeFileSync(testCacheFile, JSON.stringify(cachedData), "utf-8");

    // Mock fetch to simulate network/endpoint failures across all mirrors
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.reject(new Error("Network connection refused"))
    );

    const result = await fetchOverpassDataForCity(
      testCityId,
      [77.0, 28.0, 77.5, 28.5],
      true,
      0
    );

    // Should return existing cache instead of crashing
    expect(result).toEqual(cachedData);
  });

  it("throws an error when all endpoints fail and no cache exists", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.reject(new Error("504 Gateway Timeout"))
    );

    await expect(
      fetchOverpassDataForCity(
        testCityId,
        [77.0, 28.0, 77.5, 28.5],
        true,
        0
      )
    ).rejects.toThrow(/All Overpass endpoints failed/);
  });
});
