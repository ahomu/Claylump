'use strict';

var ClayRegister = require('./src/register');
var helper       = require('./src/helper');

window.Claylump = helper.mix(ClayRegister, {

  Template: require('./src/template'),
  Element : require('./src/element'),

  module : {
    http: require('./src/modules/http')
  }
});
