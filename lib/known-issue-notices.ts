const LINE_NOTICES: Record<string, string> = {
  "blr-green": "geometry is under review",
  "bho-orange": "the mapped distance differs from the cited reference",
  "che-corridor-3": "the construction alignment is not mapped",
  "che-corridor-5": "geometry is under review",
  "del-blue": "a short overlap is under review",
  "del-green": "a short overlap is under review",
  "del-grey": "the terminal and geometry are under review",
  "del-pink": "station and terminal coverage is incomplete",
  "gur-rapid": "the terminal and geometry are under review",
  "ahm-violet": "the planned Phase 2B extension is not mapped",
  "kol-pink": "the construction alignment is not mapped",
  "kol-yellow": "some extension stages are not mapped",
  "mum-line-1": "a declared construction connector is not mapped",
  "mum-line-2b": "the Chembur–DN Nagar construction phase is not mapped",
  "nag-aqua": "declared extension reaches are not mapped",
  "nag-orange": "declared extension reaches are not mapped",
  "noi-aqua": "the planned Sector 142–Botanical Garden branch is not mapped",
  "pun-line-3": "geometry is under review",
  "pun-purple": "some declared extensions are not mapped",
};

/** Returns a plain-language caveat for a line with an active audit issue/gap. */
export function getKnownIssueNotice(lineIds: readonly string[]): string | null {
  const affected = [...new Set(lineIds)].filter((lineId) => LINE_NOTICES[lineId]);
  if (affected.length === 0) return null;

  const details = affected.map((lineId) => LINE_NOTICES[lineId]);
  return `Data incomplete for this line: ${details.join("; ")}.`;
}
