import { describe, it, expect } from "vitest";
import { formatPhaseLabel } from "@/lib/phase-utils";

describe("formatPhaseLabel", () => {
  it("prepends Phase when given a bare number or roman numeral", () => {
    expect(formatPhaseLabel("1")).toBe("Phase 1");
    expect(formatPhaseLabel("2A")).toBe("Phase 2A");
    expect(formatPhaseLabel("I")).toBe("Phase I");
    expect(formatPhaseLabel("IV")).toBe("Phase IV");
  });

  it("does not double the word Phase when already present", () => {
    expect(formatPhaseLabel("Phase 1")).toBe("Phase 1");
    expect(formatPhaseLabel("Phase 2B")).toBe("Phase 2B");
    expect(formatPhaseLabel("phase 3")).toBe("phase 3");
    expect(formatPhaseLabel("PHASE IV")).toBe("PHASE IV");
  });

  it("handles whitespace correctly", () => {
    expect(formatPhaseLabel("  2A  ")).toBe("Phase 2A");
    expect(formatPhaseLabel("  Phase 3  ")).toBe("Phase 3");
  });
});
