/*global: $:false*/
'use strict';
var gulp = require('gulp');
var $ = require('gee-shell');

var SRC = {
  tests: ['dalicious-mssql/**/*', 'dalicious-postgres/**/*', 'lib/**/*', 'test/**/*']
};

gulp.task('test', function (done) {
  // test musts run separately as each store will stomp on each other when
  // setting property of Dal and Dao prototype
  $ .run('mocha -R spec test/mssql')
    .run('mocha -R spec test/postgres')
    .start(done);
});

gulp.task('watch', function() {
  gulp.watch(SRC.tests, ['test']);
});
