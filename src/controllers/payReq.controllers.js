import poolP from '../services/dbPaidify.js';
import {
    readOne as readElement,
    readMany as readElements,
    deleteOne as deleteElement
} from '../helpers/crud.js';

export async function readOne(req, res) {
    const { id } = req.params;
    let payReq;

    try {
        payReq = await readElement(
            'payment_req',
            {
                'payment_req': ['id', 'card_number', 'owner'],
                'payment': ['id', 'ref_number'],
            },
            ['LEFT JOIN payment ON payment_req.payment_id = payment.id'],
            { 'payment_req.id': id },
            poolP
        );
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Payment Request not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(payReq);
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;
    let payReqs;

    try {
        payReqs = await readElements(
            'payment_req',
            {
                'payment_req': ['id', 'card_number', 'owner'],
                'payment': ['id', 'ref_number'],
            },
            ['LEFT JOIN payment ON payment_req.payment_id = payment.id'],
            where, limit, order, poolP
        );
    } catch(err) {
        return res.status(500).json({ message: 'Internal server error' });
    }

    res.status(200).json(payReqs);
}

export async function deleteAll(req, res) {
    let payReqs;
    try {
        payReqs = await readElements('payment_req', { 'payment_req': ['payment_id'] }, null, null, null, null, poolP);
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }

    let count = 0;
    for (const payReq of payReqs) {
        try {
            await deleteElement('payment', { 'id': payReq.payment_id }, poolP);
            count++;
        } catch(err) {}
    }

    res.status(200).json({ message: `Deleted ${count} from ${payReqs.length}` })
}
