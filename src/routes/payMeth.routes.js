import { Router } from 'express';
import { readOne, readMany } from '../controllers/payMeth.controllers.js';
import { ROLE_ADMIN } from '../config/constants.js';
import parseQueryParams from '../middlewares/parseQueryParams.js';
import { authRoles, verifyToken } from '../middlewares/authJwt.js';

const router = Router();

const midAdmin = authRoles([ROLE_ADMIN]);

router.get('/', [verifyToken, midAdmin, parseQueryParams], readMany);
router.get('/:id', [verifyToken, midAdmin], readOne);

export default router;
