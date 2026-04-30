import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
    toggleCommentLike,
    togglePostLike
}from "../controllers/likes.controllers.js"


const router = Router();

router.post("/postlike/:postId",verifyJwt,togglePostLike)

router.post("/commentlike/:commentId",
    verifyJwt,
    toggleCommentLike
)

export default router