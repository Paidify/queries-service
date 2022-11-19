import poolU from '../services/dbUniv.js';
import poolP from '../services/dbPaidify.js';
import {
    readOne as readElement,
    readMany as readElements
} from '../helpers/crud.js';
import { removeNull } from '../helpers/utils.js';

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
                'payment_settled': ['amount', 'balance', 'effective_date', 'fulfilled', 'successful'],
                'user': ['id', 'person_id'],
                'guest': ['id', 'email']
            },
            [
                'LEFT JOIN card_type ON payment.card_type_id = card_type.id',
                'LEFT JOIN payment_settled ON payment.id = payment_settled.payment_id',
                'LEFT JOIN payer ON payment.payer_id = payer.id',
                'LEFT JOIN user ON payer.id = user.payer_id',
                'LEFT JOIN guest ON payer.id = guest.payer_id'
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
    removeNull(payment);

    try {
        payment.campus = (await readElement(
            'campus', { 'campus': ['campus'] }, [], { 'id': payment.campus_id }, poolU
        )).campus;
    } catch(err) {}
    delete payment.campus_id;

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
    delete payment.payment_concept_id;

    if (payment.guest_id) {
        payment.guest = {
            id: payment.guest_id,
            email: payment.email
        };
        delete payment.guest_id;
        delete payment.email;
    } else {
        try {
            payment.user = await readElement(
                'person',
                { 'person': ['email'] },
                [],
                { 'id': payment.person_id },
                poolU
            );
            payment.user.id = payment.user_id;
            delete payment.user_id;
            delete payment.person_id;
        } catch(err) {}
    }
    
    res.status(200).json(payment);
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;
    let payments;

    try {
        payments = await readElements(
            'payment',
            {
                'payment': ['id', 'date', 'gateway_date', 'ref_number', 'num_installments',
                    'campus_id', 'payment_concept_id'],
                'card_type': ['card_type'],
                'payment_settled': ['amount', 'balance', 'effective_date', 'fulfilled', 'successful'],
                'user': ['id', 'person_id'],
                'guest': ['id', 'email']
            },
            [
                'LEFT JOIN card_type ON payment.card_type_id = card_type.id',
                'LEFT JOIN payment_settled ON payment.id = payment_settled.payment_id',
                'LEFT JOIN payer ON payment.payer_id = payer.id',
                'LEFT JOIN user ON payer.id = user.payer_id',
                'LEFT JOIN guest ON payer.id = guest.payer_id'
            ],
            where, limit, order, poolP
        );
    } catch(err) {
        return res.status(500).json({ message: 'Internal server error' });
    }

    if(!payments.length) return res.status(200).json([]);
    
    let campuses, payConcepts;
    try {
        campuses = await readElements('campus', { 'campus': ['id', 'campus'] }, [], {}, null, null, poolU);
    } catch(err) {}
    if(campuses?.length) {
        for(let i = 0; i < payments.length; i++) {
            const campus = campuses.find(campus => campus.id === payments[i].campus_id);
            payments[i].campus = campus ? campus.campus : null;
            delete payments[i].campus_id;
        }
    }

    try {
        payConcepts = await readElements(
            'payment_concept',
            { 'payment_concept': ['id', 'payment_concept', 'amount'] },
            [], {}, null, null, poolU
        );
    } catch(err) {}
    if(payConcepts?.length) {
        for(let i = 0; i < payments.length; i++) {
            const payConcept = payConcepts.find(
                payConcept => payConcept.id === payments[i].payment_concept_id
            );
            payments[i].payment_concept = payConcept ? {
                payment_concept: payConcept.payment_concept, amount: payConcept.amount
            } : null;
            delete payments[i].payment_concept_id;
        }
    }

    let paymentsFromGuests = 0;
    for(let i = 0; i < payments.length; i++) {
        removeNull(payments[i]);
        if(payments[i].guest_id) {
            paymentsFromGuests++;
            delete payments[i].user_id;
            delete payments[i].person_id;
            payments[i].guest = { id: payments[i].guest_id, email: payments[i].email };
            delete payments[i].guest_id;
            delete payments[i].email;
        }
    }

    if(paymentsFromGuests === payments.length) return res.status(200).json(payments);
    
    const paymentsUsers = payments.filter(pay => pay.user_id);
    let persons;
    if(paymentsUsers.length) {
        try {
            persons = await readElements(
                'person',
                { 'person': ['id', 'email'] },
                [],
                { 'id': paymentsUsers.map(({ person_id }) => person_id) },
                poolU
            );
        } catch(err) {}
    }
    if(persons?.length) {
        for(let i = 0; i < paymentsUsers.length; i++) {
            delete paymentsUsers[i].guest_id;
            delete paymentsUsers[i].email;
            const person = persons.find(person => person.id === paymentsUsers[i].person_id);
            paymentsUsers[i].user = person ? { id: paymentsUsers[i].user_id, email: person.email } : null;
            delete paymentsUsers[i].user_id;
            delete paymentsUsers[i].person_id;
        }
    }

    res.status(200).json(payments);
}
