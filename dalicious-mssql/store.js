'use strict';
var mssql = require('mssql');
var Runner = require('../lib/runner');
var async = require('async');
var Schema = require('./schema');
var ordinalSqlBuilder = require('../lib/ordinalSqlBuilder');

var logError = function(err) {
  if (err) console.error(err.stack ? err.stack : err);
};


exports.define = function defineMssqlStore(options) {
  var Dao = options.Dao || require('../lib/dao');
  var globalConnection;

  /**
   *
   * @param client
   * @constructor
   */
  function Store(config) {
    this.useGlobal = !config;
    if (!config) config = options;
    this.config = config;
    var batchSeparator = config.batchSeparator;
    this.batchSeparator = batchSeparator;
    if (batchSeparator &&  typeof batchSeparator === 'string') {
      this.batchSeparator = new RegExp('^' + batchSeparator, 'gim');
    }
    this.verbose = config.verbose;
  }

  /**
   * Acquire a client.
   */
  Store.prototype.acquire = function(cb) {
    var self = this;
    var useGlobal = this.useGlobal;

    if (self.connection) {
      cb(null, new mssql.Request(useGlobal ? null : self.connection));
    } else {
      if (useGlobal) {
        if (globalConnection) {
          self.connection = globalConnection;
          cb(null, new mssql.Request(null));
        } else {
          if (self.verbose) console.log('CREATING new connection store.acquire global');
          globalConnection = self.connection = mssql.connect(self.config, function(err) {
            if (err) return cb(err);
            cb(null, new mssql.Request(null));
          });
        }
      } else {
        if (self.verbose) console.log('CREATING new connection store.acquire non-global');
        self.connection = mssql.connect(self.config, function(err) {
          if (err) return cb(err);
          cb(null, new mssql.Request(self.connection));
        });
      }
    }
  };

  /**
   * In the MSSql lib, other resources need to be acuiqred.
   */
  Store.prototype.acquireEx = function(Type, cb) {
    var self = this;
    var useGlobal = this.useGlobal;
    if (self.connection) {
      cb(null, new mssql[Type](useGlobal ? null : self.connection));
    } else {
      if (useGlobal) {
        if (globalConnection) {
          self.connection = globalConnection;
          cb(null, new mssql[Type](null));
        } else {
          if (self.verbose) console.log('CREATING new connection store.acquireEx global');
          globalConnection = self.connection = mssql.connect(self.config, function(err) {
            if (err) return cb(err);
            cb(null, new mssql[Type](null));
          });
        }
      } else {
        if (self.verbose) console.log('CREATING new connection store.acquireEx non-global');
        self.connection = mssql.connect(self.config, function(err) {
          if (err) return cb(err);
          cb(null, new mssql[Type](self.connection));
        });
      }
    }
  };

  var transaction = require('./transaction');
  var Transaction = transaction.define(Store);

  /**
   *
   * @returns {Transaction}
   */
  Store.prototype.transactable = function(config) {
    var useGlobal = !config;
    if (useGlobal) config = this.config;
    return new Transaction(config, useGlobal ? globalConnection : null);
  };

  Store.createRunner = function(builder) {
    return function (sql, args) {
      var self = this;
      var batchSeparator = this.batchSeparator;

      return new Runner(function (cb) {
        if (!cb) cb = logError;
        self.acquire(function (err, request) {
          if (err) return cb(err);
          request.verbose = self.verbose;
          sql = builder(request, sql, args);

          var isArray = Array.isArray(sql);
          if (typeof batchSeparator !== 'undefined') {
            sql = sql.split(batchSeparator);
            isArray = true;
          }
          if (isArray && sql.length === 1) {
            sql = sql[0];
            isArray = false;
          }

          function runSql(sql, cb) {
            sql = sql.trim();
            if (sql.length < 1) return cb();
            if (self.verbose) console.log('SQL => ', sql);
            request.query(sql, function () {
              var args = [].slice.call(arguments, 0);
              args.push(request.parameters);
              cb.apply(null, args);
            });
          }

          function done() {
            cb.apply(null, arguments);
          }

          if (isArray) {
            async.mapSeries(sql, function (s, cb) {
              runSql(s, cb);
            }, done);
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

  Store.prototype.driver = mssql;
  Store.driver = mssql;

  Store.registerBuilder('sql', ordinalSqlBuilder(Schema));
  Store.registerBuilder('tsql', require('./tsqlSqlBuilder'));

  Store.registerDaos = function(nameTableMap, done) {
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
              var dao = new Dao(runner, schema);
              this[instanceName] = dao;
            }
            return this[instanceName];
          }
        });
        cb();
      });
    });
  };

  return Store;
};
