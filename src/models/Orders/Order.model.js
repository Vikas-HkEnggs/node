import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/db.js";
import Employee from "../Auth/Employees.model.js";

const Order = sequelize.define(
  "Order",
  {
    order_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    orderType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "NEW",
    },
    customerType: {
      type: DataTypes.ENUM("SEP", "BMP"),
      allowNull: false,
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gstNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    itemName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    deliveryDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    unit:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    supplyType:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    packingCharges: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gst: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    totalAmount: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    dispatched: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    lastDispatchedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Employee,
        key: "id",
      },
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    status: {
      type: DataTypes.ENUM(
        "Pending",
        "Processing",
        "Completed",
        "Cancelled",
        "Partially Dispatched",
        "Fully Dispatched",
        "Hold"
      ),
      defaultValue: "Pending",
    },
  },
  {
    timestamps: true,
    tableName: "orders",
  }
);

export default Order;
