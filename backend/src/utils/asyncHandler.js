const asyncHandler =(requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next))
        .catch((err)=>next(err))
    }
}
//here next(err) is used to pass the error to the next middleware function in the stack, which is typically an error-handling middleware. When an error occurs in the asynchronous request handler, it is caught and passed to the next middleware using next(err). This allows you to centralize your error handling logic in one place, making it easier to manage and maintain your code.

export {asyncHandler}

/*const asyncHandler =()=>{}
const asyncHandler =(function)=>{()=>{}}
const asyncHandler =(function)=>async()=>{}*/

//next is a function that is used to pass control to the next middleware function in the stack. It is typically used in Express applications to handle errors and to move on to the next middleware function after the current one has completed its task. When an error occurs in an asynchronous function, you can call next(err) to pass the error to the error-handling middleware, which will then handle the error and send an appropriate response to the client.

/*const asyncHandler =(function)=>async(req,res,next)=>{
    try{

    }
    catch(error){
        res.status(err.code||500).json({
            success:false,
            message:err.message
        })
    }
}*/