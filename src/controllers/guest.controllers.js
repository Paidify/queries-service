import poolU from '../services/dbUniv.js';
import poolP from '../services/dbPaidify.js';
import {
    createOne as createElement,
    readOne as readElement,
    readMany as readElements,
    deleteOne as deleteElement,
    updateOne as updateElement
} from '../helpers/crud.js';
import { removeNull } from '../helpers/utils.js';

// GUESTS

export async function createOne(req, res) {
    const { first_name, last_name, email, doc_number, doc_type, city, department, zip_code, address_line } = req.body;
    if(!first_name || !last_name || !email || !doc_number || !doc_type || !zip_code) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    let guest, guestId, payerId, cityId, addressId, docTypeId;
    
    try {
        docTypeId = (await readElement('doc_type', { 'doc_type': [ 'id' ] }, [], { doc_type }, poolU)).id;
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(400).json({ message: 'Invalid document type' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    const guestFields = { first_name, last_name, email, doc_number, doc_type_id: docTypeId };
    
    if(city && department) {
        try {
            cityId = (await readElement(
                'city',
                { 'city': ['id'] },
                ['JOIN department ON city.department_id = department.id'],
                { city, department },
                poolU
            )).id;
        } catch {}
    }
    const addressFields = {
        zip_code,
        address_line: address_line || null,
        city_id: cityId || null
    };

    try {
        guest = await readElement('guest', { 'guest': ['id', 'address_id'] }, [], { doc_number }, poolP);
    } catch(err) {}

    const connP = await poolP.getConnection();
    try {
        await connP.beginTransaction();
        if(guest) {
            await updateElement('guest', guestFields, { id: guest.id }, connP);
            await updateElement('address', addressFields, { id: guest.address_id }, connP);
        } else {
            addressId = (await createElement('address', addressFields, connP)).insertId;
            guestFields.address_id = addressId;
            payerId = (await createElement('payer', {}, connP)).insertId;
            guestFields.payer_id = payerId;
            guestId = (await createElement('guest', guestFields, connP)).insertId;
        }
        await connP.commit();
    } catch (err) {
        console.log(err);
        await connP.rollback();
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Duplicate entry' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    connP.release();
    if(guest) {
        return res.status(200).json({
            message: 'Guest updated',
            id: guest.id,
            address_id: guest.address_id
        });
    }
    return res.status(201).json({
        message: 'Guest created',
        id: guestId,
        address_id: addressId,
        payer_id: payerId
    });
}

export async function readOne(req, res) {
    const { id } = req.params;
    let guest;
    try {
        guest = await readElement(
            'guest',
            {
                'guest': ['id', 'first_name', 'last_name', 'email', 'doc_number', 'doc_type_id'],
                'address': ['zip_code', 'address_line', 'city_id'],
            },
            ['LEFT JOIN address ON guest.address_id = address.id'],
            { 'guest.id': id },
            poolP
        );
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Guest not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    if(guest.city_id) {
        try {
            const { city, department } = await readElement(
                'city',
                { 'city': ['city'], 'department': ['department'] },
                ['JOIN department ON city.department_id = department.id'],
                { 'city.id': guest.city_id },
                poolU
            );
            guest.city = city;
            guest.department = department;
        } catch(err) {}
    }
    delete guest.city_id;

    try {
        guest.doc_type = (await readElement(
            'doc_type',
            { 'doc_type': ['doc_type'] },
            [],
            { 'id': guest.doc_type_id },
            poolU
        )).doc_type;
    } catch(err) {}
    delete guest.doc_type_id;

    return res.status(200).json(guest);
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;
    let guests;
    try {
        guests = await readElements(
            'guest',
            {
                'guest': ['id', 'first_name', 'last_name', 'email', 'doc_number', 'doc_type_id'],
                'address': ['zip_code', 'address_line', 'city_id'],
            },
            ['LEFT JOIN address ON guest.address_id = address.id'],
            where, limit, order, poolP
        );
    } catch(err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }

    let cities = [], departments = [], docTypes = [];
    try {
        cities = await readElements(
            'city',
            { 'city': ['id', 'city', 'department_id'] },
            [], {}, null, null, poolU
        );
    } catch (err) {}

    try {
        departments = await readElements(
            'department',
            { 'department': ['id', 'department'] },
            [], {}, null, null, poolU
        );
    } catch (err) {}

    try {
        docTypes = await readElements(
            'doc_type',
            { 'doc_type': ['id', 'doc_type'] },
            [], {}, null, null, poolU
        );
    } catch (err) {}

    guests.forEach(guest => {
        const city = cities.find(city => city.id === guest.city_id);
        if(city) {
            guest.city = city.city;
            guest.department = departments.find(dep => dep.id === city.department_id).department;
        }
        delete guest.city_id;

        guest.doc_type = docTypes.find(docType => docType.id === guest.doc_type_id).doc_type;
        delete guest.doc_type_id;
    });

    return res.status(200).json(guests);
}

export async function deleteOne(req, res) {
    const { id } = req.params;
    let guest;
    try {
        guest = await readElement('guest', { 'guest': ['id', 'address_id', 'payer_id'] }, [], { id }, poolP);
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Guest not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    const connP = await poolP.getConnection();
    try {
        await connP.beginTransaction();
        await deleteElement('guest', { id }, poolP);
        if(guest.address_id) await deleteElement('address', { id: guest.address_id }, poolP);
        if(guest.payer_id) await deleteElement('payer', { id: guest.payer_id }, poolP);
        await connP.commit();
    } catch(err) {
        console.log(err);
        await connP.rollback();
        return res.status(500).json({ message: 'Internal server error' });
    }
    connP.release();
    return res.status(200).json({
        message: 'Guest deleted',
        id: guest.id,
        address_id: guest.address_id,
        payer_id: guest.payer_id
    });
}

// PAYMENTS

export async function readPayment(req, res) {
    const { ref_number, doc_number, doc_type } = req.body;
    if(!ref_number || !doc_number || !doc_type) return res.status(400).json({ message: 'Bad request' });
    
    let payment, docNumber, docTypeId;
    try {
        await readElement('doc_type', { 'doc_type': ['id'] }, [], { doc_type }, poolU);
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Document type not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    
    try {
        payment = await readElement(
            'payment',
            {
                'payment': ['id', 'date', 'gateway_date', 'ref_number', 'num_installments', 'payer_id', 
                    'campus_id', 'payment_concept_id'],
                'card_type': ['card_type'],
                'payment_settled': ['amount', 'balance', 'effective_date', 'fulfilled', 'successful'],
                'invoice': ['due_date', 'description', 'invoice_number']
            },
            [
                'LEFT JOIN card_type ON payment.card_type_id = card_type.id',
                'LEFT JOIN payment_settled ON payment.id = payment_settled.payment_id',
                'LEFT JOIN invoice ON payment_settled.id = invoice.payment_settled_id'
            ],
            { ref_number },
            poolP
        );
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Payment not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }

    if(payment.payment_settled_id) {
        payment.invoice = {
            due_date: payment.due_date,
            description: payment.description,
            invoice_number: payment.invoice_number
        }
        delete payment.due_date;
        delete payment.description;
        delete payment.invoice_number;
    } else payment = removeNull(payment);

    try {
        const { person_id } = await readElement(
            'user', { 'user': ['person_id'] }, [], { payer_id: payment.payer_id }, poolP
        );
        const person = await readElement(
            'person', { 'person': ['doc_number', 'doc_type_id'] }, [], { id: person_id }, poolU
        );
        docNumber = person.doc_number;
        docTypeId = person.doc_type_id;
    } catch(err) {}

    if(!docNumber) {
        try {
            const guest = await readElement(
                'guest', { 'guest': ['doc_number', 'doc_type_id'] }, [], { id: payment.payer_id }, poolP
            );
            docNumber = guest.doc_number;
            docTypeId = guest.doc_type_id;
        } catch(err) {
            if(err.message === 'Not found') {
                return res.status(404).json({ message: 'Guest not found' });
            }
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    if(docNumber !== doc_number || docTypeId !== doc_type) {
        return res.status(404).json({ message: 'Payment not found' });
    }
    try {
        payment.campus = (await readElement(
            'campus', { 'campus': ['campus'] }, [], { id: payment.campus_id }, poolU
        )).campus;
    } catch(err) {}

    try {
        const { payment_concept, amount } = await readElement(
            'payment_concept',
            { 'payment_concept': ['payment_concept', 'amount'] },
            [],
            { id: payment.payment_concept_id },
            poolU
        );
        payment.payment_concept = { payment_concept, amount };
    } catch(err) {}

    delete payment.campus_id;
    delete payment.payment_concept_id;
    delete payment.payer_id;

    return res.status(200).json(payment);
}
