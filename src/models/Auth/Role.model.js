import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/db.js";

const Role = sequelize.define("Role", {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false, // e.g. admin, viewer, productionPlanner
  },
}, { timestamps: true });

export default Role;
