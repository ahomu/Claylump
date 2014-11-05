'use strict';

import ClayRegister   from './register';
import helper         from './helper';

import template       from './template';
import templateHelper from './template-helper';
import element        from './element';

import moduleRegistry from './module';
import modEvent       from './modules/event';

/**
 * @class Claylump
 * @type {Object}
 */
module.exports = helper.mix(ClayRegister, {
  element        : element,
  helper         : helper,
  template       : template,
  templateHelper : templateHelper,
  modules        : moduleRegistry
});

moduleRegistry.register('DOMEventDelegate', modEvent);