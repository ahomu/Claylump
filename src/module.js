'use strict';

import helper  from './helper';

class ClayModule {

  constructor() {
    this.registry = [];
  }

  register(name, factory) {
    this.registry[name] = factory;
  }

  load(name) {
    return this.registry[name]
  }
}

export default new ClayModule();
