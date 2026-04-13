import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req,res) => {
    const { page = 1, limit = 10 } = req.query//page 1 ka mtlb h by default page 1 hoga agr client ne page nhi bheja to, same for limit
    const { videoId } = req.params


    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const currentUserId = new mongoose.Types.ObjectId(req.user._id)

    const aggregatePipeline = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort: { createdAt: -1 }
        },

        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                //comment ke andar owner field h jisme user ka id h, users collection me _id field h, dono ko match krna h, aur matching user ko owner field me daal dena h
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            fullName: 1,
                            username: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },

        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "allLikes"
            }
            //comment ke andar _id field h, likes collection me comment field h, dono ko match krna h, aur matching likes ko allLikes field me daal dena h
        },

        {
            $addFields: {
                likesCount: { $size: "$allLikes" },
                //total likes count nikalne ke liye allLikes array ka size nikalna h
                likedStatus: {
                    $in: [currentUserId, "$allLikes.likedBy"]
                },
                //likedStatus nikalne ke liye check krna h ki current user id allLikes array ke likedBy field me h ya nhi, agar h to likedStatus true hoga, nhi to false
                editableStatus: {
                    $eq: ["$owner._id", currentUserId]
                }
                //editableStatus nikalne ke liye check krna h ki comment ke owner ka id current user id ke barabar h ya nhi, agar h to editableStatus true hoga, nhi to false
            }
        },

        {
            $project: {
                content: 1,
                video: 1,
                owner: 1,
                likesCount: 1,
                likedStatus: 1,
                editableStatus: 1,
                createdAt: 1
            }
        }
    ]

    const options = {
        page: Number(page),
        limit: Number(limit)
    }

    const comments = await Comment.aggregatePaginate(
        Comment.aggregate(aggregatePipeline),
        options
    )

    return res.status(200).json(
        new ApiResponse(200, comments, "Comments fetched successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }