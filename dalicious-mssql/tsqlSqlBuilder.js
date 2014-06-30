'use strict';
var schema = require('./schema');

function buildRequest(request, args) {
  if (!args) return;

  var arg, k, isOutput, name, pos, type, val;
  for (k in args) {
    if (!args.hasOwnProperty(k)) continue;
    val = args[k];
    if (typeof val === 'undefined') val = null;
    pos = k.indexOf(' OUT');
    // get rid of ' OUT'
    isOutput = pos > 1;
    name = isOutput ? k.substring(0, pos) : k;

    // if it is an array of arguments just apply it
    if (Array.isArray(val)) {
      val.unshift(name);
      if (isOutput) {
        request.output.apply(request, val);
      } else {
        request.input.apply(request, val);
      }
    } else {
      type = schema.getTypeByValue(val);
      if (isOutput) {
        request.output(name, type, val);
      } else {
        request.input(name, type, val);
      }
    }
  }
}

module.exports = function(request, sql, args) {
  buildRequest(request, args);
  return sql;
};
