'use strict';

import ClayRegister   from './register';
import helper         from './helper';

import template       from './template';
import templateHelper from './template-helper';
import element        from './element';

/**
 * @class Claylump
 * @type {Object}
 */
window.Claylump = helper.mix(ClayRegister, {
  element        : element,
  helper         : helper,
  template       : template,
  templateHelper : templateHelper
});
