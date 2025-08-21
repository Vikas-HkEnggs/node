import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Employee from "../../models/Auth/Employees.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

dotenv.config();

// Login function
export const login = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
  
    // Find the employee by email
    const employee = await Employee.findOne({ where: { email } });

    if (!employee) {
      return res.status(401).json({ message: "Employee Not Found" });
    }

    if(employee.status === "inactive"){
      return res.status(401).json({ message: "Employee is Inactive" });
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (!process.env.REFRESH_TOKEN_SECRET || !process.env.ACCESS_TOKEN_SECRET) {
      throw new Error("Missing required environment variables");
    }
    
    // Generate JWT tokens
    const refreshToken = jwt.sign(
      { id: employee.id, email: employee.email, role: employee.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "6d" }
    );

    const accessToken = jwt.sign(
      { id: employee.id, email: employee.email, role: employee.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "6d" }
    );

    // Remove password from the response data
    const { password: _, ...employeeWithoutPassword } = employee.toJSON();

    // Set refreshToken in HttpOnly, Secure cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 6 * 24 * 60 * 60 * 1000, // 6 day
    });

    // Send accessToken and user data in the response
    res.status(200).json(
      new ApiResponse(200, employeeWithoutPassword, "Login successful!", {
        accessToken,
      })
    );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error.");
  }
});

// Logout function
export const logout = asyncHandler(async (req, res) => {
  try {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ message: "Logout successful!" });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error.");

  }
});

// Refresh access token
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken; // Expecting refresh token in cookies

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token not provided");
  }

  try {
    // Verify the refresh token using the secret
    const decode = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Generate a new access token
    const newAccessToken = jwt.sign(
      { id: decode.id, email: decode.email, role: decode.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "6d" } // Adjust the expiry time as needed
    );

    // Optionally, regenerate the refresh token (security measure)
    const newRefreshToken = jwt.sign(
      { id: decode.id, email: decode.email, role: decode.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "6d" } // Adjust the expiry time for refresh tokens
    );

    // Set the new refresh token in the cookies
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true, // Prevent JavaScript access to the cookie
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "strict", // Protect against CSRF
      maxAge: 6 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send the new access token in the response
    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
});
