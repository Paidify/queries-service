import express from 'express';
import poolU from './services/dbUniv.js';
import poolP from './services/dbPaidify.js';
import pkg from '../package.json' assert { type: 'json' };
import routes from './routes/index.routes.js';
import morgan from 'morgan';
import apiGateway from './api-gateway/apiGateway.js';

const app = express();

app.set('json spaces', 2);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.set('json spaces', 2);
app.use((_, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-auth-token');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
});

app.get('/', (_, res) => res.status(200).json({
    message: 'Welcome to the Paidify Queries Service',
    version: pkg.version,
    author: pkg.author,
    description: pkg.description,
}));
app.get('/ping', async (_, res) => {
    const results = {
        paidifyDB: 'Paidify DB says: ',
        univDB: 'Univ DB says: ',
    }
    try {
        results.paidifyDB += (await poolP.query('SELECT "Pong!" AS result'))[0][0].result;
    } catch (err) {
        console.log(err);
        results.paidifyDB += 'Cannot connect to DB';
    }

    try {
        results.univDB += (await poolU.query('SELECT "Pong!" AS result'))[0][0].result;
    } catch (err) {
        console.log(err);
        results.univDB += 'Cannot connect to DB';
    }

    res.status(200).json(results);
});
app.use(routes);
app.post('/api-gateway', async (_, res) => {
    const { status, message, error } = await apiGateway();
    res.status(status).json(message, error);
});
app.use((_, res) => res.status(404).json({ message: 'Not Found' }));

export default app;
