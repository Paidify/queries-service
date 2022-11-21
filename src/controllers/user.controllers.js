import poolU from '../services/dbUniv.js';
import poolP from '../services/dbPaidify.js';
import {
    createOne as createElement,
    readOne as readElement,
    readMany as readElements,
    deleteOne as deleteElement,
    updateOne as updateElement
} from '../helpers/crud.js';
import { cardIsWestern, parseOwnerName, removeNull, validateCardNumber } from '../helpers/utils.js';
import fetch from '../helpers/fetch.js';
import { EAST_BANK_API_ENDPOINT, WESTERN_BANK_API_ENDPOINT } from '../config/index.config.js';

// USERS

export async function readOne(req, res) {
    const { id } = req.params;
    let user, person;
    
    try {
        user = await readElement(
            'user', { 'user': ['id', 'person_id'] }, [], { id }, poolP
        );
    } catch (err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    try {
        person = await readElement(
            'person',
            {
                'person': ['first_name', 'last_name', 'email', 'doc_number'],
                'univ_actor': ['username'],
                'doc_type': ['doc_type'],
                'address': ['address_line', 'zip_code'],
                'city': ['city'],
                'department': ['department'],
                'campus': ['campus'],
            },
            [
                'LEFT JOIN univ_actor ON person.id = univ_actor.person_id',
                'LEFT JOIN doc_type ON person.doc_type_id = doc_type.id',
                'LEFT JOIN address ON person.address_id = address.id',
                'LEFT JOIN city ON address.city_id = city.id',
                'LEFT JOIN department ON city.department_id = department.id',
                'LEFT JOIN campus ON univ_actor.campus_id = campus.id',
            ],
            { 'person.id': user.person_id },
            poolU
        );
    } catch (err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Person not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    person.id = user.id;
    res.status(200).json({ user: person });
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;

    let users, persons;
    
    try {
        users = await readElements(
            'user', { 'user': ['id', 'person_id'] }, [], {}, null, null, poolP
        );
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }

    if(!users?.length) return res.status(200).json([]);

    try {
        persons = await readElements(
            'person',
            {
                'person': ['id', 'first_name', 'last_name', 'email', 'doc_number'],
                'univ_actor': ['username'],
                'doc_type': ['doc_type'],
                'address': ['address_line', 'zip_code'],
                'city': ['city'],
                'department': ['department'],
                'campus': ['campus'],
            },
            [
                'LEFT JOIN univ_actor ON person.id = univ_actor.person_id',
                'LEFT JOIN doc_type ON person.doc_type_id = doc_type.id',
                'LEFT JOIN address ON person.address_id = address.id',
                'LEFT JOIN city ON address.city_id = city.id',
                'LEFT JOIN department ON city.department_id = department.id',
                'LEFT JOIN campus ON univ_actor.campus_id = campus.id',
            ],
            {
                ...where,
                'person.id': users.map(user => user.person_id),
                // $or: true
            },
            limit, order, poolU
        );
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(persons.map(person => {
        const user = users.find(user => user.person_id === person.id);
        person.id = user ? user.id : null;
        return person;
    }));
}

// PAYMENT METHODS

export async function createPayMeth(req, res) {
    const { id } = req.params;
    const { card_number, card_type, owner } = req.body;
    if(!card_type || !owner || !card_number || !validateCardNumber(card_number)) {
        return res.status(400).json({ message: 'Bad request' });
    }
    
    let user;
    try {
        user = await readElement('user', { 'user': ['id', 'person_id'] }, [], { id }, poolP);
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Person not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    let cardTypeId;
    try {
        cardTypeId = (await readElement(
            'card_type', { 'card_type': ['id'] }, [], { card_type }, poolP
        )).id;
    } catch(err) {
        console.log(err);
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Card type not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    
    try {
        const { data, status } = await fetch(
            cardIsWestern(card_number) ? WESTERN_BANK_API_ENDPOINT : EAST_BANK_API_ENDPOINT,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    'nombre': parseOwnerName(owner),
                    'tipoTarjeta': cardTypeId,
                    'nroTarjeta': card_number,
                }),
            }
        );
        console.log(data);
        if (status !== 200) {
            return res.status(404).json({ message: `Card not found in ${cardIsWestern(card_number) ? 'Western' : 'East'} Bank` });
        }
    } catch (err) {
        return res.status(500).json({
            message: `Internal server error when requesting ${cardIsWestern(card_number) ? 'Western' : 'East'} Bank`
        });
    }

    let payMeth;
    try {
        payMeth = await createElement('payment_method', {
            user_id: user.id, card_number, card_type_id: cardTypeId, owner
        }, poolP);
    } catch (err) {
        console.log(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Duplicate entry' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(201).json({
        message: 'Payment method created',
        id: payMeth.insertId,
    });
}

export async function readPayMeth(req, res) {
    const { id, payMethId } = req.params;
    let payMeth;
    try {
        payMeth = await readElement(
            'payment_method',
            {
                'payment_method': ['id', 'owner', 'card_number'],
                'card_type': ['card_type'],
            },
            ['LEFT JOIN card_type ON payment_method.card_type_id = card_type.id'],
            { 'payment_method.id': payMethId, 'payment_method.user_id': id },
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

export async function readPayMeths(req, res) {
    const { id } = req.params;
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
            { ...where, 'payment_method.user_id': id },
            limit, order, poolP
        );
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(payMeths);
}

export async function deletePayMeth(req, res) {
    const { id, payMethId } = req.params;
    
    let payMeth;
    try {
        payMeth = await readElement(
            'payment_method', { 'payment_method': ['id'] }, [], { 'id': payMethId, 'user_id': id }, poolP
        );
        await deleteElement('payment_method', { 'id': payMethId, 'user_id': id }, poolP);
    } catch (err) {
        if (err.message === 'Not found') {
            return res.status(404).json({ message: 'Payment method not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    res.status(200).json({
        message: 'Payment method deleted',
        payMeth
    });
}

// PAYMENT CONCEPT PERSONS

export async function readPayConceptPerson(req, res) {
    const { id, payConceptId } = req.params;
    let payConceptPerson, personId;

    try {
        personId = (await readElement('user', { 'user': ['person_id'] }, [], { id }, poolP)).person_id;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    try {
        payConceptPerson = await readElement(
            'payment_concept_person',
            {
                'payment_concept_person': ['id', 'ref_number', 'pay_before', 'completed'],
                'payment_concept': ['id', 'payment_concept', 'amount'],
            },
            [
                'JOIN payment_concept ON payment_concept_person.payment_concept_id = payment_concept.id'
            ],
            { 'payment_concept_person.id': payConceptId, 'person_id': personId },
            poolU
        );
    } catch (err) {
        console.log(err);
        if (err.message === 'Not found') {
            return res.status(404).json({ message: 'Payment concept not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    
    payConceptPerson.payment_concept = {
        id: payConceptPerson.payment_concept_id,
        payment_concept: payConceptPerson.payment_concept,
        amount: payConceptPerson.amount,
    }
    delete payConceptPerson.payment_concept_id;
    delete payConceptPerson.amount;
    
    res.status(200).json(payConceptPerson);
}

export async function readPayConceptPersons(req, res) {
    const { id } = req.params;
    const { where, limit, order } = req.query;
    let payConceptPersons, personId;

    try {
        personId = (await readElement('user', { 'user': ['person_id'] }, [], { id }, poolP)).person_id;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    try {
        payConceptPersons = await readElements(
            'payment_concept_person',
            {
                'payment_concept_person': ['id', 'ref_number', 'pay_before', 'completed'],
                'payment_concept': ['id', 'payment_concept', 'amount'],
            },
            [
                'JOIN payment_concept ON payment_concept_person.payment_concept_id = payment_concept.id'
            ],
            { ...where, 'person_id': personId },
            limit, order, poolU
        );
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }

    console.log(payConceptPersons);
    for (let i = 0; i < payConceptPersons.length; i++) {
        payConceptPersons[i].payment_concept = {
            id: payConceptPersons[i].payment_concept_id,
            payment_concept: payConceptPersons[i].payment_concept,
            amount: payConceptPersons[i].amount,
        }
        delete payConceptPersons[i].payment_concept_id;
        delete payConceptPersons[i].amount;
    }
    
    res.status(200).json(payConceptPersons);
}

// PAYMENTS

export async function readPayment(req, res) {
    const { id, paymentId } = req.params;
    let payerId, payment;

    try {
        payerId = (await readElement('user', { 'user': ['payer_id'] }, [], { id }, poolP)).id;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Person not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    
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
            { 'payment.id': paymentId, 'payer_id': payerId },
            poolP
        );
    } catch(err) {
        console.log(err);
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

    let payConcept;
    try {
        payConcept = await readElement(
            'payment_concept',
            { 'payment_concept': ['payment_concept', 'amount'] },
            [],
            { 'id': payment.payment_concept_id },
            poolU
        );
    } catch(err) {}
    payment.payment_concept = {
        id: payment.payment_concept_id,
        payment_concept: payConcept ? payConcept.payment_concept : null,
        amount: payConcept ? payConcept.amount : null,
    };
    delete payment.payment_concept_id;
    
    res.status(200).json(payment);
}

export async function readPayments(req, res) {
    const { id } = req.params;
    const { where, limit, order } = req.query;
    let payerId, payments;

    try {
        payerId = (await readElement('user', { 'user': ['payer_id'] }, [], { id }, poolP)).id;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Person not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

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
            { ...where, 'payer_id': payerId },
            limit, order, poolP
        );
    } catch(err) {
        return res.status(500).json({ message: 'Internal server error' });
    }
    for (const payment of payments) removeNull(payment);
    
    let campuses, payConcepts;
    try {
        campuses = await readElements('campus', { 'campus': ['id', 'campus'] }, [], {}, null, null, poolU);
    } catch(err) {}
    for(let i = 0; i < payments.length; i++) {
        if(campuses?.length) {
            const campus = campuses.find(campus => campus.id === payments[i].campus_id);
            payments[i].campus = campus ? campus.campus : null;
        }
        delete payments[i].campus_id;
    }

    try {
        payConcepts = await readElements(
            'payment_concept',
            { 'payment_concept': ['id', 'payment_concept', 'amount'] },
            [], {}, null, null, poolU
        );
    } catch(err) {}
    for(let i = 0; i < payments.length; i++) {
        if(payConcepts?.length) {
            const payConcept = payConcepts.find(
                payConcept => payConcept.id === payments[i].payment_concept_id
            );
            payments[i].payment_concept = {
                id: payments[i].payment_concept_id,
                payment_concept: payConcept ? payConcept.payment_concept : null,
                amount: payConcept ? payConcept.amount : null
            }
        }
        delete payments[i].payment_concept_id;
    }

    res.status(200).json(payments);
}

// INVOICES

export async function readInvoice(req, res) {
    const { id, invoiceId } = req.params;
    let payerId, invoice;

    try {
        payerId = (await readElement('user', { 'user': ['payer_id'] }, [], { id }, poolP)).id;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Person not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    
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
            { 'invoice.id': invoiceId, 'payer_id': payerId },
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
    
    res.status(200).json(invoice);
}

export async function readInvoices(req, res) {
    const { id } = req.params;
    const { where, limit, order } = req.query;
    let payerId, invoices;

    try {
        payerId = (await readElement('user', { 'user': ['payer_id'] }, [], { id }, poolP)).id;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Person not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

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
            { ...where, 'payer_id': payerId },
            limit, order, poolP
        );
    } catch(err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }

    if(!invoices?.length) return res.status(200).json([]);

    let campuses, payConcepts;
    try {
        campuses = await readElements('campus', { 'campus': ['id', 'campus'] }, [], {}, null, null, poolU);
    } catch(err) {}
    for(let i = 0; i < invoices.length; i++) {
        const campus = campuses ? campuses.find(campus => campus.id === invoices[i].campus_id) : null;
        invoices[i].campus = campus ? campus.campus : null;
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
            }
        }
        delete invoices[i].payment_concept_id;
    }

    res.status(200).json(invoices);
}
