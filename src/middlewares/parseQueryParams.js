import { parse } from 'query-string';

export default function(req, _, next) {
    const query = parse(req.url.split('?')[1], {arrayFormat: 'comma'});
    const { $offset, $limit, $sort, ...rest } = query;

    const mysqlQuery = {};
    mysqlQuery.where = rest;
    if($limit) mysqlQuery.limit = { $limit, $offset };
    if($sort) mysqlQuery.order = {
        by: $sort.slice(1),
        order: $sort[0] === '-' ? 'DESC' : 'ASC'
    };

    req.query = mysqlQuery;
    next();
}
