import { config } from 'dotenv';

config();

// app
export const HOST = process.env.HOST || 'localhost';
export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';

// api gateway
export const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3001';

// db
export const DB_HOST = process.env.DB_HOST || 'localhost';
export const DB_PORT = process.env.DB_PORT || 3306;
export const DB_SSL_CA = NODE_ENV === 'production' && process.env.DB_SSL_CA ? Buffer.from(process.env.DB_SSL_CA, 'base64').toString('ascii') : undefined;
export const DB_USER = process.env.DB_USER || 'api';
export const DB_PASSWORD = process.env.DB_PASSWORD || 'secret';
export const DB_PAIDIFY_SCHEMA = process.env.DB_PAIDIFY_SCHEMA || 'paidify';
export const DB_UNIV_SCHEMA = process.env.DB_UNIV_SCHEMA || 'univ';

// banks endpoints
export const WESTERN_BANK_API_ENDPOINT = process.env.WESTERN_BANK_API_ENDPOINT || 'http://localhost:3002';
export const EAST_BANK_API_ENDPOINT = process.env.EAST_BANK_API_ENDPOINT || 'http://localhost:3003';

// jwt
export const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// other
if (process.env.TERMINAL_TITLE) {
    process.title = process.env.TERMINAL_TITLE;
}
