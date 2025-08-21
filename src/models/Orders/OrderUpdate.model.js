import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/db.js";

const OrderUpdate = sequelize.define("OrderUpdate", {
  update_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  order_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: {
      model: "orders",
      key: "order_id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  updatedFields: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  updateDescription: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "Pending",
    ENUM: ["Pending", "Approved", "Rejected"],
    allowNull: false,
  },
  requestedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: {
      model: "employees",
      key: "id",
    },
  },
  approvedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    references: {
      model: "employees",
      key: "id",
    },
  },
  adminRemarks: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

export default OrderUpdate;
