import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, deleteComment, getVideoComments, updateComment,addTweetComment,getTweetComments } from "../controllers/comment.controller.js";


const router = Router()

router.use(verifyJWT)

router.route("/video/:videoId")
    .get(getVideoComments)
    .post(addComment)

router.route("/:commentId")
    .patch(updateComment)
    .delete(deleteComment)

    router.route("/tweet/:tweetId")
  .get(getTweetComments)
  .post(addTweetComment)
export default router