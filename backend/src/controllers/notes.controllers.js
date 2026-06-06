import db from "../db/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { uploadOnCloudinary,deleteImageFromCloudinary} from "../utils/Cloudinary.js";

const publishNotes = asyncHandler(async(req,res)=>{
    const userId = req.user.id;
    const classroomId = req.params.classroomId;
    const { title, description } = req.body
    const noteLocalPath  = req.file?.path;

    if(!userId){
        throw new apiError(404,"user id is required");
    }

    if(!classroomId){
        throw new apiError(404,"classroom id is required");
    }

    
    if(!noteLocalPath){
    throw new apiError(400, "file is required")
    }

       if([title,description].some(field=>field?.trim()==="")){
        throw new apiError(400,"All fields are required");
    };


    const classroom = await db.query(
    "SELECT * FROM classrooms WHERE id = $1", [classroomId]
    )

    if(classroom.rows.length === 0){
    throw new apiError(404, "classroom not found")
    }

    const isMember = await db.query(
    "SELECT 1 FROM classroom_members WHERE classroom_id=$1 AND user_id=$2",
    [classroomId, userId]
    )
    if(isMember.rows.length === 0){
    throw new apiError(403, "you are not a member of this classroom")
    }

 
      const mimeToType = {
        "application/pdf": "pdf",
        "text/plain": "txt",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
    }
  const fileType = mimeToType[req.file?.mimetype] || "unknown"

    console.log("noteLocalPath",noteLocalPath);

      const noteUrl = noteLocalPath ? (await uploadOnCloudinary(noteLocalPath))?.secure_url : null;

    console.log("noteUrl:", noteUrl);

        const newnote = await db.query(
            "insert into notes (title,description,file_url,uploaded_by,file_type,classroom_id) values($1,$2,$3,$4,$5,$6) returning *",[title,description,noteUrl,userId,fileType,classroomId]);

    if(newnote.rows.length === 0){
        throw new apiError(500,"Failed to upload note");
    };

    return res.status(201).
    json(new apiResponse(201,{note: newnote.rows[0]},"note created successfully"))
});

const getNotes = asyncHandler(async(req,res)=>{
    const userId = req.user.id;
    const classroomId = req.params.classroomId;

    
    if(!userId){
        throw new apiError(404,"user id is required");
    }

    if(!classroomId){
        throw new apiError(404,"classroom id is required");
    }

        const classroom = await db.query(
    "SELECT * FROM classrooms WHERE id = $1", [classroomId]
    )

    if(classroom.rows.length === 0){
    throw new apiError(404, "classroom not found")
    }

    const isMember = await db.query(
    "SELECT 1 FROM classroom_members WHERE classroom_id=$1 AND user_id=$2",
    [classroomId, userId]
    )
    if(isMember.rows.length === 0){
    throw new apiError(403, "you are not a member of this classroom")
    }

    const getNotes = await db.query(`select * from notes where classroom_id = $1 `,
        [
            classroomId
        ]
    );

    if(getNotes.rows.length === 0){
         throw new apiError(404,"no notes available")
    };

    return res.status(200).json(
        new apiResponse(
            200,
            {
                note:getNotes.rows[0]
            },
            "notes fetched sucessfully"
        )
    )

});

const deleteNote = asyncHandler(async(req, res) => {
  const userId = req.user.id
  const noteId = req.params.noteId

  const note = await db.query(
    "SELECT * FROM notes WHERE id = $1", [noteId]
  )

  if(note.rows.length === 0){
    throw new apiError(404, "note not found")
  }

  const isMember = await db.query(
    "SELECT 1 FROM classroom_members WHERE classroom_id=$1 AND user_id=$2",
    [note.rows[0].classroom_id, userId]
  )

  if(isMember.rows.length === 0){
    throw new apiError(403, "you are not a member of this classroom")
  }

  if(note.rows[0].uploaded_by !== userId){
    throw new apiError(403, "you can only delete your own notes")
  }

  await deleteImageFromCloudinary(note.rows[0].file_url)

  await db.query("DELETE FROM notes WHERE id = $1", [noteId])

  return res.status(200).json(
    new apiResponse(200, {}, "note deleted successfully")
  )
})




export {
    publishNotes,
    getNotes,
    deleteNote
    
}