import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const isAuthenticated = asyncHandler(async (req, res, next) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  if (!accessToken) {
    throw new ApiError(401, "No token provided");
  }
  
  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET); 
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError(401, "Token expired");
    }
    throw new ApiError(401, "Invalid token");
  }
});

export const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new ApiError(403, "Access denied. You did not have permission to access this resource.");
    }
    next();
  };
};
