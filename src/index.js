import app from './app.js';
import apiGateway from './api-gateway/apiGateway.js';
import { PORT } from './config/index.config.js';

app.listen(PORT, async () => {
    console.log(`Server is listening on port ${PORT}`);
    try {
        const response = await apiGateway();
        console.log('API Gateway response:', response.data);
    } catch(err) {
        // if error is 409, it means that the service is already registered, so it may not be a problem
        if (err.response && err.response.status === 409) {
            return console.log('API Gateway message:', err.response.data);
        }
        console.log('Cannot connect to API Gateway');
    }
});
