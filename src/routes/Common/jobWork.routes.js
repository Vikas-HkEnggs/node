import express from 'express';
import { isAuthenticated, verifyRole } from '../../middlewares/auth.js';
import { addJobItem, addNewVendor, createJobWork, deleteJobBySelection, deleteJobWork, getAllJobWork, getAllVendors, getJobItems, notifyJobWorkWhenCommitmentDateNear, restoreJobBySelection, softDeleteJobBySelection, softDeleteJobWork, updateJobWork, updateJobWorkStatus } from '../../controller/Common/JobWork.controller.js';
import { uploadFile } from '../../middlewares/uploadFile.js';

const jobWorkRouter = express.Router()


//<<<<<<<<<<============ VENDORS ROUTES ==========>>>>>>>>>>>

jobWorkRouter.post('/addVendor',isAuthenticated, addNewVendor);
jobWorkRouter.get('/allVendors',isAuthenticated, getAllVendors);

//<<<<<<<<<<============ JOB WORK ROUTES ==========>>>>>>>>>>>

jobWorkRouter.post('/create',isAuthenticated, uploadFile.single('challanFile'), createJobWork);
jobWorkRouter.post('/add-job-item',isAuthenticated, addJobItem);
jobWorkRouter.get('/get-job-items',isAuthenticated, getJobItems);
jobWorkRouter.get('/getAll',isAuthenticated, getAllJobWork);
jobWorkRouter.get('/getAll',isAuthenticated, getAllJobWork);
jobWorkRouter.get('/jobWorkNotify',isAuthenticated, notifyJobWorkWhenCommitmentDateNear);
jobWorkRouter.put('/update-job-work/:id',isAuthenticated, updateJobWork);
jobWorkRouter.put('/soft-delete/:id',isAuthenticated, softDeleteJobWork);
jobWorkRouter.put('/update-status/:id',isAuthenticated, updateJobWorkStatus);
jobWorkRouter.delete('/delete/:id',isAuthenticated, verifyRole(["admin"]),  deleteJobWork);
jobWorkRouter.put("/soft-delete-job-by-selection",isAuthenticated,softDeleteJobBySelection);
jobWorkRouter.put("/restore-job-by-selection",isAuthenticated,restoreJobBySelection);
jobWorkRouter.delete("/delete-job-by-selection",isAuthenticated,deleteJobBySelection);


export default jobWorkRouter