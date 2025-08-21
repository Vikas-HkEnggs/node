import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/db.js";

const DieplateFms = sequelize.define(
  "DieplateFms",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    start_production: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    plate_turning: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    marking_logo_serial_no: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    plate_drilling: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    plate_counter_tapper_backside_chamfer: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    heart_treatment: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    temper_checking: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    Hole_Grinding: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    tableName: "DieplateFms",
    timestamps: true,
  }
);

export default DieplateFms;
