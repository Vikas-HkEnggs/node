import { DataTypes } from "sequelize";
import { sequelize } from "../../../../config/db.js";
import Employee from "../../Auth/Employees.model.js";

const FinishedGoodsHistory = sequelize.define("finishedGoodsHistory", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  finishedGoodId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "FinishedGoods",
      key: "id",
    },
  },
  updatedFields: {
    type: DataTypes.JSON, 
    allowNull: false,
  },
  updatedBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: {
      model: Employee,
      key: "id",
    },
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

export default FinishedGoodsHistory;
