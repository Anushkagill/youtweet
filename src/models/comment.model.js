import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema=new Schema(
    {
        content:{
            type:String,
            required:true,
            trim:true
        },
        video:{
            type:Schema.Types.ObjectId,
            ref:"Video",
        },
        tweet:{
            type:Schema.Types.ObjectId,
            ref:"Tweet",
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User",
            required:true
        }
    },
    {
        timestamps:true
    }
)

commentSchema.pre("save", async function () {
  const count =
    (this.video ? 1 : 0) +
    (this.tweet ? 1 : 0);

  if (count !== 1) {
    throw new Error("Comment must belong to either video or tweet");
  }
});

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment=mongoose.model("Comment",commentSchema)