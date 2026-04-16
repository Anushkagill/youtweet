class ApiErrors extends Error{ //extending the built-in Error class to create a custom error class called ApiErrors. This allows you to create instances of ApiErrors that have additional properties and methods specific to your application's needs, while still retaining the basic functionality of the standard Error class.
    constructor(
        statusCode,
        message="something went wrong",
        error=[],
        stack="" 
    ){
        super(message)//constructor is called using super because we are extending the Error class, and we want to pass the message parameter to the parent class (Error) constructor to initialize the error message. This allows us to create an instance of ApiErrors with a custom message while still maintaining the standard error properties and behavior provided by the Error class.without it  this.message would not be set correctly and the error handling might not work as expected.
        this.statusCode=statusCode
        this.statuscode=statusCode
        this.data=null
        this.message=message
        this.success=false;
        this.errors=error

        if(stack){
            this.stack=stack
        }
        else{
            Error.captureStackTrace(this,this.constructor)//
        }
    }
}

export {ApiErrors}