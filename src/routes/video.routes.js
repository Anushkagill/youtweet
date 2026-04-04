import  {Router} from "express";
import { getAllVideos } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router();

router.get("/videos", verifyJWT, getAllVideos);

export default router;