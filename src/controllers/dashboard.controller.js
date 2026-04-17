import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    // Validate channelId
    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiErrors(400, "Invalid channel id");
    }

    // exists because it only returns true/false dont fetch entire data or document so fast and easy
    const channelExists = await User.exists({ _id: channelId });
    if (!channelExists) {
        throw new ApiErrors(404, "Channel not found");
    }

    // 3. Get total subscribers
    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId
    });

    // 4. Aggregate video stats
    const [stats] = await Video.aggregate([
        {
            $match: {
                ownerofvideo: new mongoose.Types.ObjectId(channelId),
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likesData"
            }//Find all likes where:likes.video === video._id Attach them as array to each video document as "likesData"
        },
        {
            $addFields: {
                likesCount: { $size: "$likesData" }
            }
        },
        {
            $group: {
                _id: null,//its null because we want to group all videos together to get total stats
                totalVideos: { $sum: 1 },//sum:1 means count each document (video) +1 and give us total count of videos
                totalViews: { $sum: "$views" },
                totalLikes: { $sum: "$likesCount" }
            }
        }
    ]);


    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalVideos: stats?.totalVideos || 0,
                totalViews: stats?.totalViews || 0,
                totalLikes: stats?.totalLikes || 0,
                totalSubscribers
            },
            "Channel stats fetched successfully"
        )
    );
});

/*
|--------------------------------------------------------------------------
| Pagination Strategy: Cursor-based vs Skip-based
|--------------------------------------------------------------------------
|
| We are using CURSOR-BASED pagination instead of skip/limit.
|
| ❌ Problem with skip-based pagination:
| MongoDB first uses indexes to find matching documents (O(log n)),
| but then it has to linearly iterate through and discard `skip` number
| of documents before returning results.
|
| Example:
| skip(10000) → MongoDB scans 10000 documents just to ignore them ❌
|
| This leads to:
| - Slower queries as data grows
| - High CPU and memory usage
| - Poor scalability for large datasets
|
| -------------------------------------------------------------------------
|
| ✅ Cursor-based pagination (used here):
|
| Instead of skipping documents, we directly continue from the last
| fetched document using a "cursor" (e.g., createdAt or views + _id).
|
| Example:
| createdAt < lastFetchedCreatedAt
|
| MongoDB uses indexes to jump directly to the correct position
| (O(log n)) and fetches the next set efficiently.
|
| -------------------------------------------------------------------------
|
| 🧠 Key Idea:
| Skip = "Start from beginning and discard data"
| Cursor = "Continue from where you left off"
|
| -------------------------------------------------------------------------
|
| 🚀 Benefits of cursor-based pagination:
| - No unnecessary scanning of old documents
| - Consistent performance regardless of page depth
| - Works efficiently for infinite scroll (like YouTube, Instagram)
| - Prevents duplication/missing data issues when sorted properly
|
| -------------------------------------------------------------------------
|
| ⚠️ Important:
| Cursor pagination REQUIRES proper sorting.
| If sorting field is not unique (e.g., views),
| we add a secondary field (_id) to maintain stable ordering.
|
| Example:
| sort: { views: -1, _id: -1 }
|
|--------------------------------------------------------------------------
*/

const getChannelVideos = asyncHandler(async (req, res) => {
 const { channelId, cursor, limit = 10, sortBy = "createdAt", sortType = "desc" } = req.query;
 //so ye sab hume req.query se milenge kyuki ye client side se aayenge as query parameters like ?channelId=123&limit=10&sortBy=views&sortType=asc&cursor=abc
 //or humne sortby aur sorttype ke liye default values bhi de di hai taki agar client ne nahi diye to bhi humare code me koi error na aaye aur default sorting createdAt ke hisab se ho jaye desc order me yani latest videos pehle aaye


    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiErrors(400, "Invalid channel id");
    }//here checking shi channel id hai ya nahi kyuki agar channel id hi invalid hoga to aage ke steps me bhi error aayega to pehle hi check kar lete hai taki unnecessary processing na ho aur client ko jaldi se error response mil jaye


    const channelExists = await User.exists({ _id: channelId });
    //User.exists() is more efficient than User.findById() when we only need to check for existence, as it doesn't retrieve the entire document, just checks if a matching document exists and returns true/false.
    //User h ,user nahi that  means yaha jo User h wo mongoose model hai jisme humne user schema define kiya hai aur usme se hum check kar rahe hai ki kya koi user hai jiska _id channelId ke barabar hai ya nahi, agar nahi hai to hume 404 error throw karna hai ki channel not found
    if (!channelExists) {
        throw new ApiErrors(404, "Channel not found");
    }

    //  Base filter: owner = channelId -> we want to fetch videos of this channel only
    const filter = { ownerofvideo: channelId };

    // because channel owner can see all videos (published and unpublished) but other users can only see published videos, so we need to add this condition to our filter
    if (channelId !== req.user._id.toString()) {
        filter.isPublished = true;
    }

    //rate limiting and validation for limit parameter, we want to allow client to specify how many videos they want to fetch in one request but we also want to put a cap on it to prevent abuse and performance issues, so we allow minimum 1 and maximum 10 videos per request
    const limitNumber = Math.min(Math.max(Number(limit), 1), 10);

    
    const allowedSortFields = ["createdAt", "views"];
    //we want to allow client to sort videos by createdAt or views, but we also want to have a default sorting field in case client does not provide one or provides an invalid one, so we check if sortBy is in allowedSortFields and if yes then we use it otherwise we default to createdAt
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    //similarly for sortType we want to allow only "asc" or "desc" and default to "desc" if client provides invalid value or does not provide one

    let sortOptions = {};

    if (sortField === "createdAt") {
        sortOptions.createdAt = sortType === "asc" ? 1 : -1;
    } else {
        // views sorting needs tie-breaker
        sortOptions = { views: -1, _id: -1 };
    }

    if (cursor) {
        if (sortField === "createdAt") {
            if (sortType === "asc") {
                filter.createdAt = { $gt: new Date(cursor) };//agar sorting ascending hai to hume aise videos chahiye jinka createdAt cursor se bada ho yani jo videos cursor ke baad create hue hai
            } else {
                filter.createdAt = { $lt: new Date(cursor) };//agar sorting descending hai to hume aise videos chahiye jinka createdAt cursor se chota ho yani jo videos cursor ke baad create hue hai, kyuki descending me latest videos pehle aate hai to hume aise videos chahiye jinka createdAt cursor se chota ho taki hume next set of videos mil sake
            }
        } else {
            const parsed = JSON.parse(cursor);

            filter.$or = [
                { views: { $lt: parsed.lastViews } },//less than the last views of the last video in the previous page
                {
                    views: parsed.lastViews,
                    _id: { $lt: parsed.lastId }
                }//if views are same as last video in previous page then we use _id as tie-breaker to maintain stable sorting, we want videos with same views but smaller _id (older videos) to come after the last video of previous page
            ];
        }
    }

    const videos = await Video.find(filter)
    //we are using find here instead of aggregate because we dont have any complex aggregation needs like grouping or lookups, we just need to filter, sort and paginate the videos, and find is more straightforward and efficient for this use case
        .sort(sortOptions)
        //sort options will be either { createdAt: 1 } for ascending createdAt sorting or { createdAt: -1 } for descending createdAt sorting, or { views: -1, _id: -1 } for views sorting with tie-breaker
        //we want to populate owner field with username, fullName and avatar of the user, but we dont want to populate description field because it can be large and we dont need it in this response, so we select -description to exclude it from the result
        .limit(limitNumber)
        //limit number of videos returned in one request to limitNumber which is between 1 and 10 based on client input
        .populate("owner", "username fullName avatar")
        .select("-description");



    let nextCursor = null;

    if (videos.length > 0) {
        const lastVideo = videos[videos.length - 1];

        if (sortField === "createdAt") {
            nextCursor = lastVideo.createdAt;
        } else {
            nextCursor = JSON.stringify({
                lastViews: lastVideo.views,
                lastId: lastVideo._id
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, {
            videos,
            nextCursor,
            hasMore: videos.length === limitNumber
            //hasMore will be true if the number of videos returned is equal to the limitNumber, which means there might be more videos to fetch in the next page, if it's less than limitNumber then we know there are no more videos to fetch and we can set hasMore to false
        }, "Channel videos fetched successfully")
    );
})


export{
    getChannelStats,
    getChannelVideos
}