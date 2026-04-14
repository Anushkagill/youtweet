import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiErrors} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


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

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
})

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
    getUserTweets,
    updateTweet,
    deleteTweet
}