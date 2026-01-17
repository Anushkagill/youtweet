import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiErrors} from "../utils/ApiErrors.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "..//utils/ApiResponse.js"

const registerUser=asyncHandler(async(req,res)=>{
    //get user from frontend
    //validation-not empty
    //check if user already exists:username,email
    //check for image,check for avatar(compulary h avatar)
    //upload them to cloudinary,avatar
    //create user object-create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return response

    const {username,email,fullName,password}=req.body
    console.log("email:",email);

    if([username,email,fullName,password].some((field)=>field?.trim()==="")){
        throw new ApiErrors(400,"All fields are required")
    }

    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiErrors(409,"user exist already with same email or username")
    }

    let avatarLocalPath;

    if(req.files?.avatar && req.files.avatar.length>0){
        avatarLocalPath=req.files.avatar[0]?.path
    }

    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiErrors(400,"Avatar is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiErrors(400,"avatar is required") 
    }

    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username
    })

    const createdUser= await User.findById(user._id).select("-password  -refreshToken")

    if(!createdUser){
        throw new ApiErrors(500,"something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"USER REGISTERED",)
    )
})

export {
    registerUser,
}