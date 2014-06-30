'use strict';

module.exports = function(Schema) {
  /**
   * Formats prepared statement.
   *
   * @param sql
   * @param params
   * @return {String}
   */
  function format(sql, params) {
    if (!params) return sql;
    if (!Array.isArray(params)) params = [params];

    // need clone for shifting
    params = params ? params.concat() : [];
    var length = params.length;

    sql = sql.replace(/\$(\d+)/g, function(match, captured) {
      if (params.length == 0) throw new Error('ZERO parameters given');

      var pos = parseInt(captured, 10) - 1;
      if (length <= pos) throw new Error('Not enough for parameters given: ' + sql);
      var val = params[pos];
      return Schema.escapeValue(val);
    });
    return sql;
  }

  // return SqlBuilder interface
  return function(client, sql, args) {
    if (args) sql = format(sql, args);
    return sql;
  };
};
