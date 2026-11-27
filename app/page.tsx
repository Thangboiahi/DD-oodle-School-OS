export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Phase 1 Foundation
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        DD-oodle School OS
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Core application foundation is active. Design system, authentication,
        and multi-tenant Supabase RLS modules are scheduled in upcoming Phase 1
        milestones.
      </p>
    </main>
  );
}
