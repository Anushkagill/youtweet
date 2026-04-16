import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { WatchHistory } from "../models/watchHistory.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";

const addToWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiErrors(400, "Invalid video id");
    }

    const userId = req.user?._id;

    if (!userId) {
        throw new ApiErrors(401, "Unauthorized request");
    }

    const videoExists = await Video.exists({ _id: videoId });
    if (!videoExists) {
        throw new ApiErrors(404, "Video not found");
    }

    // 3. Upsert (IMPORTANT)

    const historyEntry = await WatchHistory.findOneAndUpdate(
        {
            user: userId,
            video: new mongoose.Types.ObjectId(videoId)
        },
        {
            $set: {
                user: userId,
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            upsert: true, // create if not exists
            //upset means if the document find update otherwise create new entry
            new: true     // return updated doc
        }
    );

    // 4. Response
    return res.status(200).json(
        new ApiResponse(
            200,
            historyEntry,
            "Added to watch history"
        )
    );
});

const removeFromWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiErrors(400, "Invalid video id");
    }

    const userId = req.user?._id;

    if (!userId) {
        throw new ApiErrors(401, "Unauthorized request");
    }

    const deleted = await WatchHistory.findOneAndDelete({
        user: userId,
        video: new mongoose.Types.ObjectId(videoId)
    });


    if (!deleted) {
        throw new ApiErrors(404, "Video not found in watch history");
    }

 
    return res.status(200).json(
        new ApiResponse(200, {}, "Removed from watch history")
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const userId = req.user?._id;

    if (!userId) {
        throw new ApiErrors(401, "Unauthorized request");
    }

    const aggregatePipeline = [
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId)
            }
        },

        {
            $sort: { updatedAt: -1 }
        },

        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },

                    { $unwind: "$owner" },

                    {
                        $lookup: {
                            from: "comments",
                            localField: "_id",
                            foreignField: "video",
                            as: "comments"
                        }
                    },

                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "video",
                            as: "allLikes"
                        }
                    },

                    {
                        $addFields: {
                            commentsCount: { $size: "$comments" },
                            likesCount: { $size: "$allLikes" },
                            likedStatus: {
                                $in: [
                                    new mongoose.Types.ObjectId(userId),
                                    "$allLikes.likedBy"
                                ]
                            },
                            editableStatus: {
                                $eq: [
                                    "$owner._id",
                                    new mongoose.Types.ObjectId(userId)
                                ]
                            }
                        }
                    },

                    {
                        $project: {
                            owner: 1,
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            commentsCount: 1,
                            likesCount: 1,
                            likedStatus: 1,
                            editableStatus: 1
                        }
                    }
                ]
            }
        },

        { $unwind: "$video" },

        {
            $project: {
                video: 1,
                watchedAt: "$updatedAt"
            }
        }
    ];

    const history = await WatchHistory.aggregatePaginate(
        WatchHistory.aggregate(aggregatePipeline),
        {
            page: Number(page),
            limit: Number(limit)
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            history,
            "Watch history fetched successfully"
        )
    );
});

export {
    addToWatchHistory,
    removeFromWatchHistory,
    getUserWatchHistory
}