import express from "express";
import { isAuthenticated } from "../../middlewares/auth.js";
import { Dieplate } from "../../controller/Common/Fms.controller.js";


const fmsRouter = express.Router();

fmsRouter.get('/diplate-fms', Dieplate)

export default fmsRouter;