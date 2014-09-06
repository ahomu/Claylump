'use strict';

var helper   = require('./helper');
var template = require('./template');

/**
 * @class ClayElement
 */
module.exports = {
  /**
   * @static
   * @param {String} name
   * @param {Object} proto
   * @returns {ClayElement}
   */
  create: function(name, proto) {

    var defaults = {
      /**
       * @private
       * @property {Document} _doc
       */
      _doc:  document._currentScript ? document._currentScript.ownerDocument
                                     : document.currentScript.ownerDocument,
      /**
       * @private
       * @method {Function} _created
       */
      _created: helper.isFunction(proto.createdCallback) ? proto.createdCallback
                                                         : helper.noop,
      /**
       * @private
       * @method {Function} _attached
       */
      _attached: helper.isFunction(proto.attachedCallback) ? proto.attachedCallback
                                                           : helper.noop,
      /**
       * @private
       * @method {Function} _detached
       */
      _detached: helper.isFunction(proto.detachedCallback) ? proto.detachedCallback
                                                           : helper.noop,
      /**
       * @private
       * @method {Function} _attrChanged
       */
      _attrChanged: helper.isFunction(proto.attributeChangedCallback) ? proto.attributeChangedCallback
                                                                      : helper.noop,
      /**
       * @private
       * @property {String} _html
       */
      _html: '',

      /**
       * @private
       * @property {Array} _protects
       */
      _protects: [],

      /**
       * @property {Element} root
       */
      root: null,

      /**
       * @property {Object} events
       */
      events: {},

      /**
       * @property {Object} use
       */
      use: {}
    };

    // protect property objects reference
    proto._protects = Object.keys(proto).filter(function(key) {
      return typeof proto[key] === 'object' && !defaults[key];
    });

    // mix claylump implementation
    helper.mix(helper.mix(proto, defaults), ClayElement.prototype, true);

    // dom ready required
    helper.ready(function() {
      var template = proto._doc.querySelector('[cl-element="'+name+'"]');
      proto._html  = template.innerHTML;
    });

    // extends element
    var baseElement;
    if (proto.extends) {
      // FIXME cannot use `is="x-child"` in `<template>`

      // element instance -> constructor -> create host object
      baseElement = Object.create(proto._doc.createElement(proto.extends).constructor);

      if (helper.isCustomElementName(proto.extends)) {
        // extends custom element
        // FIXME create baseElements prototype by deeply clone
        proto           = helper.mix(helper.clone(baseElement.prototype), proto, true);
        proto.__super__ = baseElement.prototype;
        baseElement     = HTMLElement;
      }

    } else {
      // new custom element
      baseElement = HTMLElement;
    }

    return helper.mix(Object.create(baseElement.prototype), proto);
  }
};

function ClayElement() {
  // don't call directly
}

helper.mix(ClayElement.prototype, {
  /**
   *
   * @private
   */
  _injectUseObject: function() {
    var keys = Object.keys(this.use || {}), i = 0, alias;
    while ((alias = keys[i++])) {
      if (this[alias]) {
        throw new Error('Conflict assign property `' + alias + '`!')
      }
      this[alias] = this.use[alias](this);
    }
    delete this.use;
  },

  /**
   * @private
   */
  _clonePropertyObjects: function() {
    var i = 0, key;
    while ((key = this._protects[i++])) {
      // FIXME create own object|array by deeply clone
      this[key] = helper.clone(this[key]);
    }
  },

  /**
   *
   */
  createdCallback : function() {

    // resolve use injection
    this._injectUseObject();

    // clone objects
    this._clonePropertyObjects();

    // original
    this._created();
  },

  /**
   *
   */
  attachedCallback : function() {

    // create virtual template & actual dom
    this.createShadowRoot();
    this.template = template.create(this._html, this);
    this.root     = this.template.createElement(this._doc);
    this.shadowRoot.appendChild(this.root);
    this.template.drawLoop(this.root);

    // original
    this._attached();
  },

  /**
   *
   */
  detachedCallback : function() {
    this.template.destroy();

    // original
    this._detached();
  },

  /**
   *
   */
  attributeChangedCallback : function() {
    // original
    this._attrChanged();
  },

  /**
   * @param {String} methodName
   * @param {*} ...
   */
  super: function() {
    if (!this.__super__) {
      throw new Error('This element does not have the `__super__`');
    }

    var origArgs    = helper.toArray(arguments),
        methodName  = origArgs.slice(0, 1),
        passArgs    = origArgs.slice(1),
        superMethod = this.__super__[methodName];

    if (helper.isFunction(superMethod)) {
      return superMethod.apply(this, passArgs);
    } else {
      throw new Error('Does not exists method in super element specified: ' + superMethod);
    }
  }
});
