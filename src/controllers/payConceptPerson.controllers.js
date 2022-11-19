import poolP from '../services/dbPaidify.js';
import poolU from '../services/dbUniv.js';
import {
    readOne as readElement,
    readMany as readElements
} from '../helpers/crud.js';

export async function readOne(req, res) {
    const { id } = req.params;
    let payConceptPerson, userId;
    try {
        payConceptPerson = await readElement(
            'payment_concept_person',
            {
                'payment_concept_person': ['id', 'ref_number', 'pay_before', 'completed'],
                'payment_concept': ['id', 'payment_concept', 'amount'],
                'person': ['id', 'email']
            },
            [
                'LEFT JOIN payment_concept ON payment_concept_person.payment_concept_id = payment_concept.id',
                'LEFT JOIN person ON payment_concept_person.person_id = person.id'
            ],
            { 'payment_concept_person.id': id },
            poolU
        );
    } catch(err) {
        console.log(err);
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Payment concept not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    payConceptPerson.payment_concept = {
        id: payConceptPerson.payment_concept_id,
        payment_concept: payConceptPerson.payment_concept,
        amount: payConceptPerson.amount
    };
    delete payConceptPerson.payment_concept_id;
    delete payConceptPerson.amount;

    try {
        userId = (await readElement(
            'user',
            { 'user': ['id'] },
            null,
            { 'person_id': payConceptPerson.person_id },
            poolP
        )).id;
    } catch(err) {}
    payConceptPerson.user = {
        id: userId || null,
        email: payConceptPerson.email
    }
    delete payConceptPerson.person_id;
    delete payConceptPerson.email;
    
    res.status(200).json(payConceptPerson);
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;
    let payConcepts;
    try {
        payConcepts = await readElements(
            'payment_concept_person',
            {
                'payment_concept_person': ['id', 'ref_number', 'pay_before', 'completed'],
                'payment_concept': ['id', 'payment_concept', 'amount'],
                'person': ['id', 'email']
            },
            [
                'LEFT JOIN payment_concept ON payment_concept_person.payment_concept_id = payment_concept.id',
                'LEFT JOIN person ON payment_concept_person.person_id = person.id'
            ],
            where, limit, order, poolU
        );
    } catch(err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }

    if(!payConcepts.length) return res.status(200).json([]);

    for(let i = 0; i < payConcepts.length; i++) {
        payConcepts[i].payment_concept = {
            id: payConcepts[i].payment_concept_id,
            payment_concept: payConcepts[i].payment_concept,
            amount: payConcepts[i].amount
        };
        delete payConcepts[i].payment_concept_id;
        delete payConcepts[i].amount;
    }

    let users;
    try {
        users = await readElements(
            'user',
            { 'user': ['id', 'person_id'] },
            null,
            { 'person_id': payConcepts.map(payConcept => payConcept.person_id) },
            null, null, poolP
        );
    } catch(err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
    
    for(let i = 0; i < payConcepts.length; i++) {
        const user = users.length ? users.find(user => user.person_id === payConcepts[i].person_id) : null;
        payConcepts[i].user ={
            email: payConcepts[i].email,
            id: user ? user.id : null
        };
        delete payConcepts[i].person_id;
        delete payConcepts[i].email;
    }
    
    res.status(200).json(payConcepts);
}
