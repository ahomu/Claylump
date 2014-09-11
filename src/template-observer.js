'use strict';

var constants = require("./constants");
var helper   = require("./helper");

/**
 * @class ClayTemplateObserver
 */
module.exports = {
  /**
   * @static
   * @param {Function} handler
   * @returns {ClayTemplateObserver}
   */
  create: function(handler) {
    return new ClayTemplateObserver(handler);
  }
};

var ArrayProxy = Object.create(Array.prototype);
[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
].forEach(function(method) {
  Object.defineProperty(ArrayProxy, method, {
    value        : function() {
      var result = Array.prototype[method].apply(this, arguments);
      return result;
    },
    enumerable   : false,
    writable     : false,
    configurable : true
  })
});

var ObjProxy = Object.create(Object.prototype);


/**
 *
 * @param {Function} handler
 * @constructor
 */
function ClayTemplateObserver(handler) {
  this.handler  = handler;

  // @see https://github.com/Polymer/observe-js
  this.observer = new CompoundObserver();
}

helper.mix(ClayTemplateObserver.prototype, {
  /**
   * TODO refactor
   * @param {String} html
   * @param {Object} scope
   */
  start: function (html, scope) {
    var matches, repeatRexStr;
//
//    // interpolate path
//    matches = html.match(constants.REX_INTERPOLATE_SYMBOL) || [];
//    matches = helper.uniq(matches).map(convertSymbolToPath);
//    console.dir(matches.forEach);
//    matches.forEach(function(symbolPath) {
//      var host = scope,
//          tokens = symbolPath.split('.');
//
//      if (tokens.length > 1) {
//        // remove target property name;
//        tokens.splice(-1);
//
//        // fill object
//        var i = 0, token;
//        while ((token = tokens[i++])) {
//          host[token] || (host[token] = {});
//          host = host[token];
//        }
//      }
//
//      // add observe path
//      this.observer.addPath(scope, symbolPath);
//
//    }, this);
//
//    // array
//    repeatRexStr = constants.REX_REPEAT_SYMBOL.toString().slice(1, -1);
//    matches = html.match(new RegExp(repeatRexStr, 'g')) || [];
//    matches = helper.uniq(matches).map(convertSymbolToPath);
//    matches.forEach(function(symbolPath) {
//      var host = scope,
//          tokens = symbolPath.split('.');
//
//      console.info(symbolPath);
//      // fill array
//      var i = 0, token;
//      while ((token = tokens[i++])) {
//        if (!host[token]) {
//          host[token]  = i === tokens.length ? [] : {};
//        }
//        host = host[token];
//      }
//
//      // add observe path
//      console.log(host);
//      this.observer.addObserver(new ArrayObserver(host));
//
//    }, this);

    this.observer.addObserver(new ObjectObserver(scope));
    this.observer.open(function() {
      this.handler();
    }.bind(this));
  }
});

function convertSymbolToPath(symbol) {
  // '{{foo.bar}}' -> 'foo.bar'
  symbol = symbol.slice(2, -2);

  // 'foo.bar'        -> ['foo.bar'].pop()
  // 'foo in bar.baz' -> ['foo', 'in', 'foo.baz'].pop()
  return symbol.split(/\s/).pop();
}
