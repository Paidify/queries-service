import express from 'express';
import poolU from './services/dbUniv.js';
import poolP from './services/dbPaidify.js';
import pkg from '../package.json' assert { type: 'json' };
import v1 from './routes/index.routes.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

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
app.use('/v1', v1);
app.use((_, res) => res.status(404).send('Not Found'));

export default app;
