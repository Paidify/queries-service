import poolP from '../services/dbPaidify.js';
import {
    readOne as readElement,
    readMany as readElements,
} from '../helpers/crud.js';

export async function readOne(req, res) {
    const { id } = req.params;
    let payMeth;
    try {
        payMeth = await readElement(
            'payment_method',
            {
                'payment_method': ['id', 'owner', 'card_number'],
                'card_type': ['card_type'],
            },
            ['LEFT JOIN card_type ON payment_method.card_type_id = card_type.id',],
            { 'payment_method.id': id },
            poolP
        );
    } catch (err) {
        console.log(err);
        if (err.message === 'Not found') {
            return res.status(404).json({ message: 'Payment method not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(payMeth);
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;
    let payMeths;
    try {
        payMeths = await readElements(
            'payment_method',
            {
                'payment_method': ['id', 'owner', 'card_number'],
                'card_type': ['card_type'],
            },
            ['LEFT JOIN card_type ON payment_method.card_type_id = card_type.id'],
            where, limit, order, poolP
        );
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(payMeths);
}
