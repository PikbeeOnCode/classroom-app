import express from "express";
import cors from "cors";


import userRouter from "./src/routes/user.routes.js";
import postRouter from "./src/routes/post.routes.js";
import commentRouter from "./src/routes/comment.routes.js"
import likeRouter from "./src/routes/likes.routes.js"
import classroomRoutes from "./src/routes/classroom.routes.js"
import quizRoutes from"./src/routes/quiz.routes.js"
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments",commentRouter)
app.use("/api/v1/likes",likeRouter)
app.use("/api/v1/classrooms",classroomRoutes)
app.use("/api/v1/quizzes",quizRoutes)


export { app };
