//require ('dotenv').config({path:'./env'})
//import dotenv from "dotenv";    (no need to write now as we added -r dotenv/config in package.json that means dotenv will run earlier than app and process.env will be available in app.js)
import connectDB from "./db/index.js";
import {app} from './app.js'
import { syncCriticalIndexes } from "./utils/syncIndexes.js";


/*dotenv.config({
    path:'./.env'
})*/

 
connectDB()
.then(async()=>{
     await syncCriticalIndexes();
    app.on("error", (error) => {
      console.log("ERROR:", error);
      throw error;
    });
    app.listen(process.env.PORT ||8000,()=>{
        console.log(`server is running at port ${process.env.PORT}`)
    });
})
.catch((error)=>{
    console.log("MONGO db connection failed",error);
})



/*
import express from "express";
const app=express()

(async()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERROR:",error);
            throw error;
        })

        app.listen(process.env.PORT,()=>{
            console.log(`app is listening to port ${process.env.PORT}`);
        })
    }
    catch(error){
        console.error("ERROR:",error)
        throw error
    }
})()*/