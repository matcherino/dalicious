'use strict';
var O = require('../lib/o');

exports.define = function defineTransaction(Connection) {
  // Transaction is a Client
  function Transaction() {
    Connection.apply(this, arguments);
    this.transaction = null;
    this.txref = 0;
  }
  O.inherits(Transaction, Connection);

  Transaction.prototype.close = function() {
    if (this.transaction)  {
      //console.log('closing transaction');
      if (this.txref > 0) console.log('Closing connection with outstanding transaction count:', this.txref);

      this.transactionClose();
      this.transaction = null;
    }
  };

  Transaction.prototype.acquire = function(cb) {
    var self = this;

    this._ensureTransaction(function(err) {
      if (err) return cb(err);
      if (self.txref > 0) {
        //console.log('transaction request tx connection');
        cb(null, self.transaction, self.transactionClose);
      } else {
        //console.log('transaction request global conn notx');
        Connection.prototype.acquire.call(self, cb);
      }
    });
  };

  Transaction.prototype._ensureTransaction = function(cb) {
    var self = this;
    if (self.transaction) return cb();

    Connection.prototype.acquire.call(this, function(err, client, close) {
      if (err) return cb(err);
      self.transaction = client;
      self.transactionClose = close;
      return cb();
    });
  };

  Transaction.prototype.begin = function(cb) {
    var self = this;
    self._ensureTransaction(function(err) {
      if (err) return cb(err);
      self.txref += 1;
      self.sql('BEGIN TRANSACTION').exec(cb);
    });
  };


  [
    {name: 'commit', sql: 'COMMIT TRANSACTION'},
    {name: 'rollback', sql: 'ROLLBACK TRANSACTION'}
  ].forEach(function(op) {
    var sql = op.sql;
    Transaction.prototype[op.name] = function(cb) {
      var self = this;
      self._ensureTransaction(function(err) {
        if (err) return cb(err);

        self.sql(sql).exec(function(err) {
          if (err) return cb(err);
          self.txref -= 1;
          if (self.txref === 0) {
            self.close();
          }
          cb();
        });
      });
    };
  });

  return Transaction;
};
