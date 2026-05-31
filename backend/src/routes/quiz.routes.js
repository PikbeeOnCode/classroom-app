import { verifyJwt } from "../middlewares/auth.middleware.js";
import { Router } from "express";
import {
     createQuiz,
     addQuestion,
     publishQuiz,
     getQuiz
     }from"../controllers/quiz.controllers.js"


const router = Router();

router.post("/create/:classroomId",verifyJwt,createQuiz);
router.post("/qadd/:quizId",verifyJwt,addQuestion);
router.patch("/publishq/:quizId",verifyJwt,publishQuiz)
router.get("/getq/:quizId",verifyJwt,getQuiz)

export default router