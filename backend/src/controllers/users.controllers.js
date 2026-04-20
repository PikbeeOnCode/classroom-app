import db from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";

const saltRounds = 10;

const registerUser = asyncHandler(async (req, res) => {
    const {username,email,password,teacherCode} = req.body;
    let role = req.body.role?.toLowerCase();
    if(role == "teacher"){
        const secret = process.env.TEACHER_SECRECT;
        if(teacherCode !== secret){
            throw new apiError(400,"Invalid teacher code")
        }
    }
    if(!role){
        role = "student";
    }

    if([username,email,password].some(field=>field?.trim()==="")){
       throw new apiError(400,"All fields are required");
   }

   const existingUser = await db.query("select * from users where email = $1",[email]);

   if(existingUser.rows.length > 0){
    throw new apiError(400,"User with this email already exists");
   }

   const hashedPassword = await bcrypt.hash(password,saltRounds);

   const newUser = await db.query("insert into users (username,email,password,role) values($1,$2,$3,$4) returning *",[username,email,hashedPassword,role])

   if(!newUser.rows[0]){
    throw new apiError(500,"Failed to create user");
   }

   res.status(201).json({
    success: true,
     user:{
        id: newUser.rows[0].id,
        name: newUser.rows[0].username,
        email: newUser.rows[0].email,
        role: newUser.rows[0].role     
    },
    message: "User registered successfully",
   })


    
})

export {
    registerUser
}