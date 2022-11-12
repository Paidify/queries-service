import { joinClauses, selectClause, whereClause } from './queryHelpers.js';

export async function readOne(table, select, joins, where, conn) {
    const elements = (await conn.query(`
        ${selectClause(select)}
        FROM ${table}
        ${joinClauses(joins)}
        ${whereClause(where)}
        LIMIT 1;
    `))[0];
    if(!elements.length) throw new Error('Not found');
    return elements[0];
}
