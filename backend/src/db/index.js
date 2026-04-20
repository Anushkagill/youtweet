import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB=async()=>{
    try{
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MONGODB CONNECTED !! DB HOST:${connectionInstance.connection.host}`);
    }
    catch(error){
        console.log("MONGODB CONNECTION ERROR:",error);
        process.exit(1)    //because we are using node so there this exists different type of exit modes do read about it
    }
}

export default connectDB