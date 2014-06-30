'use strict';
var pg = require('pg.js');
var Runner = require('../lib/runner');
var async = require('async');
var Schema = require('./schema');
var ordinalSqlBuilder = require('../lib/ordinalSqlBuilder');
var utils = require('../lib/utils');

var logError = function(err) {
  if (err) console.error(err.stack ? err.stack : err);
};

// Create a database specific Store.
//
// This needs to be a new constructor to attach database specific
// table Data Access Object (DAO).
exports.define = function defineStore(config) {
  var _connectionString = utils.buildConnectionString(config);
  var _batchSeparator = config.batchSeparator;
  if (_batchSeparator &&  typeof _batchSeparator === 'string') {
    _batchSeparator = new RegExp('^' + _batchSeparator, 'gim');
  }
  var _verbose = config.verbose;
  var Dao = config.Dao || require('../lib/dao');

  function Store() {
    this.config = config;
  }

  var transaction = require('./transaction');
  var Transaction = transaction.define(Store);

  /**
   * Acquire a client.
   */
  Store.prototype.acquire = function(cb) {
    pg.connect(_connectionString, cb);
  };

  /**
   *
   * @returns {Transaction}
   */
  Store.prototype.transactable = function(conf) {
    if (!conf) conf = config;
    return new Transaction(conf);
  };

  Store.createRunner = function(builder) {
    return function (sql, args) {
      var self = this;
      var batchSeparator = _batchSeparator;

      return new Runner(function (cb) {
        if (!cb) cb = logError;
        self.acquire(function (err, client, close) {
          if (err) return cb(err);
          sql = builder(client, sql, args);

          var isArray = Array.isArray(sql);
          if (typeof batchSeparator !== 'undefined') {
            sql = sql.split(_batchSeparator);
            isArray = true;
          }
          if (isArray && sql.length === 1) {
            sql = sql[0];
            isArray = false;
          }

          function runSql(sql, cb) {
            sql = sql.trim();
            if (sql.length < 1) return cb();
            if (_verbose) console.log('SQL => ', sql);
            client.query(sql, function(err, res) {
              // TODO requires multiple to work with spread
              cb(err, res ? res.rows : res, res);
            });
          }

          function done() {
            close();
            cb.apply(null, arguments);
          }

          if (isArray) {
            async.mapSeries(sql, runSql, done);
          } else {
            runSql(sql, done);
          }
        });
      });
    };
  };

  /**
   * Registers a SQL builder
   */
  Store.registerBuilder = function(name, builder) {
    Store.prototype[name] = Store.createRunner(builder);
  };

  Store.registerBuilder('sql', ordinalSqlBuilder(Schema));

  Store.prototype.registerDaos = function(nameTableMap, done) {
    var daos = Object.keys(nameTableMap);
    async.each(daos, function(name, cb) {
      var tableName = nameTableMap[name];
      Store.registerDao(name, tableName, cb);
    }, done);
  };


  var store = new Store();
  Store.registerDao = function(name, tableName, cb) {
    Schema.getTableSchema(store, tableName, function(err, schema) {
      if (err) return cb(err);

      Dao.createBuilder(schema, function(err, builder) {
        if (err) return cb(err);

        var instanceName = '__dao__' + name;
        Object.defineProperty(Store.prototype, name, {
          get: function() {
            if (!this[instanceName]) {
              // runner must run under the context of the store instance
              var runner = Store.createRunner(builder).bind(this);
              this[instanceName] = new Dao(runner);
            }
            return this[instanceName];
          }
        });
        cb();
      });
    });
  };


  Store.prototype.driver = pg;
  Store.driver = pg;

  return Store;
};
