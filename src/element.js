'use strict';

var helper   = require('./helper');
var template = require('./template');
var event    = require('./event');

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
                                     : document.currentScript ? document.currentScript.ownerDocument
                                                              : document,
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
       * @property {Element} root
       */
      root: null,

      /**
       * @property {ClayTemplate} template
       */
      template: null,

      /**
       * @property {Object} scope
       */
      scope : {},

      /**
       * @property {Object.<string, (string|function)>} events
       */
      events: {},

      /**
       * @property {Object.<string, function>} use
       */
      use: {}
    };

    // mix claylump implementation
    helper.mix(helper.mix(proto, defaults), ClayElement.prototype, true);

    // dom ready required
    helper.ready(function() {
      var template = proto._doc.querySelector('[cl-element="'+name+'"]');
      proto._html  = template ? template.innerHTML : '';
    });

    // extends element
    var baseElement, extendedScope;
    if (proto.extends) {
      // FIXME cannot use `is="x-child"` in `<template>`

      // element instance -> constructor -> create host object
      baseElement = Object.create(proto._doc.createElement(proto.extends).constructor);

      if (helper.isCustomElementName(proto.extends)) {
        // extends custom element
        // FIXME create baseElements prototype by deeply clone
        extendedScope   = helper.mix(helper.clone(baseElement.prototype.scope), proto.scope, true);
        proto           = helper.mix(helper.clone(baseElement.prototype),       proto,       true);
        proto.scope     = extendedScope;
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
    var self = this,
        keys = Object.keys(this.use || {}), i = 0, alias;

    while ((alias = keys[i++])) {
      if (self[alias]) {
        throw new Error('Conflict assign property `' + alias + '`!')
      }
      self[alias] = this.use[alias](this);
    }

    this.use = null;
  },

  /**
   * @private
   */
  _cloneScopeObjects: function() {
    var scope = this.scope,
        keys = Object.keys(scope), i = 0, key;

    while ((key = keys[i++])) {
      if (typeof scope[key] === 'object') {
        // FIXME create own object|array by deeply clone
        scope[key] = helper.clone(scope[key]);
      }
    }
  },

  /**
   * shorthand of template.invalidate
   */
  invalidate: function() {
    this.template.invalidate();
  },

  /**
   *
   */
  createdCallback : function() {

    // create virtual template & actual dom
    this.createShadowRoot();
    this.template = template.create(this._html, this.scope); // TODO
    this.root     = this.template.createElement(this._doc);

    if (!this.root) {
      this.root = this._doc.createElement('div');
    }

    // set rootch

    this.shadowRoot.appendChild(this.root);
    this.template.drawLoop(this.root);

    // create events
    this.events = event.create(this.root, this.events); // TODO

    // resolve use injection
    this._injectUseObject();

    // clone objects
    this._cloneScopeObjects();

    // original
    this._created.apply(this, arguments);
  },

  /**
   *
   */
  attachedCallback : function() {
    // event delegation
    this.events.enable(this);

    // original
    this._attached.apply(this, arguments);
  },

  /**
   *
   */
  detachedCallback : function() {
    // disable event
    this.events.disable();

    // original
    this._detached.apply(this, arguments);
  },

  /**
   *
   */
  attributeChangedCallback : function() {
    // original
    this._attrChanged.apply(this, arguments);
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
