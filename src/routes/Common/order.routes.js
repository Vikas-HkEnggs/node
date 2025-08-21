import express from "express";
import { isAuthenticated } from "../../middlewares/auth.js";
import {
  addSaleParty,
  createOrder,
  getAllOrders,
  getAllUpdateRequests,
  getBiomassParties,
  getOrderUpdateHistories,
  getSingleOrder,
  getSolventParties,
  requestForUpdate,
  reviewOrderUpdate,
  updateOrder,
  updateOrderDispatchedQuantity,
  updateOrderStatus,
  softDeletedOrders,
  restoreOrder,
 permanentDeleteOrder,
 getAllRepairOrders
} from "../../controller/Common/Orders.controller.js";

const orderRouter = express.Router();

//<<<<<<<<<<============ ORDER ROUTES ==========>>>>>>>>>>>

// Route to update an order
orderRouter.put("/updateOrder/:order_id", isAuthenticated, updateOrder);

// Route to update order status
orderRouter.post("/status", isAuthenticated, updateOrderStatus);

// Route to update order status
orderRouter.put( "/updateOrderStatus/:order_id", isAuthenticated, updateOrderStatus);

orderRouter.post("/createOrder", isAuthenticated, createOrder);
orderRouter.get("/get-all-orders", isAuthenticated, getAllOrders);
orderRouter.get("/get-single-order/:order_id", isAuthenticated, getSingleOrder);
orderRouter.post("/order-update-request/:order_id",isAuthenticated,requestForUpdate);
orderRouter.get("/get-all-updated-order-requests",isAuthenticated,getAllUpdateRequests);
orderRouter.put("/softDeletedOrders/:order_id",isAuthenticated,softDeletedOrders);
orderRouter.put("/restore-order/:order_id", isAuthenticated, restoreOrder);
orderRouter.delete("/permanent-delete-order/:order_id", isAuthenticated, permanentDeleteOrder);
orderRouter.put("/update-order/:update_id",isAuthenticated,reviewOrderUpdate);
orderRouter.get("/get-order-update-history/:order_id",isAuthenticated,getOrderUpdateHistories);
orderRouter.put("/update-order-dispatched-quantity/:order_id",isAuthenticated,updateOrderDispatchedQuantity);

//<<<<<<<<<<============ REPAIR ORDER ROUTES ==========>>>>>>>>>>>
orderRouter.get("/get-all-repair-orders", isAuthenticated, getAllRepairOrders);




//<<<<<<<<<<============ SALE PARTY ROUTES ==========>>>>>>>>>>>

// Route to add a new sale party
orderRouter.post("/addSaleParty", isAuthenticated, addSaleParty);
orderRouter.get("/solvent-parties", isAuthenticated, getSolventParties);
orderRouter.get("/biomass-parties", isAuthenticated, getBiomassParties);

export default orderRouter;

