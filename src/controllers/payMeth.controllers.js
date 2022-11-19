import poolP from '../services/dbPaidify.js';
import poolU from '../services/dbUniv.js';
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
                'user': ['id', 'person_id'],
            },
            [
                'LEFT JOIN card_type ON payment_method.card_type_id = card_type.id',
                'LEFT JOIN user ON payment_method.user_id = user.id'
            ],
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
    
    let email;
    try {
        email = (await readElement(
            'person',
            { 'person': ['email'] },
            null,
            { 'id': payMeth.person_id },
            poolU
        )).email;
    } catch (err) {}
    payMeth.user = { id: payMeth.user_id, email: email || null };
    delete payMeth.user_id;
    delete payMeth.person_id;
    
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
                'user': ['id', 'person_id'],
            },
            [
                'LEFT JOIN card_type ON payment_method.card_type_id = card_type.id',
                'LEFT JOIN user ON payment_method.user_id = user.id'
            ],
            where, limit, order, poolP
        );
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }

    if(!payMeths?.length) return res.status(200).json([]);

    let persons;
    try {
        persons = await readElements(
            'person',
            { 'person': ['id', 'email'] },
            null,
            { 'id': payMeths.map(payMeth => payMeth.person_id) },
            null, null, poolU
        );
    } catch(err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
    
    for(let i = 0; i < payMeths.length; i++) {
        const person = persons ? persons.find(person => person.id === payMeths[i].person_id) : null;
        payMeths[i].user = {
            id: payMeths[i].user_id,
            email: person ? person.email : null
        };
        delete payMeths[i].user_id;
        delete payMeths[i].person_id;
    }
    
    res.status(200).json(payMeths);
}
