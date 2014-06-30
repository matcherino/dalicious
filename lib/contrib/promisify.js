'use strict';
var Promise = require('bluebird');
var Dal = require('../dal');
var TransactableDal = require('../transactableDal');
var Dao = require('../dao');
var Runner = require('../runner');

function promisify(obj, names) {
  Promise.promisifyAll(obj, {
    // name = the property name to be promisified without suffix
    // func = the function
    // target = the target object where the promisified func will be put with name + suffix
    // return boolean
    filter: function(name /*, func, target*/) {
      return names.indexOf(name) >= 0;
    }
  });
}

promisify(Dal, ['registerModel', 'registerModels']);
promisify(TransactableDal, ['registerModel', 'registerModels']);
promisify(Runner.prototype, ['exec', 'one', 'val', 'all']);
Promise.promisifyAll(Dao.prototype);
