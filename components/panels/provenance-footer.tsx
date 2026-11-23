import React from "react";
import type { Provenance } from "@/types/schema";
import { ExternalLink, ShieldAlert, CheckCircle2, HelpCircle } from "lucide-react";

export interface ProvenanceSectionItem {
  label?: string; // e.g. "Line", "City", or line name
  provenance?: Provenance | null;
}

export interface ProvenanceFooterProps {
  provenance?: Provenance | null;
  items?: ProvenanceSectionItem[];
  className?: string;
  testId?: string;
}

export function ProvenanceFooter({
  provenance,
  items,
  className = "",
  testId = "provenance-footer",
}: ProvenanceFooterProps) {
  const resolvedItems: ProvenanceSectionItem[] = [];
  if (items && items.length > 0) {
    resolvedItems.push(...items);
  } else if (provenance) {
    resolvedItems.push({ provenance });
  } else {
    resolvedItems.push({ provenance: { status: "unverified" } });
  }

  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case "verified":
        return {
          label: "Verified",
          badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
          icon: CheckCircle2,
        };
      case "schematic":
        return {
          label: "Schematic",
          badgeClass: "border-violet-500/30 bg-violet-500/10 text-violet-300",
          icon: HelpCircle,
        };
      case "unverified":
      default:
        return {
          label: "Unverified",
          badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-300",
          icon: ShieldAlert,
        };
    }
  };

  return (
    <footer
      data-testid={testId}
      className={`mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-2 ${className}`}
    >
      <div className="flex flex-col gap-1.5">
        {resolvedItems.map((item, idx) => {
          const prov = item.provenance || { status: "unverified" };
          const statusInfo = getStatusDisplay(prov.status);
          const Icon = statusInfo.icon;

          return (
            <div
              key={idx}
              data-testid={`provenance-item-${idx}`}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1.5">
                {item.label && (
                  <span className="text-slate-400 font-medium">{item.label}:</span>
                )}
                <span
                  data-testid="provenance-status-badge"
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusInfo.badgeClass}`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{statusInfo.label}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  data-testid="provenance-last-verified"
                  className="text-slate-400"
                >
                  {prov.last_verified
                    ? `Verified ${prov.last_verified}`
                    : "Not verified"}
                </span>
                {prov.source_url ? (
                  <a
                    href={prov.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="provenance-source-link"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                  >
                    <span>Source</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span
                    data-testid="provenance-no-source"
                    className="text-slate-500 italic"
                  >
                    No official source link
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p
        data-testid="provenance-disclaimer-notice"
        className="text-[11px] leading-relaxed text-slate-400 italic"
      >
        Unofficial data. Estimates only. Check with the operator before you travel.
      </p>
    </footer>
  );
}
