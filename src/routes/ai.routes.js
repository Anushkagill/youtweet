import express from "express";
import { generateCaption } from "../controllers/ai.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/generate-caption", verifyJWT, generateCaption);

export default router;