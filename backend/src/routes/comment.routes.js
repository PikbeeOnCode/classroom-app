import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
     createComment,
     replyToComment,
     deletecomment,
}from "../controllers/comments.controllers.js"

const router = Router();

router.post("/create/:postId",verifyJwt,createComment);

router.post("/:commentId/reply",verifyJwt,replyToComment);

router.delete("/delete/:commentId",verifyJwt,deletecomment)





export default router ;