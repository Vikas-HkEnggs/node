import { DataTypes } from "sequelize";
import { sequelize } from "../../../../config/db.js";
import Employee from "../../Auth/Employees.model.js";

const RawMaterialEditHistory = sequelize.define("RawMaterialEditHistory", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  rawMaterialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "rawmaterials",
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
   status: {
      type: DataTypes.ENUM(
        "Pending",
        "Approved",
        "Rejected"
      ),
      defaultValue: "Pending",
    },
});

export default RawMaterialEditHistory;
