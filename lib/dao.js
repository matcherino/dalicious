'use strict';
/**
 * Common Model functionality goes here.
 */

var ObjectSqlBuilder = require('./objectSqlBuilder');
var _ = require('lodash');


function Dao(builder, schema) {
  this.builder = builder;
  this.schema = schema;
}

Dao.createBuilder = function(tableSchema, cb) {
  var options = {schema: tableSchema};
  // Runner expects a builder function(client, sql, args). Object builder
  // only needs criteria objec
  var builder = function(client, criteria) {
    var qb = new ObjectSqlBuilder(options);
    return qb.build(criteria);
  };

  cb(null, builder);
};


Dao.prototype.findById = function findById(id, cb) {
  return this.builder({where: {id: id}}).one(cb);
};


/**
 * Builds a query.
 *
 * @param criteria
 * @returns {Runner} Caller must invoke a runner method to get results.
 */
Dao.prototype.query = function query(criteria) {
  return this.builder(criteria);
};

Dao.prototype.q = function q(criteria) {
  return this.builder(criteria);
};

Dao.prototype.find = function find(criteria, cb) {
  return this.builder(criteria).all(cb);
};

Dao.prototype.findOne = function findOne(criteria, cb) {
  return this.builder(criteria).one(cb);
};

Dao.prototype.upsert = function save(obj, cb) {
  var id = obj.id;
  if (typeof id === 'undefined') {
    return this.builder({insert: obj}).val(cb);
  } else {
    var criteria = {
      update: _.omit(obj, 'id'),
      where: {id: id}
    };
    return this.builder(criteria).one(cb);
  }
};

module.exports = Dao;
