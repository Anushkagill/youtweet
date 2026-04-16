import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addToWatchHistory, getUserWatchHistory, removeFromWatchHistory } from "../controllers/watchHistory.controller.js";

const router = Router()

router.use(verifyJWT) // all watch history routes require authentication

router.route("/").get(getUserWatchHistory)
router.route("/:videoId").post(addToWatchHistory)
router.route("/:videoId").delete(removeFromWatchHistory)

export default router