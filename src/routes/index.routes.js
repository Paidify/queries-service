import { Router } from 'express';
import guest from './guest.routes.js';
import user from './user.routes.js';
import payConcepts from './payConcept.routes.js';
import payMeths from './payMeth.routes.js';
import payments from './payment.routes.js';
import invoices from './invoice.routes.js';

const router = Router();

router.use('/guests', guest);
router.use('/users', user);
router.use('/pay-concepts', payConcepts);
router.use('/pay-methods', payMeths);
router.use('/payments', payments);
router.use('/invoices', invoices);

export default router;
