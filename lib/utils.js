'use strict';
var fs = require('fs');

/**
 * Builds database URL connection string from config.
 *
 * @param config
 * @return {String}
 */
exports.buildConnectionString = function buildConnectionString(config) {
  var protocol = config.protocol || 'tcp';
  var connString = protocol + '://';
  var host = config.host || 'localhost';

  if (config.user) {
    connString += config.user;
    if (config.password) {
      connString += ':' + config.password;
    }
    connString += '@';
  }

  connString += host;
  if (config.port) connString += ':' + config.port;
  if (config.database) connString += '/' + config.database;
  return connString;
};


/**
 * Parses a file, splitting it into sections then assigns each section
 * to a property in an object.
 *
 * Each section is delimited by ^^
 */
exports.parseStringsFile = function parseStringsFile(filename, pattern) {
  // search for ^^identifier pattern
  if (!pattern) pattern =  /\^\^(\w+)(>?)/;
  var lines = fs.readFileSync(filename, 'utf8').split('\n');
  var result = {};
  var current;
  var separator = '\n';

  lines.forEach(function(line) {
    var matches = line.match(pattern);
    if (matches) {
      current = matches[1];
      result[current] = '';
      separator = matches[2] === '>' ? ' ' : '\n';
      return;
    }
    if (current) result[current] += (line + separator);
  });

  return result;
};
