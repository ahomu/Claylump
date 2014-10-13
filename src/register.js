'use strict';

import element from './element';
import helper  from './helper';

var REGISTRY_CLAY_ELEMENTS = {};

/**
 * @param {String} name
 * @param {Object} [proto]
 */
function ClayRegister(name, proto = {}) {

  if (REGISTRY_CLAY_ELEMENTS[name]) {
    // already registered
    return;
  }

  var options = {
    prototype: element.create(name, proto)
  };

  if (proto.extends && !helper.isCustomElementName(proto.extends)) {
    options.extends = proto.extends;
  }

  REGISTRY_CLAY_ELEMENTS[name] = document.registerElement(name, options);
}

export default ClayRegister;
