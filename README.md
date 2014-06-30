# dalicious

_dalicious_ is a toolkit for your data access layer.

- intuitive transactions and models
- little sugar
- multi-database support in same process

Currently supports:

    Postgres
    Sql Server

## Example

Initializing

    var dalicious = require('dalicious');
    var Mssql = require('dalicious/mssql');
    var Store = Mssql.define({user: 'sa', password: 'secret'});
    var Dal = dalicious.define(Store);
    var Model = dalicious.Model;

    // define your models using prototypical inheritance. Model base can
    // be your own class intead of dalicious.Model
    function User() {
      Model.apply(this, arguments);
    }
    util.inherits(User);
    User.prototype.create = function(email, cb) {
      this.dao.query({insert: {email: email}, returning: ['id']}).one(cb);
    });

    // register models
    Dal.dal('User', {model: User, table: 'Users'});
    Dal.dalify(function(err) {
      // dal is ready for use
    });

Using

    var dal = new Dal();

    // Use your model
    dal.User.create(function(err, id) {
      ...
    });

    // Use low-level data access object (DAO)
    dal.store.UserDao.findById(id, function(err, row) {
        ...
    });

    dal.store.UserDao.query({
      select: ['id', 'name'],
      where: {id: id}
    }).all(function(err, rows) {
        ...
    });

    // Use plain sql
    dal
      .sql('select * from Users where createdAt > $1', [new Date('1-9-2013')])
      .all(function(err, rows) {
        ...
      });

    // use T-sql (sql server)
    dal.store
      .tsql(
        'insert into images (image) output inserted.id values (@buffer)',
        {buffer: buffer}
      )
      .all(function(err, rows) {
        ...
      });

Transactions

    var tx = dal.transactable();
    var userId;

    async.series([
      function(cb) {
        tx.begin(cb)
      },
      function(cb) {
        tx.User.query(...).function(err, id) { userId = id; cb() }
      },
      function(cb) {
        tx.Account.query(...)
      },
      function(cb) {
        tx.sql(...)
      }
    ], function(err) {
      if (err) return tx.rollback();
      tx.commit();
    })


Multi DB

    var dalicious = require('dalicious');
    var Mssql = require('dalicious/mssql');
    var MainDb = Mssql.define({user: 'sa', password: 'secret', database: 'main'});
    var ReportDb = Mssql.define({user: 'sa', password: 'secret', database: 'report'});

    var Dal = dalicious.define(MainDb);
    var dal = new Dal();
    var ReportDal = dalicious.define(ReportDb);
    var reportDal = new ReportDal();

    ...

## Understanding

Data Access Layer (DAL)

-   has a database specific store
-   has 1 or more models

Store

-   database storage
-   has 1 or more data access objects

Model

-   encapsulates business logic
-   may use one or more Data Access Objects
-   may use plain SQL or store-specific dialects (mssql tsql)
-   has a default Data Access Object named, `this.dao`

Data Access Object (DAO)

-   1-1 mapping to table or collection
-   data access logic not business logic
-   has a `schema` for inspection

