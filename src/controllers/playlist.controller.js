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
    const {playlistId} = req.params
    //TODO: get playlist by id
})

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