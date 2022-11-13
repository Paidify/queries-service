import jwt from 'jsonwebtoken';
import { ROLE_DEFAULT } from '../config/constants.js';
import { JWT_SECRET } from '../config/index.config.js';

export function verifyToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({
        message: 'Access denied. Please provide your access token in the Authorizarion header with the Bearer schema.'
    });
    try {
        req.token = jwt.verify(token.split(' ')[1], JWT_SECRET);
        next();
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: 'Invalid token' });
    }
}

export function authRoles(roles) {
    return (req, res, next) => {
        if (!roles.includes(req.token.role)) {
            return res.status(401).json({ message: 'You are not authorized to perform this action' });
        }
        next();
    }
}

export function rightDefaultUser(req, res, next) {
    if (req.token.role === ROLE_DEFAULT && req.token.id !== +req.params.id) {
        console.log(req.token.id, req.params.id);
        return res.status(401).json({ message: 'You are not authorized to perform this action' });
    }
    next();
}
