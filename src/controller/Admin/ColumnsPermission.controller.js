import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { ColumnsPermission } from "../../models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createColumnsPermission = asyncHandler(async (req, res) => {
  const { tableName, columnName, visible } = req.body;

  try {
    const columnsPermission = await ColumnsPermission.create({
      userId: req.user.id,
      tableName,
      columnName,
      visible,
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          columnsPermission,
          "Columns permission created successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Failed to create columns permission", error);
  }
});

export const getColumnsPermission = asyncHandler(async (req, res) => {
  const columnsPermission = await ColumnsPermission.findAll({
    where: { userId: req.user.id },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        columnsPermission,
        "Columns permission fetched successfully"
      )
    );
});

export const getColumnsPermissionByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const columnsPermission = await ColumnsPermission.findAll({
    where: { userId },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        columnsPermission,
        "Columns permission fetched successfully"
      )
    );
});

export const updateColumnsPermission = asyncHandler(async (req, res) => {
  const { tableName, columnName, visible } = req.body;
  const { id } = req.params;

  const userId = parseInt(id, 10); // Convert id to an integer

  try {
    const columnsPermission = await ColumnsPermission.findOne({
      where: { userId, tableName, columnName },
    });

    if (!columnsPermission) {
      const newColumnsPermission = await ColumnsPermission.create({
        userId,
        tableName,
        columnName,
        visible,
      });
      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            newColumnsPermission,
            "Columns permission created successfully"
          )
        );
    } else {
      await columnsPermission.update({ visible });
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          columnsPermission,
          "Columns permission updated successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Failed to update columns permission", error);
  }
});

export const getTableAndColumns = asyncHandler(async (req, res) => {
  const filePath = path.resolve(__dirname, "../../utils/tablesAndColumns.json");

  const data = fs.readFileSync(filePath, "utf-8");
  const tablesAndColumns = JSON.parse(data);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        tablesAndColumns,
        "Tables and columns fetched successfully"
      )
    );
});
