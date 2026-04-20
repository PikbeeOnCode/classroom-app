import { Router } from "express";
const router = Router();
import {
    registerUser,
} from "../controllers/users.controllers.js";

router.post("/register", registerUser);

export default router;