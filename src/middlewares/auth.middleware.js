import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiErrors } from "../utils/ApiErrors.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js";


export const verifyJWT=asyncHandler(async(req,_,next)=>{ //sometime we just need req,next(like here so res is _ in porduction code which  is not in user put there _)
    try {
        const token=req.cookies?.accessToken || req.header ("Authorization")?.replace("Bearer ","")
        //yaha pe hum access token ko cookie se access kar rahe hai ya phir authorization header se access kar rahe hai kyuki kabhi kabhi client side pe hum access token ko cookie me store karte hai aur kabhi kabhi authorization header me store karte hai to dono cases ko handle karne ke liye hum dono jagah se access token ko access kar rahe hai. Yaha pe hum "Bearer " ko replace kar rahe hai kyuki authorization header me access token ke aage "Bearer " hota hai to usse replace karna padta hai taki hume sirf access token mile.
        
        if(!token){
            throw new ApiErrors(401,"Unauthorized request")
        }
    
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
        //yaha pe hum user ko database se find kar rahe hai decoded token ke _id ke basis pe taki hum user ke details ko access kar sake aur usse req.user me store kar sake taki hum usse aage ke middlewares me access kar sake. Yaha pe hum password aur refresh token ko select nahi kar rahe hai kyuki hume unki zarurat nahi hai aur security ke liye unhe select nahi karna chahiye.
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