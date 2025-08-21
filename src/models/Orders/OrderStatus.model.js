import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const OrderStatus = sequelize.define('OrderStatus', {
  status_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  order_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: {
      model: 'orders', 
      key: 'order_id', 
    },
    onDelete: 'CASCADE', // Ensure related OrderStatus is deleted if the order is deleted
    onUpdate: 'CASCADE', // Update the foreign key if the referenced order is updated
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false, 
  tableName: 'order_statuses', 
});

export default OrderStatus;
