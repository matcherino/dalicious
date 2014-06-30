'use strict';
/**
 * Module dependencies.
 */
var assert = require('chai').assert;
var _ = require('lodash');
var str = require('underscore.string');
var QueryBuilder = require('../../lib/objectSqlBuilder');
var slice = [].slice;
var Schema = require('../../dalicious-mssql/schema');

/**
 * Schema stub.
 */
var schema = {
  "tableName": "model_name",
  "escapedTableName": "[model_name]",
  "primaryKey": "index",
  "dialect": "mssql",
  "store": {
    "config": {
      "host": "localhost",
      "database": "test_development",
      "user": "test",
      "password": "development",
      "port": 5432,
      "verbose": false
    }
  },
  "columns": [
    "index",
    "name",
    "email",
    "age",
    "field"
  ],
  "escapedColumns": {
    "index": "[index]",
    "name": "[name]",
    "email": "[email]",
    "age": "[age]",
    "field": "[field]"
  }
};
schema.escapeValue = Schema.escapeValue;
schema.escapeIdentifier = Schema.escapeIdentifier;

// whitespace doesn't matter to sql but it's easier to write unit test
// if spaces are normalized
var oldEqual = assert.equal;
assert.equal = function() {
  var args = slice.call(arguments);
  var actual = args[0];
  if (_.isString(actual)) {
    actual = str.clean(actual);
    args[0] = actual;
  }
  oldEqual.apply(assert, args);
};

var qb = new QueryBuilder({schema: schema});
var strictQb = new QueryBuilder({schema: schema, strict: true});


describe("QueryBuilderObject", function() {

  describe("Delete", function() {
    it('deletes all rows by default', function() {
      assert.equal(
        qb.build({delete: '*'}),
        "DELETE FROM [model_name];"
      );
    });

    it('throws an error in strict mode if WHERE clause is missing (use truncate)', function() {
      function test(){
        strictQb.delete().toSql();
      }
      assert.throws(test, Error);
    });

    it('deletes with a where clause', function() {
      assert.equal(
        qb.build({ delete: {name: 'foo'}}),
        'DELETE FROM [model_name] ' +
        'WHERE [name] = \'foo\';'
      );
    });

    it('allows multiple fields in WHERE clause', function() {
      assert.equal(
        qb.build({delete: {
          'name': 'foo',
          'email': 'bar@bah.com'
        }}),

        "DELETE FROM [model_name] " +
        "WHERE [name] = 'foo' " +
        "AND [email] = 'bar@bah.com';"
      );
    });

    it('ignores invalid fields by default', function() {
      assert.equal(
        qb.build({delete: {
          'name': 'foo',
          'email': 'bar@bah.com',
          'bad_field': 1000
        }}),

        "DELETE FROM [model_name] " +
        "WHERE [name] = 'foo' " +
        "AND [email] = 'bar@bah.com';"
      );
    });

    it('throws an error on invalid fields in strict mode', function() {
      assert.equal(
        qb.build({
          delete: {
            'name': 'foo',
            'email': 'bar@bah.com',
            'bad_field': 1000
          }
        }),

        "DELETE FROM [model_name] " +
        "WHERE [name] = 'foo' " +
        "AND [email] = 'bar@bah.com';"
      );
    });

  }); // # end DELETE


  describe("Insert", function() {
    it('basic with all valid fields', function() {
      var obj = { index: '1234', name: 'Joseph' };

      assert.equal(
        qb.build({insert: obj}),
        "INSERT INTO [model_name]([index], [name]) " +
        "OUTPUT inserted.[index] " +
        "VALUES ('1234', 'Joseph');"
      );
    });

    it('basic with all valid fields obj', function() {
      var obj = { index: '1234', name: 'Joseph' };

      assert.equal(
        qb.build({ insert: obj, returning: ['index', 'name'] }),
        "INSERT INTO [model_name]([index], [name]) " +
        "OUTPUT inserted.[index], inserted.[name] " +
        "VALUES ('1234', 'Joseph');"
      );
    });


    it('array of objects', function() {
      var obj = [{ index: '1234', name: 'Joseph' }, { index: '2222', name: 'Jane' }];

      assert.equal(
        qb.build({insert: obj}),
        "INSERT INTO [model_name]([index], [name]) " +
        "OUTPUT inserted.[index] " +
        "VALUES ('1234', 'Joseph'), ('2222', 'Jane');"
      );
    });

    it('ignores invalid fields by default', function() {
      var obj = { index: '1234', bad_field: 'Joseph' };

      assert.equal(
        qb.build({insert: obj}),
        'INSERT INTO [model_name]([index]) ' +
        'OUTPUT inserted.[index] ' +
        'VALUES (\'1234\');'
      );
    });

    it('throws errors on invalid fields in strict mode', function() {
      var obj = { index: '1234', bad_field: 'Joseph' };

      function test() {
        strictQb.build({insert: obj});
      }
      assert.throws(test, Error);
    });

//    it('inserts basic', function() {
//      assert.equal(
//        qb.build({insert: qb.params("index, name", ['1234', 'Joseph'])}),
//        'INSERT INTO [model_name](index, name) VALUES (\'1234\',\'Joseph\') RETURNING "index";'
//      );
//    });
  });

  describe("Select", function() {

    it('single field', function() {
      assert.equal(
        qb.build({
            where: { index: '2345'}
          }),
        "SELECT * FROM [model_name] WHERE [index] = '2345';"
      );
    });

    it('should allow *', function() {
      assert.equal(
        qb.build(),
        "SELECT * FROM [model_name];"
      );
    });


    it('object property', function() {
      assert.equal(
        qb.build({where: {name: 'awesome sauce'}}),
        'SELECT * FROM [model_name] WHERE [name] = \'awesome sauce\';'
      );
    });


    it('multiple fields', function() {
      assert.equal(
        qb.build({where: { name: 'awesome sauce', email: 'joepancakes@email.com' }}),
        'SELECT * FROM [model_name] ' +
        'WHERE [name] = \'awesome sauce\' ' +
        'AND [email] = \'joepancakes@email.com\';'
      );
    });

    it('select fields', function() {
      assert.equal(
        qb.build({
          select: ["name", "email"],
          where: {
            'name': 'awesome sauce',
            'email': 'joepancakes@email.com'
          }
        }),

        'SELECT [name],[email] FROM [model_name] ' +
        'WHERE [name] = \'awesome sauce\' ' +
        'AND [email] = \'joepancakes@email.com\';'
      );
    });

    it('select empty returns *', function() {
      assert.equal(
        qb.build({
          where: {
            'name': 'awesome sauce',
            'email': 'joepancakes@email.com'
          }
        }),

        'SELECT * FROM [model_name] ' +
        'WHERE [name] = \'awesome sauce\' ' +
        'AND [email] = \'joepancakes@email.com\';'
      );
    });


    it('limits', function() {
      assert.equal(
        qb.build({
          select: ['index', 'email'],
          where: {
            'name': 'awesome sauce',
            'email': 'joepancakes@email.com'
          },
          limit: 25
        }),

        'SELECT [index],[email] FROM [model_name] ' +
        'WHERE [name] = \'awesome sauce\' ' +
        'AND [email] = \'joepancakes@email.com\' ' +
        'LIMIT 25;'
      );
    });

    it('offsets', function() {
      assert.equal(
        qb.build({
          select: ['index', 'email'],
          where: {
            'name': 'awesome sauce',
            'email': 'joepancakes@email.com'
          },
          offset: 25
        }),

        'SELECT [index],[email] FROM [model_name] ' +
        'WHERE [name] = \'awesome sauce\' ' +
        'AND [email] = \'joepancakes@email.com\' ' +
        'OFFSET 25;'
      );
    });

    it('limits and offsets', function() {
      assert.equal(
        qb.build({
          select: ['index', 'email'],
          where: {
            'name': 'awesome sauce',
            'email': 'joepancakes@email.com'
          },
          limit: 10,
          offset: 25
        }),

        'SELECT [index],[email] FROM [model_name] ' +
        'WHERE [name] = \'awesome sauce\' ' +
        'AND [email] = \'joepancakes@email.com\' ' +
        'LIMIT 10 ' +
        'OFFSET 25;'
      );
    });


    it('orders asc', function() {
      assert.equal(
        qb.build({
          select: ['index', 'email'],
          where: {
            'name': 'awesome sauce',
            'email': 'joepancakes@email.com'
          },
          limit: 50,
          order: 'field'
      }),

        'SELECT [index],[email] FROM [model_name] ' +
        'WHERE [name] = \'awesome sauce\' ' +
        'AND [email] = \'joepancakes@email.com\' ' +
        'ORDER BY field ' +
        'LIMIT 50;'
      );
    });


    it('multiple order fields', function() {
      assert.equal(
        qb.build({
          select: 'index, email',
          where: {
            'name': 'awesome sauce',
            'email': 'joepancakes@email.com'
          },
          order: ['field DESC', 'field2']
        }),

        'SELECT index, email FROM [model_name] ' +
        'WHERE [name] = \'awesome sauce\' ' +
        'AND [email] = \'joepancakes@email.com\' ' +
        'ORDER BY field DESC,field2;'
     );
    });


    it('properties with operators', function() {
      assert.equal(
        qb.build({
          where: {
            'name <>': 'awesome sauce',
            'name in': ['john', 'jane'],
            'age not in': [1, 3],
            'age =': 1
          }
        }),

        'SELECT * FROM [model_name] ' +
        'WHERE [name] <> \'awesome sauce\' ' +
        'AND [name] in (\'john\',\'jane\') ' +
        'AND [age] not in (1,3) ' +
        'AND [age] = 1' +
        ';'
     );
    });


    it('ignores invalid fields by default', function() {
      assert.equal(
        qb.build({
          where: { name: 'foo', bad_field: 'bar' }
        }),

        'SELECT * FROM [model_name] ' +
        'WHERE [name] = \'foo\';'
      );
    });


    it('throws an error on invalid fields in strict mode', function() {
      function test() {
          strictQb.build({ where: { 'name': 'foo', 'bad_field': 'bar' }});
      }
      assert.throws(test, Error);
    });


    it('throws an error on all invalid fields resulting in empty WHERE clause', function() {
      function test() {
        qb.build({ where: {bad_field: 0}});
      }
      assert.throws(test, Error);
    });


    it('column alias', function() {
      assert.equal(
        qb.build({
          select: 'index AS a',
          where: { index: '2345' }
        }),

        "SELECT index AS a FROM [model_name] " +
        "WHERE [index] = '2345';"
      );
    });

    it('query using null', function() {
      assert.equal(
        qb.build({
          where: {'name': null}
        }),
        'SELECT * FROM [model_name] ' +
        'WHERE [name] IS NULL;'
      );
    });

    it('pages', function() {
      assert.equal(
        qb.build({
          page: [2, 25]
        }),
        "SELECT * FROM [model_name] " +
        "LIMIT 25 OFFSET 50;"
      );
    });
  }); // end describe


  describe("Update", function() {
    it('updates with all valid fields', function() {
      var obj = { index: '1234', name: 'Joseph' };

      assert.equal(
        qb.build({
          update: obj,
          where: {'age >': 15 }
        }),
        'UPDATE [model_name] ' +
        'SET [name] = \'Joseph\', [index] = \'1234\' ' +
        'WHERE [age] > 15;'
      );
    });


    it('ignores invalid fields by default', function() {
      var obj = {
        age: 8,
        bad_field: 'abcdef',
        name: 'Bob',
        email: 'bob@email.com'
      };

      assert.equal(
        qb.build({
          update: obj,
          where: {name: 'joe'}
        }),
        "UPDATE [model_name] " +
        "SET [email] = 'bob@email.com', [name] = 'Bob', [age] = 8 " +
        "WHERE [name] = 'joe';"
      );
    });

    it('throws an error on invalid fields in strict mode', function() {
      var obj = {
        age: 8,
        bad_field: 'abcdef',
        name: 'Bob',
        email: 'bob@email.com'
      };

      function test() {
        strictQb.build({ update: obj, where: {name: 'joe'}});
      }
      assert.throws(test, Error);
    });


    it('updates all by default without a where clause', function() {
      var obj = {
        age: 8,
        bad_field: 'abcdef',
        name: 'Bob',
        email: 'bob@email.com'
      };

      assert.equal(
        qb.build({ update: obj }),
        "UPDATE [model_name] " +
        "SET [email] = 'bob@email.com', [name] = 'Bob', [age] = 8;"
      );
    });


    it('throws an error if where clause is missing in strict mode', function() {
      var obj = {
        age: 8,
        name: 'Bob',
        email: 'bob@email.com'
      };

      function test() {
        strictQb.build({update: obj});
      }
      assert.throws(test, Error);
    });

  }); // end UPDATE

}); // end QueryBuilder
