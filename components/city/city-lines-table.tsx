"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import type { CityPageLine } from "@/lib/city-page-data";

export function CityLinesTable({ cityId, lines }: { cityId: string; lines: CityPageLine[] }) {
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  return (
    <table data-testid="city-lines-table" className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-300">
          {[["Line", "py-3 px-4"], ["Operator", "py-3 px-3"], ["Status", "py-3 px-3"], ["Terminals / Topology", "py-3 px-3"], ["Length", "py-3 px-3 text-right"], ["Stations", "py-3 px-4 text-right"]].map(([label, className]) => <th key={label} scope="col" className={`${className} font-semibold`}>{label}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/60">
        {lines.map((line) => {
          const expanded = expandedLine === line.id;
          return <Fragment key={line.id}>
            <tr tabIndex={0} aria-expanded={expanded} onClick={() => setExpandedLine(expanded ? null : line.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setExpandedLine(expanded ? null : line.id); } }} className="group cursor-pointer transition-colors hover:bg-slate-800/40 focus-visible:outline-none focus-visible:bg-slate-800/50">
              <td className="py-3 px-4 font-medium text-white"><div className="flex items-center gap-2.5"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: line.color }} aria-hidden="true" /><div><div className="font-semibold text-slate-100">{line.officialName}</div>{line.officialName !== line.name && <div className="text-[11px] text-slate-400">{line.name}</div>}</div></div></td>
              <td className="py-3 px-3 text-slate-300">{line.operator}</td>
              <td className="py-3 px-3"><span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold capitalize ${line.status === "operational" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : line.status === "construction" ? "border-amber-500/30 bg-amber-500/15 text-amber-300" : "border-sky-500/30 bg-sky-500/15 text-sky-300"}`}>{line.status === "construction" ? "Under Construction" : line.status}</span></td>
              <td className="py-3 px-3 text-slate-300">{line.terminals.length ? line.terminals.join(" ↔ ") : line.topology === "loop" ? <span className="italic text-slate-400">Circular Ring Loop</span> : <span className="text-slate-500">—</span>}</td>
              <td className="py-3 px-3 text-right font-medium text-slate-200">{line.lengthKm > 0 ? `${line.lengthKm} km` : "—"}</td>
              <td className="py-3 px-4 text-right font-medium text-slate-200"><span className="inline-flex items-center gap-1.5">{line.stationsCount}{expanded ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}</span></td>
            </tr>
            {expanded && <tr key={`${line.id}-stops`}><td colSpan={6} className="bg-slate-950/50 px-4 py-4">
              <div className="mb-3 overflow-x-auto pb-2"><div className="flex min-w-max items-start px-2">
                {line.stationNames.map((name, index) => <div key={`${line.id}-${index}`} className="flex items-start">
                  <div className="flex w-28 flex-col items-center text-center"><span className={`mt-0.5 h-3 w-3 rounded-full border-2 ${index === 0 || index === line.stationNames.length - 1 ? "border-white" : "border-slate-400"}`} style={{ backgroundColor: line.color }} /><span className="mt-1.5 max-w-28 text-[10px] leading-tight text-slate-300">{name}</span></div>
                  {index < line.stationNames.length - 1 && <span className="mt-1 h-1 w-8 rounded-full" style={{ backgroundColor: `${line.color}99` }} aria-hidden="true" />}
                </div>)}
                {!line.stationNames.length && <span className="text-xs text-slate-400">Station sequence is not available for this line.</span>}
              </div></div>
              <Link href={`/?city=${encodeURIComponent(cityId)}&line=${encodeURIComponent(line.id)}`} className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"><MapPin className="h-3.5 w-3.5" />View line on interactive map</Link>
            </td></tr>}
          </Fragment>;
        })}
      </tbody>
    </table>
  );
}
