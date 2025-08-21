import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/db.js";

const RolePermission = sequelize.define("RolePermission", {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  module: {
    type: DataTypes.STRING,
    allowNull: false, // e.g. "Orders", "Inventory"
  },
  accessType: {
    type: DataTypes.ENUM("read", "write", "delete"),
    allowNull: false,
  },
}, { timestamps: true });

export default RolePermission;
