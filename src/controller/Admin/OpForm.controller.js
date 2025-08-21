import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { OrderPunchForms } from "../../models/index.js";


// Admin: Create a new order punch form
export const createOrderPunchForm = asyncHandler(async (req, res) => {
  const { formName, fields } = req.body;

  if (!formName || !Array.isArray(fields) || fields.length === 0) {
    return res
      .status(400)
      .json({ error: "Form name and fields are required." });
  }

  try {
    const existingForm = await OrderPunchForms.findOne({
      where: { formName },
    });

    if (existingForm) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Form name already exists"));
    }

    // Iterate over the fields array
    for (const field of fields) {
      await OrderPunchForms.create({
        formName,
        inputTitle: field.inputTitle,
        name: field.name,
        inputType: field.inputType,
        inputOptions: field.inputOptions || [],
        inputSubOptions: field.inputSubOptions || [],
        required: field.required,
      });
    }

    res
      .status(200)
      .json(new ApiResponse(200, null, "Form created successfully"));
  } catch (error) {
    console.error("Error creating form:", error);
    throw new ApiError(500, "Failed to create form.");
  }
});

// Admin: Get all order punch forms by formName
export const getOrderPunchFormsByFormName = asyncHandler(async (req, res) => {
  const formName = req.params.formName;

  if (!formName) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Form name is required"));
  }

  try {
    const orderPunchForms = await OrderPunchForms.findAll({
      where: { formName },
    });
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          orderPunchForms,
          "Order punch form fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching order punch forms:", error);
    throw new ApiError(500, "Failed to fetch order punch forms.");
  }
});

// Admin: Get all order punch forms
export const getAllOrderPunchForms = asyncHandler(async (req, res) => {
  try {
    // get only formName field data
    const orderPunchForms = await OrderPunchForms.findAll({
      attributes: ["formName"],
    });

    // Extract unique form names
    const uniqueFormNames = [
      ...new Set(orderPunchForms.map((item) => item.formName)),
    ];

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          uniqueFormNames,
          "Order punch forms fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching order punch forms:", error);
    throw new ApiError(500, "Failed to fetch order punch forms.");
  }
});
