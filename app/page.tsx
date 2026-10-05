export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-slate-950 p-6 text-slate-100 md:p-24">
      <div className="z-10 flex w-full max-w-5xl items-center justify-between font-mono text-sm">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-slate-800 bg-gradient-to-b from-slate-900 pb-6 pt-8 backdrop-blur-2xl md:static md:w-auto md:rounded-xl md:border md:bg-slate-900/60 md:p-4">
          <span className="font-semibold text-emerald-400">Milestone 1</span>
          <span className="mx-2 text-slate-500">•</span>
          <span>Setup &amp; Boilerplate</span>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-slate-950 via-slate-950 md:static md:h-auto md:w-auto md:bg-none">
          <span className="inline-flex items-center rounded-full bg-emerald-950/80 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-600/30">
            Static Export Configured
          </span>
        </div>
      </div>

      <div className="my-16 max-w-2xl space-y-6 text-center">
        <h1 className="bg-gradient-to-r from-blue-400 via-emerald-400 to-indigo-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-6xl">
          Indian Metro Network Tracker
        </h1>
        <p className="text-lg leading-relaxed text-slate-400 md:text-xl">
          An interactive map visualizer tracking operational,
          under-construction, and planned metro transit systems across all
          Indian metropolitan cities.
        </p>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-300">
          <span>Map Canvas (Milestone 2) launching next</span>
        </div>
      </div>

      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-base font-semibold text-slate-200">Tech Stack</h2>
          <p className="text-sm text-slate-400">
            Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, MapLibre GL
            JS, Zustand, and Zod.
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-base font-semibold text-slate-200">
            Testing &amp; CI/CD
          </h2>
          <p className="text-sm text-slate-400">
            Unit testing with Vitest, E2E ready with Playwright, and zero-cost
            deployment to GitHub Pages.
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-base font-semibold text-slate-200">
            Data Architecture
          </h2>
          <p className="text-sm text-slate-400">
            Contiguous segment modeling (LineStrings) with independent phase and
            status metadata.
          </p>
        </div>
      </div>

      <footer className="mt-12 text-center text-xs text-slate-500">
        Indian Metro Network Tracker • Built strictly to BLUEPRINT.md &amp;
        MILESTONES.md specifications
      </footer>
    </main>
  );
}
