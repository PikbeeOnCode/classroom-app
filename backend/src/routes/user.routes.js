import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshTokenUser
} from "../controllers/users.controllers.js";

const router = Router();


router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyJwt, logoutUser);
router.post("/refresh-token", refreshTokenUser);

export default router;