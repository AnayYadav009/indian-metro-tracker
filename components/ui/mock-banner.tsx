"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { DATA_SOURCE, getMockCityNames } from "@/lib/data";

interface MockBannerProps {
  className?: string;
}

export function MockBanner({ className = "" }: MockBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Render for both "mock" and "mixed" datasets
  if (DATA_SOURCE === "real" || dismissed) {
    return null;
  }

  const isMixed = DATA_SOURCE === "mixed";
  const mockCities = isMixed ? getMockCityNames() : [];

  return (
    <aside
      data-testid="mock-data-banner"
      aria-label="Mock data disclaimer"
      className={`z-30 flex items-center justify-between border-b border-amber-500/30 bg-amber-950/80 px-4 py-2 text-xs font-medium text-amber-200 backdrop-blur-md transition-all ${className}`}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
        <span>
          <strong className="font-semibold text-amber-300">Notice:</strong>{" "}
          {isMixed ? (
            <>
              Some cities{" "}
              {mockCities.length > 0 ? `(${mockCities.join(", ")})` : ""}{" "}
              currently use illustrative mock data while real data pipeline onboarding is in progress.
            </>
          ) : (
            "Network data is illustrative mock data."
          )}
        </span>
      </div>

      <button
        type="button"
        data-testid="dismiss-mock-banner"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss mock data warning"
        className="ml-3 flex h-5 w-5 items-center justify-center rounded text-amber-400/80 transition-colors hover:bg-amber-900/60 hover:text-amber-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
}
