import { Router } from 'express';
import guest from './guest.routes.js';
import user from './user.routes.js';
import payConcept from './payConcept.routes.js';
import payMeth from './payMeth.routes.js';
import payment from './payment.routes.js';
import payReq from './payReq.routes.js';
import paySettled from './paySettled.routes.js';
import invoice from './invoice.routes.js';

const router = Router();

router.use('/guests', guest);
router.use('/users', user);
router.use('/pay-concepts', payConcept);
router.use('/pay-methods', payMeth);
router.use('/payments', payment);
router.use('/pay-reqs', payReq);
router.use('/pay-settled', paySettled);
router.use('/invoices', invoice);

export default router;
