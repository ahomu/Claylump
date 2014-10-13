'use strict';

import ClayRegister   from './register';
import helper         from './helper';

import Template       from './template';
import TemplateHelper from './template-helper';
import Element        from './element';
import Observer       from './observer';
import Event          from './event';
import Helper         from './helper';

import ModHttp        from './modules/http';

/**
 * @class Claylump
 * @type {Object}
 */
window.Claylump = helper.mix(ClayRegister, {

  Template       : Template,
  TemplateHelper : TemplateHelper,
  Element        : Element,
  Observer       : Observer,
  Event          : Event,
  Helper         : Helper,

  modules : {
    http : ModHttp
  }
});
