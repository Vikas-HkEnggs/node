import { Op, Sequelize } from "sequelize";
import Employee from "../../../models/Auth/Employees.model.js";
import RawMaterials from "../../../models/Inventory/RawMaterial/RawMaterial.model.js";
import RawMaterialHistory from "../../../models/Inventory/RawMaterial/RawMaterialHistory.model.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import RawMaterialEditHistory from "../../../models/Inventory/RawMaterial/RawMaterialEditHistory.model.js";
import { sequelize } from "../../../../config/db.js";

// Create a new raw material
export const addRawMaterial = asyncHandler(async (req, res) => {
  const {
    skuCode,
    itemName,
    category,
    unit,
    type,
    averageDailyConsumption,
    leadTimeFromIndentToReceipt,
    safetyFactor,
    moq,
    materialInTransit,
  } = req.body;

  if (!skuCode) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "SKU Code is required"));
  }

  const createdBy = req.user?.id;

  if (!createdBy) {
    throw new ApiError(
      401,
      "Unauthorized: User ID is required to update raw material"
    );
  }

  const files = req.files;
  let images = [];
  if (files && files.length > 0) {
    images = files.map((file) => ({ path: file.path }));
  }

  try {
    // 1. Check if SKU already exists
    const existingRawMaterial = await RawMaterials.findOne({
      where: { skuCode },
    });
    if (existingRawMaterial) {
      return res
        .status(409)
        .json(
          new ApiResponse(409, null, "SKU code already exists for another Item")
        );
    }

    // 2. Get the last SKU by createdAt (or highest number)
    const lastRawMaterial = await RawMaterials.findOne({
      order: [["createdAt", "DESC"]],
    });

    if (lastRawMaterial) {
      const lastSku = lastRawMaterial.skuCode;

      // Extract numeric part from the last SKU
      const lastNumberMatch = lastSku.match(/(\d+)$/);
      const newNumberMatch = skuCode.match(/(\d+)$/);

      if (lastNumberMatch && newNumberMatch) {
        const lastNumber = parseInt(lastNumberMatch[1], 10);
        const newNumber = parseInt(newNumberMatch[1], 10);

        // Validate sequential order
        if (newNumber !== lastNumber + 1) {
          return res
            .status(400)
            .json(
              new ApiResponse(
                400,
                null,
                `Invalid SKU sequence. Last SKU was ${lastSku}, so next must end with ${
                  lastNumber + 1
                }`
              )
            );
        }
      }
    }

    // 3. Create new raw material
    const rawMaterial = await RawMaterials.create({
      skuCode,
      itemName,
      category,
      unit,
      images,
      averageDailyConsumption: averageDailyConsumption || 0,
      leadTimeFromIndentToReceipt: leadTimeFromIndentToReceipt || 0,
      safetyFactor: safetyFactor || 0,
      moq: moq || 0,
      materialInTransit: materialInTransit || 0,
      type,
      createdBy,
    });

    res
      .status(201)
      .json(
        new ApiResponse(201, rawMaterial, "Raw material added successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Update a raw material status
export const updateRawMaterialStatus = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const rawMaterial = await RawMaterials.findByPk(id);

    if (!rawMaterial) {
      throw new ApiError(404, "Raw material not found");
    }

    rawMaterial.status = req.body.status;
    await rawMaterial.save();

    res
      .status(200)
      .json(new ApiResponse(200, rawMaterial, "Raw material status updated"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get all raw materials
export const getAllRawMaterial = asyncHandler(async (req, res) => {
  try {
    const rawMaterials = await RawMaterials.findAll();

    // Raw Materials with Employee Details
    const rawMaterialsWithEmployeeDetails = await Promise.all(
      rawMaterials.map(async (rawMaterial) => {
        const updatedByEmployee = rawMaterial.updatedBy
          ? await Employee.findByPk(rawMaterial.updatedBy)
          : null;

        const createdByEmployee = rawMaterial.createdBy
          ? await Employee.findByPk(rawMaterial.createdBy)
          : null;

        // Ensure the password field is excluded
        const updatedByEmployeeWithoutPassword = updatedByEmployee
          ? {
              id: updatedByEmployee.id,
              name: updatedByEmployee.name,
              email: updatedByEmployee.email,
              designation: updatedByEmployee.designation,
            }
          : { id: null, name: null, email: null };

        const createdByEmployeeWithoutPassword = createdByEmployee
          ? {
              id: createdByEmployee.id,
              name: createdByEmployee.name,
              email: createdByEmployee.email,
              designation: createdByEmployee.designation,
            }
          : { id: null, name: null, email: null };

        const safetyFactor = parseFloat(rawMaterial.safetyFactor) || 0;
        const averageDailyConsumption =
          parseFloat(rawMaterial.averageDailyConsumption) || 0;
        const leadTime =
          parseFloat(rawMaterial.leadTimeFromIndentToReceipt) || 0;

        // Base max level calculation
        const baseMaxLevel =
          safetyFactor >= 0 && averageDailyConsumption >= 0 && leadTime >= 0
            ? safetyFactor * averageDailyConsumption * leadTime
            : 0;

        // Increase by percentage if toggle is on
        const maxLevelIncreasedBy =
          parseFloat(rawMaterial.maxLevelIncreasedBy) || 0;

        // If toggle is off (i.e., value is 0), use base. Otherwise apply % increase.
        const maxLevel = Math.round(
          maxLevelIncreasedBy > 0
            ? baseMaxLevel * (1 + maxLevelIncreasedBy / 100)
            : baseMaxLevel
        );

        return {
          ...rawMaterial.get(),
          maxLevel,
          updatedBy: updatedByEmployeeWithoutPassword,
          createdBy: createdByEmployeeWithoutPassword,
        };
      })
    );

    // Filter out pending edit request raw materials
    const pendingEditRequestRawMaterials =
      rawMaterialsWithEmployeeDetails.filter(
        (rawMaterial) =>
          !rawMaterial.isDeleted && rawMaterial.editRequestStatus === "Pending"
      );

    // Filter out rejected edit request raw materials
    const rejectedEditRequestRawMaterials =
      rawMaterialsWithEmployeeDetails.filter(
        (rawMaterial) =>
          !rawMaterial.isDeleted && rawMaterial.editRequestStatus === "Rejected"
      );

    // Filter out Approved raw materials
    const filteredRawMaterials = rawMaterialsWithEmployeeDetails.filter(
      (rawMaterial) =>
        !rawMaterial.isDeleted && rawMaterial.status === "Approved"
    );

    // Filter out pending raw materials
    const pendingRawMaterials = rawMaterialsWithEmployeeDetails.filter(
      (rawMaterial) =>
        !rawMaterial.isDeleted && rawMaterial.status === "Pending"
    );

    // Filter out rejected raw materials
    const rejectedRawMaterials = rawMaterialsWithEmployeeDetails.filter(
      (rawMaterial) =>
        !rawMaterial.isDeleted && rawMaterial.status === "Rejected"
    );

    // Group data by category
    const groupedByCategory = filteredRawMaterials.reduce(
      (acc, rawMaterial) => {
        const category = rawMaterial.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(rawMaterial);
        return acc;
      },
      {}
    );

    // Group by Low Stock
    const rawMaterialByLowStock = filteredRawMaterials.filter((rawMaterial) => {
      const requiredAverage = 30;
      const closingStock = rawMaterial.closingStock || 0;
      const maxLevel = rawMaterial.maxLevel || 1;
      const percentageAverage = (closingStock / maxLevel) * 100;
      return percentageAverage < requiredAverage;
    });

    // Group by High Stock
    const rawMaterialByHighStock = filteredRawMaterials.filter(
      (rawMaterial) => {
        const closingStock = rawMaterial.closingStock || 0;
        const maxLevel = rawMaterial.maxLevel || 1;
        const percentageAverage = (closingStock / maxLevel) * 100;
        return percentageAverage > 100;
      }
    );

    // Categorized by updatedAt
    const rawMaterialCategorizedByModifiedAt = filteredRawMaterials.reduce(
      (acc, rawMaterial) => {
        const modifiedAtDate = rawMaterial.modifiedAt
          ? new Date(rawMaterial.modifiedAt).toISOString().split("T")[0]
          : "no date";
        if (!acc[modifiedAtDate]) {
          acc[modifiedAtDate] = [];
        }
        acc[modifiedAtDate].push(rawMaterial);
        return acc;
      },
      {}
    );

    // Categorized by createdAt
    const rawMaterialCategorizedByCreatedAt = filteredRawMaterials.reduce(
      (acc, rawMaterial) => {
        const createdAtDate = rawMaterial.createdAt
          ? new Date(rawMaterial.createdAt).toISOString().split("T")[0]
          : "no date";
        if (!acc[createdAtDate]) {
          acc[createdAtDate] = [];
        }
        acc[createdAtDate].push(rawMaterial);
        return acc;
      },
      {}
    );

    // Filter by isDeleted
    const softDeletedRawMaterial = rawMaterialsWithEmployeeDetails.filter(
      (rawMaterial) => rawMaterial.isDeleted === true
    );

    res.status(200).json({
      success: true,
      message: "Raw materials fetched successfully",
      statusCode: 200,
      data: {
        allRawMaterials: filteredRawMaterials,
        pendingRawMaterials,
        rejectedRawMaterials,
        categorizedRawMaterials: groupedByCategory,
        rawMaterialByLowStock: rawMaterialByLowStock,
        rawMaterialByHighStock: rawMaterialByHighStock,
        rawMaterialCategorizedByUpdatedAt: rawMaterialCategorizedByModifiedAt,
        rawMaterialCategorizedByCreatedAt,
        softDeletedRawMaterial,
        pendingEditRequestRawMaterials,
        rejectedEditRequestRawMaterials,
      },
    });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get Last item of Raw Material
export const getLastRawMaterial = asyncHandler(async (req, res) => {
  try {
    const lastRawMaterial = await RawMaterials.findOne({
      order: [["id", "DESC"]],
    });
    res.status(200).json({
      success: true,
      message: "Raw material fetched successfully",
      statusCode: 200,
      data: lastRawMaterial,
    });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// find a item by category
export const getRawMaterialByCategory = asyncHandler(async (req, res) => {
  const category = req.params.category;
  try {
    const rawMaterial = await RawMaterials.findOne({
      where: { category },
    });
    res.status(200).json({
      success: true,
      message: "Raw material fetched successfully",
      statusCode: 200,
      data: rawMaterial,
    });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get all raw materials (with pagination, filtering, sorting, global search)
export const getAllRawMaterial2 = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      sortField,
      sortOrder = "ASC",
      globalFilter,
      columnFilters = [],
      type = "all",
      ...otherParams
    } = req.query;

    // Parse page and pageSize
    const pageNum = parseInt(page);
    const size = pageSize === "10000" ? null : parseInt(pageSize); // Handle "Show All" case
    const offset = size ? Math.max((pageNum - 1) * size, 0) : 0;

    // Parse filters if they come as stringified JSON
    let parsedFilters = [];
    try {
      parsedFilters =
        typeof columnFilters === "string"
          ? JSON.parse(columnFilters)
          : columnFilters;
    } catch (e) {
      console.error("Error parsing filters:", e);
    }

    // Base where clause
    const where = {};

    // Type-based filtering
    switch (type) {
      case "lowStock":
        where.isDeleted = false;
        where[Op.or] = [
          {
            [Op.and]: [
              { [Op.or]: [{ maxLevel: 0 }, { maxLevel: null }] },
              { closingStock: { [Op.lt]: 0.3 } },
            ],
          },
          sequelize.where(
            sequelize.literal("(closingStock / NULLIF(maxLevel,0)) < 0.3"),
            Op.eq,
            true
          ),
        ];
        break;

      case "highStock":
        where.isDeleted = false;
        where.closingStock = {
          [Op.gt]: sequelize.col("maxLevel"),
        };
        break;

      case "deleted":
        where.isDeleted = true;
        break;

      default:
        where.isDeleted = false;
    }

    // Global search
    if (globalFilter) {
      where[Op.or] = [
        { itemName: { [Op.like]: `%${globalFilter}%` } },
        { category: { [Op.like]: `%${globalFilter}%` } },
        Sequelize.literal(
          `REPLACE(REPLACE(CAST(type AS CHAR), '"', ''), '{', '') LIKE '%${globalFilter}%'`
        ),
      ];
    }

    // Column filters
    if (Array.isArray(parsedFilters)) {
      parsedFilters.forEach((filter) => {
        if (filter.id && filter.value) {
          where[filter.id] = { [Op.like]: `%${filter.value}%` };
        }
      });
    }

    // Build query options
    const queryOptions = {
      where,
      order: sortField ? [[sortField, sortOrder]] : [],
      include: [
        {
          model: Employee,
          as: "updatedByEmployee",
          attributes: { exclude: ["password"] },
        },
        {
          model: Employee,
          as: "createdByEmployee",
          attributes: { exclude: ["password"] },
        },
      ],
    };

    // Only add limit/offset if not showing all records
    if (size !== null) {
      queryOptions.limit = size;
      queryOptions.offset = offset;
    }

    // Execute query
    const rawMaterials = await RawMaterials.findAndCountAll(queryOptions);

    // Format employee data
    const formattedData = rawMaterials.rows.map((rawMaterial) => {
      const rm = rawMaterial.get({ plain: true });

      return {
        ...rm,
        updatedBy: rm.updatedByEmployee
          ? {
              id: rm.updatedByEmployee.id,
              name: rm.updatedByEmployee.name,
              email: rm.updatedByEmployee.email,
              designation: rm.updatedByEmployee.designation,
            }
          : { id: null, name: null, email: null },
        createdBy: rm.createdByEmployee
          ? {
              id: rm.createdByEmployee.id,
              name: rm.createdByEmployee.name,
              email: rm.createdByEmployee.email,
              designation: rm.createdByEmployee.designation,
            }
          : { id: null, name: null, email: null },
      };
    });

    // Handle categorized view requests
    if (type === "byCategory") {
      let filteredData = formattedData;

      // Apply global filter if present
      if (globalFilter) {
        filteredData = filteredData.filter(
          (item) =>
            item.itemName?.toLowerCase().includes(globalFilter.toLowerCase()) ||
            item.category?.toLowerCase().includes(globalFilter.toLowerCase())
        );
      }

      const groupedByCategory = filteredData.reduce((acc, item) => {
        const category = item.category || "Uncategorized";
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        message: "Categorized raw materials fetched successfully",
        statusCode: 200,
        data: groupedByCategory,
        totalRowCount: rawMaterials.count, // Return total count, not grouped count
      });
    }

    // Handle date-categorized views
    if (type === "byUpdatedAt") {
      const groupedByDate = formattedData.reduce((acc, item) => {
        const date = item.modifiedAt
          ? new Date(item.modifiedAt).toISOString().split("T")[0]
          : "No date";
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(item);
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        message: "Raw materials grouped by update date fetched successfully",
        statusCode: 200,
        data: groupedByDate,
        totalRowCount: rawMaterials.count,
      });
    }

    if (type === "byCreatedAt") {
      const groupedByDate = formattedData.reduce((acc, item) => {
        const date = item.createdAt
          ? new Date(item.createdAt).toISOString().split("T")[0]
          : "No date";
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        message: "Raw materials grouped by creation date fetched successfully",
        statusCode: 200,
        data: groupedByDate,
        totalRowCount: rawMaterials.count,
      });
    }

    // Default response for non-categorized requests
    res.status(200).json({
      success: true,
      message: "Raw materials fetched successfully",
      statusCode: 200,
      data: formattedData,
      totalRowCount: rawMaterials.count,
    });
  } catch (error) {
    console.error("Error in getAllRawMaterial2:", error);

    // Handle specific database errors
    if (error.name === "SequelizeDatabaseError") {
      throw new ApiError(400, "Invalid query parameters");
    }

    throw new ApiError(500, "Internal server error");
  }
});

// Get all raw materials counts with the same grouping logic as getAllRawMaterial
export const getRawMaterialCounts = asyncHandler(async (req, res) => {
  try {
    // First get all raw materials (non-deleted)
    const rawMaterials = await RawMaterials.findAll({
      where: { isDeleted: false },
      include: [
        {
          model: Employee,
          as: "updatedByEmployee",
          attributes: { exclude: ["password"] },
        },
        {
          model: Employee,
          as: "createdByEmployee",
          attributes: { exclude: ["password"] },
        },
      ],
    });

    // Convert to plain objects
    const rawMaterialsPlain = rawMaterials.map((rm) => rm.get({ plain: true }));

    // Count all items
    const allCount = rawMaterialsPlain.length;

    // Count low stock items (using your original logic)
    const lowStockCount = rawMaterialsPlain.filter((rawMaterial) => {
      const requiredAverage = 30;
      const closingStock = rawMaterial.closingStock || 0;
      const maxLevel = rawMaterial.maxLevel || 1;
      const percentageAverage = (closingStock / maxLevel) * 100;
      return percentageAverage < requiredAverage;
    }).length;

    // Count high stock items (using your original logic)
    const highStockCount = rawMaterialsPlain.filter((rawMaterial) => {
      const closingStock = rawMaterial.closingStock || 0;
      const maxLevel = rawMaterial.maxLevel || 1;
      const percentageAverage = (closingStock / maxLevel) * 100;
      return percentageAverage > 100;
    }).length;

    // Count recently updated (last 7 days)
    const recentlyUpdatedCount = rawMaterialsPlain.filter((rawMaterial) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return new Date(rawMaterial.updatedAt) >= sevenDaysAgo;
    }).length;

    // Count newly added (last 7 days)
    const newlyAddedCount = rawMaterialsPlain.filter((rawMaterial) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return new Date(rawMaterial.createdAt) >= sevenDaysAgo;
    }).length;

    // Count deleted items
    const deletedCount = await RawMaterials.count({
      where: { isDeleted: true },
    });

    // Count categorized items (number of unique categories)
    const categorizedCount = new Set(rawMaterialsPlain.map((rm) => rm.category))
      .size;

    const counts = {
      all: allCount,
      categorized: categorizedCount,
      lowStock: lowStockCount,
      highStock: highStockCount,
      recentlyUpdated: recentlyUpdatedCount,
      newlyAdded: newlyAddedCount,
      deleted: deletedCount,
    };

    res.status(200).json({
      success: true,
      message: "Raw material counts fetched successfully",
      statusCode: 200,
      data: counts,
    });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Update Raw Material Stocks
export const updateRawMaterialStocks = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  const updatedBy = req.user?.id;

  if (!updatedBy) {
    throw new ApiError(
      401,
      "Unauthorized: User ID is required to update raw material"
    );
  }
  try {
    // Fetch only relevant fields based on the incoming request body
    const requestedFields = Object.keys(req.body);

    const rawMaterial = await RawMaterials.findOne({
      attributes: ["id", "closingStock", "modifiedAt", ...requestedFields],
      where: { id },
    });

    if (!rawMaterial) {
      throw new ApiError(404, "Raw material not found");
    }

    // Identify changes between current and new data
    const updateData = {
      ...req.body,
      updatedBy,
      modifiedAt: new Date(),
    };

    // Log changes
    const changedFields = Object.entries(updateData).reduce(
      (changes, [key, value]) => {
        if (rawMaterial[key] !== value) {
          changes[key] = { previous: rawMaterial[key], current: value };
        }
        return changes;
      },
      {}
    );

    // Log changes if any fields are updated
    if (Object.keys(changedFields).length > 0) {
      await RawMaterialHistory.create({
        rawMaterialId: id,
        updatedFields: changedFields,
        updatedBy,
        updatedAt: new Date(),
      });
    }

    // Directly update the raw material and include the location field if applicable
    const [affectedRows, updatedRows] = await RawMaterials.update(updateData, {
      where: { id },
      returning: true,
    });

    if (affectedRows === 0) {
      throw new ApiError(404, "No raw material updated");
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedRows[0],
          "Raw material updated successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// // Update Raw Material
// export const updateRawMaterialData = asyncHandler(async (req, res) => {
//   const id = parseInt(req.params.id, 10);

//   if (!id) {
//     throw new ApiError(400, "Id is required");
//   }

//   const updatedBy = req.user?.id;

//   if (!updatedBy) {
//     throw new ApiError(
//       401,
//       "Unauthorized: User ID is required to update raw material"
//     );
//   }
//   try {
//     // Fetch only relevant fields based on the incoming request body
//     const requestedFields = Object.keys(req.body);

//     const rawMaterial = await RawMaterials.findOne({
//       attributes: ["id", "closingStock", "modifiedAt", ...requestedFields],
//       where: { id },
//     });

//     if (!rawMaterial) {
//       throw new ApiError(404, "Raw material not found");
//     }

//     // Log changes if any fields are updated
//     await RawMaterialEditHistory.create({
//       rawMaterialId: id,
//       updatedFields: { ...req.body },
//       updatedBy,
//       updatedAt: new Date(),
//     });

//     rawMaterial.editRequestStatus = "Pending";
//     rawMaterial.updatedBy = updatedBy;
//     rawMaterial.modifiedAt = new Date();

//     await rawMaterial.save();

//     res
//       .status(200)
//       .json(
//         new ApiResponse(
//           200,
//           rawMaterial,
//           "Raw material edit request generated. Please wait for approval."
//         )
//       );
//   } catch (error) {
//     console.error(error);
//     throw new ApiError(500, "Internal server error");
//   }
// });

// Update Raw Material

export const updateRawMaterialData = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) {
    throw new ApiError(400, "Id is required");
  }
  const updatedBy = req.user?.id;
  if (!updatedBy) {
    throw new ApiError(
      401,
      "Unauthorized: User ID is required to update raw material"
    );
  }
  try {
    // Fetch only relevant fields based on the incoming request body
    const requestedFields = Object.keys(req.body);
    const rawMaterial = await RawMaterials.findOne({
      attributes: ["id", "closingStock", "modifiedAt", ...requestedFields],
      where: { id },
    });
    if (!rawMaterial) {
      throw new ApiError(404, "Raw material not found");
    }
    // Identify changes between current and new data
    const updateData = {
      ...req.body,
    };
    // Log changes
    const changedFields = Object.entries(updateData).reduce(
      (changes, [key, value]) => {
        if (rawMaterial[key] !== value) {
          changes[key] = { previous: rawMaterial[key], current: value };
        }
        return changes;
      },
      {}
    );

    const [affectedRows, updatedRows] = await RawMaterials.update(updateData, {
      where: { id },
      returning: true,
    });

    if (affectedRows === 0) {
      throw new ApiError(404, "No raw material updated");
    }

    // // Log changes if any fields are updated
    // await RawMaterialEditHistory.create({
    //   rawMaterialId: id,
    //   updatedFields: { ...req.body },
    //   updatedBy,
    //   updatedAt: new Date(),
    // });

    // rawMaterial.editRequestStatus = "Pending";
    rawMaterial.updatedBy = updatedBy;
    rawMaterial.modifiedAt = new Date();

    await rawMaterial.save();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedRows[0],
          "Raw material edit request generated. Please wait for approval."
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Approve Updated Raw Material
export const approveUpdatedRawMaterial = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const editedRawMaterial = await RawMaterialEditHistory.findByPk(id);
    if (!editedRawMaterial) {
      throw new ApiError(404, "Edited Raw material not found");
    }

    const rawMaterial = await RawMaterials.findByPk(
      editedRawMaterial.rawMaterialId
    );
    if (!rawMaterial) {
      throw new ApiError(404, "Raw material not found");
    }

    if (status === "Approved") {
      const updatedFields = { ...editedRawMaterial.updatedFields };

      // Check if maxLevel needs to be recalculated
      const shouldRecalculateMaxLevel =
        "safetyFactor" in updatedFields ||
        "averageDailyConsumption" in updatedFields ||
        "leadTimeFromIndentToReceipt" in updatedFields;

      if (shouldRecalculateMaxLevel) {
        const safetyFactor =
          parseFloat(updatedFields.safetyFactor ?? rawMaterial.safetyFactor) ||
          0;

        const averageDailyConsumption =
          parseFloat(
            updatedFields.averageDailyConsumption ??
              rawMaterial.averageDailyConsumption
          ) || 0;

        const leadTimeFromIndentToReceipt =
          parseFloat(
            updatedFields.leadTimeFromIndentToReceipt ??
              rawMaterial.leadTimeFromIndentToReceipt
          ) || 0;

        updatedFields.maxLevel = Math.round(
          safetyFactor * averageDailyConsumption * leadTimeFromIndentToReceipt
        );
      }

      // Update raw material
      await RawMaterials.update(updatedFields, {
        where: { id: rawMaterial.id },
      });

      rawMaterial.editRequestStatus = "Approved";
      const updatedRawMaterial = await rawMaterial.save();

      editedRawMaterial.status = "Approved";
      await editedRawMaterial.save();

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            updatedRawMaterial,
            "Raw material edit request approved successfully."
          )
        );
    }

    if (status === "Rejected") {
      rawMaterial.editRequestStatus = "Rejected";
      const updatedRawMaterial = await rawMaterial.save();

      editedRawMaterial.status = "Rejected";
      await editedRawMaterial.save();

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            updatedRawMaterial,
            "Raw material edit request rejected successfully."
          )
        );
    }

    throw new ApiError(
      400,
      "Invalid status. Must be 'Approved' or 'Rejected'."
    );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get One Raw Material
export const getRawMaterialById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const rawMaterial = await RawMaterials.findByPk(id);

    if (!rawMaterial) {
      throw new ApiError(404, "Raw material not found");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, rawMaterial, "Raw material fetched successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Update Max Level
export const updateMaxLevelForRawMaterial = asyncHandler(async (req, res) => {
  try {
    const { maxLevelIncreaseBy } = req.body;

    // Validate maxLevelIncreaseBy value
    if (maxLevelIncreaseBy === undefined || isNaN(maxLevelIncreaseBy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid maxLevelIncreaseBy value",
      });
    }

    // Log current rows that match the condition
    const rowsBeforeUpdate = await RawMaterials.findAll({
      where: {
        [Op.or]: [
          { maxLevelIncreasedBy: { [Op.lt]: maxLevelIncreaseBy } },
          { maxLevelIncreasedBy: { [Op.is]: null } }, // Handle null values
          { maxLevelIncreasedBy: { [Op.eq]: 0 } }, // Handle zero as a valid value
        ],
      },
    });

    // If maxLevelIncreaseBy is 0, adjust the condition to ensure update
    let updatedCount = 0;
    if (maxLevelIncreaseBy === 0) {
      // Update rows where maxLevelIncreasedBy is null or any value, or previously 0
      updatedCount = await RawMaterials.update(
        { maxLevelIncreasedBy: maxLevelIncreaseBy },
        {
          where: {
            [Op.or]: [
              { maxLevelIncreasedBy: { [Op.is]: null } },
              { maxLevelIncreasedBy: { [Op.ne]: maxLevelIncreaseBy } }, // Update when it's not already 0
            ],
          },
        }
      );
    } else {
      // Normal case for maxLevelIncreaseBy > 0
      updatedCount = await RawMaterials.update(
        { maxLevelIncreasedBy: maxLevelIncreaseBy },
        {
          where: {
            [Op.or]: [
              { maxLevelIncreasedBy: { [Op.lt]: maxLevelIncreaseBy } },
              { maxLevelIncreasedBy: { [Op.is]: null } },
              { maxLevelIncreasedBy: { [Op.eq]: 0 } },
            ],
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      message: `${updatedCount} rows updated successfully`,
    });
  } catch (error) {
    console.error("Error updating max level:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update max level",
      error: error.message,
    });
  }
});

// Soft Delete Raw Material
export const softDeleteRawMaterial = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const rawMaterial = await RawMaterials.findByPk(id);

    if (!rawMaterial) {
      throw new ApiError(404, "Raw material not found");
    }

    // Now delete the raw material
    await rawMaterial.update({
      isDeleted: true,
      where: { id },
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, rawMaterial, "Raw material deleted successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Restore Raw Material
export const restoreRawMaterial = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const rawMaterial = await RawMaterials.findByPk(id);

    if (!rawMaterial) {
      throw new ApiError(404, "Raw material not found");
    }

    // Now Restore the raw material
    await rawMaterial.update({
      isDeleted: false,
      where: { id },
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, rawMaterial, "Raw material restored successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Permanent Delete Raw Material
export const deleteRawMaterial = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  const rawMaterial = await RawMaterials.findByPk(id);

  if (!rawMaterial) {
    throw new ApiError(404, "Raw material not found");
  }

  // Delete associated records in rawmaterialhistories
  await RawMaterialHistory.destroy({ where: { rawMaterialId: id } });

  // Now delete the raw material
  await rawMaterial.destroy();

  res
    .status(200)
    .json(
      new ApiResponse(200, rawMaterial, "Raw material deleted successfully")
    );
});

// Get Update History of a Raw Material
export const getRawMaterialItemHistoryForStock = asyncHandler(
  async (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (!id) {
      throw new ApiError(400, "Id is required");
    }

    try {
      const rawMaterialHistory = await RawMaterialHistory.findAll({
        where: { rawMaterialId: id },
        include: [
          {
            model: Employee, // Include Employee model
            as: "updatedByEmployee",
            attributes: ["id", "name"], // Fetch only required fields
          },
        ],
      });

      if (!rawMaterialHistory || rawMaterialHistory.length === 0) {
        return res
          .status(200)
          .json(
            new ApiResponse(200, [], "No history found for this raw material")
          );
      }

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            rawMaterialHistory,
            "Raw material history fetched successfully"
          )
        );
    } catch (error) {
      console.error(error);
      res.status(500).json(new ApiError(500, "Internal Server Error", error));
    }
  }
);

// Permanent Delete Raw material
export const permanentDeleteBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const rawMaterials = await RawMaterials.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!rawMaterials) {
      throw new ApiError(404, "Raw material not found");
    }

    for (const rawMaterial of rawMaterials) {
      await rawMaterial.destroy();
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, rawMaterials, "Raw material deleted successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get Update History of a Raw Material
export const getRawMaterialItemUpdateHistory = asyncHandler(
  async (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (!id) {
      throw new ApiError(400, "Id is required");
    }

    try {
      const rawMaterialHistory = await RawMaterialEditHistory.findAll({
        where: { rawMaterialId: id },
        include: [
          {
            model: Employee, // Include Employee model
            as: "editedByEmployee",
            attributes: ["id", "name"], // Fetch only required fields
          },
        ],
      });

      if (!rawMaterialHistory || rawMaterialHistory.length === 0) {
        return res
          .status(200)
          .json(
            new ApiResponse(200, [], "No history found for this raw material")
          );
      }

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            rawMaterialHistory,
            "Raw material history fetched successfully"
          )
        );
    } catch (error) {
      console.error(error);
      res.status(500).json(new ApiError(500, "Internal Server Error", error));
    }
  }
);
