import poolU from '../services/dbUniv.js';
import {
    readOne as readElement,
    readMany as readElements
} from '../helpers/crud.js';

export async function readOne(req, res) {
    const { id } = req.params;
    let campus;
    try {
        campus = await readElement(
            'campus',
            { 'campus': [ 'id', 'campus'] },
            null,
            { id },
            poolU
        );
    } catch(err) {
        if(err.message === 'Not found') {
            return res.status(404).json({ message: 'Campus not found' });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(campus);
}

export async function readMany(req, res) {
    const { where, limit, order } = req.query;
    let campuses;
    try {
        campuses = await readElements(
            'campus',
            { 'campus': [ 'id', 'campus'] },
            [],
            where, limit, order, poolU
        );
    } catch(err) {
        console.log(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
    res.status(200).json(campuses);
}
