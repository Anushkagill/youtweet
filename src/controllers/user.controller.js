import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiErrors} from "../utils/ApiErrors.js"
import {User} from "../models/user.model.js"
import {Video} from "../models/video.model.js"
import {Tweet} from "../models/tweet.model.js"
import {Comment} from "../models/comment.model.js"
import {Like} from "../models/like.model.js"
import {uploadOnCloudinary,deleteFromCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import fs from "fs"
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = asyncHandler(async (req, res) => {
    const { token, credential } = req.body;
    const googleToken = credential || token;

    if (!googleToken) {
        throw new ApiErrors(400, "Google token missing");
    }

    const ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    // 🔹 Create user if not exists
    if (!user) {
        user = await User.create({
            email,
            fullName: name,
            avatar: picture,
            password: "google-auth", // dummy password
            username: email.split("@")[0] + Math.floor(Math.random() * 1000)
        });
    }

    // 🔥 Use your existing token function
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user);

    const loggedInUser = user.toObject();
    delete loggedInUser.password;
    delete loggedInUser.refreshToken;

    const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
};

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "Google login successful"
            )
        );
});

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

    if (!createdUser) {
    if (avatarLocalPath && fs.existsSync(avatarLocalPath)) {
        fs.unlinkSync(avatarLocalPath);
    }

    if (coverImageLocalPath && fs.existsSync(coverImageLocalPath)) {
        fs.unlinkSync(coverImageLocalPath);
    }

    throw new ApiErrors(500, "something went wrong while registering the user");
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
        throw new ApiErrors(400,"username or email is required")
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
                refreshToken:1
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
            secure:process.env.NODE_ENV === "production"
        }
        const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,refreshToken
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

    if(!oldPassword?.trim()) throw new ApiErrors(400, "Current Password is required");
    if(!newPassword?.trim()) throw new ApiErrors(400, "New Password is required");

    const user=await User.findById(req.user?._id).select("+password")

    if (!user) {
    throw new ApiErrors(404, "User not found");
}

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiErrors(400,"invalid old password")
    }

    user.password=newPassword;
     user.refreshToken = undefined;
     //jab bhi user apna password change kare to uska refresh token invalidate ho jana chahiye taki security badh jaye. Isliye hum user ke refresh token ko undefined kar rahe hai taki jab user apna password change kare to uska refresh token invalidate ho jaye aur agar koi attacker ke paas user ka refresh token hai to vo usse use nahi kar paega new access token generate karne ke liye.
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
    if (!fullName?.trim() && !email?.trim()) {
        throw new ApiErrors(400, "Fullname or Email is required");
    }//fullname or email me se koi ek update karna chahiye to update account details ke time pe

    let updateFields = {};

    // If fullname is provided
    if (fullName?.trim()) {
        updateFields.fullName = fullName.trim();
    }

    // If email is provided
    if (email?.trim()) {

        const normalizedEmail = email.trim().toLowerCase();

        // Check if another user already has this email
        const existedUser = await User.findOne({
            email: normalizedEmail,
            _id: { $ne: req.user._id } // ignore current user ,ne=not equal to operator hai mongodb ka jo ki yaha pe use ho raha hai taki jab hum email update kar rahe hai to hume check karna hai ki koi aur user to us email ko use nahi kar raha hai to uske liye hum $ne operator ka use kar rahe hai taki current user ko ignore kar sake email check karte time pe
        });

        if (existedUser) {
            throw new ApiErrors(400, "Another user with same email already exists");
        }

        updateFields.email = normalizedEmail;
    }

    // Update user
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});


const updateUserAvatar = asyncHandler(async (req,res)=>{

    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiErrors(400,"Avatar file is missing");
    }

    const user = await User.findById(req.user._id);

    if(!user){
        throw new ApiErrors(404,"User not found");
    }

    const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);

    if(!uploadedAvatar?.url){
        throw new ApiErrors(400,"Error uploading avatar");
    }

    // delete old avatar if exists
    if(user.avatar){
        await deleteFromCloudinary(user.avatar);
    }

    user.avatar = uploadedAvatar.url;

    await user.save({ validateBeforeSave:false });

    user.password = undefined;
    user.refreshToken = undefined;

    return res
        .status(200)
        .json(new ApiResponse(200,user,"Avatar updated successfully"));
});


const updateUserCoverImage = asyncHandler(async (req,res)=>{

    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiErrors(400,"Cover image file is missing");
    }

    const user = await User.findById(req.user._id);

    if(!user){
        throw new ApiErrors(404,"User not found");
    }

    const uploadedCoverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!uploadedCoverImage?.url){
        throw new ApiErrors(400,"Error uploading cover image");
    }

    // delete old cover image if exists
    if(user.coverImage){
        await deleteFromCloudinary(user.coverImage);
    }

    user.coverImage = uploadedCoverImage.url;

    await user.save({ validateBeforeSave:false });

    user.password = undefined;
    user.refreshToken = undefined;

    return res
        .status(200)
        .json(new ApiResponse(200,user,"Cover image updated successfully"));
});


const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params
    // req.params se username aa raha hai
    // Example route: /channel/:username

    // Agar username empty ya missing hai to error throw karo
    if(!username?.trim()){
        throw new ApiErrors(400,"username is missing")
    }

    //aggregate = powerful MongoDB pipeline
    // Isme multiple steps ek saath perform hote hain database ke andar
    //aggregation pipeline mai hum ek array of objects dete hain, array ka har object ek stage hota hai
//The documents that are output from one stage are passed to the next stage
    const channel=await User.aggregate([
        {
            // aggregate = powerful MongoDB pipeline
    // Isme multiple steps ek saath perform hote hain database ke andar
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            // STEP 2: $lookup = join with another collection
        // Yaha subscriptions collection se data la rahe hain
            $lookup:{
                from:"subscriptions", // dusri collection ka naam
                localField:"_id",   // current user ka _id
                foreignField:"channel", // subscriptions me channel field jo user ke _id se match karega
                as:"subscribers"  // result array ka naam
            }
        },
         // STEP 3: Second lookup
        // Is user ne kin kin channels ko subscribe kiya
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",// jaha subscriber current user hai
                as:"subscribeTo"// result array ka naam
            }
        },
        // jaha subscriber current user hai
        {
            $addFields:{
                // subscribersCount = subscribers array ka size
                subscribersCount:{
                    $size:"$subscribers"// subscribers array ka size nikal ke subscribersCount field me store kar do
                },
                channelsSubscribedToCount:{
                    $size:"$subscribeTo"
                },
                 // isSubscribed check karega:
                // kya logged-in user ne is channel ko subscribe kiya hai?
                isSubscribed:{
                    $cond:{// $cond = if-else condition
                        // $in = check karta hai value array me exist karti hai ya nahi
                        if:{$in: [new mongoose.Types.ObjectId(req.user._id), "$subscribers.subscriber"]},
                        then:true,// agar logged-in user ka _id subscribers array ke subscriber field me exist karta hai to isSubscribed true hoga warna false
                        else:false
                    }
                }
            }
        },
        {
            // STEP 4: $project = select specific fields to return in the final result
            $project:{
                fullName:1,// 1 means include this field in the result
                username:1,
                channelsSubscribedToCount:1,
                subscribersCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
    //aggregate returns an array containing all the documents formed after all stages
    //iss case mai array ke andar bus ek he document hoga

    if(!channel?.length){// agar channel array empty hai to iska matlab hai ki aisa channel exist nahi karta jiska username match karta ho with the provided username in the request parameters. To is case me hum error throw karenge ki channel exist nahi karta.
       throw new ApiErrors(400,"channel doesnot exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"user channel fetched successfully"))// channel[0] isliye kyuki aggregate hume array return karta hai aur hume usme se pehla element chahiye jo ki matched channel hoga with the provided username in the request parameters.
})


/*const getWatchHistory=asyncHandler(async(req,res)=>{
    // GOAL:
    // Logged-in user ka watch history return karna
    // Lekin sirf video IDs nahi,
    // pura video details + video owner details ke saath.
    const user=await User.aggregate([
        {
            // --------------------------------
        // STAGE 1: $match
        // --------------------------------
        // $match = filter stage
        // Yaha hum sirf current logged-in user ko find kar rahe hain.
        //
        // Important:
        // MongoDB me _id ka type "ObjectId" hota hai.
        // Lekin req.user._id usually string hota hai.
        // Agar string se match karenge to match fail ho sakta hai.
        //
        // Isliye hum string ko ObjectId me convert kar rahe hain.
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)// aggregate me match stage me hum _id ko ObjectId me convert kar rahe hai taki wo match ho sake with the _id stored in the database which is of type ObjectId
            }
        },
        {
            // --------------------------------
        // STAGE 2: $lookup (videos collection se join)
        // --------------------------------
        // $lookup = SQL ke JOIN jaisa hota hai.
        //
        // Yaha hum:
        // Users collection ke watchHistory array me jo video IDs stored hain,
        // un IDs ke corresponding video documents videos collection se la rahe hain.
        //
        // localField = user ke document me jo field hai (watchHistory array)
        // foreignField = videos collection me jis field se match karna hai (_id)
        // as = result kis naam se store hoga
        //
        // IMPORTANT:
        // Agar watchHistory = [V1, V2]
        // To yeh lookup videos collection me _id = V1 aur V2 find karega.
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                // --------------------------------
                // PIPELINE inside lookup
                // --------------------------------
                // Ab har video ke upar extra processing karni hai.
                // Matlab video ke andar owner ka pura data bhi attach karna hai.
                pipeline:[
                    {
                        // --------------------------------
                    // INNER LOOKUP: video ke owner ka data laana
                    // --------------------------------
                    // Har video me ek field hoti hai:
                    // owner: <userId>
                    //
                    // Ab hume owner ka pura user document chahiye.

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
                        // --------------------------------
                    // $addFields
                    // --------------------------------
                    // Problem:
                    // $lookup hamesha array return karta hai.
                    //
                    // Example:
                    // owner: [ { fullName: "Aarav" } ]
                    //
                    // Lekin hume array nahi chahiye,
                    // hume direct object chahiye.
                    //
                    // $first = array ka first element nikal do.
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
})*/
const updateUserProfile = asyncHandler(async (req, res) => {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const updateData = {};

    // 🔹 Basic fields
    if (req.body.fullName) updateData.fullName = req.body.fullName;
    if (req.body.username) updateData.username = req.body.username;

    // 🔹 Avatar upload (required field, but only update if new one provided)
    if (req.files?.avatar?.[0]) {
        const uploadedAvatar = await uploadOnCloudinary(req.files.avatar[0].path);

        if (!uploadedAvatar?.url) {
            throw new ApiErrors(400, "Error uploading avatar");
        }

        updateData.avatar = uploadedAvatar.url;
    }

    // 🔹 Cover Image upload (optional)
    if (req.files?.coverImage?.[0]) {
        const uploadedCover = await uploadOnCloudinary(req.files.coverImage[0].path);

        if (!uploadedCover?.url) {
            throw new ApiErrors(400, "Error uploading cover image");
        }

        updateData.coverImage = uploadedCover.url;
    }

    // 🔹 Remove cover image (when frontend sends empty string)
    if (req.body.coverImage === "") {
        updateData.coverImage = "";
    }

    // 🔹 Update user
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true }
    ).select("-password");

    if (!updatedUser) {
        throw new ApiErrors(404, "User not found");
    }

    return res.status(200).json({
        success: true,
        data: updatedUser
    });
});

const deleteCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiErrors(401, "Unauthorized request");
    }

    const [userVideos, userTweets] = await Promise.all([
        Video.find({ ownerofvideo: userId }).select("_id"),
        Tweet.find({ owner: userId }).select("_id"),
    ]);

    const videoIds = userVideos.map((item) => item._id);
    const tweetIds = userTweets.map((item) => item._id);

    const commentsToDelete = await Comment.find({
        $or: [
            { owner: userId },
            ...(videoIds.length ? [{ video: { $in: videoIds } }] : []),
            ...(tweetIds.length ? [{ tweet: { $in: tweetIds } }] : []),
        ],
    }).select("_id");

    const commentIds = commentsToDelete.map((item) => item._id);

    await Like.deleteMany({
        $or: [
            { likedBy: userId },
            ...(videoIds.length ? [{ video: { $in: videoIds } }] : []),
            ...(tweetIds.length ? [{ tweet: { $in: tweetIds } }] : []),
            ...(commentIds.length ? [{ comment: { $in: commentIds } }] : []),
        ],
    });

    await Comment.deleteMany({
        $or: [
            { owner: userId },
            ...(videoIds.length ? [{ video: { $in: videoIds } }] : []),
            ...(tweetIds.length ? [{ tweet: { $in: tweetIds } }] : []),
        ],
    });

    await Promise.all([
        Video.deleteMany({ ownerofvideo: userId }),
        Tweet.deleteMany({ owner: userId }),
    ]);

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
        throw new ApiErrors(404, "User not found");
    }

    return res.status(200).json({
        success: true,
        message: "Account deleted successfully",
    });
});
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
    updateUserProfile,
    deleteCurrentUser,
    googleLogin
}