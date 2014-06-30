'use strict';
var mssql = require('mssql');
var O = require('../lib/o');

exports.define = function defineTransaction(Store) {

  function Transaction(config, connection) {
    Store.call(this, config);
    this.transaction = null;
    this.txref = 0;
    this.connection = connection;
  }
  O.inherits(Transaction, Store);

  Transaction.prototype.close = function() {
    if (this.transaction)  {
      //this.transaction.connection.close();
      this.transaction = null;
    } else {
      console.error('Transaction client is invalid.');
    }
  };

  Transaction.prototype.acquire = function(cb) {
    var self = this;
    if (!this.config) throw new Error('Dal.init has not been called.');

    this._ensureTransaction(function(err) {
      if (err) return cb(err);
      if (self.txref > 0) {
        //console.log('transaction request from tx');
        cb(null, new mssql.Request(self.transaction));
      } else {
        //console.log('transaction request global conn notx');
        cb(null, new mssql.Request());
      }
    });
  };

  Transaction.prototype._ensureTransaction = function(cb) {
    var self = this;
    if (!this.config) throw new Error('Dal.init has not been called.');
    if (self.transaction) return cb();

    if (this.connection) {
      self.transaction = new mssql.Transaction(self.txconnection);
      cb();
    } else {
      console.log('CREATING new connection transaction._ensureTransaction');
      self.txconnection = new mssql.Connection(this.config, function(err) {
        if (err) return cb(err);
        self.transaction = new mssql.Transaction(self.txconnection);
        cb();
      });
    }
  };

  Transaction.prototype.begin = function(cb) {
    var self = this;
    self._ensureTransaction(function(err) {
      if (err) return cb(err);
      self.txref += 1;
      self.transaction.begin(cb);
    });
  };

  Transaction.prototype.commit = function(cb) {
    this.txref -= 1;
    this.transaction.commit(cb);
  };

  Transaction.prototype.rollback = function(cb) {
    this.txref -= 1;
    this.transaction.rollback(cb);
  };

  return Transaction;
};
