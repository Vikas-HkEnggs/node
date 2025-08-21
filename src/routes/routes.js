import express from 'express';
import adminRouter from './Admin/admin.routes.js';
import commonRouter from './Common/index.routes.js';


const router = express.Router();

router.use("/admin", adminRouter)
router.use("/common", commonRouter)

export default  router