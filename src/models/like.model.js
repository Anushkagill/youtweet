import mongoose,{Schema} from "mongoose";

const likeSchema=new Schema(
    {
        video:{
            type:Schema.Types.ObjectId,
            ref:"Video",
            index: true
        },
        comment:{
            type:Schema.Types.ObjectId,
            ref:"Comment"
        },
        tweet:{
            type:Schema.Types.ObjectId,
            ref:"Tweet"
        },
        likedBy:{
            type:Schema.Types.ObjectId,
            ref:"User",
            index: true,
            required: true
        },
    },{
        timestamps:true
    }
)
/* so here we are defining the pre-save middleware for the likeSchema because we want to check before 
saving that this function is called which ensures only one of the three fields is present because of
one like only one count will increase in any of the one video,comment,tweet */
likeSchema.pre("save", function (next) {
    const count =
        (this.video ? 1 : 0) +
        (this.comment ? 1 : 0) +
        (this.tweet ? 1 : 0);

    if (count !== 1) {
        return next(new Error("Only one of video, comment, or tweet must be present"));
    }

    next();
});

/*Agar aisa document bana jisme likedBy aur video field exactly same hai to an already created document, toh ye document create nhi hoga
aur jahan Like.create() call hua hai vahan ek error throw hoga "MongoServerError: E11000 duplicate key error collection: subscriptions"
jiska error code 11000 hoga*/

likeSchema.index(
    { likedBy: 1, video: 1 },
    { unique: true, partialFilterExpression: { video: { $exists: true } } }
);

likeSchema.index(
    { likedBy: 1, comment: 1 },
    { unique: true, partialFilterExpression: { comment: { $exists: true } } }
);

likeSchema.index(
    { likedBy: 1, tweet: 1 },
    { unique: true, partialFilterExpression: { tweet: { $exists: true } } }
);
//ye indexes ensure karte hai ki ek user ek hi video, comment, ya tweet ko like kar sakta hai, aur agar wo try karta hai toh usko duplicate key error milega
//means agar ek user ne already kisi video ko like kar diya hai toh wo usi video ko dobara like nahi kar sakta, agar try karega toh usko duplicate key error milega jiska code 11000 hoga

export const Like=mongoose.model("Like",likeSchema) 