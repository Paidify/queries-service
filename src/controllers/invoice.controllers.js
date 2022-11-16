import poolU from '../services/dbUniv.js';
import poolP from '../services/dbPaidify.js';
import {
    readOne as readElement,
    readMany as readElements
} from '../helpers/crud.js';

export async function readOne(req, res) {
    const { id } = req.params;
    let invoice;

    try {
        invoice = await readElement(
            'invoice',
            {
                'invoice': ['id', 'description', 'invoice_number'],
                'payment_settled': ['amount', 'balance', 'effective_date', 'fulfilled', 'successful'],
                'payment': ['num_installments', 'campus_id', 'payment_concept_id'],
                'card_type': ['card_type'],
            },
            [
                'JOIN payment_settled ON invoice.payment_settled_id = payment_settled.id',
                'LEFT JOIN payment ON payment_settled.payment_id = payment.id',
                'LEFT JOIN card_type ON payment.card_type_id = card_type.id'
            ],
            { 'invoice.id': id },
            poolP
        );
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    try {
        invoice.campus = (await readElement(
            'campus', { 'campus': ['campus'] }, [], { 'id': invoice.campus_id }, poolU
        )).campus;
    } catch(err) {}

    try {
        const { payment_concept, amount } = await readElement(
            'payment_concept',
            { 'payment_concept': ['payment_concept', 'amount'] },
            [],
            { 'id': invoice.payment_concept_id },
            poolU
        );
        invoice.payment_concept = { payment_concept, amount };
    } catch(err) {}

    delete invoice.campus_id;
    delete invoice.payment_concept_id;
    
    res.status(200).json(invoice);
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;
    let invoices = [];

    try {
        invoices = await readElements(
            'invoice',
            {
                'invoice': ['id', 'description', 'invoice_number'],
                'payment_settled': ['amount', 'balance', 'effective_date', 'fulfilled', 'successful'],
                'payment': ['num_installments', 'campus_id', 'payment_concept_id'],
                'card_type': ['card_type'],
            },
            [
                'JOIN payment_settled ON invoice.payment_settled_id = payment_settled.id',
                'LEFT JOIN payment ON payment_settled.payment_id = payment.id',
                'LEFT JOIN card_type ON payment.card_type_id = card_type.id'
            ],
            where, limit, order, poolP
        );
    } catch(err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
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

    for(let i = 0; i < invoices.length; i++) {
        invoices[i].campus = campuses.find(campus => campus.id === invoices[i].campus_id).campus;
        const { payment_concept, amount } = payConcepts.find(
            payConcept => payConcept.id === invoices[i].payment_concept_id
        );
        invoices[i].payment_concept = { payment_concept, amount };
        delete invoices[i].campus_id;
        delete invoices[i].payment_concept_id;
    }

    res.status(200).json(invoices);
}
