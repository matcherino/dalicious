'use strict';
var utils = require('../lib/utils');
var fp = require('path');
var commands = utils.parseStringsFile(fp.join(__dirname, 'commands.sql'));
var _ = require('lodash');

var Schema = {};

Schema.getTableSchema = function(store, table, cb) {
  var result = {
    tableName: table,
    escapedTableName: Schema.escapeIdentifier(table),
    primaryKey: 'id',
    dialect: 'postgres',
    store: store,
    escapeIdentifier: Schema.escapeIdentifier,
    escapeValue: Schema.escapeValue
  };

  store.sql(commands.getTableColumns, [store.config.database, table]).all(function(err, rows) {
    if (err) return cb(err);
    if (rows.length === 0) return cb('Could not get table schema. Check spelling: ' + table);
    result._dbSchema = rows;
    result.columns = _.pluck(rows, 'column_name');
    result.escapedColumns = {};
    result.columns.forEach(function(column) {
      result.escapedColumns[column] = Schema.escapeIdentifier(column);
    });
    //console.log('SCHEMA', JSON.stringify(result, null, 2));
    cb(null, result);
  });
};

Schema.escapeIdentifier = function (s) {
  return '"' + s + '"';
};

Schema.escapeValue = function (val) {
  if (val === undefined || val === null) {
    return 'NULL';
  }

  switch (typeof val) {
    case 'boolean': return (val) ? 'true' : 'false';
    case 'number': return val + '';
  }

  if (Array.isArray(val)) {
    var sanitized = val.map(function( v ) { return Schema.escapeValue(v); } );
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


module.exports = Schema;
