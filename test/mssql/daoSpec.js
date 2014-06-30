'use strict';
var Mssql = require('../../dalicious-mssql');
var assert = require('assert');
var async = require('async');
var config = require('../Configfile');

describe('DAO', function() {
  var store, Store;

  before(function(done) {
    Store = Mssql.define(config.mssql);
    store = new Store();
    var sql = [
      "if object_id('daospecs', 'U') is not null drop table [daospecs];",
      "GO",
      "create table daospecs (id int identity primary key, title varchar(255) null, description varchar(244) null);",
      "insert into daospecs (title, description) values ('foo', 'A foo'), ('bar', 'A bar');"
    ].join('\n');
    store.sql(sql).exec(function(err) {
      assert.ifError(err);
      Store.registerDaos({ Dao: 'daospecs'}, done);
    });
  });

  describe('as part of store', function() {

    it('should attach', function(done) {
      store.Dao.query({
        where: {title: 'foo'}
      }).one(function(err, row) {
        assert.ifError(err);
        assert.equal(row.description, 'A foo');
        done();
      });
    });

    it('should work in transaction', function(done) {
      var tx = store.transactable();
      async.waterfall([
        function(cb) { tx.begin(cb); },
        function(cb) {
          tx.Dao.query({where: {title: 'foo'}}).one(cb);
        },
        function(row, cb) {
          assert.equal(row.title, 'foo');
          tx.commit(cb);
        }
      ], function(err) {
        assert.ifError(err);
        done();
      });
    });

    it('should throw an error if table does not exist', function(done) {
      Store.registerDao('foo', 'unknow_table', function(err){
        if (err) done();
      });
    });

  });
});
