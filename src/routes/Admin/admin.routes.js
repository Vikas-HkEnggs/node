import express from 'express';
import { getAllEmployees, getEmployee, register, resetAdminPassword, resetPassword, updateEmployee } from '../../controller/Admin/Auth.controller.js';
import { createOrderPunchForm, getAllOrderPunchForms, getOrderPunchFormsByFormName } from '../../controller/Admin/OpForm.controller.js';
import { isAuthenticated, verifyRole } from '../../middlewares/auth.js';
import { createFirstAdmin } from '../../controller/Admin/FirstAdmin.controller.js';
import { createColumnsPermission, getColumnsPermission, getColumnsPermissionByUserId, getTableAndColumns, updateColumnsPermission } from '../../controller/Admin/ColumnsPermission.controller.js';
import { uploadFile } from '../../middlewares/uploadFile.js';

const adminRouter = express.Router();

// <<<<<<<<<<============ AUTH ROUTES ==========>>>>>>>>>>>
adminRouter.post('/createFirstAdmin', createFirstAdmin);
adminRouter.post('/register',isAuthenticated, verifyRole(["admin"]), uploadFile.single('profile_pic'), register);
adminRouter.get('/allEmployees',isAuthenticated, verifyRole(["admin", "viewer"]) ,getAllEmployees);
adminRouter.get('/employee/:id',isAuthenticated,getEmployee);
adminRouter.put('/updateEmployee/:id', isAuthenticated, uploadFile.single('profile_pic'), updateEmployee);
adminRouter.put('/resetPassword',isAuthenticated, verifyRole(["admin"]) ,resetPassword);
adminRouter.put('/resetAdminPassword',isAuthenticated, verifyRole(["admin"]) ,resetAdminPassword);


// <<<<<<<<<<============ ORDER PUNCH FORM ROUTES ==========>>>>>>>>>>>
adminRouter.post("/create/order-punch-form", isAuthenticated, createOrderPunchForm);
adminRouter.get("/get/order-punch-form/:formName", isAuthenticated, getOrderPunchFormsByFormName);
adminRouter.get("/get-all/order-punch-form", isAuthenticated, getAllOrderPunchForms);

// <<<<<<<<<<============ COLUMNS PERMISSION ROUTES ==========>>>>>>>>>>>
adminRouter.post('/columns-permission', isAuthenticated, createColumnsPermission);
adminRouter.get('/get-columns-permission', isAuthenticated, getColumnsPermission);
adminRouter.get('/get-columns-permission/:userId', isAuthenticated, getColumnsPermissionByUserId);
adminRouter.get('/get-columns', isAuthenticated, getTableAndColumns);
adminRouter.put('/update-columns-permission/:id', isAuthenticated, updateColumnsPermission);

export default adminRouter;
