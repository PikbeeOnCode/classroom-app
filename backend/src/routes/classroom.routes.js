import { verifyJwt } from "../middlewares/auth.middleware.js";
import { Router } from "express";
import {
    createClassroom,
    joinClassroom,
    getClassroomById,
    leaveClassroom
} from"../controllers/classroom.controllers.js"


const router = Router();

router.post("/create",verifyJwt,createClassroom);
router.post("/join",verifyJwt,joinClassroom)
router.get("/classdetails/:classroomId",verifyJwt,getClassroomById);
router.delete("/leave/:classroomId",verifyJwt,leaveClassroom);

export default router;