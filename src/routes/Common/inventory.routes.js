import express from 'express';
import { addRawMaterial, approveUpdatedRawMaterial, deleteRawMaterial, getAllRawMaterial, getAllRawMaterial2, getLastRawMaterial, getRawMaterialByCategory, getRawMaterialById, getRawMaterialCounts, getRawMaterialItemHistoryForStock, getRawMaterialItemUpdateHistory, restoreRawMaterial, softDeleteRawMaterial,  updateMaxLevelForRawMaterial, updateRawMaterialData, updateRawMaterialStatus, updateRawMaterialStocks , permanentDeleteBySelection } from '../../controller/Common/Inventory/RawMaterial.controller.js';
import { isAuthenticated, verifyRole } from '../../middlewares/auth.js';
import { addFinishedGoods, deleteFinishedGood, getAllFinishedGoods, getAllFinishedGoods2, getFinishedGoodById, getFinishedGoodItemHistory, getFinishedGoodsByCategory, getfinishedGoodsCounts, getLastFinishedGood, restoreFinishedGood, softDeleteFinishedGood, updateFinishedGoodData, updateFinishedGoodsStatus, updateFinishedGoodStocks, updateMaxLevelForFinishedGood } from '../../controller/Common/Inventory/FinishedGoods.controller.js';
import { uploadFile } from '../../middlewares/uploadFile.js';

const inventoryRouter = express.Router();

// Raw Material Routes
inventoryRouter.post("/add-raw-material",isAuthenticated, uploadFile.array('images',3), addRawMaterial)
inventoryRouter.get("/getAllRawMaterial",isAuthenticated, getAllRawMaterial)
inventoryRouter.get("/get-all-raw-material",isAuthenticated, getAllRawMaterial2)
inventoryRouter.get("/get-all-raw-material-counts",isAuthenticated, getRawMaterialCounts)
inventoryRouter.put("/update-raw-material-stocks/:id",isAuthenticated,  updateRawMaterialStocks)
inventoryRouter.put("/update-raw-material-data/:id",isAuthenticated,  updateRawMaterialData)
inventoryRouter.put("/softDeleteRawMaterial/:id",isAuthenticated, softDeleteRawMaterial)
inventoryRouter.put("/restore-raw-material/:id",isAuthenticated, restoreRawMaterial)
inventoryRouter.delete("/deleteRawMaterial/:id",isAuthenticated, verifyRole(["admin"]), deleteRawMaterial)
inventoryRouter.get("/getRawMaterial/:id",isAuthenticated, getRawMaterialById)
inventoryRouter.put("/updateRawMaterialMaxLevel",isAuthenticated, verifyRole(["admin"]), updateMaxLevelForRawMaterial)
inventoryRouter.get("/get-raw-material-item-history/:id",isAuthenticated, getRawMaterialItemHistoryForStock)
inventoryRouter.get("/get-raw-material-item-update-history/:id",isAuthenticated, getRawMaterialItemUpdateHistory)
inventoryRouter.put("/update-raw-material-status/:id",isAuthenticated, updateRawMaterialStatus)
inventoryRouter.get("/get-last-raw-material",isAuthenticated, getLastRawMaterial)
inventoryRouter.get("/raw-material-by-category/:category",isAuthenticated, getRawMaterialByCategory)
inventoryRouter.put("/approve-updated-raw-material/:id",isAuthenticated, approveUpdatedRawMaterial)
inventoryRouter.delete("/permanent-delete-by-selection",isAuthenticated, permanentDeleteBySelection)

// Finished Good Routes
inventoryRouter.post("/add-finished-good",isAuthenticated, uploadFile.array('images',3), addFinishedGoods)
inventoryRouter.get("/getAllFinishedGood",isAuthenticated, getAllFinishedGoods)
inventoryRouter.put("/update-finished-good-stocks/:id",isAuthenticated, updateFinishedGoodStocks)
inventoryRouter.put("/update-finished-good-data/:id",isAuthenticated, updateFinishedGoodData)
inventoryRouter.put("/softDeleteFinishedGood/:id",isAuthenticated, softDeleteFinishedGood)
inventoryRouter.put("/restoreFinishedGood/:id",isAuthenticated, restoreFinishedGood)
inventoryRouter.delete("/deleteFinishedGood/:id",isAuthenticated,verifyRole(["admin"]), deleteFinishedGood)
inventoryRouter.get("/getFinishedGood/:id",isAuthenticated, getFinishedGoodById)
inventoryRouter.get("/getFinishedGoodItemHistory/:id",isAuthenticated, getFinishedGoodItemHistory)
inventoryRouter.put("/updateFinishedGoodMaxLevel",isAuthenticated,verifyRole(["admin"]), updateMaxLevelForFinishedGood)
inventoryRouter.put("/update-finished-good-status/:id",isAuthenticated, updateFinishedGoodsStatus)
inventoryRouter.get("/get-last-finished-good",isAuthenticated, getLastFinishedGood)
inventoryRouter.get("/finished-good-by-category/:category",isAuthenticated, getFinishedGoodsByCategory)
inventoryRouter.get("/get-all-finished-good",isAuthenticated, getAllFinishedGoods2)
inventoryRouter.get("/get-all-finished-good-counts",isAuthenticated, getfinishedGoodsCounts)

export default inventoryRouter