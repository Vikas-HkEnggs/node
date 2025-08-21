import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const PurchaseVendor = sequelize.define(
  'PurchaseVendor',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    partyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    priceList: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pincode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contactPerson: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobileNo: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    partyEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    dealerType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gstNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailHK: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: false,
      },
    },
    panNo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    creditDays: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    creditLimit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    timestamps: false, 
  }
 
);

export default PurchaseVendor;
