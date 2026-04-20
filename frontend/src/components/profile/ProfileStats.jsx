export function ProfileStats({
  subscribersCount = 0,
  subscribedCount = 0,
  totalVideos = 0,
  totalTweets = 0,
}) {
  const stats = [
    { label: 'Subscribers', value: subscribersCount },
    { label: 'Subscribed', value: subscribedCount },
    { label: 'Total Videos', value: totalVideos },
    { label: 'Total Tweets', value: totalTweets },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-4 sm:gap-4 sm:p-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
        >
          <p className="text-2xl font-bold leading-none text-slate-900">{stat.value}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-600">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  )
}
