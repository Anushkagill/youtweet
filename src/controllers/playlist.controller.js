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
    const {userId} = req.params
    //TODO: get user playlists
})

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