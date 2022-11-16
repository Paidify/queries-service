import poolU from '../services/dbUniv.js';
import poolP from '../services/dbPaidify.js';
import {
    createOne as createElement,
    readOne as readElement,
    readMany as readElements,
    deleteOne as deleteElement,
    updateOne as updateElement
} from '../helpers/crud.js';
import { CARD_TYPE_CREDIT } from '../config/constants.js';
import { removeNull, validateCardNumber } from '../helpers/utils.js';

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
    res.status(200).json({ users: persons.map(person => ({
        ...person, id: users.find(user => user.person_id === person.id).id }))
    });
}

// PAYMENT METHODS

export async function createPayMeth(req, res) {
    const { id } = req.params;
    const { card_number, card_type, owner } = req.body;
    if(!card_type || !owner || !card_number || !validateCardNumber(card_number)) {
        return res.status(400).json({ message: 'Bad request' });
    }
    
    let userId;
    try {
        userId = (await readElement('user', { 'user': ['id'] }, [], { id }, poolP)).id;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Person not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    let cardTypeId, payMeth;
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

    // TODO: Validate card number with bank API

    try {
        payMeth = await createElement('payment_method', {
            user_id: userId, card_number, card_type_id: cardTypeId, owner
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

// PAYMENT CONCEPTS

export async function readPayConcept(req, res) {
    const { id, payConceptId } = req.params;
    let payConcept, personId;

    try {
        personId = (await readElement('user', { 'user': ['person_id'] }, [], { id }, poolP)).person_id;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    try {
        payConcept = await readElement(
            'payment_concept_person',
            {
                'payment_concept_person': ['id', 'ref_number', 'pay_before'],
                'payment_concept': ['payment_concept', 'amount'],
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
    res.status(200).json(payConcept);
}

export async function readPayConcepts(req, res) {
    const { id } = req.params;
    const { where, limit, order } = req.query;
    let payConcepts, personId;

    try {
        personId = (await readElement('user', { 'user': ['person_id'] }, [], { id }, poolP)).person_id;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    try {
        payConcepts = await readElements(
            'payment_concept_person',
            {
                'payment_concept_person': ['id', 'ref_number', 'pay_before'],
                'payment_concept': ['payment_concept', 'amount'],
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
    res.status(200).json(payConcepts);
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

export async function readInvoices(req, res) {
    const { id } = req.params;
    const { where, limit, order } = req.query;
    let payerId, invoices = [];

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
