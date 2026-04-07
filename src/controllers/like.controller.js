import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiErrors} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Comment} from "../models/comment.model.js"
import {Tweet} from "../models/tweet.model.js"
import {Video} from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if (!req.user?._id) {
    throw new ApiErrors(401, "Unauthorized");
}
    const userId = req.user?._id;
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiErrors(400, "Invalid video ID");
    }
    const videoExists = await Video.exists({_id: videoId})
    if(!videoExists){
        throw new ApiErrors(404, "No video found")
    }
    const removedLike = await Like.findOneAndDelete({
        video: videoId,
        likedBy: userId
    });
     if (removedLike) {
        return res.status(200).json(
            new ApiResponse(200, { liked: false }, "Video unliked successfully")
        );
    }
    /*await Like.create(...) can throw a duplicate key error if two requests hit at the same time, user double-clicks quickly so to 
    handle this we wrap it in try catch*/
    //It is known as race-condition and its error code is 11000
    try {
        await Like.create({
            video: videoId,
            likedBy: userId
        });

        return res.status(200).json(
            new ApiResponse(200, { liked: true }, "Video liked successfully")
        );
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json(
                new ApiResponse(200, { liked: true }, "Already liked")
            );
        }

        throw new ApiErrors(500, "Error toggling video like");
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if (!req.user?._id) {
    throw new ApiErrors(401, "Unauthorized");
}
    const userId = req.user?._id;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiErrors(400, "Invalid comment ID");
    }
    const commentExists = await Comment.exists({_id: commentId})
    if(!commentExists){
        throw new ApiErrors(404, "No comment found")
    }


    const removedcommentLike = await Like.findOneAndDelete({
        comment: commentId,
        likedBy: userId
    });
    /* so yaha p hmare pas do result aa skte h ya to like mili ni mtlb unlike thi ab like create krni h 
    ya like milgai ab unlike krni h so if removedcommentlike is not null mtlb like milgai thi
    ab unlike kr rhe h next step*/
    if (removedcommentLike) {
        return res.status(200).json(
            new ApiResponse(200, { liked: false }, "Comment unliked successfully")
        );
    }
    /*agr unlike mili ab like krni h to do error aa skte h ya to like create to hojae but double
    click krne p duplicate key error aa skta h so usko handle krne k liye try catch me rkhna h ya to 
    like create hojaye ya to duplicate key error aa jaye dono case me like true hi rhega*/
    try {
        await Like.create({
            comment: commentId,
            likedBy: userId
        });

        return res.status(200).json(
            new ApiResponse(200, { liked: true }, "Comment liked successfully")
        );
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json(
                new ApiResponse(200, { liked: true }, "Already liked")
            );
        }

        throw new ApiErrors(500, "Error toggling comment like");
    }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if (!req.user?._id) {
    throw new ApiErrors(401, "Unauthorized");
}
    const userId = req.user?._id;

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiErrors(400, "Invalid tweet ID");
    }
    const tweetExists = await Tweet.exists({_id: tweetId})
    if(!tweetExists){
        throw new ApiErrors(404, "No tweet found")
    }
        const removedTweetLike = await Like.findOneAndDelete({  
        tweet: tweetId,
        likedBy: userId
    });
    if (removedTweetLike) {
        return res.status(200).json(
            new ApiResponse(200, { liked: false }, "Tweet unliked successfully")
        );
    }
    try {
        await Like.create({ 
            tweet: tweetId,
            likedBy: userId
        }); 
        return res.status(200).json(
            new ApiResponse(200, { liked: true }, "Tweet liked successfully")
        );
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json(
                new ApiResponse(200, { liked: true }, "Already liked")
            );
        }   
        throw new ApiErrors(500, "Error toggling tweet like");
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
})



export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}