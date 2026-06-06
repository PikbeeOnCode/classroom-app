import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { Router } from "express";
import {
    deleteNote,
    getNotes,
    publishNotes
} from "../controllers/notes.controllers.js"


const router = Router();

router.post("/:classroomId/pnotes", verifyJwt, upload.single("file"),publishNotes);
router.get("/:classroomId/gnotes",verifyJwt,getNotes)
router.delete("/:noteId/dnotes",verifyJwt,deleteNote)
export default router