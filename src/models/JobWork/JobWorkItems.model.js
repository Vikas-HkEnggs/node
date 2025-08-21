import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/db.js";

const JobWorkItems = sequelize.define(
  "JobWorkItems",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    item: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

export default JobWorkItems;
