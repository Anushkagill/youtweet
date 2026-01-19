import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiErrors } from "../utils/ApiErrors.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js";


export const verifyJWT=asyncHandler(async(req,_,next)=>{ //sometime we just need req,next(like here so res is _ in porduction code which  is not in user put there _)
    try {
        const token=req.cookies?.accessToken || req.header ("Authorization")?.replace("Bearer ","")
    
        if(!token){
            throw new ApiErrors(401,"Unauthorized request")
        }
    
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            //Todo:discuss about frontend
    
            throw new ApiErrors(401,"Invalid access token")
        }
    
        req.user=user;
        next()
    } catch (error) {
        throw new ApiErrors(401,error?.message ||"invalid access token")
    }
})