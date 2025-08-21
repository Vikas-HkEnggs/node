import express from 'express';
import jobWorkRouter from './jobWork.routes.js';
import inventoryRouter from './inventory.routes.js';
import orderRouter from './order.routes.js';
import authRouter from './auth.routes.js';
import indentRouter from './indentAndPO.routes.js';
import fmsRouter from './fms.routes.js';
import quotationRouter from './quotation.routes.js';
import inventoryRouter2 from './inventory2.routes.js';

const commonRouter = express.Router();

commonRouter.use("/auth", authRouter)
commonRouter.use("/jobWork", jobWorkRouter)
commonRouter.use("/order", orderRouter)
commonRouter.use("/inventory", inventoryRouter)
commonRouter.use("/inventory2", inventoryRouter2)
commonRouter.use("/indent", indentRouter)
commonRouter.use("/fms", fmsRouter)
commonRouter.use("/quotation", quotationRouter)


export default commonRouter;
