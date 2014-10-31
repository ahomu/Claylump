(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var ClayRegister = require('./register').default;
var helper = require('./helper').default;
var template = require('./template').default;
var templateHelper = require('./template-helper').default;
var element = require('./element').default;
var moduleRegistry = require('./module').default;
var modEvent = require('./modules/event').default;

/**
 * @class Claylump
 * @type {Object}
 */
window.Claylump = helper.mix(ClayRegister, {
  element        : element,
  helper         : helper,
  template       : template,
  templateHelper : templateHelper,
  modules        : moduleRegistry
});

moduleRegistry.register('DOMEventDelegate', modEvent);
},{"./element":2,"./helper":3,"./module":4,"./modules/event":5,"./register":6,"./template":8,"./template-helper":7}],2:[function(require,module,exports){
"use strict";
var _slice = Array.prototype.slice;
'use strict';

var helper = require('./helper').default;
var template = require('./template').default;
var moduleRegistry = require('./module').default;

var REGISTRY_CLAY_PROTOTYPES = {};

exports.default = {
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
       * @property {Object.<string, function>} use
       */
      use: {}
    };

    // defaults
    helper.mix(proto, defaults);
    helper.mix(proto.use, {
      event : 'DOMEventDelegate'
    });

    // dom ready required
    helper.ready(function() {
      var template = proto._doc.querySelector('[cl-element="'+name+'"]');
      proto._html  = template ? template.innerHTML : '';
    });

    // extends element
    var extendsProto;
    if (proto.extends) {
      // FIXME cannot use `is="x-child"` in `<template>`

      if (helper.isCustomElementName(proto.extends) &&
          (extendsProto = getExtendee(proto.extends))) {

        // extends custom element
        // FIXME create baseElements prototype by deeply clone
        helper.mix(proto.scope, extendsProto.scope);
        helper.mix(proto.use,   extendsProto.use);
        helper.mix(proto      , extendsProto);
        proto.__super__ = extendsProto;
        extendsProto    = HTMLElement.prototype;

      } else {
        extendsProto = Object.create(proto._doc.createElement(proto.extends).constructor).prototype;
      }

    } else {
      // new custom element
      extendsProto = HTMLElement.prototype;
    }

    // register prototype for extends
    REGISTRY_CLAY_PROTOTYPES[name] = helper.clone(proto);

    // mix claylump implementation
    helper.mix(proto, ClayElementImpl, true);

    return helper.mix(Object.create(extendsProto), proto);
  }
};

function getExtendee(name) {
  var proto = REGISTRY_CLAY_PROTOTYPES[name];
  if (!proto) {
    throw new Error('Could not extends `' + name + '`, because not registered');
  }
  return proto;
}

/**
 * @implements ClayElement
 */
var ClayElementImpl = {
  /**
   * inject utility with element instance
   *
   * @private
   */
  _injectUseObject: function() {
    var self = this,
        keys = Object.keys(this.use || {}), i = 0, alias, factory;

    while ((alias = keys[i++])) {
      if (self[alias]) {
        throw new Error('Conflict assign property `' + alias + '`!');
      }

      if (helper.isString(this.use[alias])) {
        factory = moduleRegistry.load([this.use[alias]]);
      }
      else if (helper.isFunction(this.use[alias])) {
        factory = this.use[alias];
      }
      else {
        throw new Error('Cannot detect module factory');
      }

      self[alias] = factory(this);
    }
  },

  /**
   * protect object reference in prototype.scope
   *
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
   * shorthand of `template.invalidate()`
   */
  invalidate: function() {
    this.template.invalidate();
  },

  /**
   * children finder
   *
   * @param {String} selector
   * @returns {?Element|Array}
   */
  find: function(selector) {
    var found = helper.toArray(this.root.querySelectorAll(selector));

    if (found.length <= 1) {
      return found[0] || null;
    } else {
      return found;
    }
  },

  /**
   * closest parent helper
   *
   * @param {Element|Array} el
   * @param {String} selector
   * @returns {?Element|Array}
   */
  closestOf: function(el, selector) {
    var _this = this;
    if (helper.isArray(el)) {
      return el.map(function(e) {
        return _this.closestOf(e, selector);
      });
    }

    var current = /** @type {Element} */ el.parentNode;
    do {
      if (current === this.root) {
        return null;
      }
      if (helper.matchElement(current, selector)) {
        return current;
      }
    } while ((current = current.parentNode));

    return null;
  },

  /**
   * an instance of the element is created
   * execute several initialize processes
   */
  createdCallback : function() {

    // create virtual template & actual dom
    this.createShadowRoot();
    this.template = template.create(this._html, this.scope); // TODO
    this.root     = this.template.createElement(this._doc);
    if (!this.root) {
      this.root = this._doc.createElement('div');
    }

    // set root element
    this.shadowRoot.appendChild(this.root);
    this.template.drawLoop(this.root);

    // resolve use injection
    this._injectUseObject();

    // clone objects
    this._cloneScopeObjects();

    // original
    this._created.apply(this, arguments);
  },

  /**
   * an instance was inserted into the document
   * call original attached callback
   */
  attachedCallback : function() {

    this.delegateModuleCallbacks('attachedCallback');

    // original
    this._attached.apply(this, arguments);
  },

  /**
   * an instance was removed from the document
   * call original detached callback
   */
  detachedCallback : function() {

    this.delegateModuleCallbacks('detachedCallback');

    // original
    this._detached.apply(this, arguments);
  },

  /**
   * an attribute was added, removed, or updated
   * call original attr changed callback
   */
  attributeChangedCallback : function() {

    // original
    this._attrChanged.apply(this, arguments);
  },

  /**
   *
   * @param {String} callbackMethod
   */
  delegateModuleCallbacks : function(callbackMethod) {
    var aliases = Object.keys(this.use),
        alias, module, callback, i = 0;

    while ((alias = aliases[i++])) {
      module = this[alias];
      callback = module[callbackMethod];
      if (helper.isFunction(callback)) {
        callback.apply(module, [this]);
      }
    }
  },

  /**
   * call super element's methods
   *
   * @param {String} methodName
   * @param {...*} args
   */
  super: function(methodName) {
    var args = _slice.call(arguments, 1);
    if (!this.__super__) {
      throw new Error('This element does not have the `__super__`');
    }

    var superMethod = this.__super__[methodName];

    if (helper.isFunction(superMethod)) {
      return superMethod.apply(this, args);
    } else {
      throw new Error('Does not exists method in super element specified: ' + superMethod);
    }
  }
};
},{"./helper":3,"./module":4,"./template":8}],3:[function(require,module,exports){
'use strict';

/**
 * @param {Object} to
 * @param {Object} from
 * @param {Boolean} [overwrite]
 * @return {Object}
 */
function mix(to, from, overwrite) {
  var i = 0, keys = Object.keys(from), prop;

  while ((prop = keys[i++])) {
    if (overwrite || !to[prop]) {
      to[prop] = from[prop];
    }
  }
  return to;
}

/**
 * shallow flatten
 * @param {Array} list
 * @returns {Array}
 */
function flatten(list) {
  var i = 0, item, ret = [];
  while ((item = list[i++])) {
    if (isArray(item)) {
      ret = ret.concat(item);
    } else {
      ret.push(item);
    }
  }
  return ret;
}

/**
 * @param {Object} obj
 * @returns {*}
 */
function clone(obj) {
  return Array.isArray(obj) ? obj.slice(0)
                            : mix({}, obj)
}

/**
 * @param {Array} array
 * @returns {Array}
 */
function uniq(array) {
  var ret = [], i = 0, item;

  while ((item = array[i++])) {
    if (ret.indexOf(item) === -1) {
      ret.push(item);
    }
  }
  return ret;
}

/**
 * get cached `matchesSelector` method name
 */
var matcherName;
function getMatcherName() {
  if (matcherName) {
    return matcherName;
  }

  var list  = ['matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector'],
      proto = HTMLElement.prototype, i = 0, name;

  while((name = list[i++])) {
    if (proto[name]) {
      matcherName = name;
      return matcherName;
    }
  }
}

/**
 * match element with selector
 *
 * @param {Element} element
 * @param {String} selector
 * @returns {boolean}
 */
function matchElement(element, selector) {
  return element[getMatcherName()](selector);
}

/**
 * @param {*} value
 * @returns {string}
 */
function toString(value) {
  var objStr = Object.prototype.toString.call(value);
  return objStr.slice(objStr.indexOf(' ') + 1, -1);
}

/**
 * fake array (like NodeList, Arguments etc) convert to Array
 * @param {*} fakeArray
 * @returns {Array}
 */
function toArray(fakeArray) {
  return Array.prototype.slice.call(fakeArray);
}

/**
 * @param {*} value
 * @returns {Boolean}
 */
function isFunction(value) {
  return typeof value === 'function';
}

/**
 * @param {*} value
 * @returns {Boolean}
 */
function isString(value) {
  return typeof value === 'string';
}

/**
 * @param {*} value
 * @returns {Boolean}
 */
function isNumber(value) {
  return typeof value === 'number';
}

/**
 * @param {*} value
 * @returns {Boolean}
 */
function isArray(value) {
  return toString(value) === 'Array';
}

/**
 * @param {*} value
 * @returns {Boolean}
 */
function isObject(value) {
  return toString(value) === 'Object';
}

/**
 * @param {String} localName
 * @returns {boolean}
 */
function isCustomElementName(localName) {
  return localName.indexOf('-') !== -1;
}

/**
 * @see http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible/13931627#13931627
 * @param {Function} constructor
 * @param {Array} args
 * @returns {invoke.F}
 */
function invoke(constructor, args) {
  var f;
  function F() {
    // constructor returns **this**
    return constructor.apply(this, args);
  }
  F.prototype = constructor.prototype;
  f = new F();
  f.constructor = constructor;
  return f;
}

/**
 * @param {Function} handler
 */
function ready(handler) {
  if (FLG_DOM_ALREADY) {
    handler();
  } else {
    STACK_READY_HANDLERS.push(handler);
  }
}

var FLG_DOM_ALREADY      = false,
    STACK_READY_HANDLERS = [];

document.addEventListener('DOMContentLoaded', function() {
  FLG_DOM_ALREADY = true;
  var i = 0, ready;
  while (ready = STACK_READY_HANDLERS[i++]) {
    ready();
  }
}, false);

exports.default = {
  noop      : function noop() {},
  mix       : mix,
  uniq      : uniq,
  clone     : clone,
  flatten   : flatten,
  ready     : ready,
  invoke    : invoke,
  toArray   : toArray,
  toString  : toString,

  matchElement : matchElement,

  isString            : isString,
  isNumber            : isNumber,
  isArray             : isArray,
  isFunction          : isFunction,
  isObject            : isObject,
  isCustomElementName : isCustomElementName
};

},{}],4:[function(require,module,exports){
'use strict';

var helper = require('./helper').default;

var ClayModule = function() {
  var ClayModule = function ClayModule() {
    this.registry = [];
  };

  Object.defineProperties(ClayModule.prototype, {
    register: {
      writable: true,

      value: function(name, factory) {
        this.registry[name] = factory;
      }
    },

    load: {
      writable: true,

      value: function(name) {
        return this.registry[name]
      }
    }
  });

  return ClayModule;
}();

exports.default = new ClayModule();

},{"./helper":3}],5:[function(require,module,exports){
'use strict';

var helper = require('../helper').default;

var REX_EVENT_SPRITTER = /\s+/;

exports.default = function factory(context) {
  return new ClayEvent(context.root, context.events || {});
};

var ClayEvent = function() {
  var ClayEvent = function ClayEvent(el, events) {
    this.currentHandlers = [];
    this.setEl(el);
    this.setEvents(events);
  };

  Object.defineProperties(ClayEvent.prototype, {
    setEl: {
      writable: true,

      value: function(el) {
        this.el = el;
      }
    },

    setEvents: {
      writable: true,

      value: function(events) {
        this.events = events;
      }
    },

    enable: {
      writable: true,

      value: function(context) {
        var i = 0, keys = Object.keys(this.events),
            eventAndSelector, methodOrName, handler;

        context = context || this;

        while ((eventAndSelector = keys[i++])) {
          methodOrName = this.events[eventAndSelector];
          handler = helper.isFunction(methodOrName) ? methodOrName
                                                    : context[methodOrName];
          eventAndSelector = eventAndSelector.split(REX_EVENT_SPRITTER);
          this.on(eventAndSelector[0], eventAndSelector[1], handler, context);
        }
      }
    },

    on: {
      writable: true,

      value: function(event, selector, handler, context) {
        var delegated = this.createHandler(selector, handler).bind(context);
        this.currentHandlers.push({
          event   : event,
          handler : delegated
        });
        this.el.addEventListener(event, delegated, true);
      }
    },

    createHandler: {
      writable: true,

      value: function(selector, handler) {
        /**
         * @param {Event} evt
         */
        return function(evt) {
          var host   = evt.currentTarget,
              target = evt.target;

          do {
            if (target === host) {
              // not delegate
              break;
            }
            if (helper.matchElement(target, selector)) {
              handler.apply(this, arguments);
              break;
            }
          } while ((target = target.parentNode));
        }
      }
    },

    emit: {
      writable: true,

      value: function(target, type, options, bubble, cancel) {
        var _this = this;

        if (cancel === undefined)
          cancel = true;

        if (bubble === undefined)
          bubble = false;

        if (options === undefined)
          options = {};

        if (helper.isArray(target)) {
          helper.toArray(target)
                .forEach(function(el) {
            return _this.emit(el, type, options, bubble, cancel);
          });
          return;
        }

        var event;
        helper.mix(options, {
          canBubble  : bubble,
          cancelable : cancel,
          view       : window
        });

        switch(type) {
          case 'click':
          case 'dbclick':
          case 'mouseover':
          case 'mousemove':
          case 'mouseout':
          case 'mouseup':
          case 'mousedown':
          case 'mouseenter':
          case 'mouseleave':
          case 'contextmenu':
            event = new MouseEvent(type, options);
            break;
          case 'focus':
          case 'blur':
          case 'focusin':
          case 'focusout':
            event = new FocusEvent(type, options); // TODO implemented in any env?
            break;
          case 'keyup':
          case 'keydown':
          case 'keypress':
            event = new KeyboardEvent(type, options);
            break;
          default:
            event = new Event(type, options);
            break;
        }

        target.dispatchEvent(event);
      }
    },

    disable: {
      writable: true,

      value: function() {
        var i = 0, obj;
        while ((obj = this.currentHandlers[i++])) {
          this.el.removeEventListener(obj.event, obj.handler, true);
        }
        this.currentHandlers = [];
      }
    },

    attachedCallback: {
      writable: true,

      value: function(context) {
        this.enable(context);
      }
    },

    detachedCallback: {
      writable: true,

      value: function(context) {
        this.disable(context);
      }
    }
  });

  return ClayEvent;
}();

},{"../helper":3}],6:[function(require,module,exports){
'use strict';

var element = require('./element').default;
var helper = require('./helper').default;

var REGISTRY_CLAY_ELEMENTS = {};

/**
 * @param {String} name
 * @param {Object} [proto]
 */
function ClayRegister(name, proto) {
  if (proto === undefined)
    proto = {};

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

exports.default = ClayRegister;

},{"./element":2,"./helper":3}],7:[function(require,module,exports){
'use strict';

var helper = require("./helper").default;

exports.default = {
  register: function(name, func) {
    this[name] = func;
  }
};

},{"./helper":3}],8:[function(require,module,exports){
'use strict';

var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var create = require('virtual-dom/create-element');
var helper = require("./helper").default;
var tmplHelper = require("./template-helper").default;

window.requestAnimationFrame  = window.requestAnimationFrame ||
                                window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame;

var STR_EVAL_FUNCTION_SYMBOL = '__EVAL_FUNCTION__';

exports.default = {
  /**
   * @static
   * @param {String} html
   * @param {Object} [scope]
   * @returns {ClayTemplate}
   */
  create: function(html, scope) {
    return new ClayTemplate(html, scope);
  }
};

var ClayTemplate = function() {
  var ClayTemplate = function ClayTemplate(html, scope) {
    if (scope === undefined)
      scope = {};

    this._diffQueue   = [];
    this._invalidated = false;

    this.scope    = scope;

    try {
      this.compiled = JSON.parse(html, function(key, val) {
        if ((val || {})[STR_EVAL_FUNCTION_SYMBOL]) {
          return helper.invoke(Function, val.args);
        }
        return val;
      });
    } catch(e) {
      if (!window.ClayRuntime) {
        throw new Error('Require runtime library for template compiling');
      }
      var compiler = window.ClayRuntime.compiler.create();
      this.compiled = compiler.compileFromHtml(html);
    }
  };

  Object.defineProperties(ClayTemplate.prototype, {
    createVTree: {
      writable: true,

      value: function() {
        return this._currentVTree = convertParsedDomToVTree(this.compiled, this.scope);
      }
    },

    createElement: {
      writable: true,

      value: function(doc) {
        if (doc === undefined)
          doc = document;

        return create(this.createVTree(), {
          document: doc
        });
      }
    },

    invalidate: {
      writable: true,

      value: function() {
        if (this._invalidated) {
          return;
        }
        this._invalidated = true;
        setTimeout(this._update.bind(this), 4);
      }
    },

    _update: {
      writable: true,

      value: function() {
        var current = this._currentVTree,
            updated = convertParsedDomToVTree(this.compiled, this.scope);

        this._diffQueue = diff(current, updated);
        this._currentVTree = updated;

        this._invalidated = false;
      }
    },

    drawLoop: {
      writable: true,

      value: function(targetRoot) {
        var _this = this;
        var patchDOM = function() {
          if (_this._diffQueue) {
            patch(targetRoot, _this._diffQueue);
            _this._diffQueue = null;
          }
          window.requestAnimationFrame(patchDOM);
        };

        patchDOM();
      }
    },

    destroy: {
      writable: true,

      value: function() {
        this.scope = this.compiled = null;
      }
    }
  });

  return ClayTemplate;
}();

/**
 * convert to VirtualNode from DomStructure
 *
 * @param {DomStructure} dom
 * @param {Object} scope
 * @param {Boolean} [ignoreRepeat]
 * @returns {VirtualNode}
 */
function convertParsedDomToVTree(dom, scope, ignoreRepeat) {
  var tag      = dom.name,
      type     = dom.type,
      data     = dom.data,
      orgAttrs = dom.attribs  || {},
      orgStyle = dom.style    || '',
      children = dom.children || [],
      evals    = dom.evaluators,
      attrs    = {},
      style    = {},
      hooks    = {},
      keys, key, i = 0;

  switch(type) {
    case 'tag':

      // if detection
      if (evals.if && !evals.if(scope)) {
        return null;
      }

      // unless detection
      if (evals.unless && evals.unless(scope)) {
        return null;
      }

      // repeat elements
      if (evals.repeat && !ignoreRepeat) {
        return evals.repeat(scope).map(function(childScope) {
          return convertParsedDomToVTree(dom, childScope, true);
        });
      }

      // eval styles
      if (orgStyle) {
        style = evals.style ? evals.style(scope)
                            : orgStyle;
        style = convertCssStringToObject(style);
      }

      // eval attributes
      keys = Object.keys(orgAttrs);
      while ((key = keys[i++])) {
        attrs[key] = evals.attrs[key] ? evals.attrs[key](scope)
                                      : orgAttrs[key];
        if (tmplHelper[key]) {
          hooks[key] = hook(tmplHelper[key], attrs[key]); // TODO enhancement
        }
      }

      // flatten children
      children = children.map(function(child) {
        return convertParsedDomToVTree(child, scope);
      })
                         .filter(function(v) { return !!v; });
      children = helper.flatten(children);

      // create VTree
      return h(tag, helper.mix({
        attributes : attrs,
        style      : style
      }, hooks), children);

    case 'text':
      // eval text
      return String(evals.data ? evals.data(scope) : data);

    case 'comment':
      // ignore
      return null;
  }
}

/**
 * convert to object from style attribute value
 *
 * @param {String} cssStr
 * @returns {Object}
 */
function convertCssStringToObject(cssStr) {
  var cssStrings = cssStr.replace(/\s/g, '').split(';'),
      retStyle   = {},
      i = 0, prop_value;

  while ((prop_value = cssStrings[i++])) {
    prop_value = prop_value.split(':');
    retStyle[prop_value[0]] = prop_value[1];
  }

  return retStyle;
}

var HookWrapper = function() {
  var HookWrapper = function HookWrapper(fn, val) {
    this.fn  = fn;
    this.val = val;
  };

  Object.defineProperties(HookWrapper.prototype, {
    hook: {
      writable: true,

      value: function() {
        this.fn.apply(this, [this.val].concat(helper.toArray(arguments)));
      }
    }
  });

  return HookWrapper;
}();

/**
 * @param {Function} fn
 * @param {*} val
 * @returns {HookWrapper}
 * @constructor
 */
function hook(fn, val) {
  return new HookWrapper(fn, val)
}

},{"./helper":3,"./template-helper":7,"virtual-dom/create-element":10,"virtual-dom/diff":11,"virtual-dom/h":12,"virtual-dom/patch":37}],9:[function(require,module,exports){

},{}],10:[function(require,module,exports){
var createElement = require("vdom/create-element")

module.exports = createElement

},{"vdom/create-element":18}],11:[function(require,module,exports){
var diff = require("vtree/diff")

module.exports = diff

},{"vtree/diff":24}],12:[function(require,module,exports){
var h = require("./h/index.js")

module.exports = h

},{"./h/index.js":13}],13:[function(require,module,exports){
var isArray = require("x-is-array")
var isString = require("x-is-string")

var VNode = require("vtree/vnode.js")
var VText = require("vtree/vtext.js")
var isVNode = require("vtree/is-vnode")
var isVText = require("vtree/is-vtext")
var isWidget = require("vtree/is-widget")

var parseTag = require("./parse-tag")

module.exports = h

function h(tagName, properties, children) {
    var tag, props, childNodes, key

    if (!children) {
        if (isChildren(properties)) {
            children = properties
            properties = undefined
        }
    }

    tag = parseTag(tagName, properties)

    if (!isString(tag)) {
        props = tag.properties
        tag = tag.tagName
    } else {
        props = properties
    }

    if (isArray(children)) {
        var len = children.length

        for (var i = 0; i < len; i++) {
            var child = children[i]
            if (isString(child)) {
                children[i] = new VText(child)
            }
        }

        childNodes = children
    } else if (isString(children)) {
        childNodes = [new VText(children)]
    } else if (isChild(children)) {
        childNodes = [children]
    }

    if (props && "key" in props) {
        key = props.key
        delete props.key
    }

    return new VNode(tag, props, childNodes, key)
}

function isChild(x) {
    return isVNode(x) || isVText(x) || isWidget(x)
}

function isChildren(x) {
    return isArray(x) || isString(x) || isChild(x)
}

},{"./parse-tag":14,"vtree/is-vnode":28,"vtree/is-vtext":29,"vtree/is-widget":30,"vtree/vnode.js":32,"vtree/vtext.js":34,"x-is-array":35,"x-is-string":36}],14:[function(require,module,exports){
var split = require("browser-split")

var classIdSplit = /([\.#]?[a-zA-Z0-9_:-]+)/
var notClassId = /^\.|#/

module.exports = parseTag

function parseTag(tag, props) {
    if (!tag) {
        return "div"
    }

    var noId = !props || !("id" in props)

    var tagParts = split(tag, classIdSplit)
    var tagName = null

    if(notClassId.test(tagParts[1])) {
        tagName = "div"
    }

    var id, classes, part, type, i
    for (i = 0; i < tagParts.length; i++) {
        part = tagParts[i]

        if (!part) {
            continue
        }

        type = part.charAt(0)

        if (!tagName) {
            tagName = part
        } else if (type === ".") {
            classes = classes || []
            classes.push(part.substring(1, part.length))
        } else if (type === "#" && noId) {
            id = part.substring(1, part.length)
        }
    }

    var parsedTags

    if (props) {
        if (id !== undefined && !("id" in props)) {
            props.id = id
        }

        if (classes) {
            if (props.className) {
                classes.push(props.className)
            }

            props.className = classes.join(" ")
        }

        parsedTags = tagName
    } else if (classes || id !== undefined) {
        var properties = {}

        if (id !== undefined) {
            properties.id = id
        }

        if (classes) {
            properties.className = classes.join(" ")
        }

        parsedTags = {
            tagName: tagName,
            properties: properties
        }
    } else {
        parsedTags = tagName
    }

    return parsedTags
}

},{"browser-split":15}],15:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],16:[function(require,module,exports){
module.exports = isObject

function isObject(x) {
    return typeof x === "object" && x !== null
}

},{}],17:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("vtree/is-vhook")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, props, previous, propName);
        } else if (isHook(propValue)) {
            propValue.hook(node,
                propName,
                previous ? previous[propName] : undefined)
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else if (propValue !== undefined) {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, props, previous, propName) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"is-object":16,"vtree/is-vhook":27}],18:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("vtree/is-vnode")
var isVText = require("vtree/is-vtext")
var isWidget = require("vtree/is-widget")
var handleThunk = require("vtree/handle-thunk")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"./apply-properties":17,"global/document":20,"vtree/handle-thunk":25,"vtree/is-vnode":28,"vtree/is-vtext":29,"vtree/is-widget":30}],19:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],20:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":9}],21:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("vtree/is-widget")
var VPatch = require("vtree/vpatch")

var render = require("./create-element")
var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = render(vText, renderOptions)

        if (parentNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    destroyWidget(domNode, leftVNode)

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    if (updateWidget(leftVNode, widget)) {
        return widget.update(leftVNode, domNode) || domNode
    }

    var parentNode = domNode.parentNode
    var newWidget = render(widget, renderOptions)

    if (parentNode) {
        parentNode.replaceChild(newWidget, domNode)
    }

    destroyWidget(domNode, leftVNode)

    return newWidget
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    destroyWidget(domNode, leftVNode)

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, bIndex) {
    var children = []
    var childNodes = domNode.childNodes
    var len = childNodes.length
    var i
    var reverseIndex = bIndex.reverse

    for (i = 0; i < len; i++) {
        children.push(domNode.childNodes[i])
    }

    var insertOffset = 0
    var move
    var node
    var insertNode
    for (i = 0; i < len; i++) {
        move = bIndex[i]
        if (move !== undefined && move !== i) {
            // the element currently at this index will be moved later so increase the insert offset
            if (reverseIndex[i] > i) {
                insertOffset++
            }

            node = children[move]
            insertNode = childNodes[i + insertOffset] || null
            if (node !== insertNode) {
                domNode.insertBefore(node, insertNode)
            }

            // the moved element came from the front of the array so reduce the insert offset
            if (move < i) {
                insertOffset--
            }
        }

        // element at this index is scheduled to be removed so increase insert offset
        if (i in bIndex.removes) {
            insertOffset++
        }
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        console.log(oldRoot)
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"./apply-properties":17,"./create-element":18,"./update-widget":23,"vtree/is-widget":30,"vtree/vpatch":33}],22:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches) {
    return patchRecursive(rootNode, patches)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions) {
        renderOptions = { patch: patchRecursive }
        if (ownerDocument !== document) {
            renderOptions.document = ownerDocument
        }
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./dom-index":19,"./patch-op":21,"global/document":20,"x-is-array":35}],23:[function(require,module,exports){
var isWidget = require("vtree/is-widget")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"vtree/is-widget":30}],24:[function(require,module,exports){
var isArray = require("x-is-array")
var isObject = require("is-object")

var VPatch = require("./vpatch")
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var handleThunk = require("./handle-thunk")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        if (isThunk(a) || isThunk(b)) {
            thunks(a, b, patch, index)
        } else {
            hooks(b, patch, index)
        }
        return
    }

    var apply = patch[index]

    if (b == null) {
        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
        destroyWidgets(a, patch, index)
    } else if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties, b.hooks)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                destroyWidgets(a, patch, index)
            }

            apply = diffChildren(a, b, patch, apply, index)
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            destroyWidgets(a, patch, index)
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            destroyWidgets(a, patch, index)
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))

        if (!isWidget(a)) {
            destroyWidgets(a, patch, index)
        }
    }

    if (apply) {
        patch[index] = apply
    }
}

function diffProps(a, b, hooks) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (hooks && aKey in hooks) {
            diff = diff || {}
            diff[aKey] = bValue
        } else {
            if (isObject(aValue) && isObject(bValue)) {
                if (getPrototype(bValue) !== getPrototype(aValue)) {
                    diff = diff || {}
                    diff[aKey] = bValue
                } else {
                    var objectDiff = diffProps(aValue, bValue)
                    if (objectDiff) {
                        diff = diff || {}
                        diff[aKey] = objectDiff
                    }
                }
            } else if (aValue !== bValue) {
                diff = diff || {}
                diff[aKey] = bValue
            }
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var bChildren = reorder(aChildren, b.children)

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else if (!rightNode) {
            if (leftNode) {
                // Excess nodes in a need to be removed
                patch[index] = new VPatch(VPatch.REMOVE, leftNode, null)
                destroyWidgets(leftNode, patch, index)
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (bChildren.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(VPatch.ORDER, a, bChildren.moves))
    }

    return apply
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = new VPatch(VPatch.REMOVE, vNode, null)
        }
    } else if (isVNode(vNode) && vNode.hasWidgets) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b);
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true;
        }
    }

    return false;
}

// Execute hooks when two nodes are identical
function hooks(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = new VPatch(VPatch.PROPS, vNode.hooks, vNode.hooks)
        }

        if (vNode.descendantHooks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                hooks(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    }
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {

    var bKeys = keyIndex(bChildren)

    if (!bKeys) {
        return bChildren
    }

    var aKeys = keyIndex(aChildren)

    if (!aKeys) {
        return bChildren
    }

    var bMatch = {}, aMatch = {}

    for (var key in bKeys) {
        bMatch[bKeys[key]] = aKeys[key]
    }

    for (var key in aKeys) {
        aMatch[aKeys[key]] = bKeys[key]
    }

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen
    var shuffle = []
    var freeIndex = 0
    var i = 0
    var moveIndex = 0
    var moves = {}
    var removes = moves.removes = {}
    var reverse = moves.reverse = {}
    var hasMoves = false

    while (freeIndex < len) {
        var move = aMatch[i]
        if (move !== undefined) {
            shuffle[i] = bChildren[move]
            if (move !== moveIndex) {
                moves[move] = moveIndex
                reverse[moveIndex] = move
                hasMoves = true
            }
            moveIndex++
        } else if (i in aMatch) {
            shuffle[i] = undefined
            removes[i] = moveIndex++
            hasMoves = true
        } else {
            while (bMatch[freeIndex] !== undefined) {
                freeIndex++
            }

            if (freeIndex < len) {
                var freeChild = bChildren[freeIndex]
                if (freeChild) {
                    shuffle[i] = freeChild
                    if (freeIndex !== moveIndex) {
                        hasMoves = true
                        moves[freeIndex] = moveIndex
                        reverse[moveIndex] = freeIndex
                    }
                    moveIndex++
                }
                freeIndex++
            }
        }
        i++
    }

    if (hasMoves) {
        shuffle.moves = moves
    }

    return shuffle
}

function keyIndex(children) {
    var i, keys

    for (i = 0; i < children.length; i++) {
        var child = children[i]

        if (child.key !== undefined) {
            keys = keys || {}
            keys[child.key] = i
        }
    }

    return keys
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"./handle-thunk":25,"./is-thunk":26,"./is-vnode":28,"./is-vtext":29,"./is-widget":30,"./vpatch":33,"is-object":16,"x-is-array":35}],25:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":26,"./is-vnode":28,"./is-vtext":29,"./is-widget":30}],26:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],27:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook && typeof hook.hook === "function" &&
        !hook.hasOwnProperty("hook")
}

},{}],28:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":31}],29:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":31}],30:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],31:[function(require,module,exports){
module.exports = "1"

},{}],32:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property)) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-vhook":27,"./is-vnode":28,"./is-widget":30,"./version":31}],33:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":31}],34:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":31}],35:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],36:[function(require,module,exports){
var toString = Object.prototype.toString

module.exports = isString

function isString(obj) {
    return toString.call(obj) === "[object String]"
}

},{}],37:[function(require,module,exports){
var patch = require("vdom/patch")

module.exports = patch

},{"vdom/patch":22}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9kaXN0L3RlbXAvX2luZGV4LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvZGlzdC90ZW1wL2VsZW1lbnQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9kaXN0L3RlbXAvaGVscGVyLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvZGlzdC90ZW1wL21vZHVsZS5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL2Rpc3QvdGVtcC9tb2R1bGVzL2V2ZW50LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvZGlzdC90ZW1wL3JlZ2lzdGVyLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvZGlzdC90ZW1wL3RlbXBsYXRlLWhlbHBlci5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL2Rpc3QvdGVtcC90ZW1wbGF0ZS5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvZW1wdHkuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vY3JlYXRlLWVsZW1lbnQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vZGlmZi5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9oLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2gvaW5kZXguanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vaC9wYXJzZS10YWcuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL2Jyb3dzZXItc3BsaXQvaW5kZXguanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL2lzLW9iamVjdC9pbmRleC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdmRvbS9hcHBseS1wcm9wZXJ0aWVzLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL2NyZWF0ZS1lbGVtZW50LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL2RvbS1pbmRleC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdmRvbS9ub2RlX21vZHVsZXMvZ2xvYmFsL2RvY3VtZW50LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL3BhdGNoLW9wLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL3BhdGNoLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL3VwZGF0ZS13aWRnZXQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2RpZmYuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2hhbmRsZS10aHVuay5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdGh1bmsuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXZob29rLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS9pcy12bm9kZS5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdnRleHQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXdpZGdldC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvdmVyc2lvbi5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvdm5vZGUuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL3ZwYXRjaC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvdnRleHQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3gtaXMtYXJyYXkvaW5kZXguanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3gtaXMtc3RyaW5nL2luZGV4LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3BhdGNoLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGF5UmVnaXN0ZXIgPSByZXF1aXJlKCcuL3JlZ2lzdGVyJykuZGVmYXVsdDtcbnZhciBoZWxwZXIgPSByZXF1aXJlKCcuL2hlbHBlcicpLmRlZmF1bHQ7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJykuZGVmYXVsdDtcbnZhciB0ZW1wbGF0ZUhlbHBlciA9IHJlcXVpcmUoJy4vdGVtcGxhdGUtaGVscGVyJykuZGVmYXVsdDtcbnZhciBlbGVtZW50ID0gcmVxdWlyZSgnLi9lbGVtZW50JykuZGVmYXVsdDtcbnZhciBtb2R1bGVSZWdpc3RyeSA9IHJlcXVpcmUoJy4vbW9kdWxlJykuZGVmYXVsdDtcbnZhciBtb2RFdmVudCA9IHJlcXVpcmUoJy4vbW9kdWxlcy9ldmVudCcpLmRlZmF1bHQ7XG5cbi8qKlxuICogQGNsYXNzIENsYXlsdW1wXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG53aW5kb3cuQ2xheWx1bXAgPSBoZWxwZXIubWl4KENsYXlSZWdpc3Rlciwge1xuICBlbGVtZW50ICAgICAgICA6IGVsZW1lbnQsXG4gIGhlbHBlciAgICAgICAgIDogaGVscGVyLFxuICB0ZW1wbGF0ZSAgICAgICA6IHRlbXBsYXRlLFxuICB0ZW1wbGF0ZUhlbHBlciA6IHRlbXBsYXRlSGVscGVyLFxuICBtb2R1bGVzICAgICAgICA6IG1vZHVsZVJlZ2lzdHJ5XG59KTtcblxubW9kdWxlUmVnaXN0cnkucmVnaXN0ZXIoJ0RPTUV2ZW50RGVsZWdhdGUnLCBtb2RFdmVudCk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX3NsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyID0gcmVxdWlyZSgnLi9oZWxwZXInKS5kZWZhdWx0O1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpLmRlZmF1bHQ7XG52YXIgbW9kdWxlUmVnaXN0cnkgPSByZXF1aXJlKCcuL21vZHVsZScpLmRlZmF1bHQ7XG5cbnZhciBSRUdJU1RSWV9DTEFZX1BST1RPVFlQRVMgPSB7fTtcblxuZXhwb3J0cy5kZWZhdWx0ID0ge1xuICAvKipcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcGFyYW0ge09iamVjdH0gcHJvdG9cbiAgICogQHJldHVybnMge0NsYXlFbGVtZW50fVxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbihuYW1lLCBwcm90bykge1xuXG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgLyoqXG4gICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICogQHByb3BlcnR5IHtEb2N1bWVudH0gX2RvY1xuICAgICAgICovXG4gICAgICBfZG9jOiAgZG9jdW1lbnQuX2N1cnJlbnRTY3JpcHQgPyBkb2N1bWVudC5fY3VycmVudFNjcmlwdC5vd25lckRvY3VtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBkb2N1bWVudC5jdXJyZW50U2NyaXB0ID8gZG9jdW1lbnQuY3VycmVudFNjcmlwdC5vd25lckRvY3VtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogZG9jdW1lbnQsXG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAbWV0aG9kIHtGdW5jdGlvbn0gX2NyZWF0ZWRcbiAgICAgICAqL1xuICAgICAgX2NyZWF0ZWQ6IGhlbHBlci5pc0Z1bmN0aW9uKHByb3RvLmNyZWF0ZWRDYWxsYmFjaykgPyBwcm90by5jcmVhdGVkQ2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaGVscGVyLm5vb3AsXG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAbWV0aG9kIHtGdW5jdGlvbn0gX2F0dGFjaGVkXG4gICAgICAgKi9cbiAgICAgIF9hdHRhY2hlZDogaGVscGVyLmlzRnVuY3Rpb24ocHJvdG8uYXR0YWNoZWRDYWxsYmFjaykgPyBwcm90by5hdHRhY2hlZENhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaGVscGVyLm5vb3AsXG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAbWV0aG9kIHtGdW5jdGlvbn0gX2RldGFjaGVkXG4gICAgICAgKi9cbiAgICAgIF9kZXRhY2hlZDogaGVscGVyLmlzRnVuY3Rpb24ocHJvdG8uZGV0YWNoZWRDYWxsYmFjaykgPyBwcm90by5kZXRhY2hlZENhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaGVscGVyLm5vb3AsXG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAbWV0aG9kIHtGdW5jdGlvbn0gX2F0dHJDaGFuZ2VkXG4gICAgICAgKi9cbiAgICAgIF9hdHRyQ2hhbmdlZDogaGVscGVyLmlzRnVuY3Rpb24ocHJvdG8uYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKSA/IHByb3RvLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaGVscGVyLm5vb3AsXG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAcHJvcGVydHkge1N0cmluZ30gX2h0bWxcbiAgICAgICAqL1xuICAgICAgX2h0bWw6ICcnLFxuXG4gICAgICAvKipcbiAgICAgICAqIEBwcm9wZXJ0eSB7RWxlbWVudH0gcm9vdFxuICAgICAgICovXG4gICAgICByb290OiBudWxsLFxuXG4gICAgICAvKipcbiAgICAgICAqIEBwcm9wZXJ0eSB7Q2xheVRlbXBsYXRlfSB0ZW1wbGF0ZVxuICAgICAgICovXG4gICAgICB0ZW1wbGF0ZTogbnVsbCxcblxuICAgICAgLyoqXG4gICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2NvcGVcbiAgICAgICAqL1xuICAgICAgc2NvcGUgOiB7fSxcblxuICAgICAgLyoqXG4gICAgICAgKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCBmdW5jdGlvbj59IHVzZVxuICAgICAgICovXG4gICAgICB1c2U6IHt9XG4gICAgfTtcblxuICAgIC8vIGRlZmF1bHRzXG4gICAgaGVscGVyLm1peChwcm90bywgZGVmYXVsdHMpO1xuICAgIGhlbHBlci5taXgocHJvdG8udXNlLCB7XG4gICAgICBldmVudCA6ICdET01FdmVudERlbGVnYXRlJ1xuICAgIH0pO1xuXG4gICAgLy8gZG9tIHJlYWR5IHJlcXVpcmVkXG4gICAgaGVscGVyLnJlYWR5KGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHRlbXBsYXRlID0gcHJvdG8uX2RvYy5xdWVyeVNlbGVjdG9yKCdbY2wtZWxlbWVudD1cIicrbmFtZSsnXCJdJyk7XG4gICAgICBwcm90by5faHRtbCAgPSB0ZW1wbGF0ZSA/IHRlbXBsYXRlLmlubmVySFRNTCA6ICcnO1xuICAgIH0pO1xuXG4gICAgLy8gZXh0ZW5kcyBlbGVtZW50XG4gICAgdmFyIGV4dGVuZHNQcm90bztcbiAgICBpZiAocHJvdG8uZXh0ZW5kcykge1xuICAgICAgLy8gRklYTUUgY2Fubm90IHVzZSBgaXM9XCJ4LWNoaWxkXCJgIGluIGA8dGVtcGxhdGU+YFxuXG4gICAgICBpZiAoaGVscGVyLmlzQ3VzdG9tRWxlbWVudE5hbWUocHJvdG8uZXh0ZW5kcykgJiZcbiAgICAgICAgICAoZXh0ZW5kc1Byb3RvID0gZ2V0RXh0ZW5kZWUocHJvdG8uZXh0ZW5kcykpKSB7XG5cbiAgICAgICAgLy8gZXh0ZW5kcyBjdXN0b20gZWxlbWVudFxuICAgICAgICAvLyBGSVhNRSBjcmVhdGUgYmFzZUVsZW1lbnRzIHByb3RvdHlwZSBieSBkZWVwbHkgY2xvbmVcbiAgICAgICAgaGVscGVyLm1peChwcm90by5zY29wZSwgZXh0ZW5kc1Byb3RvLnNjb3BlKTtcbiAgICAgICAgaGVscGVyLm1peChwcm90by51c2UsICAgZXh0ZW5kc1Byb3RvLnVzZSk7XG4gICAgICAgIGhlbHBlci5taXgocHJvdG8gICAgICAsIGV4dGVuZHNQcm90byk7XG4gICAgICAgIHByb3RvLl9fc3VwZXJfXyA9IGV4dGVuZHNQcm90bztcbiAgICAgICAgZXh0ZW5kc1Byb3RvICAgID0gSFRNTEVsZW1lbnQucHJvdG90eXBlO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBleHRlbmRzUHJvdG8gPSBPYmplY3QuY3JlYXRlKHByb3RvLl9kb2MuY3JlYXRlRWxlbWVudChwcm90by5leHRlbmRzKS5jb25zdHJ1Y3RvcikucHJvdG90eXBlO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5ldyBjdXN0b20gZWxlbWVudFxuICAgICAgZXh0ZW5kc1Byb3RvID0gSFRNTEVsZW1lbnQucHJvdG90eXBlO1xuICAgIH1cblxuICAgIC8vIHJlZ2lzdGVyIHByb3RvdHlwZSBmb3IgZXh0ZW5kc1xuICAgIFJFR0lTVFJZX0NMQVlfUFJPVE9UWVBFU1tuYW1lXSA9IGhlbHBlci5jbG9uZShwcm90byk7XG5cbiAgICAvLyBtaXggY2xheWx1bXAgaW1wbGVtZW50YXRpb25cbiAgICBoZWxwZXIubWl4KHByb3RvLCBDbGF5RWxlbWVudEltcGwsIHRydWUpO1xuXG4gICAgcmV0dXJuIGhlbHBlci5taXgoT2JqZWN0LmNyZWF0ZShleHRlbmRzUHJvdG8pLCBwcm90byk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGdldEV4dGVuZGVlKG5hbWUpIHtcbiAgdmFyIHByb3RvID0gUkVHSVNUUllfQ0xBWV9QUk9UT1RZUEVTW25hbWVdO1xuICBpZiAoIXByb3RvKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZXh0ZW5kcyBgJyArIG5hbWUgKyAnYCwgYmVjYXVzZSBub3QgcmVnaXN0ZXJlZCcpO1xuICB9XG4gIHJldHVybiBwcm90bztcbn1cblxuLyoqXG4gKiBAaW1wbGVtZW50cyBDbGF5RWxlbWVudFxuICovXG52YXIgQ2xheUVsZW1lbnRJbXBsID0ge1xuICAvKipcbiAgICogaW5qZWN0IHV0aWxpdHkgd2l0aCBlbGVtZW50IGluc3RhbmNlXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5qZWN0VXNlT2JqZWN0OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnVzZSB8fCB7fSksIGkgPSAwLCBhbGlhcywgZmFjdG9yeTtcblxuICAgIHdoaWxlICgoYWxpYXMgPSBrZXlzW2krK10pKSB7XG4gICAgICBpZiAoc2VsZlthbGlhc10pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25mbGljdCBhc3NpZ24gcHJvcGVydHkgYCcgKyBhbGlhcyArICdgIScpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGVscGVyLmlzU3RyaW5nKHRoaXMudXNlW2FsaWFzXSkpIHtcbiAgICAgICAgZmFjdG9yeSA9IG1vZHVsZVJlZ2lzdHJ5LmxvYWQoW3RoaXMudXNlW2FsaWFzXV0pO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoaGVscGVyLmlzRnVuY3Rpb24odGhpcy51c2VbYWxpYXNdKSkge1xuICAgICAgICBmYWN0b3J5ID0gdGhpcy51c2VbYWxpYXNdO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGRldGVjdCBtb2R1bGUgZmFjdG9yeScpO1xuICAgICAgfVxuXG4gICAgICBzZWxmW2FsaWFzXSA9IGZhY3RvcnkodGhpcyk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBwcm90ZWN0IG9iamVjdCByZWZlcmVuY2UgaW4gcHJvdG90eXBlLnNjb3BlXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY2xvbmVTY29wZU9iamVjdHM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY29wZSA9IHRoaXMuc2NvcGUsXG4gICAgICAgIGtleXMgPSBPYmplY3Qua2V5cyhzY29wZSksIGkgPSAwLCBrZXk7XG5cbiAgICB3aGlsZSAoKGtleSA9IGtleXNbaSsrXSkpIHtcbiAgICAgIGlmICh0eXBlb2Ygc2NvcGVba2V5XSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgLy8gRklYTUUgY3JlYXRlIG93biBvYmplY3R8YXJyYXkgYnkgZGVlcGx5IGNsb25lXG4gICAgICAgIHNjb3BlW2tleV0gPSBoZWxwZXIuY2xvbmUoc2NvcGVba2V5XSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBzaG9ydGhhbmQgb2YgYHRlbXBsYXRlLmludmFsaWRhdGUoKWBcbiAgICovXG4gIGludmFsaWRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGVtcGxhdGUuaW52YWxpZGF0ZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBjaGlsZHJlbiBmaW5kZXJcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gICAqIEByZXR1cm5zIHs/RWxlbWVudHxBcnJheX1cbiAgICovXG4gIGZpbmQ6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgdmFyIGZvdW5kID0gaGVscGVyLnRvQXJyYXkodGhpcy5yb290LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcblxuICAgIGlmIChmb3VuZC5sZW5ndGggPD0gMSkge1xuICAgICAgcmV0dXJuIGZvdW5kWzBdIHx8IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmb3VuZDtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIGNsb3Nlc3QgcGFyZW50IGhlbHBlclxuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR8QXJyYXl9IGVsXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvclxuICAgKiBAcmV0dXJucyB7P0VsZW1lbnR8QXJyYXl9XG4gICAqL1xuICBjbG9zZXN0T2Y6IGZ1bmN0aW9uKGVsLCBzZWxlY3Rvcikge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgaWYgKGhlbHBlci5pc0FycmF5KGVsKSkge1xuICAgICAgcmV0dXJuIGVsLm1hcChmdW5jdGlvbihlKSB7XG4gICAgICAgIHJldHVybiBfdGhpcy5jbG9zZXN0T2YoZSwgc2VsZWN0b3IpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdmFyIGN1cnJlbnQgPSAvKiogQHR5cGUge0VsZW1lbnR9ICovIGVsLnBhcmVudE5vZGU7XG4gICAgZG8ge1xuICAgICAgaWYgKGN1cnJlbnQgPT09IHRoaXMucm9vdCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmIChoZWxwZXIubWF0Y2hFbGVtZW50KGN1cnJlbnQsIHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gY3VycmVudDtcbiAgICAgIH1cbiAgICB9IHdoaWxlICgoY3VycmVudCA9IGN1cnJlbnQucGFyZW50Tm9kZSkpO1xuXG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIGFuIGluc3RhbmNlIG9mIHRoZSBlbGVtZW50IGlzIGNyZWF0ZWRcbiAgICogZXhlY3V0ZSBzZXZlcmFsIGluaXRpYWxpemUgcHJvY2Vzc2VzXG4gICAqL1xuICBjcmVhdGVkQ2FsbGJhY2sgOiBmdW5jdGlvbigpIHtcblxuICAgIC8vIGNyZWF0ZSB2aXJ0dWFsIHRlbXBsYXRlICYgYWN0dWFsIGRvbVxuICAgIHRoaXMuY3JlYXRlU2hhZG93Um9vdCgpO1xuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZS5jcmVhdGUodGhpcy5faHRtbCwgdGhpcy5zY29wZSk7IC8vIFRPRE9cbiAgICB0aGlzLnJvb3QgICAgID0gdGhpcy50ZW1wbGF0ZS5jcmVhdGVFbGVtZW50KHRoaXMuX2RvYyk7XG4gICAgaWYgKCF0aGlzLnJvb3QpIHtcbiAgICAgIHRoaXMucm9vdCA9IHRoaXMuX2RvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB9XG5cbiAgICAvLyBzZXQgcm9vdCBlbGVtZW50XG4gICAgdGhpcy5zaGFkb3dSb290LmFwcGVuZENoaWxkKHRoaXMucm9vdCk7XG4gICAgdGhpcy50ZW1wbGF0ZS5kcmF3TG9vcCh0aGlzLnJvb3QpO1xuXG4gICAgLy8gcmVzb2x2ZSB1c2UgaW5qZWN0aW9uXG4gICAgdGhpcy5faW5qZWN0VXNlT2JqZWN0KCk7XG5cbiAgICAvLyBjbG9uZSBvYmplY3RzXG4gICAgdGhpcy5fY2xvbmVTY29wZU9iamVjdHMoKTtcblxuICAgIC8vIG9yaWdpbmFsXG4gICAgdGhpcy5fY3JlYXRlZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBhbiBpbnN0YW5jZSB3YXMgaW5zZXJ0ZWQgaW50byB0aGUgZG9jdW1lbnRcbiAgICogY2FsbCBvcmlnaW5hbCBhdHRhY2hlZCBjYWxsYmFja1xuICAgKi9cbiAgYXR0YWNoZWRDYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5kZWxlZ2F0ZU1vZHVsZUNhbGxiYWNrcygnYXR0YWNoZWRDYWxsYmFjaycpO1xuXG4gICAgLy8gb3JpZ2luYWxcbiAgICB0aGlzLl9hdHRhY2hlZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBhbiBpbnN0YW5jZSB3YXMgcmVtb3ZlZCBmcm9tIHRoZSBkb2N1bWVudFxuICAgKiBjYWxsIG9yaWdpbmFsIGRldGFjaGVkIGNhbGxiYWNrXG4gICAqL1xuICBkZXRhY2hlZENhbGxiYWNrIDogZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmRlbGVnYXRlTW9kdWxlQ2FsbGJhY2tzKCdkZXRhY2hlZENhbGxiYWNrJyk7XG5cbiAgICAvLyBvcmlnaW5hbFxuICAgIHRoaXMuX2RldGFjaGVkLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIGFuIGF0dHJpYnV0ZSB3YXMgYWRkZWQsIHJlbW92ZWQsIG9yIHVwZGF0ZWRcbiAgICogY2FsbCBvcmlnaW5hbCBhdHRyIGNoYW5nZWQgY2FsbGJhY2tcbiAgICovXG4gIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gb3JpZ2luYWxcbiAgICB0aGlzLl9hdHRyQ2hhbmdlZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gY2FsbGJhY2tNZXRob2RcbiAgICovXG4gIGRlbGVnYXRlTW9kdWxlQ2FsbGJhY2tzIDogZnVuY3Rpb24oY2FsbGJhY2tNZXRob2QpIHtcbiAgICB2YXIgYWxpYXNlcyA9IE9iamVjdC5rZXlzKHRoaXMudXNlKSxcbiAgICAgICAgYWxpYXMsIG1vZHVsZSwgY2FsbGJhY2ssIGkgPSAwO1xuXG4gICAgd2hpbGUgKChhbGlhcyA9IGFsaWFzZXNbaSsrXSkpIHtcbiAgICAgIG1vZHVsZSA9IHRoaXNbYWxpYXNdO1xuICAgICAgY2FsbGJhY2sgPSBtb2R1bGVbY2FsbGJhY2tNZXRob2RdO1xuICAgICAgaWYgKGhlbHBlci5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBjYWxsYmFjay5hcHBseShtb2R1bGUsIFt0aGlzXSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBjYWxsIHN1cGVyIGVsZW1lbnQncyBtZXRob2RzXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2ROYW1lXG4gICAqIEBwYXJhbSB7Li4uKn0gYXJnc1xuICAgKi9cbiAgc3VwZXI6IGZ1bmN0aW9uKG1ldGhvZE5hbWUpIHtcbiAgICB2YXIgYXJncyA9IF9zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKCF0aGlzLl9fc3VwZXJfXykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIGVsZW1lbnQgZG9lcyBub3QgaGF2ZSB0aGUgYF9fc3VwZXJfX2AnKTtcbiAgICB9XG5cbiAgICB2YXIgc3VwZXJNZXRob2QgPSB0aGlzLl9fc3VwZXJfX1ttZXRob2ROYW1lXTtcblxuICAgIGlmIChoZWxwZXIuaXNGdW5jdGlvbihzdXBlck1ldGhvZCkpIHtcbiAgICAgIHJldHVybiBzdXBlck1ldGhvZC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEb2VzIG5vdCBleGlzdHMgbWV0aG9kIGluIHN1cGVyIGVsZW1lbnQgc3BlY2lmaWVkOiAnICsgc3VwZXJNZXRob2QpO1xuICAgIH1cbiAgfVxufTsiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICogQHBhcmFtIHtCb29sZWFufSBbb3ZlcndyaXRlXVxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5mdW5jdGlvbiBtaXgodG8sIGZyb20sIG92ZXJ3cml0ZSkge1xuICB2YXIgaSA9IDAsIGtleXMgPSBPYmplY3Qua2V5cyhmcm9tKSwgcHJvcDtcblxuICB3aGlsZSAoKHByb3AgPSBrZXlzW2krK10pKSB7XG4gICAgaWYgKG92ZXJ3cml0ZSB8fCAhdG9bcHJvcF0pIHtcbiAgICAgIHRvW3Byb3BdID0gZnJvbVtwcm9wXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRvO1xufVxuXG4vKipcbiAqIHNoYWxsb3cgZmxhdHRlblxuICogQHBhcmFtIHtBcnJheX0gbGlzdFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiBmbGF0dGVuKGxpc3QpIHtcbiAgdmFyIGkgPSAwLCBpdGVtLCByZXQgPSBbXTtcbiAgd2hpbGUgKChpdGVtID0gbGlzdFtpKytdKSkge1xuICAgIGlmIChpc0FycmF5KGl0ZW0pKSB7XG4gICAgICByZXQgPSByZXQuY29uY2F0KGl0ZW0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXQucHVzaChpdGVtKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY2xvbmUob2JqKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IG1peCh7fSwgb2JqKVxufVxuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHVuaXEoYXJyYXkpIHtcbiAgdmFyIHJldCA9IFtdLCBpID0gMCwgaXRlbTtcblxuICB3aGlsZSAoKGl0ZW0gPSBhcnJheVtpKytdKSkge1xuICAgIGlmIChyZXQuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgIHJldC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIGdldCBjYWNoZWQgYG1hdGNoZXNTZWxlY3RvcmAgbWV0aG9kIG5hbWVcbiAqL1xudmFyIG1hdGNoZXJOYW1lO1xuZnVuY3Rpb24gZ2V0TWF0Y2hlck5hbWUoKSB7XG4gIGlmIChtYXRjaGVyTmFtZSkge1xuICAgIHJldHVybiBtYXRjaGVyTmFtZTtcbiAgfVxuXG4gIHZhciBsaXN0ICA9IFsnbWF0Y2hlcycsICd3ZWJraXRNYXRjaGVzU2VsZWN0b3InLCAnbW96TWF0Y2hlc1NlbGVjdG9yJywgJ21zTWF0Y2hlc1NlbGVjdG9yJ10sXG4gICAgICBwcm90byA9IEhUTUxFbGVtZW50LnByb3RvdHlwZSwgaSA9IDAsIG5hbWU7XG5cbiAgd2hpbGUoKG5hbWUgPSBsaXN0W2krK10pKSB7XG4gICAgaWYgKHByb3RvW25hbWVdKSB7XG4gICAgICBtYXRjaGVyTmFtZSA9IG5hbWU7XG4gICAgICByZXR1cm4gbWF0Y2hlck5hbWU7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogbWF0Y2ggZWxlbWVudCB3aXRoIHNlbGVjdG9yXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBtYXRjaEVsZW1lbnQoZWxlbWVudCwgc2VsZWN0b3IpIHtcbiAgcmV0dXJuIGVsZW1lbnRbZ2V0TWF0Y2hlck5hbWUoKV0oc2VsZWN0b3IpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHRvU3RyaW5nKHZhbHVlKSB7XG4gIHZhciBvYmpTdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICByZXR1cm4gb2JqU3RyLnNsaWNlKG9ialN0ci5pbmRleE9mKCcgJykgKyAxLCAtMSk7XG59XG5cbi8qKlxuICogZmFrZSBhcnJheSAobGlrZSBOb2RlTGlzdCwgQXJndW1lbnRzIGV0YykgY29udmVydCB0byBBcnJheVxuICogQHBhcmFtIHsqfSBmYWtlQXJyYXlcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gdG9BcnJheShmYWtlQXJyYXkpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZha2VBcnJheSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5KHZhbHVlKSB7XG4gIHJldHVybiB0b1N0cmluZyh2YWx1ZSkgPT09ICdBcnJheSc7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiB0b1N0cmluZyh2YWx1ZSkgPT09ICdPYmplY3QnO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7U3RyaW5nfSBsb2NhbE5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0N1c3RvbUVsZW1lbnROYW1lKGxvY2FsTmFtZSkge1xuICByZXR1cm4gbG9jYWxOYW1lLmluZGV4T2YoJy0nKSAhPT0gLTE7XG59XG5cbi8qKlxuICogQHNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE2MDY3OTcvdXNlLW9mLWFwcGx5LXdpdGgtbmV3LW9wZXJhdG9yLWlzLXRoaXMtcG9zc2libGUvMTM5MzE2MjcjMTM5MzE2MjdcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzXG4gKiBAcmV0dXJucyB7aW52b2tlLkZ9XG4gKi9cbmZ1bmN0aW9uIGludm9rZShjb25zdHJ1Y3RvciwgYXJncykge1xuICB2YXIgZjtcbiAgZnVuY3Rpb24gRigpIHtcbiAgICAvLyBjb25zdHJ1Y3RvciByZXR1cm5zICoqdGhpcyoqXG4gICAgcmV0dXJuIGNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG4gIEYucHJvdG90eXBlID0gY29uc3RydWN0b3IucHJvdG90eXBlO1xuICBmID0gbmV3IEYoKTtcbiAgZi5jb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yO1xuICByZXR1cm4gZjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIHJlYWR5KGhhbmRsZXIpIHtcbiAgaWYgKEZMR19ET01fQUxSRUFEWSkge1xuICAgIGhhbmRsZXIoKTtcbiAgfSBlbHNlIHtcbiAgICBTVEFDS19SRUFEWV9IQU5ETEVSUy5wdXNoKGhhbmRsZXIpO1xuICB9XG59XG5cbnZhciBGTEdfRE9NX0FMUkVBRFkgICAgICA9IGZhbHNlLFxuICAgIFNUQUNLX1JFQURZX0hBTkRMRVJTID0gW107XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgRkxHX0RPTV9BTFJFQURZID0gdHJ1ZTtcbiAgdmFyIGkgPSAwLCByZWFkeTtcbiAgd2hpbGUgKHJlYWR5ID0gU1RBQ0tfUkVBRFlfSEFORExFUlNbaSsrXSkge1xuICAgIHJlYWR5KCk7XG4gIH1cbn0sIGZhbHNlKTtcblxuZXhwb3J0cy5kZWZhdWx0ID0ge1xuICBub29wICAgICAgOiBmdW5jdGlvbiBub29wKCkge30sXG4gIG1peCAgICAgICA6IG1peCxcbiAgdW5pcSAgICAgIDogdW5pcSxcbiAgY2xvbmUgICAgIDogY2xvbmUsXG4gIGZsYXR0ZW4gICA6IGZsYXR0ZW4sXG4gIHJlYWR5ICAgICA6IHJlYWR5LFxuICBpbnZva2UgICAgOiBpbnZva2UsXG4gIHRvQXJyYXkgICA6IHRvQXJyYXksXG4gIHRvU3RyaW5nICA6IHRvU3RyaW5nLFxuXG4gIG1hdGNoRWxlbWVudCA6IG1hdGNoRWxlbWVudCxcblxuICBpc1N0cmluZyAgICAgICAgICAgIDogaXNTdHJpbmcsXG4gIGlzTnVtYmVyICAgICAgICAgICAgOiBpc051bWJlcixcbiAgaXNBcnJheSAgICAgICAgICAgICA6IGlzQXJyYXksXG4gIGlzRnVuY3Rpb24gICAgICAgICAgOiBpc0Z1bmN0aW9uLFxuICBpc09iamVjdCAgICAgICAgICAgIDogaXNPYmplY3QsXG4gIGlzQ3VzdG9tRWxlbWVudE5hbWUgOiBpc0N1c3RvbUVsZW1lbnROYW1lXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyID0gcmVxdWlyZSgnLi9oZWxwZXInKS5kZWZhdWx0O1xuXG52YXIgQ2xheU1vZHVsZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgQ2xheU1vZHVsZSA9IGZ1bmN0aW9uIENsYXlNb2R1bGUoKSB7XG4gICAgdGhpcy5yZWdpc3RyeSA9IFtdO1xuICB9O1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKENsYXlNb2R1bGUucHJvdG90eXBlLCB7XG4gICAgcmVnaXN0ZXI6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24obmFtZSwgZmFjdG9yeSkge1xuICAgICAgICB0aGlzLnJlZ2lzdHJ5W25hbWVdID0gZmFjdG9yeTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgbG9hZDoge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZ2lzdHJ5W25hbWVdXG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gQ2xheU1vZHVsZTtcbn0oKTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gbmV3IENsYXlNb2R1bGUoKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhlbHBlciA9IHJlcXVpcmUoJy4uL2hlbHBlcicpLmRlZmF1bHQ7XG5cbnZhciBSRVhfRVZFTlRfU1BSSVRURVIgPSAvXFxzKy87XG5cbmV4cG9ydHMuZGVmYXVsdCA9IGZ1bmN0aW9uIGZhY3RvcnkoY29udGV4dCkge1xuICByZXR1cm4gbmV3IENsYXlFdmVudChjb250ZXh0LnJvb3QsIGNvbnRleHQuZXZlbnRzIHx8IHt9KTtcbn07XG5cbnZhciBDbGF5RXZlbnQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIENsYXlFdmVudCA9IGZ1bmN0aW9uIENsYXlFdmVudChlbCwgZXZlbnRzKSB7XG4gICAgdGhpcy5jdXJyZW50SGFuZGxlcnMgPSBbXTtcbiAgICB0aGlzLnNldEVsKGVsKTtcbiAgICB0aGlzLnNldEV2ZW50cyhldmVudHMpO1xuICB9O1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKENsYXlFdmVudC5wcm90b3R5cGUsIHtcbiAgICBzZXRFbDoge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihlbCkge1xuICAgICAgICB0aGlzLmVsID0gZWw7XG4gICAgICB9XG4gICAgfSxcblxuICAgIHNldEV2ZW50czoge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihldmVudHMpIHtcbiAgICAgICAgdGhpcy5ldmVudHMgPSBldmVudHM7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGVuYWJsZToge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICAgIHZhciBpID0gMCwga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuZXZlbnRzKSxcbiAgICAgICAgICAgIGV2ZW50QW5kU2VsZWN0b3IsIG1ldGhvZE9yTmFtZSwgaGFuZGxlcjtcblxuICAgICAgICBjb250ZXh0ID0gY29udGV4dCB8fCB0aGlzO1xuXG4gICAgICAgIHdoaWxlICgoZXZlbnRBbmRTZWxlY3RvciA9IGtleXNbaSsrXSkpIHtcbiAgICAgICAgICBtZXRob2RPck5hbWUgPSB0aGlzLmV2ZW50c1tldmVudEFuZFNlbGVjdG9yXTtcbiAgICAgICAgICBoYW5kbGVyID0gaGVscGVyLmlzRnVuY3Rpb24obWV0aG9kT3JOYW1lKSA/IG1ldGhvZE9yTmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogY29udGV4dFttZXRob2RPck5hbWVdO1xuICAgICAgICAgIGV2ZW50QW5kU2VsZWN0b3IgPSBldmVudEFuZFNlbGVjdG9yLnNwbGl0KFJFWF9FVkVOVF9TUFJJVFRFUik7XG4gICAgICAgICAgdGhpcy5vbihldmVudEFuZFNlbGVjdG9yWzBdLCBldmVudEFuZFNlbGVjdG9yWzFdLCBoYW5kbGVyLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBvbjoge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihldmVudCwgc2VsZWN0b3IsIGhhbmRsZXIsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGRlbGVnYXRlZCA9IHRoaXMuY3JlYXRlSGFuZGxlcihzZWxlY3RvciwgaGFuZGxlcikuYmluZChjb250ZXh0KTtcbiAgICAgICAgdGhpcy5jdXJyZW50SGFuZGxlcnMucHVzaCh7XG4gICAgICAgICAgZXZlbnQgICA6IGV2ZW50LFxuICAgICAgICAgIGhhbmRsZXIgOiBkZWxlZ2F0ZWRcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgZGVsZWdhdGVkLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgY3JlYXRlSGFuZGxlcjoge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihzZWxlY3RvciwgaGFuZGxlcikge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZXZ0XG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgICAgdmFyIGhvc3QgICA9IGV2dC5jdXJyZW50VGFyZ2V0LFxuICAgICAgICAgICAgICB0YXJnZXQgPSBldnQudGFyZ2V0O1xuXG4gICAgICAgICAgZG8ge1xuICAgICAgICAgICAgaWYgKHRhcmdldCA9PT0gaG9zdCkge1xuICAgICAgICAgICAgICAvLyBub3QgZGVsZWdhdGVcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaGVscGVyLm1hdGNoRWxlbWVudCh0YXJnZXQsIHNlbGVjdG9yKSkge1xuICAgICAgICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gd2hpbGUgKCh0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIGVtaXQ6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24odGFyZ2V0LCB0eXBlLCBvcHRpb25zLCBidWJibGUsIGNhbmNlbCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIGlmIChjYW5jZWwgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICBjYW5jZWwgPSB0cnVlO1xuXG4gICAgICAgIGlmIChidWJibGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICBidWJibGUgPSBmYWxzZTtcblxuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgIG9wdGlvbnMgPSB7fTtcblxuICAgICAgICBpZiAoaGVscGVyLmlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICAgIGhlbHBlci50b0FycmF5KHRhcmdldClcbiAgICAgICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihlbCkge1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLmVtaXQoZWwsIHR5cGUsIG9wdGlvbnMsIGJ1YmJsZSwgY2FuY2VsKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZXZlbnQ7XG4gICAgICAgIGhlbHBlci5taXgob3B0aW9ucywge1xuICAgICAgICAgIGNhbkJ1YmJsZSAgOiBidWJibGUsXG4gICAgICAgICAgY2FuY2VsYWJsZSA6IGNhbmNlbCxcbiAgICAgICAgICB2aWV3ICAgICAgIDogd2luZG93XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHN3aXRjaCh0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnY2xpY2snOlxuICAgICAgICAgIGNhc2UgJ2RiY2xpY2snOlxuICAgICAgICAgIGNhc2UgJ21vdXNlb3Zlcic6XG4gICAgICAgICAgY2FzZSAnbW91c2Vtb3ZlJzpcbiAgICAgICAgICBjYXNlICdtb3VzZW91dCc6XG4gICAgICAgICAgY2FzZSAnbW91c2V1cCc6XG4gICAgICAgICAgY2FzZSAnbW91c2Vkb3duJzpcbiAgICAgICAgICBjYXNlICdtb3VzZWVudGVyJzpcbiAgICAgICAgICBjYXNlICdtb3VzZWxlYXZlJzpcbiAgICAgICAgICBjYXNlICdjb250ZXh0bWVudSc6XG4gICAgICAgICAgICBldmVudCA9IG5ldyBNb3VzZUV2ZW50KHR5cGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnZm9jdXMnOlxuICAgICAgICAgIGNhc2UgJ2JsdXInOlxuICAgICAgICAgIGNhc2UgJ2ZvY3VzaW4nOlxuICAgICAgICAgIGNhc2UgJ2ZvY3Vzb3V0JzpcbiAgICAgICAgICAgIGV2ZW50ID0gbmV3IEZvY3VzRXZlbnQodHlwZSwgb3B0aW9ucyk7IC8vIFRPRE8gaW1wbGVtZW50ZWQgaW4gYW55IGVudj9cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2tleXVwJzpcbiAgICAgICAgICBjYXNlICdrZXlkb3duJzpcbiAgICAgICAgICBjYXNlICdrZXlwcmVzcyc6XG4gICAgICAgICAgICBldmVudCA9IG5ldyBLZXlib2FyZEV2ZW50KHR5cGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGV2ZW50ID0gbmV3IEV2ZW50KHR5cGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICB0YXJnZXQuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGRpc2FibGU6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpID0gMCwgb2JqO1xuICAgICAgICB3aGlsZSAoKG9iaiA9IHRoaXMuY3VycmVudEhhbmRsZXJzW2krK10pKSB7XG4gICAgICAgICAgdGhpcy5lbC5yZW1vdmVFdmVudExpc3RlbmVyKG9iai5ldmVudCwgb2JqLmhhbmRsZXIsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3VycmVudEhhbmRsZXJzID0gW107XG4gICAgICB9XG4gICAgfSxcblxuICAgIGF0dGFjaGVkQ2FsbGJhY2s6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgICB0aGlzLmVuYWJsZShjb250ZXh0KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZGV0YWNoZWRDYWxsYmFjazoge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuZGlzYWJsZShjb250ZXh0KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBDbGF5RXZlbnQ7XG59KCk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBlbGVtZW50ID0gcmVxdWlyZSgnLi9lbGVtZW50JykuZGVmYXVsdDtcbnZhciBoZWxwZXIgPSByZXF1aXJlKCcuL2hlbHBlcicpLmRlZmF1bHQ7XG5cbnZhciBSRUdJU1RSWV9DTEFZX0VMRU1FTlRTID0ge307XG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcHJvdG9dXG4gKi9cbmZ1bmN0aW9uIENsYXlSZWdpc3RlcihuYW1lLCBwcm90bykge1xuICBpZiAocHJvdG8gPT09IHVuZGVmaW5lZClcbiAgICBwcm90byA9IHt9O1xuXG4gIGlmIChSRUdJU1RSWV9DTEFZX0VMRU1FTlRTW25hbWVdKSB7XG4gICAgLy8gYWxyZWFkeSByZWdpc3RlcmVkXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgcHJvdG90eXBlOiBlbGVtZW50LmNyZWF0ZShuYW1lLCBwcm90bylcbiAgfTtcblxuICBpZiAocHJvdG8uZXh0ZW5kcyAmJiAhaGVscGVyLmlzQ3VzdG9tRWxlbWVudE5hbWUocHJvdG8uZXh0ZW5kcykpIHtcbiAgICBvcHRpb25zLmV4dGVuZHMgPSBwcm90by5leHRlbmRzO1xuICB9XG5cbiAgUkVHSVNUUllfQ0xBWV9FTEVNRU5UU1tuYW1lXSA9IGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudChuYW1lLCBvcHRpb25zKTtcbn1cblxuZXhwb3J0cy5kZWZhdWx0ID0gQ2xheVJlZ2lzdGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyID0gcmVxdWlyZShcIi4vaGVscGVyXCIpLmRlZmF1bHQ7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IHtcbiAgcmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpIHtcbiAgICB0aGlzW25hbWVdID0gZnVuYztcbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGggPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9oJyk7XG52YXIgZGlmZiA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL2RpZmYnKTtcbnZhciBwYXRjaCA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL3BhdGNoJyk7XG52YXIgY3JlYXRlID0gcmVxdWlyZSgndmlydHVhbC1kb20vY3JlYXRlLWVsZW1lbnQnKTtcbnZhciBoZWxwZXIgPSByZXF1aXJlKFwiLi9oZWxwZXJcIikuZGVmYXVsdDtcbnZhciB0bXBsSGVscGVyID0gcmVxdWlyZShcIi4vdGVtcGxhdGUtaGVscGVyXCIpLmRlZmF1bHQ7XG5cbndpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cbnZhciBTVFJfRVZBTF9GVU5DVElPTl9TWU1CT0wgPSAnX19FVkFMX0ZVTkNUSU9OX18nO1xuXG5leHBvcnRzLmRlZmF1bHQgPSB7XG4gIC8qKlxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBodG1sXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbc2NvcGVdXG4gICAqIEByZXR1cm5zIHtDbGF5VGVtcGxhdGV9XG4gICAqL1xuICBjcmVhdGU6IGZ1bmN0aW9uKGh0bWwsIHNjb3BlKSB7XG4gICAgcmV0dXJuIG5ldyBDbGF5VGVtcGxhdGUoaHRtbCwgc2NvcGUpO1xuICB9XG59O1xuXG52YXIgQ2xheVRlbXBsYXRlID0gZnVuY3Rpb24oKSB7XG4gIHZhciBDbGF5VGVtcGxhdGUgPSBmdW5jdGlvbiBDbGF5VGVtcGxhdGUoaHRtbCwgc2NvcGUpIHtcbiAgICBpZiAoc2NvcGUgPT09IHVuZGVmaW5lZClcbiAgICAgIHNjb3BlID0ge307XG5cbiAgICB0aGlzLl9kaWZmUXVldWUgICA9IFtdO1xuICAgIHRoaXMuX2ludmFsaWRhdGVkID0gZmFsc2U7XG5cbiAgICB0aGlzLnNjb3BlICAgID0gc2NvcGU7XG5cbiAgICB0cnkge1xuICAgICAgdGhpcy5jb21waWxlZCA9IEpTT04ucGFyc2UoaHRtbCwgZnVuY3Rpb24oa2V5LCB2YWwpIHtcbiAgICAgICAgaWYgKCh2YWwgfHwge30pW1NUUl9FVkFMX0ZVTkNUSU9OX1NZTUJPTF0pIHtcbiAgICAgICAgICByZXR1cm4gaGVscGVyLmludm9rZShGdW5jdGlvbiwgdmFsLmFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgICB9KTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIGlmICghd2luZG93LkNsYXlSdW50aW1lKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVxdWlyZSBydW50aW1lIGxpYnJhcnkgZm9yIHRlbXBsYXRlIGNvbXBpbGluZycpO1xuICAgICAgfVxuICAgICAgdmFyIGNvbXBpbGVyID0gd2luZG93LkNsYXlSdW50aW1lLmNvbXBpbGVyLmNyZWF0ZSgpO1xuICAgICAgdGhpcy5jb21waWxlZCA9IGNvbXBpbGVyLmNvbXBpbGVGcm9tSHRtbChodG1sKTtcbiAgICB9XG4gIH07XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQ2xheVRlbXBsYXRlLnByb3RvdHlwZSwge1xuICAgIGNyZWF0ZVZUcmVlOiB7XG4gICAgICB3cml0YWJsZTogdHJ1ZSxcblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudFZUcmVlID0gY29udmVydFBhcnNlZERvbVRvVlRyZWUodGhpcy5jb21waWxlZCwgdGhpcy5zY29wZSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZUVsZW1lbnQ6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oZG9jKSB7XG4gICAgICAgIGlmIChkb2MgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICBkb2MgPSBkb2N1bWVudDtcblxuICAgICAgICByZXR1cm4gY3JlYXRlKHRoaXMuY3JlYXRlVlRyZWUoKSwge1xuICAgICAgICAgIGRvY3VtZW50OiBkb2NcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGludmFsaWRhdGU6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9pbnZhbGlkYXRlZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCA9IHRydWU7XG4gICAgICAgIHNldFRpbWVvdXQodGhpcy5fdXBkYXRlLmJpbmQodGhpcyksIDQpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBfdXBkYXRlOiB7XG4gICAgICB3cml0YWJsZTogdHJ1ZSxcblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY3VycmVudCA9IHRoaXMuX2N1cnJlbnRWVHJlZSxcbiAgICAgICAgICAgIHVwZGF0ZWQgPSBjb252ZXJ0UGFyc2VkRG9tVG9WVHJlZSh0aGlzLmNvbXBpbGVkLCB0aGlzLnNjb3BlKTtcblxuICAgICAgICB0aGlzLl9kaWZmUXVldWUgPSBkaWZmKGN1cnJlbnQsIHVwZGF0ZWQpO1xuICAgICAgICB0aGlzLl9jdXJyZW50VlRyZWUgPSB1cGRhdGVkO1xuXG4gICAgICAgIHRoaXMuX2ludmFsaWRhdGVkID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGRyYXdMb29wOiB7XG4gICAgICB3cml0YWJsZTogdHJ1ZSxcblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uKHRhcmdldFJvb3QpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdmFyIHBhdGNoRE9NID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKF90aGlzLl9kaWZmUXVldWUpIHtcbiAgICAgICAgICAgIHBhdGNoKHRhcmdldFJvb3QsIF90aGlzLl9kaWZmUXVldWUpO1xuICAgICAgICAgICAgX3RoaXMuX2RpZmZRdWV1ZSA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUocGF0Y2hET00pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHBhdGNoRE9NKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGRlc3Ryb3k6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc2NvcGUgPSB0aGlzLmNvbXBpbGVkID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBDbGF5VGVtcGxhdGU7XG59KCk7XG5cbi8qKlxuICogY29udmVydCB0byBWaXJ0dWFsTm9kZSBmcm9tIERvbVN0cnVjdHVyZVxuICpcbiAqIEBwYXJhbSB7RG9tU3RydWN0dXJlfSBkb21cbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlUmVwZWF0XVxuICogQHJldHVybnMge1ZpcnR1YWxOb2RlfVxuICovXG5mdW5jdGlvbiBjb252ZXJ0UGFyc2VkRG9tVG9WVHJlZShkb20sIHNjb3BlLCBpZ25vcmVSZXBlYXQpIHtcbiAgdmFyIHRhZyAgICAgID0gZG9tLm5hbWUsXG4gICAgICB0eXBlICAgICA9IGRvbS50eXBlLFxuICAgICAgZGF0YSAgICAgPSBkb20uZGF0YSxcbiAgICAgIG9yZ0F0dHJzID0gZG9tLmF0dHJpYnMgIHx8IHt9LFxuICAgICAgb3JnU3R5bGUgPSBkb20uc3R5bGUgICAgfHwgJycsXG4gICAgICBjaGlsZHJlbiA9IGRvbS5jaGlsZHJlbiB8fCBbXSxcbiAgICAgIGV2YWxzICAgID0gZG9tLmV2YWx1YXRvcnMsXG4gICAgICBhdHRycyAgICA9IHt9LFxuICAgICAgc3R5bGUgICAgPSB7fSxcbiAgICAgIGhvb2tzICAgID0ge30sXG4gICAgICBrZXlzLCBrZXksIGkgPSAwO1xuXG4gIHN3aXRjaCh0eXBlKSB7XG4gICAgY2FzZSAndGFnJzpcblxuICAgICAgLy8gaWYgZGV0ZWN0aW9uXG4gICAgICBpZiAoZXZhbHMuaWYgJiYgIWV2YWxzLmlmKHNjb3BlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8gdW5sZXNzIGRldGVjdGlvblxuICAgICAgaWYgKGV2YWxzLnVubGVzcyAmJiBldmFscy51bmxlc3Moc2NvcGUpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLyByZXBlYXQgZWxlbWVudHNcbiAgICAgIGlmIChldmFscy5yZXBlYXQgJiYgIWlnbm9yZVJlcGVhdCkge1xuICAgICAgICByZXR1cm4gZXZhbHMucmVwZWF0KHNjb3BlKS5tYXAoZnVuY3Rpb24oY2hpbGRTY29wZSkge1xuICAgICAgICAgIHJldHVybiBjb252ZXJ0UGFyc2VkRG9tVG9WVHJlZShkb20sIGNoaWxkU2NvcGUsIHRydWUpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gZXZhbCBzdHlsZXNcbiAgICAgIGlmIChvcmdTdHlsZSkge1xuICAgICAgICBzdHlsZSA9IGV2YWxzLnN0eWxlID8gZXZhbHMuc3R5bGUoc2NvcGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBvcmdTdHlsZTtcbiAgICAgICAgc3R5bGUgPSBjb252ZXJ0Q3NzU3RyaW5nVG9PYmplY3Qoc3R5bGUpO1xuICAgICAgfVxuXG4gICAgICAvLyBldmFsIGF0dHJpYnV0ZXNcbiAgICAgIGtleXMgPSBPYmplY3Qua2V5cyhvcmdBdHRycyk7XG4gICAgICB3aGlsZSAoKGtleSA9IGtleXNbaSsrXSkpIHtcbiAgICAgICAgYXR0cnNba2V5XSA9IGV2YWxzLmF0dHJzW2tleV0gPyBldmFscy5hdHRyc1trZXldKHNjb3BlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IG9yZ0F0dHJzW2tleV07XG4gICAgICAgIGlmICh0bXBsSGVscGVyW2tleV0pIHtcbiAgICAgICAgICBob29rc1trZXldID0gaG9vayh0bXBsSGVscGVyW2tleV0sIGF0dHJzW2tleV0pOyAvLyBUT0RPIGVuaGFuY2VtZW50XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gZmxhdHRlbiBjaGlsZHJlblxuICAgICAgY2hpbGRyZW4gPSBjaGlsZHJlbi5tYXAoZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgcmV0dXJuIGNvbnZlcnRQYXJzZWREb21Ub1ZUcmVlKGNoaWxkLCBzY29wZSk7XG4gICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24odikgeyByZXR1cm4gISF2OyB9KTtcbiAgICAgIGNoaWxkcmVuID0gaGVscGVyLmZsYXR0ZW4oY2hpbGRyZW4pO1xuXG4gICAgICAvLyBjcmVhdGUgVlRyZWVcbiAgICAgIHJldHVybiBoKHRhZywgaGVscGVyLm1peCh7XG4gICAgICAgIGF0dHJpYnV0ZXMgOiBhdHRycyxcbiAgICAgICAgc3R5bGUgICAgICA6IHN0eWxlXG4gICAgICB9LCBob29rcyksIGNoaWxkcmVuKTtcblxuICAgIGNhc2UgJ3RleHQnOlxuICAgICAgLy8gZXZhbCB0ZXh0XG4gICAgICByZXR1cm4gU3RyaW5nKGV2YWxzLmRhdGEgPyBldmFscy5kYXRhKHNjb3BlKSA6IGRhdGEpO1xuXG4gICAgY2FzZSAnY29tbWVudCc6XG4gICAgICAvLyBpZ25vcmVcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogY29udmVydCB0byBvYmplY3QgZnJvbSBzdHlsZSBhdHRyaWJ1dGUgdmFsdWVcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY3NzU3RyXG4gKiBAcmV0dXJucyB7T2JqZWN0fVxuICovXG5mdW5jdGlvbiBjb252ZXJ0Q3NzU3RyaW5nVG9PYmplY3QoY3NzU3RyKSB7XG4gIHZhciBjc3NTdHJpbmdzID0gY3NzU3RyLnJlcGxhY2UoL1xccy9nLCAnJykuc3BsaXQoJzsnKSxcbiAgICAgIHJldFN0eWxlICAgPSB7fSxcbiAgICAgIGkgPSAwLCBwcm9wX3ZhbHVlO1xuXG4gIHdoaWxlICgocHJvcF92YWx1ZSA9IGNzc1N0cmluZ3NbaSsrXSkpIHtcbiAgICBwcm9wX3ZhbHVlID0gcHJvcF92YWx1ZS5zcGxpdCgnOicpO1xuICAgIHJldFN0eWxlW3Byb3BfdmFsdWVbMF1dID0gcHJvcF92YWx1ZVsxXTtcbiAgfVxuXG4gIHJldHVybiByZXRTdHlsZTtcbn1cblxudmFyIEhvb2tXcmFwcGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBIb29rV3JhcHBlciA9IGZ1bmN0aW9uIEhvb2tXcmFwcGVyKGZuLCB2YWwpIHtcbiAgICB0aGlzLmZuICA9IGZuO1xuICAgIHRoaXMudmFsID0gdmFsO1xuICB9O1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEhvb2tXcmFwcGVyLnByb3RvdHlwZSwge1xuICAgIGhvb2s6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuZm4uYXBwbHkodGhpcywgW3RoaXMudmFsXS5jb25jYXQoaGVscGVyLnRvQXJyYXkoYXJndW1lbnRzKSkpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIEhvb2tXcmFwcGVyO1xufSgpO1xuXG4vKipcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0geyp9IHZhbFxuICogQHJldHVybnMge0hvb2tXcmFwcGVyfVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIGhvb2soZm4sIHZhbCkge1xuICByZXR1cm4gbmV3IEhvb2tXcmFwcGVyKGZuLCB2YWwpXG59XG4iLG51bGwsInZhciBjcmVhdGVFbGVtZW50ID0gcmVxdWlyZShcInZkb20vY3JlYXRlLWVsZW1lbnRcIilcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50XG4iLCJ2YXIgZGlmZiA9IHJlcXVpcmUoXCJ2dHJlZS9kaWZmXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZGlmZlxuIiwidmFyIGggPSByZXF1aXJlKFwiLi9oL2luZGV4LmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaFxuIiwidmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxudmFyIGlzU3RyaW5nID0gcmVxdWlyZShcIngtaXMtc3RyaW5nXCIpXG5cbnZhciBWTm9kZSA9IHJlcXVpcmUoXCJ2dHJlZS92bm9kZS5qc1wiKVxudmFyIFZUZXh0ID0gcmVxdWlyZShcInZ0cmVlL3Z0ZXh0LmpzXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwidnRyZWUvaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy13aWRnZXRcIilcblxudmFyIHBhcnNlVGFnID0gcmVxdWlyZShcIi4vcGFyc2UtdGFnXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaFxuXG5mdW5jdGlvbiBoKHRhZ05hbWUsIHByb3BlcnRpZXMsIGNoaWxkcmVuKSB7XG4gICAgdmFyIHRhZywgcHJvcHMsIGNoaWxkTm9kZXMsIGtleVxuXG4gICAgaWYgKCFjaGlsZHJlbikge1xuICAgICAgICBpZiAoaXNDaGlsZHJlbihwcm9wZXJ0aWVzKSkge1xuICAgICAgICAgICAgY2hpbGRyZW4gPSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gdW5kZWZpbmVkXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0YWcgPSBwYXJzZVRhZyh0YWdOYW1lLCBwcm9wZXJ0aWVzKVxuXG4gICAgaWYgKCFpc1N0cmluZyh0YWcpKSB7XG4gICAgICAgIHByb3BzID0gdGFnLnByb3BlcnRpZXNcbiAgICAgICAgdGFnID0gdGFnLnRhZ05hbWVcbiAgICB9IGVsc2Uge1xuICAgICAgICBwcm9wcyA9IHByb3BlcnRpZXNcbiAgICB9XG5cbiAgICBpZiAoaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW5baV0gPSBuZXcgVlRleHQoY2hpbGQpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjaGlsZE5vZGVzID0gY2hpbGRyZW5cbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGNoaWxkcmVuKSkge1xuICAgICAgICBjaGlsZE5vZGVzID0gW25ldyBWVGV4dChjaGlsZHJlbildXG4gICAgfSBlbHNlIGlmIChpc0NoaWxkKGNoaWxkcmVuKSkge1xuICAgICAgICBjaGlsZE5vZGVzID0gW2NoaWxkcmVuXVxuICAgIH1cblxuICAgIGlmIChwcm9wcyAmJiBcImtleVwiIGluIHByb3BzKSB7XG4gICAgICAgIGtleSA9IHByb3BzLmtleVxuICAgICAgICBkZWxldGUgcHJvcHMua2V5XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBWTm9kZSh0YWcsIHByb3BzLCBjaGlsZE5vZGVzLCBrZXkpXG59XG5cbmZ1bmN0aW9uIGlzQ2hpbGQoeCkge1xuICAgIHJldHVybiBpc1ZOb2RlKHgpIHx8IGlzVlRleHQoeCkgfHwgaXNXaWRnZXQoeClcbn1cblxuZnVuY3Rpb24gaXNDaGlsZHJlbih4KSB7XG4gICAgcmV0dXJuIGlzQXJyYXkoeCkgfHwgaXNTdHJpbmcoeCkgfHwgaXNDaGlsZCh4KVxufVxuIiwidmFyIHNwbGl0ID0gcmVxdWlyZShcImJyb3dzZXItc3BsaXRcIilcblxudmFyIGNsYXNzSWRTcGxpdCA9IC8oW1xcLiNdP1thLXpBLVowLTlfOi1dKykvXG52YXIgbm90Q2xhc3NJZCA9IC9eXFwufCMvXG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2VUYWdcblxuZnVuY3Rpb24gcGFyc2VUYWcodGFnLCBwcm9wcykge1xuICAgIGlmICghdGFnKSB7XG4gICAgICAgIHJldHVybiBcImRpdlwiXG4gICAgfVxuXG4gICAgdmFyIG5vSWQgPSAhcHJvcHMgfHwgIShcImlkXCIgaW4gcHJvcHMpXG5cbiAgICB2YXIgdGFnUGFydHMgPSBzcGxpdCh0YWcsIGNsYXNzSWRTcGxpdClcbiAgICB2YXIgdGFnTmFtZSA9IG51bGxcblxuICAgIGlmKG5vdENsYXNzSWQudGVzdCh0YWdQYXJ0c1sxXSkpIHtcbiAgICAgICAgdGFnTmFtZSA9IFwiZGl2XCJcbiAgICB9XG5cbiAgICB2YXIgaWQsIGNsYXNzZXMsIHBhcnQsIHR5cGUsIGlcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGFnUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFydCA9IHRhZ1BhcnRzW2ldXG5cbiAgICAgICAgaWYgKCFwYXJ0KSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgdHlwZSA9IHBhcnQuY2hhckF0KDApXG5cbiAgICAgICAgaWYgKCF0YWdOYW1lKSB7XG4gICAgICAgICAgICB0YWdOYW1lID0gcGFydFxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwiLlwiKSB7XG4gICAgICAgICAgICBjbGFzc2VzID0gY2xhc3NlcyB8fCBbXVxuICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKHBhcnQuc3Vic3RyaW5nKDEsIHBhcnQubGVuZ3RoKSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBcIiNcIiAmJiBub0lkKSB7XG4gICAgICAgICAgICBpZCA9IHBhcnQuc3Vic3RyaW5nKDEsIHBhcnQubGVuZ3RoKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHBhcnNlZFRhZ3NcblxuICAgIGlmIChwcm9wcykge1xuICAgICAgICBpZiAoaWQgIT09IHVuZGVmaW5lZCAmJiAhKFwiaWRcIiBpbiBwcm9wcykpIHtcbiAgICAgICAgICAgIHByb3BzLmlkID0gaWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjbGFzc2VzKSB7XG4gICAgICAgICAgICBpZiAocHJvcHMuY2xhc3NOYW1lKSB7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKHByb3BzLmNsYXNzTmFtZSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJvcHMuY2xhc3NOYW1lID0gY2xhc3Nlcy5qb2luKFwiIFwiKVxuICAgICAgICB9XG5cbiAgICAgICAgcGFyc2VkVGFncyA9IHRhZ05hbWVcbiAgICB9IGVsc2UgaWYgKGNsYXNzZXMgfHwgaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgcHJvcGVydGllcyA9IHt9XG5cbiAgICAgICAgaWYgKGlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuaWQgPSBpZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNsYXNzZXMpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuY2xhc3NOYW1lID0gY2xhc3Nlcy5qb2luKFwiIFwiKVxuICAgICAgICB9XG5cbiAgICAgICAgcGFyc2VkVGFncyA9IHtcbiAgICAgICAgICAgIHRhZ05hbWU6IHRhZ05hbWUsXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzXG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJzZWRUYWdzID0gdGFnTmFtZVxuICAgIH1cblxuICAgIHJldHVybiBwYXJzZWRUYWdzXG59XG4iLCIvKiFcbiAqIENyb3NzLUJyb3dzZXIgU3BsaXQgMS4xLjFcbiAqIENvcHlyaWdodCAyMDA3LTIwMTIgU3RldmVuIExldml0aGFuIDxzdGV2ZW5sZXZpdGhhbi5jb20+XG4gKiBBdmFpbGFibGUgdW5kZXIgdGhlIE1JVCBMaWNlbnNlXG4gKiBFQ01BU2NyaXB0IGNvbXBsaWFudCwgdW5pZm9ybSBjcm9zcy1icm93c2VyIHNwbGl0IG1ldGhvZFxuICovXG5cbi8qKlxuICogU3BsaXRzIGEgc3RyaW5nIGludG8gYW4gYXJyYXkgb2Ygc3RyaW5ncyB1c2luZyBhIHJlZ2V4IG9yIHN0cmluZyBzZXBhcmF0b3IuIE1hdGNoZXMgb2YgdGhlXG4gKiBzZXBhcmF0b3IgYXJlIG5vdCBpbmNsdWRlZCBpbiB0aGUgcmVzdWx0IGFycmF5LiBIb3dldmVyLCBpZiBgc2VwYXJhdG9yYCBpcyBhIHJlZ2V4IHRoYXQgY29udGFpbnNcbiAqIGNhcHR1cmluZyBncm91cHMsIGJhY2tyZWZlcmVuY2VzIGFyZSBzcGxpY2VkIGludG8gdGhlIHJlc3VsdCBlYWNoIHRpbWUgYHNlcGFyYXRvcmAgaXMgbWF0Y2hlZC5cbiAqIEZpeGVzIGJyb3dzZXIgYnVncyBjb21wYXJlZCB0byB0aGUgbmF0aXZlIGBTdHJpbmcucHJvdG90eXBlLnNwbGl0YCBhbmQgY2FuIGJlIHVzZWQgcmVsaWFibHlcbiAqIGNyb3NzLWJyb3dzZXIuXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFN0cmluZyB0byBzcGxpdC5cbiAqIEBwYXJhbSB7UmVnRXhwfFN0cmluZ30gc2VwYXJhdG9yIFJlZ2V4IG9yIHN0cmluZyB0byB1c2UgZm9yIHNlcGFyYXRpbmcgdGhlIHN0cmluZy5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbbGltaXRdIE1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRvIGluY2x1ZGUgaW4gdGhlIHJlc3VsdCBhcnJheS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygc3Vic3RyaW5ncy5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gQmFzaWMgdXNlXG4gKiBzcGxpdCgnYSBiIGMgZCcsICcgJyk7XG4gKiAvLyAtPiBbJ2EnLCAnYicsICdjJywgJ2QnXVxuICpcbiAqIC8vIFdpdGggbGltaXRcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnLCAyKTtcbiAqIC8vIC0+IFsnYScsICdiJ11cbiAqXG4gKiAvLyBCYWNrcmVmZXJlbmNlcyBpbiByZXN1bHQgYXJyYXlcbiAqIHNwbGl0KCcuLndvcmQxIHdvcmQyLi4nLCAvKFthLXpdKykoXFxkKykvaSk7XG4gKiAvLyAtPiBbJy4uJywgJ3dvcmQnLCAnMScsICcgJywgJ3dvcmQnLCAnMicsICcuLiddXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIHNwbGl0KHVuZGVmKSB7XG5cbiAgdmFyIG5hdGl2ZVNwbGl0ID0gU3RyaW5nLnByb3RvdHlwZS5zcGxpdCxcbiAgICBjb21wbGlhbnRFeGVjTnBjZyA9IC8oKT8/Ly5leGVjKFwiXCIpWzFdID09PSB1bmRlZixcbiAgICAvLyBOUENHOiBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cFxuICAgIHNlbGY7XG5cbiAgc2VsZiA9IGZ1bmN0aW9uKHN0ciwgc2VwYXJhdG9yLCBsaW1pdCkge1xuICAgIC8vIElmIGBzZXBhcmF0b3JgIGlzIG5vdCBhIHJlZ2V4LCB1c2UgYG5hdGl2ZVNwbGl0YFxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc2VwYXJhdG9yKSAhPT0gXCJbb2JqZWN0IFJlZ0V4cF1cIikge1xuICAgICAgcmV0dXJuIG5hdGl2ZVNwbGl0LmNhbGwoc3RyLCBzZXBhcmF0b3IsIGxpbWl0KTtcbiAgICB9XG4gICAgdmFyIG91dHB1dCA9IFtdLFxuICAgICAgZmxhZ3MgPSAoc2VwYXJhdG9yLmlnbm9yZUNhc2UgPyBcImlcIiA6IFwiXCIpICsgKHNlcGFyYXRvci5tdWx0aWxpbmUgPyBcIm1cIiA6IFwiXCIpICsgKHNlcGFyYXRvci5leHRlbmRlZCA/IFwieFwiIDogXCJcIikgKyAvLyBQcm9wb3NlZCBmb3IgRVM2XG4gICAgICAoc2VwYXJhdG9yLnN0aWNreSA/IFwieVwiIDogXCJcIiksXG4gICAgICAvLyBGaXJlZm94IDMrXG4gICAgICBsYXN0TGFzdEluZGV4ID0gMCxcbiAgICAgIC8vIE1ha2UgYGdsb2JhbGAgYW5kIGF2b2lkIGBsYXN0SW5kZXhgIGlzc3VlcyBieSB3b3JraW5nIHdpdGggYSBjb3B5XG4gICAgICBzZXBhcmF0b3IgPSBuZXcgUmVnRXhwKHNlcGFyYXRvci5zb3VyY2UsIGZsYWdzICsgXCJnXCIpLFxuICAgICAgc2VwYXJhdG9yMiwgbWF0Y2gsIGxhc3RJbmRleCwgbGFzdExlbmd0aDtcbiAgICBzdHIgKz0gXCJcIjsgLy8gVHlwZS1jb252ZXJ0XG4gICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZykge1xuICAgICAgLy8gRG9lc24ndCBuZWVkIGZsYWdzIGd5LCBidXQgdGhleSBkb24ndCBodXJ0XG4gICAgICBzZXBhcmF0b3IyID0gbmV3IFJlZ0V4cChcIl5cIiArIHNlcGFyYXRvci5zb3VyY2UgKyBcIiQoPyFcXFxccylcIiwgZmxhZ3MpO1xuICAgIH1cbiAgICAvKiBWYWx1ZXMgZm9yIGBsaW1pdGAsIHBlciB0aGUgc3BlYzpcbiAgICAgKiBJZiB1bmRlZmluZWQ6IDQyOTQ5NjcyOTUgLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgICAqIElmIDAsIEluZmluaXR5LCBvciBOYU46IDBcbiAgICAgKiBJZiBwb3NpdGl2ZSBudW1iZXI6IGxpbWl0ID0gTWF0aC5mbG9vcihsaW1pdCk7IGlmIChsaW1pdCA+IDQyOTQ5NjcyOTUpIGxpbWl0IC09IDQyOTQ5NjcyOTY7XG4gICAgICogSWYgbmVnYXRpdmUgbnVtYmVyOiA0Mjk0OTY3Mjk2IC0gTWF0aC5mbG9vcihNYXRoLmFicyhsaW1pdCkpXG4gICAgICogSWYgb3RoZXI6IFR5cGUtY29udmVydCwgdGhlbiB1c2UgdGhlIGFib3ZlIHJ1bGVzXG4gICAgICovXG4gICAgbGltaXQgPSBsaW1pdCA9PT0gdW5kZWYgPyAtMSA+Pj4gMCA6IC8vIE1hdGgucG93KDIsIDMyKSAtIDFcbiAgICBsaW1pdCA+Pj4gMDsgLy8gVG9VaW50MzIobGltaXQpXG4gICAgd2hpbGUgKG1hdGNoID0gc2VwYXJhdG9yLmV4ZWMoc3RyKSkge1xuICAgICAgLy8gYHNlcGFyYXRvci5sYXN0SW5kZXhgIGlzIG5vdCByZWxpYWJsZSBjcm9zcy1icm93c2VyXG4gICAgICBsYXN0SW5kZXggPSBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgIGlmIChsYXN0SW5kZXggPiBsYXN0TGFzdEluZGV4KSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4LCBtYXRjaC5pbmRleCkpO1xuICAgICAgICAvLyBGaXggYnJvd3NlcnMgd2hvc2UgYGV4ZWNgIG1ldGhvZHMgZG9uJ3QgY29uc2lzdGVudGx5IHJldHVybiBgdW5kZWZpbmVkYCBmb3JcbiAgICAgICAgLy8gbm9ucGFydGljaXBhdGluZyBjYXB0dXJpbmcgZ3JvdXBzXG4gICAgICAgIGlmICghY29tcGxpYW50RXhlY05wY2cgJiYgbWF0Y2gubGVuZ3RoID4gMSkge1xuICAgICAgICAgIG1hdGNoWzBdLnJlcGxhY2Uoc2VwYXJhdG9yMiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGggLSAyOyBpKyspIHtcbiAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50c1tpXSA9PT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICBtYXRjaFtpXSA9IHVuZGVmO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoLmxlbmd0aCA+IDEgJiYgbWF0Y2guaW5kZXggPCBzdHIubGVuZ3RoKSB7XG4gICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkob3V0cHV0LCBtYXRjaC5zbGljZSgxKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdExlbmd0aCA9IG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgICAgbGFzdExhc3RJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgICAgaWYgKG91dHB1dC5sZW5ndGggPj0gbGltaXQpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHNlcGFyYXRvci5sYXN0SW5kZXggPT09IG1hdGNoLmluZGV4KSB7XG4gICAgICAgIHNlcGFyYXRvci5sYXN0SW5kZXgrKzsgLy8gQXZvaWQgYW4gaW5maW5pdGUgbG9vcFxuICAgICAgfVxuICAgIH1cbiAgICBpZiAobGFzdExhc3RJbmRleCA9PT0gc3RyLmxlbmd0aCkge1xuICAgICAgaWYgKGxhc3RMZW5ndGggfHwgIXNlcGFyYXRvci50ZXN0KFwiXCIpKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKFwiXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaChzdHIuc2xpY2UobGFzdExhc3RJbmRleCkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0Lmxlbmd0aCA+IGxpbWl0ID8gb3V0cHV0LnNsaWNlKDAsIGxpbWl0KSA6IG91dHB1dDtcbiAgfTtcblxuICByZXR1cm4gc2VsZjtcbn0pKCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzT2JqZWN0XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KHgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwib2JqZWN0XCIgJiYgeCAhPT0gbnVsbFxufVxuIiwidmFyIGlzT2JqZWN0ID0gcmVxdWlyZShcImlzLW9iamVjdFwiKVxudmFyIGlzSG9vayA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12aG9va1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcGx5UHJvcGVydGllc1xuXG5mdW5jdGlvbiBhcHBseVByb3BlcnRpZXMobm9kZSwgcHJvcHMsIHByZXZpb3VzKSB7XG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcHMpIHtcbiAgICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXVxuXG4gICAgICAgIGlmIChwcm9wVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNIb29rKHByb3BWYWx1ZSkpIHtcbiAgICAgICAgICAgIHByb3BWYWx1ZS5ob29rKG5vZGUsXG4gICAgICAgICAgICAgICAgcHJvcE5hbWUsXG4gICAgICAgICAgICAgICAgcHJldmlvdXMgPyBwcmV2aW91c1twcm9wTmFtZV0gOiB1bmRlZmluZWQpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXNPYmplY3QocHJvcFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHBhdGNoT2JqZWN0KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUsIHByb3BWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBwcm9wVmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSkge1xuICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzW3Byb3BOYW1lXVxuXG4gICAgICAgIGlmICghaXNIb29rKHByZXZpb3VzVmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAocHJvcE5hbWUgPT09IFwiYXR0cmlidXRlc1wiKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXR0ck5hbWUgaW4gcHJldmlvdXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BOYW1lID09PSBcInN0eWxlXCIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHByZXZpb3VzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zdHlsZVtpXSA9IFwiXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcmV2aW91c1ZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBcIlwiXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVbcHJvcE5hbWVdID0gbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBwYXRjaE9iamVjdChub2RlLCBwcm9wcywgcHJldmlvdXMsIHByb3BOYW1lLCBwcm9wVmFsdWUpIHtcbiAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzID8gcHJldmlvdXNbcHJvcE5hbWVdIDogdW5kZWZpbmVkXG5cbiAgICAvLyBTZXQgYXR0cmlidXRlc1xuICAgIGlmIChwcm9wTmFtZSA9PT0gXCJhdHRyaWJ1dGVzXCIpIHtcbiAgICAgICAgZm9yICh2YXIgYXR0ck5hbWUgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgYXR0clZhbHVlID0gcHJvcFZhbHVlW2F0dHJOYW1lXVxuXG4gICAgICAgICAgICBpZiAoYXR0clZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0ck5hbWUsIGF0dHJWYWx1ZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmKHByZXZpb3VzVmFsdWUgJiYgaXNPYmplY3QocHJldmlvdXNWYWx1ZSkgJiZcbiAgICAgICAgZ2V0UHJvdG90eXBlKHByZXZpb3VzVmFsdWUpICE9PSBnZXRQcm90b3R5cGUocHJvcFZhbHVlKSkge1xuICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHByb3BWYWx1ZVxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAoIWlzT2JqZWN0KG5vZGVbcHJvcE5hbWVdKSkge1xuICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHt9XG4gICAgfVxuXG4gICAgdmFyIHJlcGxhY2VyID0gcHJvcE5hbWUgPT09IFwic3R5bGVcIiA/IFwiXCIgOiB1bmRlZmluZWRcblxuICAgIGZvciAodmFyIGsgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHByb3BWYWx1ZVtrXVxuICAgICAgICBub2RlW3Byb3BOYW1lXVtrXSA9ICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSA/IHJlcGxhY2VyIDogdmFsdWVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZSh2YWx1ZSkge1xuICAgIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSlcbiAgICB9IGVsc2UgaWYgKHZhbHVlLl9fcHJvdG9fXykge1xuICAgICAgICByZXR1cm4gdmFsdWUuX19wcm90b19fXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlXG4gICAgfVxufVxuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxuXG52YXIgYXBwbHlQcm9wZXJ0aWVzID0gcmVxdWlyZShcIi4vYXBwbHktcHJvcGVydGllc1wiKVxuXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwidnRyZWUvaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy13aWRnZXRcIilcbnZhciBoYW5kbGVUaHVuayA9IHJlcXVpcmUoXCJ2dHJlZS9oYW5kbGUtdGh1bmtcIilcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodm5vZGUsIG9wdHMpIHtcbiAgICB2YXIgZG9jID0gb3B0cyA/IG9wdHMuZG9jdW1lbnQgfHwgZG9jdW1lbnQgOiBkb2N1bWVudFxuICAgIHZhciB3YXJuID0gb3B0cyA/IG9wdHMud2FybiA6IG51bGxcblxuICAgIHZub2RlID0gaGFuZGxlVGh1bmsodm5vZGUpLmFcblxuICAgIGlmIChpc1dpZGdldCh2bm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIHZub2RlLmluaXQoKVxuICAgIH0gZWxzZSBpZiAoaXNWVGV4dCh2bm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIGRvYy5jcmVhdGVUZXh0Tm9kZSh2bm9kZS50ZXh0KVxuICAgIH0gZWxzZSBpZiAoIWlzVk5vZGUodm5vZGUpKSB7XG4gICAgICAgIGlmICh3YXJuKSB7XG4gICAgICAgICAgICB3YXJuKFwiSXRlbSBpcyBub3QgYSB2YWxpZCB2aXJ0dWFsIGRvbSBub2RlXCIsIHZub2RlKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSAodm5vZGUubmFtZXNwYWNlID09PSBudWxsKSA/XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50KHZub2RlLnRhZ05hbWUpIDpcbiAgICAgICAgZG9jLmNyZWF0ZUVsZW1lbnROUyh2bm9kZS5uYW1lc3BhY2UsIHZub2RlLnRhZ05hbWUpXG5cbiAgICB2YXIgcHJvcHMgPSB2bm9kZS5wcm9wZXJ0aWVzXG4gICAgYXBwbHlQcm9wZXJ0aWVzKG5vZGUsIHByb3BzKVxuXG4gICAgdmFyIGNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkTm9kZSA9IGNyZWF0ZUVsZW1lbnQoY2hpbGRyZW5baV0sIG9wdHMpXG4gICAgICAgIGlmIChjaGlsZE5vZGUpIHtcbiAgICAgICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGROb2RlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGVcbn1cbiIsIi8vIE1hcHMgYSB2aXJ0dWFsIERPTSB0cmVlIG9udG8gYSByZWFsIERPTSB0cmVlIGluIGFuIGVmZmljaWVudCBtYW5uZXIuXG4vLyBXZSBkb24ndCB3YW50IHRvIHJlYWQgYWxsIG9mIHRoZSBET00gbm9kZXMgaW4gdGhlIHRyZWUgc28gd2UgdXNlXG4vLyB0aGUgaW4tb3JkZXIgdHJlZSBpbmRleGluZyB0byBlbGltaW5hdGUgcmVjdXJzaW9uIGRvd24gY2VydGFpbiBicmFuY2hlcy5cbi8vIFdlIG9ubHkgcmVjdXJzZSBpbnRvIGEgRE9NIG5vZGUgaWYgd2Uga25vdyB0aGF0IGl0IGNvbnRhaW5zIGEgY2hpbGQgb2Zcbi8vIGludGVyZXN0LlxuXG52YXIgbm9DaGlsZCA9IHt9XG5cbm1vZHVsZS5leHBvcnRzID0gZG9tSW5kZXhcblxuZnVuY3Rpb24gZG9tSW5kZXgocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzKSB7XG4gICAgaWYgKCFpbmRpY2VzIHx8IGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7fVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGluZGljZXMuc29ydChhc2NlbmRpbmcpXG4gICAgICAgIHJldHVybiByZWN1cnNlKHJvb3ROb2RlLCB0cmVlLCBpbmRpY2VzLCBub2RlcywgMClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlY3Vyc2Uocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzLCByb290SW5kZXgpIHtcbiAgICBub2RlcyA9IG5vZGVzIHx8IHt9XG5cblxuICAgIGlmIChyb290Tm9kZSkge1xuICAgICAgICBpZiAoaW5kZXhJblJhbmdlKGluZGljZXMsIHJvb3RJbmRleCwgcm9vdEluZGV4KSkge1xuICAgICAgICAgICAgbm9kZXNbcm9vdEluZGV4XSA9IHJvb3ROb2RlXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdkNoaWxkcmVuID0gdHJlZS5jaGlsZHJlblxuXG4gICAgICAgIGlmICh2Q2hpbGRyZW4pIHtcblxuICAgICAgICAgICAgdmFyIGNoaWxkTm9kZXMgPSByb290Tm9kZS5jaGlsZE5vZGVzXG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJvb3RJbmRleCArPSAxXG5cbiAgICAgICAgICAgICAgICB2YXIgdkNoaWxkID0gdkNoaWxkcmVuW2ldIHx8IG5vQ2hpbGRcbiAgICAgICAgICAgICAgICB2YXIgbmV4dEluZGV4ID0gcm9vdEluZGV4ICsgKHZDaGlsZC5jb3VudCB8fCAwKVxuXG4gICAgICAgICAgICAgICAgLy8gc2tpcCByZWN1cnNpb24gZG93biB0aGUgdHJlZSBpZiB0aGVyZSBhcmUgbm8gbm9kZXMgZG93biBoZXJlXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4SW5SYW5nZShpbmRpY2VzLCByb290SW5kZXgsIG5leHRJbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVjdXJzZShjaGlsZE5vZGVzW2ldLCB2Q2hpbGQsIGluZGljZXMsIG5vZGVzLCByb290SW5kZXgpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcm9vdEluZGV4ID0gbmV4dEluZGV4XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZXNcbn1cblxuLy8gQmluYXJ5IHNlYXJjaCBmb3IgYW4gaW5kZXggaW4gdGhlIGludGVydmFsIFtsZWZ0LCByaWdodF1cbmZ1bmN0aW9uIGluZGV4SW5SYW5nZShpbmRpY2VzLCBsZWZ0LCByaWdodCkge1xuICAgIGlmIChpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB2YXIgbWluSW5kZXggPSAwXG4gICAgdmFyIG1heEluZGV4ID0gaW5kaWNlcy5sZW5ndGggLSAxXG4gICAgdmFyIGN1cnJlbnRJbmRleFxuICAgIHZhciBjdXJyZW50SXRlbVxuXG4gICAgd2hpbGUgKG1pbkluZGV4IDw9IG1heEluZGV4KSB7XG4gICAgICAgIGN1cnJlbnRJbmRleCA9ICgobWF4SW5kZXggKyBtaW5JbmRleCkgLyAyKSA+PiAwXG4gICAgICAgIGN1cnJlbnRJdGVtID0gaW5kaWNlc1tjdXJyZW50SW5kZXhdXG5cbiAgICAgICAgaWYgKG1pbkluZGV4ID09PSBtYXhJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRJdGVtID49IGxlZnQgJiYgY3VycmVudEl0ZW0gPD0gcmlnaHRcbiAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50SXRlbSA8IGxlZnQpIHtcbiAgICAgICAgICAgIG1pbkluZGV4ID0gY3VycmVudEluZGV4ICsgMVxuICAgICAgICB9IGVsc2UgIGlmIChjdXJyZW50SXRlbSA+IHJpZ2h0KSB7XG4gICAgICAgICAgICBtYXhJbmRleCA9IGN1cnJlbnRJbmRleCAtIDFcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gICAgcmV0dXJuIGEgPiBiID8gMSA6IC0xXG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIHZhciBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJ2YXIgYXBwbHlQcm9wZXJ0aWVzID0gcmVxdWlyZShcIi4vYXBwbHktcHJvcGVydGllc1wiKVxuXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwidnRyZWUvaXMtd2lkZ2V0XCIpXG52YXIgVlBhdGNoID0gcmVxdWlyZShcInZ0cmVlL3ZwYXRjaFwiKVxuXG52YXIgcmVuZGVyID0gcmVxdWlyZShcIi4vY3JlYXRlLWVsZW1lbnRcIilcbnZhciB1cGRhdGVXaWRnZXQgPSByZXF1aXJlKFwiLi91cGRhdGUtd2lkZ2V0XCIpXG5cbm1vZHVsZS5leHBvcnRzID0gYXBwbHlQYXRjaFxuXG5mdW5jdGlvbiBhcHBseVBhdGNoKHZwYXRjaCwgZG9tTm9kZSwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciB0eXBlID0gdnBhdGNoLnR5cGVcbiAgICB2YXIgdk5vZGUgPSB2cGF0Y2gudk5vZGVcbiAgICB2YXIgcGF0Y2ggPSB2cGF0Y2gucGF0Y2hcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIFZQYXRjaC5SRU1PVkU6XG4gICAgICAgICAgICByZXR1cm4gcmVtb3ZlTm9kZShkb21Ob2RlLCB2Tm9kZSlcbiAgICAgICAgY2FzZSBWUGF0Y2guSU5TRVJUOlxuICAgICAgICAgICAgcmV0dXJuIGluc2VydE5vZGUoZG9tTm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLlZURVhUOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmluZ1BhdGNoKGRvbU5vZGUsIHZOb2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guV0lER0VUOlxuICAgICAgICAgICAgcmV0dXJuIHdpZGdldFBhdGNoKGRvbU5vZGUsIHZOb2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guVk5PREU6XG4gICAgICAgICAgICByZXR1cm4gdk5vZGVQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLk9SREVSOlxuICAgICAgICAgICAgcmVvcmRlckNoaWxkcmVuKGRvbU5vZGUsIHBhdGNoKVxuICAgICAgICAgICAgcmV0dXJuIGRvbU5vZGVcbiAgICAgICAgY2FzZSBWUGF0Y2guUFJPUFM6XG4gICAgICAgICAgICBhcHBseVByb3BlcnRpZXMoZG9tTm9kZSwgcGF0Y2gsIHZOb2RlLnByb3BlcnRpZXMpXG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgICAgICBjYXNlIFZQYXRjaC5USFVOSzpcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlUm9vdChkb21Ob2RlLFxuICAgICAgICAgICAgICAgIHJlbmRlck9wdGlvbnMucGF0Y2goZG9tTm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpKVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGRvbU5vZGVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZU5vZGUoZG9tTm9kZSwgdk5vZGUpIHtcbiAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChkb21Ob2RlKVxuICAgIH1cblxuICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgdk5vZGUpO1xuXG4gICAgcmV0dXJuIG51bGxcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Tm9kZShwYXJlbnROb2RlLCB2Tm9kZSwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBuZXdOb2RlID0gcmVuZGVyKHZOb2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5hcHBlbmRDaGlsZChuZXdOb2RlKVxuICAgIH1cblxuICAgIHJldHVybiBwYXJlbnROb2RlXG59XG5cbmZ1bmN0aW9uIHN0cmluZ1BhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgdlRleHQsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgbmV3Tm9kZVxuXG4gICAgaWYgKGRvbU5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgZG9tTm9kZS5yZXBsYWNlRGF0YSgwLCBkb21Ob2RlLmxlbmd0aCwgdlRleHQudGV4dClcbiAgICAgICAgbmV3Tm9kZSA9IGRvbU5vZGVcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuICAgICAgICBuZXdOb2RlID0gcmVuZGVyKHZUZXh0LCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkb21Ob2RlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCBsZWZ0Vk5vZGUpXG5cbiAgICByZXR1cm4gbmV3Tm9kZVxufVxuXG5mdW5jdGlvbiB3aWRnZXRQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHdpZGdldCwgcmVuZGVyT3B0aW9ucykge1xuICAgIGlmICh1cGRhdGVXaWRnZXQobGVmdFZOb2RlLCB3aWRnZXQpKSB7XG4gICAgICAgIHJldHVybiB3aWRnZXQudXBkYXRlKGxlZnRWTm9kZSwgZG9tTm9kZSkgfHwgZG9tTm9kZVxuICAgIH1cblxuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG4gICAgdmFyIG5ld1dpZGdldCA9IHJlbmRlcih3aWRnZXQsIHJlbmRlck9wdGlvbnMpXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdXaWRnZXQsIGRvbU5vZGUpXG4gICAgfVxuXG4gICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCBsZWZ0Vk5vZGUpXG5cbiAgICByZXR1cm4gbmV3V2lkZ2V0XG59XG5cbmZ1bmN0aW9uIHZOb2RlUGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB2Tm9kZSwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG4gICAgdmFyIG5ld05vZGUgPSByZW5kZXIodk5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkb21Ob2RlKVxuICAgIH1cblxuICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgbGVmdFZOb2RlKVxuXG4gICAgcmV0dXJuIG5ld05vZGVcbn1cblxuZnVuY3Rpb24gZGVzdHJveVdpZGdldChkb21Ob2RlLCB3KSB7XG4gICAgaWYgKHR5cGVvZiB3LmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIiAmJiBpc1dpZGdldCh3KSkge1xuICAgICAgICB3LmRlc3Ryb3koZG9tTm9kZSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlb3JkZXJDaGlsZHJlbihkb21Ob2RlLCBiSW5kZXgpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBbXVxuICAgIHZhciBjaGlsZE5vZGVzID0gZG9tTm9kZS5jaGlsZE5vZGVzXG4gICAgdmFyIGxlbiA9IGNoaWxkTm9kZXMubGVuZ3RoXG4gICAgdmFyIGlcbiAgICB2YXIgcmV2ZXJzZUluZGV4ID0gYkluZGV4LnJldmVyc2VcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjaGlsZHJlbi5wdXNoKGRvbU5vZGUuY2hpbGROb2Rlc1tpXSlcbiAgICB9XG5cbiAgICB2YXIgaW5zZXJ0T2Zmc2V0ID0gMFxuICAgIHZhciBtb3ZlXG4gICAgdmFyIG5vZGVcbiAgICB2YXIgaW5zZXJ0Tm9kZVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBtb3ZlID0gYkluZGV4W2ldXG4gICAgICAgIGlmIChtb3ZlICE9PSB1bmRlZmluZWQgJiYgbW92ZSAhPT0gaSkge1xuICAgICAgICAgICAgLy8gdGhlIGVsZW1lbnQgY3VycmVudGx5IGF0IHRoaXMgaW5kZXggd2lsbCBiZSBtb3ZlZCBsYXRlciBzbyBpbmNyZWFzZSB0aGUgaW5zZXJ0IG9mZnNldFxuICAgICAgICAgICAgaWYgKHJldmVyc2VJbmRleFtpXSA+IGkpIHtcbiAgICAgICAgICAgICAgICBpbnNlcnRPZmZzZXQrK1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBub2RlID0gY2hpbGRyZW5bbW92ZV1cbiAgICAgICAgICAgIGluc2VydE5vZGUgPSBjaGlsZE5vZGVzW2kgKyBpbnNlcnRPZmZzZXRdIHx8IG51bGxcbiAgICAgICAgICAgIGlmIChub2RlICE9PSBpbnNlcnROb2RlKSB7XG4gICAgICAgICAgICAgICAgZG9tTm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgaW5zZXJ0Tm9kZSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGhlIG1vdmVkIGVsZW1lbnQgY2FtZSBmcm9tIHRoZSBmcm9udCBvZiB0aGUgYXJyYXkgc28gcmVkdWNlIHRoZSBpbnNlcnQgb2Zmc2V0XG4gICAgICAgICAgICBpZiAobW92ZSA8IGkpIHtcbiAgICAgICAgICAgICAgICBpbnNlcnRPZmZzZXQtLVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZWxlbWVudCBhdCB0aGlzIGluZGV4IGlzIHNjaGVkdWxlZCB0byBiZSByZW1vdmVkIHNvIGluY3JlYXNlIGluc2VydCBvZmZzZXRcbiAgICAgICAgaWYgKGkgaW4gYkluZGV4LnJlbW92ZXMpIHtcbiAgICAgICAgICAgIGluc2VydE9mZnNldCsrXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VSb290KG9sZFJvb3QsIG5ld1Jvb3QpIHtcbiAgICBpZiAob2xkUm9vdCAmJiBuZXdSb290ICYmIG9sZFJvb3QgIT09IG5ld1Jvb3QgJiYgb2xkUm9vdC5wYXJlbnROb2RlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKG9sZFJvb3QpXG4gICAgICAgIG9sZFJvb3QucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Um9vdCwgb2xkUm9vdClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Um9vdDtcbn1cbiIsInZhciBkb2N1bWVudCA9IHJlcXVpcmUoXCJnbG9iYWwvZG9jdW1lbnRcIilcbnZhciBpc0FycmF5ID0gcmVxdWlyZShcIngtaXMtYXJyYXlcIilcblxudmFyIGRvbUluZGV4ID0gcmVxdWlyZShcIi4vZG9tLWluZGV4XCIpXG52YXIgcGF0Y2hPcCA9IHJlcXVpcmUoXCIuL3BhdGNoLW9wXCIpXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGNoXG5cbmZ1bmN0aW9uIHBhdGNoKHJvb3ROb2RlLCBwYXRjaGVzKSB7XG4gICAgcmV0dXJuIHBhdGNoUmVjdXJzaXZlKHJvb3ROb2RlLCBwYXRjaGVzKVxufVxuXG5mdW5jdGlvbiBwYXRjaFJlY3Vyc2l2ZShyb290Tm9kZSwgcGF0Y2hlcywgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBpbmRpY2VzID0gcGF0Y2hJbmRpY2VzKHBhdGNoZXMpXG5cbiAgICBpZiAoaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJvb3ROb2RlXG4gICAgfVxuXG4gICAgdmFyIGluZGV4ID0gZG9tSW5kZXgocm9vdE5vZGUsIHBhdGNoZXMuYSwgaW5kaWNlcylcbiAgICB2YXIgb3duZXJEb2N1bWVudCA9IHJvb3ROb2RlLm93bmVyRG9jdW1lbnRcblxuICAgIGlmICghcmVuZGVyT3B0aW9ucykge1xuICAgICAgICByZW5kZXJPcHRpb25zID0geyBwYXRjaDogcGF0Y2hSZWN1cnNpdmUgfVxuICAgICAgICBpZiAob3duZXJEb2N1bWVudCAhPT0gZG9jdW1lbnQpIHtcbiAgICAgICAgICAgIHJlbmRlck9wdGlvbnMuZG9jdW1lbnQgPSBvd25lckRvY3VtZW50XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluZGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG5vZGVJbmRleCA9IGluZGljZXNbaV1cbiAgICAgICAgcm9vdE5vZGUgPSBhcHBseVBhdGNoKHJvb3ROb2RlLFxuICAgICAgICAgICAgaW5kZXhbbm9kZUluZGV4XSxcbiAgICAgICAgICAgIHBhdGNoZXNbbm9kZUluZGV4XSxcbiAgICAgICAgICAgIHJlbmRlck9wdGlvbnMpXG4gICAgfVxuXG4gICAgcmV0dXJuIHJvb3ROb2RlXG59XG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2gocm9vdE5vZGUsIGRvbU5vZGUsIHBhdGNoTGlzdCwgcmVuZGVyT3B0aW9ucykge1xuICAgIGlmICghZG9tTm9kZSkge1xuICAgICAgICByZXR1cm4gcm9vdE5vZGVcbiAgICB9XG5cbiAgICB2YXIgbmV3Tm9kZVxuXG4gICAgaWYgKGlzQXJyYXkocGF0Y2hMaXN0KSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGNoTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbmV3Tm9kZSA9IHBhdGNoT3AocGF0Y2hMaXN0W2ldLCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgICAgICBpZiAoZG9tTm9kZSA9PT0gcm9vdE5vZGUpIHtcbiAgICAgICAgICAgICAgICByb290Tm9kZSA9IG5ld05vZGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld05vZGUgPSBwYXRjaE9wKHBhdGNoTGlzdCwgZG9tTm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICBpZiAoZG9tTm9kZSA9PT0gcm9vdE5vZGUpIHtcbiAgICAgICAgICAgIHJvb3ROb2RlID0gbmV3Tm9kZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJvb3ROb2RlXG59XG5cbmZ1bmN0aW9uIHBhdGNoSW5kaWNlcyhwYXRjaGVzKSB7XG4gICAgdmFyIGluZGljZXMgPSBbXVxuXG4gICAgZm9yICh2YXIga2V5IGluIHBhdGNoZXMpIHtcbiAgICAgICAgaWYgKGtleSAhPT0gXCJhXCIpIHtcbiAgICAgICAgICAgIGluZGljZXMucHVzaChOdW1iZXIoa2V5KSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpbmRpY2VzXG59XG4iLCJ2YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwidnRyZWUvaXMtd2lkZ2V0XCIpXG5cbm1vZHVsZS5leHBvcnRzID0gdXBkYXRlV2lkZ2V0XG5cbmZ1bmN0aW9uIHVwZGF0ZVdpZGdldChhLCBiKSB7XG4gICAgaWYgKGlzV2lkZ2V0KGEpICYmIGlzV2lkZ2V0KGIpKSB7XG4gICAgICAgIGlmIChcIm5hbWVcIiBpbiBhICYmIFwibmFtZVwiIGluIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBhLmlkID09PSBiLmlkXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYS5pbml0ID09PSBiLmluaXRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZVxufVxuIiwidmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxudmFyIGlzT2JqZWN0ID0gcmVxdWlyZShcImlzLW9iamVjdFwiKVxuXG52YXIgVlBhdGNoID0gcmVxdWlyZShcIi4vdnBhdGNoXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCIuL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4vaXMtdGh1bmtcIilcbnZhciBoYW5kbGVUaHVuayA9IHJlcXVpcmUoXCIuL2hhbmRsZS10aHVua1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRpZmZcblxuZnVuY3Rpb24gZGlmZihhLCBiKSB7XG4gICAgdmFyIHBhdGNoID0geyBhOiBhIH1cbiAgICB3YWxrKGEsIGIsIHBhdGNoLCAwKVxuICAgIHJldHVybiBwYXRjaFxufVxuXG5mdW5jdGlvbiB3YWxrKGEsIGIsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChhID09PSBiKSB7XG4gICAgICAgIGlmIChpc1RodW5rKGEpIHx8IGlzVGh1bmsoYikpIHtcbiAgICAgICAgICAgIHRodW5rcyhhLCBiLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBob29rcyhiLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIGFwcGx5ID0gcGF0Y2hbaW5kZXhdXG5cbiAgICBpZiAoYiA9PSBudWxsKSB7XG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlJFTU9WRSwgYSwgYikpXG4gICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICB9IGVsc2UgaWYgKGlzVGh1bmsoYSkgfHwgaXNUaHVuayhiKSkge1xuICAgICAgICB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KVxuICAgIH0gZWxzZSBpZiAoaXNWTm9kZShiKSkge1xuICAgICAgICBpZiAoaXNWTm9kZShhKSkge1xuICAgICAgICAgICAgaWYgKGEudGFnTmFtZSA9PT0gYi50YWdOYW1lICYmXG4gICAgICAgICAgICAgICAgYS5uYW1lc3BhY2UgPT09IGIubmFtZXNwYWNlICYmXG4gICAgICAgICAgICAgICAgYS5rZXkgPT09IGIua2V5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb3BzUGF0Y2ggPSBkaWZmUHJvcHMoYS5wcm9wZXJ0aWVzLCBiLnByb3BlcnRpZXMsIGIuaG9va3MpXG4gICAgICAgICAgICAgICAgaWYgKHByb3BzUGF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goVlBhdGNoLlBST1BTLCBhLCBwcm9wc1BhdGNoKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZOT0RFLCBhLCBiKSlcbiAgICAgICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFwcGx5ID0gZGlmZkNoaWxkcmVuKGEsIGIsIHBhdGNoLCBhcHBseSwgaW5kZXgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WTk9ERSwgYSwgYikpXG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVlRleHQoYikpIHtcbiAgICAgICAgaWYgKCFpc1ZUZXh0KGEpKSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WVEVYVCwgYSwgYikpXG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH0gZWxzZSBpZiAoYS50ZXh0ICE9PSBiLnRleHQpIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZURVhULCBhLCBiKSlcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNXaWRnZXQoYikpIHtcbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guV0lER0VULCBhLCBiKSlcblxuICAgICAgICBpZiAoIWlzV2lkZ2V0KGEpKSB7XG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYXBwbHkpIHtcbiAgICAgICAgcGF0Y2hbaW5kZXhdID0gYXBwbHlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRpZmZQcm9wcyhhLCBiLCBob29rcykge1xuICAgIHZhciBkaWZmXG5cbiAgICBmb3IgKHZhciBhS2V5IGluIGEpIHtcbiAgICAgICAgaWYgKCEoYUtleSBpbiBiKSkge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYUtleV0gPSB1bmRlZmluZWRcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhVmFsdWUgPSBhW2FLZXldXG4gICAgICAgIHZhciBiVmFsdWUgPSBiW2FLZXldXG5cbiAgICAgICAgaWYgKGhvb2tzICYmIGFLZXkgaW4gaG9va3MpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXNPYmplY3QoYVZhbHVlKSAmJiBpc09iamVjdChiVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdldFByb3RvdHlwZShiVmFsdWUpICE9PSBnZXRQcm90b3R5cGUoYVZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9iamVjdERpZmYgPSBkaWZmUHJvcHMoYVZhbHVlLCBiVmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIGlmIChvYmplY3REaWZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IG9iamVjdERpZmZcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYVZhbHVlICE9PSBiVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGJLZXkgaW4gYikge1xuICAgICAgICBpZiAoIShiS2V5IGluIGEpKSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZltiS2V5XSA9IGJbYktleV1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkaWZmXG59XG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZSh2YWx1ZSkge1xuICAgIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSlcbiAgICB9IGVsc2UgaWYgKHZhbHVlLl9fcHJvdG9fXykge1xuICAgICAgICByZXR1cm4gdmFsdWUuX19wcm90b19fXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlXG4gICAgfVxufVxuXG5mdW5jdGlvbiBkaWZmQ2hpbGRyZW4oYSwgYiwgcGF0Y2gsIGFwcGx5LCBpbmRleCkge1xuICAgIHZhciBhQ2hpbGRyZW4gPSBhLmNoaWxkcmVuXG4gICAgdmFyIGJDaGlsZHJlbiA9IHJlb3JkZXIoYUNoaWxkcmVuLCBiLmNoaWxkcmVuKVxuXG4gICAgdmFyIGFMZW4gPSBhQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGJMZW4gPSBiQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGxlbiA9IGFMZW4gPiBiTGVuID8gYUxlbiA6IGJMZW5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGxlZnROb2RlID0gYUNoaWxkcmVuW2ldXG4gICAgICAgIHZhciByaWdodE5vZGUgPSBiQ2hpbGRyZW5baV1cbiAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgIGlmICghbGVmdE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChyaWdodE5vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBFeGNlc3Mgbm9kZXMgaW4gYiBuZWVkIHRvIGJlIGFkZGVkXG4gICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IFZQYXRjaChWUGF0Y2guSU5TRVJULCBudWxsLCByaWdodE5vZGUpKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFyaWdodE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChsZWZ0Tm9kZSkge1xuICAgICAgICAgICAgICAgIC8vIEV4Y2VzcyBub2RlcyBpbiBhIG5lZWQgdG8gYmUgcmVtb3ZlZFxuICAgICAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlJFTU9WRSwgbGVmdE5vZGUsIG51bGwpXG4gICAgICAgICAgICAgICAgZGVzdHJveVdpZGdldHMobGVmdE5vZGUsIHBhdGNoLCBpbmRleClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdhbGsobGVmdE5vZGUsIHJpZ2h0Tm9kZSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzVk5vZGUobGVmdE5vZGUpICYmIGxlZnROb2RlLmNvdW50KSB7XG4gICAgICAgICAgICBpbmRleCArPSBsZWZ0Tm9kZS5jb3VudFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGJDaGlsZHJlbi5tb3Zlcykge1xuICAgICAgICAvLyBSZW9yZGVyIG5vZGVzIGxhc3RcbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guT1JERVIsIGEsIGJDaGlsZHJlbi5tb3ZlcykpXG4gICAgfVxuXG4gICAgcmV0dXJuIGFwcGx5XG59XG5cbi8vIFBhdGNoIHJlY29yZHMgZm9yIGFsbCBkZXN0cm95ZWQgd2lkZ2V0cyBtdXN0IGJlIGFkZGVkIGJlY2F1c2Ugd2UgbmVlZFxuLy8gYSBET00gbm9kZSByZWZlcmVuY2UgZm9yIHRoZSBkZXN0cm95IGZ1bmN0aW9uXG5mdW5jdGlvbiBkZXN0cm95V2lkZ2V0cyh2Tm9kZSwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGlzV2lkZ2V0KHZOb2RlKSkge1xuICAgICAgICBpZiAodHlwZW9mIHZOb2RlLmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCB2Tm9kZSwgbnVsbClcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWTm9kZSh2Tm9kZSkgJiYgdk5vZGUuaGFzV2lkZ2V0cykge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSB2Tm9kZS5jaGlsZHJlblxuICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGNoaWxkLCBwYXRjaCwgaW5kZXgpXG5cbiAgICAgICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSAmJiBjaGlsZC5jb3VudCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IGNoaWxkLmNvdW50XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIENyZWF0ZSBhIHN1Yi1wYXRjaCBmb3IgdGh1bmtzXG5mdW5jdGlvbiB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KSB7XG4gICAgdmFyIG5vZGVzID0gaGFuZGxlVGh1bmsoYSwgYik7XG4gICAgdmFyIHRodW5rUGF0Y2ggPSBkaWZmKG5vZGVzLmEsIG5vZGVzLmIpXG4gICAgaWYgKGhhc1BhdGNoZXModGh1bmtQYXRjaCkpIHtcbiAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guVEhVTkssIG51bGwsIHRodW5rUGF0Y2gpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBoYXNQYXRjaGVzKHBhdGNoKSB7XG4gICAgZm9yICh2YXIgaW5kZXggaW4gcGF0Y2gpIHtcbiAgICAgICAgaWYgKGluZGV4ICE9PSBcImFcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIEV4ZWN1dGUgaG9va3Mgd2hlbiB0d28gbm9kZXMgYXJlIGlkZW50aWNhbFxuZnVuY3Rpb24gaG9va3Modk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChpc1ZOb2RlKHZOb2RlKSkge1xuICAgICAgICBpZiAodk5vZGUuaG9va3MpIHtcbiAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlBST1BTLCB2Tm9kZS5ob29rcywgdk5vZGUuaG9va3MpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodk5vZGUuZGVzY2VuZGFudEhvb2tzKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSB2Tm9kZS5jaGlsZHJlblxuICAgICAgICAgICAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgICAgICAgICAgaG9va3MoY2hpbGQsIHBhdGNoLCBpbmRleClcblxuICAgICAgICAgICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSAmJiBjaGlsZC5jb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSBjaGlsZC5jb3VudFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gTGlzdCBkaWZmLCBuYWl2ZSBsZWZ0IHRvIHJpZ2h0IHJlb3JkZXJpbmdcbmZ1bmN0aW9uIHJlb3JkZXIoYUNoaWxkcmVuLCBiQ2hpbGRyZW4pIHtcblxuICAgIHZhciBiS2V5cyA9IGtleUluZGV4KGJDaGlsZHJlbilcblxuICAgIGlmICghYktleXMpIHtcbiAgICAgICAgcmV0dXJuIGJDaGlsZHJlblxuICAgIH1cblxuICAgIHZhciBhS2V5cyA9IGtleUluZGV4KGFDaGlsZHJlbilcblxuICAgIGlmICghYUtleXMpIHtcbiAgICAgICAgcmV0dXJuIGJDaGlsZHJlblxuICAgIH1cblxuICAgIHZhciBiTWF0Y2ggPSB7fSwgYU1hdGNoID0ge31cblxuICAgIGZvciAodmFyIGtleSBpbiBiS2V5cykge1xuICAgICAgICBiTWF0Y2hbYktleXNba2V5XV0gPSBhS2V5c1trZXldXG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIGFLZXlzKSB7XG4gICAgICAgIGFNYXRjaFthS2V5c1trZXldXSA9IGJLZXlzW2tleV1cbiAgICB9XG5cbiAgICB2YXIgYUxlbiA9IGFDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgYkxlbiA9IGJDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgbGVuID0gYUxlbiA+IGJMZW4gPyBhTGVuIDogYkxlblxuICAgIHZhciBzaHVmZmxlID0gW11cbiAgICB2YXIgZnJlZUluZGV4ID0gMFxuICAgIHZhciBpID0gMFxuICAgIHZhciBtb3ZlSW5kZXggPSAwXG4gICAgdmFyIG1vdmVzID0ge31cbiAgICB2YXIgcmVtb3ZlcyA9IG1vdmVzLnJlbW92ZXMgPSB7fVxuICAgIHZhciByZXZlcnNlID0gbW92ZXMucmV2ZXJzZSA9IHt9XG4gICAgdmFyIGhhc01vdmVzID0gZmFsc2VcblxuICAgIHdoaWxlIChmcmVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgdmFyIG1vdmUgPSBhTWF0Y2hbaV1cbiAgICAgICAgaWYgKG1vdmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IGJDaGlsZHJlblttb3ZlXVxuICAgICAgICAgICAgaWYgKG1vdmUgIT09IG1vdmVJbmRleCkge1xuICAgICAgICAgICAgICAgIG1vdmVzW21vdmVdID0gbW92ZUluZGV4XG4gICAgICAgICAgICAgICAgcmV2ZXJzZVttb3ZlSW5kZXhdID0gbW92ZVxuICAgICAgICAgICAgICAgIGhhc01vdmVzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbW92ZUluZGV4KytcbiAgICAgICAgfSBlbHNlIGlmIChpIGluIGFNYXRjaCkge1xuICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgcmVtb3Zlc1tpXSA9IG1vdmVJbmRleCsrXG4gICAgICAgICAgICBoYXNNb3ZlcyA9IHRydWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoaWxlIChiTWF0Y2hbZnJlZUluZGV4XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZnJlZUluZGV4KytcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZyZWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgICAgIHZhciBmcmVlQ2hpbGQgPSBiQ2hpbGRyZW5bZnJlZUluZGV4XVxuICAgICAgICAgICAgICAgIGlmIChmcmVlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IGZyZWVDaGlsZFxuICAgICAgICAgICAgICAgICAgICBpZiAoZnJlZUluZGV4ICE9PSBtb3ZlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc01vdmVzID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZXNbZnJlZUluZGV4XSA9IG1vdmVJbmRleFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV2ZXJzZVttb3ZlSW5kZXhdID0gZnJlZUluZGV4XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbW92ZUluZGV4KytcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJlZUluZGV4KytcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpKytcbiAgICB9XG5cbiAgICBpZiAoaGFzTW92ZXMpIHtcbiAgICAgICAgc2h1ZmZsZS5tb3ZlcyA9IG1vdmVzXG4gICAgfVxuXG4gICAgcmV0dXJuIHNodWZmbGVcbn1cblxuZnVuY3Rpb24ga2V5SW5kZXgoY2hpbGRyZW4pIHtcbiAgICB2YXIgaSwga2V5c1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG5cbiAgICAgICAgaWYgKGNoaWxkLmtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBrZXlzID0ga2V5cyB8fCB7fVxuICAgICAgICAgICAga2V5c1tjaGlsZC5rZXldID0gaVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGtleXNcbn1cblxuZnVuY3Rpb24gYXBwZW5kUGF0Y2goYXBwbHksIHBhdGNoKSB7XG4gICAgaWYgKGFwcGx5KSB7XG4gICAgICAgIGlmIChpc0FycmF5KGFwcGx5KSkge1xuICAgICAgICAgICAgYXBwbHkucHVzaChwYXRjaClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwcGx5ID0gW2FwcGx5LCBwYXRjaF1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcHBseVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwYXRjaFxuICAgIH1cbn1cbiIsInZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4vaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4vaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuL2lzLXdpZGdldFwiKVxudmFyIGlzVGh1bmsgPSByZXF1aXJlKFwiLi9pcy10aHVua1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhhbmRsZVRodW5rXG5cbmZ1bmN0aW9uIGhhbmRsZVRodW5rKGEsIGIpIHtcbiAgICB2YXIgcmVuZGVyZWRBID0gYVxuICAgIHZhciByZW5kZXJlZEIgPSBiXG5cbiAgICBpZiAoaXNUaHVuayhiKSkge1xuICAgICAgICByZW5kZXJlZEIgPSByZW5kZXJUaHVuayhiLCBhKVxuICAgIH1cblxuICAgIGlmIChpc1RodW5rKGEpKSB7XG4gICAgICAgIHJlbmRlcmVkQSA9IHJlbmRlclRodW5rKGEsIG51bGwpXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgYTogcmVuZGVyZWRBLFxuICAgICAgICBiOiByZW5kZXJlZEJcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbmRlclRodW5rKHRodW5rLCBwcmV2aW91cykge1xuICAgIHZhciByZW5kZXJlZFRodW5rID0gdGh1bmsudm5vZGVcblxuICAgIGlmICghcmVuZGVyZWRUaHVuaykge1xuICAgICAgICByZW5kZXJlZFRodW5rID0gdGh1bmsudm5vZGUgPSB0aHVuay5yZW5kZXIocHJldmlvdXMpXG4gICAgfVxuXG4gICAgaWYgKCEoaXNWTm9kZShyZW5kZXJlZFRodW5rKSB8fFxuICAgICAgICAgICAgaXNWVGV4dChyZW5kZXJlZFRodW5rKSB8fFxuICAgICAgICAgICAgaXNXaWRnZXQocmVuZGVyZWRUaHVuaykpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInRodW5rIGRpZCBub3QgcmV0dXJuIGEgdmFsaWQgbm9kZVwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVuZGVyZWRUaHVua1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc1RodW5rXHJcblxyXG5mdW5jdGlvbiBpc1RodW5rKHQpIHtcclxuICAgIHJldHVybiB0ICYmIHQudHlwZSA9PT0gXCJUaHVua1wiXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc0hvb2tcblxuZnVuY3Rpb24gaXNIb29rKGhvb2spIHtcbiAgICByZXR1cm4gaG9vayAmJiB0eXBlb2YgaG9vay5ob29rID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgIWhvb2suaGFzT3duUHJvcGVydHkoXCJob29rXCIpXG59XG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBpc1ZpcnR1YWxOb2RlXG5cbmZ1bmN0aW9uIGlzVmlydHVhbE5vZGUoeCkge1xuICAgIHJldHVybiB4ICYmIHgudHlwZSA9PT0gXCJWaXJ0dWFsTm9kZVwiICYmIHgudmVyc2lvbiA9PT0gdmVyc2lvblxufVxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaXNWaXJ0dWFsVGV4dFxuXG5mdW5jdGlvbiBpc1ZpcnR1YWxUZXh0KHgpIHtcbiAgICByZXR1cm4geCAmJiB4LnR5cGUgPT09IFwiVmlydHVhbFRleHRcIiAmJiB4LnZlcnNpb24gPT09IHZlcnNpb25cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNXaWRnZXRcblxuZnVuY3Rpb24gaXNXaWRnZXQodykge1xuICAgIHJldHVybiB3ICYmIHcudHlwZSA9PT0gXCJXaWRnZXRcIlxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjFcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1ZIb29rID0gcmVxdWlyZShcIi4vaXMtdmhvb2tcIilcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsTm9kZVxuXG52YXIgbm9Qcm9wZXJ0aWVzID0ge31cbnZhciBub0NoaWxkcmVuID0gW11cblxuZnVuY3Rpb24gVmlydHVhbE5vZGUodGFnTmFtZSwgcHJvcGVydGllcywgY2hpbGRyZW4sIGtleSwgbmFtZXNwYWNlKSB7XG4gICAgdGhpcy50YWdOYW1lID0gdGFnTmFtZVxuICAgIHRoaXMucHJvcGVydGllcyA9IHByb3BlcnRpZXMgfHwgbm9Qcm9wZXJ0aWVzXG4gICAgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuIHx8IG5vQ2hpbGRyZW5cbiAgICB0aGlzLmtleSA9IGtleSAhPSBudWxsID8gU3RyaW5nKGtleSkgOiB1bmRlZmluZWRcbiAgICB0aGlzLm5hbWVzcGFjZSA9ICh0eXBlb2YgbmFtZXNwYWNlID09PSBcInN0cmluZ1wiKSA/IG5hbWVzcGFjZSA6IG51bGxcblxuICAgIHZhciBjb3VudCA9IChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHx8IDBcbiAgICB2YXIgZGVzY2VuZGFudHMgPSAwXG4gICAgdmFyIGhhc1dpZGdldHMgPSBmYWxzZVxuICAgIHZhciBkZXNjZW5kYW50SG9va3MgPSBmYWxzZVxuICAgIHZhciBob29rc1xuXG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcGVydGllcykge1xuICAgICAgICBpZiAocHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShwcm9wTmFtZSkpIHtcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbcHJvcE5hbWVdXG4gICAgICAgICAgICBpZiAoaXNWSG9vayhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWhvb2tzKSB7XG4gICAgICAgICAgICAgICAgICAgIGhvb2tzID0ge31cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBob29rc1twcm9wTmFtZV0gPSBwcm9wZXJ0eVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSkge1xuICAgICAgICAgICAgZGVzY2VuZGFudHMgKz0gY2hpbGQuY291bnQgfHwgMFxuXG4gICAgICAgICAgICBpZiAoIWhhc1dpZGdldHMgJiYgY2hpbGQuaGFzV2lkZ2V0cykge1xuICAgICAgICAgICAgICAgIGhhc1dpZGdldHMgPSB0cnVlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZGVzY2VuZGFudEhvb2tzICYmIChjaGlsZC5ob29rcyB8fCBjaGlsZC5kZXNjZW5kYW50SG9va3MpKSB7XG4gICAgICAgICAgICAgICAgZGVzY2VuZGFudEhvb2tzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFoYXNXaWRnZXRzICYmIGlzV2lkZ2V0KGNoaWxkKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjaGlsZC5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBoYXNXaWRnZXRzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb3VudCA9IGNvdW50ICsgZGVzY2VuZGFudHNcbiAgICB0aGlzLmhhc1dpZGdldHMgPSBoYXNXaWRnZXRzXG4gICAgdGhpcy5ob29rcyA9IGhvb2tzXG4gICAgdGhpcy5kZXNjZW5kYW50SG9va3MgPSBkZXNjZW5kYW50SG9va3Ncbn1cblxuVmlydHVhbE5vZGUucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsTm9kZS5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbE5vZGVcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cblZpcnR1YWxQYXRjaC5OT05FID0gMFxuVmlydHVhbFBhdGNoLlZURVhUID0gMVxuVmlydHVhbFBhdGNoLlZOT0RFID0gMlxuVmlydHVhbFBhdGNoLldJREdFVCA9IDNcblZpcnR1YWxQYXRjaC5QUk9QUyA9IDRcblZpcnR1YWxQYXRjaC5PUkRFUiA9IDVcblZpcnR1YWxQYXRjaC5JTlNFUlQgPSA2XG5WaXJ0dWFsUGF0Y2guUkVNT1ZFID0gN1xuVmlydHVhbFBhdGNoLlRIVU5LID0gOFxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxQYXRjaFxuXG5mdW5jdGlvbiBWaXJ0dWFsUGF0Y2godHlwZSwgdk5vZGUsIHBhdGNoKSB7XG4gICAgdGhpcy50eXBlID0gTnVtYmVyKHR5cGUpXG4gICAgdGhpcy52Tm9kZSA9IHZOb2RlXG4gICAgdGhpcy5wYXRjaCA9IHBhdGNoXG59XG5cblZpcnR1YWxQYXRjaC5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxQYXRjaC5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbFBhdGNoXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxUZXh0XG5cbmZ1bmN0aW9uIFZpcnR1YWxUZXh0KHRleHQpIHtcbiAgICB0aGlzLnRleHQgPSBTdHJpbmcodGV4dClcbn1cblxuVmlydHVhbFRleHQucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsVGV4dC5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbFRleHRcIlxuIiwidmFyIG5hdGl2ZUlzQXJyYXkgPSBBcnJheS5pc0FycmF5XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG5cbm1vZHVsZS5leHBvcnRzID0gbmF0aXZlSXNBcnJheSB8fCBpc0FycmF5XG5cbmZ1bmN0aW9uIGlzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiXG59XG4iLCJ2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG5cbm1vZHVsZS5leHBvcnRzID0gaXNTdHJpbmdcblxuZnVuY3Rpb24gaXNTdHJpbmcob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IFN0cmluZ11cIlxufVxuIiwidmFyIHBhdGNoID0gcmVxdWlyZShcInZkb20vcGF0Y2hcIilcblxubW9kdWxlLmV4cG9ydHMgPSBwYXRjaFxuIl19
