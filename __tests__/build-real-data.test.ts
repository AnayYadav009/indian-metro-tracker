import { describe, expect, it } from "vitest";
import { replaceCityRecords } from "@/scripts/pipeline/build-real-data";

describe("replaceCityRecords", () => {
  it("replaces matching city records in place and appends new records", () => {
    const result = replaceCityRecords(
      [
        { id: "a", city: "target", value: 1 },
        { id: "b", city: "other", value: 2 },
        { id: "c", city: "target", value: 3 },
      ],
      [
        { id: "a", city: "target", value: 10 },
        { id: "d", city: "target", value: 40 },
      ],
      (record) => record.city === "target",
      (record) => record.id
    );

    expect(result).toEqual([
      { id: "a", city: "target", value: 10 },
      { id: "b", city: "other", value: 2 },
      { id: "d", city: "target", value: 40 },
    ]);
  });
});
