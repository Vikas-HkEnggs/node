import { DataTypes } from "sequelize";
import { sequelize } from "../../../config/db.js";

const RolePermissionMapping = sequelize.define(
  "RolePermissionMappings",
  {
    roleId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "Roles",
        key: "id",
      },
    },
    permissionId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "RolePermissions",
        key: "id",
      },
    },
  },
   { timestamps: true, freezeTableName: true }
);

export default RolePermissionMapping;
