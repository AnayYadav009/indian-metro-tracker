import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "@/app/page";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { create } from "zustand";

describe("Milestone 1 - Setup & Boilerplate", () => {
  it("renders the placeholder homepage with correct heading", () => {
    render(<HomePage />);
    const heading = screen.getByRole("heading", {
      name: /Indian Metro Network Tracker/i,
      level: 1,
    });
    expect(heading).toBeInTheDocument();
  });

  it("verifies cn utility works correctly", () => {
    const result = cn("text-red-500", false && "hidden", "p-4");
    expect(result).toBe("text-red-500 p-4");
  });

  it("verifies Zod schema validation functions", () => {
    const statusSchema = z.enum(["operational", "construction", "planned"]);
    expect(statusSchema.parse("operational")).toBe("operational");
    expect(() => statusSchema.parse("invalid")).toThrow();
  });

  it("verifies Zustand store creation works", () => {
    interface TestStore {
      count: number;
      increment: () => void;
    }
    const useTestStore = create<TestStore>((set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }));

    expect(useTestStore.getState().count).toBe(0);
    useTestStore.getState().increment();
    expect(useTestStore.getState().count).toBe(1);
  });
});
