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
                'user': ['id', 'person_id'],
                'guest': ['id', 'first_name', 'last_name', 'doc_number']
            },
            [
                'JOIN payment_settled ON invoice.payment_settled_id = payment_settled.id',
                'LEFT JOIN payment ON payment_settled.payment_id = payment.id',
                'LEFT JOIN card_type ON payment.card_type_id = card_type.id',
                'LEFT JOIN payer ON payment.payer_id = payer.id',
                'LEFT JOIN user ON payer.id = user.payer_id',
                'LEFT JOIN guest ON payer.id = guest.payer_id'
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
        delete invoice.campus_id;
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
        delete invoice.payment_concept_id;
    } catch(err) {}

    if (invoice.guest_id) {
        invoice.payer = {
            guest_id: invoice.guest_id,
            first_name: invoice.first_name,
            last_name: invoice.last_name,
            doc_number: invoice.doc_number
        };
        delete invoice.guest_id;
        delete invoice.first_name;
        delete invoice.last_name;
        delete invoice.doc_number;
    } else {
        try {
            invoice.payer = await readOne(
                'person',
                { 'person': ['first_name', 'last_name', 'doc_number'] },
                [],
                { 'id': invoice.person_id },
                poolU
            );
            invoice.payer.user_id = invoice.user_id;
            delete invoice.user_id;
            delete invoice.person_id;
        } catch(err) {}
    }
    res.status(200).json(invoice);
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;
    let invoices;

    try {
        invoices = await readElements(
            'invoice',
            {
                'invoice': ['id', 'description', 'invoice_number'],
                'payment_settled': ['amount', 'balance', 'effective_date', 'fulfilled', 'successful'],
                'payment': ['num_installments', 'campus_id', 'payment_concept_id'],
                'card_type': ['card_type'],
                'user': ['id', 'person_id'],
                'guest': ['id', 'first_name', 'last_name', 'doc_number']
            },
            [
                'JOIN payment_settled ON invoice.payment_settled_id = payment_settled.id',
                'LEFT JOIN payment ON payment_settled.payment_id = payment.id',
                'LEFT JOIN card_type ON payment.card_type_id = card_type.id',
                'LEFT JOIN payer ON payment.payer_id = payer.id',
                'LEFT JOIN user ON payer.id = user.payer_id',
                'LEFT JOIN guest ON payer.id = guest.payer_id'
            ],
            where, limit, order, poolP
        );
    } catch(err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }

    if(!invoices.length) return res.status(200).json([]);

    let campuses = [], payConcepts = [];
    try {
        campuses = await readElements(
            'campus', { 'campus': ['id', 'campus'] }, [], {}, null, null, poolU
        );
    } catch(err) {}

    try {
        payConcepts = await readElements(
            'payment_concept',
            { 'payment_concept': ['id', 'payment_concept', 'amount'] },
            [], {}, null, null, poolU
        );
    } catch(err) {}

    for(const inv of invoices) {
        const campus = campuses.find(campus => campus.id === inv.campus_id);
        inv.campus = campus ? campus.campus : undefined;
        const payConcept = payConcepts.find(
            payConcept => payConcept.id === inv.payment_concept_id
        );
        inv.payment_concept = payConcept ? {
            payment_concept: payConcept.payment_concept,
            amount: payConcept.amount
        } : undefined;
        delete inv.campus_id;
        delete inv.payment_concept_id;
        
        if (inv.guest_id) {
            inv.payer = {
                guest_id: inv.guest_id,
                first_name: inv.first_name,
                last_name: inv.last_name,
                doc_number: inv.doc_number
            };
            delete inv.guest_id;
            delete inv.first_name;
            delete inv.last_name;
            delete inv.doc_number;
        }
    }
    
    let users = invoices.filter(inv => inv.user_id).map(({ user_id, person_id }) => ({ user_id, person_id }));
    let persons = [];
    if(users.length) {
        try {
            persons = await readMany(
                'person',
                { 'person': ['id', 'first_name', 'last_name', 'doc_number'] },
                [],
                { 'id': users.map(({ person_id }) => person_id) },
                poolU
            );
        } catch(err) {}
    }

    if(persons.length) {
        for(const inv of invoices) {
            if(inv.user_id) {
                const person = persons.find(person => person.id === inv.person_id);
                if(person) {
                    inv.payer = {
                        user_id: inv.user_id,
                        first_name: person.first_name,
                        last_name: person.last_name,
                        doc_number: person.doc_number
                    };
                }
                delete inv.user_id;
                delete inv.person_id;
            }
        }
    }

    res.status(200).json(invoices);
}
