export function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center gap-3 text-slate-700">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-sky-500" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
