'use strict';

var element = require('./element');

function ClayRegister(name, proto) {
  document.registerElement(name, {
    prototype: element.create(name, proto)
  });
}

module.exports = ClayRegister;
