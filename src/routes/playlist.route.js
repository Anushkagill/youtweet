import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, togglePlaylistPublicStatus, updatePlaylist } from "../controllers/playlist.controller.js";


const router = Router()

router.use(verifyJWT)

router.route("/create-playlist").post(createPlaylist)

router.route("/get-user-playlists").get(getUserPlaylists)

router.route("/add-video/:playlistId/:videoId").post(addVideoToPlaylist)

router.route("/remove-video/:playlistId/:videoId").patch(removeVideoFromPlaylist)

router.route("/toggle-public-status/:playlistId").patch(togglePlaylistPublicStatus)

router.route("/:playlistId")
    .get(getPlaylistById)
    .delete(deletePlaylist)
    .patch(updatePlaylist)

export default router