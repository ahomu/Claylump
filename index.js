'use strict';

var ClayRegister = require('./src/register');
var helper       = require('./src/helper');

window.Claylump = helper.mix(ClayRegister, {

  Template       : require('./src/template'),
  TemplateHelper : require('./src/template-helper'),
  Element        : require('./src/element'),
  Observer       : require('./src/observer'),
  Event          : require('./src/event'),
  Helper         : require('./src/helper'),

  modules : {
    http : require('./src/modules/http')
  }
});
