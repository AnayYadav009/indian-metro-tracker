import { describe, it, expect } from "vitest";
import {
  pointToSegmentDistanceM,
  pointToPolylineDistanceM,
  haversineDistanceKm,
  haversineDistanceM,
  nearestPointOnPolyline,
  lineSlice,
} from "../lib/geo";

describe("pointToSegmentDistanceM", () => {
  // Delhi area coordinates (~28.6°N, 77.2°E)
  const lat = 28.6;
  const cosLat = Math.cos((lat * Math.PI) / 180);

  it("returns 0 when point is on the segment start", () => {
    const p: [number, number] = [77.2, 28.6];
    const a: [number, number] = [77.2, 28.6];
    const b: [number, number] = [77.3, 28.6];
    const d = pointToSegmentDistanceM(p, a, b);
    expect(d).toBeLessThan(1);
  });

  it("returns 0 when point is on the segment end", () => {
    const p: [number, number] = [77.3, 28.6];
    const a: [number, number] = [77.2, 28.6];
    const b: [number, number] = [77.3, 28.6];
    const d = pointToSegmentDistanceM(p, a, b);
    expect(d).toBeLessThan(1);
  });

  it("returns approximately correct distance for a point perpendicular to segment midpoint", () => {
    // Segment along longitude line, point offset in latitude
    const a: [number, number] = [77.2, 28.5];
    const b: [number, number] = [77.2, 28.7];
    // Point 0.001° north of midpoint, ~111m
    const p: [number, number] = [77.201, 28.6];
    const d = pointToSegmentDistanceM(p, a, b);
    // 0.001° longitude at lat 28.6 ≈ 97m
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(200);
  });

  it("handles zero-length segment (start === end)", () => {
    const a: [number, number] = [77.2, 28.6];
    const b: [number, number] = [77.2, 28.6]; // same as start
    const p: [number, number] = [77.201, 28.601];
    const d = pointToSegmentDistanceM(p, a, b);
    // Should be the point-to-point distance, roughly ~150m
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(300);
  });

  it("clamps t to [0,1]: point beyond segment end", () => {
    // Segment from A to B, point beyond B
    const a: [number, number] = [77.2, 28.6];
    const b: [number, number] = [77.3, 28.6];
    const p: [number, number] = [77.4, 28.6]; // beyond end
    const d = pointToSegmentDistanceM(p, a, b);
    // Should be distance from p to b, not closer than that
    const dToEnd = haversineDistanceKm(p, b) * 1000;
    // Allow 5% tolerance for equirectangular approximation
    expect(d).toBeGreaterThan(dToEnd * 0.90);
    expect(d).toBeLessThan(dToEnd * 1.10);
  });

  it("clamps t to [0,1]: point beyond segment start", () => {
    const a: [number, number] = [77.2, 28.6];
    const b: [number, number] = [77.3, 28.6];
    const p: [number, number] = [77.1, 28.6]; // beyond start
    const d = pointToSegmentDistanceM(p, a, b);
    const dToStart = haversineDistanceKm(p, a) * 1000;
    expect(d).toBeGreaterThan(dToStart * 0.90);
    expect(d).toBeLessThan(dToStart * 1.10);
  });
});

describe("pointToPolylineDistanceM", () => {
  it("returns Infinity for empty coordinate array", () => {
    const d = pointToPolylineDistanceM([77.2, 28.6], []);
    expect(d).toBe(Infinity);
  });

  it("returns point-to-point distance for single coordinate", () => {
    const p: [number, number] = [77.2, 28.6];
    const coords: [number, number][] = [[77.201, 28.601]];
    const d = pointToPolylineDistanceM(p, coords);
    const expected = haversineDistanceKm(p, coords[0]) * 1000;
    expect(d).toBeCloseTo(expected, 0);
  });

  it("returns minimum distance across multiple segments", () => {
    const p: [number, number] = [77.25, 28.6];
    const coords: [number, number][] = [
      [77.2, 28.5],
      [77.2, 28.7],
      [77.3, 28.7],
      [77.3, 28.5],
    ];
    const d = pointToPolylineDistanceM(p, coords);
    // Point is closest to the second segment [77.2,28.7]->[77.3,28.7] at lat 28.7
    // but at lat 28.6, closest to first or third segment
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(15_000); // within 15km
  });
});

describe("nearestPointOnPolyline & lineSlice", () => {
  const line: [number, number][] = [
    [77.1, 28.1],
    [77.2, 28.1],
    [77.3, 28.1],
    [77.3, 28.2],
  ];

  it("calculates haversineDistanceM accurately", () => {
    const dist = haversineDistanceM([77.1, 28.1], [77.2, 28.1]);
    expect(dist).toBeGreaterThan(9000);
    expect(dist).toBeLessThan(11000);
  });

  it("finds exact nearest projected point on line segment", () => {
    const pt: [number, number] = [77.15, 28.101];
    const res = nearestPointOnPolyline(pt, line);
    expect(res.segmentIndex).toBe(0);
    expect(res.point[0]).toBeCloseTo(77.15, 4);
    expect(res.point[1]).toBeCloseTo(28.1, 4);
    expect(res.distanceM).toBeGreaterThan(50);
    expect(res.distanceM).toBeLessThan(200);
  });

  it("lineSlice returns slice preserving intermediate vertices in forward order", () => {
    const start: [number, number] = [77.15, 28.1];
    const end: [number, number] = [77.3, 28.15];
    const sliced = lineSlice(start, end, line);

    expect(sliced.length).toBe(4);
    expect(sliced[0][0]).toBeCloseTo(77.15, 4);
    expect(sliced[1]).toEqual([77.2, 28.1]);
    expect(sliced[2]).toEqual([77.3, 28.1]);
    expect(sliced[3][1]).toBeCloseTo(28.15, 4);
  });

  it("lineSlice handles reverse order between points", () => {
    const start: [number, number] = [77.3, 28.15];
    const end: [number, number] = [77.15, 28.1];
    const sliced = lineSlice(start, end, line);

    expect(sliced.length).toBe(4);
    expect(sliced[0][1]).toBeCloseTo(28.15, 4);
    expect(sliced[1]).toEqual([77.3, 28.1]);
    expect(sliced[2]).toEqual([77.2, 28.1]);
    expect(sliced[3][0]).toBeCloseTo(77.15, 4);
  });

  it("lineSlice handles points on the same segment", () => {
    const start: [number, number] = [77.12, 28.1];
    const end: [number, number] = [77.18, 28.1];
    const sliced = lineSlice(start, end, line);

    expect(sliced.length).toBe(2);
    expect(sliced[0][0]).toBeCloseTo(77.12, 4);
    expect(sliced[1][0]).toBeCloseTo(77.18, 4);
  });
});
