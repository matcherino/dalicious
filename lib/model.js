'use strict';
var util = require('util');

function Model(dal, options) {
  // models are attached to DAL
  this.dal = dal;

  // daos are attached to the store of the DAL
  this.store = dal.store;

  // models may have a default dao which provides the helper functions
  // below
  this.dao = this.store[options.daoName];
}

Model.prototype.findById = function findById(id, cb) {
  this.dao.findById(id, cb);
};

Model.prototype.findOne = function findOne(criteria, cb) {
  this.dao.findOne(criteria, cb);
};

Model.prototype.find = function find(criteria, cb) {
  return this.dao.find(criteria, cb);
};

Model.prototype.query = function query(criteria, cb) {
  return this.dao.query(criteria, cb);
};

Model.inherits = function(Super) {
  util.inherits(Super, Model);
};

module.exports = Model;
