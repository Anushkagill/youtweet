import { motion } from 'framer-motion'

const PROFILE_TABS = [
  { key: 'videos', label: 'Videos' },
  { key: 'tweets', label: 'Tweets' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'history', label: 'History' },
]

export function ProfileTabs({ activeTab, setActiveTab }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-2 pt-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
      {PROFILE_TABS.map((tab) => {
        const isActive = activeTab === tab.key

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative rounded-t-xl px-4 py-2.5 text-sm font-medium transition ${
              isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="relative z-10">{tab.label}</span>

            {isActive ? (
              <motion.span
                layoutId="profile-active-tab-underline"
                className="absolute -bottom-px left-2 right-2 z-10 h-0.5 rounded-full bg-rose-500"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            ) : null}
          </button>
        )
      })}
      </div>
    </div>
  )
}
