import { Op } from "sequelize";
import Employee from "../../models/Auth/Employees.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import QuotationUpdateHistory from "../../models/Quotation/QuotationUpdateHistory.model.js";
import Quotation from "../../models/Quotation/Quotation.model.js";
import QuotationItems from "../../models/Quotation/QuotationItems.model.js";

// Create a new quotation
export const createQuotation = asyncHandler(async (req, res) => {
  const { itemsData, companyData, termsData, discount, subject } = req.body;

  if (!itemsData || !companyData || !termsData || !subject) {
    throw new ApiError(400, "All fields are required");
  }

  try {
    const lastQuotation = await Quotation.findOne({
      order: [["quotationId", "DESC"]],
    });

    const quotationId = lastQuotation ? lastQuotation.quotationId + 1 : 1;

    const quotationDate = new Date();
    const quotationNumber = `HKPL/QT/25-26/0${quotationId}`;
    const createdBy = req.user?.id;

    const quotation = await Quotation.create({
      subject,
      quotationId,
      quotationNumber,
      quotationDate,
      itemsData,
      companyData,
      termsData,
      discount,
      createdBy,
      discount: discount ? discount : 0,
    });

    res
      .status(201)
      .json(new ApiResponse(201, quotation, "Quotation created successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, error.message);
  }
});

// Get all quotations
export const getAllQuotation = asyncHandler(async (req, res) => {
  try {
    const quotations = await Quotation.findAll({
      include: [
        {
          model: Employee,
          as: "creator",
          attributes: ["id", "name"],
        },
      ],
    });

    const allQuotations = quotations
      .filter((quotation) => !quotation.isDeleted)
      .reverse();

    const pendingQuotations = allQuotations.filter(
      (quotation) => quotation.status === "Pending"
    );
    const approvedQuotations = allQuotations.filter(
      (quotation) => quotation.status === "Approved"
    );
    const rejectedQuotations = allQuotations.filter(
      (quotation) => quotation.status === "Rejected"
    );
    const deletedQuotations = quotations
      .filter((quotation) => quotation.isDeleted)
      .reverse();

    res.status(200).json({
      success: true,
      message: "All Quotations fetched successfully",
      data: {
        allQuotations,
        pendingQuotations,
        approvedQuotations,
        rejectedQuotations,
        deletedQuotations,
      },
    });
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// Get quotation by ID
export const getQuotationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Quotation ID is required");
  }

  try {
    const quotation = await Quotation.findByPk(id);

    if (!quotation) {
      throw new ApiError(404, "Quotation not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, quotation, "Quotation fetched successfully"));
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// Update quotation status
export const updateQuotationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { quotationId } = req.params;

  if (!quotationId || !status) {
    throw new ApiError(400, "Quotation ID and status are required");
  }

  try {
    const quotation = await Quotation.findByPk(quotationId);

    if (!quotation) {
      throw new ApiError(404, "Quotation not found");
    }

    quotation.status = status;
    await quotation.save();

    res
      .status(200)
      .json(
        new ApiResponse(200, quotation, "Quotation status updated successfully")
      );
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// Update quotation by selection
export const updateQuotationStatusBySelection = asyncHandler(
  async (req, res) => {
    const { ids, status, remarks } = req.body;

    if (!ids || !status) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Ids and status are required"));
    }

    try {
      const quotations = await Quotation.findAll({
        where: {
          id: {
            [Op.in]: ids,
          },
        },
      });

      if (!quotations) {
        throw new ApiError(404, "Quotations not found");
      }

      for (const quotation of quotations) {
        quotation.status = status;
        quotation.remarks = remarks || "";
        quotation.approvedBy = req.user?.id;
        quotation.approvedAt = new Date();
        await quotation.save();
      }

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            quotations,
            "Selected Quotations updated successfully"
          )
        );
    } catch (error) {
      console.error(error);
      throw new ApiError(500, "Internal server error");
    }
  }
);

// soft delete by selection
export const softDeleteQuotationBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const quotations = await Quotation.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!quotations) {
      throw new ApiError(404, "Quotations not found");
    }

    for (const quotation of quotations) {
      quotation.isDeleted = true;
      await quotation.save();
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          quotations,
          "Selected Quotation deleted successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Restore by Selection
export const restoreQuotationBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const quotations = await Quotation.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!quotations) {
      throw new ApiError(404, "Quotations not found");
    }

    for (const quotation of quotations) {
      quotation.isDeleted = false;
      await quotation.save();
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          quotations,
          "Selected Quotations restored successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Hard delete by Selection
export const deleteQuotationBySelection = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    throw new ApiError(400, "Ids are required");
  }

  try {
    const quotations = await Quotation.findAll({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });

    if (!quotations) {
      throw new ApiError(404, "Quotations not found");
    }

    for (const quotation of quotations) {
      await quotation.destroy();
    }

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          quotations,
          "Selected Quotations permanently deleted successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Request for update
export const requestForUpdateQuotation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const quotationId = parseInt(id, 10);

  const { updatedData, quotationNumber, reason, remarks } = req.body;

  try {
    const updatedQuotation = await QuotationUpdateHistory.create({
      quotationId: quotationId,
      quotationNumber,
      updatedData,
      status: "Pending",
      reason: reason || "",
      remarks: remarks || "",
      createdBy: req.user.id,
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedQuotation,
          "Quotation Updated Request Generated Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, "failed to update quotation", error);
  }
});

// Approve or reject update
export const reviewUpdateQuotation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  try {
    const updatedQuotation = await QuotationUpdateHistory.findByPk(id);

    if (!updatedQuotation) {
      throw new ApiError(404, "Quotation History not found");
    }

    const quotation = await Quotation.findByPk(updatedQuotation?.quotationId);

    if (!quotation) {
      throw new ApiError(404, "Quotation not found");
    }

    // Updated edited data
    const updatedData = updatedQuotation.updatedData;

    if (status === "Approved") {
      for (const key in updatedData) {
        quotation[key] = updatedData[key];
      }

      let quotationNumber = quotation.quotationNumber;
      const revPattern = /\/REV-(\d+)/;
      const match = quotationNumber.match(revPattern);

      if (match) {
        const number = parseInt(match[1]);
        const newNumber = number + 1;
        quotation.quotationNumber = quotationNumber.replace(
          revPattern,
          `/REV-0${newNumber}`
        );
      } else {
        quotation.quotationNumber = quotationNumber + "/REV-01";
      }

      await quotation.save();
    }

    updatedQuotation.status = status;
    updatedQuotation.remarks = remarks;

    await updatedQuotation.save();

    res
      .status(200)
      .json(
        new ApiResponse(200, quotation, `Quotation ${status} Successfully`)
      );
  } catch (error) {
    throw new ApiError(500, "failed to update quotation", error);
  }
});

// Get all quotations
export const getAllUpdatedQuotations = asyncHandler(async (req, res) => {
  try {
    const updatedQuotations = await QuotationUpdateHistory.findAll({
      include: [
        {
          model: Employee,
          as: "creator",
          attributes: ["id", "name"],
        },
      ],
    });

    const allUpdatedQuotations = updatedQuotations.filter(
      (quotation) => !quotation.isDeleted
    );

    const pendingUpdatedQuotations = allUpdatedQuotations.filter(
      (quotation) => quotation.status === "Pending"
    );
    const approvedUpdatedQuotations = allUpdatedQuotations.filter(
      (quotation) => quotation.status === "Approved"
    );
    const rejectedUpdatedQuotations = allUpdatedQuotations.filter(
      (quotation) => quotation.status === "Rejected"
    );
    const deletedUpdatedQuotations = updatedQuotations
      .filter((quotation) => quotation.isDeleted)
      .reverse();

    res.status(200).json({
      success: true,
      message: "All Quotations fetched successfully",
      data: {
        allUpdatedQuotations,
        pendingUpdatedQuotations,
        approvedUpdatedQuotations,
        rejectedUpdatedQuotations,
        deletedUpdatedQuotations,
      },
    });
  } catch (error) {
    throw new ApiError(500, "Internal server error", error);
  }
});

// All Update quotation status at once
export const reviewUpdateQuotationBySelection = asyncHandler(
  async (req, res) => {
    const { ids, status, remarks } = req.body;

    if (!ids || !status) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Ids and status are required"));
    }

    try {
      const updatedQuotations = await QuotationUpdateHistory.findAll({
        where: {
          id: {
            [Op.in]: ids,
          },
        },
      });

      if (!updatedQuotations) {
        throw new ApiError(404, "Quotations not found");
      }

      for (const updatedQuotation of updatedQuotations) {
        await Quotation.findByPk(updatedQuotation?.quotationId).then(
          (quotation) => {
            if (status === "Approved") {
              for (const key in updatedQuotation.updatedData) {
                quotation[key] = updatedQuotation.updatedData[key];
              }

              let quotationNumber = quotation.quotationNumber;
              const revPattern = /\/REV-(\d+)/;
              const match = quotationNumber.match(revPattern);

              if (match) {
                const number = parseInt(match[1]);
                const newNumber = number + 1;
                quotation.quotationNumber = quotationNumber.replace(
                  revPattern,
                  `/REV-0${newNumber}`
                );
              } else {
                quotation.quotationNumber = quotationNumber + "/REV-01";
              }
              quotation.save();
            }
          }
        );
        updatedQuotation.status = status;
        updatedQuotation.remarks = remarks;
        await updatedQuotation.save();
      }

      res
        .status(200)
        .json(
          new ApiResponse(200, null, "Selected Quotations updated successfully")
        );
    } catch (error) {
      console.error(error);
      throw new ApiError(500, "Internal server error");
    }
  }
);

// soft delete by selection
export const softDeleteEditedQuotationBySelection = asyncHandler(
  async (req, res) => {
    const { ids } = req.body;

    if (!ids) {
      throw new ApiError(400, "Ids are required");
    }

    try {
      const quotations = await QuotationUpdateHistory.findAll({
        where: {
          id: {
            [Op.in]: ids,
          },
        },
      });

      if (!quotations) {
        throw new ApiError(404, "Quotations not found");
      }

      for (const quotation of quotations) {
        quotation.isDeleted = true;
        await quotation.save();
      }

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            quotations,
            "Selected Quotation deleted successfully"
          )
        );
    } catch (error) {
      console.error(error);
      throw new ApiError(500, "Internal server error");
    }
  }
);

// Restore by Selection
export const restoreEditedQuotationBySelection = asyncHandler(
  async (req, res) => {
    const { ids } = req.body;

    if (!ids) {
      throw new ApiError(400, "Ids are required");
    }

    try {
      const quotations = await QuotationUpdateHistory.findAll({
        where: {
          id: {
            [Op.in]: ids,
          },
        },
      });

      if (!quotations) {
        throw new ApiError(404, "Quotations not found");
      }

      for (const quotation of quotations) {
        quotation.isDeleted = false;
        await quotation.save();
      }

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            quotations,
            "Selected Quotations restored successfully"
          )
        );
    } catch (error) {
      console.error(error);
      throw new ApiError(500, "Internal server error");
    }
  }
);

// Hard delete by Selection
export const deleteEditedQuotationBySelection = asyncHandler(
  async (req, res) => {
    const { ids } = req.body;

    if (!ids) {
      throw new ApiError(400, "Ids are required");
    }

    try {
      const quotations = await QuotationUpdateHistory.findAll({
        where: {
          id: {
            [Op.in]: ids,
          },
        },
      });

      if (!quotations) {
        throw new ApiError(404, "Quotations not found");
      }

      for (const quotation of quotations) {
        await quotation.destroy();
      }

      res
        .status(200)
        .json(
          new ApiResponse(
            200,
            quotations,
            "Selected Quotations permanently deleted successfully"
          )
        );
    } catch (error) {
      console.error(error);
      throw new ApiError(500, "Internal server error");
    }
  }
);

// Add Quotation items with description
export const addQuotationItem = asyncHandler(async (req, res) => {
  const { itemName, description } = req.body;

  if (!itemName || !description) {
    throw new ApiError(400, "itemName and itemDescription are required");
  }

  try {
    const existingItem = await QuotationItems.findOne({
      where: {
        itemName: itemName.toUpperCase(),
      },
    });

    if (existingItem) {
      throw new ApiError(409, "Item already exists");
    }

    const newItem = await QuotationItems.create({
      itemName: itemName.toUpperCase(),
      description,
    });

    res
      .status(201)
      .json(new ApiResponse(201, newItem, "Item added successfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get all Quotation items
export const getAllQuotationItems = asyncHandler(async (req, res) => {
  try {
    const items = await QuotationItems.findAll();
    res
      .status(200)
      .json(new ApiResponse(200, items, "Items fetched successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// Get Quotation by Item Name
export const getQuotationByItemName = asyncHandler(async (req, res) => {
  const { itemName } = req.params;

  try {
    const quotation = await QuotationItems.findOne({
      where: {
        itemName: itemName.toUpperCase(),
      },
    });

    res
      .status(200)
      .json(new ApiResponse(200, quotation, "Quotation fetched successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});
