export default function AdminPlaceholderPage({ title }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Placeholder</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{title}</h1>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Coming in later steps</span>
      </div>
      <p className="mt-6 max-w-2xl text-slate-600">
        This admin module is reserved for future implementation. Step 1 only establishes the protected route and layout foundation.
      </p>
    </div>
  );
}
