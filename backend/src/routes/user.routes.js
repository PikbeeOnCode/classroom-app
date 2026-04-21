import { Router } from "express";
const router = Router();
import {
    registerUser,
    loginUser
} from "../controllers/users.controllers.js";

router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;