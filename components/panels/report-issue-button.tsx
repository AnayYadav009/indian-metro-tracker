"use client";

import React, { useMemo } from "react";
import { AlertCircle, ExternalLink } from "lucide-react";
import { buildDataCorrectionIssueUrl, type IssueTarget } from "@/lib/issue-url";

interface ReportIssueButtonProps {
  target: IssueTarget;
  className?: string;
}

export function ReportIssueButton({ target, className = "" }: ReportIssueButtonProps) {
  const issueUrl = useMemo(() => {
    return buildDataCorrectionIssueUrl(target);
  }, [target]);

  return (
    <a
      href={issueUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="report-issue-button"
      className={`group flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-900/90 hover:text-white ${className}`}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-amber-400/90 transition-transform group-hover:scale-110" />
        <span className="font-medium">Report an issue</span>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-slate-300">
        <span>GitHub</span>
        <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100" />
      </div>
    </a>
  );
}
