import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"//cookie parser is a middleware it is used to parse the cookies that are sent in the request headers. It allows you to easily access and manipulate the cookies in your Express application. By using cookie-parser, you can read the cookies sent by the client, set new cookies, and manage cookie-related functionality in your server-side code.
import { errorHandler } from './middlewares/error.middleware.js'

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN, //allow requests from this origin, you can specify a specific domain or use "*" to allow all origins. but if credentials:true is set, you cannot use "*" for the origin. You must specify the exact origin(s) that are allowed to access the resources.
    credentials:true // allow cookies to be sent in cross-origin requests,credentials:true is necessary when the client and server are on different domains and you want to allow cookies to be included in the requests.
}))

//what are cookies they are small pieces of data stored on the client side (in the user's browser) that can be sent back to the server with each request. They are commonly used for session management, user authentication, and storing user preferences. By setting credentials:true in the CORS configuration, you allow cookies to be included in cross-origin requests, enabling features like maintaining user sessions across different domains.,they are like small notes that the server can give to the client's browser, and the browser will keep them and send them back to the server when needed. This helps the server remember things about the user, like if they are logged in or what their preferences are.


app.use(express.json({limit:"16kb"}))//this is a built-in middleware in Express that parses incoming JSON payloads. It allows you to access the data sent in the request body as a JavaScript object. The limit option specifies the maximum size of the JSON payload that can be accepted, in this case, 16 kilobytes. If the payload exceeds this limit, an error will be thrown. This is useful for preventing large payloads from overwhelming your server and ensuring that you only accept data of a reasonable size.


//body parser is a middleware used to convert json into javascript object and it is used to parse the incoming request bodies in a middleware before your handlers, available under the req.body property. It is commonly used to handle form data and JSON payloads sent in HTTP requests. By using body-parser, you can easily access and manipulate the data sent by the client in your Express application.
//multer is a middleware used to handle multipart/form-data, which is commonly used for file uploads. It allows you to easily handle file uploads in your Express application by parsing the incoming request and providing access to the uploaded files through the req.file or req.files property. Multer can be configured to specify the destination for uploaded files, set limits on file size, and handle various other aspects of file uploads in a convenient way.

app.use(express.urlencoded({extended:true,limit:"16kb"}))
//urlencoded is a built-in middleware in Express that parses incoming requests with URL-encoded payloads. It allows you to access the data sent in the request body as a JavaScript object. The extended option specifies whether to use the querystring library (when false) or the qs library (when true) for parsing the URL-encoded data. The limit option specifies the maximum size of the URL-encoded payload that can be accepted, in this case, 16 kilobytes. If the payload exceeds this limit, an error will be thrown. This middleware is commonly used to handle form submissions and other URL-encoded data sent in HTTP requests.

app.use(express.static("public"))
//static is a built-in middleware in Express that serves static files from a specified directory. In this case, it serves files from the "public" directory. When a request is made for a static file (e.g., an image, CSS file, or JavaScript file), Express will look for the file in the specified directory and serve it if found. This is useful for serving assets like images, stylesheets, and client-side scripts in your web application,logo


app.use(cookieParser())






//routes import 

import userRouter from './routes/user.routes.js';
import videoRouter from "./routes/video.routes.js"
import healthcheckRouter from "./routes/healthcheck.route.js"
import tweetRouter from "./routes/tweet.route.js"
import subscriptionRouter from "./routes/subscription.route.js"
import commentRouter from "./routes/comment.route.js"
import likeRouter from "./routes/like.route.js"
import dashboardRouter from "./routes/dashboard.route.js"
import playlistRouter from "./routes/playlist.route.js"
import watchHistoryRouter from "./routes/watchHistory.route.js"
import aiRoutes from "./routes/ai.routes.js";


//routes declaration

app.use("/api/v1/users",userRouter)
app.use("/api/v1/videos",videoRouter)
app.use("/api/v1/health",healthcheckRouter)
app.use("/api/v1/tweets",tweetRouter)
app.use("/api/v1/subscriptions",subscriptionRouter)
app.use("/api/v1/comments",commentRouter)
app.use("/api/v1/likes",likeRouter)
app.use("/api/v1/dashboard",dashboardRouter)
app.use("/api/v1/playlists",playlistRouter)
app.use("/api/v1/watch-history",watchHistoryRouter)
app.use("/api/v1/ai", aiRoutes)
app.use(errorHandler)

export {app}