import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiErrors} from "../utils/ApiErrors.js"
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
    if (!req.user?._id) {
        throw new ApiErrors(401, "Unauthorized");
    }

    const { cursor, limit = 12 } = req.query;
    //limit means number of videos we want to fetch in one request and cursor is the createdAt timestamp of the last video in the previous batch, it is used to fetch the next set of videos that were liked before that timestamp.

    // limit safety (1–20) to prevent abuse and ensure optimal performance. It ensures that the number of videos fetched in a single request is within a reasonable range, preventing excessive load on the server and improving response times for users.
    const limitNumber = Math.min(Math.max(Number(limit), 1), 20);

    // base filter
    const matchStage = {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true }
    };
    //new mongoose.types.object isiliyeh kyuki req.user._id string me h aur hme ise object 
    // id me convert krna h taki hum ise like model me query kr ske

    // cursor-based pagination
    if (cursor) {
        matchStage.createdAt = { $lt: new Date(cursor) };
    }
    //its here mentioned ki specific created at se pehle wale videos ko fetch krna h, kyuki 
    // cursor me hme last video ka created at timestamp milega aur hme usse pehle wale videos ko fetch krna h

    const likedVideos = await Like.aggregate([
        {
            $match: matchStage
        },
        {
            $sort: { createdAt: -1 }//yeh ensure krta h ki sabse pehle wo videos aaye jo recently liked hue h, kyuki humne createdAt ko descending order me sort kiya h
        },
        {
            $limit: limitNumber
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",//like me se video ki id ko videos collection ke _id se match krke video ka data laega aur usko video field me store kr dega
                //data array me aayega kyuki ek like me ek hi video hoga to uske baad hum $unwind krke ise object me convert kr denge
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            //further lookup kyuki ab video ka data mila h or ab video se user ka dta alana h
                            //ab hme video ke owner ka data chahiye to hum owner field ko users collection ke _id se match krke owner field me store kr denge

                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1
                                    }
                                    //now we have full data but we need to project only specific fields like username, fullName and avatar so we use project stage to select only those fields and exclude the rest of the data, this helps in reducing the amount of data sent in the response and improves performance.
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$owner"
                    },
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            owner: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$video"
        },
        {
            $project: {
                video: 1,
                createdAt: 1
            }
        }
    ]);

    const nextCursor =
        likedVideos.length > 0
            ? likedVideos[likedVideos.length - 1].createdAt
            : null;

    return res.status(200).json(
        new ApiResponse(200, {
            likedVideos,
            nextCursor,
            hasMore: likedVideos.length === limitNumber
        }, "Liked videos fetched successfully")
    );
});



export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}