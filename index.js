'use strict';

var ClayRegister = require('./src/register');
var helper       = require('./src/helper');

window.Claylump = helper.mix(ClayRegister, {
  factory: {
    http: require('./src/factory/http')
  },
  mixin: {
    log : require('./src/mixin/log')
  }
});
