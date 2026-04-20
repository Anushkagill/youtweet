import { motion } from 'framer-motion'

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const baseClass =
    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

  const variants = {
    primary:
      'bg-linear-to-r from-sky-500 to-cyan-400 text-slate-950 shadow-lg shadow-sky-400/30 hover:from-sky-400 hover:to-cyan-300 focus-visible:ring-sky-500',
    ghost:
      'border border-slate-300/70 bg-white/60 text-slate-800 backdrop-blur hover:bg-white focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-700',
    premium:
      'bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold shadow-xl shadow-purple-800/35 hover:scale-105 hover:shadow-2xl hover:shadow-purple-900/40 focus-visible:ring-pink-400',
  }

  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      className={`${baseClass} ${variants[variant]} ${className}`}
      whileHover={disabled || loading ? {} : { y: -1 }}
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      {...props}
    >
      {loading ? 'Please wait...' : children}
    </motion.button>
  )
}
