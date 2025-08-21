import { DataTypes } from 'sequelize';
import { sequelize } from '../../../config/db.js';

const OrderPunchForms = sequelize.define('OrderPunchForms', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  formName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  inputTitle: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: "The internal name used in form data",
  },

  inputType: {
    type: DataTypes.ENUM('text', 'number', 'date', 'dropdown', 'checkbox'),
    allowNull: false,
  },

  inputOptions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: "Used for dropdowns or checkboxes (array of values)",
  },

  inputSubOptions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: `If a field has conditional inputs based on a value (e.g., 'yes' => show subfields). 
    Format:
    {
      "triggerValue": "yes",
      "fields": [
        {
          "label": "Payment Date",
          "type": "date",
          "name": "paymentDate",
          "required": true
        }
      ]
    }`,
  },

  required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

}, {
  tableName: 'OrderPunchForms',
  timestamps: true,
});

export default OrderPunchForms;
