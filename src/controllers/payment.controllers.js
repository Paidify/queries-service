import poolU from '../services/dbUniv.js';
import poolP from '../services/dbPaidify.js';
import {
    readOne as readElement,
    readMany as readElements
} from '../helpers/crud.js';

export async function readOne(req, res) {
    const { id } = req.params;
    let payment;

    try {
        payment = await readElement(
            'payment',
            {
                'payment': ['id', 'date', 'gateway_date', 'ref_number', 'num_installments',
                    'campus_id', 'payment_concept_id'],
                'card_type': ['card_type'],
                'payment_settled': ['amount', 'balance', 'effective_date', 'fulfilled', 'successful']
            },
            [
                'LEFT JOIN card_type ON payment.card_type_id = card_type.id',
                'LEFT JOIN payment_settled ON payment.id = payment_settled.payment_id'
            ],
            { 'payment.id': id },
            poolP
        );
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Payment not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    if(!payment.effective_date) payment = removeNull(payment);

    try {
        payment.campus = (await readElement(
            'campus', { 'campus': ['campus'] }, [], { 'id': payment.campus_id }, poolU
        )).campus;
    } catch(err) {}

    try {
        const { payment_concept, amount } = await readElement(
            'payment_concept',
            { 'payment_concept': ['payment_concept', 'amount'] },
            [],
            { 'id': payment.payment_concept_id },
            poolU
        );
        payment.payment_concept = { payment_concept, amount };
    } catch(err) {}

    delete payment.campus_id;
    delete payment.payment_concept_id;
    
    res.status(200).json(payment);
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;
    let payments = [];

    try {
        payments = await readElements(
            'payment',
            {
                'payment': ['id', 'date', 'gateway_date', 'ref_number', 'num_installments',
                    'campus_id', 'payment_concept_id'],
                'card_type': ['card_type'],
                'payment_settled': ['amount', 'balance', 'effective_date', 'fulfilled', 'successful']
            },
            [
                'LEFT JOIN card_type ON payment.card_type_id = card_type.id',
                'LEFT JOIN payment_settled ON payment.id = payment_settled.payment_id'
            ],
            where, limit, order, poolP
        );
    } catch(err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
    for(let i = 0; i < payments.length; i++) {
        if(!payments[i].effective_date) payments[i] = removeNull(payments[i]);
    }
    
    let campuses = [], payConcepts = [];
    try {
        campuses = await readElements('campus', { 'campus': ['id', 'campus'] }, [], {}, null, null, poolU);
    } catch(err) {}

    try {
        payConcepts = await readElements(
            'payment_concept',
            { 'payment_concept': ['id', 'payment_concept', 'amount'] },
            [], {}, null, null, poolU
        );
    } catch(err) {}

    for(let i = 0; i < payments.length; i++) {
        payments[i].campus = campuses.find(campus => campus.id === payments[i].campus_id).campus;
        const { payment_concept, amount } = payConcepts.find(
            payConcept => payConcept.id === payments[i].payment_concept_id
        );
        payments[i].payment_concept = { payment_concept, amount };
        delete payments[i].campus_id;
        delete payments[i].payment_concept_id;
    }

    res.status(200).json(payments);
}
