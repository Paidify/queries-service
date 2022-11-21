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
                'guest': ['id', 'email']
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
    } catch(err) {}
    delete invoice.campus_id;

    let payConcept;
    try {
        payConcept = await readElement(
            'payment_concept',
            { 'payment_concept': ['payment_concept', 'amount'] },
            [],
            { 'id': invoice.payment_concept_id },
            poolU
        );
    } catch(err) {}
    invoice.payment_concept = {
        id: invoice.payment_concept_id,
        payment_concept: payConcept ? payConcept.payment_concept : null,
        amount: payConcept ? payConcept.amount : null
    };
    delete invoice.payment_concept_id;

    if (invoice.guest_id) {
        delete invoice.user_id;
        delete invoice.person_id;
        
        invoice.guest = {
            id: invoice.guest_id,
            email: invoice.email
        };
        delete invoice.guest_id;
        delete invoice.email;
    } else {
        delete invoice.guest_id;
        delete invoice.email;
        
        try {
            invoice.user = await readElement(
                'person',
                { 'person': ['email'] },
                [],
                { 'id': invoice.person_id },
                poolU
            );
            invoice.user.id = invoice.user_id;
        } catch(err) {}
        delete invoice.user_id;
        delete invoice.person_id;
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
                'guest': ['id', 'email']
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

    if(!invoices?.length) return res.status(200).json([]);

    let campuses, payConcepts;
    try {
        campuses = await readElements(
            'campus', { 'campus': ['id', 'campus'] }, [], {}, null, null, poolU
        );
    } catch(err) {}
    for(let i = 0; i < invoices.length; i++) {
        if(campuses?.length) {
            const campus = campuses.find(campus => campus.id === invoices[i].campus_id);
            invoices[i].campus = campus ? campus.campus : null;
        }
        delete invoices[i].campus_id;
    }

    try {
        payConcepts = await readElements(
            'payment_concept',
            { 'payment_concept': ['id', 'payment_concept', 'amount'] },
            [], {}, null, null, poolU
        );
    } catch(err) {}
    for(let i = 0; i < invoices.length; i++) {
        if(payConcepts?.length) {
            const payConcept = payConcepts.find(
                payConcept => payConcept.id === invoices[i].payment_concept_id
            );
            invoices[i].payment_concept = {
                id: invoices[i].payment_concept_id,
                payment_concept: payConcept ? payConcept.payment_concept : null,
                amount: payConcept ? payConcept.amount : null
            };
        }
        delete invoices[i].payment_concept_id;
    }

    let invFromGuests = 0;
    for(let i = 0; i < invoices.length; i++) {
        if (invoices[i].guest_id) {
            invFromGuests++;
            delete invoices[i].user_id;
            delete invoices[i].person_id;
            invoices[i].guest = { id: invoices[i].guest_id, email: invoices[i].email };
            delete invoices[i].guest_id;
            delete invoices[i].email;
        }
    }
    
    if(invFromGuests === invoices.length) return res.status(200).json(invoices); // all invoices were paid by guests
    
    const invUsers = invoices.filter(inv => inv.user_id);
    let persons;
    if(invUsers.length) {
        try {
            persons = await readElements(
                'person',
                { 'person': ['id', 'email'] },
                [],
                { 'id': invUsers.map(({ person_id }) => person_id) },
                null, null, poolU
            );
        } catch(err) {}
    }
    for(let i = 0; i < invUsers.length; i++) {
        delete invUsers[i].guest_id;
        delete invUsers[i].email;
        if(persons?.length) {
            const person = persons.find(person => person.id === invUsers[i].person_id);
            invUsers[i].user = person ? { id: invUsers[i].user_id, email: person.email } : null;
        }
        delete invUsers[i].user_id;
        delete invUsers[i].person_id;
    }

    res.status(200).json(invoices);
}
