'use strict';

var helper = require('../helper');

// test sample
function Http(ctx) {
  this.context = ctx;
}

helper.mix(Http.prototype, {
  get: function(url) {

  }
});

module.exports = function factory(context) {
  return new Http(context);
};
