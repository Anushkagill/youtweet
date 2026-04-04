import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {ApiErrors} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary,deleteFromCloudinary} from "../utils/cloudinary.js"
import { ApiErrors } from "../utils/ApiErrors.js"
import fs from "fs";


const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query;//yaha pe hume url se query params milenge
    /*url mai ? ke baad jo bhi hota hai vo sab query mai milta
    hai. Yahan req.body isliye use nhi hua kyunki body mai data POST request ke time bhejte hain, ye GET request hai.
    query is used for filtering, searching and pagination. Agar ek specific cheez pe kuch karna ho toh params use karte but idhar
    multiple videos niklani hain isliye we used query.*/

    const pageNumber = Math.max(1, parseInt(page));//here we are using math.max to make sure that page number is at least 1, if user provide less than 1 then it will be set to 1
    const limitNumber = Math.max(1, parseInt(limit));//converting to parseint as we are getting string from query params and we need number for pagination, also using math.max to make sure that limit is at least 1

    if (userId && !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }//here we are checking if userId is provided and if it is valid object id or not, if not then we are throwing error

    const matchStage = { isPublished: true };//we only want to fetch published videos, so we are adding this condition in match stage of aggregation pipeline

    if (query) {
        matchStage.$or = [//here we are adding $or condition to match stage of aggregation pipeline, so that we can search for videos by title or description
            { title: { $regex: query, $options: "i" } },//here we are using $regex operator to search for videos by title, $options: "i" is used to make the search case insensitive, so that if user search for "video" then it will also match with "Video" or "VIDEO"
            { description: { $regex: query, $options: "i" } }//regex:query means we are searching for the query string in the description field of the video, $options:"i" means we are making the search case insensitive, so that if user search for "video" then it will also match with "Video" or "VIDEO"
        ];
    }

    if (userId) {
        matchStage.ownerofvideo = new mongoose.Types.ObjectId(userId);
    }//here we are adding condition to match stage of aggregation pipeline to filter videos by user id if userId is provided in query params
    //like user frontend se apne videos dekhna chahta hai to wo userId ke through apne videos ko filter kar sakta hai
    //ya kisi aur user ke videos dekhna chahta hai to wo bhi userId ke through filter kar sakta hai

    const sortStage = {
        [sortBy]: sortType === "asc" ? 1 : -1
    };//here hum ek sort by ka object bana rahe hai jisme key hoga sortBy aur value hoga 1 agar sortType asc hai to otherwise -1, isse hum sorting kar sakte hai aggregation pipeline me

    const pipeline = [
        { $match: matchStage },//sbse pehle hum match stage me apne conditions ko add kar rahe hai taki hume sirf published videos mile aur agar query ya userId provide kiya hai to uske according filter bhi ho jaye

        {
            $lookup: {
                from: "users",
                localField: "ownerofvideo",
                foreignField: "_id",
                as: "owner",//yaha p hum localfield ownerofvideo ko users collection ke _id field se match kar rahe hai aur jo data milega usko owner naam ke field me store kar rahe hai, isse hume video ke owner ka data mil jayega
                pipeline: [//pipeline is used to specify the stages that we want to apply on the joined collection, here we are using project stage to specify which fields we want to include in the result from users collection, isse hum apne query ko optimize kar sakte hai aur sirf required data hi fetch kar sakte hai
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }//project is used to specify which fields we want to include in the result, here we only want username, fullName and avatar of the owner, baki ke fields nahi chahiye hume, isse hum apne query ko optimize kar sakte hai aur sirf required data hi fetch kar sakte hai
                    }
                ]
            }
        },//sabse pehle after match stage hum lookup stage me users collection se data ko join kar rahe hai taki hume video ke owner ka data mil jaye, yaha pe humne pipeline use kiya hai lookup stage me taki hume sirf username, fullName aur avatar hi mile owner ke, baki ke fields nahi chahiye hume

        {
            $addFields: {
                owner: { $first: "$owner" }
            }
        },//after matchstage and getting owner data from users collection using lookup stage, hum addFields stage me owner field ko update kar rahe hai taki owner field me array ke form me data na aaye balki object ke form me aaye, kyuki lookup stage me hume owner ka data array ke form me milega even agar ek hi owner ka data mile to bhi, isliye hum $first operator ka use kar rahe hai taki hume sirf first element mile array ka jo ki owner ka data hoga, isse hum apne data ko aur bhi easily access kar sakte hai controller me

        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments"
            }
        },//after getting owner data, hum lookup stage me comments collection se data ko join kar rahe hai taki hume video ke comments ka data mil jaye, yaha pe hum localField _id ko comments collection ke video field se match kar rahe hai aur jo data milega usko comments naam ke field me store kar rahe hai, isse hume video ke comments ka data mil jayega

        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },//after getting comments data, hum lookup stage me likes collection se data ko join kar rahe hai taki hume video ke likes ka data mil jaye, yaha pe hum localField _id ko likes collection ke video field se match kar rahe hai aur jo data milega usko likes naam ke field me store kar rahe hai, isse hume video ke likes ka data mil jayega

        {
            $addFields: {
                commentsCount: { $size: "$comments" },//here we are adding a new field commentsCount which will store the count of comments for each video, we are using $size operator to get the count of comments from the comments array which we got from the previous lookup stage
                likesCount: { $size: "$likes" },//here we are adding a new field likesCount which will store the count of likes for each video, we are using $size operator to get the count of likes from the likes array which we got from the previous lookup stage
                likedStatus: {
                    $in: [
                        new mongoose.Types.ObjectId(req.user?._id),
                        "$likes.likedBy"
                    ]
                },//here we are adding a new field likedStatus which will store the boolean value whether the logged in user has liked the video or not, we are using $in operator to check if the logged in user's id is present in the likedBy array of likes, if it is present then likedStatus will be true otherwise false
                editableStatus: {
                    $eq: [
                        "$owner._id",
                        new mongoose.Types.ObjectId(req.user?._id)
                    ]
                }//here we are adding a new field editableStatus which will store the boolean value whether the logged in user can edit the video or not, we are using $eq operator to check if the owner of the video is same as the logged in user, if it is same then editableStatus will be true otherwise false
            }
        },

        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                views: 1,
                createdAt: 1,
                owner: 1,
                commentsCount: 1,
                likesCount: 1,
                likedStatus: 1,
                editableStatus: 1
            }//here we are using project stage to specify which fields we want to include in the final result, here we only want title, description, thumbnail, views, createdAt, owner, commentsCount, likesCount, likedStatus and editableStatus fields in the final result, baki ke fields nahi chahiye hume, isse hum apne query ko optimize kar sakte hai aur sirf required data hi fetch kar sakte hai
        },

        { $sort: sortStage }//after getting all the required fields in the previous stages, hum sort stage me apne sortStage object ke according sorting kar rahe hai, yaha pe humne dynamic sorting implement kiya hai jisme user query params ke through sortBy aur sortType specify kar sakta hai, isse hum apne query ko aur bhi flexible bana sakte hai
    ];

    const videos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        {
            page: pageNumber,
            limit: limitNumber
        }
    );//here we are using aggregatePaginate method of mongoose aggregate pagination plugin to paginate the result of our aggregation pipeline, we are passing the pipeline as the first argument and pagination options as the second argument, isse hume paginated result milega aggregation pipeline ka jo ki hum apne frontend me use kar sakte hai

    return res.status(200).json(
        new ApiResponse(200, videos, "Videos fetched successfully")
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, publishStatus = true } = req.body;
    /*yaha pe hume video publish karne ke liye title, description aur publishStatus ki jarurat hai, 
     publishStatus ka default value true hai, iska matlab hai ki agar user ne publishStatus provide 
     nahi kiya to video by default published ho jayega, agar user ne publishStatus false set kiya to 
     video draft me save ho jayega, isse hum apne application me draft aur published videos dono ko
    handle kar sakte hai*/

    
    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
    /*get the local file paths of the uploaded video and thumbnail from the request, we are 
     using optional chaining to avoid errors in case the files are not provided in the request, 
     agar user ne videoFile ya thumbnail provide nahi kiya to videoLocalPath ya thumbnailLocalPath
      undefined ho jayega, isliye humne optional chaining ka use kiya hai taki agar files 
      nahi kiya gaya to bhi code me error na aaye*/



     /* cleanup function is used to delete the local files on multer or multer is also called as 
     temporary files after we have uploaded them on cloudinary, we don't want to keep the local 
     files on our server after uploading them on cloudinary, isliye hum cleanup function ka use 
     kar rahe hai taki upload ke baad local files ko delete kar sake, isse hum apne server ki 
     storage ko bhi optimize kar sakte hai aur unnecessary files ko delete kar sakte hai*/
    const cleanupFiles = () => {
        try {
            // Check if the local files exist before trying to delete them
            if (videoLocalPath && fs.existsSync(videoLocalPath)) {
                fs.unlinkSync(videoLocalPath);
            }
            // Check if the local files exist before trying to delete them
            if (thumbnailLocalPath && fs.existsSync(thumbnailLocalPath)) {
                fs.unlinkSync(thumbnailLocalPath);
            }
        } catch (err) {
            console.error("Cleanup error:", err.message);
        }//yaha pe humne try catch block ka use kiya hai taki agar cleanup ke time pe koi error aaye to usko catch kar sake aur console me log kar sake, isse hum apne application ke errors ko handle kar sakte hai aur debugging me bhi help milegi
    };


    try {

        if (!title?.trim()) {
            throw new ApiErrors(400, "Title is required");
        }

        if (!description?.trim()) {
            throw new ApiErrors(400, "Description is required");
        }

        if (!videoLocalPath || !thumbnailLocalPath) {
            throw new ApiErrors (400, "Video and thumbnail are required");
        }

        /* promise all is used to run multiple asynchronous operations in parallel and 
        wait for all of them to complete before proceeding, here we are uploading both 
        video and thumbnail on cloudinary in parallel using promise all, isse hum apne 
        code ko optimize kar sakte hai aur dono uploads ke complete hone ka wait kar sakte hai,
        agar dono uploads complete ho jate hai to hume videoUpload aur thumbnailUpload me unka
        result mil jayega, agar kisi bhi upload me error aata hai to promise all usko catch kar
        lega aur hume error handle karne ka mauka milega*/
        const [videoUpload, thumbnailUpload] = await Promise.all([
            uploadOnCloudinary(videoLocalPath),
            uploadOnCloudinary(thumbnailLocalPath),
        ]);
        //hume promise all ka use isiliye kr rhe h taki fast hojae uploading, dono upload ek sath start hojayenge aur dono ke complete hone ka wait kr lenge, agar hum sequentially upload karte to pehle video upload hota aur uske complete hone ka wait karna padta uske baad thumbnail upload hota, isse time zyada lagta, lekin promise all me dono upload ek sath start hojayenge aur dono ke complete hone ka wait kar lenge, isse time kam lagta hai

        if (!videoUpload?.url || !thumbnailUpload?.url) {
            throw new ApiErrors(400, "Upload failed");
        }

        const publishedVideo = await Video.create({
            videoFile: videoUpload.url,
            thumbnail: thumbnailUpload.url,
            ownerofvideo: req.user._id,
            title: title.trim(),
            description: description.trim(),
            duration: videoUpload.duration || 0,
            isPublished: publishStatus
        });

        if (!publishedVideo) {
            throw new ApiErrors(500, "Video publish failed");
        }

        return res.status(201).json(
            new ApiResponse(201, publishedVideo, "Video published successfully")
        );

    } catch (error) {
        throw error;

    } finally {
        cleanupFiles();
    }//finally block is used to execute the cleanupFiles function regardless of whether the try block succeeded or the catch block caught an error, isse hum ensure kar sakte hai ki cleanupFiles function hamesha execute hoga aur local files delete ho jayenge, chahe video publish successful ho ya nahi, isse hum apne server ki storage ko optimize kar sakte hai aur unnecessary files ko delete kar sakte hai
});

const getVideoById = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if (!videoId?.trim()) {
        throw new ApiError(400, "Video ID is required");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 } 
    });

    const video = await Video.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),

                $or: [
                    { isPublished: true },
                    { ownerofvideo: new mongoose.Types.ObjectId(req.user._id) }
                ]
            }
        },

        {
            $lookup: {
                from: "users", 

                localField: "ownerofvideo",

                foreignField: "_id",

                as: "owner", 

                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },

        {

            $unwind: {
                path: "$owner",
                preserveNullAndEmptyArrays: true
            }
        },

        {

            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments"
            }
        },

        {

            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "allLikes"
            }
        },

        {

            $addFields: {


                commentsCount: { $size: "$comments" },

                likesCount: { $size: "$allLikes" },

                likedStatus: {
                    $in: [
                        new mongoose.Types.ObjectId(req.user?._id),
                        "$allLikes.likedBy"
                    ]
                },

                editableStatus: {
                    $eq: [
                        "$owner._id",
                        new mongoose.Types.ObjectId(req.user?._id)
                    ]
                }
            }
        },

        {

            $project: {
                owner: 1,
                videoFile: 1,
                views: 1,
                isPublished: 1,
                title: 1,
                description: 1,
                thumbnail: 1,
                duration: 1,
                commentsCount: 1,
                likesCount: 1,
                likedStatus: 1,
                editableStatus: 1,
                createdAt: 1
            }
        }
    ]);

    if (!video?.length) {
        throw new ApiErrors(404, "Video does not exist");
    }

    return res.status(200).json(
        new ApiResponse(200, video[0], "Video fetched successfully")
    );
});
