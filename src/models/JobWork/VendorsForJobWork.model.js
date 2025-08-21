import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const VendorsForJobWork = sequelize.define('VendorsForJobWork', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  vendorName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gstNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  
});

export default VendorsForJobWork;