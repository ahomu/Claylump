'use strict';

var helper     = require("./helper");

//template helperは自要素にだけ影響を与えられる

module.exports = {
  hook: function(el) {
    console.log('hook', el);
  }
};
