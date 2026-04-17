import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiErrors} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Like } from "../models/like.model.js";


const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiErrors(400, "Content cannot be empty");
    }

    if (!req.user?._id) {
        throw new ApiErrors(401, "Unauthorized");
    }

    if (content.trim().length > 280) {
        throw new ApiErrors(400, "Tweet cannot exceed 280 characters");
    }

    const tweet = await Tweet.create({
        owner: req.user._id,
        content: content.trim()
    });

    if (!tweet) {
        throw new ApiErrors(500, "Internal server error");
    }

    const responseTweet = tweet.toObject();

    responseTweet.likesCount = 0;
    responseTweet.likedStatus = false;
    responseTweet.editableStatus = true;
    responseTweet.owner = {
        _id: req.user._id,
        username: req.user.username,
        fullName: req.user.fullName,
        avatar: req.user.avatar
    };

    return res.status(201).json(
        new ApiResponse(201, responseTweet, "Tweet created successfully")
    );
});

const getAllTweets = asyncHandler(async (req, res) => {
    const { userId, limit = 10, cursor } = req.query;

    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedLimit)) {
        throw new ApiErrors(400, "Invalid limit value");
    }

    const limitNumber = Math.min(Math.max(parsedLimit, 1), 50);//range 1-50

    const matchStage = {};

    if (cursor) {
        const [cursorDateStr, cursorId] = cursor.split("_");
        const cursorDate = new Date(cursorDateStr);

        if (
            isNaN(cursorDate.getTime()) ||
            !cursorId ||
            !mongoose.Types.ObjectId.isValid(cursorId)
        ) {
            throw new ApiErrors(400, "Invalid cursor value");
        }

        matchStage.$or = [
            { createdAt: { $lt: cursorDate } },
            {
                createdAt: cursorDate,
                _id: { $lt: new mongoose.Types.ObjectId(cursorId) }
            }
        ];
    }

    if (userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new ApiErrors(400, "Invalid user id");
        }
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    const currentUserId = new mongoose.Types.ObjectId(req.user._id);

    const tweets = await Tweet.aggregate([
        { $match: matchStage },

        { $sort: { createdAt: -1, _id: -1 } },

        { $limit: limitNumber },

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
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "allLikes"
            }
        },

        {
            $addFields: {
                likesCount: { $size: "$allLikes" },
                likedStatus: {
                    $in: [currentUserId, "$allLikes.likedBy"]
                },
                editableStatus: {
                    $eq: ["$owner._id", currentUserId]
                }
            }
        },

        {
            $project: {
                owner: 1,
                content: 1,
                createdAt: 1,
                likesCount: 1,
                likedStatus: 1,
                editableStatus: 1
            }
        }
    ]);

    const lastTweet = tweets[tweets.length - 1];

    const nextCursor =
        tweets.length === limitNumber
            ? `${lastTweet.createdAt.toISOString()}_${lastTweet._id}`
            : null;

    return res.status(200).json(
        new ApiResponse(
            200,
            { tweets, nextCursor },
            "Tweets fetched successfully"
        )
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiErrors(400, "Invalid tweet id");
    }

    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiErrors(400, "Content is required");
    }

    if (!req.user?._id) {
        throw new ApiErrors(401, "Unauthorized");
    }

    const updatedTweet = await Tweet.findOneAndUpdate(
        {
            _id: tweetId,
            owner: req.user._id
        },
        {
            $set: { content: content.trim() }
        },
        {
            new: true
        }
    );

    if (!updatedTweet) {
        throw new ApiErrors(403, "Forbidden: Cannot update this tweet");
    }

    const responseTweet = updatedTweet.toObject();

    responseTweet.likesCount = await Like.countDocuments({
        tweet: updatedTweet._id
    });

    responseTweet.likedStatus = !!(await Like.exists({//!! to convert to boolean matlab true or false 
        tweet: updatedTweet._id,
        likedBy: req.user._id
    }));

    responseTweet.editableStatus = true;

    responseTweet.owner = {
        _id: req.user._id,
        username: req.user.username,
        fullName: req.user.fullName,
        avatar: req.user.avatar
    };

    return res.status(200).json(
        new ApiResponse(200, responseTweet, "Tweet updated successfully")
    );
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiErrors(400, "Invalid tweet id");
    }

    if (!req.user?._id) {
        throw new ApiErrors(401, "Unauthorized");
    }

    const deletedTweet = await Tweet.findOneAndDelete({
        _id: tweetId,
        owner: req.user._id
    });

    if (!deletedTweet) {
        throw new ApiErrors(404, "Tweet not found or forbidden");
    }

    await Like.deleteMany({
        tweet: deletedTweet._id
    });//delete all the likes associated with the deleted tweet

    return res.status(200).json(
        new ApiResponse(200, {}, "Tweet deleted successfully")
    );
});

export {
    createTweet,
    getAllTweets,
    updateTweet,
    deleteTweet
}