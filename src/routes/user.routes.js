import { Router } from 'express';
import { ROLE_ADMIN, ROLE_DEFAULT } from '../config/constants.js';
import {
    readOne, readMany,
    readPayMeth, readPayMeths, createPayMeth, deletePayMeth,
    readPayConceptPerson, readPayConceptPersons,
    readPayment, readPayments,
    readInvoice, readInvoices,
} from '../controllers/user.controllers.js';
import { verifyToken, authRoles, rightDefaultUser } from '../middlewares/authJwt.js';
import parseQueryParams from '../middlewares/parseQueryParams.js';

const router = Router();

const midAdmin = authRoles([ROLE_ADMIN]);
const midDefault = authRoles([ROLE_DEFAULT]);
const midAdminAndDefault = authRoles([ROLE_ADMIN, ROLE_DEFAULT]);

router.get('/', [verifyToken, midAdmin, parseQueryParams], readMany);
router.get('/:id', [verifyToken, midAdminAndDefault, rightDefaultUser], readOne);

router.get('/:id/pay-methods', [verifyToken, midAdminAndDefault, rightDefaultUser, parseQueryParams], readPayMeths);
router.get('/:id/pay-methods/:payMethId', [verifyToken, midAdminAndDefault, rightDefaultUser], readPayMeth);
router.post('/:id/pay-methods', [verifyToken, midDefault, rightDefaultUser], createPayMeth);
router.delete('/:id/pay-methods/:payMethId', [verifyToken, midDefault, rightDefaultUser], deletePayMeth);

router.get('/:id/pay-concept-persons', [verifyToken, midAdminAndDefault, rightDefaultUser, parseQueryParams], readPayConceptPersons);
router.get('/:id/pay-concept-persons/:payConceptId', [verifyToken, midAdminAndDefault, rightDefaultUser], readPayConceptPerson);

router.get('/:id/payments', [verifyToken, midAdminAndDefault, rightDefaultUser, parseQueryParams], readPayments);
router.get('/:id/payments/:paymentId', [verifyToken, midAdminAndDefault, rightDefaultUser], readPayment);

router.get('/:id/invoices', [verifyToken, midAdminAndDefault, rightDefaultUser, parseQueryParams], readInvoices);
router.get('/:id/invoices/:invoiceId', [verifyToken, midAdminAndDefault, rightDefaultUser], readInvoice);

export default router;
