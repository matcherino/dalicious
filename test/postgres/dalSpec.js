'use strict';
var _ = require('lodash');
var Postgres = require('../../dalicious-postgres');
var dalicious = require('../..');
var assert = require('assert');
var utils = require('../../lib/utils');
var npath = require('path');
var Sql = utils.parseStringsFile(npath.join(__dirname, 'strings.sql'));
var dal;
var async = require('async');
var config = require('../Configfile');

var Model = require('../../lib/model');

function Animal() {
  Model.apply(this, arguments);
}
Model.inherits(Animal);
Animal.prototype.foo = function() {
  return "bar";
};


describe('Postgres DAL', function() {

  before(function(done) {
    var Store = Postgres.define(config.postgres);
    var Dal = dalicious.define(Store);
    dal = new Dal();
    dal.sql(Sql.DAL_SPECS_UP).exec(function(err) {
      if (err) return done(err);
      Dal.dal('Animal', {table: 'animals', model: Animal});
      Dal.dal('Fruit', {table: 'fruits', daoName: 'FruitTable'});
      Dal.store('CustomDao', 'users');
      Dal.dalify(done);
    });
  });

  describe('Models', function() {
    it('should use model', function(done) {
      dal.Animal.findById(1, function(err, animal) {
        assert.ifError(err);
        assert.equal(animal.name, 'dog');
        done();
      });
    });

    it('should use sub method', function() {
      assert.equal(dal.Animal.foo(), 'bar');
    });

    it('should use custom Dao', function(done) {
      dal.store.CustomDao.query({where: {name: 'foo'}}).one(function(err, row) {
        assert.ifError(err);
        assert.equal(row.id, 1);
        done();
      });
    });
  });

  describe('Daos', function() {

    it('should use alternate name', function(done) {
      dal.store.FruitTable.findById(1, function(err, fruit) {
        assert.ifError(err);
        assert.equal(fruit.name, 'apple');
        done();
      });
    });

    it('should use dao on model', function(done) {
      dal.Animal.dao.findById(1, function(err, animal) {
        assert.ifError(err);
        assert.equal(animal.name, 'dog');
        done();
      });
    });
  });


  describe('Transactions', function() {
    it('should do transactions', function(done) {
      var id;
      var tx = dal.transactable();

      async.waterfall([
        function(cb) {
          tx.begin(cb);
        },
        function(_, __, cb) {
          tx.Animal.query({insert: {name: 'fido'}, returning: ['id']})
            .val(function(err, row) {
              if (err) return cb(err);
              cb(null, row);
            });
        },
        function(animalId, cb) {
          id = animalId;
          tx.Animal.findById(id, function(err, animal) {
            assert.ifError(err);
            assert.equal(animal.name, 'fido');
            cb();
          });
        },
        function(cb) {
          tx.rollback(cb);
        },
        function(cb) {
          tx.Animal.findById(id, function(err, animal) {
            assert.ifError(err);
            assert(!animal);
            cb();
          });
        }
      ], done);
    });
  });
});
