import mongoose,{Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

const userSchema=new Schema({
    username:{
        type:String,
        required:true,
        unique:true,// unique: true → automatically creates a unique index
// so separate index: true likhne ki zarurat nahi hoti
        lowercase:true,
        trim:true,
        index:true//it making searching easier and faster if index is true we can directly jump to the document we want to find without it we need to search each page and if match finds then return 
    },
    // index: true → MongoDB is field ka separate sorted B-Tree index banata hai.
// Index me sirf "field value + _id reference" store hota hai, pura document nahi.
// Jab query hoti hai, DB pehle index me value dhundta hai → _id milta hai → 
// phir direct main document pe jump karta hai. Isliye search fast ho jata hai.
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String, //cloudinary service (jaha p agr files upload kro to vo url de deta h)
        required:true,
    },
    coverImage:{
        type:String,//cloudinary se url
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    password:{
        type:String,//but string kse?
        required:[true,'password is required']
    },
    refreshToken:{ //what is tokens ?
        type:String
    },
},
{
    timestamps:true,
}
)

//pre is a hook aise or hooks bhi hote hai post hooks bhi hote hai pre hooks save hone se pehle execute hota hai aur post hooks save hone ke baad execute hota hai.
//  Yaha pe humne pre hook use kiya hai taki jab bhi user ka password save ho to usse hash kr diya jaye taki database me plain text password na rahe. Hashing means ki password ko ek tarike se encrypt kr dena taki agar database me koi unauthorized access ho jaye to bhi password safe rahe. bcrypt ek popular library hai jo hashing ke liye use hoti hai. Isme hum salt rounds specify karte hai jo hashing process ko aur secure banata hai. Yaha pe humne 10 salt rounds specify kiye hai jo ek standard practice hai.
//in pre one event and callback function hota hai jisme humne async function use kiya hai taki hum await keyword ka use kr ske aur password ko hash krne me time lagta hai to uske liye async function use karna zaruri hai. Aur isme humne this.password ko hash kr diya hai taki jab bhi user ka password save ho to usse hash kr diya jaye.

//arrow function yahan nhi de sakte kyunki arrow function ke paas current context (this) ka access nhi hota, aur hume current user document (this) ka access chahiye password ko hash krne ke liye. Agar hum arrow function use karenge to this.password undefined hoga aur hashing process fail ho jayega. Isliye yahan pe regular function use kiya gaya hai taki this ka reference sahi rahe aur password ko hash kiya ja sake.

//mongoose mai next() tab call karte hain jab ek middleware ka kaam ho jata hai, toh next() agle middleware ko execute karne ka signal h
//agar next() call nhi karenge toh mongoose humesha ke liye wait karta rahega uss middleware ke complete hone ka aur hang ho jayega
//async await vaale functions mai next() use karne ki zarurat nhi hoti, vo mongoose khud handle kar leta hai


userSchema.pre("save", async function (){
    if(!this.isModified("password"))return;
    this.password=await bcrypt.hash(this.password,10)
})

//schema ke andar methods add karne ke liye hum userSchema.methods ka use karte hai. Yaha pe humne isPasswordCorrect method add kiya hai jo ki user ke password ko compare karta hai database me stored hashed password se. Agar password match hota hai to true return karta hai otherwise false return karta hai. Is method ko hum apne controller me use karenge jab user login karega to uska password verify karne ke liye.
userSchema.methods.isPasswordCorrect=async function (password){
    return await bcrypt.compare(password,this.password)
}


userSchema.methods.generateAccessToken=function(){
    return jwt.sign({
        _id: this.id,
        email: this.email,
        username:this.username,
        fullName:this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)
}
userSchema.methods.generateRefreshToken=function(){
     return jwt.sign({
        _id: this.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
    }
)//if refresh token expires then user needs to login again to get new access token and refresh token because refresh token is used to generate new access token when access token expires but if refresh token also expires then user needs to login again to get new access token and refresh token
}

// Access Token → short life, used for API access
// Refresh Token → long life, used to generate new access token
// Access expires → Refresh renews → User stays logged in
export const User=mongoose.model("User",userSchema)