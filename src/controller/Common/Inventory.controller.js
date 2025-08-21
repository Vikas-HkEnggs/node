import { Op, Sequelize } from "sequelize";
import FinishedGoods from "../../models/Inventory/FinishedGood/FinishedGoods.model.js";
import Inserts from "../../models/Inventory/Inserts/Inserts.model.js";
import RawMaterials from "../../models/Inventory/RawMaterial/RawMaterial.model.js";
import Tools from "../../models/Inventory/Tools/Tools.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sequelize } from "../../../config/db.js";
import { ApiError } from "../../utils/ApiError.js";
import Employee from "../../models/Auth/Employees.model.js";

const MODEL_MAP = {
  'raw-materials': RawMaterials,
  'finished-goods': FinishedGoods,
  'tools': Tools,
  'inserts': Inserts,
};

export const handleInventoryOperation = async (req, res) => {
  try {
    const { operation } = req.params;
    const inventoryType = req.inventoryType;
    const Model = MODEL_MAP[inventoryType];

    if (!Model) {
      throw new ApiError(400, "Invalid inventory type");
    }

    switch (operation) {
      case "add":
        return await addInventoryItem(req, res, Model);
      case "getAll":
        return await getAllInventoryItems(req, res, Model);
      case "updateStatus":
        return await updateInventoryStatus(req, res, Model);
      case "updateStocks":
        return await updateInventoryStocks(req, res, Model);
      case "getCounts":
        return await getInventoryCounts(req, res, Model);
      case "updateMaxLevel":
        return await updateMaxLevel(req, res, Model);
      case "getLast":
        return await getLastInventoryItem(req, res, Model);
      case "softDelete":
        return await softDeleteInventoryItem(req, res, Model);
      case "restore":
        return await restoreInventoryItem(req, res, Model);
      case "delete":
        return await deleteInventoryItem(req, res, Model);
      default:
        throw new ApiError(404, "Operation not found");
    }
  } catch (error) {
    console.error("Inventory operation error:", error);
    if (error instanceof ApiError) {
      return res
        .status(error.statusCode)
        .json(new ApiResponse(error.statusCode, null, error.message));
    }
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
};

// Operation implementations
const addInventoryItem = async (req, res, Model) => {
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

  if (!skuCode || !itemName || !category || !unit || !type) {
    throw new ApiError(400, "All fields are required");
  }

  const createdBy = req.user?.id;
  if (!createdBy) {
    throw new ApiError(401, "Unauthorized: User ID is required");
  }

  const existingItem = await Model.findOne({ where: { skuCode } });
  if (existingItem) {
    throw new ApiError(409, "SKU code already exists for another Item");
  }

  const newItem = await Model.create({
    skuCode,
    itemName,
    category,
    unit,
    averageDailyConsumption: averageDailyConsumption || 0,
    leadTimeFromIndentToReceipt: leadTimeFromIndentToReceipt || 0,
    safetyFactor: safetyFactor || 0,
    moq: moq || 0,
    materialInTransit: materialInTransit || 0,
    type,
    createdBy,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newItem, `${Model.name} added successfully`));
};

// Operation implementations
const getAllInventoryItems = asyncHandler(async (req, res, Model) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      sortField,
      sortOrder = "ASC",
      globalFilter,
      columnFilters = [],
      type = "all",
    } = req.query;

    // Parse pagination
    const pageNum = parseInt(page);
    const size = pageSize === "9999" ? null : parseInt(pageSize); // Handle "Show All" case
    const offset = size ? Math.max((pageNum - 1) * size, 0) : 0;

    // Parse Filters
    let parsedFilters = [];
    try {
      parsedFilters =
        typeof columnFilters === "string"
          ? JSON.parse(columnFilters)
          : columnFilters;
    } catch (error) {
      console.error("Error parsing filters:", error);
    }

    // Base where clause
    const where = {};

    // Category filter
if (req.query.category) {
  where.category = req.query.category;
}


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
        break;
    }

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

    if (size !== null) {
      queryOptions.limit = size;
      queryOptions.offset = offset;
    }
    const items = await Model.findAndCountAll(queryOptions);

    // Format response
    const formattedData = items.rows.map((item) => {
      const plainItem = item.get({ plain: true });
      return {
        ...plainItem,
        updatedBy: plainItem.updatedByEmployee
          ? {
              id: plainItem.updatedByEmployee.id,
              name: plainItem.updatedByEmployee.name,
              email: plainItem.updatedByEmployee.email,
              designation: plainItem.updatedByEmployee.designation,
            }
          : { id: null, name: null, email: null },
        createdBy: plainItem.createdByEmployee
          ? {
              id: plainItem.createdByEmployee.id,
              name: plainItem.createdByEmployee.name,
              email: plainItem.createdByEmployee.email,
              designation: plainItem.createdByEmployee.designation,
            }
          : { id: null, name: null, email: null },
      };
    });

    // Handle categorized views
    if (type.startsWith("by")) {
      const groupKey = type.replace("by", "").toLowerCase();
      const groupedData = formattedData.reduce((acc, item) => {
        const key = item[groupKey] || `No ${groupKey}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        message: `${Model.name} grouped by ${groupKey} fetched successfully`,
        statusCode: 200,
        data: groupedData,
        totalRowCount: items.count,
      });
    }

    // Default response
    res.status(200).json({
      success: true,
      message: `${Model.name} fetched successfully`,
      statusCode: 200,
      data: formattedData,
      totalRowCount: items.count,
    });
  } catch (error) {
    console.error(`Error in getAll${Model.name}:`, error);
    if (error.name === "SequelizeDatabaseError") {
      throw new ApiError(400, "Invalid query parameters");
    }
    throw new ApiError(500, "Internal server error");
  }
});

// Operation implementations
const updateInventoryStatus = async (req, res, Model) => {
  const id = parseInt(req.params.id, 10);
  if (!id) throw new ApiError(400, "Id is required");

  const item = await Model.findByPk(id);
  if (!item) throw new ApiError(404, "Item not found");

  item.status = req.body.status;
  await item.save();

  return res
    .status(200)
    .json(new ApiResponse(200, item, "Status updated successfully"));
};
