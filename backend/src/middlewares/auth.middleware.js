import { apiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";

const verifyJwt = async(req,res,next) => {
    try{
        const token = req.cookies?.accessToken || req.headers?.authorization?.replace("bearer ","");
        if(!token){
            throw new apiError(401," token not available ");
        }
        const decoded = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decoded._id).select("-password -refreshtoken");

        if(!user){
            throw new apiError(401,"invalid token access  ");
        }

        req.user = user;
        next()
        
    }catch(error){
        throw new apiError(401, error.message ||"Unauthorized access");
    }
}

export { verifyJwt }