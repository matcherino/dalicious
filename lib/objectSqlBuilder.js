'use strict';

var _ = require('lodash');

function QueryBuilder(options) {
  this.schema = options.schema;
  this.dialect = options.schema.dialect;
  this.escapedTableName = this.schema.escapedTableName;
  this.strict = options.strict;
  this.buffer = [];
  return this;
}

QueryBuilder.prototype.build = function(obj) {
  if (_.isEmpty(obj)) return this.select().toSql();

  // must be array or string
  if (typeof obj.select !== 'undefined') {
    this.select(obj.select);

  // must be object
  } else if (typeof obj.insert !== 'undefined') {
    this.insert(obj.insert);
    //this.insert.apply(this, [obj.insert]);

  // must be object
  } else if (typeof obj.update !== 'undefined') {
    this.update(obj.update);

  // must be object
  } else if (typeof obj.delete !== 'undefined') {
    this.delete(obj.delete);

  } else if (typeof obj.where !== 'undefined') {
    this.select(obj.where);
  }

  if (typeof obj.returning !== 'undefined') this.returning(obj.returning);
  if (typeof obj.where !== 'undefined') this.where(obj.where);
  if (typeof obj.offset !== 'undefined') this.offset(obj.offset);
  if (typeof obj.limit !== 'undefined') this.limit(obj.limit);
  if (typeof obj.order !== 'undefined') this.order(obj.order);
  if (typeof obj.page !== 'undefined') this.page(obj.page);

  return this.toSql();
};

/**
 * Delete an item with a `where` clause.
 *
 * @example
 * Delete with a where clause
 *  q({
 *    delete: {id: id}
 *  });
 *
 * Delete all
 *  q({
 *    delete: '*'
 *  });
 *
 */
QueryBuilder.prototype.delete = function(where) {
  this.type = QueryType.DELETE;
  var buffer = this.buffer;
  buffer[FROM] = this.escapedTableName;

  if (where === '*') return this;
  return this.where(where);
};


/**
 * Select fields to be retrieved.
 *
 * @param {string|array} [clause]  List of fields.
 *
 * @example
 * Single field
 *
 *  q({
 *    select: 'id',
 *    where: {id: id}
 *  });
 *
 * Multiple fields
 *
 *  q({
 *    select: ['id', 'name'],
 *    where: {id: id}
 *  });
 *
 * All fields
 *
 *  q({
 *    where: {id: id}
 *  });
 */
QueryBuilder.prototype.select = function(clause) {
  var buffer = this.buffer;
  this.type = QueryType.SELECT;

  if (!clause) {
    buffer[SELECT] = '*';
  } else if (typeof clause === 'string') {
    buffer[SELECT] = clause;
  } else {
    var fields = this.validFieldsInArray(clause);
    if (fields.length === 0)
      buffer[SELECT] = '*';
    else
      buffer[SELECT] = this.csv(fields, ',');
  }

  this.buffer[FROM] = this.escapedTableName;
  return this;
};

/**
 * Returns fields on insert.
 *
 * @example
 *
 * q.({
 *   insert: {name: 'foo'},
 *   returning: 'id'
 * });
 */
QueryBuilder.prototype.returning = function(any) {
  if (typeof any === 'string') {
    this.buffer[RETURNING] = any;
  } else if (Array.isArray(any)) {
    this.buffer[RETURNING] = this.csv(any, ', ');
  }
  return this;
};

QueryBuilder.prototype.csv = function(fields, separator) {
  var schema = this.schema;
  var escapedColumns = schema.escapedColumns;
  var result = '';
  var i, L, name;

  for (i = 0, L = fields.length; i < L; i++) {
    if (i > 0) result += separator;
    name = fields[i];
    result += escapedColumns[name];
  }
  return result;
};


/**
 * Starts an UPDATE statement.
 *
 * @example
 * dao.update({
 *   update: {foo: 'bar'}
 * });
 */
QueryBuilder.prototype.update = function(any) {
  this.type = QueryType.UPDATE;
  this.buffer[UPDATE] = this.escapedTableName;
  return this._set(any);
};


QueryBuilder.prototype.reset = function() {
  delete this.buffer;
  this.buffer = [];
  return this;
};

QueryBuilder.prototype.set = function() {
  throw new Error('set has been deprecated, use `update` with an object')
};

QueryBuilder.prototype._set = function(props) {
  var sql = '';

  // must be object
  var field, fields = this.validFields(props);
  var i = fields.length;

  var first = true;
  var escapeIdentifier = this.schema.escapeIdentifier;
  while (i--) {
    field = fields[i];
    if (!first) sql += ', ';
    sql += escapeIdentifier(field) + ' = ' + this.schema.escapeValue(props[field]);
    if (first) first = false;
  }

  this.buffer[SET] = sql;
  return this;
};


/**
 * @example
 * q.where({foo: 'af'});
 */
QueryBuilder.prototype.where = function(any) {
  var that = this;

  var pred = _(any)
    .map(function(value, key) {
      var keyop = extractKeyOperator(key);
      key = keyop[0];
      var operator = keyop[1];
      var expression = that.buildExpression(key, operator, value);
      if (_.includes(that.schema.columns, key)) {
        return expression;
      } else if (that.strict) {
        throw new Error('STRICT: Invalid column ' + key);
      }
    })
    .compact()
    .join(' AND ');

  if (!pred)
    throw new Error('Invalid fields or empty WHERE clause', arguments);
  else
    this.buffer[WHERE] = pred;

  return this;
};


/**
 * @example
 * insert({ field: 'value', foo: 'bar' });
 */
QueryBuilder.prototype.insert = function(any) {
  var sqlInsert, sqlValues, fields, vals;

  if (Array.isArray(any)) {
    fields = this.validFields(any[0]);
    vals = '';
    var i, len, obj;

    for (i = 0, len = any.length; i < len; i++) {
      obj = any[i];
      if (i > 0)
        vals += ', ';
      vals += '(' + this.escapeCsvObjectValues(obj, fields) + ')';
    }
    sqlInsert = '(' + this.csv(fields, ', ') + ')';
    sqlValues =  vals;

  } else if (_.isObject(any)) {
    fields = this.validFields(any);
    vals = this.escapeCsvObjectValues(any, fields);
    sqlInsert = '(' + this.csv(fields, ', ') + ')';
    sqlValues = '(' + vals + ')';

  } else {
    throw new Error('Insert must be an object or [object]')
  }

  this.type = QueryType.INSERT;
  this.buffer = [this.escapedTableName + sqlInsert];
  this.buffer[VALUES] = sqlValues;
  var schema = this.schema;
  this.buffer[RETURNING] = schema.escapedColumns[schema.primaryKey];
  return this;
};


QueryBuilder.prototype.offset = function(num) {
  this.buffer[OFFSET] = num;
  return this;
};

QueryBuilder.prototype.limit = function(num) {
  this.buffer[LIMIT] = num;
  return this;
};

QueryBuilder.prototype.order = function(clause) {
  this.buffer[ORDER] = clause;
  return this;
};

QueryBuilder.prototype.page = function(pageOffset, rowsPerPage) {
  var buffer = this.buffer;
  if (!buffer[SELECT]) this.select();

  if (Array.isArray(pageOffset)) {
    rowsPerPage = pageOffset[1];
    pageOffset = pageOffset[0];
  }

  // different between pg and mysql
  buffer[LIMIT] = rowsPerPage;
  buffer[OFFSET] = pageOffset * rowsPerPage;
  return this;
};


/**
 * Peeks at the SQL.
 *
 * `#toSql` resets the state.
 */
QueryBuilder.prototype.peekSql = function(modify) {
  var type = this.type;
  var buffer = modify ? this.buffer : this.buffer.concat();

  if (type === QueryType.SQL) return buffer.toString();

  switch (type) {
    case QueryType.DELETE:
      buffer[DELETE] = 'DELETE';
      break;
    case QueryType.SELECT:
      buffer[SELECT] = 'SELECT ' + buffer[SELECT];
      break;
    case QueryType.UPDATE:
      buffer[UPDATE] = 'UPDATE ' + buffer[UPDATE];
      var bufferSET = buffer[SET];
      if (bufferSET) buffer[SET] = 'SET ' + bufferSET;
      break;
    case QueryType.INSERT:
      buffer[INSERT] = 'INSERT INTO ' + buffer[INSERT];
      var bufferVALUES = buffer[VALUES];
      if (bufferVALUES) buffer[VALUES] = 'VALUES ' + bufferVALUES;
      break;
  }

  var bufferFROM = buffer[FROM];
  if (bufferFROM) buffer[FROM] = 'FROM ' + bufferFROM;

  var bufferWHERE = buffer[WHERE];
  if (bufferWHERE) buffer[WHERE] = 'WHERE ' + bufferWHERE;

  var bufferORDER = buffer[ORDER];
  if (bufferORDER) buffer[ORDER] = 'ORDER BY ' + bufferORDER;

  var bufferLIMIT = buffer[LIMIT];
  if (bufferLIMIT) buffer[LIMIT] = 'LIMIT ' + bufferLIMIT;

  var bufferOffset = buffer[OFFSET];
  if (bufferOffset)
    buffer[OFFSET] = 'OFFSET ' + bufferOffset;
  else
    buffer[OFFSET] = '';

  var bufferReturning = buffer[RETURNING];
  if (bufferReturning) {
    if (this.dialect === 'mssql') {
      buffer[RETURNING] = '';
      buffer[INSERT + 1]  = 'OUTPUT inserted.' + bufferReturning.split(', ').join(', inserted.');
    }
    else {
      buffer[RETURNING] = 'RETURNING ' + bufferReturning;
    }
  }

  var i, L, s, sql = '';
  for (i = 0, L = buffer.length; i < L; i++) {
    s = buffer[i];
    if (s) sql += ' ' + s;
  }
  sql += ';';
  return sql;
};

QueryBuilder.prototype.toSql = function() {
  //console.log(this.escapedTableName + ':schema', JSON.stringify(this.schema, null, 2));

  var buffer = this.buffer,
    type = this.type;

  if (this.strict) {
    if (type === QueryType.UPDATE && !buffer[WHERE])
      throw new Error('STRICT: WHERE clause missing for UPDATE operation');
    if (type === QueryType.DELETE && !buffer[WHERE])
      throw new Error('STRICT: WHERE clause missing for DELETE operation');
  }

  var result = this.peekSql(true);
  // reset everything to default
  this.reset();
  return result;
};

/**
 * Builds an expression from a key and value.
 *
 * Keys may take form of identifier and operator: { 'name <': 'foo', 'age not in': [3, 4] }
 */
QueryBuilder.prototype.buildExpression = function(column, operator, value) {
  if (Array.isArray(value)) {
    value = '(' + this.schema.escapeValue(value) + ')';
    if (!operator) operator = ' IN ';

  } else {
    if (value === undefined || value === null) {
      operator = ' IS ';
      value = 'NULL';
    } else {
      value = this.schema.escapeValue(value);
    }
    if (!operator) operator = ' = ';
  }

  return this.schema.escapeIdentifier(column) + operator + value;
};


QueryBuilder.prototype.escapeCsvObjectValues = function escapeCsvObjectValues(obj, keys) {
  if (!keys) keys = Object.keys(obj);

  var schema = this.schema;
  var i, item, len, result = '';
  for (i = 0, len = keys.length; i < len; i++) {
    item = obj[keys[i]];
    if (i > 0) result += ', ';
    result += schema.escapeValue(item);
  }
  return result;
};


/**
 * Private Methods
 */
function extractKeyOperator(key) {
  var operator = false, space = key.indexOf(' ');

  if (space > 0) {
    operator = key.slice(space) + ' ';
    key = key.slice(0, space);
  }

  return [key, operator];
}


QueryBuilder.prototype.validFields = function(obj) {
  var columns = this.schema.columns, key, keys = [], strict = this.strict;
  for (key in obj) {
    if (obj.hasOwnProperty(key) && columns.indexOf(key) > -1) {
      keys.push(key);
    } else if (strict) {
      throw new Error('STRICT: Invalid column ' + key);
    }
  }
  return keys;
};


QueryBuilder.prototype.validFieldsInArray = function(arr) {
  var i, len = arr.length, field, fields = [], columns = this.schema.columns;
  for (i = 0; i < len; i++) {
    field = arr[i];
    if (columns.indexOf(field) > -1)
      fields.push(field);
  }
  return fields;
};


/**
 * Enumerations
 */

var
  UPDATE = 0,
  SET = 1,
  FROM = 2,
  WHERE = 3,

  DELETE = 0,
//FROM = 2,
//WHERE = 3,

  SELECT = 0,
//FROM = 2,
//WHERE = 3,
  ORDER = 4,
  LIMIT = 5,
  OFFSET = 6,

  INSERT = 0,
  VALUES = 8,
  RETURNING = 9;

QueryBuilder.Index = {
  DELETE: DELETE,
  FROM: FROM,
  WHERE: WHERE,

  SELECT: SELECT,
  //FROM: 1,
  //WHERE: 2,
  ORDER: ORDER,
  LIMIT: LIMIT,
  OFFSET: OFFSET,

  UPDATE: UPDATE,
  SET: SET,

  INSERT: INSERT,
  VALUES: VALUES,
  RETURNING: RETURNING

  //WHERE: ,
};

var QueryType = QueryBuilder.QueryType = {
  SELECT: 0,
  DELETE: 1,
  UPDATE: 2,
  INSERT: 3,
  SQL: 4
};

module.exports = QueryBuilder;
