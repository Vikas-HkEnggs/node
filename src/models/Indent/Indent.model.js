import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/db.js";
import Employee from "../Auth/Employees.model.js";

const Indent = sequelize.define(
  "Indent",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    items: {
      type: DataTypes.JSON,
      allowNull: true,
    },
   indentFiles: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
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
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
  }
);

export default Indent;
