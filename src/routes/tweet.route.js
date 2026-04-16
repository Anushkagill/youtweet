import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet, deleteTweet, getAllTweets, updateTweet } from "../controllers/tweet.controller.js";

const router = Router()

router.use(verifyJWT)

router.route("/").post(createTweet)

router.route("/allTweets").get(getAllTweets)

router.route("/:tweetId")
    .patch(updateTweet)
    .delete(deleteTweet)

export default router