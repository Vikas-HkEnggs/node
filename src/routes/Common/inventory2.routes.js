import express from 'express';
import { handleInventoryOperation } from '../../controller/Common/Inventory.controller.js';
import { isAuthenticated, verifyRole } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const inventoryRouter2 = express.Router();

const inventoryTypes = [
  'raw-materials',
  'finished-goods', 
  'tools',
  'inserts'
];

const setupRoute = (method, path, operation, ...middlewares) => {
  inventoryRouter2[method](path, ...middlewares, asyncHandler(async (req, res) => {
    // Get the first part before hyphen (raw from raw-materials)
    req.inventoryType = path.split('/')[1];
    req.params.operation = operation;
    await handleInventoryOperation(req, res);
  }));
};

inventoryTypes.forEach(type => {
  // Common routes
  setupRoute('post', `/${type}/add`, 'add', isAuthenticated);
  setupRoute('get', `/${type}/get-all`, 'getAll', isAuthenticated);
  setupRoute('put', `/${type}/update-status/:id`, 'updateStatus', isAuthenticated);
  setupRoute('put', `/${type}/update-stocks/:id`, 'updateStocks', isAuthenticated);
  setupRoute('get', `/${type}/counts`, 'getCounts', isAuthenticated);
  setupRoute('get', `/${type}/last`, 'getLast', isAuthenticated);
  setupRoute('put', `/${type}/soft-delete/:id`, 'softDelete', isAuthenticated);
  setupRoute('put', `/${type}/restore/:id`, 'restore', isAuthenticated);
  
  // Admin-only routes
  setupRoute('put', `/${type}/update-max-level`, 'updateMaxLevel', 
    isAuthenticated, verifyRole(["admin"]));
  setupRoute('delete', `/${type}/delete/:id`, 'delete', 
    isAuthenticated, verifyRole(["admin"]));
});

export default inventoryRouter2;