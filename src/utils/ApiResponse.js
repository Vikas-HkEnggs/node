// ApiResponse class for structured success responses
class ApiResponse {
    constructor(statusCode, data, message = "Success", token) {
      this.statusCode = statusCode;
      this.data = data;
      this.message = message;
      this.success = statusCode < 400; // Automatically determine success based on the status code
      this.token = token;  // Can be used for pagination metadata if needed (e.g. total, page, limit)
    }
  
    // Optionally, we can also define a method for easier JSON response formatting
    toJSON() {
      return {
        success: this.success,
        message: this.message,
        statusCode: this.statusCode,
        data: this.data,
        token: this.token
      };
    }
  }
  
  export { ApiResponse };
  