import poolU from '../services/dbUniv.js';
import poolP from '../services/dbPaidify.js';
import {
    readOne as readElement,
    readMany as readElements,
} from '../helpers/crud.js';

// GUESTS
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
