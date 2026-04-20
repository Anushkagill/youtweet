import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
	getMySubscribedChannels,
	getSubscribedChannels,
	getSubscribedChannelsVideos,
	getUserChannelSubscribers,
	toggleSubscription
} from "../controllers/subscription.controller.js";


const router = Router()

router.use(verifyJWT)

router.route("/toggle/:channelId").post(toggleSubscription)

router.route("/channels").get(getMySubscribedChannels)

router.route("/videos").get(getSubscribedChannelsVideos)

router.route("/get-subscribers/:channelId").get(getUserChannelSubscribers)

router.route("/get-subscribed-channels/:subscriberId").get(getSubscribedChannels)


export default router