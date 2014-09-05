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
    /**
     * @private
     * @property {Document} _doc
     */
    proto._doc = document._currentScript ? document._currentScript.ownerDocument
                                         : document.currentScript.ownerDocument;
    /**
     * @private
     * @method {Function} _created
     */
    proto._created = helper.is.func(proto.createdCallback) ? proto.createdCallback
                                                           : helper.noop;
    /**
     * @private
     * @method {Function} _attached
     */
    proto._attached = helper.is.func(proto.attachedCallback) ? proto.attachedCallback
                                                             : helper.noop;
    /**
     * @private
     * @method {Function} _detached
     */
    proto._detached = helper.is.func(proto.detachedCallback) ? proto.detachedCallback
                                                             : helper.noop;
    /**
     * @private
     * @method {Function} _attrChanged
     */
    proto._attrChanged = helper.is.func(proto.attributeChangedCallback) ? proto.attributeChangedCallback
                                                                        : helper.noop;
    /**
     * @private
     * @property {String} _html
     */
    proto._html = '';

    /**
     * @property {Element} root
     */
    proto.root = null;

    // dom ready required
    helper.ready(function() {
      var template = proto._doc.querySelector('[cl-element="'+name+'"]');
      proto._html  = template.innerHTML;
    });

    // mix claylump implementation
    helper.mix(proto, ClayElement.prototype);

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
   *
   */
  createdCallback : function() {

    // create virtual template & actual dom
    this.createShadowRoot();
    this.template = template.create(this._html, this);
    this.root     = this.template.createElement(this._doc);
    this.shadowRoot.appendChild(this.root);
    this.template.drawLoop(this.root);

    // resolve use injection
    this._injectUseObject();

    // original
    this._created();
  },

  /**
   *
   */
  attachedCallback : function() {
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
