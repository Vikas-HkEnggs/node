import { DataTypes } from "sequelize";
import { sequelize } from "../../../../config/db.js";
import Employee from "../../Auth/Employees.model.js";

const FinishedGoods = sequelize.define(
  "FinishedGoods",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    skuCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    itemName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    averageDailyConsumption: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    leadTimeFromIndentToReceipt: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    safetyFactor: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    moq: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    materialInTransit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxLevelIncreasedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    closingStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    closingStockDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: Employee,
        key: "id",
      },
    },
    createdBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: Employee,
        key: "id",
      },
    },
    modifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
      defaultValue: "Pending",
    },
    editRequestStatus: {
      type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
      defaultValue: "Pending",
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
  }
);

export default FinishedGoods;
