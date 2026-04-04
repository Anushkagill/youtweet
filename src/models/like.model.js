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

export const Like=mongoose.model("Like",likeSchema) 