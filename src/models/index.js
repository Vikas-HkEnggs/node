import { sequelize } from "../../config/db.js";
import { Sequelize } from "sequelize";

// Initialize the database object
const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
import Orders from "./Orders/Order.model.js";
import RepairOrders from "./Orders/RepairOrders.model.js";
import OrderStatus from "./Orders/OrderStatus.model.js";
import VendorsForJobWork from "./JobWork/VendorsForJobWork.model.js";
import Notification from "./Notifications/Notification.model.js";
import RawMaterials from "./Inventory/RawMaterial/RawMaterial.model.js";
import FinishedGoods from "./Inventory/FinishedGood/FinishedGoods.model.js";
import RawMaterialHistory from "./Inventory/RawMaterial/RawMaterialHistory.model.js";
import RawMaterialEditHistory from "./Inventory/RawMaterial/RawMaterialEditHistory.model.js";
import FinishedGoodsHistory from "./Inventory/FinishedGood/FinishedGoodsHistory.model.js";
import FinishedGoodsEditHistory from "./Inventory/FinishedGood/FinishedGoodsEditHistory.model.js";
import Indent from "./Indent/Indent.model.js";
import OrderUpdate from "./Orders/OrderUpdate.model.js";
import OrderUpdateHistory from "./Orders/OrderUpdateHistory.model.js";
import PO from "./PO Section/PO.model.js";
import IndentUpdateRequests from "./Indent/IndentUpdateRequests.model.js";
import OrderPunchForms from "./Orders/OrderPunchForms.model.js";
import ColumnsPermission from "./Auth/ColumnsPermission.model.js";
import DieplateFms from "./FMS/DieplateFms.model.js";
import QuotationUpdateHistory from "./Quotation/QuotationUpdateHistory.model.js";
import Quotation from "./Quotation/Quotation.model.js";
import Employee from "./Auth/Employees.model.js";
import Role from "./Auth/Role.model.js";
import RolePermission from "./Auth/RolePermission.model.js";
import RolePermissionMapping from "./Auth/RolePermissionMapping.model.js";
import JobWorkItems from "./JobWork/JobWorkItems.model.js";
import JobWork from "./JobWork/JobWorks.model.js";
import QuotationItems from "./Quotation/QuotationItems.model.js";
import Inserts from "./Inventory/Inserts/Inserts.model.js";
import InsertsHistory from "./Inventory/Inserts/InsertsHistory.model.js";
import Tools from "./Inventory/Tools/Tools.model.js";
import ToolsHistory from "./Inventory/Tools/ToolsHistory.model.js";

// Attach models to the database object
db.Orders = Orders;
db.RepairOrders = RepairOrders;
db.OrderStatus = OrderStatus;
db.VendorsForJobWork = VendorsForJobWork;
db.Employee = Employee;
db.Role = Role;
db.RolePermission = RolePermission;
db.RolePermissionMapping = RolePermissionMapping;
db.JobWork = JobWork;
db.Notification = Notification;
db.RawMaterials = RawMaterials;
db.FinishedGoods = FinishedGoods;
db.RawMaterialHistory = RawMaterialHistory;
db.RawMaterialEditHistory = RawMaterialEditHistory;
db.FinishedGoodsHistory = FinishedGoodsHistory;
db.FinishedGoodsEditHistory = FinishedGoodsEditHistory;
db.Indent = Indent;
db.OrderUpdate = OrderUpdate;
db.OrderUpdateHistory = OrderUpdateHistory;
db.PO = PO;
db.IndentUpdateRequests = IndentUpdateRequests;
db.OrderPunchForms = OrderPunchForms;
db.ColumnsPermission = ColumnsPermission;
db.DieplateFms = DieplateFms;
db.JobWorkItems = JobWorkItems;
db.Quotation = Quotation;
db.QuotationUpdateHistory = QuotationUpdateHistory;
db.QuotationItems = QuotationItems;
db.Inserts = Inserts;
db.InsertsHistory = InsertsHistory;
db.Tools = Tools;
db.ToolsHistory = ToolsHistory;

// Define relationships

// Role and Employee
db.Role.hasMany(db.Employee, { foreignKey: "roleId", as: "employees" });
db.Employee.belongsTo(db.Role, { foreignKey: "roleId", as: "roleDetails" });

// Update these associations
db.Role.belongsToMany(db.RolePermission, {
  through: db.RolePermissionMapping, // Use model directly
  as: "permissions",
  foreignKey: "roleId",
  otherKey: "permissionId",
});

db.RolePermission.belongsToMany(db.Role, {
  through: db.RolePermissionMapping, // Use model directly
  as: "roles",
  foreignKey: "permissionId",
  otherKey: "roleId",
});

// Employee and RawMaterials (Corrected aliases)
db.Employee.hasMany(db.RawMaterials, {
  foreignKey: "createdBy",
  as: "createdRawMaterials",
});
db.Employee.hasMany(db.RawMaterials, {
  foreignKey: "updatedBy",
  as: "updatedRawMaterials",
});

// Employee and RawMaterials
db.RawMaterials.belongsTo(db.Employee, {
  foreignKey: "createdBy",
  as: "createdByEmployee",
});
db.RawMaterials.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

// Employee and FinishedGoods
db.Employee.hasMany(db.FinishedGoods, {
  foreignKey: "createdBy",
  as: "createdFinishedGoods",
});
db.Employee.hasMany(db.FinishedGoods, {
  foreignKey: "updatedBy",
  as: "updatedFinishedGoods",
});

// FinishedGoods belongsTo Employee
db.FinishedGoods.belongsTo(db.Employee, {
  foreignKey: "createdBy",
  as: "createdByEmployee",
});
db.FinishedGoods.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

// Employee and Orders
db.Employee.hasMany(db.Orders, { foreignKey: "createdBy" });
db.Orders.belongsTo(db.Employee, { foreignKey: "createdBy" });

// Employee and JobWork
db.Employee.hasMany(db.JobWork, { foreignKey: "createdBy" });
db.JobWork.belongsTo(db.Employee, { foreignKey: "createdBy" });

// Orders and OrderStatus
db.Orders.hasMany(db.OrderStatus, { foreignKey: "order_id" });
db.OrderStatus.belongsTo(db.Orders, { foreignKey: "order_id" });

// Tools and Employee - for creator
db.Employee.hasMany(db.Tools, {
  foreignKey: "createdBy",
  as: "createdTools",
});
db.Tools.belongsTo(db.Employee, {
  foreignKey: "createdBy",
  as: "createdByEmployee", // Change from "creator" to "createdByEmployee"
});

// Tools and Employee - for updater
db.Employee.hasMany(db.Tools, {
  foreignKey: "updatedBy",
  as: "updatedTools",
});
db.Tools.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

// ToolsHistory and Employee
db.Employee.hasMany(db.ToolsHistory, {
  foreignKey: "updatedBy",
  as: "toolsUpdateLogs",
});
db.ToolsHistory.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

// Inserts and Employee - for creator
db.Employee.hasMany(db.Inserts, {
  foreignKey: "createdBy",
  as: "createdInserts",
});
db.Inserts.belongsTo(db.Employee, {
  foreignKey: "createdBy",
  as: "createdByEmployee", 
});

// Inserts and Employee - for updater
db.Employee.hasMany(db.Inserts, {
  foreignKey: "updatedBy",
  as: "updatedInserts",
});
db.Inserts.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

// ToolsHistory and Employee
db.Employee.hasMany(db.InsertsHistory, {
  foreignKey: "updatedBy",
  as: "insertsUpdateLogs",
});
db.InsertsHistory.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

// RawMaterials and RawMaterialHistory
db.RawMaterials.hasMany(db.RawMaterialHistory, {
  foreignKey: "rawMaterialId",
  as: "stockUpdates",
});

db.RawMaterialHistory.belongsTo(db.RawMaterials, {
  foreignKey: "rawMaterialId",
});

// RawMaterials and RawMaterialEditHistory
db.RawMaterials.hasMany(db.RawMaterialEditHistory, {
  foreignKey: "rawMaterialId",
  as: "rawMaterialEdits",
});
db.RawMaterialEditHistory.belongsTo(db.RawMaterials, {
  foreignKey: "rawMaterialId",
});

//  Employee and RawMaterialHistory
// db.Employee.hasMany(db.RawMaterialHistory, { foreignKey: "updatedBy", as: "updateLogs" });
db.RawMaterialHistory.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

//  Employee and RawMaterialEditHistory
// db.Employee.hasMany(db.RawMaterialHistory, { foreignKey: "updatedBy", as: "updateLogs" });
db.RawMaterialEditHistory.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "editedByEmployee",
});

//  Employee and FinishedGoodsHistory
db.Employee.hasMany(db.FinishedGoodsHistory, {
  foreignKey: "updatedBy",
  as: "updateLogs",
});
db.FinishedGoodsHistory.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

//  Employee and FinishedGoodsEditHistory
db.Employee.hasMany(db.FinishedGoodsEditHistory, {
  foreignKey: "updatedBy",
  as: "editLogs",
});
db.FinishedGoodsEditHistory.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "editByEmployee",
});

// Indent and Employee
db.Employee.hasMany(db.Indent, {
  foreignKey: "createdBy",
  as: "createdIndents",
});
db.Indent.belongsTo(db.Employee, { foreignKey: "createdBy", as: "creator" });

// OrderUpdate and Employee (for updates)
db.Employee.hasMany(db.OrderUpdate, {
  foreignKey: "approvedBy",
  as: "orderUpdateLogs",
});
db.OrderUpdate.belongsTo(db.Employee, {
  foreignKey: "approvedBy",
  as: "updatedByEmployee",
});

// OrderUpdate and Employee (for requests)
db.Employee.hasMany(db.OrderUpdate, {
  foreignKey: "requestedBy",
  as: "requestedOrderUpdates",
});
db.OrderUpdate.belongsTo(db.Employee, {
  foreignKey: "requestedBy",
  as: "requestedByEmployee",
});

// OrderUpdateHistory belongs to an Order
db.Orders.hasMany(db.OrderUpdateHistory, {
  foreignKey: "order_id",
  as: "updateHistory",
});
db.OrderUpdateHistory.belongsTo(db.Orders, {
  foreignKey: "order_id",
  as: "order",
});

// OrderUpdateHistory belongs to Employee (Requested By)
db.Employee.hasMany(db.OrderUpdateHistory, {
  foreignKey: "requestedBy",
  as: "requestedOrderUpdateHistories",
});
db.OrderUpdateHistory.belongsTo(db.Employee, {
  foreignKey: "requestedBy",
  as: "requestedByEmployee",
});

// OrderUpdateHistory belongs to Employee (Updated By)
db.Employee.hasMany(db.OrderUpdateHistory, {
  foreignKey: "updatedBy",
  as: "updatedOrderUpdateHistories",
});

// OrderUpdateHistory belongs to Employee (Updated By)
db.OrderUpdateHistory.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

// PO belongs to Employee (creator)
db.Employee.hasMany(db.PO, { foreignKey: "createdBy", as: "createdPOs" });
db.PO.belongsTo(db.Employee, { foreignKey: "createdBy", as: "creator" });

// PO belongs to Employee (approvedBy)
db.Employee.hasMany(db.PO, { foreignKey: "approvedBy", as: "approvedPOs" });
db.PO.belongsTo(db.Employee, {
  foreignKey: "approvedBy",
  as: "approvedByEmployee",
});

// PO belongs to Employee (updatedBy)
db.Employee.hasMany(db.PO, { foreignKey: "updatedBy", as: "updatedPOs" });
db.PO.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

// Quotation belongs to Employee (creator)
db.Employee.hasMany(db.Quotation, {
  foreignKey: "createdBy",
  as: "createdQuotations",
});
db.Quotation.belongsTo(db.Employee, { foreignKey: "createdBy", as: "creator" });

// Quotation belongs to Employee (approvedBy)
db.Employee.hasMany(db.Quotation, {
  foreignKey: "approvedBy",
  as: "approvedQuotations",
});
db.Quotation.belongsTo(db.Employee, {
  foreignKey: "approvedBy",
  as: "approvedByEmployee",
});

// Quotation belongs to Employee (updatedBy)
db.Employee.hasMany(db.Quotation, {
  foreignKey: "updatedBy",
  as: "updatedQuotations",
});
db.Quotation.belongsTo(db.Employee, {
  foreignKey: "updatedBy",
  as: "updatedByEmployee",
});

// QuotationUpdateHistory belongs to Employee (creator)
db.Employee.hasMany(db.QuotationUpdateHistory, {
  foreignKey: "createdBy",
  as: "createdBy",
});
db.QuotationUpdateHistory.belongsTo(db.Employee, {
  foreignKey: "createdBy",
  as: "creator",
});

// QuotationUpdateHistory belongs to Employee (approvedBy)
db.Employee.hasMany(db.QuotationUpdateHistory, {
  foreignKey: "approvedBy",
  as: "approvedBy",
});
db.QuotationUpdateHistory.belongsTo(db.Employee, {
  foreignKey: "approvedBy",
  as: "approvedByEmployee",
});

// OrderUpdate and Employee (for updates)
db.Employee.hasMany(db.IndentUpdateRequests, {
  foreignKey: "approvedBy",
  as: "indentUpdateLogs",
});
db.IndentUpdateRequests.belongsTo(db.Employee, {
  foreignKey: "approvedBy",
  as: "updatedByEmployee",
});

// OrderUpdate and Employee (for requests)
db.Employee.hasMany(db.IndentUpdateRequests, {
  foreignKey: "requestedBy",
  as: "requestedIndentUpdates",
});
db.IndentUpdateRequests.belongsTo(db.Employee, {
  foreignKey: "requestedBy",
  as: "requestedByEmployee",
});

// ColumnsPermission and Employee
db.Employee.hasMany(db.ColumnsPermission, {
  foreignKey: "userId",
  as: "columnsPermissions",
});
db.ColumnsPermission.belongsTo(db.Employee, {
  foreignKey: "userId",
  as: "employee",
});

export {
  Orders,
  OrderStatus,
  VendorsForJobWork,
  Employee,
  JobWork,
  Notification,
  RawMaterials,
  RawMaterialHistory,
  RawMaterialEditHistory,
  FinishedGoods,
  OrderPunchForms,
  ColumnsPermission,
  DieplateFms,
  JobWorkItems,
  Quotation,
  QuotationUpdateHistory,
  QuotationItems,
  RepairOrders,
  Inserts,
  InsertsHistory,
  Tools,
  ToolsHistory,
};

export default db;
