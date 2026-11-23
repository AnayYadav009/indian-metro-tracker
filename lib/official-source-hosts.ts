/**
 * Official source hostnames for FareRule and ServiceHours verified records.
 *
 * Seeded ONLY with operator and government hostnames from the M19.4 allowlist.
 * News and blog hostnames (e.g. themetrorailguy.com, thehindu.com) are NEVER added.
 * Any new official host must be reviewed and added by the repository owner.
 */
export const OFFICIAL_SOURCE_HOSTS: readonly string[] = Object.freeze([
  // Transit Operators
  "chennaimetrorail.org",
  "delhimetrorail.com",
  "www.delhimetrorail.com",
  "english.bmrc.co.in",
  "hmrl.co.in",
  "ltmetro.com",
  "kochimetro.org",
  "mmrcl.com",
  "www.metrorailnagpur.com",
  "www.mpmetrorail.com",
  "www.nmrcnoida.com",
  "www.punemetrorail.org",
  "upmetrorail.com",
  "patnametrorail.com",
  "www.gujaratmetrorail.com",

  // Government & Development Authorities
  "mmrda.maharashtra.gov.in",
  "mtp.indianrailways.gov.in",
  "pmrda.gov.in",
  "transport.rajasthan.gov.in",
]);

export function isOfficialSourceHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return OFFICIAL_SOURCE_HOSTS.includes(normalized);
}
