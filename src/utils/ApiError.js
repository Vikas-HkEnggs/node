// ApiError class for structured error responses
class ApiError extends Error {
    constructor(statusCode, message = "Something went wrong", errors = [], stack = "") {
      super(message);
      
      this.statusCode = statusCode;
      this.message = message;
      this.errors = errors;
      this.success = false;
      this.data = null; // This can be null by default, or you can use it for additional error context if needed
  
      // If no stack is passed, capture the stack trace
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  
    // Optionally, you can add a helper method to convert this into a JSON response format.
    toJSON() {
      return {
        success: this.success,
        message: this.message,
        statusCode: this.statusCode,
        errors: this.errors,
        stack: process.env.NODE_ENV === 'production' ? undefined : this.stack // Do not expose stack trace in production
      };
    }
  }
  
  export { ApiError };
  