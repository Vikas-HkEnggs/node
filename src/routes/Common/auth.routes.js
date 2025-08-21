import express from 'express';
import { login, logout, refreshAccessToken } from '../../controller/Common/Auth.controller.js';
import { getRolePermissions } from '../../controller/Admin/Auth.controller.js';
import { isAuthenticated } from '../../middlewares/auth.js';

const authRouter = express.Router();

authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/refresh',refreshAccessToken);
authRouter.get('/permissions/:roleId', isAuthenticated ,getRolePermissions);

export default authRouter;
