'use strict';

exports.define = function(Dal) {
  var TransactableDal = function(store) {
    store.transactable = true;
    Dal.call(this, store);
  };
  Dal.inherits(TransactableDal, Dal);

  TransactableDal.prototype.begin = function() {
    return this.store.begin.apply(this.store, arguments);
  };
  TransactableDal.prototype.commit = function() {
    return this.store.commit.apply(this.store, arguments);
  };
  TransactableDal.prototype.rollback = function() {
    return this.store.rollback.apply(this.store, arguments);
  };

  return TransactableDal;
};
