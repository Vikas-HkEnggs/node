import express from 'express';
import { addQuotationItem, createQuotation, deleteEditedQuotationBySelection, deleteQuotationBySelection, getAllQuotation,getAllQuotationItems,getAllUpdatedQuotations,getQuotationById,getQuotationByItemName,requestForUpdateQuotation, restoreEditedQuotationBySelection, restoreQuotationBySelection, reviewUpdateQuotation, reviewUpdateQuotationBySelection, softDeleteEditedQuotationBySelection, softDeleteQuotationBySelection, updateQuotationStatusBySelection } from '../../controller/Common/Quotation.controller.js';
import { isAuthenticated } from '../../middlewares/auth.js';

const quotationRouter = express.Router();

quotationRouter.post('/create', isAuthenticated, createQuotation);
quotationRouter.get('/get-all', isAuthenticated, getAllQuotation);
quotationRouter.get('/get/:id', isAuthenticated, getQuotationById);
quotationRouter.put('/update-quotation-status', isAuthenticated, updateQuotationStatusBySelection);
quotationRouter.put('/soft-delete', isAuthenticated, softDeleteQuotationBySelection);
quotationRouter.put('/restore', isAuthenticated, restoreQuotationBySelection);
quotationRouter.delete('/permanent-delete', isAuthenticated, deleteQuotationBySelection);
quotationRouter.post('/request-for-update/:id', isAuthenticated, requestForUpdateQuotation);
quotationRouter.put('/review-updated-quotation/:id', isAuthenticated, reviewUpdateQuotation);
quotationRouter.get('/get-updated-quotations', isAuthenticated, getAllUpdatedQuotations);
quotationRouter.put('/update-edited-quotation-status', isAuthenticated, reviewUpdateQuotationBySelection);
quotationRouter.put('/soft-delete-edited', isAuthenticated, softDeleteEditedQuotationBySelection);
quotationRouter.put('/restore-edited', isAuthenticated, restoreEditedQuotationBySelection);
quotationRouter.delete('/permanent-delete-edited', isAuthenticated, deleteEditedQuotationBySelection);
quotationRouter.post('/add', isAuthenticated, addQuotationItem);
quotationRouter.get('/all-items', isAuthenticated, getAllQuotationItems);
quotationRouter.get('/get-item-by-name', isAuthenticated, getQuotationByItemName);


export default quotationRouter;



 