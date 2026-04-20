export function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  containerClassName = '',
  labelClassName = '',
  inputClassName = '',
  leadingIcon = null,
}) {
  return (
    <label htmlFor={id} className={`block text-left ${containerClassName}`}>
      <span className={`mb-2 block text-sm font-medium text-slate-700 ${labelClassName}`}>{label}</span>
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-sm text-white/70">
            {leadingIcon}
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border bg-white/80 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-300/30 ${
            leadingIcon ? 'pl-10' : ''
          } ${error ? 'border-rose-400' : 'border-slate-300/80'} ${inputClassName}`}
        />
      </div>
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  )
}
