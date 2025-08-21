// asyncHandler utility to catch and handle async errors
const asyncHandler = (requestHandler) => {
    return async (req, res, next) => {
      try {
        await requestHandler(req, res, next);
      } catch (err) {
        // Optional: Add logging here if needed (e.g., to a log file or external service)
        console.error(err); // Log the error to the console
        next(err); // Pass the error to the next error handling middleware
      }
    };
  };
  
  export { asyncHandler };
  