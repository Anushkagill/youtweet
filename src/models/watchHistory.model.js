import { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const watchHistorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
  },
  {
    timestamps: true, 
  }
);

// Prevent duplicate entries (same user watching same video multiple times)
watchHistorySchema.index(
  { user: 1, video: 1 },
  { unique: true }
);

// Optimize "recent watch history" queries
watchHistorySchema.index(
  { user: 1, updatedAt: -1 }
);

// Add aggregate pagination support
watchHistorySchema.plugin(mongooseAggregatePaginate);

export const WatchHistory = model("WatchHistory", watchHistorySchema);