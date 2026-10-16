export type Coordinate = [number, number];

export function roundCoordinates(coordinates: Coordinate[], decimals: number): Coordinate[] {
  return coordinates.map(([lng, lat]) => [
    Number(lng.toFixed(decimals)),
    Number(lat.toFixed(decimals)),
  ]);
}

export function normalizeCoordinates(coordinates: Coordinate[]): Coordinate[] {
  return coordinates.filter(
    ([lng, lat], index) =>
      index === 0 ||
      lng !== coordinates[index - 1][0] ||
      lat !== coordinates[index - 1][1]
  );
}

export function appendCoordinates(
  existing: Coordinate[],
  incoming: Coordinate[]
): Coordinate[] {
  const [last, first] = [existing.at(-1), incoming[0]];
  const skipFirst = last && first && last[0] === first[0] && last[1] === first[1];
  return [...existing, ...incoming.slice(skipFirst ? 1 : 0)];
}

export function segmentsIntersect(
  a: Coordinate,
  b: Coordinate,
  c: Coordinate,
  d: Coordinate,
  { includeCollinear = false }: { includeCollinear?: boolean } = {}
): boolean {
  const cross = (o: Coordinate, p: Coordinate, q: Coordinate) =>
    (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  const proper =
    ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) &&
    ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
  if (proper || !includeCollinear) return proper;

  const onSegment = (p: Coordinate, q: Coordinate, r: Coordinate) =>
    Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0]) &&
    Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1]);

  return (
    (abC === 0 && onSegment(a, c, b)) ||
    (abD === 0 && onSegment(a, d, b)) ||
    (cdA === 0 && onSegment(c, a, d)) ||
    (cdB === 0 && onSegment(c, b, d))
  );
}
