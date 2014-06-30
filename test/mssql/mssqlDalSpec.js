'use strict';
var Mssql = require('../../dalicious-mssql');
var dalicious = require('../..');
var assert = require('assert');
var utils = require('../../lib/utils');
var npath = require('path');
var Sql = utils.parseStringsFile(npath.join(__dirname, 'commands.sql'));
var config = require('../Configfile');
var Model = dalicious.Model;

var Animal = function() {
  Model.apply(this, arguments);
};
Model.inherits(Animal);

var Fruit = function() {
  Model.apply(this, arguments);
};
Model.inherits(Fruit);


describe('DAL', function() {
  var dal, Dal, store, Store;

  before(function(done) {
    Store = Mssql.define(config.mssql);
    store = new Store();
    Dal = dalicious.define(Store);
    dal = new Dal();

    store.sql(Sql.DAL_SPECS_UP).exec(function(err) {
      if (err) return done(err);
      Dal.dal('Animal', {model: Animal, table: 'Animals'});
      Dal.dal('Fruit', {model: Fruit, table: 'Fruits', daoName: 'FruitTable'});
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

  describe('Low Level SQL', function() {
  });
});
