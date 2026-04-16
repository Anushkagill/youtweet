import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    // Validate channelId
    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    // exists because it only returns true/false dont fetch entire data or document so fast and easy
    const channelExists = await User.exists({ _id: channelId });
    if (!channelExists) {
        throw new ApiError(404, "Channel not found");
    }

    // 3. Get total subscribers
    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId
    });

    // 4. Aggregate video stats
    const [stats] = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId),
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likesData"
            }//Find all likes where:likes.video === video._id Attach them as array to each video document as "likesData"
        },
        {
            $addFields: {
                likesCount: { $size: "$likesData" }
            }
        },
        {
            $group: {
                _id: null,//its null because we want to group all videos together to get total stats
                totalVideos: { $sum: 1 },//sum:1 means count each document (video) +1 and give us total count of videos
                totalViews: { $sum: "$views" },
                totalLikes: { $sum: "$likesCount" }
            }
        }
    ]);


    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalVideos: stats?.totalVideos || 0,
                totalViews: stats?.totalViews || 0,
                totalLikes: stats?.totalLikes || 0,
                totalSubscribers
            },
            "Channel stats fetched successfully"
        )
    );
});