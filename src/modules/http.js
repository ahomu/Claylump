'use strict';

import helper from '../helper';

// test sample
function Http(ctx) {
  this.context = ctx;
}

helper.mix(Http.prototype, {
  get: function(url) {

  }
});

export default function factory(context) {
  return new Http(context);
};
