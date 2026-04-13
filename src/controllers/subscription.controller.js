import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiErrors} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiErrors(400, "Invalid channel id")
    }

    const userId = req.user._id

    // Prevent self-subscription to avoid unnecessary database operations
    if (channelId === userId.toString()) {
        throw new ApiErrors(400, "You cannot subscribe to yourself")
    }

    //its the case 1 in case  if the channel is subscribed then we have to unsubscribe it 
    const deletedSubscription = await Subscription.findOneAndDelete({
        channel: channelId,
        subscriber: userId
    })

    if (deletedSubscription) {
        return res.status(200).json(
            new ApiResponse(200, { subscribed: false }, "Channel unsubscribed successfully")
        )
    }

    // its case 2 if the channel is not subscribed then we have to subscribe it
    try {
        await Subscription.create({
            channel: channelId,
            subscriber: userId
        })

        return res.status(200).json(
            new ApiResponse(200, { subscribed: true }, "Channel subscribed successfully")
        )

    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json(
                new ApiResponse(200, { subscribed: true }, "Already subscribed")
            )
        }

        throw new ApiErrors(500, "Internal server error while subscribing")
    }
})

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
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}