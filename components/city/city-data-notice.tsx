"use client";

import { useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import type { Provenance } from "@/types/schema";
import { ProvenanceFooter } from "@/components/panels/provenance-footer";

interface CityDataNoticeProps {
  caveat?: string;
  lengthNote?: string;
  variance?: number;
  provenance?: Provenance | null;
}

export function CityDataNotice({ caveat, lengthNote, variance, provenance }: CityDataNoticeProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const showBanner = !dismissed && (caveat || lengthNote);

  return (
    <div className="space-y-4">
      {showBanner && (
        <section className="w-fit max-w-full rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200">
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>{caveat && lengthNote ? "Data notes" : caveat ? "Data notice" : "Length variance"}</span>
            <button type="button" onClick={() => setExpanded((open) => !open)} aria-expanded={expanded} className="rounded px-1.5 py-0.5 font-medium text-amber-100 underline decoration-amber-500/50 underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
              {expanded ? "Hide details" : "Details"}
            </button>
            <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss data notices" className="rounded p-0.5 text-amber-200/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {expanded && (
            <div className="space-y-2 border-t border-amber-500/20 px-3 py-2 text-xs text-slate-200">
              {caveat && <p data-testid="completeness-caveat-banner"><Info className="mr-1 inline h-3.5 w-3.5 text-amber-400" />{caveat}</p>}
              {lengthNote && <p data-testid="length-mismatch-banner"><strong className="text-amber-200">Official Length Variance ({variance}% Δ):</strong> {lengthNote}</p>}
            </div>
          )}
        </section>
      )}

      {/* Provenance footer for the city network */}
      <ProvenanceFooter
        items={[{ label: "City", provenance }]}
        testId="city-provenance-footer"
      />
    </div>
  );
}
