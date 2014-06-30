module.exports = {
  mssql: require('./mssql/config.json').development.mssql,
  postgres: require('./postgres/config.json').development.postgresql
};
