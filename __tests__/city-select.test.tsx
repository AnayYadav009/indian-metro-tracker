import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CitySelect } from "@/components/filters/city-select";
import { useMetroStore } from "@/store/use-metro-store";

describe("CitySelect", () => {
  beforeEach(() => useMetroStore.getState().resetFilters());

  it("searches and selects a city, then closes the listbox", () => {
    render(<CitySelect />);
    fireEvent.click(screen.getByTestId("city-picker-trigger"));
    fireEvent.change(screen.getByTestId("city-picker-search"), {
      target: { value: "Delhi" },
    });

    const delhi = screen.getByTestId("city-select-delhi");
    expect(delhi).toBeVisible();
    expect(screen.queryByTestId("city-select-mumbai")).not.toBeInTheDocument();
    fireEvent.click(delhi);

    expect(useMetroStore.getState().selectedCityId).toBe("delhi");
    expect(screen.queryByTestId("city-picker-search")).not.toBeInTheDocument();
    expect(screen.getByTestId("city-picker-trigger")).toHaveTextContent("Delhi");
  });

  it("supports keyboard selection and returning to nationwide", () => {
    render(<CitySelect />);
    fireEvent.click(screen.getByTestId("city-picker-trigger"));
    const search = screen.getByTestId("city-picker-search");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(useMetroStore.getState().selectedCityId).toBe("delhi");

    fireEvent.click(screen.getByTestId("city-picker-trigger"));
    fireEvent.click(screen.getByTestId("city-select-all"));
    expect(useMetroStore.getState().selectedCityId).toBeNull();
  });
});
