'use strict';

var element = require('./element');
var helper  = require('./helper');

/**
 * @param {String} name
 * @param {Object} proto
 */
function ClayRegister(name, proto) {
  var options = {
    prototype: element.create(name, proto)
  };

  if (proto.extends && !helper.isCustomElementName(proto.extends)) {
    options.extends = proto.extends;
  }

  document.registerElement(name, options);
}

module.exports = ClayRegister;
