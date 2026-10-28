import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { BottomSheet } from "@/components/sheet/bottom-sheet";

describe("BottomSheet", () => {
  beforeAll(() => {
    Object.defineProperty(window, "PointerEvent", { value: MouseEvent, configurable: true });
  });

  it("switches between Peek, Half, and Full states and shows content above Peek", () => {
    render(
      <BottomSheet title="Network details">
        <p>Sheet content</p>
      </BottomSheet>
    );

    const sheet = screen.getByTestId("bottom-sheet");
    expect(sheet).toHaveAttribute("data-snap", "peek");
    expect(screen.getByTestId("bottom-sheet-content")).not.toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Half sheet" }));
    expect(sheet).toHaveAttribute("data-snap", "half");
    expect(screen.getByText("Sheet content")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Full sheet" }));
    expect(sheet).toHaveAttribute("data-snap", "full");
  });

  it("supports upward and downward handle swipes", () => {
    render(<BottomSheet title="Network details" defaultSnap="half">Content</BottomSheet>);
    const handle = screen.getByRole("button", { name: "Resize Network details sheet" });
    const sheet = screen.getByTestId("bottom-sheet");

    fireEvent.pointerDown(handle, { clientY: 200 });
    fireEvent.pointerUp(handle, { clientY: 100 });
    expect(sheet).toHaveAttribute("data-snap", "full");

    fireEvent.pointerDown(handle, { clientY: 100 });
    fireEvent.pointerUp(handle, { clientY: 200 });
    expect(sheet).toHaveAttribute("data-snap", "half");
  });
});
