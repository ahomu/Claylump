'use strict';

// test sample
module.exports = {
  log: function() {
    console.log.apply(arguments);
  },
  debug: function() {
    console.debug.apply(arguments);
  },
  info: function() {
    console.info.apply(arguments);
  },
  warn: function() {
    console.warn.apply(arguments);
  },
  fatal: function() {
    console.error.apply(arguments);
  }
};
