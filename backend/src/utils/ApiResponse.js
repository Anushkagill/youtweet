class ApiResponse{
    constructor(statusCode,data,message="success"){
        this.statusCode=statusCode
        this.data=data
        this.message=message
        this.success=statusCode<400 //if the status code is less than 400, it is considered a successful response, and the success property will be set to true. If the status code is 400 or greater, it is considered an error response, and the success property will be set to false. This allows you to easily determine whether a response indicates success or failure based on the status code provided when creating an instance of ApiResponse.
    }
}

export {ApiResponse}