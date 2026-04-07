/**
 * Sequelize connection — reads from environment variables.
 *
 * Required .env variables:
 *   SQL_DIALECT   — mysql | mariadb | mssql | postgres | sqlite  (default: mysql)
 *   SQL_HOST      — database host
 *   SQL_PORT      — database port (mysql default: 3306 | mssql: 1433 | postgres: 5432)
 *   SQL_DATABASE  — database/schema name
 *   SQL_USER      — database user
 *   SQL_PASSWORD  — database password
 *   SQL_SSL       — "true" to enable SSL (required for most cloud providers)
 */

import { Sequelize } from 'sequelize';

const dialect  = process.env.SQL_DIALECT   || 'mysql';
const host     = process.env.SQL_HOST      || 'localhost';
const port     = parseInt(process.env.SQL_PORT || (dialect === 'mssql' ? '1433' : dialect === 'postgres' ? '5432' : '3306'), 10);
const database = process.env.SQL_DATABASE  || 'bootcamp_manager';
const username = process.env.SQL_USER      || 'root';
const password = process.env.SQL_PASSWORD  || '';
const ssl      = process.env.SQL_SSL === 'true';

// Dialect-specific SSL options
function getDialectOptions() {
    if (!ssl) return {};
    if (dialect === 'mssql') {
        return { options: { encrypt: true, trustServerCertificate: false } };
    }
    // mysql, mariadb, postgres
    return { ssl: { require: true, rejectUnauthorized: false } };
}

const sequelize = new Sequelize(database, username, password, {
    dialect,
    host,
    port,
    logging: false,
    dialectOptions: getDialectOptions(),
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

export default sequelize;
