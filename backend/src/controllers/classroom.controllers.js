import db from "../db/db.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js";
const createClassroom = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, description } = req.body;

    if (!name) {
        throw new apiError(400, "Classroom name is required");
    }

    const user = await db.query(
        "SELECT * FROM users WHERE id = $1",
        [userId]
    );

    if (user.rows.length === 0) {
        throw new apiError(404, "User not found");
    }

    if (user.rows[0].role !== "teacher") {
        throw new apiError(403, "You are unauthorized to create classroom");
    }

    const joinCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    const result = await db.query(
        "INSERT INTO classrooms (name, description, teacher_id, join_code) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, description, userId, joinCode]
    );

    
    await db.query(
  "INSERT INTO classroom_members (classroom_id, user_id) VALUES ($1, $2)",
  [result.rows[0].id, userId]
)

    return res.status(201).json(
        new apiResponse(
            201,
            { classroom: result.rows[0] },
            `${name} class created successfully`
        )
    );
});

const joinClassroom = asyncHandler(async(req,res)=>{
    const userId = req.user.id;
    const join_code = req.body.joinCode ;

    if(!join_code){
        throw new apiError(400,"code to join is required ");
    }

    const classroom = await db.query("select * from  classrooms where join_code = $1  ",[
        join_code
    ]);

    if(classroom.rows.length ===0){
        throw new apiError(404,"the given code classroom doesn't exist");
    }

    const  user = await  db.query("select * from users where id = $1",[
        userId
    ]);

    if(user.rows.length === 0){
        throw new apiError(404,"user not found ")
    }

    if(user.rows[0]?.role?.toLowerCase() === "teacher"){
        throw new apiError(403," the user is not allowed to enter the classroom ");
    }

    const classJoined = await db.query("select * from classroom_members where user_id = $1 and classroom_id = $2 ",[
        userId,
        classroom.rows[0].id
    ])

    if(classJoined.rows.length > 0 ){
        throw new apiError(409,"the user have already joined ");
    }
    
    const classJoin = await db.query("insert into classroom_members (classroom_id,user_id) values($1,$2) returning *",[
        classroom.rows[0].id,
        userId
    ]);

    if(classJoin.rows.length === 0){
        throw new apiError(404,"there was error while joining class");
    }

    return res.status(200).json(
        new apiResponse(
            200,
            {
                classroom : classJoin.rows[0]
            },
            `${user.rows[0].username} joined ${classroom.rows[0].name} classroom sucessfully `
        )
    )
});

const getClassroomById = asyncHandler(async(req,res)=>{
    const userid = req.user.id;
    const classroomId = req.params.classroomId;

    if(!classroomId){
        throw new apiError(400,"classroom id is required")
    }

const classroomDetails = await db.query(
  `
  SELECT 
  c.name AS classroom_name,
  c.description,
  COUNT(cm.id) AS members_count,
    ARRAY_AGG(u.username) AS members
    FROM classrooms c
    LEFT JOIN classroom_members cm ON cm.classroom_id = c.id
    LEFT JOIN users u ON u.id = cm.user_id
    where c.id = $1
    GROUP BY c.id, c.name, c.description;
  `,[
    classroomId
  ]
);
     
    if(classroomDetails.rows.length === 0){
        throw new apiError(404,"classroom details not found ")
    }     

    return res.status(200).json(
        new apiResponse(200,
            {
            classroom:classroomDetails.rows[0], 
        },
        "classroom details fetched sucessfully",)
    )
})

const leaveClassroom = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const classroomId = req.params.classroomId;

  if (!classroomId) {
    throw new apiError(400, "classroom id is required");
  }

  const classroomExists = await db.query(
    `SELECT * FROM classrooms WHERE id = $1`,
    [classroomId]
  );

  if (classroomExists.rows.length === 0) {
    throw new apiError(404, "classroom doesn't exist");
  }

  const user = await db.query(
    `SELECT * FROM users WHERE id = $1`,
    [userId]
  );

  if (user.rows.length === 0) {
    throw new apiError(404, "user doesn't exist");
  }

  const role = user.rows[0].role.toLowerCase();

  // TEACHER → delete classroom
  if (role === "teacher") {
    if (classroomExists.rows[0].teacher_id !== userId) {
      throw new apiError(403, "Only teacher can delete this classroom");
    }

    await db.query(
      `DELETE FROM classrooms WHERE id = $1`,
      [classroomId]
    );

    return res.status(200).json(
      new apiResponse(200, {}, "Classroom deleted successfully")
    );
  }

  // STUDENT → leave classroom
  const membership = await db.query(
    `SELECT * FROM classroom_members 
     WHERE user_id = $1 AND classroom_id = $2`,
    [userId, classroomId]
  );

  if (membership.rows.length === 0) {
    throw new apiError(400, "User is not a member of this classroom");
  }

  await db.query(
    `DELETE FROM classroom_members 
     WHERE user_id = $1 AND classroom_id = $2`,
    [userId, classroomId]
  );

  return res.status(200).json(
    new apiResponse(200, {}, "Left classroom successfully")
  );
});

export {
    createClassroom,
    joinClassroom,
    getClassroomById,
    leaveClassroom
}