export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 px-4 py-10">
      <div className="absolute left-10 top-10 h-72 w-72 animate-pulse rounded-full bg-pink-400 opacity-30 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-72 w-72 animate-pulse rounded-full bg-blue-400 opacity-30 blur-3xl" />

      <section className="mx-auto w-full max-w-5xl rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
            <p className="inline-flex rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white/90">
              YOUTWEET
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">{subtitle}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90">Videos</div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90">Tweets</div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90">Creators</div>
            </div>
          </div>

          <div className="animate-[float_6s_ease-in-out_infinite] rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
            {children}
            {footer ? <div className="mt-4 text-sm text-white/75">{footer}</div> : null}
          </div>
        </div>
      </section>
    </main>
  )
}
