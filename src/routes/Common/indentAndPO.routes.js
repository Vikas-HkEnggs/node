import express from 'express';
import { createIndent, createPO, getAllIndents, getAllPurchaseVendors, updateIndent, getAllPOs,  updatePoStatus, softDeletePO, restorePO, deletePO, softDeleteIndent, restoreIndent, deleteIndent, updateIndentStatus, updateFullIndent, getIndentById, requestForUpdateIndent, getAllIndentUpdateRequests, reviewIndentUpdate, addNewItemsInExistingIndent, cancelledThePO, softDeleteAllIndents, restoreAllIndents, deleteAllSoftDeletedIndents, updateAllIndentItems, updateIndentItemsStatusBySelection, softDeleteBySelection, deleteBySelection, restoreBySelection, softDeletePOBySelection, restorePOBySelection, deletePOBySelection, updatePoStatusBySelection, updatePOData } from '../../controller/Common/IndentAndPO.controller.js';
import { isAuthenticated } from '../../middlewares/auth.js';
import { uploadFile } from '../../middlewares/uploadFile.js';

const indentRouter = express.Router();

// <<<<<<<<<<<<============== Indent Routes =================>>>>>>>>>>>>>>
indentRouter.post("/createIndent",isAuthenticated, uploadFile.array('indentFiles',3), createIndent);
indentRouter.get("/getAll",isAuthenticated, getAllIndents);
indentRouter.get("/getById/:id",isAuthenticated, getIndentById);
indentRouter.put("/update-status/:id",isAuthenticated, updateIndentStatus);
indentRouter.put("/update-status-all/:id",isAuthenticated, updateAllIndentItems);
indentRouter.put("/update-status-by-selection/:id",isAuthenticated, updateIndentItemsStatusBySelection);
indentRouter.put("/update/:id",isAuthenticated, updateIndent);
indentRouter.put("/update-full/:id",isAuthenticated, updateFullIndent);
indentRouter.put("/soft-delete/:id",isAuthenticated, softDeleteIndent);
indentRouter.put("/soft-delete-selection",isAuthenticated, softDeleteBySelection);
indentRouter.put("/soft-delete-all",isAuthenticated, softDeleteAllIndents);
indentRouter.put("/restore/:id",isAuthenticated, restoreIndent);
indentRouter.put("/restore-by-selection",isAuthenticated, restoreBySelection);
indentRouter.put("/restore-all",isAuthenticated, restoreAllIndents);
indentRouter.delete("/delete/:id",isAuthenticated, deleteIndent);
indentRouter.delete("/delete-by-selection",isAuthenticated, deleteBySelection);
indentRouter.delete("/delete-all",isAuthenticated, deleteAllSoftDeletedIndents);
indentRouter.post("/request-for-update/:id",isAuthenticated, uploadFile.array('indentFiles',3), requestForUpdateIndent);
indentRouter.get("/get-all-update-requests",isAuthenticated, getAllIndentUpdateRequests);
indentRouter.put("/review-request/:update_id",isAuthenticated, reviewIndentUpdate);
indentRouter.put("/add-new-items/:id",isAuthenticated, addNewItemsInExistingIndent);


// <<<<<<<<<<<<============== PO Routes =================>>>>>>>>>>>>>>
indentRouter.post("/create-po",isAuthenticated, createPO);
indentRouter.get("/get-all-po",isAuthenticated, getAllPOs  );
indentRouter.put("/update-po-status/:id",isAuthenticated, updatePoStatus);
indentRouter.put("/update-po-status-by-selection",isAuthenticated, updatePoStatusBySelection);
indentRouter.put("/soft-delete-po/:id",isAuthenticated, softDeletePO);
indentRouter.put("/soft-delete-by-selection",isAuthenticated, softDeletePOBySelection);
indentRouter.put("/restore-po/:id",isAuthenticated, restorePO);
indentRouter.put("/restore-po-by-selection",isAuthenticated, restorePOBySelection);
indentRouter.delete("/delete-po/:id",isAuthenticated, deletePO);
indentRouter.delete("/delete-po-by-selection",isAuthenticated, deletePOBySelection);
indentRouter.put("/cancel-po/:id",isAuthenticated, cancelledThePO);
indentRouter.put("/update-po/:id",isAuthenticated, updatePOData);


// <<<<<<<<<<<<============== Purchase Vendors Routes =================>>>>>>>>>>>>>>
indentRouter.get("/getAllPurchaseVendors",isAuthenticated, getAllPurchaseVendors);

export default indentRouter