import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiErrors} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
        throw new ApiErrors(400, "Playlist name is required");
    }

    const owner = req.user?._id;

    if (!owner) {
        throw new ApiErrors(401, "Unauthorized request");
    }

    try {
        const playlist = await Playlist.create({
            name: name.trim(),
            description: description ? description.trim() : "",
            owner
        });

        return res.status(201).json(
            new ApiResponse(
                201,
                playlist,
                "Playlist created successfully"
            )
        );

    } catch (error) {
        // 6. Handle duplicate playlist name error
        if (error.code === 11000) {
            throw new ApiErrors(409, "Playlist with same name already exists");
        }

        // 7. Handle unexpected errors
        throw new ApiErrors(
            500,
            error?.message || "Something went wrong while creating playlist"
        );
    }
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId, limit = 10, cursor } = req.query;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiErrors(400, "Invalid user id");
    }

    const matchStage = {
        owner: new mongoose.Types.ObjectId(userId)
    };

    if (!req.user || req.user._id.toString() !== userId) {
        matchStage.isPublic = true;
    }//  If user is not the owner, only fetch public playlists


    if (cursor) {
        matchStage.createdAt = {
            $lt: new Date(cursor)
        };//lt means less than, so we are fetching playlists which are created before the cursor date, this is for pagination, when client will send nextCursor in the request then we will fetch playlists which are created before that nextCursor date, this way we can fetch next set of playlists for pagination
    }

    //  Limit control (1–50)
    const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    // 7. Fetch playlists
    const playlists = await Playlist.find(matchStage)
        .sort({ createdAt: -1 })
        .limit(limitNumber)
        .select("name description isPublic totalVideos createdAt");


    const nextCursor =
        playlists.length === limitNumber
            ? playlists[playlists.length - 1].createdAt
            : null;


    return res.status(200).json(
        new ApiResponse(
            200,
            {
                playlists,
                nextCursor
            },
            "Playlists fetched successfully"
        )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;


    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiErrors(400, "Invalid playlist id");
    }

    const userId = req.user?._id;

    const [playlist] = await Playlist.aggregate([// Aggregate always returns an array
                                                // We destructure first element → single playlist

        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
                 // Convert string → ObjectId (MongoDB uses ObjectId internally)
                $or: [
                    { isPublic: true },
                    ...(userId ? [{ owner: new mongoose.Types.ObjectId(userId) }] : [])
                ]
                //ya to public h ya fr jo owner h wo hi request kar raha h, agar userId exist karta h to owner ke basis pe bhi match karega otherwise sirf public playlist hi match karega, isse hum ensure karte hai ki private playlist sirf owner hi access kar paye aur public playlist sabhi access kar paye
           //.... spread operator se agar userId exist karta h to owner ke basis pe bhi match karega otherwise wo part ignore ho jayega aur sirf public playlist hi match karega
            }
        },

        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
//sbse pehle playlistid ke jo videos ids hai unke basis pe videos collection me se matching videos
//  ko fetch karo aur unhe videos field me daal do, lekin hume videos ke sath sath unke owner ka 
// bhi data chahiye jisme username, fullName aur avatar ho, isliye hum $lookup ke andar pipeline
//  use karte hai jisme hum videos ke owner field ke basis pe users collection se matching user
//  ko fetch karte hai aur usme se username, fullName aur avatar ko select karte hai, isse hume 
// har video ke sath uske owner ka bhi data mil jayega
                pipeline: [
                    { $sort: { createdAt: -1 } },
//ab hume videos ko unke createdAt ke basis pe sort karna hai taki sabse naye video pehle aaye, iske liye hum $sort stage use karte hai jisme hum createdAt field ko descending order me sort karte hai
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
//har video ke owner field ke basis pe users collection se matching user ko fetch karo aur usme se
//  username, fullName aur avatar ko select karo taki hume har video ke sath uske owner ka bhi
//  data mil jaye
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
                    { $unwind: "$owner" },
//kyuki har video ka ek hi owner hota hai to hum $unwind stage use karte hai jisse owner array se nikal ke ek single object ban jata hai, isse hume har video ke sath uske owner ka data easily access kar sakte hai


                    {
                        $lookup: {
                            from: "comments",
                            localField: "_id",
                            foreignField: "video",
                            as: "comments"
                        }
                    },
//pehle humne playlist id se playlist k sare videos ki id match ki aur un videos ka video data 
//fetch kiya fr humne video se user data fetch kia match krke ki video ka owner kon h uski id se
//user id match kia fr ab hume har video ke sath uske comments ka data bhi chahiye, isliye hum $lookup stage use 
// karte hai jisme hum videos ke _id field ke basis pe comments collection se matching comments 
// ko fetch karte hai aur unhe comments field me daal dete hai, isse hume har video ke sath uske
//  comments ka bhi data mil jayega

                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "video",
                            as: "likes"
                        }
                    },
//similarly likes har video ki data bhi chahiye to hum ek aur $lookup stage use karte hai jisme hum 
// videos ke _id field ke basis pe likes collection se matching likes ko fetch karte hai aur unhe
//  likes field me daal dete hai, isse hume har video ke sath uske likes ka bhi data mil jayega

                    // 7. Add computed fields
                    {
                        $addFields: {
                            likesCount: { $size: "$likes" },
                            commentsCount: { $size: "$comments" },
                            likedStatus: userId
                                ? { $in: [new mongoose.Types.ObjectId(userId), "$likes.likedBy"] }
                                : false,
                            editableStatus: userId
                                ? { $eq: ["$owner._id", new mongoose.Types.ObjectId(userId)] }
                                : false
                        }
                    },

                    // 8. Clean response
                    {
                        $project: {
                            owner: 1,
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                            likesCount: 1,
                            commentsCount: 1,
                            likedStatus: 1,
                            editableStatus: 1
                        }
                    }
                ]
            }
        },

        // 9. Fetch playlist owner
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
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
        { $unwind: "$owner" }
    ]);

    // 10. Not found
    if (!playlist) {
        throw new ApiErrors(404, "Playlist not found or is private");
    }

    // 11. Response
    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}