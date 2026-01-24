import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const commentSchema=new Schema(
    {
        content:{
            type:String,
            required:True
        },
        video:{
            type:Schema.Types.ObjectId,
            ref:"Video",
        },
        owner:{
            type:Schem.Types.ObjectId,
            ref:"User"
        }
    },
    {
        timestamps:true
    }
)

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment=mongoose.model("Comment",commentSchema)