import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiErrors} from "../utils/ApiErrors.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary,deleteFromCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "..//utils/ApiResponse.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    }
    catch(error){
        throw new ApiErrors(500,"something went wrong while generating access and refresh tokens")
    }
}

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

    const coverImageLocalPath=req.files?.coverImage[0]?.path;//change it too like avatarlocalpath

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

    const createdUser= await User.findById(user._id).select("-password  -refreshToken")//

    if(!createdUser){
        throw new ApiErrors(500,"something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"USER REGISTERED",)
    )
})


const loginUser=asyncHandler(async(req,res)=>{
    //bring data from req->data
    //username or email
    //find the user
    //password check   
    //access and refresh token
    //send cookie
    //response login hogya

    const {email,username,password }=req.body

    if(!username && !email){
        throw new ApiErrors(400,"username and password is required")
    }

    const user =await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiErrors(404,"user does not exist")
    }

    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiErrors(401,"password incorrect")
    }
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
        },
        "user logged in successfully"
        )
    )
})


const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out!"))
})


const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiErrors(401,"unauthorized request")
    }
    try {
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user=await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiErrors(401,"invalid refresh token")
        }
    
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiErrors(401,"refresh token is expired/used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
        const {accessToken,newrefreshToken}=await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,refreshToken:newrefreshToken
                },
                "access token refreshed"
    
            )
        )
    
    } catch (error) {
        throw new ApiErrors(401,error?.message||"invalid refresh token ")
    }
})


const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=await user.findById(req.user?._id)

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiErrors(400,"invalid old password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(new ApiResponse(200,{},"Password Changed Successfully"))
})


const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))
})


const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName&&!email){
        throw new ApiErrors(400,"all fields are required")
    }

    const user=await user.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,//its js syntax if both have name name like fullname:fullname we can write it simply as fullname 
                email:email
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200,"user,account details updated successfully "))
})


const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiErrors(400,"Avatar file is missing")
    }

    const oldUser = await User.findById(req.user._id);

    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!(avatar?.url)){
        throw new ApiErrors(400,"error uploading on avatar")
    }

    if (oldUser?.avatar) {
        await deleteFromCloudinary(oldUser.avatar);
    }


    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"avatar updated successfully"))
})


const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
        throw new ApiErrors(400,"coverImage file is missing")
    }

    const oldUser = await User.findById(req.user._id);

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!(coverImage?.url)){
        throw new ApiErrors(400,"error uploading on coverImage")
    }

    if (oldUser?.coverImage) {
        await deleteFromCloudinary(oldUser.coverImage);
    }

    
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"cover image updated successfully"))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
}