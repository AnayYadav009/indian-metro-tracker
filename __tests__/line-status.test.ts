import { describe, expect, it } from "vitest";
import { getLineStatusLabels } from "@/lib/line-status";

describe("connected line status labels", () => {
  it("shows every unique status represented by a line's segments", () => {
    expect(
      getLineStatusLabels(["operational", "construction", "operational"])
    ).toEqual(["Operational", "Under Construction"]);
  });

  it("returns no label when the line has no compiled segments", () => {
    expect(getLineStatusLabels([])).toEqual([]);
  });
});
