import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/db.js";
import Employee from "../Auth/Employees.model.js";

const JobWork = sequelize.define(
  "JobWork",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    items: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    challanFile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    challanNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    commitmentDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    lastReceivedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    vendorName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vendorEmail: {
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
    createdBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: Employee,
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("Pending", "Processing", "Completed", "Cancelled"),
      defaultValue: "Pending",
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    tableName: "JobWork",
  }
);

export default JobWork;
