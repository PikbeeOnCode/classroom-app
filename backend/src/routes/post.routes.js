import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    createPosts,
    getPostById,
    getAllPosts,
    updatePosts,
    deletePost
}from "../controllers/post.controllers.js";

const router = Router();

router.post("/", verifyJwt, upload.single("image"), createPosts);
router.get("/allposts", getAllPosts); 
router.get("/:postId", verifyJwt, getPostById); 
router.patch("/updatepost/:postId",verifyJwt,upload.single("image"),updatePosts);
router.delete("/delete/:postId",verifyJwt,deletePost)





export default router;

