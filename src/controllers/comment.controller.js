import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"
import {Like} from "../models/like.model.js"

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
    const { videoId } = req.params
    const { content } = req.body

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const videoExists = await Video.exists({ _id: videoId })

    if (!videoExists) {
        throw new ApiError(404, "Video not found")
    }

    if (!content || !content.trim()) {
        throw new ApiError(400, "Comment content is required")
    }

    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    })

    if (!comment) {
        throw new ApiError(500, "Failed to add comment")
    }
    
    // if we change owner of comment to full object instead of just id, we need to convert it to object first otherwise mongoose will automatically revert it back to id
    //while doing .create it creates mongoose document in which we cant overwrite its a fixed schema
    //to overwrite it we need to convert it to normal js object using toObject() method, then we can overwrite it and send it to frontend
    const commentObj = comment.toObject()

    commentObj.owner = {
        _id: req.user._id,
        username: req.user.username,
        fullName: req.user.fullName,
        avatar: req.user.avatar
    }

    commentObj.likesCount = 0
    commentObj.likedStatus = false
    commentObj.editableStatus = true

    return res.status(201).json(
        new ApiResponse(201, commentObj, "Comment added successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid comment id")
    }

    if (!content || !content.trim()) {
        throw new ApiError(400, "Content is required")
    }

    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: req.user._id
        },
        {
            content: content.trim()
        },
        {
            new: true
        }//findOneAndUpdate me pehle filter condition dete hai, jisme comment id aur owner id 
        // dono match hone chahiye, phir update operation dete hai, jisme content ko update karna
        //  hai, aur last me options dete hai, jisme new: true ka mtlb h ki updated document return
        //  karo, default me old document return hota h
    )

    if (!updatedComment) {
        throw new ApiError(404, "Comment not found or unauthorized")
    }

    const commentObj = updatedComment.toObject()

    const [likesCount, likedStatus] = await Promise.all([
        Like.countDocuments({ comment: updatedComment._id }),
        Like.exists({
            comment: updatedComment._id,
            likedBy: req.user._id
        })
    ])

    commentObj.likesCount = likesCount
    commentObj.likedStatus = !!likedStatus//likedStatus me ya to document milega ya nhi milega, agar mila to uska id hoga jo truthy hoga, aur agar nhi mila to null hoga jo falsy hoga, isliye !!likedStatus karke usko boolean me convert kar dete hai
    commentObj.editableStatus = true

    commentObj.owner = {
        _id: req.user._id,
        username: req.user.username,
        fullName: req.user.fullName,
        avatar: req.user.avatar
    }

    return res.status(200).json(
        new ApiResponse(200, commentObj, "Comment updated successfully")
    )
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