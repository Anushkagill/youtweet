import express from "express";
import { generateCaption } from "../controllers/ai.controller.js";

const router = express.Router();

router.post("/generate-caption", generateCaption);

// test route (keep this)
router.get("/test", (req, res) => {
  res.send("AI route working");
});

export default router;