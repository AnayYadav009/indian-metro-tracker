import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Info,
  BarChart3,
} from "lucide-react";
import { getAllCities, getCityPageData } from "@/lib/city-page-data";
import { generateCityMetadata, generateCityJsonLd } from "@/lib/city-seo";
import { CityDataNotice } from "@/components/city/city-data-notice";
import { CityLinesTable } from "@/components/city/city-lines-table";
import { ReportIssueButton } from "@/components/panels/report-issue-button";

interface CityPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return getAllCities().map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { id } = await params;
  return generateCityMetadata(id);
}

export default async function CityPage({ params }: CityPageProps) {
  const { id } = await params;
  const data = getCityPageData(id);
  if (!data) notFound();

  const {
    city,
    stats,
    lines,
    openingYearRange,
    hasAtLeast80PercentOpened,
    openedStationsCount,
    isUnderConstructionOnly,
  } = data;
  const jsonLd = generateCityJsonLd(id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Schema.org JSON-LD structured data */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/?city=${city.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white"
              title="Return to Interactive Map"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Map</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <span className="text-xs text-slate-400 hidden sm:inline">
              Cities / {city.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/?city=${city.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition-colors hover:bg-emerald-500"
              title={`View ${city.name} on the live map`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Explore Map</span>
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white"
              title="Compare all 21 Indian metro networks"
            >
              <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Compare</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* City Title and Basic Meta */}
          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                {city.name} Metro Network
              </h1>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                  stats.tier === 1
                    ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                    : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                }`}
              >
                Tier {stats.tier}
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-3xl">
              {isUnderConstructionOnly
                ? `${city.name} transit network is currently under construction with ${stats.constructionKm} km across ${stats.linesCount} ${stats.linesCount === 1 ? "line" : "lines"} and 0 operational stations.`
                : `${city.name} transit network includes ${stats.operationalKm} km operational across ${stats.linesCount} ${stats.linesCount === 1 ? "line" : "lines"} and ${stats.operationalStations} operational stations.`}
            </p>
          </section>

          {/* Under-Construction Only Notice (e.g. Surat) */}
          {isUnderConstructionOnly && (
            <div
              data-testid="zero-operational-notice"
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3"
            >
              <Info className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-100">
                  Network Under Construction
                </p>
                <p className="text-amber-200/90">
                  No stations or lines are currently open in {city.name}. All {stats.totalStations} stations and {stats.constructionKm} km of alignment are actively being built.
                </p>
              </div>
            </div>
          )}

          <CityDataNotice
            caveat={stats.hasCompletenessCaveat ? stats.completenessCaveatText ?? undefined : undefined}
            lengthNote={stats.hasLengthMismatch ? stats.lengthMismatchNote ?? undefined : undefined}
            variance={stats.lengthVariancePercent ?? undefined}
            provenance={city.provenance}
          />

          <div className="w-full sm:w-fit">
            <ReportIssueButton
              target={{
                type: "city",
                data: {
                  cityId: city.id,
                  cityName: city.name,
                  provenance: city.provenance,
                },
              }}
            />
          </div>

          {/* Network Key Metrics Grid */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="text-[11px] font-medium text-slate-400">Operational</div>
              <div className="text-xl font-bold text-emerald-400">
                {stats.operationalKm} <span className="text-xs font-normal text-slate-400">km</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {stats.operationalStations} stations
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="text-[11px] font-medium text-slate-400">Under Const.</div>
              <div className="text-xl font-bold text-amber-400">
                {stats.constructionKm} <span className="text-xs font-normal text-slate-400">km</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {stats.constructionStations} stations
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="text-[11px] font-medium text-slate-400">Planned</div>
              <div className="text-xl font-bold text-sky-400">
                {stats.plannedKm} <span className="text-xs font-normal text-slate-400">km</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {stats.plannedStations} stations
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="text-[11px] font-medium text-slate-400">Lines</div>
              <div className="text-xl font-bold text-white">
                {stats.linesCount}
              </div>
              <div className="text-[11px] text-slate-400">corridors mapped</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="text-[11px] font-medium text-slate-400">Interchanges</div>
              <div className="text-xl font-bold text-white">
                {stats.interchangesCount}
              </div>
              <div className="text-[11px] text-slate-400">transfer hubs</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="text-[11px] font-medium text-slate-400">Opening Years</div>
              <div
                className={`font-bold text-white ${
                  hasAtLeast80PercentOpened ? "text-lg" : "text-xs leading-snug"
                }`}
                title={openingYearRange ?? "No dates recorded"}
              >
                {openingYearRange ?? "—"}
              </div>
              <div className="text-[11px] text-slate-400">
                {hasAtLeast80PercentOpened
                  ? "≥80% stations verified"
                  : openedStationsCount > 0
                  ? "<80% stations dated"
                  : "no dates recorded"}
              </div>
            </div>
          </section>

          {/* Lines & Corridors Table */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Lines & Corridors
              </h2>
              <span className="text-xs text-slate-400">
                {lines.length} {lines.length === 1 ? "line" : "lines"}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
              <CityLinesTable cityId={city.id} lines={lines} />
            </div>
          </section>

          {/* Quick Action Navigation Buttons */}
          <section className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href={`/?city=${city.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-emerald-500"
            >
              <MapPin className="h-4 w-4" />
              <span>Open {city.name} on Interactive Map</span>
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-white"
            >
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <span>Compare with All Cities</span>
            </Link>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 px-4 py-6 text-center text-xs text-slate-400 md:px-8">
        <p>
          Data verified from transit agency publications and OpenStreetMap vectors. Free and open data under ODbL.
        </p>
      </footer>
    </div>
  );
}
