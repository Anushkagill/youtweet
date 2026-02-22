import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiErrors} from "../utils/ApiErrors.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary,deleteFromCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "..//utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import fs from "fs"

const generateAccessAndRefreshTokens=async(user)=>{
    try{
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})//kyuki hume user ke refresh token ko update karna hai database me bina kisi validation ke kyuki user ka password change hone pe bhi refresh token invalidate ho jana chahiye to hume validateBeforeSave:false use karna padega taki password validation na ho aur user ka refresh token update ho jaye database me

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

    const {username,email,fullName,password}=req.body //destructure krke data le liya req.body se
    //frontend se req.body m data aata hai
    
    //console.log("email:",email);

    if (
        !username?.trim() ||
        !email?.trim() ||
        !fullName?.trim() ||
        !password?.trim()
    ) {
         throw new ApiErrors(400, "All fields are required");
    }

    let avatarLocalPath;
    if(req.files?.avatar && req.files.avatar.length>0){
        avatarLocalPath=req.files.avatar[0]?.path
    }

    let coverImageLocalPath;
    if(req.files?.coverImage && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0]?.path
    }

    if(!avatarLocalPath){
        throw new ApiErrors(400,"Avatar is required")
    } 

    const existedUser=await User.findOne({
        $or:[{username:username.trim().toLowerCase()},{email: email.trim().toLowerCase()}]
    })

    if(existedUser){
        fs.unlinkSync(avatarLocalPath)
        if(coverImageLocalPath)fs.unlinkSync(coverImageLocalPath)
        throw new ApiErrors(409,"user exist already with same email or username")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiErrors(400,"avatar is required") 
    }

    const user=await User.create({
        fullName: fullName.trim(),
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email: email.trim().toLowerCase(),
        password,
        username: username.trim().toLowerCase()
    })
    
    const createdUser = user.toObject();
    delete createdUser.password;
    delete createdUser.refreshToken;

    //const createdUser= await User.findById(user._id).select("-password  -refreshToken")//

    if(!createdUser){
        if(avatarLocalPath) fs.unlinkSync(avatarLocalPath)
        if(coverImageLocalPath)fs.unlinkSync(coverImageLocalPath)
        throw new ApiErrors(500,"something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201,createdUser,"USER REGISTERED",)
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

    if(!username?.trim() && !email?.trim()){//username or email dono me se koi ek hona chahiye login ke time pe
        throw new ApiErrors(400,"username or password is required")
    }

    if(!password?.trim()){//password bhi required hai login ke time pe
        throw new ApiErrors(400,"Password is required")
    }


    const user =await User.findOne({
        $or:[{username:username?.trim()?.toLowerCase()},{email:email?.trim()?.toLowerCase()}]
    }).select("+password")//kyuki password field ko humne select:false kiya hai user model me to hume login ke time pe password field ko explicitly select karna padega taki hum password verify kar sake login ke time pe

    if(!user){
        throw new ApiErrors(404,"user does not exist")
    }

    //User se hum mongodb mongoose ka model h User so we can access the methods like findby updateby and all
    //but jo methods humne khudse bnae he like isPasswordCorrect,generateAccessToken,generateRefreshToken vo user ke instance methods hai 
    //to unhe we can access through the user instance that we just found using findOne method. So user.isPasswordCorrect() and all will work because user is an instance of User model and it has access to all the instance methods defined in the userSchema.methods.
    //so jo user hume db se mila hai vo ek document hoga aur us document ke through hum apne defined methods ko access kar sakte hai. Isliye hum user.isPasswordCorrect() use kar sakte hai password verify karne ke liye.


    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiErrors(401,"password incorrect")
    }
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user)

    const loggedInUser = user.toObject();
    delete loggedInUser.password;
    delete loggedInUser.refreshToken;

    const options={
        httpOnly:true,
        secure:process.env.NODE_ENV === "production"
    }
    
    //what is cookie why we sent it? cookie ek tarika hai client side pe data store karne ka aur server side pe usse access karne ka. Yaha pe hum access token aur refresh token ko cookie me store kar rahe hai taki client side pe unhe access kar sake aur server side pe unhe verify kar sake. 
    // HttpOnly flag set karne se cookie client side ke javascript se access nahi ho sakti, isse security badh jati hai cross site scripting attacks ke against. Secure flag set karne se cookie sirf https connection me hi send hoti hai, isse bhi security badh jati hai. Yaha pe hum access token
    //  aur refresh token dono ko cookie me store kar rahe hai taki client side pe unhe access kar sake aur server side pe unhe verify kar sake jab bhi user koi secured route access kare. Access token ko short expiry time ke liye generate kiya jata hai aur refresh token ko long expiry time ke 
    // liye generate kiya jata hai taki jab access token expire ho jaye to user refresh token ke through new access token generate kar sake bina login kiye. Agar refresh token bhi expire ho jaye to user ko dobara login karna padega. Isliye refresh token ko bhi secure tarike se handle karna zaruri hai.


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
            $unset:{
                refresh:1//refreshToken:undefined
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure: process.env.NODE_ENV === "production"
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


const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim()){
        throw new ApiErrors(400,"username is missing")
    }

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribeTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribeTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                channelIsSubscribedTo:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    if(!channel?.length){
       throw new ApiErrors(400,"channel doesnot exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"user channel fetched successfully"))
})


const getWatchHistory=asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully"))
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
    getUserChannelProfile,
    getWatchHistory
}