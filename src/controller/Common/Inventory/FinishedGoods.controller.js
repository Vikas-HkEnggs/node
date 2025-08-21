import { Op, Sequelize } from "sequelize";
import Employee from "../../../models/Auth/Employees.model.js";
import FinishedGoods from "../../../models/Inventory/FinishedGood/FinishedGoods.model.js";
import FinishedGoodsHistory from "../../../models/Inventory/FinishedGood/FinishedGoodsHistory.model.js";
import { ApiError } from "../../../utils/ApiError.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { sequelize } from "../../../../config/db.js";

// Create a new finished good
export const addFinishedGoods = asyncHandler(async (req, res) => {
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
      "Unauthorized: User ID is required to add finished goods"
    );
  }

  const files = req.files;
  let images = [];
  if (files && files.length > 0) {
    images = files.map((file) => ({ path: file.path }));
  }

  try {
    const existingFinishedGood = await FinishedGoods.findOne({
      where: { skuCode },
    });

    if (existingFinishedGood) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Finished Good already exists. Please use a different SKU code."
          )
        );
    }

    // 2. Get the last SKU by createdAt (or highest number)
    const lastFinishedGood = await FinishedGoods.findOne({
      order: [["createdAt", "DESC"]],
    });

    if (lastFinishedGood) {
      const lastSku = lastFinishedGood.skuCode;

      // Extract numeric part from the end of last SKU and new SKU
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
      } else {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              null,
              `SKU must end with a numeric sequence. Provided SKU: ${skuCode}`
            )
          );
      }
    }

    const finishedGood = await FinishedGoods.create({
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
        new ApiResponse(201, finishedGood, "Finished Goods added successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Update a finishedGood status
export const updateFinishedGoodsStatus = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const finishedGood = await FinishedGoods.findByPk(id);

    if (!finishedGood) {
      throw new ApiError(404, "Finished Good not found");
    }

    finishedGood.status = req.body.status;
    await finishedGood.save();

    res
      .status(200)
      .json(new ApiResponse(200, finishedGood, "Finished Good status updated"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get all finished goods
export const getAllFinishedGoods = asyncHandler(async (req, res) => {
  try {
    const finishedGoods = await FinishedGoods.findAll();

    // Finished Goods with Employee Details
    const finishedGoodsWithEmployeeDetails = await Promise.all(
      finishedGoods.map(async (finishedGood) => {
        const updatedByEmployee = finishedGood.updatedBy
          ? await Employee.findByPk(finishedGood.updatedBy)
          : null;

        const createdByEmployee = finishedGood.createdBy
          ? await Employee.findByPk(finishedGood.createdBy)
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

        const safetyFactor = parseFloat(finishedGood.safetyFactor) || 0;
        const averageDailyConsumption =
          parseFloat(finishedGood.averageDailyConsumption) || 0;
        const leadTime =
          parseFloat(finishedGood.leadTimeFromIndentToReceipt) || 0;

        // Base max level calculation
        const baseMaxLevel =
          safetyFactor >= 0 && averageDailyConsumption >= 0 && leadTime >= 0
            ? safetyFactor * averageDailyConsumption * leadTime
            : 0;

        // Increase by percentage if toggle is on
        const maxLevelIncreasedBy =
          parseFloat(finishedGood.maxLevelIncreasedBy) || 0;

        // If toggle is off (i.e., value is 0), use base. Otherwise apply % increase.
        const maxLevel = Math.round(
          maxLevelIncreasedBy > 0
            ? baseMaxLevel * (1 + maxLevelIncreasedBy / 100)
            : baseMaxLevel
        );

        return {
          ...finishedGood.get(),
          maxLevel,
          updatedBy: updatedByEmployeeWithoutPassword,
          createdBy: createdByEmployeeWithoutPassword,
        };
      })
    );

    // Filter out deleted items at the root level
    const nonDeletedFinishedGoods = finishedGoodsWithEmployeeDetails.filter(
      (finishedGood) => !finishedGood.isDeleted
    );

    // Filter out Approved finished Good
    const filteredFinishedGoods = nonDeletedFinishedGoods.filter(
      (finishedGood) => finishedGood.status === "Approved"
    );

    // Filter out pending finished Good
    const pendingFinishedGoods = nonDeletedFinishedGoods.filter(
      (finishedGood) => finishedGood.status === "Pending"
    );

    // Filter out rejected finished Good
    const rejectedFinishedGoods = nonDeletedFinishedGoods.filter(
      (finishedGood) => finishedGood.status === "Rejected"
    );

    // Group data by category
    const groupedByCategory = filteredFinishedGoods.reduce(
      (acc, finishedGood) => {
        const category = finishedGood.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(finishedGood);
        return acc;
      },
      {}
    );

    // Group by Low Stock
    const finishedGoodByLowStock = filteredFinishedGoods.filter(
      (finishedGood) => {
        const requiredAverage = 30;
        const closingStock = finishedGood.closingStock || 0;
        const maxLevel = finishedGood.maxLevel || 1;

        // Calculate the percentage of stock available
        const percentageAverage = (closingStock / maxLevel) * 100;

        // Check if below the required average
        return percentageAverage < requiredAverage;
      }
    );

    // Group by High Stock
    const finishedGoodByHighStock = filteredFinishedGoods.filter(
      (finishedGood) => {
        const closingStock = finishedGood.closingStock || 0;
        const maxLevel = finishedGood.maxLevel || 1;

        // Calculate the percentage of stock available
        const percentageAverage = (closingStock / maxLevel) * 100;

        // Check if above the max average
        return percentageAverage > 100;
      }
    );

    // Categorized by updatedAt
    const finishedGoodsCategorizedByUpdatedAt = filteredFinishedGoods.reduce(
      (acc, finishedGood) => {
        const updatedAtDate = finishedGood.modifiedAt
          ? new Date(finishedGood.modifiedAt).toISOString().split("T")[0]
          : "no date"; // Use "no date" if updatedAt is null or undefined

        if (!acc[updatedAtDate]) {
          acc[updatedAtDate] = [];
        }

        acc[updatedAtDate].push(finishedGood);
        return acc;
      },
      {}
    );

    // Categorized by createdAt
    const finishedGoodsCategorizedByCreatedAt = filteredFinishedGoods.reduce(
      (acc, finishedGood) => {
        const createdAtDate = finishedGood.createdAt
          ? new Date(finishedGood.createdAt).toISOString().split("T")[0]
          : "no date";

        if (!acc[createdAtDate]) {
          acc[createdAtDate] = [];
        }

        acc[createdAtDate].push(finishedGood);
        return acc;
      },
      {}
    );

    // Soft-deleted Finished Goods
    const softDeletedFinishedGoods = finishedGoodsWithEmployeeDetails.filter(
      (finishedGood) => finishedGood.isDeleted
    );

    res.status(200).json({
      success: true,
      message: "Finished Goods fetched successfully",
      statusCode: 200,
      data: {
        allFinishedGoods: filteredFinishedGoods,
        pendingFinishedGoods,
        rejectedFinishedGoods,
        categorizedFinishedGoods: groupedByCategory,
        finishedGoodByLowStock,
        finishedGoodByHighStock,
        finishedGoodsCategorizedByUpdatedAt,
        finishedGoodsCategorizedByCreatedAt,
        softDeletedFinishedGoods,
      },
    });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get all finished goods2
export const getAllFinishedGoods2 = asyncHandler(async (req, res) => {
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
      // include: [
      //   {
      //     model: Employee,
      //     as: "updatedBy",
      //     attributes: { exclude: ["password"] },
      //   },
      //   {
      //     model: Employee,
      //     as: "createdBy",
      //     attributes: { exclude: ["password"] },
      //   },
      // ],
    };

    // Only add limit/offset if not showing all records
    if (size !== null) {
      queryOptions.limit = size;
      queryOptions.offset = offset;
    }

    // Execute query
    const finishedGoods = await FinishedGoods.findAndCountAll(queryOptions);

    // Format employee data
    const formattedData = finishedGoods.rows.map((finishedGood) => {
      const rm = finishedGood.get({ plain: true });

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
        message: "Categorized Finished Goods fetched successfully",
        statusCode: 200,
        data: groupedByCategory,
        totalRowCount: finishedGoods.count, // Return total count, not grouped count
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
        message: "Finished Goods grouped by update date fetched successfully",
        statusCode: 200,
        data: groupedByDate,
        totalRowCount: finishedGoods.count,
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
        message: "Finished Goods grouped by creation date fetched successfully",
        statusCode: 200,
        data: groupedByDate,
        totalRowCount: finishedGoods.count,
      });
    }

    // Default response for non-categorized requests
    res.status(200).json({
      success: true,
      message: "Finished Goods fetched successfully",
      statusCode: 200,
      data: formattedData,
      totalRowCount: finishedGoods.count,
    });
  } catch (error) {
    console.error("Error in getFinishedGoods2:", error);

    // Handle specific database errors
    if (error.name === "SequelizeDatabaseError") {
      throw new ApiError(400, "Invalid query parameters");
    }

    throw new ApiError(500, "Internal server error");
  }
});

// Get all finished Goods counts with the same grouping logic as finishedGoods
export const getfinishedGoodsCounts = asyncHandler(async (req, res) => {
  try {
    // First get all finished Goods (non-deleted)
    const finishedGoods = await FinishedGoods.findAll({
      where: { isDeleted: false },
    });

    // Convert to plain objects
    const finishedGoodsPlain = finishedGoods.map((rm) =>
      rm.get({ plain: true })
    );

    // Count all items
    const allCount = finishedGoodsPlain.length;

    // Count low stock items (using your original logic)
    const lowStockCount = finishedGoodsPlain.filter((finishedGood) => {
      const requiredAverage = 30;
      const closingStock = finishedGood.closingStock || 0;
      const maxLevel = finishedGood.maxLevel || 1;
      const percentageAverage = (closingStock / maxLevel) * 100;
      return percentageAverage < requiredAverage;
    }).length;

    // Count high stock items (using your original logic)
    const highStockCount = finishedGoodsPlain.filter((finishedGood) => {
      const closingStock = finishedGood.closingStock || 0;
      const maxLevel = finishedGood.maxLevel || 1;
      const percentageAverage = (closingStock / maxLevel) * 100;
      return percentageAverage > 100;
    }).length;

    // Count recently updated (last 7 days)
    const recentlyUpdatedCount = finishedGoodsPlain.filter((finishedGood) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return new Date(finishedGood.updatedAt) >= sevenDaysAgo;
    }).length;

    // Count newly added (last 7 days)
    const newlyAddedCount = finishedGoodsPlain.filter((finishedGood) => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return new Date(finishedGood.createdAt) >= sevenDaysAgo;
    }).length;

    // Count deleted items
    const deletedCount = await FinishedGoods.count({
      where: { isDeleted: true },
    });

    // Count categorized items (number of unique categories)
    const categorizedCount = new Set(
      finishedGoodsPlain.map((rm) => rm.category)
    ).size;

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

// Get Last item of FinishedGoods
export const getLastFinishedGood = asyncHandler(async (req, res) => {
  try {
    const lastFinishedGoods = await FinishedGoods.findOne({
      order: [["id", "DESC"]],
    });

    res.status(200).json({
      success: true,
      message: "Finished Good fetched successfully",
      statusCode: 200,
      data: lastFinishedGoods,
    });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// find a item by category
export const getFinishedGoodsByCategory = asyncHandler(async (req, res) => {
  const category = req.params.category;

  try {
    const finishedGood = await FinishedGoods.findOne({
      where: { category },
    });

    res.status(200).json({
      success: true,
      message: "Finished Good fetched successfully",
      statusCode: 200,
      data: finishedGood,
    });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Update Finished Good
export const updateFinishedGoodStocks = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  // Assuming you get the user ID from `req.user.id` (e.g., from authentication middleware)
  const updatedBy = req.user?.id;

  if (!updatedBy) {
    throw new ApiError(
      401,
      "Unauthorized: User ID is required to update Finished Good"
    );
  }

  try {
    const requestedFields = Object.keys(req.body);
    const finishedGood = await FinishedGoods.findOne({
      attributes: ["id", "closingStock", "modifiedAt", ...requestedFields],
      where: { id },
    });

    if (!finishedGood) {
      throw new ApiError(404, "Finished Good not found");
    }

    // Add the updatedBy field explicitly to the update data
    const updateData = {
      ...req.body,
      updatedBy,
      modifiedAt: new Date(),
    };

    const changedFields = Object.entries(updateData).reduce(
      (changes, [key, value]) => {
        if (finishedGood[key] !== value) {
          changes[key] = { previous: finishedGood[key], current: value };
        }
        return changes;
      },
      {}
    );

    // If there are changes, log them in the history table
    if (Object.keys(changedFields).length > 0) {
      await FinishedGoodsHistory.create({
        finishedGoodId: id,
        updatedFields: changedFields,
        updatedBy,
        updatedAt: new Date(),
      });
    }

    // Directly update the finishedGood and include the location field if applicable
    const [affectedRows, updatedRows] = await FinishedGoods.update(updateData, {
      where: { id },
      returning: true,
    });

    if (affectedRows === 0) {
      throw new ApiError(404, "No rows updated for Finished Good");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, finishedGood, "Finished Good updated successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Update Finished Good
export const updateFinishedGoodData = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  // Assuming you get the user ID from `req.user.id` (e.g., from authentication middleware)
  const updatedBy = req.user?.id;

  if (!updatedBy) {
    throw new ApiError(
      401,
      "Unauthorized: User ID is required to update Finished Good"
    );
  }

  try {
    const requestedFields = Object.keys(req.body);
    const finishedGood = await FinishedGoods.findOne({
      attributes: ["id", "closingStock", "modifiedAt", ...requestedFields],
      where: { id },
    });

    if (!finishedGood) {
      throw new ApiError(404, "Finished Good not found");
    }

    // Add the updatedBy field explicitly to the update data
    const updateData = {
      ...req.body,
      updatedBy,
      modifiedAt: new Date(),
    };

    // Directly update the finishedGood and include the location field if applicable
    const [affectedRows, updatedRows] = await FinishedGoods.update(updateData, {
      where: { id },
      returning: true,
    });

    if (affectedRows === 0) {
      throw new ApiError(404, "No rows updated for Finished Good");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, finishedGood, "Finished Good updated successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Delete Finished Good
export const deleteFinishedGood = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const finishedGood = await FinishedGoods.findByPk(id);

    if (!finishedGood) {
      throw new ApiError(404, "Finished Good not found");
    }

    // delete associated records in finishedGoodHistories
    await FinishedGoodsHistory.destroy({ where: { finishedGoodId: id } });

    // Now delete the finished good
    await finishedGood.destroy();
    res
      .status(200)
      .json(
        new ApiResponse(200, finishedGood, "Finished Good deleted successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get One Finished Good
export const getFinishedGoodById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const finishedGood = await FinishedGoods.findByPk(id);

    if (!finishedGood) {
      throw new ApiError(404, "Finished Good not found");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, finishedGood, "Finished Good fetched successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Update Max Level
export const updateMaxLevelForFinishedGood = asyncHandler(async (req, res) => {
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
    const rowsBeforeUpdate = await FinishedGoods.findAll({
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
      updatedCount = await FinishedGoods.update(
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
      updatedCount = await FinishedGoods.update(
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

    if (updatedCount === 0) {
      console.error("No rows were updated.");
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

// Soft Delete Finished Good
export const softDeleteFinishedGood = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const finishedGood = await FinishedGoods.findByPk(id);

    if (!finishedGood) {
      throw new ApiError(404, "Finished Good not found");
    }

    // Now delete the finished good
    await finishedGood.update({
      isDeleted: true,
      where: { id },
    });

    res
      .status(200)
      .json(
        new ApiResponse(200, finishedGood, "Finished Good deleted successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Restore Finished Good
export const restoreFinishedGood = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const finishedGood = await FinishedGoods.findByPk(id);

    if (!finishedGood) {
      throw new ApiError(404, "Finished Good not found");
    }

    // Now delete the finished good
    await finishedGood.update({
      isDeleted: false,
      where: { id },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          finishedGood,
          "Finished Good restored successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get Finished Good History
export const getFinishedGoodItemHistory = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const finishedGoodHistory = await FinishedGoodsHistory.findAll({
      where: { finishedGoodId: id },
      include: [
        {
          model: Employee, // Include Employee model
          as: "updatedByEmployee",
          attributes: ["id", "name"], //Fetch only required fields
        },
      ],
    });

    if (!finishedGoodHistory || finishedGoodHistory.length === 0) {
      new ApiResponse(200, [], "No history found for Finished Good");
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          finishedGoodHistory,
          "Finished good item's history fetched successfully"
        )
      );
  } catch (error) {
    console.error(error);
    res.status(500).json(new ApiError(500, "Internal Server Error", error));
  }
});
