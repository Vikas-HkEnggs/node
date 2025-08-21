import { ApiResponse } from "../../utils/ApiResponse.js";
// import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const Dieplate = asyncHandler(async (req,res)=>{
     
 res.status(201).json(new ApiResponse(201, null, " Add to Production successfully "));

});