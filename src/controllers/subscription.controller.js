import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Video } from "../models/video.model.js"
import {ApiErrors} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiErrors(400, "Invalid channel id");
    }

    const userId = req.user._id;

    if (channelId === userId.toString()) {
        throw new ApiErrors(400, "You cannot subscribe to yourself");
    }

    // 🔹 Check if already subscribed (unsubscribe case)
    const deletedSubscription = await Subscription.findOneAndDelete({
        channel: channelId,
        subscriber: userId
    });

    let isSubscribed;

    if (deletedSubscription) {
        isSubscribed = false;
    } else {
        try {
            await Subscription.create({
                channel: channelId,
                subscriber: userId
            });
            isSubscribed = true;
        } catch (error) {
            if (error.code === 11000) {
                isSubscribed = true;
            } else {
                throw new ApiErrors(500, "Internal server error while subscribing");
            }
        }
    }

    // 🔥 IMPORTANT: count subscribers AFTER toggle
    const subscribersCount = await Subscription.countDocuments({
        channel: channelId
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                isSubscribed,
                subscribersCount // 🔥 THIS FIXES YOUR UI
            },
            isSubscribed
                ? "Channel subscribed successfully"
                : "Channel unsubscribed successfully"
        )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiErrors(400, "Invalid channel id")
    }

    const pipeline = [
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $sort: {
                createdAt: -1//latest subscriber will be on top
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                subscriber: 1
            }
        }
    ]

    const options = {
        page: Number(page),
        limit: Number(limit)
    }


    const subscribers = await Subscription.aggregatePaginate(
        Subscription.aggregate(pipeline),
        options
    )

    return res.status(200).json(
        new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!subscriberId || !mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiErrors (400, "Invalid subscriber id")
    }

    const pipeline = [
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
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
        {
            $unwind: "$channel"
        },
        {
            $project: {
                channel: 1
            }
        }
    ]

    const options = {
        page: Number(page),
        limit: Number(limit)
    }

    const subscribedChannels = await Subscription.aggregatePaginate(
        Subscription.aggregate(pipeline),
        options
    )

    return res.status(200).json(
        new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
    )
})

const getMySubscribedChannels = asyncHandler(async (req, res) => {
    const { page = 1, limit = 30 } = req.query
    const userId = req.user?._id

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiErrors(401, "Unauthorized")
    }

    const subscriptions = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            coverImage: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$channel"
        },
        {
            $replaceRoot: {
                newRoot: "$channel"
            }
        }
    ])

    const pageNumber = Math.max(1, Number(page) || 1)
    const limitNumber = Math.max(1, Number(limit) || 30)
    const start = (pageNumber - 1) * limitNumber
    const pagedChannels = subscriptions.slice(start, start + limitNumber)

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                channels: pagedChannels,
                page: pageNumber,
                limit: limitNumber,
                total: subscriptions.length
            },
            "Subscribed channels fetched successfully"
        )
    )
})

const getSubscribedChannelsVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 30 } = req.query
    const userId = req.user?._id

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiErrors(401, "Unauthorized")
    }

    const subscriptions = await Subscription.find({ subscriber: userId }).select("channel")
    const channelIds = subscriptions
        .map((item) => item.channel)
        .filter(Boolean)

    if (!channelIds.length) {
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    videos: [],
                    page: 1,
                    limit: Math.max(1, Number(limit) || 30),
                    total: 0
                },
                "Subscribed channels videos fetched successfully"
            )
        )
    }

    const pageNumber = Math.max(1, Number(page) || 1)
    const limitNumber = Math.max(1, Number(limit) || 30)
    const skip = (pageNumber - 1) * limitNumber

    const [videos, total] = await Promise.all([
        Video.aggregate([
            {
                $match: {
                    ownerofvideo: { $in: channelIds.map((id) => new mongoose.Types.ObjectId(id)) },
                    isPublished: true
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $skip: skip
            },
            {
                $limit: limitNumber
            },
            {
                $lookup: {
                    from: "users",
                    localField: "ownerofvideo",
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
            {
                $addFields: {
                    owner: { $first: "$owner" }
                }
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    thumbnail: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1,
                    owner: 1,
                    ownerofvideo: 1
                }
            }
        ]),
        Video.countDocuments({
            ownerofvideo: { $in: channelIds },
            isPublished: true
        })
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                videos,
                page: pageNumber,
                limit: limitNumber,
                total
            },
            "Subscribed channels videos fetched successfully"
        )
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
    getMySubscribedChannels,
    getSubscribedChannelsVideos
}