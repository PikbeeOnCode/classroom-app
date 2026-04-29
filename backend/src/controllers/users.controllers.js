import db from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const saltRounds = 10;
 const options ={
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
   }

const generateToken = async(userId)=>{
    try{
        const user = await db.query("select * from users where id = $1",[userId]);
        if(user.rows.length === 0){
            throw new apiError(404,"User not found");
        }

        const payload = {id: user.rows[0].id,email: user.rows[0].email,role: user.rows[0].role};

        const accessToken = jwt.sign(payload,process.env.ACCESS_TOKEN_SECRET,{expiresIn: process.env.ACCESS_TOKEN_EXPIRY});
        const refreshToken = jwt.sign(payload,process.env.REFRESH_TOKEN_SECRET,{expiresIn: process.env.REFRESH_TOKEN_EXPIRY});
        return { accessToken, refreshToken };
    }catch(error){
        throw new apiError(500,"Failed to generate token");
    }
}

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

    const {accessToken, refreshToken} = await generateToken(newUser.rows[0]?.id);

   if(!accessToken || !refreshToken){
    throw new apiError(500,"Failed to generate tokens");
   }

   const insertToken = await db.query("update users set refreshtoken = $1 where id = $2 returning *",[refreshToken,newUser.rows[0].id]);

   if(!insertToken.rows[0]){
    throw new apiError(500,"Failed to store refresh token");
   }

  

   res.status(201)
   .cookie("refreshToken", refreshToken, options)
   .cookie("accessToken", accessToken, options)
   .json(
    new apiResponse(
        201,
       {
        user:{
            id: newUser.rows[0].id,
            username: newUser.rows[0].username,
            email: newUser.rows[0].email,
            role: newUser.rows[0].role
         },
         accessToken,
         refreshToken
       }
       , "User registered successfully")
   )
});

const loginUser = asyncHandler(async (req, res) => {
    const {email,password} = req.body;

    if([email,password].some(field=>field?.trim()==="")){
        throw new apiError(400,"All fields are required");
    }

    const user = await db.query("select * from users where email = $1",[email]);
    
    if(user.rows.length === 0){
        throw new apiError(400,"Invalid email or password");
    }
    const validPassword = await bcrypt.compare(password,user.rows[0].password);

    if(!validPassword){
        throw new apiError(400,"Invalid email or password");
    }

    const { accessToken, refreshToken } = await generateToken(user.rows[0].id);
    if(!accessToken || !refreshToken){
        throw new apiError(500,"Failed to generate tokens");
    }

    const insertToken = await db.query("update users set refreshtoken = $1 where id = $2 returning *",[refreshToken,user.rows[0].id]);


    if(!insertToken.rows[0]){
        throw new apiError(500,"Failed to store refresh token");
    }
    const options ={
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    }
    res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json( new apiResponse(
        200,{
         user:{
            id: user.rows[0].id,
            username: user.rows[0].username,
            email: user.rows[0].email,
            role: user.rows[0].role
         },
         accessToken,
         refreshToken
        }
       ,
        "Login successful",
    ))
})

const logoutUser = asyncHandler(async (req, res) => {
    const user = req.user;

    await db.query("update users set refreshtoken = null where id = $1",[user.id]);

    res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new apiResponse(200,null,"Logout successful"));
});

const refreshTokenUser = asyncHandler(async(req,res)=>{
    const refreshToken = req.cookies?.refreshToken || req.headers?.authorization?.replace("Bearer ", "");

    if(!refreshToken){
        throw new apiError(401,"Refresh token not available");
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

  

    const user = await db.query("select * from users where id = $1",[decoded.id]);

    if(user.rows.length ===0){
        throw new apiError(404,"User not found");
    };

    if(user.rows[0].refreshtoken !== refreshToken){
        throw new apiError(401,"Refresh token mismatch");
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateToken(user.rows[0].id);

    if(!accessToken || !newRefreshToken){
        throw new apiError(500,"failed to generate tokens");
    };

    await db.query("update users set refreshtoken = $1 where id = $2",[newRefreshToken,user.rows[0].id]);

    res
    .status(200)
    .cookie("refreshToken", newRefreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new apiResponse(200,{accessToken,refreshToken: newRefreshToken},"Tokens refreshed successfully"))

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshTokenUser
}