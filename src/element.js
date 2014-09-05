'use strict';

var helper   = require('./helper');
var template = require('./template');

module.exports = {
  /**
   *
   * @param {String} name
   * @param {Object} proto
   * @returns {Object}
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
      _created: helper.is.func(proto.createdCallback) ? proto.createdCallback
                                                      : helper.noop,
      /**
       * @private
       * @method {Function} _attached
       */
      _attached: helper.is.func(proto.attachedCallback) ? proto.attachedCallback
                                                        : helper.noop,
      /**
       * @private
       * @method {Function} _detached
       */
      _detached: helper.is.func(proto.detachedCallback) ? proto.detachedCallback
                                                        : helper.noop,
      /**
       * @private
       * @method {Function} _attrChanged
       */
      _attrChanged: helper.is.func(proto.attributeChangedCallback) ? proto.attributeChangedCallback
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
    helper.mix(proto, defaults);
    helper.mix(proto, ClayElement.prototype, true);

    // dom ready required
    helper.ready(function() {
      var template = proto._doc.querySelector('[cl-element="'+name+'"]');
      proto._html  = template.innerHTML;
    });


    // TODO extends element
    return helper.mix(Object.create(HTMLElement.prototype), proto);
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
  }
});
