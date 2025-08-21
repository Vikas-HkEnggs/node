import { Orders, FinishedGoods, Employee } from "../../models/index.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import Order from "../../models/Orders/Order.model.js";
import { Op, or } from "sequelize";
import { format } from "date-fns";
import OrderUpdate from "../../models/Orders/OrderUpdate.model.js";
import OrderUpdateHistory from "../../models/Orders/OrderUpdateHistory.model.js";
import Party_List_Solvent from "../../models/Orders/Party_List_Solvent.model.js";
import Party_List_Biomass from "../../models/Orders/Party_List_Biomass.model.js";
import RepairOrders from "../../models/Orders/RepairOrders.model.js";

//<<<<<<<<<<============ ORDERS CONTROLLERS ==========>>>>>>>>>>>

// Create Order and Check Inventory Before Sending Response
export const createOrder = asyncHandler(async (req, res) => {
  const {
    orderType,
    customerType,
    companyName,
    customerEmail = null,
    gstNumber = null,
    address = null,
    itemName,
    quantity,
    deliveryDate,
    price,
    packingCharges,
    gst,
    totalAmount,
    createdBy,
    type,
    confirm,
    unit,
    supplyType,
  } = req.body.data;

  try {
    //  Get today's date in 'YYYY-MM-DD' format
    const today = format(new Date(), "yyyy-MM-dd");

    // Define today's time window: 8 AM to 8 PM (IST)
    const dateStart = `${today} 08:00:00`;
    const dateEnd = `${today} 20:00:00`;

    // Query to find existing order with same type, itemName, and companyName placed between 8 AM and 8 PM today

    if (orderType?.trim().toUpperCase() === "REPAIR") {
      // Handle repair order specific logic
      // Step 1: Create Order
      const order = await RepairOrders.create({
        orderType: orderType?.toUpperCase(),
        customerType: customerType?.toUpperCase(),
        companyName: companyName?.toUpperCase(),
        customerEmail: customerEmail?.toUpperCase(),
        gstNumber: gstNumber?.toUpperCase(),
        address: address?.toUpperCase(),
        itemName: itemName?.toUpperCase(),
        deliveryDate,
        quantity,
        price,
        packingCharges,
        gst,
        totalAmount,
        createdBy,
        type,
        unit: unit?.toUpperCase(),
        supplyType: supplyType?.toUpperCase(),
      });

      // Step 2: Send Response (Including Order + Inventory Status)
      return res.status(201).json({
        message: "Repair Order created successfully!",
        order: order,
      });


    } else {
      const existingOrder = await Order.findOne({
        where: {
          type,
          itemName,
          companyName,
          createdAt: {
            [Op.between]: [dateStart, dateEnd],
          },
        },
      });
      // if existing order found then ask for confirmation that are you sure you want to create a new order for same product
      if (existingOrder && !confirm) {
        return res.status(409).json({
          message:
            "An order with the same type and itemName already exists. Are you sure you want to create a new order for the same product?",
          requiresConfirmation: true,
        });
      }

      // Step 1: Create Order
      const order = await Order.create({
        orderType: orderType?.toUpperCase(),
        customerType: customerType?.toUpperCase(),
        companyName: companyName?.toUpperCase(),
        customerEmail: customerEmail?.toUpperCase(),
        gstNumber: gstNumber?.toUpperCase(),
        address: address?.toUpperCase(),
        itemName: itemName?.toUpperCase(),
        deliveryDate,
        quantity,
        price,
        packingCharges,
        gst,
        totalAmount,
        createdBy,
        type,
        unit: unit?.toUpperCase(),
        supplyType: supplyType?.toUpperCase(),
      });

      // Step 2: Check Inventory Availability (Wait for it)
      const inventoryStatus = await checkInventoryAvailability(
        itemName,
        type,
        quantity
      );

      // Step 3: Send Response (Including Order + Inventory Status)
      res.status(201).json({
        message: "Order created successfully!",
        order: order,
        inventory: inventoryStatus,
      });
    }
  } catch (error) {
    console.error("Error in createOrder2:", error);
    throw new ApiError(500, "Failed to create order", [error.message]);
  }
});

// Fetch all orders and categorize them with available inventory quantity
export const getAllOrders = asyncHandler(async (req, res) => {
  try {
    //  Fetch all orders (including related product details)
    let orders = await Orders.findAll();

    const softDeletedOrders = orders.filter(
      (order) => order.isDeleted === true
    );

    const activeOrders = orders.filter((order) => !order.isDeleted);

    //  Enrich orders with available quantity from inventory
    let formattedOrders = await Promise.all(
      activeOrders.map(async (order) => {
        const inventoryStatus = await checkInventoryAvailability(
          order.itemName,
          order.type,
          order.quantity
        );

        const orderData = order.toJSON();

        return {
          ...orderData,
          product_name: orderData.Product?.product_name || null,
          availableQuantity: inventoryStatus.quantity || 0,
          inventoryStatus: inventoryStatus.status,
        };
      })
    );

    formattedOrders = formattedOrders.reverse();

    //  Categorize Orders by Status
    const dispatchedOrders = formattedOrders.filter(
      (order) => order.status === "Fully Dispatched"
    );

    // Pending Orders
    const pendingOrders = formattedOrders.filter(
      (order) => order.status === "Pending"
    );

    // Pending Orders by company name
    const pendingOrdersByCompany = formattedOrders
      .filter(
        (order) =>
          order.status !== "Fully Dispatched" && order.status !== "Cancelled"
      )
      .reduce((acc, order) => {
        const companyName = order.companyName;
        if (!acc[companyName]) {
          acc[companyName] = [];
        }
        acc[companyName].push(order);
        return acc;
      }, {});

    // Processing Orders
    const processingOrders = formattedOrders.filter(
      (order) => order.status === "Processing"
    );

    // Hold Orders
    const holdOrders = formattedOrders.filter(
      (order) => order.status === "Hold"
    );

    // Cancelled Orders
    const cancelledOrders = formattedOrders.filter(
      (order) => order.status === "Cancelled"
    );

    // Completed Orders
    const completedOrders = formattedOrders.filter(
      (order) => order.status === "Completed"
    );

    //  Categorize Orders by Company
    const ordersByCompany = formattedOrders.reduce((acc, order) => {
      const companyName = order.companyName.toLowerCase();
      if (!acc[companyName]) {
        acc[companyName] = [];
      }
      acc[companyName].push(order);
      return acc;
    }, {});

    //  Categorize Orders by Product
    const ordersByProduct = formattedOrders.reduce((acc, order) => {
      const productName = order.itemName;
      if (!acc[productName]) {
        acc[productName] = [];
      }
      acc[productName].push(order);
      return acc;
    }, {});

    //  Categorize and sort Orders by Delivery Date
    const ordersByDeliveryDate = Object.fromEntries(
      Object.entries(
        formattedOrders.reduce((acc, order) => {
          const deliveryDate = order.deliveryDate?.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });
          if (!deliveryDate) return acc;
          if (!acc[deliveryDate]) {
            acc[deliveryDate] = [];
          }
          acc[deliveryDate].push(order);
          return acc;
        }, {})
      ).sort(([dateA], [dateB]) => {
        const parsedA = new Date(dateA);
        const parsedB = new Date(dateB);
        return parsedB - parsedA; // descending order
      })
    );

    // Send the response
    res.status(200).json({
      message: "Orders fetched successfully!",
      data: {
        allOrders: formattedOrders,
        totalOrders: formattedOrders.length,
        pendingOrdersByCompany: pendingOrdersByCompany,
        pendingOrders,
        dispatchedOrders,
        processingOrders,
        holdOrders,
        cancelledOrders,
        completedOrders,
        ordersByCompany,
        ordersByProduct,
        ordersByDeliveryDate,
        softDeletedOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      message: "An error occurred while fetching orders.",
      error: error.message,
    });
  }
});
export const getAllRepairOrders = asyncHandler(async (req, res) => {
  try {
    //  Fetch all orders (including related product details)
    let orders = await RepairOrders.findAll();

    const softDeletedOrders = orders.filter(
      (order) => order.isDeleted === true
    );

    const activeOrders = orders.filter((order) => !order.isDeleted);

    //  Enrich orders with available quantity from inventory
    let formattedOrders = await Promise.all(
      activeOrders.map(async (order) => {
        const inventoryStatus = await checkInventoryAvailability(
          order.itemName,
          order.type,
          order.quantity
        );

        const orderData = order.toJSON();

        return {
          ...orderData,
          product_name: orderData.Product?.product_name || null,
          availableQuantity: inventoryStatus.quantity || 0,
          inventoryStatus: inventoryStatus.status,
        };
      })
    );

    formattedOrders = formattedOrders.reverse();

    //  Categorize Orders by Status
    const dispatchedOrders = formattedOrders.filter(
      (order) => order.status === "Fully Dispatched"
    );

    // Pending Orders
    const pendingOrders = formattedOrders.filter(
      (order) => order.status === "Pending"
    );

    // Pending Orders by company name
    const pendingOrdersByCompany = formattedOrders
      .filter(
        (order) =>
          order.status !== "Fully Dispatched" && order.status !== "Cancelled"
      )
      .reduce((acc, order) => {
        const companyName = order.companyName;
        if (!acc[companyName]) {
          acc[companyName] = [];
        }
        acc[companyName].push(order);
        return acc;
      }, {});

    // Processing Orders
    const processingOrders = formattedOrders.filter(
      (order) => order.status === "Processing"
    );

    // Hold Orders
    const holdOrders = formattedOrders.filter(
      (order) => order.status === "Hold"
    );

    // Cancelled Orders
    const cancelledOrders = formattedOrders.filter(
      (order) => order.status === "Cancelled"
    );

    // Completed Orders
    const completedOrders = formattedOrders.filter(
      (order) => order.status === "Completed"
    );

    //  Categorize Orders by Company
    const ordersByCompany = formattedOrders.reduce((acc, order) => {
      const companyName = order.companyName.toLowerCase();
      if (!acc[companyName]) {
        acc[companyName] = [];
      }
      acc[companyName].push(order);
      return acc;
    }, {});

    //  Categorize Orders by Product
    const ordersByProduct = formattedOrders.reduce((acc, order) => {
      const productName = order.itemName;
      if (!acc[productName]) {
        acc[productName] = [];
      }
      acc[productName].push(order);
      return acc;
    }, {});

    //  Categorize and sort Orders by Delivery Date
    const ordersByDeliveryDate = Object.fromEntries(
      Object.entries(
        formattedOrders.reduce((acc, order) => {
          const deliveryDate = order.deliveryDate?.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });
          if (!deliveryDate) return acc;
          if (!acc[deliveryDate]) {
            acc[deliveryDate] = [];
          }
          acc[deliveryDate].push(order);
          return acc;
        }, {})
      ).sort(([dateA], [dateB]) => {
        const parsedA = new Date(dateA);
        const parsedB = new Date(dateB);
        return parsedB - parsedA; // descending order
      })
    );

    // Send the response
    res.status(200).json({
      message: "Orders fetched successfully!",
      data: {
        allRepairOrders: formattedOrders,
        totalOrders: formattedOrders.length,
        pendingOrdersByCompany: pendingOrdersByCompany,
        pendingOrders,
        dispatchedOrders,
        processingOrders,
        holdOrders,
        cancelledOrders,
        completedOrders,
        ordersByCompany,
        ordersByProduct,
        ordersByDeliveryDate,
        softDeletedOrders,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      message: "An error occurred while fetching orders.",
      error: error.message,
    });
  }
});

// Soft delete order
export const softDeletedOrders = asyncHandler(async (req, res) => {
  const { order_id } = req.params;
  const id = parseInt(order_id, 10);

  if (typeof id !== "number") {
    // Prevent NaN from being used in SQL
    throw new ApiError(400, "A valid numeric order ID is required.");
  }

  try {
    const order = await Orders.findByPk(id);

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    //  now delete orders
    await order.update({
      isDeleted: true,
      where: { id },
    });
    res
      .status(200)
      .json(new ApiResponse(200, order, "Order deleted successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server error");
  }
});

// restore order
export const restoreOrder = asyncHandler(async (req, res) => {
  let { order_id } = req.params;
  order_id = parseInt(order_id, 10);

  if (!order_id) {
    return res.status(404).json(new ApiResponse(400, "Order ID is required"));
  }

  try {
    const order = await Orders.findByPk(order_id);

    if (!order) {
      return res
        .status(404)
        .json(new ApiResponse(404, order, "Order not found"));
    }
    order.isDeleted = false;
    await order.save();
    res
      .status(200)
      .json(new ApiResponse(200, order, "Order restored successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Internal server Error");
  }
});

// Permanently deleted Order
export const permanentDeleteOrder = asyncHandler(async (req, res) => {
  let { order_id } = req.params;
  order_id = parseInt(order_id, 10);

  if (!order_id) {
    return res.status(404).json(new ApiResponse(400, "Order ID is required"));
  }

  try {
    const order = await Orders.findByPk(order_id);

    if (!order) {
      return res
        .status(404)
        .json(new ApiResponse(404, order, "Order not found"));
    }

    await order.destroy();

    res.status(200).json({
      success: true,
      message: "order deleted successfully",
      data: order,
    });
  } catch (error) {
    throw new ApiError(500, "Internal server Error");
  }
});

// get single order
export const getSingleOrder = asyncHandler(async (req, res) => {
  const order_id = parseInt(req.params.order_id, 10);

  try {
    const orderUpdate = await Order.findByPk(order_id);
    if (!orderUpdate) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order fetched successfully!",
      data: orderUpdate,
    });
  } catch (error) {
    throw new ApiError(500, "Failed to fetch order", [error.message]);
  }
});

// update order
export const updateOrder = asyncHandler(async (req, res) => {
  try {
    const order_id = parseInt(req.params.order_id, 10);
    const {} = req.body;

    const order = await Orders.findByPk(order_id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const updatedOrder = await order.update(req.body);
    res.status(200).json(updatedOrder);
  } catch (error) {
    throw new ApiError(500, "Failed to update order", [error.message]);
  }
});

// Update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    const order_id = parseInt(req.params.order_id, 10);
    const { status } = req.body;

    // Validate inputs
    if (!order_id || !status) {
      return res
        .status(400)
        .json({ message: "Order ID and status are required" });
    }

    const validStatuses = [
      "Pending",
      "Completed",
      "Cancelled",
      "Processing",
      "Hold",
      "Partially Dispatched",
      "Fully Dispatched",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Update order
    const [updated] = await Orders.update({ status }, { where: { order_id } });

    // If status is "Partially Dispatched" or "Fully Dispatched", update dispatched_quantity
    if (status === "Partially Dispatched" || status === "Fully Dispatched") {
      const { dispatched_quantity } = req.body;
      if (dispatched_quantity) {
        await Orders.update({ dispatched_quantity }, { where: { order_id } });
      }
    }

    if (!updated) {
      return res.status(404).json({ message: "Order not found" });
    }

    res
      .status(200)
      .json(new ApiResponse(200, updated, "Order status updated successfully"));
  } catch (error) {
    console.error("Error updating order status:", error);
    throw new ApiError(500, "Failed to update order status", [error.message]);
  }
});

// Update dispatched quantity
export const updateOrderDispatchedQuantity = asyncHandler(async (req, res) => {
  const order_id = parseInt(req.params.order_id, 10);
  const { dispatched_quantity, dispatched_date } = req.body;

  // Validate inputs
  if (!order_id) {
    return res.status(400).json({
      message: "Order ID is required",
    });
  }

  if (!dispatched_quantity || !dispatched_date) {
    return res.status(400).json({
      message: "Dispatched quantity and date are required",
    });
  }

  try {
    const order = await Orders.findByPk(order_id);

    if (!order) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Order not found"));
    }

    let totalDispatchedQuantity = order.dispatched
      ? order.dispatched.reduce(
          (sum, item) => sum + parseInt(item.dispatched_quantity || 0),
          0
        )
      : 0;

    if (
      parseInt(totalDispatchedQuantity) + parseInt(dispatched_quantity) >
      order.quantity
    ) {
      return res.status(400).json({
        message: "Total dispatched quantity cannot exceed order quantity",
      });
    }

    // push the dispatched quantity and date to the dispatched array
    if (order.dispatched === null || order.dispatched === undefined) {
      order.dispatched = [];
    }

    const updatedDispatched = [
      ...order.dispatched,
      { dispatched_quantity, dispatched_date },
    ];

    const updatedOrder = await order.update({
      dispatched: updatedDispatched,
      lastDispatchedDate: dispatched_date,
      status:
        parseInt(totalDispatchedQuantity) + parseInt(dispatched_quantity) >=
        order.quantity
          ? "Fully Dispatched"
          : "Partially Dispatched",
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedOrder,
          "Dispatched quantity updated successfully!"
        )
      );
  } catch (error) {
    throw new ApiError(500, "Failed to update dispatched quantity", [
      error.message,
    ]);
  }
});

// Check Inventory availability
export const checkInventoryAvailability = async (itemName, type, quantity) => {
  try {
    let allFinishedGoods = await FinishedGoods.findAll({
      attributes: ["id", "skuCode", "itemName", "type", "closingStock"],
    });

    // Step 1: Match by Item Name
    let matchedItems = allFinishedGoods.filter((item) =>
      item.itemName.toLowerCase().includes(itemName.toLowerCase())
    );

    if (matchedItems.length === 0) {
      return {
        available: false,
        status: "Not Available",
        message: "Item not found in inventory.",
      };
    }

    let bestMatch = null;
    let highestMatchCount = 0;

    for (let item of matchedItems) {
      if (item.type) {
        const itemSpecification = item.type;
        let matchCount = 0;

        for (let key of Object.keys(type)) {
          let userValue = type[key]?.toString().trim().toLowerCase() || "";
          let dbValue =
            itemSpecification[key]?.toString().trim().toLowerCase() || "";

          if (userValue && dbValue) {
            if (userValue === dbValue) {
              matchCount += 1; // Exact match
            } else if (
              dbValue.includes(userValue) ||
              userValue.includes(dbValue)
            ) {
              matchCount += 0.5; // Partial match
            }
          }
        }

        if (matchCount > highestMatchCount) {
          highestMatchCount = matchCount;
          bestMatch = item;
        }
      }
    }

    if (bestMatch) {
      return {
        available: bestMatch.closingStock > 0,
        status:
          bestMatch.closingStock > 0
            ? "Product Available"
            : "Product Not Available",
        quantity: bestMatch.closingStock,
        item: bestMatch,
      };
    }

    return {
      available: false,
      status: "Not Available",
      message: "No suitable match found in inventory.",
    };
  } catch (error) {
    console.error("Error in checkInventoryAvailability:", error);
    return { error: "Failed to check inventory" };
  }
};

// Request for order update
export const requestForUpdate = asyncHandler(async (req, res) => {
  const order_id = parseInt(req.params.order_id, 10);
  const { updatedFields, updateDescription } = req.body;
  const userId = req.user.id;

  try {
    const order = await Orders.findByPk(order_id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const updateOrder = await OrderUpdate.create({
      order_id,
      updatedFields,
      updateDescription,
      status: "Pending",
      requestedBy: userId,
    });

    res.status(200).json({
      success: true,
      message: "Order update request sent successfully!",
      data: updateOrder,
    });
  } catch (error) {
    throw new ApiError(500, "Failed to update order", [error.message]);
  }
});

// Review order update
export const reviewOrderUpdate = asyncHandler(async (req, res) => {
  try {
    const update_id = parseInt(req.params.update_id, 10);
    const { status, adminRemarks } = req.body;

    const pendingUpdate = await OrderUpdate.findByPk(update_id);
    if (!pendingUpdate) {
      return res.status(404).json({ message: "Update request not found" });
    }

    // If status rejected then only send remarks and change status
    if (status === "Rejected") {
      await pendingUpdate.update({ status, adminRemarks });

      return res.status(200).json({
        success: true,
        message: "Order update request rejected!",
      });
    }

    // Store the order before updating
    const orderBeforeUpdate = await Orders.findByPk(pendingUpdate.order_id);

    if (!orderBeforeUpdate) {
      return res.status(404).json({ message: "Order not found" });
    }

    await OrderUpdateHistory.create({
      order_id: orderBeforeUpdate.order_id,
      previousOrder: orderBeforeUpdate,
      requestedBy: pendingUpdate.requestedBy,
      requestedAt: pendingUpdate.createdAt,
      updatedBy: req.user.id,
    });

    // Update the order
    if (status === "Approved") {
      await Orders.update(pendingUpdate.updatedFields, {
        where: { order_id: pendingUpdate.order_id },
      });
    }

    await pendingUpdate.update({ status, adminRemarks });

    res.status(200).json({
      success: true,
      message: "Order update request approved!",
    });
  } catch (error) {
    throw new ApiError(500, "Failed to update order", [error.message]);
  }
});

// Get all order update requests
export const getAllUpdateRequests = asyncHandler(async (req, res) => {
  try {
    const orderUpdates = await OrderUpdate.findAll({
      include: [
        {
          model: Employee, // Include Employee model
          as: "requestedByEmployee",
          attributes: ["id", "name"], // Fetch only required fields
        },
      ],
    });

    // Approved order updates requests
    const approvedOrderUpdateRequests = orderUpdates.filter(
      (orderUpdate) => orderUpdate.status === "Approved"
    );

    // Pending order updates requests
    const pendingOrderUpdateRequests = orderUpdates.filter(
      (orderUpdate) => orderUpdate.status === "Pending"
    );

    // Rejected order updates requests
    const rejectedOrderUpdateRequests = orderUpdates.filter(
      (orderUpdate) => orderUpdate.status === "Rejected"
    );

    res.status(200).json({
      success: true,
      message: "Fetched all order update requests successfully!",
      data: {
        totalOrderUpdateRequests: orderUpdates.reverse(),
        approvedOrderUpdateRequests: approvedOrderUpdateRequests.reverse(),
        pendingOrderUpdateRequests: pendingOrderUpdateRequests.reverse(),
        rejectedOrderUpdateRequests: rejectedOrderUpdateRequests.reverse(),
      },
    });
  } catch (error) {
    throw new ApiError(500, "Failed to fetch order update requests", [
      error.message,
    ]);
  }
});

// Get order update history
export const getOrderUpdateHistories = asyncHandler(async (req, res) => {
  // get order update history by order id. fetch all history of a order

  try {
    const order_id = parseInt(req.params.order_id, 10);
    const OrderUpdateHistories = await OrderUpdateHistory.findAll({
      where: {
        order_id: order_id,
      },
      include: [
        {
          model: Employee,
          as: "updatedByEmployee",
          attributes: ["id", "name"],
        },
        {
          model: Employee,
          as: "requestedByEmployee",
          attributes: ["id", "name"],
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: "Order update history fetched successfully!",
      data: OrderUpdateHistories,
    });
  } catch (error) {
    throw new ApiError(500, "Failed to fetch order update requests", [
      error.message,
    ]);
  }
});

//<<<<<<<<<<============ SALE PARTY CONTROLLERS ==========>>>>>>>>>>>

// Add new sale party details
export const addSaleParty = asyncHandler(async (req, res) => {
  try {
    const {
      party_name,
      price_list,
      address,
      state,
      pincode,
      contact_person,
      telephone,
      mobile_no,
      party_email,
      dealer_type,
      gst_no,
      pan_no,
      credit_days,
      credit_limit,
      party_type,
    } = req.body;

    if (!party_name || !address) {
      return res.status(400).json({
        message: "Party name and address are required fields.",
      });
    }

    if (party_type === "BMP") {
      // Check if the sale party already exists
      const existingParty = await Party_List_Biomass.findOne({
        where: { party_name: party_name.toUpperCase() },
      });

      if (existingParty) {
        return res.status(409).json({
          message: "Sale party with this name already exists.",
        });
      }

      // Create a new sale party record
      const newParty = await Party_List_Biomass.create({
        party_name: party_name.toUpperCase(),
        price_list,
        address: address.toUpperCase(),
        state,
        pincode,
        contact_person,
        telephone,
        mobile_no,
        party_email,
        dealer_type,
        gst_no: gst_no.toUpperCase() || null,
        pan_no: pan_no.toUpperCase() || null,
        credit_days,
        credit_limit,
      });

      return res
        .status(201)
        .json(new ApiResponse(201, newParty, "Sale party added successfully!"));
    } else {
      // Check if the sale party already exists
      const existingParty = await Party_List_Solvent.findOne({
        where: { party_name: party_name.toUpperCase() },
      });

      if (existingParty) {
        return res.status(409).json({
          message: "Sale party with this name already exists.",
        });
      }

      // Create a new sale party record
      const newParty = await Party_List_Solvent.create({
        party_name: party_name.toUpperCase(),
        price_list,
        address: address.toUpperCase(),
        state,
        pincode,
        contact_person,
        telephone,
        mobile_no,
        party_email,
        dealer_type,
        gst_no: gst_no.toUpperCase() || null,
        pan_no: pan_no.toUpperCase() || null,
        credit_days,
        credit_limit,
      });

      return res
        .status(201)
        .json(new ApiResponse(201, newParty, "Sale party added successfully!"));
    }
  } catch (error) {
    console.error("Error adding sale party details:", error);
    throw new ApiError(500, "Failed to add sale party details", [
      error.message,
    ]);
  }
});

// Fetch all solvent parties details
export const getSolventParties = asyncHandler(async (req, res) => {
  try {
    const partyListSolvent = await Party_List_Solvent.findAll();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          partyListSolvent,
          "Fetched All Solvent parties details successfully!"
        )
      );
  } catch (error) {
    console.error("Error fetching Solvent party details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Fetch all Biomass parties details
export const getBiomassParties = asyncHandler(async (req, res) => {
  try {
    const partyListBiomass = await Party_List_Biomass.findAll();

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          partyListBiomass,
          "Fetched All Biomass parties details successfully!"
        )
      );
  } catch (error) {
    console.error("Error fetching Biomass parties details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});
