'use strict';

module.exports = {
  /**
   * @type {RegExp}
   */
  REX_INTERPOLATE_SYMBOL: /{{[^{}]+}}/g,
  /**
   * @type {RegExp}
   */
  REX_REPEAT_SYMBOL: /{{(\w+)\sin\s([\w\.]+)}}/,
  /**
   * @type {RegExp}
   */
  STR_REPEAT_ATTRIBUTE: 'cl-repeat'
};
