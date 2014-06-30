'use strict';
var _ = require('lodash');
var Mssql = require('../../dalicious-mssql/index');
var assert = require('assert');
var fs = require('fs');
var npath = require('path');
var mssql = require('mssql');
var config = require('../Configfile');

describe('MSSQL DAL', function() {
  var store, Store;

  before(function(done) {
    Store = Mssql.define(config.mssql);
    store = new Store();
    var cmd =
      "if object_id('mssqlSpec', 'U') is not null drop table [mssqlSpec];" +
      "create table mssqlSpec(id int identity primary key, title varchar(255) null, pic varbinary(max) null);" +
      "insert into mssqlSpec (title) values ('foo'), ('bar');";
    store.sql(cmd).exec(done);
  });

  describe('positional queries', function() {
    it('should query with args', function(done) {
      store
        .sql('select * from information_schema.columns where table_name = $1', ['mssqlSpec'])
        .all(function(err, rows) {
          assert.ifError(err);
          assert(_.find(rows, {COLUMN_NAME: 'title'}));
          done();
        });
    });

    it('should query no args', function(done) {
      store
        .sql('select * from information_schema.columns')
        .all(function(err, rows) {
          assert.ifError(err);
          if (err) console.error(err);
          assert(rows.length > 0);
          done();
        });
    });

    it('should set binary fields with prepared statement', function(done) {
      var image = fs.readFileSync(npath.join(__dirname, '../resource/blank.gif'));
      store.acquireEx('PreparedStatement', function(err, ps) {
        assert.ifError(err);
        ps.input('pic', Store.driver.VarBinary);
        ps.prepare('insert into mssqlspec (pic) values (@pic)', function(err) {
          assert.ifError(err);
          ps.execute({pic: image}, function(err) {
            assert.ifError(err);
            ps.unprepare(function(err) {
              assert.ifError(err);
              store.sql('select pic from mssqlspec where pic is not null').one(function(err, row) {
                assert.ifError(err);
                assert.deepEqual(image, row.pic);
                done();
              });
            });
          });
        });
      });
    });

    it('should set binary field', function(done) {
      var image = fs.readFileSync(npath.join(__dirname, '../resource/blank.gif'));
      store.acquire(function(err, request /*, close */) {
        assert.ifError(err);
        request.input('pic', Store.driver.VarBinary, image);
        request.query('insert into mssqlspec (pic) values (@pic)', function(err) {
          assert.ifError(err);
          store.sql('select pic from mssqlspec where pic is not null').one(function(err, row) {
            assert.ifError(err);
            assert.deepEqual(image, row.pic);
            done();
          });
        });
      });
    });
  });


  describe('context queries', function() {
    it('should query with input values', function(done) {
      store.tsql('select * from mssqlspec where title = @name', {name: 'foo'}).all(function(err, rows) {
        assert.ifError(err);
        assert.equal(rows[0].title, 'foo');
        done();
      });
    });

    it('should use output parameters', function(done) {
      store
        .tsql('select @name = title from mssqlspec where title = @title',
          {title: 'foo', 'name OUT': [mssql.NVarChar]})
        .exec(function(err, rows, params) {
          assert.ifError(err);
          assert.equal(params.name.value, 'foo');
          done();
        });
    });


    it('should set binary field', function(done) {
      var image = fs.readFileSync(npath.join(__dirname, '../resource/blank.gif'));
      store.tsql('insert into mssqlspec (pic) values (@pic)', {pic: [mssql.VarBinary, image]}).exec(function(err) {
        assert.ifError(err);
        store.sql('select pic from mssqlspec where pic is not null').one(function (err, row) {
          assert.ifError(err);
          assert.deepEqual(image, row.pic);
          done();
        });
      });
    });
  });

  describe('operations', function() {
    it('should find first item', function(done) {
      store.sql('select * from mssqlSpec where title = $1', ['foo']).one(function(err, row) {
        assert.ifError(err);
        assert.equal(row.title, 'foo');
        done();
      });
    });

    it('should find multiple items', function(done) {
      store.sql('select * from mssqlSpec where title = $1', ['foo']).all(function(err, rows) {
        assert.ifError(err);
        assert.equal(rows[0].title, 'foo');
        done();
      });
    });

    it('should get a scalar value', function(done) {
      store.sql('select count(*) from mssqlSpec').val(function(err, val) {
        assert.ifError(err);
        assert(val >= 2);
        done();
      });
    });
    // queryAt('select * from tables where foo = @foo', {foo: 'b12123', bar: 'asdfasdf'})
  });

  describe('transactions', function() {
    it('should create transactions', function(done) {
      var tx = store.transactable();
      tx.begin(function(err) {
        assert.ifError(err);
        tx.sql("insert into mssqlspec (title) values ('sct1'), ('sct2')").exec(function(err) {
          assert.ifError(err);
          tx.sql("select * from mssqlspec where title = $1" , ['sct1']).one(function(err, r) {
            assert.ifError(err);
            assert(r.title = 'sct1');
            tx.rollback(function(err) {
              assert.ifError(err);
              tx.sql("select * from mssqlspec where title = $1" , ['sct1']).one(function(err, r) {
                assert.ifError(err);
                assert.equal(r, null);
                tx.close();
                done();
              });
            });
          });
        });
      });
    });
  });


  describe('inserts', function() {
    it('should get id after insert', function(done) {
      var sql =
        "INSERT INTO mssqlspec (title) " +
        "OUTPUT Inserted.ID, Inserted.title " +
        "VALUES(@id); ";
      store.tsql(sql, {id: 'getidafterinsert'}).val(function(err, id) {
        assert.ifError(err);
        assert(id > 0);
        done();
      });
    });

    it('should get row id after insert', function(done) {
      var sql =
        "INSERT INTO [mssqlspec] ([title]) " +
        "OUTPUT Inserted.[id], Inserted.[title] " +
        "VALUES (@id); ";
      store.tsql(sql, {id: 'getidafterinsertrow'}).one(function(err, row) {
        assert.ifError(err);
        assert(row.id > 0);
        done();
      });
    });
  });

});
