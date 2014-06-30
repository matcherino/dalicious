'use strict';
var O = require('./o');
var async = require('async');
var _ = require('lodash');
var utils = require('./utils');

exports.define = function defineDal(Store) {
  var _store = new Store();

  /**
   * Data access layer with support for transactions.
   */
  var Dal = function(store) {
    if (!store) store = _store;
    this.store = store;
  };

  /**
   * Creates a DAL that can be transactioned.
   */

  Dal.prototype.transactable = function() {
    return new TransactableDal(this.store.transactable());
  };

  /**
   * Executes ad-hoc SQL.
   */
  Dal.prototype.sql = function(sql, args) {
    return this.store.sql(sql, args);
  };

  /**
   * Registers a model and dao.
   *
   * { name: 'Model name, base name', table: 'name of table', model: ModelClass}
   *
   * @remarks
   * If table is omitted then only a model is registered.
   * If model is omitted then only a dao is registerd.
   */
  Dal.registerModel = function(spec, cb) {
    var daoName = spec.table ? spec.name + 'Dao' : null;
    if (spec.daoName) daoName = spec.daoName;

    async.series([
      function(cb){
        if (daoName)
          Store.registerDao(daoName, spec.table, cb);
        else
          cb();
      },
      function(cb) {
        var ModelClass = spec.model;
        // user specified only DAO
        if (!ModelClass) return cb();
        Object.defineProperty(Dal.prototype, spec.name, {
          get: function() {
            return new ModelClass(this, {daoName: daoName});
          }
        });
        cb();
      }
    ], cb);
  };

  /**
   * Registers an array of models.
   */
  Dal.registerModels = function(arr, cb) {
    async.each(arr, Dal.registerModel, cb);
  };

  Dal.inherits = function(ctor, superCtor) {
    return O.inherits(ctor, superCtor);
  };


  var _models = [];

  /**
   * Adds a Model property on Dal prototype.
   */
  Dal.dal = function(name, opts) {
    opts = opts ? _.clone(opts) : {};
    opts.name = name;
    _models.push(opts);
  };

  /**
   * Adds a DAO property on the store prototype.
   */
  Dal.store = function(name, table) {
    _models.push({name: name, table: table, daoName: name});
  };

  /**
   * Adds models, which were registeredby `Dal.model`, to prototype.
   */
  Dal.dalify = function(cb) {
    if (_models.length < 1) return cb();
    return Dal.registerModels(_models, cb);
  };


  var TransactableDal = require('./transactableDal').define(Dal);
  return Dal;
};

exports.parseStringsFile = utils.parseStringsFile;

exports.Model = require('./model');
