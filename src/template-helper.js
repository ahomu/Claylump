'use strict';

var helper     = require("./helper");

/**
 *
 */
module.exports = {
  register: function(name, func) {
    this[name] = func;
  },
  hook: function(el) {
    console.log('hook', el);
  }
};
