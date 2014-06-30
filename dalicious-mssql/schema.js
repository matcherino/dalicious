'use strict';

var mssql = require('mssql');
var utils = require('../lib/utils');
var npath = require('path');
var commands = utils.parseStringsFile(npath.join(__dirname, './commands.sql'));
var _ = require('lodash');
var fs = require('fs');

exports.loadSchema = function(config, cb) {
  mssql.connect(config, function(err) {
    if (err) return cb(err);
    var request = new mssql.Request();
    request.query(commands.schema, function(err, rows) {
      if (err) return cb(err);
      var prefix = rows[0].table_catalog;
      var schema = {
        _raw: _.groupBy(rows, 'table_name')
      };

      var name = npath.join(__dirname, '_' + prefix + '-schema.json');
      fs.writeFileSync(name, JSON.stringify(schema, null, 2), 'utf8');
      cb(null, schema);
    });
  });
};

var escapeValue = exports.escapeValue = function escapeValue(val) {
  if (val === undefined || val === null) {
    return 'NULL';
  }

  switch (typeof val) {
    case 'boolean': return (val) ? '1' : '0';
    case 'number': return val + '';
  }

  if (Array.isArray(val)) {
    var sanitized = val.map(function( v ) { return escapeValue(v); } );
    return sanitized.join(',');
  }

  if (typeof val === 'object') {
    val = (typeof val.toISOString === 'function')
      ? val.toISOString()
      : val.toString();
  }

  val = val.replace(/['\\\0\n\r\b\t\x1a]/g, function(s) {
    switch(s) {
      case '\x00': return '\\0';
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '\b': return '\\b';
      case '\t': return '\\t';
      case '\x1a': return '\\Z';
      case '\'': return '\'\'';
      default: return '\\' + s;
    }
  });

  return '\'' + val + '\'';
};

var escapeIdentifier = exports.escapeIdentifier = function escapeIdentifier(s) {
  return '[' + s + ']';
};

exports.getTableSchema = function(store, table, cb) {
  var result = {
    tableName: table,
    escapedTableName: escapeIdentifier(table),
    primaryKey: 'id',
    escapeIdentifier: escapeIdentifier,
    escapeValue: escapeValue,
    dialect: 'mssql',
    store: store
  };

  store.tsql(commands.getColumns, {table: table}).all(function(err, rows) {
    if (err) return cb(err);
    if (rows.length === 0) return cb('Could not get table schema. Check spelling: ' + table);
    result._dbSchema = rows;
    result.columns = _.pluck(rows, 'column_name');
    result.escapedColumns = {};
    result.columns.forEach(function(column) {
      result.escapedColumns[column] = escapeIdentifier(column);
    });
    cb(null, result);
  });
};

exports.getTypeByValue = function(val) {
  var type;
  switch (typeof val) {
    case 'string':
      type = mssql.NVarChar;
      break;
    case 'number':
      type = mssql.Int;
      break;
    case 'boolean':
      type = mssql.Bit;
      break;
    case 'object':
      if (val instanceof Buffer)
        type = mssql.VarBinary;
      else
        type = mssql.NVarChar;
      break;
    default:
      type = mssql.NVarChar;
  }
  return type;
};
