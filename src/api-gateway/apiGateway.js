import axios from 'axios';
import { PORT, HOST, API_GATEWAY_URL } from '../config/index.config.js';

export default function apiGateway() {
    return axios({
        method: 'post',
        url: API_GATEWAY_URL + '/register',
        headers: { 'Content-Type': 'application/json' },
        data: {
            service: 'queries',
            url: `${HOST}:${PORT}`,
        }
    });
}
