export function cleanStationName(name: string): string {
  return name
    .replace(/\s*\([^)]*(line|corridor|branch)[^)]*\)/gi, "")
    .replace(/\s+metro\s+station/i, "")
    .replace(/\s+station/i, "")
    .trim();
}
