'use strict';

var helper     = require("./helper");

//template helperは自要素にだけ影響を与えられる
//

module.exports = {
  hook: function() {
    console.group('hook-test');
    console.log(this);
    console.log(arguments);
    console.groupEnd();
  }
};
