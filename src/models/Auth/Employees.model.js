import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';


const Employee = sequelize.define('employee', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  roleId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user',
    allowNull: false,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  profile_pic: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  address:{
    type:DataTypes.TEXT,
    allowNull: true,
  },
  city:{
    type:DataTypes.TEXT,
    allowNull: true,
  },
  state:{
    type:DataTypes.TEXT,
    allowNull: true,
  },
  country:{
    type:DataTypes.TEXT,
    allowNull: true,
  },
  pinCode:{
    type:DataTypes.NUMBER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false,
  },
}, {
  timestamps: true, 
});

export default Employee;
