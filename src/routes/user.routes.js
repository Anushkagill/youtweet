import  {Router} from "express";
import { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
      updateAccountDetails,
       updateUserAvatar, 
       updateUserCoverImage,
      getUserChannelProfile,
       getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router=Router()

router.route("/register").post(
    upload.fields([//yaha multer middleware lga diya hai kyuki user registration ke time pe avatar aur cover image dono upload kar sakta hai to before registering the user we need to handle the file upload and then pass the control to the registerUser controller
        {
            name:"avatar",//
            maxCount:1

        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser)

//secured routes

router.route("/logout").post(verifyJWT,logoutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT,changeCurrentPassword)

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/update-account").patch(verifyJWT,updateAccountDetails)
//patch isliye kyuki user apne account details me se kisi bhi field ko update kar sakta hai to hum patch method use karenge taki user apne account details me se kisi bhi field ko update kar sake without affecting other fields. Agar hum put method use karte to user ko apne account details ke sare fields ko provide karna padta jo ki zaruri nahi hai ki wo kare. Patch method me user apne account details ke kisi bhi field ko update kar sakta hai bina baki fields ko provide kiye huye.

router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
//single kyu likha hai kyuki user apne avatar ko update karne ke time pe ek hi file upload karega to hum single method use karenge aur usme field name "avatar" pass karenge taki multer middleware samajh sake ki is request me avatar field ke andar jo file upload ho rahi hai wo user ka avatar hai.
router.route("/update-coverimage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

router.route("/history").get(verifyJWT,getWatchHistory)



export default router