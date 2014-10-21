'use strict';

import helper from "./helper";

/**
 *
 */
export default {
  register: function(name, func) {
    this[name] = func;
  },
  hook: function hook(el) {
    console.log(arguments);
    console.log('hook', el);
  }
};
