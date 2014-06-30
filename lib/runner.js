'use strict';
var Runner = function(exec) {
  this._exec = exec;
};


Runner.prototype.exec = function(cb) {
  return this._exec(cb);
};


Runner.prototype.all = function(cb) {
  // the mssql driver returns 3 parameters, which screws up async.waterfall
  // use exec if you want the 3rd parameter
  return this._exec(function(err, rows) {
    cb(err, rows);
  });
};

Runner.prototype.val = function(cb) {
  return this._exec(function(err, rows) {
    if (err) return cb(err);
    if (rows && rows.length > 0) {
      var row = rows[0];
      var prop = Object.keys(row)[0];
      cb(null, row[prop]);
    } else {
      cb(null, rows);
    }
  });
};

Runner.prototype.one = function(cb) {
  return this._exec(function(err, rows) {
    if (err) return cb(err);
    if (rows && rows.length > 0) {
      cb(null, rows[0]);
    } else {
      cb(null, null);
    }
  });
};

module.exports = Runner;
