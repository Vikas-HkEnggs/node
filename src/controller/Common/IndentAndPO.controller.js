import { Op } from "sequelize";
import Employee from "../../models/Auth/Employees.model.js";
import Indent from "../../models/Indent/Indent.model.js";
import IndentUpdateRequests from "../../models/Indent/IndentUpdateRequests.model.js";
import PO from "../../models/PO Section/PO.model.js";
import PurchaseVendor from "../../models/PO Section/PurchaseVendor.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// Create a new indent
export const createIndent = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!items) {
    throw new ApiError(400, "Indent is required");
  }

  const createdBy = req.user?.id;

  if (!createdBy) {
    throw new ApiError(
      401,
      "Unauthorized: User ID is required to create an indent"
    );
  }

  const files = req.files;

  if (files && files.length > 0) {
    const fileUrls = files.map((file) => file.path);
    req.body.fileUrls = fileUrls;
  }

  // files path
  let indentFiles = [];
  if (files && files.length > 0) {
    indentFiles = files.map((file) => ({
      path: file.path,
    }));
  }

  try {
    const newIndent = await Indent.create({
      items,
      indentFiles,
      createdBy,
    });

    res
      .status(201)
      .json(new ApiResponse(201, newIndent, "Indent created successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get all indents
export const getAllIndents = asyncHandler(async (req, res) => {
  try {
    const indents = await Indent.findAll({
      include: [
        {
          model: Employee,
          as: "creator", // Use the alias defined in the association
          attributes: ["id", "name"], // Fetch only required fields
        },
      ],
    });

    const filteredIndents = indents
      .filter((indent) => !indent.isDeleted)
      .reverse();

    const deletedIndents = indents
      .filter((indent) => indent.isDeleted)
      .reverse();

    const pendingIndents = filteredIndents.filter(
      (indent) => indent.status === "pending"
    );

    const cancelledIndents = filteredIndents.filter(
      (indent) => indent.status === "cancelled"
    );

    const processedIndents = filteredIndents.filter(
      (indent) => indent.status === "processed"
    );

    const approvedIndents = filteredIndents.filter(
      (indent) => indent.status === "approved"
    );

    const indentsByDate = filteredIndents.reduce((acc, indent) => {
      const date = indent.createdAt.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(indent);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: "Indents fetched successfully",
      data: {
        allIndents: filteredIndents,
        indentsByDate,
        pendingIndents,
        approvedIndents,
        processedIndents,
        cancelledIndents,
        deletedIndents,
      },
    });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get one indent
export const getIndentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Indent ID is required");
  }

  try {
    const indent = await Indent.findByPk(id);

    if (!indent) {
      throw new ApiError(404, "Indent not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, indent, "Indent fetched successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Update indent status
export const updateIndentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, remarks, skuCode } = req.body;

  if (!id || !skuCode || !status) {
    throw new ApiError(400, "Indent ID, SKU Code, and Status are required");
  }

  const updatedBy = req.user?.id;

  if (!updatedBy) {
    throw new ApiError(
      401,
      "Unauthorized: User ID is required to update an indent"
    );
  }

  try {
    // Fetch the indent by ID
    const indent = await Indent.findByPk(id);
    if (!indent) {
      throw new ApiError(404, "Indent not found");
    }

    // Parse the `items` field as it's stored as JSON
    let indentData = indent.toJSON();
    let items =
      typeof indentData.items === "string"
        ? JSON.parse(indentData.items)
        : indentData.items;

    // Check if the item with the given SKU Code exists
    const itemIndex = items.findIndex((item) => item.skuCode === skuCode);
    if (itemIndex === -1) {
      return res.status(404).json(new ApiResponse(404, null, "Item not found"));
    }

    // Update the status of the matched item
    items[itemIndex].status = status;
    items[itemIndex].remarks = remarks || null;

    // Update the indent with modified items
    const updatedIndent = await Indent.update(
      {
        items: JSON.stringify(items),
        updatedBy,
      },
      { where: { id } }
    );

    // now check if indent all items are have approved status then update the indent status
    const allItemsApproved = items.every((item) => item.status === "approved");
    if (allItemsApproved) {
      await Indent.update({ status: "approved" }, { where: { id } });
    }

    // Send the response
    res
      .status(200)
      .json(new ApiResponse(200, updatedIndent, "Indent updated successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Approve all indent's items at once
export const updateAllIndentItems = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) {
    throw new ApiError(400, "Indent ID is required");
  }

  const updatedBy = req.user?.id;

  if (!updatedBy) {
    throw new ApiError(
      401,
      "Unauthorized: User ID is required to update an indent"
    );
  }

  try {
    const indent = await Indent.findByPk(id);

    if (!indent) {
      throw new ApiError(404, "Indent not found");
    }

    let indentData = indent.toJSON();

    let items =
      typeof indentData.items === "string"
        ? JSON.parse(indentData.items)
        : indentData.items;

    items.forEach((item) => {
      item.status = status;
    });

    indent.items = JSON.stringify(items);
    indent.updatedBy = updatedBy;
    indent.status = status;

    await indent.save();

    res
      .status(200)
      .json(new ApiResponse(200, indent, "Indent updated successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Approve all indent's items at once
export const updateIndentItemsStatusBySelection = asyncHandler(
  async (req, res) => {
    const { id } = req.params;
    const { skuCodes, status } = req.body;

    try {
      const indent = await Indent.findByPk(id);

      if (!indent) {
        throw new ApiError(404, "Indent not found");
      }

      let indentData = indent.toJSON();

      let items =
        typeof indentData.items === "string"
          ? JSON.parse(indentData.items)
          : indentData.items;

      items.forEach((item) => {
        if (skuCodes.includes(item.skuCode)) {
          item.status = status;
        }
      });

      // check if all items have approved status then update the indent status
      const allItemsApproved = items.every(
        (item) => item.status === "approved"
      );
      if (allItemsApproved) {
        await Indent.update({ status: "approved" }, { where: { id } });
      }

      indent.items = JSON.stringify(items);
      indent.updatedBy = req.user?.id;
      indent.status = status;

      await indent.save();

      res
        .status(200)
        .json(new ApiResponse(200, indent, "Indent updated successfully"));
    } catch (error) {
      console.error(object);
      throw new ApiError(500, "Internal server error");
    }
  }
);

// Update Indent
export const updateIndent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { skuCode, newQuantity, description } = req.body;

  if (!id || !skuCode || !newQuantity || !description) {
    throw new ApiError(
      400,
      "Id, skuCode, quantity and description are required"
    );
  }

  const updatedBy = req.user?.id;

  if (!updatedBy) {
    throw new ApiError(
      401,
      "Unauthorized: User ID is required to update an indent"
    );
  }

  try {
    const indent = await Indent.findByPk(id);

    if (!indent) {
      throw new ApiError(404, "Indent not found");
    }

    let indentData = indent.toJSON();

    let items = JSON.parse(indentData.items);

    const itemIndex = items.findIndex((item) => item.skuCode === skuCode);

    if (itemIndex === -1) {
      throw new ApiError(404, "Item not found");
    }

    items[itemIndex].quantity = newQuantity;
    items[itemIndex].description = description;

    const updatedIndent = await Indent.update(
      {
        items,
        updatedBy,
      },
      { where: { id } }
    );

    if (updatedIndent) {
      res
        .status(200)
        .json(
          new ApiResponse(200, updatedIndent, "Indent updated successfully")
        );
    }
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// request for update indent
export const requestForUpdateIndent = asyncHandler(async (req, res) => {
  const indent_id = parseInt(req.params.id, 10);
  const { items } = req.body;

  const parsed = JSON.parse(items);

  const updatedFields = parsed.updatedFields;

  const userId = req.user?.id;

  const files = req.files;

  if (files && files.length > 0) {
    const fileUrls = files.map((file) => file.path);
    req.body.fileUrls = fileUrls;
  }

  // files path
  let indentFiles = [];
  if (files && files.length > 0) {
    indentFiles = files.map((file) => ({
      path: file.path,
    }));
  }

  try {
    const indent = await Indent.findByPk(indent_id);

    if (!indent) {
      return res.status(404).json({ message: "Indent not found" });
    }

    const updateIndent = await IndentUpdateRequests.create({
      indent_id,
      updatedFields,
      updateDescription: "",
      status: "Pending",
      requestedBy: userId,
      indentFiles,
    });

    // if (indentFiles && indentFiles.length > 0) {
    //   indent.indentFiles = indentFiles;
    //   await indent.save();
    // }

    res.status(200).json({
      success: true,
      message: "Indent update request sent successfully!",
      data: updateIndent,
    });
  } catch (error) {
    throw new ApiError(500, "Failed to create update Indent request", [
      error.message,
    ]);
  }
});

// get all indent update requests
export const getAllIndentUpdateRequests = asyncHandler(async (req, res) => {
  try {
    const requests = (await IndentUpdateRequests.findAll()).reverse();

    const pendingRequests = requests.filter(
      (request) => request.status === "Pending"
    );
    const approvedRequests = requests.filter(
      (request) => request.status === "Approved"
    );
    const rejectedRequests = requests.filter(
      (request) => request.status === "Rejected"
    );

    res.status(200).json({
      success: true,
      message: "Indent update requests fetched successfully!",
      data: {
        allIndentUpdateRequests: requests,
        pendingIndentUpdateRequests: pendingRequests,
        approvedIndentUpdateRequests: approvedRequests,
        rejectedIndentUpdateRequests: rejectedRequests,
      },
    });
  } catch (error) {
    throw new ApiError(500, "Failed to fetch indent update requests", [
      error.message,
    ]);
  }
});

// review indent
export const reviewIndentUpdate = asyncHandler(async (req, res) => {
  let update_id = parseInt(req.params.update_id, 10);
  const { approve, adminRemarks } = req.body;

  if (!update_id || isNaN(update_id)) {
    throw new ApiError(400, "Invalid update_id provided");
  }

  update_id = Number(update_id);

  // Fetch the update request related to this indent
  const indentUpdateRequest = await IndentUpdateRequests.findByPk(update_id);

  if (!indentUpdateRequest) {
    throw new ApiError(404, "No update request found for this indent");
  }

  // Fetch the original indent
  const indent = await Indent.findByPk(indentUpdateRequest.indent_id);

  if (!indent) {
    throw new ApiError(404, "Indent not found");
  }

  const indentItems =
    typeof indent.items === "string" ? JSON.parse(indent.items) : indent.items;

  if (approve) {
    // Merge updatedFields into existing items
    if (indentUpdateRequest.updatedFields && indentUpdateRequest.updatedFields.items) {
      const updatedItemsMap = new Map(
        indentUpdateRequest.updatedFields.items.map((item) => [item.skuCode, item])
      );
      indent.items = indentItems.map((item) =>
        updatedItemsMap.has(item.skuCode)
          ? updatedItemsMap.get(item.skuCode)
          : item
      );
    }

    if (
      indentUpdateRequest.indentFiles &&
      indentUpdateRequest.indentFiles.length > 0
    ) {
      indent.indentFiles = indentUpdateRequest.indentFiles;
    }
    await indent.save();
  }

  indentUpdateRequest.adminRemarks = adminRemarks;

  // change status pending to approve or reject
  indentUpdateRequest.status = approve === true ? "Approved" : "Rejected";

  await indentUpdateRequest.save();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        indentUpdateRequest,
        approve ? "Indent updated successfully" : "Update request rejected"
      )
    );
});

// Update full indent
export const updateFullIndent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items, modifiedAt } = req.body;

  if (!id || !items || !Array.isArray(items)) {
    throw new ApiError(400, "Id and valid items array are required");
  }

  const updatedBy = req.user?.id;

  if (!updatedBy) {
    throw new ApiError(
      401,
      "Unauthorized: User ID is required to update an indent"
    );
  }

  try {
    const indent = await Indent.findByPk(id);

    if (!indent) {
      throw new ApiError(404, "Indent not found");
    }

    // Update indent fields
    const updatedIndent = await Indent.update(
      {
        items,
        updatedBy,
        modifiedAt: modifiedAt || new Date(),
      },
      { where: { id } }
    );

    if (updatedIndent) {
      res
        .status(200)
        .json(
          new ApiResponse(200, updatedIndent, "Indent updated successfully")
        );
    }
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Soft Delete Indent
export const softDeleteIndent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const indent = await Indent.findByPk(id);

    if (!indent) {
      throw new ApiError(404, "Indent not found");
    }

    indent.isDeleted = true;
    await indent.save();

    res
      .status(200)
      .json(new ApiResponse(200, indent, "Indent deleted successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// All delete Indents at once
export const softDeleteAllIndents = asyncHandler(async (req, res) => {
  try {
    const indents = await Indent.findAll();

    if (!indents) {
      throw new ApiError(404, "Indents not found");
    }

    for (const indent of indents) {
      indent.isDeleted = true;
      await indent.save();
    }
    res
      .status(200)
      .json(new ApiResponse(200, indents, "All indents deleted successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Soft Delete by Selection
export const softDeleteBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const indents = await Indent.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!indents) {
      throw new ApiError(404, "Indents not found");
    }

    for (const indent of indents) {
      indent.isDeleted = true;
      await indent.save();
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, indents, "Selected indents deleted successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Restore Indent
export const restoreIndent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const indent = await Indent.findByPk(id);

    if (!indent) {
      throw new ApiError(404, "Indent not found");
    }

    indent.isDeleted = false;
    await indent.save();

    res
      .status(200)
      .json(new ApiResponse(200, indent, "Indent restored successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Restore by Selection
export const restoreBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const indents = await Indent.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!indents) {
      throw new ApiError(404, "Indents not found");
    }

    for (const indent of indents) {
      indent.isDeleted = false;
      await indent.save();
    }
    res
      .status(200)
      .json(
        new ApiResponse(200, indents, "Selected indents restored successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// All Restore Indents at once
export const restoreAllIndents = asyncHandler(async (req, res) => {
  try {
    const indents = await Indent.findAll();

    if (!indents) {
      throw new ApiError(404, "Indents not found");
    }

    for (const indent of indents) {
      indent.isDeleted = false;
      await indent.save();
    }
    res
      .status(200)
      .json(new ApiResponse(200, indents, "All indents restored successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

//Hard Delete Indent
export const deleteIndent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  try {
    const indent = await Indent.findByPk(id);

    if (!indent) {
      throw new ApiError(404, "Indent not found");
    }

    await indent.destroy();

    res
      .status(200)
      .json(new ApiResponse(200, indent, "Indent deleted successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Hard delete by Selection
export const deleteBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const indents = await Indent.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!indents) {
      throw new ApiError(404, "Indents not found");
    }

    for (const indent of indents) {
      await indent.destroy();
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, indents, "Selected indents deleted successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Hard delete all soft deleted indents
export const deleteAllSoftDeletedIndents = asyncHandler(async (req, res) => {
  try {
    const indents = await Indent.findAll({ where: { isDeleted: true } });

    if (!indents) {
      throw new ApiError(404, "Indents not found");
    }

    for (const indent of indents) {
      await indent.destroy();
    }
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          indents,
          "All soft deleted indents deleted successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Add new items in existing indent
export const addNewItemsInExistingIndent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items } = req.body;

  try {
    const indent = await Indent.findByPk(id);

    if (!indent) {
      throw new ApiError(404, "Indent not found");
    }

    //  first find the existing items in the indent then add the new items also with old items and then save the data.

    const existingItems =
      typeof indent.items === "string"
        ? JSON.parse(indent.items)
        : indent.items;

    // check if new item's skuCode exists in the existing items
    const existingSkuCodes = existingItems.map((item) => item.skuCode);
    const newSkuCodes = items.map((item) => item.skuCode);

    if (newSkuCodes.some((skuCode) => existingSkuCodes.includes(skuCode))) {
      res
        .status(200)
        .json(
          new ApiResponse(200, items, "The item already exists in the indent")
        );
    } else {
      const newItemsToCreate = [...existingItems, ...items];
      indent.items = newItemsToCreate;

      await indent.save();
      res
        .status(200)
        .json(new ApiResponse(200, indent, "Items added successfully"));
    }
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// <<<<<<<<<<<<============== PO Controller =================>>>>>>>>>>>>>>

// create PO
export const createPO = asyncHandler(async (req, res) => {
  const {
    vendorName,
    vendorAddress,
    vendorEmail,
    items,
    discount,
    termsAndConditions,
    indentId,
  } = req.body;

  if (!vendorName || !vendorAddress || !items || !termsAndConditions) {
    throw new ApiError(400, "All fields are required");
  }

  const createdBy = req.user?.id;

  const currentDate = new Date();

  const monthFromDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return new Intl.DateTimeFormat("en-GB", {
      month: "short",
    }).format(date);
  };
  const getFinancialYear = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    const year = date.getFullYear();
    const shortYear = year % 100; // Get last two digits (e.g., 24 for 2024)

    return `${shortYear}-${shortYear + 1}`;
  };

  const formattedMonth = monthFromDate(currentDate).toUpperCase();
  const formattedYear = getFinancialYear(currentDate).toUpperCase();

  try {
    // check last poId
    const lastPO = await PO.findOne({
      order: [["poId", "DESC"]],
    });

    const poId = lastPO ? lastPO.poId + 1 : 1;
    // Format poId with leading zero if less than 10
    const formattedPoId = poId.toString().padStart(2, "0");
    const poNumber = `HKPL/PO/${formattedMonth}/${formattedYear}/${formattedPoId}`;

    const newPO = await PO.create({
      poNumber,
      vendorName,
      vendorAddress,
      vendorEmail: vendorEmail === "" ? vendorEmail : null,
      items,
      termsAndConditions,
      createdBy,
      poId,
      discount,
    });

    // make true isPoGenerate under Indent's items
    // make true isPoGenerated under Indent's items
    const indent = await Indent.findByPk(indentId);

    const indentItems =
      typeof indent.items === "string"
        ? JSON.parse(indent.items)
        : indent.items;

    // Extract skuCodes from PO items
    const skuCodes = items.map((item) => item.skuCode);

    // Update matching items
    const updatedItems = indentItems.map((item) => {
      if (skuCodes.includes(item.skuCode)) {
        return { ...item, isPoGenerated: true };
      }
      return item;
    });

    // Set the updated array back to the model
    indent.items = updatedItems;

    // Save once
    await indent.save();

    res.status(201).json({
      success: true,
      message: "PO created successfully",
      data: newPO,
    });
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// get all PO
export const getAllPOs = asyncHandler(async (req, res) => {
  try {
    const findAllPO = await PO.findAll({
      include: [
        {
          model: Employee,
          as: "creator",
          attributes: ["id", "name"],
        },
      ],
    });

    const allPO = findAllPO.filter((po) => !po.isDeleted).reverse();

    // group by vendor
    const poByVendor = allPO.reduce((acc, po) => {
      const vendorName = po.vendorName;
      if (!acc[vendorName]) {
        acc[vendorName] = [];
      }
      acc[vendorName].push(po);
      return acc;
    }, {});

    const pendingPO = allPO.filter((po) => po.status === "Pending");
    const approvedPO = allPO.filter((po) => po.status === "Approved");
    const rejectedPO = allPO.filter((po) => po.status === "Rejected");
    const completedPO = allPO.filter((po) => po.status === "Completed");
    const deletedPO = findAllPO.filter((po) => po.isDeleted).reverse();

    res.status(200).json({
      success: true,
      message: "All POs fetched successfully",
      data: {
        allPO,
        pendingPO,
        approvedPO,
        rejectedPO,
        completedPO,
        deletedPO,
        poByVendor,
      },
    });
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// Update PO whole data
export const updatePOData = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const po = await PO.findByPk(id);

    if (!po) {
      return res.status(404).json(new ApiResponse(404, null, "PO not found"));
    }

    const updatedPO = await po.update(req.body);

    res
      .status(200)
      .json(new ApiResponse(200, updatedPO, "PO updated successfully"));
  } catch (error) {}
});

// update PO
export const updatePoStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;
  const { id } = req.params;

  if (!status || !remarks) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Status and remarks are required"));
  }

  try {
    const po = await PO.findByPk(id);

    if (!po) {
      return res.status(404).json(new ApiResponse(404, null, "PO not found"));
    }

    po.status = status;
    po.remarks = remarks;
    po.approvedBy = req.user?.id;
    po.approvedAt = new Date();

    await po.save();

    res.status(200).json({
      success: true,
      message: "PO updated successfully",
      data: po,
    });
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// All delete Indents at once
export const updatePoStatusBySelection = asyncHandler(async (req, res) => {
  const { ids, status, remarks } = req.body;

  if (!ids || !status) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Ids and status are required"));
  }

  try {
    const pos = await PO.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!pos) {
      throw new ApiError(404, "PO not found");
    }

    for (const po of pos) {
      po.status = status;
      po.remarks = remarks || "";
      po.approvedBy = req.user?.id;
      po.approvedAt = new Date();
      await po.save();
    }

    res
      .status(200)
      .json(new ApiResponse(200, pos, "Selected POs updated successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// soft delete PO
export const softDeletePO = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const po = await PO.findByPk(id);

    if (!po) {
      throw new ApiError(404, "PO not found");
    }

    po.isDeleted = true;

    await po.save();

    res.status(200).json({
      success: true,
      message: "PO deleted successfully",
      data: po,
    });
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// soft delete by selection
export const softDeletePOBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const POs = await PO.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!POs) {
      throw new ApiError(404, "POs not found");
    }

    for (const po of POs) {
      po.isDeleted = true;
      await po.save();
    }

    res
      .status(200)
      .json(new ApiResponse(200, POs, "Selected POs deleted successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// restore PO
export const restorePO = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const po = await PO.findByPk(id);

    if (!po) {
      throw new ApiError(404, "PO not found");
    }

    po.isDeleted = false;

    await po.save();

    res.status(200).json({
      success: true,
      message: "PO restored successfully",
      data: po,
    });
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// Restore by Selection
export const restorePOBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const POs = await PO.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!POs) {
      throw new ApiError(404, "POs not found");
    }

    for (const po of POs) {
      po.isDeleted = false;
      await po.save();
    }

    res
      .status(200)
      .json(new ApiResponse(200, POs, "Selected POs restored successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// delete PO
export const deletePO = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const po = await PO.findByPk(id);

    if (!po) {
      throw new ApiError(404, "PO not found");
    }

    await po.destroy();

    res.status(200).json({
      success: true,
      message: "PO deleted successfully",
      data: po,
    });
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// Hard delete by Selection
export const deletePOBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const POs = await PO.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!POs) {
      throw new ApiError(404, "POs not found");
    }

    for (const po of POs) {
      await po.destroy();
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          POs,
          "Selected POs permanently deleted successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// cancel PO
export const cancelledThePO = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Id is required");
  }

  const updatedBy = req.user?.id;
  if (!updatedBy) {
    return res
      .status(401)
      .json(
        new ApiResponse(
          200,
          "Unauthorized: User ID is required to update an indent",
          null
        )
      );
  }

  try {
    const po = await PO.findByPk(id);

    if (!po) {
      throw new ApiError(404, "PO not found");
    }

    po.status = "Cancelled";
    po.updatedBy = req.user?.id;
    po.updatedAt = new Date();

    await po.save();

    res.status(200).json(new ApiResponse(200, po, "PO cancelled successfully"));
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// <<<<<<<<<<<<============== Purchase Vendors Controller =================>>>>>>>>>>>>>>

// Fetch all vendors details
export const getAllPurchaseVendors = asyncHandler(async (req, res) => {
  try {
    const vendorsDetails = await PurchaseVendor.findAll({
      attributes: ["id", "vendorName", "address", "gstNo", "partyEmail"],
      group: ["id"],
    });

    res.status(200).json({
      message: "Fetched all Vendors details successfully!",
      data: vendorsDetails,
    });
  } catch (error) {
    console.error("Error fetching Vendors details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});
