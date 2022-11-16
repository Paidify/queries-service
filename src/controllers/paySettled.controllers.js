import poolP from '../services/dbPaidify.js';
import {
    readOne as readElement,
    readMany as readElements
} from '../helpers/crud.js';

export async function readOne(req, res) {
    const { id } = req.params;
    let paySettled;

    try {
        paySettled = await readElement(
            'payment_settled',
            {
                'payment_settled': ['id', 'amount', 'balance', 'effective_date', 'fulfilled', 'successful'],
                'payment': ['id', 'ref_number'],
            },
            ['LEFT JOIN payment ON payment_settled.payment_id = payment.id'],
            { 'payment_settled.id': id },
            poolP
        );
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Payment Settled not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(paySettled);
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;
    let paysettled;

    try {
        paysettled = await readElements(
            'payment_settled',
            {
                'payment_settled': ['id', 'amount', 'balance', 'effective_date', 'fulfilled', 'successful'],
                'payment': ['id', 'ref_number'],
            },
            ['LEFT JOIN payment ON payment_settled.payment_id = payment.id'],
            where, limit, order, poolP
        );
    } catch(err) {
        return res.status(500).json({ message: 'Internal server error' });
    }

    res.status(200).json(paysettled);
}
