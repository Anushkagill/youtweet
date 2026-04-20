const errorHandler = (err,req,res,next) => {
    
    const response = {
        statusCode: err.statusCode || 500,
        message: err.message || "Internal server error",
        success: false,
        errors: err.errors || []
    }

    if(process.env.NODE_ENV === "development"){
        response.stack = err.stack
    }

    return res
    .status(response.statusCode)
    .json(response)
}

export {errorHandler}