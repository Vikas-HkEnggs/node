import { Employee } from "../../models/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import bcrypt from "bcryptjs";

// Create First Admin Function
export const createFirstAdmin = asyncHandler(async (req, res) => {
    const { name, email, password, designation, department, phone, profile_pic } = req.body;
  
    // Check if an admin already exists
    const employeeCount = await Employee.count();
    if (employeeCount > 0) {
      throw new ApiError(403, "An admin account already exists. Use the regular registration endpoint.");
    }
  
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
  
    // Create the first admin account
    const admin = await Employee.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      designation,
      department,
      phone,
      profile_pic: profile_pic || null,
    });
  
    res
      .status(201)
      .json(new ApiResponse(201, admin, "First admin account created successfully."));
  });
  