import { Router } from 'express';
import { ROLE_ADMIN } from '../config/constants.js';
import {
    readOne, readMany,
} from '../controllers/guest.controllers.js';
import { verifyToken, authRoles } from '../middlewares/authJwt.js';
import parseQueryParams from '../middlewares/parseQueryParams.js';

const router = Router();

const midAdmin = authRoles([ROLE_ADMIN]);

router.get('/', [verifyToken, midAdmin, parseQueryParams], readMany);
router.get('/:id', [verifyToken, midAdmin], readOne);

export default router;
