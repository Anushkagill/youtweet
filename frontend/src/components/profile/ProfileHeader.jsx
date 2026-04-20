import { Button } from '../common/Button'

export function ProfileHeader({
  profile,
  isOwnProfile,
  onEditProfile,
  onOpenAccountSettings,
  onToggleSubscribe,
  isSubscribing = false,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div
        className="h-44 w-full bg-linear-to-r from-sky-300/50 via-cyan-200/40 to-emerald-200/50 sm:h-60"
        style={
          profile?.coverImage
            ? {
                backgroundImage: `url(${profile.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}
        }
      />

      <div className="flex flex-col gap-5 px-5 pb-6 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div className="-mt-14 flex items-end gap-5 sm:-mt-16">
          <img
            src={profile?.avatar || 'https://placehold.co/128x128?text=U'}
            alt={profile?.fullName || profile?.username || 'Profile'}
            onError={(event) => {
              event.currentTarget.src = '/default-avatar.png'
            }}
            className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-lg transition duration-300 hover:scale-[1.03] sm:h-32 sm:w-32"
          />

          <div className="space-y-1 pb-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {profile?.fullName || 'Unknown user'}
            </h1>
            <p className="text-sm font-medium text-slate-500">@{profile?.username || 'unknown'}</p>
            <p className="text-xs text-slate-400">{profile?.email || 'No email available'}</p>
          </div>
        </div>

        <div className="sm:pb-2 sm:self-end">
          {isOwnProfile ? (
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={onEditProfile}
                className="w-full sm:w-auto hover:shadow-lg"
              >
                Edit Profile
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onOpenAccountSettings}
                className="w-full sm:w-auto hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
              >
                Account Settings
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              loading={isSubscribing}
              onClick={onToggleSubscribe}
              variant={profile?.isSubscribed ? 'ghost' : 'primary'}
              className="w-full sm:w-auto"
            >
              {profile?.isSubscribed ? 'Subscribed' : 'Subscribe'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
