import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { User } from "../models/user.model.js"
import { Playlist } from "../models/playlist.model.js"

// Indexes defined in Mongoose schemas are NOT guaranteed to exist in MongoDB.
// If a required index (especially UNIQUE / compound UNIQUE) is missing,
// MongoDB will not enforce data rules and duplicates can be inserted.
// syncIndexes() ensures MongoDB actually has those indexes,
// so constraints like uniqueness work correctly and the app fails fast
// instead of silently corrupting data.

// We sync ONLY business-critical indexes (mainly UNIQUE / compound UNIQUE ones).
// Performance-only indexes(for eg: in comment model) are NOT synced to avoid risky drops and slow startups.

const syncCriticalIndexes = async() => {
    await Subscription.syncIndexes()
    await Like.syncIndexes()
    await User.syncIndexes()
    await Playlist.syncIndexes()
}

export {syncCriticalIndexes}