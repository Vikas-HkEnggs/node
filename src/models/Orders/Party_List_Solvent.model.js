import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const Party_List_Solvent = sequelize.define(
  'Party_List_Solvent',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    party_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price_list: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pin_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contact_person: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mobile_no: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    party_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dealer_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gst_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pan_no: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    credit_days: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    credit_limit: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  {
    timestamps: false, 
  }
 
);

export default Party_List_Solvent;
