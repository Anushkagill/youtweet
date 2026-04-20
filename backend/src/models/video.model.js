import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema=new Schema(
    {
        videoFile:{
            type:String,//cloudinary url
            required:[true,'video is required']
        },
        thumbnail:{
            type:String,//cloudinary url
            required:true
        },
        title:{
            type:String,
            required:true,
            trim:true
        },
        description:{
            type:String,
            required:true,
            trim:true
        },
        duration:{
            type:Number,//cloudinary hi video upload krke duration  bhejta h
            default:0
        },
        views:{
            type:Number,
            default:0
        },
        isPublished:{
            type:Boolean,
            default:true
        },
        ownerofvideo:{
            type:Schema.Types.ObjectId,
            ref:"User",
            required:true
        }
    },
    {
        timestamps:true,
    }
)

videoSchema.plugin(mongooseAggregatePaginate)//pagination k liye plugin use krna hoga plugin means ki humne mongooseAggregatePaginate ko videoSchema me add kr diya taki hum video ke data ko paginate kr ske yani ki ek page me kitne videos show krne hai aur baki videos next page me show honge.
//with the help of  plugin we can easily insert any method in videoSchema and then we can use that method in our controller to get the data in paginated form.
// Aggregation = Advanced data processing pipeline (filter + group + sort + calculate)
// aggregatePaginate = aggregation results ko easily page-wise divide karne ka tool (pagination ke liye)
//pagination means ki hum ek page me kitne videos show krna chahte hai aur baki videos next page me show honge. For example, agar hum 10 videos show krna chahte hai to hum 10 videos ko ek page me show kr denge aur baki videos next page me show honge. Isse user ko easily navigate karne me help milegi aur website ki performance bhi improve hogi.


export const Video=mongoose.model("Video",videoSchema)