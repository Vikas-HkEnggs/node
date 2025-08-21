import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import dotenv from "dotenv";
import { Op } from "sequelize";
import { Employee } from "../../models/index.js";
import RolePermission from "../../models/Auth/RolePermission.model.js";
import Role from "../../models/Auth/Role.model.js";

dotenv.config();

// Register function (Only accessible by admin)
export const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    designation,
    department,
    phone,
    address,
    city,
    state,
    country,
    pinCode,
  } = req.body;

  const file = req.file;

  const profile_pic = file?.path || null;

  // Check if an employee already exists with the provided email
  const existingEmployee = await Employee.findOne({ where: { email } });

  if (existingEmployee) {
    throw new ApiError(409, "User with this email already exists.");
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the new employee
  const employee = await Employee.create({
    name,
    email,
    password: hashedPassword,
    role,
    designation,
    department,
    phone: phone || null,
    profile_pic: profile_pic || null,
    address: address || null,
    city: city || null,
    state: state || null,
    country: country || null,
    pinCode: pinCode || null,
  });

  // Respond with success
  res
    .status(201)
    .json(new ApiResponse(201, employee, "Employee created successfully."));
});

// Get all employees
export const getAllEmployees = asyncHandler(async (req, res) => {
  try {
    const employees = await Employee.findAll({
      // where: { role: { [Op.ne]: "admin" } },
      attributes: { exclude: ["password"] },
    });

    if (employees.length === 0) {
      throw new ApiError(404, "No employees found");
    }

    // All Employees
    const allEmployees = employees.reverse();

    // Filter out the Active employees
    const activeAccounts = allEmployees.filter(
      (emp) => emp.status === "active"
    );

    // Filter out the Inactive employees
    const inactiveAccounts = allEmployees.filter(
      (emp) => emp.status === "inactive"
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          allEmployees,
          activeAccounts,
          inactiveAccounts,
        },
        "Employees fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(500, "Internal Server Error");
  }
});

// Get a single employee
export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findByPk(req.params.id);
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, employee, "Employee fetched successfully"));
});

// Update an employee
export const updateEmployee = asyncHandler(async (req, res) => {
  try {
    const file = req.file;
    const profile_pic = file?.path;

    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      res.status(404).json(new ApiResponse(404, null, "Employee not found"));
    }

    const updatedEmployee = await employee.update({
      ...req.body,
      ...(profile_pic && { profile_pic }),
    });

    if (!updatedEmployee) {
      throw new ApiError(500, "Failed to update employee");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedEmployee, "Employee updated successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal Server Error");
  }
});

// Reset password (Only accessible by admin)
export const resetPassword = asyncHandler(async (req, res) => {
  const { id, newPassword } = req.body;

  if (req.user.role !== "admin") {
    throw new ApiError(401, "Unauthorized: Only admin can reset password");
  }

  // Find the employee by ID
  const employee = await Employee.findByPk(id);
  if (!employee) {
    throw new ApiError(404, "Employee not found.");
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update the employee's password
  employee.password = hashedPassword;
  await employee.save();

  res
    .status(200)
    .json(new ApiResponse(200, null, "Password updated successfully."));
});

// Reset admin password (Only accessible by admin)
export const resetAdminPassword = asyncHandler(async (req, res) => {
  const { id, password, newPassword } = req.body;
  try {
    if (req.user.role !== "admin") {
      throw new ApiError(401, "Unauthorized: Only admin can reset password");
    }

    // Find the employee by ID
    const employee = await Employee.findByPk(id);
    if (!employee) {
      throw new ApiError(404, "Not exist in the database.");
    }

    // Compare the old password
    const isPasswordMatch = await bcrypt.compare(password, employee.password);

    if (!isPasswordMatch) {
      throw new ApiError(400, "Invalid old password.");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the employee's password
    employee.password = hashedPassword;
    await employee.save();

    res
      .status(200)
      .json(new ApiResponse(200, null, "Password updated successfully."));
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Internal Server Error");
  }
});

// Assign role to employee
export const assignRole = asyncHandler(async (req, res) => {
  const { employeeId, roleId } = req.body;

  // only admin can assign roles
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can assign roles");
  }

  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new ApiError(404, "Employee not found");

  employee.roleId = roleId;
  await employee.save();

  res
    .status(200)
    .json(new ApiResponse(200, employee, "Role assigned successfully"));
});

// Assign permissions to a role
export const assignPermissions = asyncHandler(async (req, res) => {
  const { roleId, permissionIds = [] } = req.body;

  // Only admin can assign
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Only admin can assign permissions");
  }

  const role = await Role.findByPk(roleId);
  if (!role) throw new ApiError(404, "Role not found");

  // Clear old permissions
  await RolePermission.destroy({ where: { roleId } });

  // Assign new permissions
  const rolePermissions = permissionIds.map((permissionId) => ({
    roleId,
    permissionId,
  }));
  await RolePermission.bulkCreate(rolePermissions);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { roleId, permissionIds },
        "Permissions assigned successfully"
      )
    );
});

export const getRolePermissions = asyncHandler(async (req, res) => {
  const { roleId } = req.params;

  const role = await Role.findByPk(roleId, {
    include: [
      {
        model: RolePermission,
        as: "permissions", // must match the alias in the association
        attributes: ["id", "module", "accessType"],
        through: { attributes: [] }, // hide join table fields
      },
    ],
  });

  if (!role) {
    return res.status(404).json(new ApiResponse(404, null, "Role not found"));
  }

  // Convert to plain object for easy JSON access
  const roleData = role.get({ plain: true });

  res.status(200).json(
    new ApiResponse(200, roleData.permissions, "Permissions fetched successfully")
  );
});
