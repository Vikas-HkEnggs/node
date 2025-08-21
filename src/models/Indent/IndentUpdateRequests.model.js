import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/db.js";

const IndentUpdateRequests = sequelize.define("IndentUpdateRequests", {
  update_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  indent_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "indents",
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  updatedFields: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  indentFiles: {
    type: DataTypes.JSON,
    allowNull: true,
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

export default IndentUpdateRequests;
