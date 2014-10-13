(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var ClayRegister = require('./register').default;
var helper = require('./helper').default;
var Template = require('./template').default;
var TemplateHelper = require('./template-helper').default;
var Element = require('./element').default;
var Observer = require('./observer').default;
var Event = require('./event').default;
var Helper = require('./helper').default;
var ModHttp = require('./modules/http').default;

/**
 * @class Claylump
 * @type {Object}
 */
window.Claylump = helper.mix(ClayRegister, {

  Template       : Template,
  TemplateHelper : TemplateHelper,
  Element        : Element,
  Observer       : Observer,
  Event          : Event,
  Helper         : Helper,

  modules : {
    http : ModHttp
  }
});

},{"./element":2,"./event":3,"./helper":4,"./modules/http":5,"./observer":6,"./register":7,"./template":10,"./template-helper":9}],2:[function(require,module,exports){
'use strict';

var helper = require('./helper').default;
var template = require('./template').default;
var event = require('./event').default;

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
       * @property {Object.<string, (string|function)>} events
       */
      events: {},

      /**
       * @property {Object.<string, function>} use
       */
      use: {}
    };

    // defaults
    helper.mix(proto, defaults);

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
    if (helper.isArray(el)) {
      return el.map(function(e) {
        return this.closestOf(e, selector);
      }.bind(this));
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
   * an instance was inserted into the document
   * enable events & call original attached callback
   */
  attachedCallback : function() {
    // event delegation
    this.events.enable(this);

    // original
    this._attached.apply(this, arguments);
  },

  /**
   * an instance was removed from the document
   * disable events & call original detached callback
   */
  detachedCallback : function() {
    // disable event
    this.events.disable();

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
   * call super element's methods
   *
   * @param {String} methodName
   * @param {...*} passArgs
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
};
},{"./event":3,"./helper":4,"./template":10}],3:[function(require,module,exports){
'use strict';

var helper = require('./helper').default;

var REX_EVENT_SPRITTER = /\s+/;

exports.default = {
  /**
   * @param {Element} el
   * @param {Object} events
   * @returns {ClayEvent}
   */
  create: function(el, events) {
    return new ClayEvent(el, events);
  }
};

var ClayEvent = function() {
  function ClayEvent(el, events) {
    this.currentHandlers = [];
    this.setEl(el);
    this.setEvents(events);
  }

  Object.defineProperties(ClayEvent.prototype, {
    setEl: {
      writeable: true,

      value: function(el) {
        this.el = el;
      }
    },

    setEvents: {
      writeable: true,

      value: function(events) {
        this.events = events;
      }
    },

    enable: {
      writeable: true,

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
      writeable: true,

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
      writeable: true,

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
      writeable: true,

      value: function(target, type, options, bubble, cancel) {
        if (cancel === undefined)
          cancel = true;

        if (bubble === undefined)
          bubble = false;

        if (options === undefined)
          options = {};

        if (helper.isArray(target)) {
          helper.toArray(target)
                .forEach(function(el) {
            return this.emit(el, type, options, bubble, cancel);
          }.bind(this));
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
      writeable: true,

      value: function() {
        var i = 0, obj;
        while ((obj = this.currentHandlers[i++])) {
          this.el.removeEventListener(obj.event, obj.handler, true);
        }
        this.currentHandlers = [];
      }
    }
  });

  return ClayEvent;
}();

},{"./helper":4}],4:[function(require,module,exports){
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
  toArray   : toArray,
  toString  : toString,

  matchElement : matchElement,

  isString            : isString,
  isNumber            : isNumber,
  isArray             : isArray,
  isFunction          : isFunction,
  isCustomElementName : isCustomElementName
};

},{}],5:[function(require,module,exports){
'use strict';

var helper = require('../helper').default;

// test sample
function Http(ctx) {
  this.context = ctx;
}

helper.mix(Http.prototype, {
  get: function(url) {

  }
});

exports.default = function factory(context) {
  return new Http(context);
};

},{"../helper":4}],6:[function(require,module,exports){
'use strict';

exports.default = {
  /**
   * @static
   * @returns {ClayObserver}
   */
  create: function() {
    return new ClayObserver();
  }
};

var ClayObserver = function() {
 function ClayObserver() {}
 return ClayObserver;
}();

},{}],7:[function(require,module,exports){
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

},{"./element":2,"./helper":4}],8:[function(require,module,exports){
'use strict';

var helper = require("./helper").default;
var tmplHelper = require("./template-helper").default;
var htmlParser = require("htmlParser");

var REX_INTERPOLATE_SYMBOL = /{{[^{}]+}}/g,
    REX_REPEAT_SYMBOL      = /{{(\w+)\sin\s([\w\.]+)}}/,
    STR_REPEAT_ATTRIBUTE   = 'cl-repeat';

exports.default = {
  /**
   * @static
   * @param {String} html
   * @returns {ClayTemplateCompiler}
   */
  create: function(html) {
    return new ClayTemplateCompiler(html);
  }
};

var ClayTemplateCompiler = function() {
  function ClayTemplateCompiler(html) {
    var handler = new htmlParser.DefaultHandler(function (err, dom) {
          if (err) {
            console.error(err);
          }
        }, {
          enforceEmptyTags : true,
          ignoreWhitespace : true,
          verbose          : false
        }),
        parser = new htmlParser.Parser(handler);

    // parse html
    parser.parseComplete(html);
    if (handler.dom.length > 1) {
      throw Error('Template must have exactly one root element. was: ' + html);
    }

    // compile
    this.structure = compileDomStructure(handler.dom[0]);
  }

  Object.defineProperties(ClayTemplateCompiler.prototype, {
    getCompiled: {
      writeable: true,

      value: function() {
        return this.structure;
      }
    }
  });

  return ClayTemplateCompiler;
}();

/**
 * @destructive
 * @param {Object} domStructure
 */
function compileDomStructure(domStructure) {
  if (domStructure === undefined)
    domStructure = {};

  var data     = domStructure.data,
      attrs    = domStructure.attribs    || {},
      children = domStructure.children   || [],
      hooks    = domStructure.hooks      = {},
      evals    = domStructure.evaluators = {
        attrs  : {},
        style  : null,
        data   : null,
        repeat : null
      },
      keys, key, i = 0;

  // styles evaluator
  if (attrs.style) {
    domStructure.style = attrs.style;
    evals.style = compileValue(domStructure.style);
    delete attrs.style;  // delete from orig attrib object
  }

  // attributes evaluator & hook
  keys = Object.keys(attrs);
  while ((key = keys[i++])) {
    // hook
    if (tmplHelper[key]) {
      hooks[key] = hook(tmplHelper[key]);
    }
    // repeat
    else if (key === STR_REPEAT_ATTRIBUTE) {
      evals.repeat = compileRepeatExpression(attrs[STR_REPEAT_ATTRIBUTE]);
      delete attrs[STR_REPEAT_ATTRIBUTE]; // delete from orig attrib object
    }
    // interpolate
    else {
      evals.attrs[key] = compileValue(attrs[key]);
    }
  }

  // data (text) evaluator
  evals.data = compileValue(data);

  // recursive
  children.forEach(function(child) {
    compileDomStructure(child);
  });

  return domStructure;
}

/**
 * @param {String} str
 * @returns {?Function}
 */
function compileValue(str) {
  str = (str || '');
  var matches = str.match(REX_INTERPOLATE_SYMBOL);

  if (matches === null) {
    return null;
  }

  return new Function('data',[
    "var s=[];",
    "s.push('",
    str.replace(/[\r\n\t]/g, ' ')
       .split("'").join("\\'")
       .replace(/{{([^{}]+)}}/g, "',(data.$1 != null ? data.$1 : ''),'")
       .split(/\s{2,}/).join(' '),
    "');",
    "return s.join('');"
  ].join(''));
}

/**
 * @param {String} repeatExpr
 * @returns {Function}
 */
function compileRepeatExpression(repeatExpr) {
  var matches = (repeatExpr || '').match(REX_REPEAT_SYMBOL),
      parentTargetPath,
      childScopeName;

  if (matches === null) {
    throw new Error('Unexpected syntax for repeat: ' + repeatExpr)
  }

  parentTargetPath = matches[2];
  childScopeName   = matches[1];

  return new Function('data', [
    "return data." + parentTargetPath + ".map(function(item) {",
    "  var ks, k, i = 0, r = {};",
    "  ks = Object.keys(data);",
    "  while ((k = ks[i++])) {",
    "    r[k] = data[k];",
    "  }",
    "  r." + childScopeName + " = item;",
    "  return r;",
    "});"
  ].join(''));
}

var HookWrapper = function() {
  function HookWrapper(fn) {
    this.fn = fn
  }

  Object.defineProperties(HookWrapper.prototype, {
    hook: {
      writeable: true,

      value: function() {
        this.fn.apply(this, arguments)
      }
    }
  });

  return HookWrapper;
}();

/**
 * @param {Function} fn
 * @returns {HookWrapper}
 * @constructor
 */
function hook(fn) {
  return new HookWrapper(fn)
}

},{"./helper":4,"./template-helper":9,"htmlParser":12}],9:[function(require,module,exports){
'use strict';

var helper = require("./helper").default;

exports.default = {
  register: function(name, func) {
    this[name] = func;
  },
  hook: function(el) {
    console.log('hook', el);
  }
};

},{"./helper":4}],10:[function(require,module,exports){
'use strict';

var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var helper = require("./helper").default;
var tmplCompiler = require("./template-compiler").default;
var create = require('virtual-dom/create-element');

window.requestAnimationFrame  = window.requestAnimationFrame ||
                                window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame;

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
  function ClayTemplate(html, scope) {
    if (scope === undefined)
      scope = {};

    this._diffQueue   = [];
    this._invalidated = false;

    this.scope    = scope;
    this.compiled = tmplCompiler.create(html).getCompiled();
  }

  Object.defineProperties(ClayTemplate.prototype, {
    createVTree: {
      writeable: true,

      value: function() {
        return this._currentVTree = convertParsedDomToVTree(this.compiled, this.scope);
      }
    },

    createElement: {
      writeable: true,

      value: function(doc) {
        if (doc === undefined)
          doc = document;

        return create(this.createVTree(), {
          document: doc
        });
      }
    },

    invalidate: {
      writeable: true,

      value: function() {
        if (this._invalidated) {
          return;
        }
        this._invalidated = true;
        setTimeout(this._update.bind(this), 4);
      }
    },

    _update: {
      writeable: true,

      value: function() {
        var current = this._currentVTree,
            updated = convertParsedDomToVTree(this.compiled, this.scope);

        this._diffQueue = diff(current, updated);
        this._currentVTree = updated;

        this._invalidated = false;
      }
    },

    drawLoop: {
      writeable: true,

      value: function(targetRoot) {
        var patchDOM = function() {
          if (this._diffQueue) {
            patch(targetRoot, this._diffQueue);
            this._diffQueue = null;
          }
          window.requestAnimationFrame(patchDOM);
        }.bind(this);

        patchDOM();
      }
    },

    destroy: {
      writeable: true,

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
      hooks    = dom.hooks,
      keys, key, i = 0;

  switch(type) {
    case 'tag':

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

},{"./helper":4,"./template-compiler":8,"virtual-dom/create-element":13,"virtual-dom/diff":14,"virtual-dom/h":15,"virtual-dom/patch":40}],11:[function(require,module,exports){

},{}],12:[function(require,module,exports){
(function (__filename,__dirname){
/***********************************************
Copyright 2010, 2011, Chris Winberry <chris@winberry.net>. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
***********************************************/
/* v1.7.6 */

(function () {

function runningInNode () {
	return(
		(typeof require) == "function"
		&&
		(typeof exports) == "object"
		&&
		(typeof module) == "object"
		&&
		(typeof __filename) == "string"
		&&
		(typeof __dirname) == "string"
		);
}

if (!runningInNode()) {
	if (!this.Tautologistics)
		this.Tautologistics = {};
	else if (this.Tautologistics.NodeHtmlParser)
		return; //NodeHtmlParser already defined!
	this.Tautologistics.NodeHtmlParser = {};
	exports = this.Tautologistics.NodeHtmlParser;
}

//Types of elements found in the DOM
var ElementType = {
	  Text: "text" //Plain text
	, Directive: "directive" //Special tag <!...>
	, Comment: "comment" //Special tag <!--...-->
	, Script: "script" //Special tag <script>...</script>
	, Style: "style" //Special tag <style>...</style>
	, Tag: "tag" //Any tag that isn't special
}

function Parser (handler, options) {
	this._options = options ? options : { };
	if (this._options.includeLocation == undefined) {
		this._options.includeLocation = false; //Do not track element position in document by default
	}

	this.validateHandler(handler);
	this._handler = handler;
	this.reset();
}

	//**"Static"**//
	//Regular expressions used for cleaning up and parsing (stateless)
	Parser._reTrim = /(^\s+|\s+$)/g; //Trim leading/trailing whitespace
	Parser._reTrimComment = /(^\!--|--$)/g; //Remove comment tag markup from comment contents
	Parser._reWhitespace = /\s/g; //Used to find any whitespace to split on
	Parser._reTagName = /^\s*(\/?)\s*([^\s\/]+)/; //Used to find the tag name for an element

	//Regular expressions used for parsing (stateful)
	Parser._reAttrib = //Find attributes in a tag
		/([^=<>\"\'\s]+)\s*=\s*"([^"]*)"|([^=<>\"\'\s]+)\s*=\s*'([^']*)'|([^=<>\"\'\s]+)\s*=\s*([^'"\s]+)|([^=<>\"\'\s\/]+)/g;
	Parser._reTags = /[\<\>]/g; //Find tag markers

	//**Public**//
	//Methods//
	//Parses a complete HTML and pushes it to the handler
	Parser.prototype.parseComplete = function Parser$parseComplete (data) {
		this.reset();
		this.parseChunk(data);
		this.done();
	}

	//Parses a piece of an HTML document
	Parser.prototype.parseChunk = function Parser$parseChunk (data) {
		if (this._done)
			this.handleError(new Error("Attempted to parse chunk after parsing already done"));
		this._buffer += data; //FIXME: this can be a bottleneck
		this.parseTags();
	}

	//Tells the parser that the HTML being parsed is complete
	Parser.prototype.done = function Parser$done () {
		if (this._done)
			return;
		this._done = true;
	
		//Push any unparsed text into a final element in the element list
		if (this._buffer.length) {
			var rawData = this._buffer;
			this._buffer = "";
			var element = {
				  raw: rawData
				, data: (this._parseState == ElementType.Text) ? rawData : rawData.replace(Parser._reTrim, "")
				, type: this._parseState
				};
			if (this._parseState == ElementType.Tag || this._parseState == ElementType.Script || this._parseState == ElementType.Style)
				element.name = this.parseTagName(element.data);
			this.parseAttribs(element);
			this._elements.push(element);
		}
	
		this.writeHandler();
		this._handler.done();
	}

	//Resets the parser to a blank state, ready to parse a new HTML document
	Parser.prototype.reset = function Parser$reset () {
		this._buffer = "";
		this._done = false;
		this._elements = [];
		this._elementsCurrent = 0;
		this._current = 0;
		this._next = 0;
		this._location = {
			  row: 0
			, col: 0
			, charOffset: 0
			, inBuffer: 0
		};
		this._parseState = ElementType.Text;
		this._prevTagSep = '';
		this._tagStack = [];
		this._handler.reset();
	}
	
	//**Private**//
	//Properties//
	Parser.prototype._options = null; //Parser options for how to behave
	Parser.prototype._handler = null; //Handler for parsed elements
	Parser.prototype._buffer = null; //Buffer of unparsed data
	Parser.prototype._done = false; //Flag indicating whether parsing is done
	Parser.prototype._elements =  null; //Array of parsed elements
	Parser.prototype._elementsCurrent = 0; //Pointer to last element in _elements that has been processed
	Parser.prototype._current = 0; //Position in data that has already been parsed
	Parser.prototype._next = 0; //Position in data of the next tag marker (<>)
	Parser.prototype._location = null; //Position tracking for elements in a stream
	Parser.prototype._parseState = ElementType.Text; //Current type of element being parsed
	Parser.prototype._prevTagSep = ''; //Previous tag marker found
	//Stack of element types previously encountered; keeps track of when
	//parsing occurs inside a script/comment/style tag
	Parser.prototype._tagStack = null;

	//Methods//
	//Takes an array of elements and parses any found attributes
	Parser.prototype.parseTagAttribs = function Parser$parseTagAttribs (elements) {
		var idxEnd = elements.length;
		var idx = 0;
	
		while (idx < idxEnd) {
			var element = elements[idx++];
			if (element.type == ElementType.Tag || element.type == ElementType.Script || element.type == ElementType.style)
				this.parseAttribs(element);
		}
	
		return(elements);
	}

	//Takes an element and adds an "attribs" property for any element attributes found 
	Parser.prototype.parseAttribs = function Parser$parseAttribs (element) {
		//Only parse attributes for tags
		if (element.type != ElementType.Script && element.type != ElementType.Style && element.type != ElementType.Tag)
			return;
	
		var tagName = element.data.split(Parser._reWhitespace, 1)[0];
		var attribRaw = element.data.substring(tagName.length);
		if (attribRaw.length < 1)
			return;
	
		var match;
		Parser._reAttrib.lastIndex = 0;
		while (match = Parser._reAttrib.exec(attribRaw)) {
			if (element.attribs == undefined)
				element.attribs = {};
	
			if (typeof match[1] == "string" && match[1].length) {
				element.attribs[match[1]] = match[2];
			} else if (typeof match[3] == "string" && match[3].length) {
				element.attribs[match[3].toString()] = match[4].toString();
			} else if (typeof match[5] == "string" && match[5].length) {
				element.attribs[match[5]] = match[6];
			} else if (typeof match[7] == "string" && match[7].length) {
				element.attribs[match[7]] = match[7];
			}
		}
	}

	//Extracts the base tag name from the data value of an element
	Parser.prototype.parseTagName = function Parser$parseTagName (data) {
		if (data == null || data == "")
			return("");
		var match = Parser._reTagName.exec(data);
		if (!match)
			return("");
		return((match[1] ? "/" : "") + match[2]);
	}

	//Parses through HTML text and returns an array of found elements
	//I admit, this function is rather large but splitting up had an noticeable impact on speed
	Parser.prototype.parseTags = function Parser$parseTags () {
		var bufferEnd = this._buffer.length - 1;
		while (Parser._reTags.test(this._buffer)) {
			this._next = Parser._reTags.lastIndex - 1;
			var tagSep = this._buffer.charAt(this._next); //The currently found tag marker
			var rawData = this._buffer.substring(this._current, this._next); //The next chunk of data to parse
	
			//A new element to eventually be appended to the element list
			var element = {
				  raw: rawData
				, data: (this._parseState == ElementType.Text) ? rawData : rawData.replace(Parser._reTrim, "")
				, type: this._parseState
			};
	
			var elementName = this.parseTagName(element.data);
	
			//This section inspects the current tag stack and modifies the current
			//element if we're actually parsing a special area (script/comment/style tag)
			if (this._tagStack.length) { //We're parsing inside a script/comment/style tag
				if (this._tagStack[this._tagStack.length - 1] == ElementType.Script) { //We're currently in a script tag
					if (elementName.toLowerCase() == "/script") //Actually, we're no longer in a script tag, so pop it off the stack
						this._tagStack.pop();
					else { //Not a closing script tag
						if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
							//All data from here to script close is now a text element
							element.type = ElementType.Text;
							//If the previous element is text, append the current text to it
							if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Text) {
								var prevElement = this._elements[this._elements.length - 1];
								prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
								element.raw = element.data = ""; //This causes the current element to not be added to the element list
							}
						}
					}
				}
				else if (this._tagStack[this._tagStack.length - 1] == ElementType.Style) { //We're currently in a style tag
					if (elementName.toLowerCase() == "/style") //Actually, we're no longer in a style tag, so pop it off the stack
						this._tagStack.pop();
					else {
						if (element.raw.indexOf("!--") != 0) { //Make sure we're not in a comment
							//All data from here to style close is now a text element
							element.type = ElementType.Text;
							//If the previous element is text, append the current text to it
							if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Text) {
								var prevElement = this._elements[this._elements.length - 1];
								if (element.raw != "") {
									prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep + element.raw;
									element.raw = element.data = ""; //This causes the current element to not be added to the element list
								} else { //Element is empty, so just append the last tag marker found
									prevElement.raw = prevElement.data = prevElement.raw + this._prevTagSep;
								}
							} else { //The previous element was not text
								if (element.raw != "") {
									element.raw = element.data = element.raw;
								}
							}
						}
					}
				}
				else if (this._tagStack[this._tagStack.length - 1] == ElementType.Comment) { //We're currently in a comment tag
					var rawLen = element.raw.length;
					if (element.raw.charAt(rawLen - 2) == "-" && element.raw.charAt(rawLen - 1) == "-" && tagSep == ">") {
						//Actually, we're no longer in a style tag, so pop it off the stack
						this._tagStack.pop();
						//If the previous element is a comment, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Comment) {
							var prevElement = this._elements[this._elements.length - 1];
							prevElement.raw = prevElement.data = (prevElement.raw + element.raw).replace(Parser._reTrimComment, "");
							element.raw = element.data = ""; //This causes the current element to not be added to the element list
							element.type = ElementType.Text;
						}
						else //Previous element not a comment
							element.type = ElementType.Comment; //Change the current element's type to a comment
					}
					else { //Still in a comment tag
						element.type = ElementType.Comment;
						//If the previous element is a comment, append the current text to it
						if (this._elements.length && this._elements[this._elements.length - 1].type == ElementType.Comment) {
							var prevElement = this._elements[this._elements.length - 1];
							prevElement.raw = prevElement.data = prevElement.raw + element.raw + tagSep;
							element.raw = element.data = ""; //This causes the current element to not be added to the element list
							element.type = ElementType.Text;
						}
						else
							element.raw = element.data = element.raw + tagSep;
					}
				}
			}
	
			//Processing of non-special tags
			if (element.type == ElementType.Tag) {
				element.name = elementName;
				var elementNameCI = elementName.toLowerCase();
				
				if (element.raw.indexOf("!--") == 0) { //This tag is really comment
					element.type = ElementType.Comment;
					delete element["name"];
					var rawLen = element.raw.length;
					//Check if the comment is terminated in the current element
					if (element.raw.charAt(rawLen - 1) == "-" && element.raw.charAt(rawLen - 2) == "-" && tagSep == ">")
						element.raw = element.data = element.raw.replace(Parser._reTrimComment, "");
					else { //It's not so push the comment onto the tag stack
						element.raw += tagSep;
						this._tagStack.push(ElementType.Comment);
					}
				}
				else if (element.raw.indexOf("!") == 0 || element.raw.indexOf("?") == 0) {
					element.type = ElementType.Directive;
					//TODO: what about CDATA?
				}
				else if (elementNameCI == "script") {
					element.type = ElementType.Script;
					//Special tag, push onto the tag stack if not terminated
					if (element.data.charAt(element.data.length - 1) != "/")
						this._tagStack.push(ElementType.Script);
				}
				else if (elementNameCI == "/script")
					element.type = ElementType.Script;
				else if (elementNameCI == "style") {
					element.type = ElementType.Style;
					//Special tag, push onto the tag stack if not terminated
					if (element.data.charAt(element.data.length - 1) != "/")
						this._tagStack.push(ElementType.Style);
				}
				else if (elementNameCI == "/style")
					element.type = ElementType.Style;
				if (element.name && element.name.charAt(0) == "/")
					element.data = element.name;
			}
	
			//Add all tags and non-empty text elements to the element list
			if (element.raw != "" || element.type != ElementType.Text) {
				if (this._options.includeLocation && !element.location) {
					element.location = this.getLocation(element.type == ElementType.Tag);
				}
				this.parseAttribs(element);
				this._elements.push(element);
				//If tag self-terminates, add an explicit, separate closing tag
				if (
					element.type != ElementType.Text
					&&
					element.type != ElementType.Comment
					&&
					element.type != ElementType.Directive
					&&
					element.data.charAt(element.data.length - 1) == "/"
					)
					this._elements.push({
						  raw: "/" + element.name
						, data: "/" + element.name
						, name: "/" + element.name
						, type: element.type
					});
			}
			this._parseState = (tagSep == "<") ? ElementType.Tag : ElementType.Text;
			this._current = this._next + 1;
			this._prevTagSep = tagSep;
		}

		if (this._options.includeLocation) {
			this.getLocation();
			this._location.row += this._location.inBuffer;
			this._location.inBuffer = 0;
			this._location.charOffset = 0;
		}
		this._buffer = (this._current <= bufferEnd) ? this._buffer.substring(this._current) : "";
		this._current = 0;
	
		this.writeHandler();
	}

	Parser.prototype.getLocation = function Parser$getLocation (startTag) {
		var c,
			l = this._location,
			end = this._current - (startTag ? 1 : 0),
			chunk = startTag && l.charOffset == 0 && this._current == 0;
		
		for (; l.charOffset < end; l.charOffset++) {
			c = this._buffer.charAt(l.charOffset);
			if (c == '\n') {
				l.inBuffer++;
				l.col = 0;
			} else if (c != '\r') {
				l.col++;
			}
		}
		return {
			  line: l.row + l.inBuffer + 1
			, col: l.col + (chunk ? 0: 1)
		};
	}

	//Checks the handler to make it is an object with the right "interface"
	Parser.prototype.validateHandler = function Parser$validateHandler (handler) {
		if ((typeof handler) != "object")
			throw new Error("Handler is not an object");
		if ((typeof handler.reset) != "function")
			throw new Error("Handler method 'reset' is invalid");
		if ((typeof handler.done) != "function")
			throw new Error("Handler method 'done' is invalid");
		if ((typeof handler.writeTag) != "function")
			throw new Error("Handler method 'writeTag' is invalid");
		if ((typeof handler.writeText) != "function")
			throw new Error("Handler method 'writeText' is invalid");
		if ((typeof handler.writeComment) != "function")
			throw new Error("Handler method 'writeComment' is invalid");
		if ((typeof handler.writeDirective) != "function")
			throw new Error("Handler method 'writeDirective' is invalid");
	}

	//Writes parsed elements out to the handler
	Parser.prototype.writeHandler = function Parser$writeHandler (forceFlush) {
		forceFlush = !!forceFlush;
		if (this._tagStack.length && !forceFlush)
			return;
		while (this._elements.length) {
			var element = this._elements.shift();
			switch (element.type) {
				case ElementType.Comment:
					this._handler.writeComment(element);
					break;
				case ElementType.Directive:
					this._handler.writeDirective(element);
					break;
				case ElementType.Text:
					this._handler.writeText(element);
					break;
				default:
					this._handler.writeTag(element);
					break;
			}
		}
	}

	Parser.prototype.handleError = function Parser$handleError (error) {
		if ((typeof this._handler.error) == "function")
			this._handler.error(error);
		else
			throw error;
	}

//TODO: make this a trully streamable handler
function RssHandler (callback) {
	RssHandler.super_.call(this, callback, { ignoreWhitespace: true, verbose: false, enforceEmptyTags: false });
}
inherits(RssHandler, DefaultHandler);

	RssHandler.prototype.done = function RssHandler$done () {
		var feed = { };
		var feedRoot;

		var found = DomUtils.getElementsByTagName(function (value) { return(value == "rss" || value == "feed"); }, this.dom, false);
		if (found.length) {
			feedRoot = found[0];
		}
		if (feedRoot) {
			if (feedRoot.name == "rss") {
				feed.type = "rss";
				feedRoot = feedRoot.children[0]; //<channel/>
				feed.id = "";
				try {
					feed.title = DomUtils.getElementsByTagName("title", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.link = DomUtils.getElementsByTagName("link", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.description = DomUtils.getElementsByTagName("description", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.updated = new Date(DomUtils.getElementsByTagName("lastBuildDate", feedRoot.children, false)[0].children[0].data);
				} catch (ex) { }
				try {
					feed.author = DomUtils.getElementsByTagName("managingEditor", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				feed.items = [];
				DomUtils.getElementsByTagName("item", feedRoot.children).forEach(function (item, index, list) {
					var entry = {};
					try {
						entry.id = DomUtils.getElementsByTagName("guid", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.title = DomUtils.getElementsByTagName("title", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.link = DomUtils.getElementsByTagName("link", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.description = DomUtils.getElementsByTagName("description", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.pubDate = new Date(DomUtils.getElementsByTagName("pubDate", item.children, false)[0].children[0].data);
					} catch (ex) { }
					feed.items.push(entry);
				});
			} else {
				feed.type = "atom";
				try {
					feed.id = DomUtils.getElementsByTagName("id", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.title = DomUtils.getElementsByTagName("title", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.link = DomUtils.getElementsByTagName("link", feedRoot.children, false)[0].attribs.href;
				} catch (ex) { }
				try {
					feed.description = DomUtils.getElementsByTagName("subtitle", feedRoot.children, false)[0].children[0].data;
				} catch (ex) { }
				try {
					feed.updated = new Date(DomUtils.getElementsByTagName("updated", feedRoot.children, false)[0].children[0].data);
				} catch (ex) { }
				try {
					feed.author = DomUtils.getElementsByTagName("email", feedRoot.children, true)[0].children[0].data;
				} catch (ex) { }
				feed.items = [];
				DomUtils.getElementsByTagName("entry", feedRoot.children).forEach(function (item, index, list) {
					var entry = {};
					try {
						entry.id = DomUtils.getElementsByTagName("id", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.title = DomUtils.getElementsByTagName("title", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.link = DomUtils.getElementsByTagName("link", item.children, false)[0].attribs.href;
					} catch (ex) { }
					try {
						entry.description = DomUtils.getElementsByTagName("summary", item.children, false)[0].children[0].data;
					} catch (ex) { }
					try {
						entry.pubDate = new Date(DomUtils.getElementsByTagName("updated", item.children, false)[0].children[0].data);
					} catch (ex) { }
					feed.items.push(entry);
				});
			}

			this.dom = feed;
		}
		RssHandler.super_.prototype.done.call(this);
	}

///////////////////////////////////////////////////

function DefaultHandler (callback, options) {
	this.reset();
	this._options = options ? options : { };
	if (this._options.ignoreWhitespace == undefined)
		this._options.ignoreWhitespace = false; //Keep whitespace-only text nodes
	if (this._options.verbose == undefined)
		this._options.verbose = true; //Keep data property for tags and raw property for all
	if (this._options.enforceEmptyTags == undefined)
		this._options.enforceEmptyTags = true; //Don't allow children for HTML tags defined as empty in spec
	if ((typeof callback) == "function")
		this._callback = callback;
}

	//**"Static"**//
	//HTML Tags that shouldn't contain child nodes
	DefaultHandler._emptyTags = {
		  area: 1
		, base: 1
		, basefont: 1
		, br: 1
		, col: 1
		, frame: 1
		, hr: 1
		, img: 1
		, input: 1
		, isindex: 1
		, link: 1
		, meta: 1
		, param: 1
		, embed: 1
	}
	//Regex to detect whitespace only text nodes
	DefaultHandler.reWhitespace = /^\s*$/;

	//**Public**//
	//Properties//
	DefaultHandler.prototype.dom = null; //The hierarchical object containing the parsed HTML
	//Methods//
	//Resets the handler back to starting state
	DefaultHandler.prototype.reset = function DefaultHandler$reset() {
		this.dom = [];
		this._done = false;
		this._tagStack = [];
		this._tagStack.last = function DefaultHandler$_tagStack$last () {
			return(this.length ? this[this.length - 1] : null);
		}
	}
	//Signals the handler that parsing is done
	DefaultHandler.prototype.done = function DefaultHandler$done () {
		this._done = true;
		this.handleCallback(null);
	}
	DefaultHandler.prototype.writeTag = function DefaultHandler$writeTag (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeText = function DefaultHandler$writeText (element) {
		if (this._options.ignoreWhitespace)
			if (DefaultHandler.reWhitespace.test(element.data))
				return;
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeComment = function DefaultHandler$writeComment (element) {
		this.handleElement(element);
	} 
	DefaultHandler.prototype.writeDirective = function DefaultHandler$writeDirective (element) {
		this.handleElement(element);
	}
	DefaultHandler.prototype.error = function DefaultHandler$error (error) {
		this.handleCallback(error);
	}

	//**Private**//
	//Properties//
	DefaultHandler.prototype._options = null; //Handler options for how to behave
	DefaultHandler.prototype._callback = null; //Callback to respond to when parsing done
	DefaultHandler.prototype._done = false; //Flag indicating whether handler has been notified of parsing completed
	DefaultHandler.prototype._tagStack = null; //List of parents to the currently element being processed
	//Methods//
	DefaultHandler.prototype.handleCallback = function DefaultHandler$handleCallback (error) {
			if ((typeof this._callback) != "function")
				if (error)
					throw error;
				else
					return;
			this._callback(error, this.dom);
	}
	
	DefaultHandler.prototype.isEmptyTag = function(element) {
		var name = element.name.toLowerCase();
		if (name.charAt(0) == '/') {
			name = name.substring(1);
		}
		return this._options.enforceEmptyTags && !!DefaultHandler._emptyTags[name];
	};
	
	DefaultHandler.prototype.handleElement = function DefaultHandler$handleElement (element) {
		if (this._done)
			this.handleCallback(new Error("Writing to the handler after done() called is not allowed without a reset()"));
		if (!this._options.verbose) {
//			element.raw = null; //FIXME: Not clean
			//FIXME: Serious performance problem using delete
			delete element.raw;
			if (element.type == "tag" || element.type == "script" || element.type == "style")
				delete element.data;
		}
		if (!this._tagStack.last()) { //There are no parent elements
			//If the element can be a container, add it to the tag stack and the top level list
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name.charAt(0) != "/") { //Ignore closing tags that obviously don't have an opening tag
					this.dom.push(element);
					if (!this.isEmptyTag(element)) { //Don't add tags to the tag stack that can't have children
						this._tagStack.push(element);
					}
				}
			}
			else //Otherwise just add to the top level list
				this.dom.push(element);
		}
		else { //There are parent elements
			//If the element can be a container, add it as a child of the element
			//on top of the tag stack and then add it to the tag stack
			if (element.type != ElementType.Text && element.type != ElementType.Comment && element.type != ElementType.Directive) {
				if (element.name.charAt(0) == "/") {
					//This is a closing tag, scan the tagStack to find the matching opening tag
					//and pop the stack up to the opening tag's parent
					var baseName = element.name.substring(1);
					if (!this.isEmptyTag(element)) {
						var pos = this._tagStack.length - 1;
						while (pos > -1 && this._tagStack[pos--].name != baseName) { }
						if (pos > -1 || this._tagStack[0].name == baseName)
							while (pos < this._tagStack.length - 1)
								this._tagStack.pop();
					}
				}
				else { //This is not a closing tag
					if (!this._tagStack.last().children)
						this._tagStack.last().children = [];
					this._tagStack.last().children.push(element);
					if (!this.isEmptyTag(element)) //Don't add tags to the tag stack that can't have children
						this._tagStack.push(element);
				}
			}
			else { //This is not a container element
				if (!this._tagStack.last().children)
					this._tagStack.last().children = [];
				this._tagStack.last().children.push(element);
			}
		}
	}

	var DomUtils = {
		  testElement: function DomUtils$testElement (options, element) {
			if (!element) {
				return false;
			}
	
			for (var key in options) {
				if (key == "tag_name") {
					if (element.type != "tag" && element.type != "script" && element.type != "style") {
						return false;
					}
					if (!options["tag_name"](element.name)) {
						return false;
					}
				} else if (key == "tag_type") {
					if (!options["tag_type"](element.type)) {
						return false;
					}
				} else if (key == "tag_contains") {
					if (element.type != "text" && element.type != "comment" && element.type != "directive") {
						return false;
					}
					if (!options["tag_contains"](element.data)) {
						return false;
					}
				} else {
					if (!element.attribs || !options[key](element.attribs[key])) {
						return false;
					}
				}
			}
		
			return true;
		}
	
		, getElements: function DomUtils$getElements (options, currentElement, recurse, limit) {
			recurse = (recurse === undefined || recurse === null) || !!recurse;
			limit = isNaN(parseInt(limit)) ? -1 : parseInt(limit);

			if (!currentElement) {
				return([]);
			}
	
			var found = [];
			var elementList;

			function getTest (checkVal) {
				return(function (value) { return(value == checkVal); });
			}
			for (var key in options) {
				if ((typeof options[key]) != "function") {
					options[key] = getTest(options[key]);
				}
			}
	
			if (DomUtils.testElement(options, currentElement)) {
				found.push(currentElement);
			}

			if (limit >= 0 && found.length >= limit) {
				return(found);
			}

			if (recurse && currentElement.children) {
				elementList = currentElement.children;
			} else if (currentElement instanceof Array) {
				elementList = currentElement;
			} else {
				return(found);
			}
	
			for (var i = 0; i < elementList.length; i++) {
				found = found.concat(DomUtils.getElements(options, elementList[i], recurse, limit));
				if (limit >= 0 && found.length >= limit) {
					break;
				}
			}
	
			return(found);
		}
		
		, getElementById: function DomUtils$getElementById (id, currentElement, recurse) {
			var result = DomUtils.getElements({ id: id }, currentElement, recurse, 1);
			return(result.length ? result[0] : null);
		}
		
		, getElementsByTagName: function DomUtils$getElementsByTagName (name, currentElement, recurse, limit) {
			return(DomUtils.getElements({ tag_name: name }, currentElement, recurse, limit));
		}
		
		, getElementsByTagType: function DomUtils$getElementsByTagType (type, currentElement, recurse, limit) {
			return(DomUtils.getElements({ tag_type: type }, currentElement, recurse, limit));
		}
	}

	function inherits (ctor, superCtor) {
		var tempCtor = function(){};
		tempCtor.prototype = superCtor.prototype;
		ctor.super_ = superCtor;
		ctor.prototype = new tempCtor();
		ctor.prototype.constructor = ctor;
	}

exports.Parser = Parser;

exports.DefaultHandler = DefaultHandler;

exports.RssHandler = RssHandler;

exports.ElementType = ElementType;

exports.DomUtils = DomUtils;

})();

}).call(this,"/node_modules/htmlParser/lib/htmlparser.js","/node_modules/htmlParser/lib")
},{}],13:[function(require,module,exports){
var createElement = require("vdom/create-element")

module.exports = createElement

},{"vdom/create-element":21}],14:[function(require,module,exports){
var diff = require("vtree/diff")

module.exports = diff

},{"vtree/diff":27}],15:[function(require,module,exports){
var h = require("./h/index.js")

module.exports = h

},{"./h/index.js":16}],16:[function(require,module,exports){
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

},{"./parse-tag":17,"vtree/is-vnode":31,"vtree/is-vtext":32,"vtree/is-widget":33,"vtree/vnode.js":35,"vtree/vtext.js":37,"x-is-array":38,"x-is-string":39}],17:[function(require,module,exports){
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

},{"browser-split":18}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
module.exports = isObject

function isObject(x) {
    return typeof x === "object" && x !== null
}

},{}],20:[function(require,module,exports){
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

},{"is-object":19,"vtree/is-vhook":30}],21:[function(require,module,exports){
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

},{"./apply-properties":20,"global/document":23,"vtree/handle-thunk":28,"vtree/is-vnode":31,"vtree/is-vtext":32,"vtree/is-widget":33}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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
},{"min-document":11}],24:[function(require,module,exports){
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

},{"./apply-properties":20,"./create-element":21,"./update-widget":26,"vtree/is-widget":33,"vtree/vpatch":36}],25:[function(require,module,exports){
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

},{"./dom-index":22,"./patch-op":24,"global/document":23,"x-is-array":38}],26:[function(require,module,exports){
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

},{"vtree/is-widget":33}],27:[function(require,module,exports){
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

},{"./handle-thunk":28,"./is-thunk":29,"./is-vnode":31,"./is-vtext":32,"./is-widget":33,"./vpatch":36,"is-object":19,"x-is-array":38}],28:[function(require,module,exports){
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

},{"./is-thunk":29,"./is-vnode":31,"./is-vtext":32,"./is-widget":33}],29:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],30:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook && typeof hook.hook === "function" &&
        !hook.hasOwnProperty("hook")
}

},{}],31:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":34}],32:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":34}],33:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],34:[function(require,module,exports){
module.exports = "1"

},{}],35:[function(require,module,exports){
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

},{"./is-vhook":30,"./is-vnode":31,"./is-widget":33,"./version":34}],36:[function(require,module,exports){
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

},{"./version":34}],37:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":34}],38:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],39:[function(require,module,exports){
var toString = Object.prototype.toString

module.exports = isString

function isString(obj) {
    return toString.call(obj) === "[object String]"
}

},{}],40:[function(require,module,exports){
var patch = require("vdom/patch")

module.exports = patch

},{"vdom/patch":25}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9kaXN0L3RlbXAvX2luZGV4LmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvZGlzdC90ZW1wL2VsZW1lbnQuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9kaXN0L3RlbXAvZXZlbnQuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9kaXN0L3RlbXAvaGVscGVyLmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvZGlzdC90ZW1wL21vZHVsZXMvaHR0cC5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL2Rpc3QvdGVtcC9vYnNlcnZlci5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL2Rpc3QvdGVtcC9yZWdpc3Rlci5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL2Rpc3QvdGVtcC90ZW1wbGF0ZS1jb21waWxlci5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL2Rpc3QvdGVtcC90ZW1wbGF0ZS1oZWxwZXIuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9kaXN0L3RlbXAvdGVtcGxhdGUuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvZ3J1bnQtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL2h0bWxQYXJzZXIvbGliL2h0bWxwYXJzZXIuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vY3JlYXRlLWVsZW1lbnQuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vZGlmZi5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9oLmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2gvaW5kZXguanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vaC9wYXJzZS10YWcuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL2Jyb3dzZXItc3BsaXQvaW5kZXguanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL2lzLW9iamVjdC9pbmRleC5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdmRvbS9hcHBseS1wcm9wZXJ0aWVzLmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL2NyZWF0ZS1lbGVtZW50LmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL2RvbS1pbmRleC5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdmRvbS9ub2RlX21vZHVsZXMvZ2xvYmFsL2RvY3VtZW50LmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL3BhdGNoLW9wLmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL3BhdGNoLmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL3VwZGF0ZS13aWRnZXQuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2RpZmYuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2hhbmRsZS10aHVuay5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdGh1bmsuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXZob29rLmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS9pcy12bm9kZS5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdnRleHQuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXdpZGdldC5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvdmVyc2lvbi5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvdm5vZGUuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL3ZwYXRjaC5qcyIsIi9Vc2Vycy9heXVtdXNhdG8vRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvdnRleHQuanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3gtaXMtYXJyYXkvaW5kZXguanMiLCIvVXNlcnMvYXl1bXVzYXRvL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3gtaXMtc3RyaW5nL2luZGV4LmpzIiwiL1VzZXJzL2F5dW11c2F0by9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3BhdGNoLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZNQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6ekJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGF5UmVnaXN0ZXIgPSByZXF1aXJlKCcuL3JlZ2lzdGVyJykuZGVmYXVsdDtcbnZhciBoZWxwZXIgPSByZXF1aXJlKCcuL2hlbHBlcicpLmRlZmF1bHQ7XG52YXIgVGVtcGxhdGUgPSByZXF1aXJlKCcuL3RlbXBsYXRlJykuZGVmYXVsdDtcbnZhciBUZW1wbGF0ZUhlbHBlciA9IHJlcXVpcmUoJy4vdGVtcGxhdGUtaGVscGVyJykuZGVmYXVsdDtcbnZhciBFbGVtZW50ID0gcmVxdWlyZSgnLi9lbGVtZW50JykuZGVmYXVsdDtcbnZhciBPYnNlcnZlciA9IHJlcXVpcmUoJy4vb2JzZXJ2ZXInKS5kZWZhdWx0O1xudmFyIEV2ZW50ID0gcmVxdWlyZSgnLi9ldmVudCcpLmRlZmF1bHQ7XG52YXIgSGVscGVyID0gcmVxdWlyZSgnLi9oZWxwZXInKS5kZWZhdWx0O1xudmFyIE1vZEh0dHAgPSByZXF1aXJlKCcuL21vZHVsZXMvaHR0cCcpLmRlZmF1bHQ7XG5cbi8qKlxuICogQGNsYXNzIENsYXlsdW1wXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG53aW5kb3cuQ2xheWx1bXAgPSBoZWxwZXIubWl4KENsYXlSZWdpc3Rlciwge1xuXG4gIFRlbXBsYXRlICAgICAgIDogVGVtcGxhdGUsXG4gIFRlbXBsYXRlSGVscGVyIDogVGVtcGxhdGVIZWxwZXIsXG4gIEVsZW1lbnQgICAgICAgIDogRWxlbWVudCxcbiAgT2JzZXJ2ZXIgICAgICAgOiBPYnNlcnZlcixcbiAgRXZlbnQgICAgICAgICAgOiBFdmVudCxcbiAgSGVscGVyICAgICAgICAgOiBIZWxwZXIsXG5cbiAgbW9kdWxlcyA6IHtcbiAgICBodHRwIDogTW9kSHR0cFxuICB9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhlbHBlciA9IHJlcXVpcmUoJy4vaGVscGVyJykuZGVmYXVsdDtcbnZhciB0ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKS5kZWZhdWx0O1xudmFyIGV2ZW50ID0gcmVxdWlyZSgnLi9ldmVudCcpLmRlZmF1bHQ7XG5cbnZhciBSRUdJU1RSWV9DTEFZX1BST1RPVFlQRVMgPSB7fTtcblxuZXhwb3J0cy5kZWZhdWx0ID0ge1xuICAvKipcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcGFyYW0ge09iamVjdH0gcHJvdG9cbiAgICogQHJldHVybnMge0NsYXlFbGVtZW50fVxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbihuYW1lLCBwcm90bykge1xuXG4gICAgdmFyIGRlZmF1bHRzID0ge1xuICAgICAgLyoqXG4gICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICogQHByb3BlcnR5IHtEb2N1bWVudH0gX2RvY1xuICAgICAgICovXG4gICAgICBfZG9jOiAgZG9jdW1lbnQuX2N1cnJlbnRTY3JpcHQgPyBkb2N1bWVudC5fY3VycmVudFNjcmlwdC5vd25lckRvY3VtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBkb2N1bWVudC5jdXJyZW50U2NyaXB0ID8gZG9jdW1lbnQuY3VycmVudFNjcmlwdC5vd25lckRvY3VtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogZG9jdW1lbnQsXG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAbWV0aG9kIHtGdW5jdGlvbn0gX2NyZWF0ZWRcbiAgICAgICAqL1xuICAgICAgX2NyZWF0ZWQ6IGhlbHBlci5pc0Z1bmN0aW9uKHByb3RvLmNyZWF0ZWRDYWxsYmFjaykgPyBwcm90by5jcmVhdGVkQ2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaGVscGVyLm5vb3AsXG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAbWV0aG9kIHtGdW5jdGlvbn0gX2F0dGFjaGVkXG4gICAgICAgKi9cbiAgICAgIF9hdHRhY2hlZDogaGVscGVyLmlzRnVuY3Rpb24ocHJvdG8uYXR0YWNoZWRDYWxsYmFjaykgPyBwcm90by5hdHRhY2hlZENhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaGVscGVyLm5vb3AsXG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAbWV0aG9kIHtGdW5jdGlvbn0gX2RldGFjaGVkXG4gICAgICAgKi9cbiAgICAgIF9kZXRhY2hlZDogaGVscGVyLmlzRnVuY3Rpb24ocHJvdG8uZGV0YWNoZWRDYWxsYmFjaykgPyBwcm90by5kZXRhY2hlZENhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaGVscGVyLm5vb3AsXG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAbWV0aG9kIHtGdW5jdGlvbn0gX2F0dHJDaGFuZ2VkXG4gICAgICAgKi9cbiAgICAgIF9hdHRyQ2hhbmdlZDogaGVscGVyLmlzRnVuY3Rpb24ocHJvdG8uYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKSA/IHByb3RvLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaGVscGVyLm5vb3AsXG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAcHJvcGVydHkge1N0cmluZ30gX2h0bWxcbiAgICAgICAqL1xuICAgICAgX2h0bWw6ICcnLFxuXG4gICAgICAvKipcbiAgICAgICAqIEBwcm9wZXJ0eSB7RWxlbWVudH0gcm9vdFxuICAgICAgICovXG4gICAgICByb290OiBudWxsLFxuXG4gICAgICAvKipcbiAgICAgICAqIEBwcm9wZXJ0eSB7Q2xheVRlbXBsYXRlfSB0ZW1wbGF0ZVxuICAgICAgICovXG4gICAgICB0ZW1wbGF0ZTogbnVsbCxcblxuICAgICAgLyoqXG4gICAgICAgKiBAcHJvcGVydHkge09iamVjdH0gc2NvcGVcbiAgICAgICAqL1xuICAgICAgc2NvcGUgOiB7fSxcblxuICAgICAgLyoqXG4gICAgICAgKiBAcHJvcGVydHkge09iamVjdC48c3RyaW5nLCAoc3RyaW5nfGZ1bmN0aW9uKT59IGV2ZW50c1xuICAgICAgICovXG4gICAgICBldmVudHM6IHt9LFxuXG4gICAgICAvKipcbiAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsIGZ1bmN0aW9uPn0gdXNlXG4gICAgICAgKi9cbiAgICAgIHVzZToge31cbiAgICB9O1xuXG4gICAgLy8gZGVmYXVsdHNcbiAgICBoZWxwZXIubWl4KHByb3RvLCBkZWZhdWx0cyk7XG5cbiAgICAvLyBkb20gcmVhZHkgcmVxdWlyZWRcbiAgICBoZWxwZXIucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdGVtcGxhdGUgPSBwcm90by5fZG9jLnF1ZXJ5U2VsZWN0b3IoJ1tjbC1lbGVtZW50PVwiJytuYW1lKydcIl0nKTtcbiAgICAgIHByb3RvLl9odG1sICA9IHRlbXBsYXRlID8gdGVtcGxhdGUuaW5uZXJIVE1MIDogJyc7XG4gICAgfSk7XG5cbiAgICAvLyBleHRlbmRzIGVsZW1lbnRcbiAgICB2YXIgZXh0ZW5kc1Byb3RvO1xuICAgIGlmIChwcm90by5leHRlbmRzKSB7XG4gICAgICAvLyBGSVhNRSBjYW5ub3QgdXNlIGBpcz1cIngtY2hpbGRcImAgaW4gYDx0ZW1wbGF0ZT5gXG5cbiAgICAgIGlmIChoZWxwZXIuaXNDdXN0b21FbGVtZW50TmFtZShwcm90by5leHRlbmRzKSAmJlxuICAgICAgICAgIChleHRlbmRzUHJvdG8gPSBnZXRFeHRlbmRlZShwcm90by5leHRlbmRzKSkpIHtcblxuICAgICAgICAvLyBleHRlbmRzIGN1c3RvbSBlbGVtZW50XG4gICAgICAgIC8vIEZJWE1FIGNyZWF0ZSBiYXNlRWxlbWVudHMgcHJvdG90eXBlIGJ5IGRlZXBseSBjbG9uZVxuICAgICAgICBoZWxwZXIubWl4KHByb3RvLnNjb3BlLCBleHRlbmRzUHJvdG8uc2NvcGUpO1xuICAgICAgICBoZWxwZXIubWl4KHByb3RvICAgICAgLCBleHRlbmRzUHJvdG8pO1xuICAgICAgICBwcm90by5fX3N1cGVyX18gPSBleHRlbmRzUHJvdG87XG4gICAgICAgIGV4dGVuZHNQcm90byAgICA9IEhUTUxFbGVtZW50LnByb3RvdHlwZTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXh0ZW5kc1Byb3RvID0gT2JqZWN0LmNyZWF0ZShwcm90by5fZG9jLmNyZWF0ZUVsZW1lbnQocHJvdG8uZXh0ZW5kcykuY29uc3RydWN0b3IpLnByb3RvdHlwZTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBuZXcgY3VzdG9tIGVsZW1lbnRcbiAgICAgIGV4dGVuZHNQcm90byA9IEhUTUxFbGVtZW50LnByb3RvdHlwZTtcbiAgICB9XG5cbiAgICAvLyByZWdpc3RlciBwcm90b3R5cGUgZm9yIGV4dGVuZHNcbiAgICBSRUdJU1RSWV9DTEFZX1BST1RPVFlQRVNbbmFtZV0gPSBoZWxwZXIuY2xvbmUocHJvdG8pO1xuXG4gICAgLy8gbWl4IGNsYXlsdW1wIGltcGxlbWVudGF0aW9uXG4gICAgaGVscGVyLm1peChwcm90bywgQ2xheUVsZW1lbnRJbXBsLCB0cnVlKTtcblxuICAgIHJldHVybiBoZWxwZXIubWl4KE9iamVjdC5jcmVhdGUoZXh0ZW5kc1Byb3RvKSwgcHJvdG8pO1xuICB9XG59O1xuXG5mdW5jdGlvbiBnZXRFeHRlbmRlZShuYW1lKSB7XG4gIHZhciBwcm90byA9IFJFR0lTVFJZX0NMQVlfUFJPVE9UWVBFU1tuYW1lXTtcbiAgaWYgKCFwcm90bykge1xuICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGV4dGVuZHMgYCcgKyBuYW1lICsgJ2AsIGJlY2F1c2Ugbm90IHJlZ2lzdGVyZWQnKTtcbiAgfVxuICByZXR1cm4gcHJvdG87XG59XG5cbi8qKlxuICogQGltcGxlbWVudHMgQ2xheUVsZW1lbnRcbiAqL1xudmFyIENsYXlFbGVtZW50SW1wbCA9IHtcbiAgLyoqXG4gICAqIGluamVjdCB1dGlsaXR5IHdpdGggZWxlbWVudCBpbnN0YW5jZVxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luamVjdFVzZU9iamVjdDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBrZXlzID0gT2JqZWN0LmtleXModGhpcy51c2UgfHwge30pLCBpID0gMCwgYWxpYXM7XG5cbiAgICB3aGlsZSAoKGFsaWFzID0ga2V5c1tpKytdKSkge1xuICAgICAgaWYgKHNlbGZbYWxpYXNdKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZmxpY3QgYXNzaWduIHByb3BlcnR5IGAnICsgYWxpYXMgKyAnYCEnKVxuICAgICAgfVxuICAgICAgc2VsZlthbGlhc10gPSB0aGlzLnVzZVthbGlhc10odGhpcyk7XG4gICAgfVxuXG4gICAgdGhpcy51c2UgPSBudWxsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBwcm90ZWN0IG9iamVjdCByZWZlcmVuY2UgaW4gcHJvdG90eXBlLnNjb3BlXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY2xvbmVTY29wZU9iamVjdHM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzY29wZSA9IHRoaXMuc2NvcGUsXG4gICAgICAgIGtleXMgPSBPYmplY3Qua2V5cyhzY29wZSksIGkgPSAwLCBrZXk7XG5cbiAgICB3aGlsZSAoKGtleSA9IGtleXNbaSsrXSkpIHtcbiAgICAgIGlmICh0eXBlb2Ygc2NvcGVba2V5XSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgLy8gRklYTUUgY3JlYXRlIG93biBvYmplY3R8YXJyYXkgYnkgZGVlcGx5IGNsb25lXG4gICAgICAgIHNjb3BlW2tleV0gPSBoZWxwZXIuY2xvbmUoc2NvcGVba2V5XSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBzaG9ydGhhbmQgb2YgYHRlbXBsYXRlLmludmFsaWRhdGUoKWBcbiAgICovXG4gIGludmFsaWRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGVtcGxhdGUuaW52YWxpZGF0ZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBjaGlsZHJlbiBmaW5kZXJcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gICAqIEByZXR1cm5zIHs/RWxlbWVudHxBcnJheX1cbiAgICovXG4gIGZpbmQ6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgdmFyIGZvdW5kID0gaGVscGVyLnRvQXJyYXkodGhpcy5yb290LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKTtcblxuICAgIGlmIChmb3VuZC5sZW5ndGggPD0gMSkge1xuICAgICAgcmV0dXJuIGZvdW5kWzBdIHx8IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmb3VuZDtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIGNsb3Nlc3QgcGFyZW50IGhlbHBlclxuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR8QXJyYXl9IGVsXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvclxuICAgKiBAcmV0dXJucyB7P0VsZW1lbnR8QXJyYXl9XG4gICAqL1xuICBjbG9zZXN0T2Y6IGZ1bmN0aW9uKGVsLCBzZWxlY3Rvcikge1xuICAgIGlmIChoZWxwZXIuaXNBcnJheShlbCkpIHtcbiAgICAgIHJldHVybiBlbC5tYXAoZnVuY3Rpb24oZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jbG9zZXN0T2YoZSwgc2VsZWN0b3IpO1xuICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICB9XG5cbiAgICB2YXIgY3VycmVudCA9IC8qKiBAdHlwZSB7RWxlbWVudH0gKi8gZWwucGFyZW50Tm9kZTtcbiAgICBkbyB7XG4gICAgICBpZiAoY3VycmVudCA9PT0gdGhpcy5yb290KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKGhlbHBlci5tYXRjaEVsZW1lbnQoY3VycmVudCwgc2VsZWN0b3IpKSB7XG4gICAgICAgIHJldHVybiBjdXJyZW50O1xuICAgICAgfVxuICAgIH0gd2hpbGUgKChjdXJyZW50ID0gY3VycmVudC5wYXJlbnROb2RlKSk7XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfSxcblxuICAvKipcbiAgICogYW4gaW5zdGFuY2Ugb2YgdGhlIGVsZW1lbnQgaXMgY3JlYXRlZFxuICAgKiBleGVjdXRlIHNldmVyYWwgaW5pdGlhbGl6ZSBwcm9jZXNzZXNcbiAgICovXG4gIGNyZWF0ZWRDYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gY3JlYXRlIHZpcnR1YWwgdGVtcGxhdGUgJiBhY3R1YWwgZG9tXG4gICAgdGhpcy5jcmVhdGVTaGFkb3dSb290KCk7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlLmNyZWF0ZSh0aGlzLl9odG1sLCB0aGlzLnNjb3BlKTsgLy8gVE9ET1xuICAgIHRoaXMucm9vdCAgICAgPSB0aGlzLnRlbXBsYXRlLmNyZWF0ZUVsZW1lbnQodGhpcy5fZG9jKTtcbiAgICBpZiAoIXRoaXMucm9vdCkge1xuICAgICAgdGhpcy5yb290ID0gdGhpcy5fZG9jLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIH1cblxuICAgIC8vIHNldCByb290IGVsZW1lbnRcbiAgICB0aGlzLnNoYWRvd1Jvb3QuYXBwZW5kQ2hpbGQodGhpcy5yb290KTtcbiAgICB0aGlzLnRlbXBsYXRlLmRyYXdMb29wKHRoaXMucm9vdCk7XG5cbiAgICAvLyBjcmVhdGUgZXZlbnRzXG4gICAgdGhpcy5ldmVudHMgPSBldmVudC5jcmVhdGUodGhpcy5yb290LCB0aGlzLmV2ZW50cyk7IC8vIFRPRE9cblxuICAgIC8vIHJlc29sdmUgdXNlIGluamVjdGlvblxuICAgIHRoaXMuX2luamVjdFVzZU9iamVjdCgpO1xuXG4gICAgLy8gY2xvbmUgb2JqZWN0c1xuICAgIHRoaXMuX2Nsb25lU2NvcGVPYmplY3RzKCk7XG5cbiAgICAvLyBvcmlnaW5hbFxuICAgIHRoaXMuX2NyZWF0ZWQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcblxuICAvKipcbiAgICogYW4gaW5zdGFuY2Ugd2FzIGluc2VydGVkIGludG8gdGhlIGRvY3VtZW50XG4gICAqIGVuYWJsZSBldmVudHMgJiBjYWxsIG9yaWdpbmFsIGF0dGFjaGVkIGNhbGxiYWNrXG4gICAqL1xuICBhdHRhY2hlZENhbGxiYWNrIDogZnVuY3Rpb24oKSB7XG4gICAgLy8gZXZlbnQgZGVsZWdhdGlvblxuICAgIHRoaXMuZXZlbnRzLmVuYWJsZSh0aGlzKTtcblxuICAgIC8vIG9yaWdpbmFsXG4gICAgdGhpcy5fYXR0YWNoZWQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcblxuICAvKipcbiAgICogYW4gaW5zdGFuY2Ugd2FzIHJlbW92ZWQgZnJvbSB0aGUgZG9jdW1lbnRcbiAgICogZGlzYWJsZSBldmVudHMgJiBjYWxsIG9yaWdpbmFsIGRldGFjaGVkIGNhbGxiYWNrXG4gICAqL1xuICBkZXRhY2hlZENhbGxiYWNrIDogZnVuY3Rpb24oKSB7XG4gICAgLy8gZGlzYWJsZSBldmVudFxuICAgIHRoaXMuZXZlbnRzLmRpc2FibGUoKTtcblxuICAgIC8vIG9yaWdpbmFsXG4gICAgdGhpcy5fZGV0YWNoZWQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSxcblxuICAvKipcbiAgICogYW4gYXR0cmlidXRlIHdhcyBhZGRlZCwgcmVtb3ZlZCwgb3IgdXBkYXRlZFxuICAgKiBjYWxsIG9yaWdpbmFsIGF0dHIgY2hhbmdlZCBjYWxsYmFja1xuICAgKi9cbiAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrIDogZnVuY3Rpb24oKSB7XG4gICAgLy8gb3JpZ2luYWxcbiAgICB0aGlzLl9hdHRyQ2hhbmdlZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBjYWxsIHN1cGVyIGVsZW1lbnQncyBtZXRob2RzXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2ROYW1lXG4gICAqIEBwYXJhbSB7Li4uKn0gcGFzc0FyZ3NcbiAgICovXG4gIHN1cGVyOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX19zdXBlcl9fKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZWxlbWVudCBkb2VzIG5vdCBoYXZlIHRoZSBgX19zdXBlcl9fYCcpO1xuICAgIH1cblxuICAgIHZhciBvcmlnQXJncyAgICA9IGhlbHBlci50b0FycmF5KGFyZ3VtZW50cyksXG4gICAgICAgIG1ldGhvZE5hbWUgID0gb3JpZ0FyZ3Muc2xpY2UoMCwgMSksXG4gICAgICAgIHBhc3NBcmdzICAgID0gb3JpZ0FyZ3Muc2xpY2UoMSksXG4gICAgICAgIHN1cGVyTWV0aG9kID0gdGhpcy5fX3N1cGVyX19bbWV0aG9kTmFtZV07XG5cbiAgICBpZiAoaGVscGVyLmlzRnVuY3Rpb24oc3VwZXJNZXRob2QpKSB7XG4gICAgICByZXR1cm4gc3VwZXJNZXRob2QuYXBwbHkodGhpcywgcGFzc0FyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvZXMgbm90IGV4aXN0cyBtZXRob2QgaW4gc3VwZXIgZWxlbWVudCBzcGVjaWZpZWQ6ICcgKyBzdXBlck1ldGhvZCk7XG4gICAgfVxuICB9XG59OyIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhlbHBlciA9IHJlcXVpcmUoJy4vaGVscGVyJykuZGVmYXVsdDtcblxudmFyIFJFWF9FVkVOVF9TUFJJVFRFUiA9IC9cXHMrLztcblxuZXhwb3J0cy5kZWZhdWx0ID0ge1xuICAvKipcbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICAgKiBAcGFyYW0ge09iamVjdH0gZXZlbnRzXG4gICAqIEByZXR1cm5zIHtDbGF5RXZlbnR9XG4gICAqL1xuICBjcmVhdGU6IGZ1bmN0aW9uKGVsLCBldmVudHMpIHtcbiAgICByZXR1cm4gbmV3IENsYXlFdmVudChlbCwgZXZlbnRzKTtcbiAgfVxufTtcblxudmFyIENsYXlFdmVudCA9IGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBDbGF5RXZlbnQoZWwsIGV2ZW50cykge1xuICAgIHRoaXMuY3VycmVudEhhbmRsZXJzID0gW107XG4gICAgdGhpcy5zZXRFbChlbCk7XG4gICAgdGhpcy5zZXRFdmVudHMoZXZlbnRzKTtcbiAgfVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKENsYXlFdmVudC5wcm90b3R5cGUsIHtcbiAgICBzZXRFbDoge1xuICAgICAgd3JpdGVhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgdGhpcy5lbCA9IGVsO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBzZXRFdmVudHM6IHtcbiAgICAgIHdyaXRlYWJsZTogdHJ1ZSxcblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uKGV2ZW50cykge1xuICAgICAgICB0aGlzLmV2ZW50cyA9IGV2ZW50cztcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZW5hYmxlOiB7XG4gICAgICB3cml0ZWFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICAgIHZhciBpID0gMCwga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuZXZlbnRzKSxcbiAgICAgICAgICAgIGV2ZW50QW5kU2VsZWN0b3IsIG1ldGhvZE9yTmFtZSwgaGFuZGxlcjtcblxuICAgICAgICBjb250ZXh0ID0gY29udGV4dCB8fCB0aGlzO1xuXG4gICAgICAgIHdoaWxlICgoZXZlbnRBbmRTZWxlY3RvciA9IGtleXNbaSsrXSkpIHtcbiAgICAgICAgICBtZXRob2RPck5hbWUgPSB0aGlzLmV2ZW50c1tldmVudEFuZFNlbGVjdG9yXTtcbiAgICAgICAgICBoYW5kbGVyID0gaGVscGVyLmlzRnVuY3Rpb24obWV0aG9kT3JOYW1lKSA/IG1ldGhvZE9yTmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogY29udGV4dFttZXRob2RPck5hbWVdO1xuICAgICAgICAgIGV2ZW50QW5kU2VsZWN0b3IgPSBldmVudEFuZFNlbGVjdG9yLnNwbGl0KFJFWF9FVkVOVF9TUFJJVFRFUik7XG4gICAgICAgICAgdGhpcy5vbihldmVudEFuZFNlbGVjdG9yWzBdLCBldmVudEFuZFNlbGVjdG9yWzFdLCBoYW5kbGVyLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBvbjoge1xuICAgICAgd3JpdGVhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oZXZlbnQsIHNlbGVjdG9yLCBoYW5kbGVyLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBkZWxlZ2F0ZWQgPSB0aGlzLmNyZWF0ZUhhbmRsZXIoc2VsZWN0b3IsIGhhbmRsZXIpLmJpbmQoY29udGV4dCk7XG4gICAgICAgIHRoaXMuY3VycmVudEhhbmRsZXJzLnB1c2goe1xuICAgICAgICAgIGV2ZW50ICAgOiBldmVudCxcbiAgICAgICAgICBoYW5kbGVyIDogZGVsZWdhdGVkXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGRlbGVnYXRlZCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNyZWF0ZUhhbmRsZXI6IHtcbiAgICAgIHdyaXRlYWJsZTogdHJ1ZSxcblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBldnRcbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgICB2YXIgaG9zdCAgID0gZXZ0LmN1cnJlbnRUYXJnZXQsXG4gICAgICAgICAgICAgIHRhcmdldCA9IGV2dC50YXJnZXQ7XG5cbiAgICAgICAgICBkbyB7XG4gICAgICAgICAgICBpZiAodGFyZ2V0ID09PSBob3N0KSB7XG4gICAgICAgICAgICAgIC8vIG5vdCBkZWxlZ2F0ZVxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChoZWxwZXIubWF0Y2hFbGVtZW50KHRhcmdldCwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSB3aGlsZSAoKHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZW1pdDoge1xuICAgICAgd3JpdGVhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24odGFyZ2V0LCB0eXBlLCBvcHRpb25zLCBidWJibGUsIGNhbmNlbCkge1xuICAgICAgICBpZiAoY2FuY2VsID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgY2FuY2VsID0gdHJ1ZTtcblxuICAgICAgICBpZiAoYnViYmxlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgYnViYmxlID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICBvcHRpb25zID0ge307XG5cbiAgICAgICAgaWYgKGhlbHBlci5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgICAgICBoZWxwZXIudG9BcnJheSh0YXJnZXQpXG4gICAgICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVtaXQoZWwsIHR5cGUsIG9wdGlvbnMsIGJ1YmJsZSwgY2FuY2VsKTtcbiAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBldmVudDtcbiAgICAgICAgaGVscGVyLm1peChvcHRpb25zLCB7XG4gICAgICAgICAgY2FuQnViYmxlICA6IGJ1YmJsZSxcbiAgICAgICAgICBjYW5jZWxhYmxlIDogY2FuY2VsLFxuICAgICAgICAgIHZpZXcgICAgICAgOiB3aW5kb3dcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3dpdGNoKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICdjbGljayc6XG4gICAgICAgICAgY2FzZSAnZGJjbGljayc6XG4gICAgICAgICAgY2FzZSAnbW91c2VvdmVyJzpcbiAgICAgICAgICBjYXNlICdtb3VzZW1vdmUnOlxuICAgICAgICAgIGNhc2UgJ21vdXNlb3V0JzpcbiAgICAgICAgICBjYXNlICdtb3VzZXVwJzpcbiAgICAgICAgICBjYXNlICdtb3VzZWRvd24nOlxuICAgICAgICAgIGNhc2UgJ21vdXNlZW50ZXInOlxuICAgICAgICAgIGNhc2UgJ21vdXNlbGVhdmUnOlxuICAgICAgICAgIGNhc2UgJ2NvbnRleHRtZW51JzpcbiAgICAgICAgICAgIGV2ZW50ID0gbmV3IE1vdXNlRXZlbnQodHlwZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdmb2N1cyc6XG4gICAgICAgICAgY2FzZSAnYmx1cic6XG4gICAgICAgICAgY2FzZSAnZm9jdXNpbic6XG4gICAgICAgICAgY2FzZSAnZm9jdXNvdXQnOlxuICAgICAgICAgICAgZXZlbnQgPSBuZXcgRm9jdXNFdmVudCh0eXBlLCBvcHRpb25zKTsgLy8gVE9ETyBpbXBsZW1lbnRlZCBpbiBhbnkgZW52P1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAna2V5dXAnOlxuICAgICAgICAgIGNhc2UgJ2tleWRvd24nOlxuICAgICAgICAgIGNhc2UgJ2tleXByZXNzJzpcbiAgICAgICAgICAgIGV2ZW50ID0gbmV3IEtleWJvYXJkRXZlbnQodHlwZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgZXZlbnQgPSBuZXcgRXZlbnQodHlwZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHRhcmdldC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZGlzYWJsZToge1xuICAgICAgd3JpdGVhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpID0gMCwgb2JqO1xuICAgICAgICB3aGlsZSAoKG9iaiA9IHRoaXMuY3VycmVudEhhbmRsZXJzW2krK10pKSB7XG4gICAgICAgICAgdGhpcy5lbC5yZW1vdmVFdmVudExpc3RlbmVyKG9iai5ldmVudCwgb2JqLmhhbmRsZXIsIHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY3VycmVudEhhbmRsZXJzID0gW107XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gQ2xheUV2ZW50O1xufSgpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fSB0b1xuICogQHBhcmFtIHtPYmplY3R9IGZyb21cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW292ZXJ3cml0ZV1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gbWl4KHRvLCBmcm9tLCBvdmVyd3JpdGUpIHtcbiAgdmFyIGkgPSAwLCBrZXlzID0gT2JqZWN0LmtleXMoZnJvbSksIHByb3A7XG5cbiAgd2hpbGUgKChwcm9wID0ga2V5c1tpKytdKSkge1xuICAgIGlmIChvdmVyd3JpdGUgfHwgIXRvW3Byb3BdKSB7XG4gICAgICB0b1twcm9wXSA9IGZyb21bcHJvcF07XG4gICAgfVxuICB9XG4gIHJldHVybiB0bztcbn1cblxuLyoqXG4gKiBzaGFsbG93IGZsYXR0ZW5cbiAqIEBwYXJhbSB7QXJyYXl9IGxpc3RcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbihsaXN0KSB7XG4gIHZhciBpID0gMCwgaXRlbSwgcmV0ID0gW107XG4gIHdoaWxlICgoaXRlbSA9IGxpc3RbaSsrXSkpIHtcbiAgICBpZiAoaXNBcnJheShpdGVtKSkge1xuICAgICAgcmV0ID0gcmV0LmNvbmNhdChpdGVtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0LnB1c2goaXRlbSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbi8qKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGNsb25lKG9iaikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShvYmopID8gb2JqLnNsaWNlKDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBtaXgoe30sIG9iailcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheVxuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiB1bmlxKGFycmF5KSB7XG4gIHZhciByZXQgPSBbXSwgaSA9IDAsIGl0ZW07XG5cbiAgd2hpbGUgKChpdGVtID0gYXJyYXlbaSsrXSkpIHtcbiAgICBpZiAocmV0LmluZGV4T2YoaXRlbSkgPT09IC0xKSB7XG4gICAgICByZXQucHVzaChpdGVtKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBnZXQgY2FjaGVkIGBtYXRjaGVzU2VsZWN0b3JgIG1ldGhvZCBuYW1lXG4gKi9cbnZhciBtYXRjaGVyTmFtZTtcbmZ1bmN0aW9uIGdldE1hdGNoZXJOYW1lKCkge1xuICBpZiAobWF0Y2hlck5hbWUpIHtcbiAgICByZXR1cm4gbWF0Y2hlck5hbWU7XG4gIH1cblxuICB2YXIgbGlzdCAgPSBbJ21hdGNoZXMnLCAnd2Via2l0TWF0Y2hlc1NlbGVjdG9yJywgJ21vek1hdGNoZXNTZWxlY3RvcicsICdtc01hdGNoZXNTZWxlY3RvciddLFxuICAgICAgcHJvdG8gPSBIVE1MRWxlbWVudC5wcm90b3R5cGUsIGkgPSAwLCBuYW1lO1xuXG4gIHdoaWxlKChuYW1lID0gbGlzdFtpKytdKSkge1xuICAgIGlmIChwcm90b1tuYW1lXSkge1xuICAgICAgbWF0Y2hlck5hbWUgPSBuYW1lO1xuICAgICAgcmV0dXJuIG1hdGNoZXJOYW1lO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIG1hdGNoIGVsZW1lbnQgd2l0aCBzZWxlY3RvclxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudFxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gbWF0Y2hFbGVtZW50KGVsZW1lbnQsIHNlbGVjdG9yKSB7XG4gIHJldHVybiBlbGVtZW50W2dldE1hdGNoZXJOYW1lKCldKHNlbGVjdG9yKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiB0b1N0cmluZyh2YWx1ZSkge1xuICB2YXIgb2JqU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgcmV0dXJuIG9ialN0ci5zbGljZShvYmpTdHIuaW5kZXhPZignICcpICsgMSwgLTEpO1xufVxuXG4vKipcbiAqIGZha2UgYXJyYXkgKGxpa2UgTm9kZUxpc3QsIEFyZ3VtZW50cyBldGMpIGNvbnZlcnQgdG8gQXJyYXlcbiAqIEBwYXJhbSB7Kn0gZmFrZUFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHRvQXJyYXkoZmFrZUFycmF5KSB7XG4gIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmYWtlQXJyYXkpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc051bWJlcih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gdG9TdHJpbmcodmFsdWUpID09PSAnQXJyYXknO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gdG9TdHJpbmcodmFsdWUpID09PSAnT2JqZWN0Jztcbn1cblxuLyoqXG4gKiBAcGFyYW0ge1N0cmluZ30gbG9jYWxOYW1lXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNDdXN0b21FbGVtZW50TmFtZShsb2NhbE5hbWUpIHtcbiAgcmV0dXJuIGxvY2FsTmFtZS5pbmRleE9mKCctJykgIT09IC0xO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGhhbmRsZXJcbiAqL1xuZnVuY3Rpb24gcmVhZHkoaGFuZGxlcikge1xuICBpZiAoRkxHX0RPTV9BTFJFQURZKSB7XG4gICAgaGFuZGxlcigpO1xuICB9IGVsc2Uge1xuICAgIFNUQUNLX1JFQURZX0hBTkRMRVJTLnB1c2goaGFuZGxlcik7XG4gIH1cbn1cblxudmFyIEZMR19ET01fQUxSRUFEWSAgICAgID0gZmFsc2UsXG4gICAgU1RBQ0tfUkVBRFlfSEFORExFUlMgPSBbXTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICBGTEdfRE9NX0FMUkVBRFkgPSB0cnVlO1xuICB2YXIgaSA9IDAsIHJlYWR5O1xuICB3aGlsZSAocmVhZHkgPSBTVEFDS19SRUFEWV9IQU5ETEVSU1tpKytdKSB7XG4gICAgcmVhZHkoKTtcbiAgfVxufSwgZmFsc2UpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSB7XG4gIG5vb3AgICAgICA6IGZ1bmN0aW9uIG5vb3AoKSB7fSxcbiAgbWl4ICAgICAgIDogbWl4LFxuICB1bmlxICAgICAgOiB1bmlxLFxuICBjbG9uZSAgICAgOiBjbG9uZSxcbiAgZmxhdHRlbiAgIDogZmxhdHRlbixcbiAgcmVhZHkgICAgIDogcmVhZHksXG4gIHRvQXJyYXkgICA6IHRvQXJyYXksXG4gIHRvU3RyaW5nICA6IHRvU3RyaW5nLFxuXG4gIG1hdGNoRWxlbWVudCA6IG1hdGNoRWxlbWVudCxcblxuICBpc1N0cmluZyAgICAgICAgICAgIDogaXNTdHJpbmcsXG4gIGlzTnVtYmVyICAgICAgICAgICAgOiBpc051bWJlcixcbiAgaXNBcnJheSAgICAgICAgICAgICA6IGlzQXJyYXksXG4gIGlzRnVuY3Rpb24gICAgICAgICAgOiBpc0Z1bmN0aW9uLFxuICBpc0N1c3RvbUVsZW1lbnROYW1lIDogaXNDdXN0b21FbGVtZW50TmFtZVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhlbHBlciA9IHJlcXVpcmUoJy4uL2hlbHBlcicpLmRlZmF1bHQ7XG5cbi8vIHRlc3Qgc2FtcGxlXG5mdW5jdGlvbiBIdHRwKGN0eCkge1xuICB0aGlzLmNvbnRleHQgPSBjdHg7XG59XG5cbmhlbHBlci5taXgoSHR0cC5wcm90b3R5cGUsIHtcbiAgZ2V0OiBmdW5jdGlvbih1cmwpIHtcblxuICB9XG59KTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gZnVuY3Rpb24gZmFjdG9yeShjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgSHR0cChjb250ZXh0KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IHtcbiAgLyoqXG4gICAqIEBzdGF0aWNcbiAgICogQHJldHVybnMge0NsYXlPYnNlcnZlcn1cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBDbGF5T2JzZXJ2ZXIoKTtcbiAgfVxufTtcblxudmFyIENsYXlPYnNlcnZlciA9IGZ1bmN0aW9uKCkge1xuIGZ1bmN0aW9uIENsYXlPYnNlcnZlcigpIHt9XG4gcmV0dXJuIENsYXlPYnNlcnZlcjtcbn0oKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGVsZW1lbnQgPSByZXF1aXJlKCcuL2VsZW1lbnQnKS5kZWZhdWx0O1xudmFyIGhlbHBlciA9IHJlcXVpcmUoJy4vaGVscGVyJykuZGVmYXVsdDtcblxudmFyIFJFR0lTVFJZX0NMQVlfRUxFTUVOVFMgPSB7fTtcblxuLyoqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtPYmplY3R9IFtwcm90b11cbiAqL1xuZnVuY3Rpb24gQ2xheVJlZ2lzdGVyKG5hbWUsIHByb3RvKSB7XG4gIGlmIChwcm90byA9PT0gdW5kZWZpbmVkKVxuICAgIHByb3RvID0ge307XG5cbiAgaWYgKFJFR0lTVFJZX0NMQVlfRUxFTUVOVFNbbmFtZV0pIHtcbiAgICAvLyBhbHJlYWR5IHJlZ2lzdGVyZWRcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBwcm90b3R5cGU6IGVsZW1lbnQuY3JlYXRlKG5hbWUsIHByb3RvKVxuICB9O1xuXG4gIGlmIChwcm90by5leHRlbmRzICYmICFoZWxwZXIuaXNDdXN0b21FbGVtZW50TmFtZShwcm90by5leHRlbmRzKSkge1xuICAgIG9wdGlvbnMuZXh0ZW5kcyA9IHByb3RvLmV4dGVuZHM7XG4gIH1cblxuICBSRUdJU1RSWV9DTEFZX0VMRU1FTlRTW25hbWVdID0gZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KG5hbWUsIG9wdGlvbnMpO1xufVxuXG5leHBvcnRzLmRlZmF1bHQgPSBDbGF5UmVnaXN0ZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBoZWxwZXIgPSByZXF1aXJlKFwiLi9oZWxwZXJcIikuZGVmYXVsdDtcbnZhciB0bXBsSGVscGVyID0gcmVxdWlyZShcIi4vdGVtcGxhdGUtaGVscGVyXCIpLmRlZmF1bHQ7XG52YXIgaHRtbFBhcnNlciA9IHJlcXVpcmUoXCJodG1sUGFyc2VyXCIpO1xuXG52YXIgUkVYX0lOVEVSUE9MQVRFX1NZTUJPTCA9IC97e1tee31dK319L2csXG4gICAgUkVYX1JFUEVBVF9TWU1CT0wgICAgICA9IC97eyhcXHcrKVxcc2luXFxzKFtcXHdcXC5dKyl9fS8sXG4gICAgU1RSX1JFUEVBVF9BVFRSSUJVVEUgICA9ICdjbC1yZXBlYXQnO1xuXG5leHBvcnRzLmRlZmF1bHQgPSB7XG4gIC8qKlxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBodG1sXG4gICAqIEByZXR1cm5zIHtDbGF5VGVtcGxhdGVDb21waWxlcn1cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24oaHRtbCkge1xuICAgIHJldHVybiBuZXcgQ2xheVRlbXBsYXRlQ29tcGlsZXIoaHRtbCk7XG4gIH1cbn07XG5cbnZhciBDbGF5VGVtcGxhdGVDb21waWxlciA9IGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBDbGF5VGVtcGxhdGVDb21waWxlcihodG1sKSB7XG4gICAgdmFyIGhhbmRsZXIgPSBuZXcgaHRtbFBhcnNlci5EZWZhdWx0SGFuZGxlcihmdW5jdGlvbiAoZXJyLCBkb20pIHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgZW5mb3JjZUVtcHR5VGFncyA6IHRydWUsXG4gICAgICAgICAgaWdub3JlV2hpdGVzcGFjZSA6IHRydWUsXG4gICAgICAgICAgdmVyYm9zZSAgICAgICAgICA6IGZhbHNlXG4gICAgICAgIH0pLFxuICAgICAgICBwYXJzZXIgPSBuZXcgaHRtbFBhcnNlci5QYXJzZXIoaGFuZGxlcik7XG5cbiAgICAvLyBwYXJzZSBodG1sXG4gICAgcGFyc2VyLnBhcnNlQ29tcGxldGUoaHRtbCk7XG4gICAgaWYgKGhhbmRsZXIuZG9tLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IEVycm9yKCdUZW1wbGF0ZSBtdXN0IGhhdmUgZXhhY3RseSBvbmUgcm9vdCBlbGVtZW50LiB3YXM6ICcgKyBodG1sKTtcbiAgICB9XG5cbiAgICAvLyBjb21waWxlXG4gICAgdGhpcy5zdHJ1Y3R1cmUgPSBjb21waWxlRG9tU3RydWN0dXJlKGhhbmRsZXIuZG9tWzBdKTtcbiAgfVxuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKENsYXlUZW1wbGF0ZUNvbXBpbGVyLnByb3RvdHlwZSwge1xuICAgIGdldENvbXBpbGVkOiB7XG4gICAgICB3cml0ZWFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RydWN0dXJlO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIENsYXlUZW1wbGF0ZUNvbXBpbGVyO1xufSgpO1xuXG4vKipcbiAqIEBkZXN0cnVjdGl2ZVxuICogQHBhcmFtIHtPYmplY3R9IGRvbVN0cnVjdHVyZVxuICovXG5mdW5jdGlvbiBjb21waWxlRG9tU3RydWN0dXJlKGRvbVN0cnVjdHVyZSkge1xuICBpZiAoZG9tU3RydWN0dXJlID09PSB1bmRlZmluZWQpXG4gICAgZG9tU3RydWN0dXJlID0ge307XG5cbiAgdmFyIGRhdGEgICAgID0gZG9tU3RydWN0dXJlLmRhdGEsXG4gICAgICBhdHRycyAgICA9IGRvbVN0cnVjdHVyZS5hdHRyaWJzICAgIHx8IHt9LFxuICAgICAgY2hpbGRyZW4gPSBkb21TdHJ1Y3R1cmUuY2hpbGRyZW4gICB8fCBbXSxcbiAgICAgIGhvb2tzICAgID0gZG9tU3RydWN0dXJlLmhvb2tzICAgICAgPSB7fSxcbiAgICAgIGV2YWxzICAgID0gZG9tU3RydWN0dXJlLmV2YWx1YXRvcnMgPSB7XG4gICAgICAgIGF0dHJzICA6IHt9LFxuICAgICAgICBzdHlsZSAgOiBudWxsLFxuICAgICAgICBkYXRhICAgOiBudWxsLFxuICAgICAgICByZXBlYXQgOiBudWxsXG4gICAgICB9LFxuICAgICAga2V5cywga2V5LCBpID0gMDtcblxuICAvLyBzdHlsZXMgZXZhbHVhdG9yXG4gIGlmIChhdHRycy5zdHlsZSkge1xuICAgIGRvbVN0cnVjdHVyZS5zdHlsZSA9IGF0dHJzLnN0eWxlO1xuICAgIGV2YWxzLnN0eWxlID0gY29tcGlsZVZhbHVlKGRvbVN0cnVjdHVyZS5zdHlsZSk7XG4gICAgZGVsZXRlIGF0dHJzLnN0eWxlOyAgLy8gZGVsZXRlIGZyb20gb3JpZyBhdHRyaWIgb2JqZWN0XG4gIH1cblxuICAvLyBhdHRyaWJ1dGVzIGV2YWx1YXRvciAmIGhvb2tcbiAga2V5cyA9IE9iamVjdC5rZXlzKGF0dHJzKTtcbiAgd2hpbGUgKChrZXkgPSBrZXlzW2krK10pKSB7XG4gICAgLy8gaG9va1xuICAgIGlmICh0bXBsSGVscGVyW2tleV0pIHtcbiAgICAgIGhvb2tzW2tleV0gPSBob29rKHRtcGxIZWxwZXJba2V5XSk7XG4gICAgfVxuICAgIC8vIHJlcGVhdFxuICAgIGVsc2UgaWYgKGtleSA9PT0gU1RSX1JFUEVBVF9BVFRSSUJVVEUpIHtcbiAgICAgIGV2YWxzLnJlcGVhdCA9IGNvbXBpbGVSZXBlYXRFeHByZXNzaW9uKGF0dHJzW1NUUl9SRVBFQVRfQVRUUklCVVRFXSk7XG4gICAgICBkZWxldGUgYXR0cnNbU1RSX1JFUEVBVF9BVFRSSUJVVEVdOyAvLyBkZWxldGUgZnJvbSBvcmlnIGF0dHJpYiBvYmplY3RcbiAgICB9XG4gICAgLy8gaW50ZXJwb2xhdGVcbiAgICBlbHNlIHtcbiAgICAgIGV2YWxzLmF0dHJzW2tleV0gPSBjb21waWxlVmFsdWUoYXR0cnNba2V5XSk7XG4gICAgfVxuICB9XG5cbiAgLy8gZGF0YSAodGV4dCkgZXZhbHVhdG9yXG4gIGV2YWxzLmRhdGEgPSBjb21waWxlVmFsdWUoZGF0YSk7XG5cbiAgLy8gcmVjdXJzaXZlXG4gIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICBjb21waWxlRG9tU3RydWN0dXJlKGNoaWxkKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGRvbVN0cnVjdHVyZTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJucyB7P0Z1bmN0aW9ufVxuICovXG5mdW5jdGlvbiBjb21waWxlVmFsdWUoc3RyKSB7XG4gIHN0ciA9IChzdHIgfHwgJycpO1xuICB2YXIgbWF0Y2hlcyA9IHN0ci5tYXRjaChSRVhfSU5URVJQT0xBVEVfU1lNQk9MKTtcblxuICBpZiAobWF0Y2hlcyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBGdW5jdGlvbignZGF0YScsW1xuICAgIFwidmFyIHM9W107XCIsXG4gICAgXCJzLnB1c2goJ1wiLFxuICAgIHN0ci5yZXBsYWNlKC9bXFxyXFxuXFx0XS9nLCAnICcpXG4gICAgICAgLnNwbGl0KFwiJ1wiKS5qb2luKFwiXFxcXCdcIilcbiAgICAgICAucmVwbGFjZSgve3soW157fV0rKX19L2csIFwiJywoZGF0YS4kMSAhPSBudWxsID8gZGF0YS4kMSA6ICcnKSwnXCIpXG4gICAgICAgLnNwbGl0KC9cXHN7Mix9Lykuam9pbignICcpLFxuICAgIFwiJyk7XCIsXG4gICAgXCJyZXR1cm4gcy5qb2luKCcnKTtcIlxuICBdLmpvaW4oJycpKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge1N0cmluZ30gcmVwZWF0RXhwclxuICogQHJldHVybnMge0Z1bmN0aW9ufVxuICovXG5mdW5jdGlvbiBjb21waWxlUmVwZWF0RXhwcmVzc2lvbihyZXBlYXRFeHByKSB7XG4gIHZhciBtYXRjaGVzID0gKHJlcGVhdEV4cHIgfHwgJycpLm1hdGNoKFJFWF9SRVBFQVRfU1lNQk9MKSxcbiAgICAgIHBhcmVudFRhcmdldFBhdGgsXG4gICAgICBjaGlsZFNjb3BlTmFtZTtcblxuICBpZiAobWF0Y2hlcyA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCBzeW50YXggZm9yIHJlcGVhdDogJyArIHJlcGVhdEV4cHIpXG4gIH1cblxuICBwYXJlbnRUYXJnZXRQYXRoID0gbWF0Y2hlc1syXTtcbiAgY2hpbGRTY29wZU5hbWUgICA9IG1hdGNoZXNbMV07XG5cbiAgcmV0dXJuIG5ldyBGdW5jdGlvbignZGF0YScsIFtcbiAgICBcInJldHVybiBkYXRhLlwiICsgcGFyZW50VGFyZ2V0UGF0aCArIFwiLm1hcChmdW5jdGlvbihpdGVtKSB7XCIsXG4gICAgXCIgIHZhciBrcywgaywgaSA9IDAsIHIgPSB7fTtcIixcbiAgICBcIiAga3MgPSBPYmplY3Qua2V5cyhkYXRhKTtcIixcbiAgICBcIiAgd2hpbGUgKChrID0ga3NbaSsrXSkpIHtcIixcbiAgICBcIiAgICByW2tdID0gZGF0YVtrXTtcIixcbiAgICBcIiAgfVwiLFxuICAgIFwiICByLlwiICsgY2hpbGRTY29wZU5hbWUgKyBcIiA9IGl0ZW07XCIsXG4gICAgXCIgIHJldHVybiByO1wiLFxuICAgIFwifSk7XCJcbiAgXS5qb2luKCcnKSk7XG59XG5cbnZhciBIb29rV3JhcHBlciA9IGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBIb29rV3JhcHBlcihmbikge1xuICAgIHRoaXMuZm4gPSBmblxuICB9XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoSG9va1dyYXBwZXIucHJvdG90eXBlLCB7XG4gICAgaG9vazoge1xuICAgICAgd3JpdGVhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIEhvb2tXcmFwcGVyO1xufSgpO1xuXG4vKipcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJucyB7SG9va1dyYXBwZXJ9XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gaG9vayhmbikge1xuICByZXR1cm4gbmV3IEhvb2tXcmFwcGVyKGZuKVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyID0gcmVxdWlyZShcIi4vaGVscGVyXCIpLmRlZmF1bHQ7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IHtcbiAgcmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIGZ1bmMpIHtcbiAgICB0aGlzW25hbWVdID0gZnVuYztcbiAgfSxcbiAgaG9vazogZnVuY3Rpb24oZWwpIHtcbiAgICBjb25zb2xlLmxvZygnaG9vaycsIGVsKTtcbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGggPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9oJyk7XG52YXIgZGlmZiA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL2RpZmYnKTtcbnZhciBwYXRjaCA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL3BhdGNoJyk7XG52YXIgaGVscGVyID0gcmVxdWlyZShcIi4vaGVscGVyXCIpLmRlZmF1bHQ7XG52YXIgdG1wbENvbXBpbGVyID0gcmVxdWlyZShcIi4vdGVtcGxhdGUtY29tcGlsZXJcIikuZGVmYXVsdDtcbnZhciBjcmVhdGUgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9jcmVhdGUtZWxlbWVudCcpO1xuXG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lICA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG5leHBvcnRzLmRlZmF1bHQgPSB7XG4gIC8qKlxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBodG1sXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbc2NvcGVdXG4gICAqIEByZXR1cm5zIHtDbGF5VGVtcGxhdGV9XG4gICAqL1xuICBjcmVhdGU6IGZ1bmN0aW9uKGh0bWwsIHNjb3BlKSB7XG4gICAgcmV0dXJuIG5ldyBDbGF5VGVtcGxhdGUoaHRtbCwgc2NvcGUpO1xuICB9XG59O1xuXG52YXIgQ2xheVRlbXBsYXRlID0gZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIENsYXlUZW1wbGF0ZShodG1sLCBzY29wZSkge1xuICAgIGlmIChzY29wZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgc2NvcGUgPSB7fTtcblxuICAgIHRoaXMuX2RpZmZRdWV1ZSAgID0gW107XG4gICAgdGhpcy5faW52YWxpZGF0ZWQgPSBmYWxzZTtcblxuICAgIHRoaXMuc2NvcGUgICAgPSBzY29wZTtcbiAgICB0aGlzLmNvbXBpbGVkID0gdG1wbENvbXBpbGVyLmNyZWF0ZShodG1sKS5nZXRDb21waWxlZCgpO1xuICB9XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQ2xheVRlbXBsYXRlLnByb3RvdHlwZSwge1xuICAgIGNyZWF0ZVZUcmVlOiB7XG4gICAgICB3cml0ZWFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRWVHJlZSA9IGNvbnZlcnRQYXJzZWREb21Ub1ZUcmVlKHRoaXMuY29tcGlsZWQsIHRoaXMuc2NvcGUpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjcmVhdGVFbGVtZW50OiB7XG4gICAgICB3cml0ZWFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihkb2MpIHtcbiAgICAgICAgaWYgKGRvYyA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgIGRvYyA9IGRvY3VtZW50O1xuXG4gICAgICAgIHJldHVybiBjcmVhdGUodGhpcy5jcmVhdGVWVHJlZSgpLCB7XG4gICAgICAgICAgZG9jdW1lbnQ6IGRvY1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgaW52YWxpZGF0ZToge1xuICAgICAgd3JpdGVhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLl9pbnZhbGlkYXRlZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCA9IHRydWU7XG4gICAgICAgIHNldFRpbWVvdXQodGhpcy5fdXBkYXRlLmJpbmQodGhpcyksIDQpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBfdXBkYXRlOiB7XG4gICAgICB3cml0ZWFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGN1cnJlbnQgPSB0aGlzLl9jdXJyZW50VlRyZWUsXG4gICAgICAgICAgICB1cGRhdGVkID0gY29udmVydFBhcnNlZERvbVRvVlRyZWUodGhpcy5jb21waWxlZCwgdGhpcy5zY29wZSk7XG5cbiAgICAgICAgdGhpcy5fZGlmZlF1ZXVlID0gZGlmZihjdXJyZW50LCB1cGRhdGVkKTtcbiAgICAgICAgdGhpcy5fY3VycmVudFZUcmVlID0gdXBkYXRlZDtcblxuICAgICAgICB0aGlzLl9pbnZhbGlkYXRlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBkcmF3TG9vcDoge1xuICAgICAgd3JpdGVhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24odGFyZ2V0Um9vdCkge1xuICAgICAgICB2YXIgcGF0Y2hET00gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAodGhpcy5fZGlmZlF1ZXVlKSB7XG4gICAgICAgICAgICBwYXRjaCh0YXJnZXRSb290LCB0aGlzLl9kaWZmUXVldWUpO1xuICAgICAgICAgICAgdGhpcy5fZGlmZlF1ZXVlID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShwYXRjaERPTSk7XG4gICAgICAgIH0uYmluZCh0aGlzKTtcblxuICAgICAgICBwYXRjaERPTSgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBkZXN0cm95OiB7XG4gICAgICB3cml0ZWFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zY29wZSA9IHRoaXMuY29tcGlsZWQgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIENsYXlUZW1wbGF0ZTtcbn0oKTtcblxuLyoqXG4gKiBjb252ZXJ0IHRvIFZpcnR1YWxOb2RlIGZyb20gRG9tU3RydWN0dXJlXG4gKlxuICogQHBhcmFtIHtEb21TdHJ1Y3R1cmV9IGRvbVxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtpZ25vcmVSZXBlYXRdXG4gKiBAcmV0dXJucyB7VmlydHVhbE5vZGV9XG4gKi9cbmZ1bmN0aW9uIGNvbnZlcnRQYXJzZWREb21Ub1ZUcmVlKGRvbSwgc2NvcGUsIGlnbm9yZVJlcGVhdCkge1xuICB2YXIgdGFnICAgICAgPSBkb20ubmFtZSxcbiAgICAgIHR5cGUgICAgID0gZG9tLnR5cGUsXG4gICAgICBkYXRhICAgICA9IGRvbS5kYXRhLFxuICAgICAgb3JnQXR0cnMgPSBkb20uYXR0cmlicyAgfHwge30sXG4gICAgICBvcmdTdHlsZSA9IGRvbS5zdHlsZSAgICB8fCAnJyxcbiAgICAgIGNoaWxkcmVuID0gZG9tLmNoaWxkcmVuIHx8IFtdLFxuICAgICAgZXZhbHMgICAgPSBkb20uZXZhbHVhdG9ycyxcbiAgICAgIGF0dHJzICAgID0ge30sXG4gICAgICBzdHlsZSAgICA9IHt9LFxuICAgICAgaG9va3MgICAgPSBkb20uaG9va3MsXG4gICAgICBrZXlzLCBrZXksIGkgPSAwO1xuXG4gIHN3aXRjaCh0eXBlKSB7XG4gICAgY2FzZSAndGFnJzpcblxuICAgICAgLy8gcmVwZWF0IGVsZW1lbnRzXG4gICAgICBpZiAoZXZhbHMucmVwZWF0ICYmICFpZ25vcmVSZXBlYXQpIHtcbiAgICAgICAgcmV0dXJuIGV2YWxzLnJlcGVhdChzY29wZSkubWFwKGZ1bmN0aW9uKGNoaWxkU2NvcGUpIHtcbiAgICAgICAgICByZXR1cm4gY29udmVydFBhcnNlZERvbVRvVlRyZWUoZG9tLCBjaGlsZFNjb3BlLCB0cnVlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGV2YWwgc3R5bGVzXG4gICAgICBpZiAob3JnU3R5bGUpIHtcbiAgICAgICAgc3R5bGUgPSBldmFscy5zdHlsZSA/IGV2YWxzLnN0eWxlKHNjb3BlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogb3JnU3R5bGU7XG4gICAgICAgIHN0eWxlID0gY29udmVydENzc1N0cmluZ1RvT2JqZWN0KHN0eWxlKTtcbiAgICAgIH1cblxuICAgICAgLy8gZXZhbCBhdHRyaWJ1dGVzXG4gICAgICBrZXlzID0gT2JqZWN0LmtleXMob3JnQXR0cnMpO1xuICAgICAgd2hpbGUgKChrZXkgPSBrZXlzW2krK10pKSB7XG4gICAgICAgIGF0dHJzW2tleV0gPSBldmFscy5hdHRyc1trZXldID8gZXZhbHMuYXR0cnNba2V5XShzY29wZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBvcmdBdHRyc1trZXldO1xuICAgICAgfVxuXG4gICAgICAvLyBmbGF0dGVuIGNoaWxkcmVuXG4gICAgICBjaGlsZHJlbiA9IGNoaWxkcmVuLm1hcChmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICByZXR1cm4gY29udmVydFBhcnNlZERvbVRvVlRyZWUoY2hpbGQsIHNjb3BlKTtcbiAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbih2KSB7IHJldHVybiAhIXY7IH0pO1xuICAgICAgY2hpbGRyZW4gPSBoZWxwZXIuZmxhdHRlbihjaGlsZHJlbik7XG5cbiAgICAgIC8vIGNyZWF0ZSBWVHJlZVxuICAgICAgcmV0dXJuIGgodGFnLCBoZWxwZXIubWl4KHtcbiAgICAgICAgYXR0cmlidXRlcyA6IGF0dHJzLFxuICAgICAgICBzdHlsZSAgICAgIDogc3R5bGVcbiAgICAgIH0sIGhvb2tzKSwgY2hpbGRyZW4pO1xuXG4gICAgY2FzZSAndGV4dCc6XG4gICAgICAvLyBldmFsIHRleHRcbiAgICAgIHJldHVybiBTdHJpbmcoZXZhbHMuZGF0YSA/IGV2YWxzLmRhdGEoc2NvcGUpIDogZGF0YSk7XG5cbiAgICBjYXNlICdjb21tZW50JzpcbiAgICAgIC8vIGlnbm9yZVxuICAgICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBjb252ZXJ0IHRvIG9iamVjdCBmcm9tIHN0eWxlIGF0dHJpYnV0ZSB2YWx1ZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjc3NTdHJcbiAqIEByZXR1cm5zIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIGNvbnZlcnRDc3NTdHJpbmdUb09iamVjdChjc3NTdHIpIHtcbiAgdmFyIGNzc1N0cmluZ3MgPSBjc3NTdHIucmVwbGFjZSgvXFxzL2csICcnKS5zcGxpdCgnOycpLFxuICAgICAgcmV0U3R5bGUgICA9IHt9LFxuICAgICAgaSA9IDAsIHByb3BfdmFsdWU7XG5cbiAgd2hpbGUgKChwcm9wX3ZhbHVlID0gY3NzU3RyaW5nc1tpKytdKSkge1xuICAgIHByb3BfdmFsdWUgPSBwcm9wX3ZhbHVlLnNwbGl0KCc6Jyk7XG4gICAgcmV0U3R5bGVbcHJvcF92YWx1ZVswXV0gPSBwcm9wX3ZhbHVlWzFdO1xuICB9XG5cbiAgcmV0dXJuIHJldFN0eWxlO1xufVxuIixudWxsLCIoZnVuY3Rpb24gKF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuQ29weXJpZ2h0IDIwMTAsIDIwMTEsIENocmlzIFdpbmJlcnJ5IDxjaHJpc0B3aW5iZXJyeS5uZXQ+LiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxub2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG9cbmRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlXG5yaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3JcbnNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG5BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lOR1xuRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HU1xuSU4gVEhFIFNPRlRXQVJFLlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKiB2MS43LjYgKi9cblxuKGZ1bmN0aW9uICgpIHtcblxuZnVuY3Rpb24gcnVubmluZ0luTm9kZSAoKSB7XG5cdHJldHVybihcblx0XHQodHlwZW9mIHJlcXVpcmUpID09IFwiZnVuY3Rpb25cIlxuXHRcdCYmXG5cdFx0KHR5cGVvZiBleHBvcnRzKSA9PSBcIm9iamVjdFwiXG5cdFx0JiZcblx0XHQodHlwZW9mIG1vZHVsZSkgPT0gXCJvYmplY3RcIlxuXHRcdCYmXG5cdFx0KHR5cGVvZiBfX2ZpbGVuYW1lKSA9PSBcInN0cmluZ1wiXG5cdFx0JiZcblx0XHQodHlwZW9mIF9fZGlybmFtZSkgPT0gXCJzdHJpbmdcIlxuXHRcdCk7XG59XG5cbmlmICghcnVubmluZ0luTm9kZSgpKSB7XG5cdGlmICghdGhpcy5UYXV0b2xvZ2lzdGljcylcblx0XHR0aGlzLlRhdXRvbG9naXN0aWNzID0ge307XG5cdGVsc2UgaWYgKHRoaXMuVGF1dG9sb2dpc3RpY3MuTm9kZUh0bWxQYXJzZXIpXG5cdFx0cmV0dXJuOyAvL05vZGVIdG1sUGFyc2VyIGFscmVhZHkgZGVmaW5lZCFcblx0dGhpcy5UYXV0b2xvZ2lzdGljcy5Ob2RlSHRtbFBhcnNlciA9IHt9O1xuXHRleHBvcnRzID0gdGhpcy5UYXV0b2xvZ2lzdGljcy5Ob2RlSHRtbFBhcnNlcjtcbn1cblxuLy9UeXBlcyBvZiBlbGVtZW50cyBmb3VuZCBpbiB0aGUgRE9NXG52YXIgRWxlbWVudFR5cGUgPSB7XG5cdCAgVGV4dDogXCJ0ZXh0XCIgLy9QbGFpbiB0ZXh0XG5cdCwgRGlyZWN0aXZlOiBcImRpcmVjdGl2ZVwiIC8vU3BlY2lhbCB0YWcgPCEuLi4+XG5cdCwgQ29tbWVudDogXCJjb21tZW50XCIgLy9TcGVjaWFsIHRhZyA8IS0tLi4uLS0+XG5cdCwgU2NyaXB0OiBcInNjcmlwdFwiIC8vU3BlY2lhbCB0YWcgPHNjcmlwdD4uLi48L3NjcmlwdD5cblx0LCBTdHlsZTogXCJzdHlsZVwiIC8vU3BlY2lhbCB0YWcgPHN0eWxlPi4uLjwvc3R5bGU+XG5cdCwgVGFnOiBcInRhZ1wiIC8vQW55IHRhZyB0aGF0IGlzbid0IHNwZWNpYWxcbn1cblxuZnVuY3Rpb24gUGFyc2VyIChoYW5kbGVyLCBvcHRpb25zKSB7XG5cdHRoaXMuX29wdGlvbnMgPSBvcHRpb25zID8gb3B0aW9ucyA6IHsgfTtcblx0aWYgKHRoaXMuX29wdGlvbnMuaW5jbHVkZUxvY2F0aW9uID09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX29wdGlvbnMuaW5jbHVkZUxvY2F0aW9uID0gZmFsc2U7IC8vRG8gbm90IHRyYWNrIGVsZW1lbnQgcG9zaXRpb24gaW4gZG9jdW1lbnQgYnkgZGVmYXVsdFxuXHR9XG5cblx0dGhpcy52YWxpZGF0ZUhhbmRsZXIoaGFuZGxlcik7XG5cdHRoaXMuX2hhbmRsZXIgPSBoYW5kbGVyO1xuXHR0aGlzLnJlc2V0KCk7XG59XG5cblx0Ly8qKlwiU3RhdGljXCIqKi8vXG5cdC8vUmVndWxhciBleHByZXNzaW9ucyB1c2VkIGZvciBjbGVhbmluZyB1cCBhbmQgcGFyc2luZyAoc3RhdGVsZXNzKVxuXHRQYXJzZXIuX3JlVHJpbSA9IC8oXlxccyt8XFxzKyQpL2c7IC8vVHJpbSBsZWFkaW5nL3RyYWlsaW5nIHdoaXRlc3BhY2Vcblx0UGFyc2VyLl9yZVRyaW1Db21tZW50ID0gLyheXFwhLS18LS0kKS9nOyAvL1JlbW92ZSBjb21tZW50IHRhZyBtYXJrdXAgZnJvbSBjb21tZW50IGNvbnRlbnRzXG5cdFBhcnNlci5fcmVXaGl0ZXNwYWNlID0gL1xccy9nOyAvL1VzZWQgdG8gZmluZCBhbnkgd2hpdGVzcGFjZSB0byBzcGxpdCBvblxuXHRQYXJzZXIuX3JlVGFnTmFtZSA9IC9eXFxzKihcXC8/KVxccyooW15cXHNcXC9dKykvOyAvL1VzZWQgdG8gZmluZCB0aGUgdGFnIG5hbWUgZm9yIGFuIGVsZW1lbnRcblxuXHQvL1JlZ3VsYXIgZXhwcmVzc2lvbnMgdXNlZCBmb3IgcGFyc2luZyAoc3RhdGVmdWwpXG5cdFBhcnNlci5fcmVBdHRyaWIgPSAvL0ZpbmQgYXR0cmlidXRlcyBpbiBhIHRhZ1xuXHRcdC8oW149PD5cXFwiXFwnXFxzXSspXFxzKj1cXHMqXCIoW15cIl0qKVwifChbXj08PlxcXCJcXCdcXHNdKylcXHMqPVxccyonKFteJ10qKSd8KFtePTw+XFxcIlxcJ1xcc10rKVxccyo9XFxzKihbXidcIlxcc10rKXwoW149PD5cXFwiXFwnXFxzXFwvXSspL2c7XG5cdFBhcnNlci5fcmVUYWdzID0gL1tcXDxcXD5dL2c7IC8vRmluZCB0YWcgbWFya2Vyc1xuXG5cdC8vKipQdWJsaWMqKi8vXG5cdC8vTWV0aG9kcy8vXG5cdC8vUGFyc2VzIGEgY29tcGxldGUgSFRNTCBhbmQgcHVzaGVzIGl0IHRvIHRoZSBoYW5kbGVyXG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VDb21wbGV0ZSA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZUNvbXBsZXRlIChkYXRhKSB7XG5cdFx0dGhpcy5yZXNldCgpO1xuXHRcdHRoaXMucGFyc2VDaHVuayhkYXRhKTtcblx0XHR0aGlzLmRvbmUoKTtcblx0fVxuXG5cdC8vUGFyc2VzIGEgcGllY2Ugb2YgYW4gSFRNTCBkb2N1bWVudFxuXHRQYXJzZXIucHJvdG90eXBlLnBhcnNlQ2h1bmsgPSBmdW5jdGlvbiBQYXJzZXIkcGFyc2VDaHVuayAoZGF0YSkge1xuXHRcdGlmICh0aGlzLl9kb25lKVxuXHRcdFx0dGhpcy5oYW5kbGVFcnJvcihuZXcgRXJyb3IoXCJBdHRlbXB0ZWQgdG8gcGFyc2UgY2h1bmsgYWZ0ZXIgcGFyc2luZyBhbHJlYWR5IGRvbmVcIikpO1xuXHRcdHRoaXMuX2J1ZmZlciArPSBkYXRhOyAvL0ZJWE1FOiB0aGlzIGNhbiBiZSBhIGJvdHRsZW5lY2tcblx0XHR0aGlzLnBhcnNlVGFncygpO1xuXHR9XG5cblx0Ly9UZWxscyB0aGUgcGFyc2VyIHRoYXQgdGhlIEhUTUwgYmVpbmcgcGFyc2VkIGlzIGNvbXBsZXRlXG5cdFBhcnNlci5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIFBhcnNlciRkb25lICgpIHtcblx0XHRpZiAodGhpcy5fZG9uZSlcblx0XHRcdHJldHVybjtcblx0XHR0aGlzLl9kb25lID0gdHJ1ZTtcblx0XG5cdFx0Ly9QdXNoIGFueSB1bnBhcnNlZCB0ZXh0IGludG8gYSBmaW5hbCBlbGVtZW50IGluIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRpZiAodGhpcy5fYnVmZmVyLmxlbmd0aCkge1xuXHRcdFx0dmFyIHJhd0RhdGEgPSB0aGlzLl9idWZmZXI7XG5cdFx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdFx0dmFyIGVsZW1lbnQgPSB7XG5cdFx0XHRcdCAgcmF3OiByYXdEYXRhXG5cdFx0XHRcdCwgZGF0YTogKHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuVGV4dCkgPyByYXdEYXRhIDogcmF3RGF0YS5yZXBsYWNlKFBhcnNlci5fcmVUcmltLCBcIlwiKVxuXHRcdFx0XHQsIHR5cGU6IHRoaXMuX3BhcnNlU3RhdGVcblx0XHRcdFx0fTtcblx0XHRcdGlmICh0aGlzLl9wYXJzZVN0YXRlID09IEVsZW1lbnRUeXBlLlRhZyB8fCB0aGlzLl9wYXJzZVN0YXRlID09IEVsZW1lbnRUeXBlLlNjcmlwdCB8fCB0aGlzLl9wYXJzZVN0YXRlID09IEVsZW1lbnRUeXBlLlN0eWxlKVxuXHRcdFx0XHRlbGVtZW50Lm5hbWUgPSB0aGlzLnBhcnNlVGFnTmFtZShlbGVtZW50LmRhdGEpO1xuXHRcdFx0dGhpcy5wYXJzZUF0dHJpYnMoZWxlbWVudCk7XG5cdFx0XHR0aGlzLl9lbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuXHRcdH1cblx0XG5cdFx0dGhpcy53cml0ZUhhbmRsZXIoKTtcblx0XHR0aGlzLl9oYW5kbGVyLmRvbmUoKTtcblx0fVxuXG5cdC8vUmVzZXRzIHRoZSBwYXJzZXIgdG8gYSBibGFuayBzdGF0ZSwgcmVhZHkgdG8gcGFyc2UgYSBuZXcgSFRNTCBkb2N1bWVudFxuXHRQYXJzZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gUGFyc2VyJHJlc2V0ICgpIHtcblx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdHRoaXMuX2RvbmUgPSBmYWxzZTtcblx0XHR0aGlzLl9lbGVtZW50cyA9IFtdO1xuXHRcdHRoaXMuX2VsZW1lbnRzQ3VycmVudCA9IDA7XG5cdFx0dGhpcy5fY3VycmVudCA9IDA7XG5cdFx0dGhpcy5fbmV4dCA9IDA7XG5cdFx0dGhpcy5fbG9jYXRpb24gPSB7XG5cdFx0XHQgIHJvdzogMFxuXHRcdFx0LCBjb2w6IDBcblx0XHRcdCwgY2hhck9mZnNldDogMFxuXHRcdFx0LCBpbkJ1ZmZlcjogMFxuXHRcdH07XG5cdFx0dGhpcy5fcGFyc2VTdGF0ZSA9IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0dGhpcy5fcHJldlRhZ1NlcCA9ICcnO1xuXHRcdHRoaXMuX3RhZ1N0YWNrID0gW107XG5cdFx0dGhpcy5faGFuZGxlci5yZXNldCgpO1xuXHR9XG5cdFxuXHQvLyoqUHJpdmF0ZSoqLy9cblx0Ly9Qcm9wZXJ0aWVzLy9cblx0UGFyc2VyLnByb3RvdHlwZS5fb3B0aW9ucyA9IG51bGw7IC8vUGFyc2VyIG9wdGlvbnMgZm9yIGhvdyB0byBiZWhhdmVcblx0UGFyc2VyLnByb3RvdHlwZS5faGFuZGxlciA9IG51bGw7IC8vSGFuZGxlciBmb3IgcGFyc2VkIGVsZW1lbnRzXG5cdFBhcnNlci5wcm90b3R5cGUuX2J1ZmZlciA9IG51bGw7IC8vQnVmZmVyIG9mIHVucGFyc2VkIGRhdGFcblx0UGFyc2VyLnByb3RvdHlwZS5fZG9uZSA9IGZhbHNlOyAvL0ZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHBhcnNpbmcgaXMgZG9uZVxuXHRQYXJzZXIucHJvdG90eXBlLl9lbGVtZW50cyA9ICBudWxsOyAvL0FycmF5IG9mIHBhcnNlZCBlbGVtZW50c1xuXHRQYXJzZXIucHJvdG90eXBlLl9lbGVtZW50c0N1cnJlbnQgPSAwOyAvL1BvaW50ZXIgdG8gbGFzdCBlbGVtZW50IGluIF9lbGVtZW50cyB0aGF0IGhhcyBiZWVuIHByb2Nlc3NlZFxuXHRQYXJzZXIucHJvdG90eXBlLl9jdXJyZW50ID0gMDsgLy9Qb3NpdGlvbiBpbiBkYXRhIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBwYXJzZWRcblx0UGFyc2VyLnByb3RvdHlwZS5fbmV4dCA9IDA7IC8vUG9zaXRpb24gaW4gZGF0YSBvZiB0aGUgbmV4dCB0YWcgbWFya2VyICg8Pilcblx0UGFyc2VyLnByb3RvdHlwZS5fbG9jYXRpb24gPSBudWxsOyAvL1Bvc2l0aW9uIHRyYWNraW5nIGZvciBlbGVtZW50cyBpbiBhIHN0cmVhbVxuXHRQYXJzZXIucHJvdG90eXBlLl9wYXJzZVN0YXRlID0gRWxlbWVudFR5cGUuVGV4dDsgLy9DdXJyZW50IHR5cGUgb2YgZWxlbWVudCBiZWluZyBwYXJzZWRcblx0UGFyc2VyLnByb3RvdHlwZS5fcHJldlRhZ1NlcCA9ICcnOyAvL1ByZXZpb3VzIHRhZyBtYXJrZXIgZm91bmRcblx0Ly9TdGFjayBvZiBlbGVtZW50IHR5cGVzIHByZXZpb3VzbHkgZW5jb3VudGVyZWQ7IGtlZXBzIHRyYWNrIG9mIHdoZW5cblx0Ly9wYXJzaW5nIG9jY3VycyBpbnNpZGUgYSBzY3JpcHQvY29tbWVudC9zdHlsZSB0YWdcblx0UGFyc2VyLnByb3RvdHlwZS5fdGFnU3RhY2sgPSBudWxsO1xuXG5cdC8vTWV0aG9kcy8vXG5cdC8vVGFrZXMgYW4gYXJyYXkgb2YgZWxlbWVudHMgYW5kIHBhcnNlcyBhbnkgZm91bmQgYXR0cmlidXRlc1xuXHRQYXJzZXIucHJvdG90eXBlLnBhcnNlVGFnQXR0cmlicyA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZVRhZ0F0dHJpYnMgKGVsZW1lbnRzKSB7XG5cdFx0dmFyIGlkeEVuZCA9IGVsZW1lbnRzLmxlbmd0aDtcblx0XHR2YXIgaWR4ID0gMDtcblx0XG5cdFx0d2hpbGUgKGlkeCA8IGlkeEVuZCkge1xuXHRcdFx0dmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpZHgrK107XG5cdFx0XHRpZiAoZWxlbWVudC50eXBlID09IEVsZW1lbnRUeXBlLlRhZyB8fCBlbGVtZW50LnR5cGUgPT0gRWxlbWVudFR5cGUuU2NyaXB0IHx8IGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5zdHlsZSlcblx0XHRcdFx0dGhpcy5wYXJzZUF0dHJpYnMoZWxlbWVudCk7XG5cdFx0fVxuXHRcblx0XHRyZXR1cm4oZWxlbWVudHMpO1xuXHR9XG5cblx0Ly9UYWtlcyBhbiBlbGVtZW50IGFuZCBhZGRzIGFuIFwiYXR0cmlic1wiIHByb3BlcnR5IGZvciBhbnkgZWxlbWVudCBhdHRyaWJ1dGVzIGZvdW5kIFxuXHRQYXJzZXIucHJvdG90eXBlLnBhcnNlQXR0cmlicyA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZUF0dHJpYnMgKGVsZW1lbnQpIHtcblx0XHQvL09ubHkgcGFyc2UgYXR0cmlidXRlcyBmb3IgdGFnc1xuXHRcdGlmIChlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuU2NyaXB0ICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5TdHlsZSAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuVGFnKVxuXHRcdFx0cmV0dXJuO1xuXHRcblx0XHR2YXIgdGFnTmFtZSA9IGVsZW1lbnQuZGF0YS5zcGxpdChQYXJzZXIuX3JlV2hpdGVzcGFjZSwgMSlbMF07XG5cdFx0dmFyIGF0dHJpYlJhdyA9IGVsZW1lbnQuZGF0YS5zdWJzdHJpbmcodGFnTmFtZS5sZW5ndGgpO1xuXHRcdGlmIChhdHRyaWJSYXcubGVuZ3RoIDwgMSlcblx0XHRcdHJldHVybjtcblx0XG5cdFx0dmFyIG1hdGNoO1xuXHRcdFBhcnNlci5fcmVBdHRyaWIubGFzdEluZGV4ID0gMDtcblx0XHR3aGlsZSAobWF0Y2ggPSBQYXJzZXIuX3JlQXR0cmliLmV4ZWMoYXR0cmliUmF3KSkge1xuXHRcdFx0aWYgKGVsZW1lbnQuYXR0cmlicyA9PSB1bmRlZmluZWQpXG5cdFx0XHRcdGVsZW1lbnQuYXR0cmlicyA9IHt9O1xuXHRcblx0XHRcdGlmICh0eXBlb2YgbWF0Y2hbMV0gPT0gXCJzdHJpbmdcIiAmJiBtYXRjaFsxXS5sZW5ndGgpIHtcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzW21hdGNoWzFdXSA9IG1hdGNoWzJdO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgbWF0Y2hbM10gPT0gXCJzdHJpbmdcIiAmJiBtYXRjaFszXS5sZW5ndGgpIHtcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzW21hdGNoWzNdLnRvU3RyaW5nKCldID0gbWF0Y2hbNF0udG9TdHJpbmcoKTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIG1hdGNoWzVdID09IFwic3RyaW5nXCIgJiYgbWF0Y2hbNV0ubGVuZ3RoKSB7XG5cdFx0XHRcdGVsZW1lbnQuYXR0cmlic1ttYXRjaFs1XV0gPSBtYXRjaFs2XTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIG1hdGNoWzddID09IFwic3RyaW5nXCIgJiYgbWF0Y2hbN10ubGVuZ3RoKSB7XG5cdFx0XHRcdGVsZW1lbnQuYXR0cmlic1ttYXRjaFs3XV0gPSBtYXRjaFs3XTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvL0V4dHJhY3RzIHRoZSBiYXNlIHRhZyBuYW1lIGZyb20gdGhlIGRhdGEgdmFsdWUgb2YgYW4gZWxlbWVudFxuXHRQYXJzZXIucHJvdG90eXBlLnBhcnNlVGFnTmFtZSA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZVRhZ05hbWUgKGRhdGEpIHtcblx0XHRpZiAoZGF0YSA9PSBudWxsIHx8IGRhdGEgPT0gXCJcIilcblx0XHRcdHJldHVybihcIlwiKTtcblx0XHR2YXIgbWF0Y2ggPSBQYXJzZXIuX3JlVGFnTmFtZS5leGVjKGRhdGEpO1xuXHRcdGlmICghbWF0Y2gpXG5cdFx0XHRyZXR1cm4oXCJcIik7XG5cdFx0cmV0dXJuKChtYXRjaFsxXSA/IFwiL1wiIDogXCJcIikgKyBtYXRjaFsyXSk7XG5cdH1cblxuXHQvL1BhcnNlcyB0aHJvdWdoIEhUTUwgdGV4dCBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBmb3VuZCBlbGVtZW50c1xuXHQvL0kgYWRtaXQsIHRoaXMgZnVuY3Rpb24gaXMgcmF0aGVyIGxhcmdlIGJ1dCBzcGxpdHRpbmcgdXAgaGFkIGFuIG5vdGljZWFibGUgaW1wYWN0IG9uIHNwZWVkXG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VUYWdzID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlVGFncyAoKSB7XG5cdFx0dmFyIGJ1ZmZlckVuZCA9IHRoaXMuX2J1ZmZlci5sZW5ndGggLSAxO1xuXHRcdHdoaWxlIChQYXJzZXIuX3JlVGFncy50ZXN0KHRoaXMuX2J1ZmZlcikpIHtcblx0XHRcdHRoaXMuX25leHQgPSBQYXJzZXIuX3JlVGFncy5sYXN0SW5kZXggLSAxO1xuXHRcdFx0dmFyIHRhZ1NlcCA9IHRoaXMuX2J1ZmZlci5jaGFyQXQodGhpcy5fbmV4dCk7IC8vVGhlIGN1cnJlbnRseSBmb3VuZCB0YWcgbWFya2VyXG5cdFx0XHR2YXIgcmF3RGF0YSA9IHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fY3VycmVudCwgdGhpcy5fbmV4dCk7IC8vVGhlIG5leHQgY2h1bmsgb2YgZGF0YSB0byBwYXJzZVxuXHRcblx0XHRcdC8vQSBuZXcgZWxlbWVudCB0byBldmVudHVhbGx5IGJlIGFwcGVuZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdHZhciBlbGVtZW50ID0ge1xuXHRcdFx0XHQgIHJhdzogcmF3RGF0YVxuXHRcdFx0XHQsIGRhdGE6ICh0aGlzLl9wYXJzZVN0YXRlID09IEVsZW1lbnRUeXBlLlRleHQpID8gcmF3RGF0YSA6IHJhd0RhdGEucmVwbGFjZShQYXJzZXIuX3JlVHJpbSwgXCJcIilcblx0XHRcdFx0LCB0eXBlOiB0aGlzLl9wYXJzZVN0YXRlXG5cdFx0XHR9O1xuXHRcblx0XHRcdHZhciBlbGVtZW50TmFtZSA9IHRoaXMucGFyc2VUYWdOYW1lKGVsZW1lbnQuZGF0YSk7XG5cdFxuXHRcdFx0Ly9UaGlzIHNlY3Rpb24gaW5zcGVjdHMgdGhlIGN1cnJlbnQgdGFnIHN0YWNrIGFuZCBtb2RpZmllcyB0aGUgY3VycmVudFxuXHRcdFx0Ly9lbGVtZW50IGlmIHdlJ3JlIGFjdHVhbGx5IHBhcnNpbmcgYSBzcGVjaWFsIGFyZWEgKHNjcmlwdC9jb21tZW50L3N0eWxlIHRhZylcblx0XHRcdGlmICh0aGlzLl90YWdTdGFjay5sZW5ndGgpIHsgLy9XZSdyZSBwYXJzaW5nIGluc2lkZSBhIHNjcmlwdC9jb21tZW50L3N0eWxlIHRhZ1xuXHRcdFx0XHRpZiAodGhpcy5fdGFnU3RhY2tbdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMV0gPT0gRWxlbWVudFR5cGUuU2NyaXB0KSB7IC8vV2UncmUgY3VycmVudGx5IGluIGEgc2NyaXB0IHRhZ1xuXHRcdFx0XHRcdGlmIChlbGVtZW50TmFtZS50b0xvd2VyQ2FzZSgpID09IFwiL3NjcmlwdFwiKSAvL0FjdHVhbGx5LCB3ZSdyZSBubyBsb25nZXIgaW4gYSBzY3JpcHQgdGFnLCBzbyBwb3AgaXQgb2ZmIHRoZSBzdGFja1xuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucG9wKCk7XG5cdFx0XHRcdFx0ZWxzZSB7IC8vTm90IGEgY2xvc2luZyBzY3JpcHQgdGFnXG5cdFx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuaW5kZXhPZihcIiEtLVwiKSAhPSAwKSB7IC8vTWFrZSBzdXJlIHdlJ3JlIG5vdCBpbiBhIGNvbW1lbnRcblx0XHRcdFx0XHRcdFx0Ly9BbGwgZGF0YSBmcm9tIGhlcmUgdG8gc2NyaXB0IGNsb3NlIGlzIG5vdyBhIHRleHQgZWxlbWVudFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdFx0XHRcdFx0XHQvL0lmIHRoZSBwcmV2aW91cyBlbGVtZW50IGlzIHRleHQsIGFwcGVuZCB0aGUgY3VycmVudCB0ZXh0IHRvIGl0XG5cdFx0XHRcdFx0XHRcdGlmICh0aGlzLl9lbGVtZW50cy5sZW5ndGggJiYgdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBFbGVtZW50VHlwZS5UZXh0KSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIHByZXZFbGVtZW50ID0gdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0XHRcdFx0cHJldkVsZW1lbnQucmF3ID0gcHJldkVsZW1lbnQuZGF0YSA9IHByZXZFbGVtZW50LnJhdyArIHRoaXMuX3ByZXZUYWdTZXAgKyBlbGVtZW50LnJhdztcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IFwiXCI7IC8vVGhpcyBjYXVzZXMgdGhlIGN1cnJlbnQgZWxlbWVudCB0byBub3QgYmUgYWRkZWQgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKHRoaXMuX3RhZ1N0YWNrW3RoaXMuX3RhZ1N0YWNrLmxlbmd0aCAtIDFdID09IEVsZW1lbnRUeXBlLlN0eWxlKSB7IC8vV2UncmUgY3VycmVudGx5IGluIGEgc3R5bGUgdGFnXG5cdFx0XHRcdFx0aWYgKGVsZW1lbnROYW1lLnRvTG93ZXJDYXNlKCkgPT0gXCIvc3R5bGVcIikgLy9BY3R1YWxseSwgd2UncmUgbm8gbG9uZ2VyIGluIGEgc3R5bGUgdGFnLCBzbyBwb3AgaXQgb2ZmIHRoZSBzdGFja1xuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucG9wKCk7XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuaW5kZXhPZihcIiEtLVwiKSAhPSAwKSB7IC8vTWFrZSBzdXJlIHdlJ3JlIG5vdCBpbiBhIGNvbW1lbnRcblx0XHRcdFx0XHRcdFx0Ly9BbGwgZGF0YSBmcm9tIGhlcmUgdG8gc3R5bGUgY2xvc2UgaXMgbm93IGEgdGV4dCBlbGVtZW50XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0XHRcdFx0XHRcdC8vSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaXMgdGV4dCwgYXBwZW5kIHRoZSBjdXJyZW50IHRleHQgdG8gaXRcblx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IEVsZW1lbnRUeXBlLlRleHQpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgcHJldkVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXTtcblx0XHRcdFx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcgIT0gXCJcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0cHJldkVsZW1lbnQucmF3ID0gcHJldkVsZW1lbnQuZGF0YSA9IHByZXZFbGVtZW50LnJhdyArIHRoaXMuX3ByZXZUYWdTZXAgKyBlbGVtZW50LnJhdztcblx0XHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gXCJcIjsgLy9UaGlzIGNhdXNlcyB0aGUgY3VycmVudCBlbGVtZW50IHRvIG5vdCBiZSBhZGRlZCB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHsgLy9FbGVtZW50IGlzIGVtcHR5LCBzbyBqdXN0IGFwcGVuZCB0aGUgbGFzdCB0YWcgbWFya2VyIGZvdW5kXG5cdFx0XHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gcHJldkVsZW1lbnQucmF3ICsgdGhpcy5fcHJldlRhZ1NlcDtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7IC8vVGhlIHByZXZpb3VzIGVsZW1lbnQgd2FzIG5vdCB0ZXh0XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGVsZW1lbnQucmF3ICE9IFwiXCIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gZWxlbWVudC5yYXc7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKHRoaXMuX3RhZ1N0YWNrW3RoaXMuX3RhZ1N0YWNrLmxlbmd0aCAtIDFdID09IEVsZW1lbnRUeXBlLkNvbW1lbnQpIHsgLy9XZSdyZSBjdXJyZW50bHkgaW4gYSBjb21tZW50IHRhZ1xuXHRcdFx0XHRcdHZhciByYXdMZW4gPSBlbGVtZW50LnJhdy5sZW5ndGg7XG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQucmF3LmNoYXJBdChyYXdMZW4gLSAyKSA9PSBcIi1cIiAmJiBlbGVtZW50LnJhdy5jaGFyQXQocmF3TGVuIC0gMSkgPT0gXCItXCIgJiYgdGFnU2VwID09IFwiPlwiKSB7XG5cdFx0XHRcdFx0XHQvL0FjdHVhbGx5LCB3ZSdyZSBubyBsb25nZXIgaW4gYSBzdHlsZSB0YWcsIHNvIHBvcCBpdCBvZmYgdGhlIHN0YWNrXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wb3AoKTtcblx0XHRcdFx0XHRcdC8vSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaXMgYSBjb21tZW50LCBhcHBlbmQgdGhlIGN1cnJlbnQgdGV4dCB0byBpdFxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IEVsZW1lbnRUeXBlLkNvbW1lbnQpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHByZXZFbGVtZW50ID0gdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0XHRcdHByZXZFbGVtZW50LnJhdyA9IHByZXZFbGVtZW50LmRhdGEgPSAocHJldkVsZW1lbnQucmF3ICsgZWxlbWVudC5yYXcpLnJlcGxhY2UoUGFyc2VyLl9yZVRyaW1Db21tZW50LCBcIlwiKTtcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBcIlwiOyAvL1RoaXMgY2F1c2VzIHRoZSBjdXJyZW50IGVsZW1lbnQgdG8gbm90IGJlIGFkZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2UgLy9QcmV2aW91cyBlbGVtZW50IG5vdCBhIGNvbW1lbnRcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuQ29tbWVudDsgLy9DaGFuZ2UgdGhlIGN1cnJlbnQgZWxlbWVudCdzIHR5cGUgdG8gYSBjb21tZW50XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgeyAvL1N0aWxsIGluIGEgY29tbWVudCB0YWdcblx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLkNvbW1lbnQ7XG5cdFx0XHRcdFx0XHQvL0lmIHRoZSBwcmV2aW91cyBlbGVtZW50IGlzIGEgY29tbWVudCwgYXBwZW5kIHRoZSBjdXJyZW50IHRleHQgdG8gaXRcblx0XHRcdFx0XHRcdGlmICh0aGlzLl9lbGVtZW50cy5sZW5ndGggJiYgdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBFbGVtZW50VHlwZS5Db21tZW50KSB7XG5cdFx0XHRcdFx0XHRcdHZhciBwcmV2RWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gcHJldkVsZW1lbnQucmF3ICsgZWxlbWVudC5yYXcgKyB0YWdTZXA7XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gXCJcIjsgLy9UaGlzIGNhdXNlcyB0aGUgY3VycmVudCBlbGVtZW50IHRvIG5vdCBiZSBhZGRlZCB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gZWxlbWVudC5yYXcgKyB0YWdTZXA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFxuXHRcdFx0Ly9Qcm9jZXNzaW5nIG9mIG5vbi1zcGVjaWFsIHRhZ3Ncblx0XHRcdGlmIChlbGVtZW50LnR5cGUgPT0gRWxlbWVudFR5cGUuVGFnKSB7XG5cdFx0XHRcdGVsZW1lbnQubmFtZSA9IGVsZW1lbnROYW1lO1xuXHRcdFx0XHR2YXIgZWxlbWVudE5hbWVDSSA9IGVsZW1lbnROYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuaW5kZXhPZihcIiEtLVwiKSA9PSAwKSB7IC8vVGhpcyB0YWcgaXMgcmVhbGx5IGNvbW1lbnRcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5Db21tZW50O1xuXHRcdFx0XHRcdGRlbGV0ZSBlbGVtZW50W1wibmFtZVwiXTtcblx0XHRcdFx0XHR2YXIgcmF3TGVuID0gZWxlbWVudC5yYXcubGVuZ3RoO1xuXHRcdFx0XHRcdC8vQ2hlY2sgaWYgdGhlIGNvbW1lbnQgaXMgdGVybWluYXRlZCBpbiB0aGUgY3VycmVudCBlbGVtZW50XG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQucmF3LmNoYXJBdChyYXdMZW4gLSAxKSA9PSBcIi1cIiAmJiBlbGVtZW50LnJhdy5jaGFyQXQocmF3TGVuIC0gMikgPT0gXCItXCIgJiYgdGFnU2VwID09IFwiPlwiKVxuXHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBlbGVtZW50LnJhdy5yZXBsYWNlKFBhcnNlci5fcmVUcmltQ29tbWVudCwgXCJcIik7XG5cdFx0XHRcdFx0ZWxzZSB7IC8vSXQncyBub3Qgc28gcHVzaCB0aGUgY29tbWVudCBvbnRvIHRoZSB0YWcgc3RhY2tcblx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ICs9IHRhZ1NlcDtcblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnB1c2goRWxlbWVudFR5cGUuQ29tbWVudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGVsZW1lbnQucmF3LmluZGV4T2YoXCIhXCIpID09IDAgfHwgZWxlbWVudC5yYXcuaW5kZXhPZihcIj9cIikgPT0gMCkge1xuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLkRpcmVjdGl2ZTtcblx0XHRcdFx0XHQvL1RPRE86IHdoYXQgYWJvdXQgQ0RBVEE/XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudE5hbWVDSSA9PSBcInNjcmlwdFwiKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuU2NyaXB0O1xuXHRcdFx0XHRcdC8vU3BlY2lhbCB0YWcsIHB1c2ggb250byB0aGUgdGFnIHN0YWNrIGlmIG5vdCB0ZXJtaW5hdGVkXG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQuZGF0YS5jaGFyQXQoZWxlbWVudC5kYXRhLmxlbmd0aCAtIDEpICE9IFwiL1wiKVxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChFbGVtZW50VHlwZS5TY3JpcHQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGVsZW1lbnROYW1lQ0kgPT0gXCIvc2NyaXB0XCIpXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuU2NyaXB0O1xuXHRcdFx0XHRlbHNlIGlmIChlbGVtZW50TmFtZUNJID09IFwic3R5bGVcIikge1xuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlN0eWxlO1xuXHRcdFx0XHRcdC8vU3BlY2lhbCB0YWcsIHB1c2ggb250byB0aGUgdGFnIHN0YWNrIGlmIG5vdCB0ZXJtaW5hdGVkXG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQuZGF0YS5jaGFyQXQoZWxlbWVudC5kYXRhLmxlbmd0aCAtIDEpICE9IFwiL1wiKVxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChFbGVtZW50VHlwZS5TdHlsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudE5hbWVDSSA9PSBcIi9zdHlsZVwiKVxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlN0eWxlO1xuXHRcdFx0XHRpZiAoZWxlbWVudC5uYW1lICYmIGVsZW1lbnQubmFtZS5jaGFyQXQoMCkgPT0gXCIvXCIpXG5cdFx0XHRcdFx0ZWxlbWVudC5kYXRhID0gZWxlbWVudC5uYW1lO1xuXHRcdFx0fVxuXHRcblx0XHRcdC8vQWRkIGFsbCB0YWdzIGFuZCBub24tZW1wdHkgdGV4dCBlbGVtZW50cyB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHRpZiAoZWxlbWVudC5yYXcgIT0gXCJcIiB8fCBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuVGV4dCkge1xuXHRcdFx0XHRpZiAodGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24gJiYgIWVsZW1lbnQubG9jYXRpb24pIHtcblx0XHRcdFx0XHRlbGVtZW50LmxvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbihlbGVtZW50LnR5cGUgPT0gRWxlbWVudFR5cGUuVGFnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLnBhcnNlQXR0cmlicyhlbGVtZW50KTtcblx0XHRcdFx0dGhpcy5fZWxlbWVudHMucHVzaChlbGVtZW50KTtcblx0XHRcdFx0Ly9JZiB0YWcgc2VsZi10ZXJtaW5hdGVzLCBhZGQgYW4gZXhwbGljaXQsIHNlcGFyYXRlIGNsb3NpbmcgdGFnXG5cdFx0XHRcdGlmIChcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuVGV4dFxuXHRcdFx0XHRcdCYmXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkNvbW1lbnRcblx0XHRcdFx0XHQmJlxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5EaXJlY3RpdmVcblx0XHRcdFx0XHQmJlxuXHRcdFx0XHRcdGVsZW1lbnQuZGF0YS5jaGFyQXQoZWxlbWVudC5kYXRhLmxlbmd0aCAtIDEpID09IFwiL1wiXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHRcdHRoaXMuX2VsZW1lbnRzLnB1c2goe1xuXHRcdFx0XHRcdFx0ICByYXc6IFwiL1wiICsgZWxlbWVudC5uYW1lXG5cdFx0XHRcdFx0XHQsIGRhdGE6IFwiL1wiICsgZWxlbWVudC5uYW1lXG5cdFx0XHRcdFx0XHQsIG5hbWU6IFwiL1wiICsgZWxlbWVudC5uYW1lXG5cdFx0XHRcdFx0XHQsIHR5cGU6IGVsZW1lbnQudHlwZVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fcGFyc2VTdGF0ZSA9ICh0YWdTZXAgPT0gXCI8XCIpID8gRWxlbWVudFR5cGUuVGFnIDogRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9uZXh0ICsgMTtcblx0XHRcdHRoaXMuX3ByZXZUYWdTZXAgPSB0YWdTZXA7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX29wdGlvbnMuaW5jbHVkZUxvY2F0aW9uKSB7XG5cdFx0XHR0aGlzLmdldExvY2F0aW9uKCk7XG5cdFx0XHR0aGlzLl9sb2NhdGlvbi5yb3cgKz0gdGhpcy5fbG9jYXRpb24uaW5CdWZmZXI7XG5cdFx0XHR0aGlzLl9sb2NhdGlvbi5pbkJ1ZmZlciA9IDA7XG5cdFx0XHR0aGlzLl9sb2NhdGlvbi5jaGFyT2Zmc2V0ID0gMDtcblx0XHR9XG5cdFx0dGhpcy5fYnVmZmVyID0gKHRoaXMuX2N1cnJlbnQgPD0gYnVmZmVyRW5kKSA/IHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fY3VycmVudCkgOiBcIlwiO1xuXHRcdHRoaXMuX2N1cnJlbnQgPSAwO1xuXHRcblx0XHR0aGlzLndyaXRlSGFuZGxlcigpO1xuXHR9XG5cblx0UGFyc2VyLnByb3RvdHlwZS5nZXRMb2NhdGlvbiA9IGZ1bmN0aW9uIFBhcnNlciRnZXRMb2NhdGlvbiAoc3RhcnRUYWcpIHtcblx0XHR2YXIgYyxcblx0XHRcdGwgPSB0aGlzLl9sb2NhdGlvbixcblx0XHRcdGVuZCA9IHRoaXMuX2N1cnJlbnQgLSAoc3RhcnRUYWcgPyAxIDogMCksXG5cdFx0XHRjaHVuayA9IHN0YXJ0VGFnICYmIGwuY2hhck9mZnNldCA9PSAwICYmIHRoaXMuX2N1cnJlbnQgPT0gMDtcblx0XHRcblx0XHRmb3IgKDsgbC5jaGFyT2Zmc2V0IDwgZW5kOyBsLmNoYXJPZmZzZXQrKykge1xuXHRcdFx0YyA9IHRoaXMuX2J1ZmZlci5jaGFyQXQobC5jaGFyT2Zmc2V0KTtcblx0XHRcdGlmIChjID09ICdcXG4nKSB7XG5cdFx0XHRcdGwuaW5CdWZmZXIrKztcblx0XHRcdFx0bC5jb2wgPSAwO1xuXHRcdFx0fSBlbHNlIGlmIChjICE9ICdcXHInKSB7XG5cdFx0XHRcdGwuY29sKys7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHQgIGxpbmU6IGwucm93ICsgbC5pbkJ1ZmZlciArIDFcblx0XHRcdCwgY29sOiBsLmNvbCArIChjaHVuayA/IDA6IDEpXG5cdFx0fTtcblx0fVxuXG5cdC8vQ2hlY2tzIHRoZSBoYW5kbGVyIHRvIG1ha2UgaXQgaXMgYW4gb2JqZWN0IHdpdGggdGhlIHJpZ2h0IFwiaW50ZXJmYWNlXCJcblx0UGFyc2VyLnByb3RvdHlwZS52YWxpZGF0ZUhhbmRsZXIgPSBmdW5jdGlvbiBQYXJzZXIkdmFsaWRhdGVIYW5kbGVyIChoYW5kbGVyKSB7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlcikgIT0gXCJvYmplY3RcIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgaXMgbm90IGFuIG9iamVjdFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLnJlc2V0KSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAncmVzZXQnIGlzIGludmFsaWRcIik7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlci5kb25lKSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAnZG9uZScgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlVGFnKSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAnd3JpdGVUYWcnIGlzIGludmFsaWRcIik7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlci53cml0ZVRleHQpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICd3cml0ZVRleHQnIGlzIGludmFsaWRcIik7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlci53cml0ZUNvbW1lbnQpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICd3cml0ZUNvbW1lbnQnIGlzIGludmFsaWRcIik7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlci53cml0ZURpcmVjdGl2ZSkgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ3dyaXRlRGlyZWN0aXZlJyBpcyBpbnZhbGlkXCIpO1xuXHR9XG5cblx0Ly9Xcml0ZXMgcGFyc2VkIGVsZW1lbnRzIG91dCB0byB0aGUgaGFuZGxlclxuXHRQYXJzZXIucHJvdG90eXBlLndyaXRlSGFuZGxlciA9IGZ1bmN0aW9uIFBhcnNlciR3cml0ZUhhbmRsZXIgKGZvcmNlRmx1c2gpIHtcblx0XHRmb3JjZUZsdXNoID0gISFmb3JjZUZsdXNoO1xuXHRcdGlmICh0aGlzLl90YWdTdGFjay5sZW5ndGggJiYgIWZvcmNlRmx1c2gpXG5cdFx0XHRyZXR1cm47XG5cdFx0d2hpbGUgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0dmFyIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50cy5zaGlmdCgpO1xuXHRcdFx0c3dpdGNoIChlbGVtZW50LnR5cGUpIHtcblx0XHRcdFx0Y2FzZSBFbGVtZW50VHlwZS5Db21tZW50OlxuXHRcdFx0XHRcdHRoaXMuX2hhbmRsZXIud3JpdGVDb21tZW50KGVsZW1lbnQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIEVsZW1lbnRUeXBlLkRpcmVjdGl2ZTpcblx0XHRcdFx0XHR0aGlzLl9oYW5kbGVyLndyaXRlRGlyZWN0aXZlKGVsZW1lbnQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIEVsZW1lbnRUeXBlLlRleHQ6XG5cdFx0XHRcdFx0dGhpcy5faGFuZGxlci53cml0ZVRleHQoZWxlbWVudCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0dGhpcy5faGFuZGxlci53cml0ZVRhZyhlbGVtZW50KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRQYXJzZXIucHJvdG90eXBlLmhhbmRsZUVycm9yID0gZnVuY3Rpb24gUGFyc2VyJGhhbmRsZUVycm9yIChlcnJvcikge1xuXHRcdGlmICgodHlwZW9mIHRoaXMuX2hhbmRsZXIuZXJyb3IpID09IFwiZnVuY3Rpb25cIilcblx0XHRcdHRoaXMuX2hhbmRsZXIuZXJyb3IoZXJyb3IpO1xuXHRcdGVsc2Vcblx0XHRcdHRocm93IGVycm9yO1xuXHR9XG5cbi8vVE9ETzogbWFrZSB0aGlzIGEgdHJ1bGx5IHN0cmVhbWFibGUgaGFuZGxlclxuZnVuY3Rpb24gUnNzSGFuZGxlciAoY2FsbGJhY2spIHtcblx0UnNzSGFuZGxlci5zdXBlcl8uY2FsbCh0aGlzLCBjYWxsYmFjaywgeyBpZ25vcmVXaGl0ZXNwYWNlOiB0cnVlLCB2ZXJib3NlOiBmYWxzZSwgZW5mb3JjZUVtcHR5VGFnczogZmFsc2UgfSk7XG59XG5pbmhlcml0cyhSc3NIYW5kbGVyLCBEZWZhdWx0SGFuZGxlcik7XG5cblx0UnNzSGFuZGxlci5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIFJzc0hhbmRsZXIkZG9uZSAoKSB7XG5cdFx0dmFyIGZlZWQgPSB7IH07XG5cdFx0dmFyIGZlZWRSb290O1xuXG5cdFx0dmFyIGZvdW5kID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoZnVuY3Rpb24gKHZhbHVlKSB7IHJldHVybih2YWx1ZSA9PSBcInJzc1wiIHx8IHZhbHVlID09IFwiZmVlZFwiKTsgfSwgdGhpcy5kb20sIGZhbHNlKTtcblx0XHRpZiAoZm91bmQubGVuZ3RoKSB7XG5cdFx0XHRmZWVkUm9vdCA9IGZvdW5kWzBdO1xuXHRcdH1cblx0XHRpZiAoZmVlZFJvb3QpIHtcblx0XHRcdGlmIChmZWVkUm9vdC5uYW1lID09IFwicnNzXCIpIHtcblx0XHRcdFx0ZmVlZC50eXBlID0gXCJyc3NcIjtcblx0XHRcdFx0ZmVlZFJvb3QgPSBmZWVkUm9vdC5jaGlsZHJlblswXTsgLy88Y2hhbm5lbC8+XG5cdFx0XHRcdGZlZWQuaWQgPSBcIlwiO1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQudGl0bGUgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRpdGxlXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQubGluayA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGlua1wiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLmRlc2NyaXB0aW9uID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJkZXNjcmlwdGlvblwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLnVwZGF0ZWQgPSBuZXcgRGF0ZShEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImxhc3RCdWlsZERhdGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhKTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQuYXV0aG9yID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJtYW5hZ2luZ0VkaXRvclwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0ZmVlZC5pdGVtcyA9IFtdO1xuXHRcdFx0XHREb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcIml0ZW1cIiwgZmVlZFJvb3QuY2hpbGRyZW4pLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0sIGluZGV4LCBsaXN0KSB7XG5cdFx0XHRcdFx0dmFyIGVudHJ5ID0ge307XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LmlkID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJndWlkXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkudGl0bGUgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRpdGxlXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkubGluayA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGlua1wiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LmRlc2NyaXB0aW9uID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJkZXNjcmlwdGlvblwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LnB1YkRhdGUgPSBuZXcgRGF0ZShEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInB1YkRhdGVcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGEpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHRmZWVkLml0ZW1zLnB1c2goZW50cnkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZlZWQudHlwZSA9IFwiYXRvbVwiO1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQuaWQgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImlkXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQudGl0bGUgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRpdGxlXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQubGluayA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGlua1wiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmF0dHJpYnMuaHJlZjtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQuZGVzY3JpcHRpb24gPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN1YnRpdGxlXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQudXBkYXRlZCA9IG5ldyBEYXRlKERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidXBkYXRlZFwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGEpO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5hdXRob3IgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImVtYWlsXCIsIGZlZWRSb290LmNoaWxkcmVuLCB0cnVlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdGZlZWQuaXRlbXMgPSBbXTtcblx0XHRcdFx0RG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJlbnRyeVwiLCBmZWVkUm9vdC5jaGlsZHJlbikuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdFx0XHR2YXIgZW50cnkgPSB7fTtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkuaWQgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImlkXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkudGl0bGUgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRpdGxlXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkubGluayA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGlua1wiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uYXR0cmlicy5ocmVmO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkuZGVzY3JpcHRpb24gPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN1bW1hcnlcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5wdWJEYXRlID0gbmV3IERhdGUoRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ1cGRhdGVkXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhKTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0ZmVlZC5pdGVtcy5wdXNoKGVudHJ5KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZG9tID0gZmVlZDtcblx0XHR9XG5cdFx0UnNzSGFuZGxlci5zdXBlcl8ucHJvdG90eXBlLmRvbmUuY2FsbCh0aGlzKTtcblx0fVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIgKGNhbGxiYWNrLCBvcHRpb25zKSB7XG5cdHRoaXMucmVzZXQoKTtcblx0dGhpcy5fb3B0aW9ucyA9IG9wdGlvbnMgPyBvcHRpb25zIDogeyB9O1xuXHRpZiAodGhpcy5fb3B0aW9ucy5pZ25vcmVXaGl0ZXNwYWNlID09IHVuZGVmaW5lZClcblx0XHR0aGlzLl9vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UgPSBmYWxzZTsgLy9LZWVwIHdoaXRlc3BhY2Utb25seSB0ZXh0IG5vZGVzXG5cdGlmICh0aGlzLl9vcHRpb25zLnZlcmJvc2UgPT0gdW5kZWZpbmVkKVxuXHRcdHRoaXMuX29wdGlvbnMudmVyYm9zZSA9IHRydWU7IC8vS2VlcCBkYXRhIHByb3BlcnR5IGZvciB0YWdzIGFuZCByYXcgcHJvcGVydHkgZm9yIGFsbFxuXHRpZiAodGhpcy5fb3B0aW9ucy5lbmZvcmNlRW1wdHlUYWdzID09IHVuZGVmaW5lZClcblx0XHR0aGlzLl9vcHRpb25zLmVuZm9yY2VFbXB0eVRhZ3MgPSB0cnVlOyAvL0Rvbid0IGFsbG93IGNoaWxkcmVuIGZvciBIVE1MIHRhZ3MgZGVmaW5lZCBhcyBlbXB0eSBpbiBzcGVjXG5cdGlmICgodHlwZW9mIGNhbGxiYWNrKSA9PSBcImZ1bmN0aW9uXCIpXG5cdFx0dGhpcy5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbn1cblxuXHQvLyoqXCJTdGF0aWNcIioqLy9cblx0Ly9IVE1MIFRhZ3MgdGhhdCBzaG91bGRuJ3QgY29udGFpbiBjaGlsZCBub2Rlc1xuXHREZWZhdWx0SGFuZGxlci5fZW1wdHlUYWdzID0ge1xuXHRcdCAgYXJlYTogMVxuXHRcdCwgYmFzZTogMVxuXHRcdCwgYmFzZWZvbnQ6IDFcblx0XHQsIGJyOiAxXG5cdFx0LCBjb2w6IDFcblx0XHQsIGZyYW1lOiAxXG5cdFx0LCBocjogMVxuXHRcdCwgaW1nOiAxXG5cdFx0LCBpbnB1dDogMVxuXHRcdCwgaXNpbmRleDogMVxuXHRcdCwgbGluazogMVxuXHRcdCwgbWV0YTogMVxuXHRcdCwgcGFyYW06IDFcblx0XHQsIGVtYmVkOiAxXG5cdH1cblx0Ly9SZWdleCB0byBkZXRlY3Qgd2hpdGVzcGFjZSBvbmx5IHRleHQgbm9kZXNcblx0RGVmYXVsdEhhbmRsZXIucmVXaGl0ZXNwYWNlID0gL15cXHMqJC87XG5cblx0Ly8qKlB1YmxpYyoqLy9cblx0Ly9Qcm9wZXJ0aWVzLy9cblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmRvbSA9IG51bGw7IC8vVGhlIGhpZXJhcmNoaWNhbCBvYmplY3QgY29udGFpbmluZyB0aGUgcGFyc2VkIEhUTUxcblx0Ly9NZXRob2RzLy9cblx0Ly9SZXNldHMgdGhlIGhhbmRsZXIgYmFjayB0byBzdGFydGluZyBzdGF0ZVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRyZXNldCgpIHtcblx0XHR0aGlzLmRvbSA9IFtdO1xuXHRcdHRoaXMuX2RvbmUgPSBmYWxzZTtcblx0XHR0aGlzLl90YWdTdGFjayA9IFtdO1xuXHRcdHRoaXMuX3RhZ1N0YWNrLmxhc3QgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRfdGFnU3RhY2skbGFzdCAoKSB7XG5cdFx0XHRyZXR1cm4odGhpcy5sZW5ndGggPyB0aGlzW3RoaXMubGVuZ3RoIC0gMV0gOiBudWxsKTtcblx0XHR9XG5cdH1cblx0Ly9TaWduYWxzIHRoZSBoYW5kbGVyIHRoYXQgcGFyc2luZyBpcyBkb25lXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkZG9uZSAoKSB7XG5cdFx0dGhpcy5fZG9uZSA9IHRydWU7XG5cdFx0dGhpcy5oYW5kbGVDYWxsYmFjayhudWxsKTtcblx0fVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVUYWcgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciR3cml0ZVRhZyAoZWxlbWVudCkge1xuXHRcdHRoaXMuaGFuZGxlRWxlbWVudChlbGVtZW50KTtcblx0fSBcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLndyaXRlVGV4dCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHdyaXRlVGV4dCAoZWxlbWVudCkge1xuXHRcdGlmICh0aGlzLl9vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UpXG5cdFx0XHRpZiAoRGVmYXVsdEhhbmRsZXIucmVXaGl0ZXNwYWNlLnRlc3QoZWxlbWVudC5kYXRhKSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdHRoaXMuaGFuZGxlRWxlbWVudChlbGVtZW50KTtcblx0fSBcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLndyaXRlQ29tbWVudCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHdyaXRlQ29tbWVudCAoZWxlbWVudCkge1xuXHRcdHRoaXMuaGFuZGxlRWxlbWVudChlbGVtZW50KTtcblx0fSBcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLndyaXRlRGlyZWN0aXZlID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkd3JpdGVEaXJlY3RpdmUgKGVsZW1lbnQpIHtcblx0XHR0aGlzLmhhbmRsZUVsZW1lbnQoZWxlbWVudCk7XG5cdH1cblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkZXJyb3IgKGVycm9yKSB7XG5cdFx0dGhpcy5oYW5kbGVDYWxsYmFjayhlcnJvcik7XG5cdH1cblxuXHQvLyoqUHJpdmF0ZSoqLy9cblx0Ly9Qcm9wZXJ0aWVzLy9cblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLl9vcHRpb25zID0gbnVsbDsgLy9IYW5kbGVyIG9wdGlvbnMgZm9yIGhvdyB0byBiZWhhdmVcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLl9jYWxsYmFjayA9IG51bGw7IC8vQ2FsbGJhY2sgdG8gcmVzcG9uZCB0byB3aGVuIHBhcnNpbmcgZG9uZVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuX2RvbmUgPSBmYWxzZTsgLy9GbGFnIGluZGljYXRpbmcgd2hldGhlciBoYW5kbGVyIGhhcyBiZWVuIG5vdGlmaWVkIG9mIHBhcnNpbmcgY29tcGxldGVkXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5fdGFnU3RhY2sgPSBudWxsOyAvL0xpc3Qgb2YgcGFyZW50cyB0byB0aGUgY3VycmVudGx5IGVsZW1lbnQgYmVpbmcgcHJvY2Vzc2VkXG5cdC8vTWV0aG9kcy8vXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5oYW5kbGVDYWxsYmFjayA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJGhhbmRsZUNhbGxiYWNrIChlcnJvcikge1xuXHRcdFx0aWYgKCh0eXBlb2YgdGhpcy5fY2FsbGJhY2spICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0aWYgKGVycm9yKVxuXHRcdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dGhpcy5fY2FsbGJhY2soZXJyb3IsIHRoaXMuZG9tKTtcblx0fVxuXHRcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmlzRW1wdHlUYWcgPSBmdW5jdGlvbihlbGVtZW50KSB7XG5cdFx0dmFyIG5hbWUgPSBlbGVtZW50Lm5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRpZiAobmFtZS5jaGFyQXQoMCkgPT0gJy8nKSB7XG5cdFx0XHRuYW1lID0gbmFtZS5zdWJzdHJpbmcoMSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9vcHRpb25zLmVuZm9yY2VFbXB0eVRhZ3MgJiYgISFEZWZhdWx0SGFuZGxlci5fZW1wdHlUYWdzW25hbWVdO1xuXHR9O1xuXHRcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmhhbmRsZUVsZW1lbnQgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRoYW5kbGVFbGVtZW50IChlbGVtZW50KSB7XG5cdFx0aWYgKHRoaXMuX2RvbmUpXG5cdFx0XHR0aGlzLmhhbmRsZUNhbGxiYWNrKG5ldyBFcnJvcihcIldyaXRpbmcgdG8gdGhlIGhhbmRsZXIgYWZ0ZXIgZG9uZSgpIGNhbGxlZCBpcyBub3QgYWxsb3dlZCB3aXRob3V0IGEgcmVzZXQoKVwiKSk7XG5cdFx0aWYgKCF0aGlzLl9vcHRpb25zLnZlcmJvc2UpIHtcbi8vXHRcdFx0ZWxlbWVudC5yYXcgPSBudWxsOyAvL0ZJWE1FOiBOb3QgY2xlYW5cblx0XHRcdC8vRklYTUU6IFNlcmlvdXMgcGVyZm9ybWFuY2UgcHJvYmxlbSB1c2luZyBkZWxldGVcblx0XHRcdGRlbGV0ZSBlbGVtZW50LnJhdztcblx0XHRcdGlmIChlbGVtZW50LnR5cGUgPT0gXCJ0YWdcIiB8fCBlbGVtZW50LnR5cGUgPT0gXCJzY3JpcHRcIiB8fCBlbGVtZW50LnR5cGUgPT0gXCJzdHlsZVwiKVxuXHRcdFx0XHRkZWxldGUgZWxlbWVudC5kYXRhO1xuXHRcdH1cblx0XHRpZiAoIXRoaXMuX3RhZ1N0YWNrLmxhc3QoKSkgeyAvL1RoZXJlIGFyZSBubyBwYXJlbnQgZWxlbWVudHNcblx0XHRcdC8vSWYgdGhlIGVsZW1lbnQgY2FuIGJlIGEgY29udGFpbmVyLCBhZGQgaXQgdG8gdGhlIHRhZyBzdGFjayBhbmQgdGhlIHRvcCBsZXZlbCBsaXN0XG5cdFx0XHRpZiAoZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlRleHQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkNvbW1lbnQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkRpcmVjdGl2ZSkge1xuXHRcdFx0XHRpZiAoZWxlbWVudC5uYW1lLmNoYXJBdCgwKSAhPSBcIi9cIikgeyAvL0lnbm9yZSBjbG9zaW5nIHRhZ3MgdGhhdCBvYnZpb3VzbHkgZG9uJ3QgaGF2ZSBhbiBvcGVuaW5nIHRhZ1xuXHRcdFx0XHRcdHRoaXMuZG9tLnB1c2goZWxlbWVudCk7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLmlzRW1wdHlUYWcoZWxlbWVudCkpIHsgLy9Eb24ndCBhZGQgdGFncyB0byB0aGUgdGFnIHN0YWNrIHRoYXQgY2FuJ3QgaGF2ZSBjaGlsZHJlblxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChlbGVtZW50KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgLy9PdGhlcndpc2UganVzdCBhZGQgdG8gdGhlIHRvcCBsZXZlbCBsaXN0XG5cdFx0XHRcdHRoaXMuZG9tLnB1c2goZWxlbWVudCk7XG5cdFx0fVxuXHRcdGVsc2UgeyAvL1RoZXJlIGFyZSBwYXJlbnQgZWxlbWVudHNcblx0XHRcdC8vSWYgdGhlIGVsZW1lbnQgY2FuIGJlIGEgY29udGFpbmVyLCBhZGQgaXQgYXMgYSBjaGlsZCBvZiB0aGUgZWxlbWVudFxuXHRcdFx0Ly9vbiB0b3Agb2YgdGhlIHRhZyBzdGFjayBhbmQgdGhlbiBhZGQgaXQgdG8gdGhlIHRhZyBzdGFja1xuXHRcdFx0aWYgKGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UZXh0ICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5Db21tZW50ICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5EaXJlY3RpdmUpIHtcblx0XHRcdFx0aWYgKGVsZW1lbnQubmFtZS5jaGFyQXQoMCkgPT0gXCIvXCIpIHtcblx0XHRcdFx0XHQvL1RoaXMgaXMgYSBjbG9zaW5nIHRhZywgc2NhbiB0aGUgdGFnU3RhY2sgdG8gZmluZCB0aGUgbWF0Y2hpbmcgb3BlbmluZyB0YWdcblx0XHRcdFx0XHQvL2FuZCBwb3AgdGhlIHN0YWNrIHVwIHRvIHRoZSBvcGVuaW5nIHRhZydzIHBhcmVudFxuXHRcdFx0XHRcdHZhciBiYXNlTmFtZSA9IGVsZW1lbnQubmFtZS5zdWJzdHJpbmcoMSk7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLmlzRW1wdHlUYWcoZWxlbWVudCkpIHtcblx0XHRcdFx0XHRcdHZhciBwb3MgPSB0aGlzLl90YWdTdGFjay5sZW5ndGggLSAxO1xuXHRcdFx0XHRcdFx0d2hpbGUgKHBvcyA+IC0xICYmIHRoaXMuX3RhZ1N0YWNrW3Bvcy0tXS5uYW1lICE9IGJhc2VOYW1lKSB7IH1cblx0XHRcdFx0XHRcdGlmIChwb3MgPiAtMSB8fCB0aGlzLl90YWdTdGFja1swXS5uYW1lID09IGJhc2VOYW1lKVxuXHRcdFx0XHRcdFx0XHR3aGlsZSAocG9zIDwgdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMSlcblx0XHRcdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wb3AoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7IC8vVGhpcyBpcyBub3QgYSBjbG9zaW5nIHRhZ1xuXHRcdFx0XHRcdGlmICghdGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuKVxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuID0gW107XG5cdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuLnB1c2goZWxlbWVudCk7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLmlzRW1wdHlUYWcoZWxlbWVudCkpIC8vRG9uJ3QgYWRkIHRhZ3MgdG8gdGhlIHRhZyBzdGFjayB0aGF0IGNhbid0IGhhdmUgY2hpbGRyZW5cblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnB1c2goZWxlbWVudCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgeyAvL1RoaXMgaXMgbm90IGEgY29udGFpbmVyIGVsZW1lbnRcblx0XHRcdFx0aWYgKCF0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4pXG5cdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuID0gW107XG5cdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLmxhc3QoKS5jaGlsZHJlbi5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHZhciBEb21VdGlscyA9IHtcblx0XHQgIHRlc3RFbGVtZW50OiBmdW5jdGlvbiBEb21VdGlscyR0ZXN0RWxlbWVudCAob3B0aW9ucywgZWxlbWVudCkge1xuXHRcdFx0aWYgKCFlbGVtZW50KSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRpZiAoa2V5ID09IFwidGFnX25hbWVcIikge1xuXHRcdFx0XHRcdGlmIChlbGVtZW50LnR5cGUgIT0gXCJ0YWdcIiAmJiBlbGVtZW50LnR5cGUgIT0gXCJzY3JpcHRcIiAmJiBlbGVtZW50LnR5cGUgIT0gXCJzdHlsZVwiKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICghb3B0aW9uc1tcInRhZ19uYW1lXCJdKGVsZW1lbnQubmFtZSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoa2V5ID09IFwidGFnX3R5cGVcIikge1xuXHRcdFx0XHRcdGlmICghb3B0aW9uc1tcInRhZ190eXBlXCJdKGVsZW1lbnQudHlwZSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoa2V5ID09IFwidGFnX2NvbnRhaW5zXCIpIHtcblx0XHRcdFx0XHRpZiAoZWxlbWVudC50eXBlICE9IFwidGV4dFwiICYmIGVsZW1lbnQudHlwZSAhPSBcImNvbW1lbnRcIiAmJiBlbGVtZW50LnR5cGUgIT0gXCJkaXJlY3RpdmVcIikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIW9wdGlvbnNbXCJ0YWdfY29udGFpbnNcIl0oZWxlbWVudC5kYXRhKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAoIWVsZW1lbnQuYXR0cmlicyB8fCAhb3B0aW9uc1trZXldKGVsZW1lbnQuYXR0cmlic1trZXldKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcblx0XHQsIGdldEVsZW1lbnRzOiBmdW5jdGlvbiBEb21VdGlscyRnZXRFbGVtZW50cyAob3B0aW9ucywgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIGxpbWl0KSB7XG5cdFx0XHRyZWN1cnNlID0gKHJlY3Vyc2UgPT09IHVuZGVmaW5lZCB8fCByZWN1cnNlID09PSBudWxsKSB8fCAhIXJlY3Vyc2U7XG5cdFx0XHRsaW1pdCA9IGlzTmFOKHBhcnNlSW50KGxpbWl0KSkgPyAtMSA6IHBhcnNlSW50KGxpbWl0KTtcblxuXHRcdFx0aWYgKCFjdXJyZW50RWxlbWVudCkge1xuXHRcdFx0XHRyZXR1cm4oW10pO1xuXHRcdFx0fVxuXHRcblx0XHRcdHZhciBmb3VuZCA9IFtdO1xuXHRcdFx0dmFyIGVsZW1lbnRMaXN0O1xuXG5cdFx0XHRmdW5jdGlvbiBnZXRUZXN0IChjaGVja1ZhbCkge1xuXHRcdFx0XHRyZXR1cm4oZnVuY3Rpb24gKHZhbHVlKSB7IHJldHVybih2YWx1ZSA9PSBjaGVja1ZhbCk7IH0pO1xuXHRcdFx0fVxuXHRcdFx0Zm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcblx0XHRcdFx0aWYgKCh0eXBlb2Ygb3B0aW9uc1trZXldKSAhPSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHRvcHRpb25zW2tleV0gPSBnZXRUZXN0KG9wdGlvbnNba2V5XSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XG5cdFx0XHRpZiAoRG9tVXRpbHMudGVzdEVsZW1lbnQob3B0aW9ucywgY3VycmVudEVsZW1lbnQpKSB7XG5cdFx0XHRcdGZvdW5kLnB1c2goY3VycmVudEVsZW1lbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobGltaXQgPj0gMCAmJiBmb3VuZC5sZW5ndGggPj0gbGltaXQpIHtcblx0XHRcdFx0cmV0dXJuKGZvdW5kKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHJlY3Vyc2UgJiYgY3VycmVudEVsZW1lbnQuY2hpbGRyZW4pIHtcblx0XHRcdFx0ZWxlbWVudExpc3QgPSBjdXJyZW50RWxlbWVudC5jaGlsZHJlbjtcblx0XHRcdH0gZWxzZSBpZiAoY3VycmVudEVsZW1lbnQgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRlbGVtZW50TGlzdCA9IGN1cnJlbnRFbGVtZW50O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuKGZvdW5kKTtcblx0XHRcdH1cblx0XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGZvdW5kID0gZm91bmQuY29uY2F0KERvbVV0aWxzLmdldEVsZW1lbnRzKG9wdGlvbnMsIGVsZW1lbnRMaXN0W2ldLCByZWN1cnNlLCBsaW1pdCkpO1xuXHRcdFx0XHRpZiAobGltaXQgPj0gMCAmJiBmb3VuZC5sZW5ndGggPj0gbGltaXQpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcblx0XHRcdHJldHVybihmb3VuZCk7XG5cdFx0fVxuXHRcdFxuXHRcdCwgZ2V0RWxlbWVudEJ5SWQ6IGZ1bmN0aW9uIERvbVV0aWxzJGdldEVsZW1lbnRCeUlkIChpZCwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UpIHtcblx0XHRcdHZhciByZXN1bHQgPSBEb21VdGlscy5nZXRFbGVtZW50cyh7IGlkOiBpZCB9LCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgMSk7XG5cdFx0XHRyZXR1cm4ocmVzdWx0Lmxlbmd0aCA/IHJlc3VsdFswXSA6IG51bGwpO1xuXHRcdH1cblx0XHRcblx0XHQsIGdldEVsZW1lbnRzQnlUYWdOYW1lOiBmdW5jdGlvbiBEb21VdGlscyRnZXRFbGVtZW50c0J5VGFnTmFtZSAobmFtZSwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIGxpbWl0KSB7XG5cdFx0XHRyZXR1cm4oRG9tVXRpbHMuZ2V0RWxlbWVudHMoeyB0YWdfbmFtZTogbmFtZSB9LCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpKTtcblx0XHR9XG5cdFx0XG5cdFx0LCBnZXRFbGVtZW50c0J5VGFnVHlwZTogZnVuY3Rpb24gRG9tVXRpbHMkZ2V0RWxlbWVudHNCeVRhZ1R5cGUgKHR5cGUsIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCBsaW1pdCkge1xuXHRcdFx0cmV0dXJuKERvbVV0aWxzLmdldEVsZW1lbnRzKHsgdGFnX3R5cGU6IHR5cGUgfSwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIGxpbWl0KSk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gaW5oZXJpdHMgKGN0b3IsIHN1cGVyQ3Rvcikge1xuXHRcdHZhciB0ZW1wQ3RvciA9IGZ1bmN0aW9uKCl7fTtcblx0XHR0ZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlO1xuXHRcdGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yO1xuXHRcdGN0b3IucHJvdG90eXBlID0gbmV3IHRlbXBDdG9yKCk7XG5cdFx0Y3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yO1xuXHR9XG5cbmV4cG9ydHMuUGFyc2VyID0gUGFyc2VyO1xuXG5leHBvcnRzLkRlZmF1bHRIYW5kbGVyID0gRGVmYXVsdEhhbmRsZXI7XG5cbmV4cG9ydHMuUnNzSGFuZGxlciA9IFJzc0hhbmRsZXI7XG5cbmV4cG9ydHMuRWxlbWVudFR5cGUgPSBFbGVtZW50VHlwZTtcblxuZXhwb3J0cy5Eb21VdGlscyA9IERvbVV0aWxzO1xuXG59KSgpO1xuXG59KS5jYWxsKHRoaXMsXCIvbm9kZV9tb2R1bGVzL2h0bWxQYXJzZXIvbGliL2h0bWxwYXJzZXIuanNcIixcIi9ub2RlX21vZHVsZXMvaHRtbFBhcnNlci9saWJcIikiLCJ2YXIgY3JlYXRlRWxlbWVudCA9IHJlcXVpcmUoXCJ2ZG9tL2NyZWF0ZS1lbGVtZW50XCIpXG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlRWxlbWVudFxuIiwidmFyIGRpZmYgPSByZXF1aXJlKFwidnRyZWUvZGlmZlwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRpZmZcbiIsInZhciBoID0gcmVxdWlyZShcIi4vaC9pbmRleC5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhcbiIsInZhciBpc0FycmF5ID0gcmVxdWlyZShcIngtaXMtYXJyYXlcIilcbnZhciBpc1N0cmluZyA9IHJlcXVpcmUoXCJ4LWlzLXN0cmluZ1wiKVxuXG52YXIgVk5vZGUgPSByZXF1aXJlKFwidnRyZWUvdm5vZGUuanNcIilcbnZhciBWVGV4dCA9IHJlcXVpcmUoXCJ2dHJlZS92dGV4dC5qc1wiKVxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwidnRyZWUvaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcInZ0cmVlL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwidnRyZWUvaXMtd2lkZ2V0XCIpXG5cbnZhciBwYXJzZVRhZyA9IHJlcXVpcmUoXCIuL3BhcnNlLXRhZ1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhcblxuZnVuY3Rpb24gaCh0YWdOYW1lLCBwcm9wZXJ0aWVzLCBjaGlsZHJlbikge1xuICAgIHZhciB0YWcsIHByb3BzLCBjaGlsZE5vZGVzLCBrZXlcblxuICAgIGlmICghY2hpbGRyZW4pIHtcbiAgICAgICAgaWYgKGlzQ2hpbGRyZW4ocHJvcGVydGllcykpIHtcbiAgICAgICAgICAgIGNoaWxkcmVuID0gcHJvcGVydGllc1xuICAgICAgICAgICAgcHJvcGVydGllcyA9IHVuZGVmaW5lZFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGFnID0gcGFyc2VUYWcodGFnTmFtZSwgcHJvcGVydGllcylcblxuICAgIGlmICghaXNTdHJpbmcodGFnKSkge1xuICAgICAgICBwcm9wcyA9IHRhZy5wcm9wZXJ0aWVzXG4gICAgICAgIHRhZyA9IHRhZy50YWdOYW1lXG4gICAgfSBlbHNlIHtcbiAgICAgICAgcHJvcHMgPSBwcm9wZXJ0aWVzXG4gICAgfVxuXG4gICAgaWYgKGlzQXJyYXkoY2hpbGRyZW4pKSB7XG4gICAgICAgIHZhciBsZW4gPSBjaGlsZHJlbi5sZW5ndGhcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICAgICAgaWYgKGlzU3RyaW5nKGNoaWxkKSkge1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuW2ldID0gbmV3IFZUZXh0KGNoaWxkKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY2hpbGROb2RlcyA9IGNoaWxkcmVuXG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhjaGlsZHJlbikpIHtcbiAgICAgICAgY2hpbGROb2RlcyA9IFtuZXcgVlRleHQoY2hpbGRyZW4pXVxuICAgIH0gZWxzZSBpZiAoaXNDaGlsZChjaGlsZHJlbikpIHtcbiAgICAgICAgY2hpbGROb2RlcyA9IFtjaGlsZHJlbl1cbiAgICB9XG5cbiAgICBpZiAocHJvcHMgJiYgXCJrZXlcIiBpbiBwcm9wcykge1xuICAgICAgICBrZXkgPSBwcm9wcy5rZXlcbiAgICAgICAgZGVsZXRlIHByb3BzLmtleVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgVk5vZGUodGFnLCBwcm9wcywgY2hpbGROb2Rlcywga2V5KVxufVxuXG5mdW5jdGlvbiBpc0NoaWxkKHgpIHtcbiAgICByZXR1cm4gaXNWTm9kZSh4KSB8fCBpc1ZUZXh0KHgpIHx8IGlzV2lkZ2V0KHgpXG59XG5cbmZ1bmN0aW9uIGlzQ2hpbGRyZW4oeCkge1xuICAgIHJldHVybiBpc0FycmF5KHgpIHx8IGlzU3RyaW5nKHgpIHx8IGlzQ2hpbGQoeClcbn1cbiIsInZhciBzcGxpdCA9IHJlcXVpcmUoXCJicm93c2VyLXNwbGl0XCIpXG5cbnZhciBjbGFzc0lkU3BsaXQgPSAvKFtcXC4jXT9bYS16QS1aMC05XzotXSspL1xudmFyIG5vdENsYXNzSWQgPSAvXlxcLnwjL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlVGFnXG5cbmZ1bmN0aW9uIHBhcnNlVGFnKHRhZywgcHJvcHMpIHtcbiAgICBpZiAoIXRhZykge1xuICAgICAgICByZXR1cm4gXCJkaXZcIlxuICAgIH1cblxuICAgIHZhciBub0lkID0gIXByb3BzIHx8ICEoXCJpZFwiIGluIHByb3BzKVxuXG4gICAgdmFyIHRhZ1BhcnRzID0gc3BsaXQodGFnLCBjbGFzc0lkU3BsaXQpXG4gICAgdmFyIHRhZ05hbWUgPSBudWxsXG5cbiAgICBpZihub3RDbGFzc0lkLnRlc3QodGFnUGFydHNbMV0pKSB7XG4gICAgICAgIHRhZ05hbWUgPSBcImRpdlwiXG4gICAgfVxuXG4gICAgdmFyIGlkLCBjbGFzc2VzLCBwYXJ0LCB0eXBlLCBpXG4gICAgZm9yIChpID0gMDsgaSA8IHRhZ1BhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnQgPSB0YWdQYXJ0c1tpXVxuXG4gICAgICAgIGlmICghcGFydCkge1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIHR5cGUgPSBwYXJ0LmNoYXJBdCgwKVxuXG4gICAgICAgIGlmICghdGFnTmFtZSkge1xuICAgICAgICAgICAgdGFnTmFtZSA9IHBhcnRcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBcIi5cIikge1xuICAgICAgICAgICAgY2xhc3NlcyA9IGNsYXNzZXMgfHwgW11cbiAgICAgICAgICAgIGNsYXNzZXMucHVzaChwYXJ0LnN1YnN0cmluZygxLCBwYXJ0Lmxlbmd0aCkpXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCIjXCIgJiYgbm9JZCkge1xuICAgICAgICAgICAgaWQgPSBwYXJ0LnN1YnN0cmluZygxLCBwYXJ0Lmxlbmd0aClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBwYXJzZWRUYWdzXG5cbiAgICBpZiAocHJvcHMpIHtcbiAgICAgICAgaWYgKGlkICE9PSB1bmRlZmluZWQgJiYgIShcImlkXCIgaW4gcHJvcHMpKSB7XG4gICAgICAgICAgICBwcm9wcy5pZCA9IGlkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2xhc3Nlcykge1xuICAgICAgICAgICAgaWYgKHByb3BzLmNsYXNzTmFtZSkge1xuICAgICAgICAgICAgICAgIGNsYXNzZXMucHVzaChwcm9wcy5jbGFzc05hbWUpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByb3BzLmNsYXNzTmFtZSA9IGNsYXNzZXMuam9pbihcIiBcIilcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcnNlZFRhZ3MgPSB0YWdOYW1lXG4gICAgfSBlbHNlIGlmIChjbGFzc2VzIHx8IGlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFyIHByb3BlcnRpZXMgPSB7fVxuXG4gICAgICAgIGlmIChpZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLmlkID0gaWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjbGFzc2VzKSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLmNsYXNzTmFtZSA9IGNsYXNzZXMuam9pbihcIiBcIilcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcnNlZFRhZ3MgPSB7XG4gICAgICAgICAgICB0YWdOYW1lOiB0YWdOYW1lLFxuICAgICAgICAgICAgcHJvcGVydGllczogcHJvcGVydGllc1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGFyc2VkVGFncyA9IHRhZ05hbWVcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyc2VkVGFnc1xufVxuIiwiLyohXG4gKiBDcm9zcy1Ccm93c2VyIFNwbGl0IDEuMS4xXG4gKiBDb3B5cmlnaHQgMjAwNy0yMDEyIFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuICogQXZhaWxhYmxlIHVuZGVyIHRoZSBNSVQgTGljZW5zZVxuICogRUNNQVNjcmlwdCBjb21wbGlhbnQsIHVuaWZvcm0gY3Jvc3MtYnJvd3NlciBzcGxpdCBtZXRob2RcbiAqL1xuXG4vKipcbiAqIFNwbGl0cyBhIHN0cmluZyBpbnRvIGFuIGFycmF5IG9mIHN0cmluZ3MgdXNpbmcgYSByZWdleCBvciBzdHJpbmcgc2VwYXJhdG9yLiBNYXRjaGVzIG9mIHRoZVxuICogc2VwYXJhdG9yIGFyZSBub3QgaW5jbHVkZWQgaW4gdGhlIHJlc3VsdCBhcnJheS4gSG93ZXZlciwgaWYgYHNlcGFyYXRvcmAgaXMgYSByZWdleCB0aGF0IGNvbnRhaW5zXG4gKiBjYXB0dXJpbmcgZ3JvdXBzLCBiYWNrcmVmZXJlbmNlcyBhcmUgc3BsaWNlZCBpbnRvIHRoZSByZXN1bHQgZWFjaCB0aW1lIGBzZXBhcmF0b3JgIGlzIG1hdGNoZWQuXG4gKiBGaXhlcyBicm93c2VyIGJ1Z3MgY29tcGFyZWQgdG8gdGhlIG5hdGl2ZSBgU3RyaW5nLnByb3RvdHlwZS5zcGxpdGAgYW5kIGNhbiBiZSB1c2VkIHJlbGlhYmx5XG4gKiBjcm9zcy1icm93c2VyLlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBTdHJpbmcgdG8gc3BsaXQuXG4gKiBAcGFyYW0ge1JlZ0V4cHxTdHJpbmd9IHNlcGFyYXRvciBSZWdleCBvciBzdHJpbmcgdG8gdXNlIGZvciBzZXBhcmF0aW5nIHRoZSBzdHJpbmcuXG4gKiBAcGFyYW0ge051bWJlcn0gW2xpbWl0XSBNYXhpbXVtIG51bWJlciBvZiBpdGVtcyB0byBpbmNsdWRlIGluIHRoZSByZXN1bHQgYXJyYXkuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHN1YnN0cmluZ3MuXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIEJhc2ljIHVzZVxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcpO1xuICogLy8gLT4gWydhJywgJ2InLCAnYycsICdkJ11cbiAqXG4gKiAvLyBXaXRoIGxpbWl0XG4gKiBzcGxpdCgnYSBiIGMgZCcsICcgJywgMik7XG4gKiAvLyAtPiBbJ2EnLCAnYiddXG4gKlxuICogLy8gQmFja3JlZmVyZW5jZXMgaW4gcmVzdWx0IGFycmF5XG4gKiBzcGxpdCgnLi53b3JkMSB3b3JkMi4uJywgLyhbYS16XSspKFxcZCspL2kpO1xuICogLy8gLT4gWycuLicsICd3b3JkJywgJzEnLCAnICcsICd3b3JkJywgJzInLCAnLi4nXVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBzcGxpdCh1bmRlZikge1xuXG4gIHZhciBuYXRpdmVTcGxpdCA9IFN0cmluZy5wcm90b3R5cGUuc3BsaXQsXG4gICAgY29tcGxpYW50RXhlY05wY2cgPSAvKCk/Py8uZXhlYyhcIlwiKVsxXSA9PT0gdW5kZWYsXG4gICAgLy8gTlBDRzogbm9ucGFydGljaXBhdGluZyBjYXB0dXJpbmcgZ3JvdXBcbiAgICBzZWxmO1xuXG4gIHNlbGYgPSBmdW5jdGlvbihzdHIsIHNlcGFyYXRvciwgbGltaXQpIHtcbiAgICAvLyBJZiBgc2VwYXJhdG9yYCBpcyBub3QgYSByZWdleCwgdXNlIGBuYXRpdmVTcGxpdGBcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHNlcGFyYXRvcikgIT09IFwiW29iamVjdCBSZWdFeHBdXCIpIHtcbiAgICAgIHJldHVybiBuYXRpdmVTcGxpdC5jYWxsKHN0ciwgc2VwYXJhdG9yLCBsaW1pdCk7XG4gICAgfVxuICAgIHZhciBvdXRwdXQgPSBbXSxcbiAgICAgIGZsYWdzID0gKHNlcGFyYXRvci5pZ25vcmVDYXNlID8gXCJpXCIgOiBcIlwiKSArIChzZXBhcmF0b3IubXVsdGlsaW5lID8gXCJtXCIgOiBcIlwiKSArIChzZXBhcmF0b3IuZXh0ZW5kZWQgPyBcInhcIiA6IFwiXCIpICsgLy8gUHJvcG9zZWQgZm9yIEVTNlxuICAgICAgKHNlcGFyYXRvci5zdGlja3kgPyBcInlcIiA6IFwiXCIpLFxuICAgICAgLy8gRmlyZWZveCAzK1xuICAgICAgbGFzdExhc3RJbmRleCA9IDAsXG4gICAgICAvLyBNYWtlIGBnbG9iYWxgIGFuZCBhdm9pZCBgbGFzdEluZGV4YCBpc3N1ZXMgYnkgd29ya2luZyB3aXRoIGEgY29weVxuICAgICAgc2VwYXJhdG9yID0gbmV3IFJlZ0V4cChzZXBhcmF0b3Iuc291cmNlLCBmbGFncyArIFwiZ1wiKSxcbiAgICAgIHNlcGFyYXRvcjIsIG1hdGNoLCBsYXN0SW5kZXgsIGxhc3RMZW5ndGg7XG4gICAgc3RyICs9IFwiXCI7IC8vIFR5cGUtY29udmVydFxuICAgIGlmICghY29tcGxpYW50RXhlY05wY2cpIHtcbiAgICAgIC8vIERvZXNuJ3QgbmVlZCBmbGFncyBneSwgYnV0IHRoZXkgZG9uJ3QgaHVydFxuICAgICAgc2VwYXJhdG9yMiA9IG5ldyBSZWdFeHAoXCJeXCIgKyBzZXBhcmF0b3Iuc291cmNlICsgXCIkKD8hXFxcXHMpXCIsIGZsYWdzKTtcbiAgICB9XG4gICAgLyogVmFsdWVzIGZvciBgbGltaXRgLCBwZXIgdGhlIHNwZWM6XG4gICAgICogSWYgdW5kZWZpbmVkOiA0Mjk0OTY3Mjk1IC8vIE1hdGgucG93KDIsIDMyKSAtIDFcbiAgICAgKiBJZiAwLCBJbmZpbml0eSwgb3IgTmFOOiAwXG4gICAgICogSWYgcG9zaXRpdmUgbnVtYmVyOiBsaW1pdCA9IE1hdGguZmxvb3IobGltaXQpOyBpZiAobGltaXQgPiA0Mjk0OTY3Mjk1KSBsaW1pdCAtPSA0Mjk0OTY3Mjk2O1xuICAgICAqIElmIG5lZ2F0aXZlIG51bWJlcjogNDI5NDk2NzI5NiAtIE1hdGguZmxvb3IoTWF0aC5hYnMobGltaXQpKVxuICAgICAqIElmIG90aGVyOiBUeXBlLWNvbnZlcnQsIHRoZW4gdXNlIHRoZSBhYm92ZSBydWxlc1xuICAgICAqL1xuICAgIGxpbWl0ID0gbGltaXQgPT09IHVuZGVmID8gLTEgPj4+IDAgOiAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgbGltaXQgPj4+IDA7IC8vIFRvVWludDMyKGxpbWl0KVxuICAgIHdoaWxlIChtYXRjaCA9IHNlcGFyYXRvci5leGVjKHN0cikpIHtcbiAgICAgIC8vIGBzZXBhcmF0b3IubGFzdEluZGV4YCBpcyBub3QgcmVsaWFibGUgY3Jvc3MtYnJvd3NlclxuICAgICAgbGFzdEluZGV4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG4gICAgICBpZiAobGFzdEluZGV4ID4gbGFzdExhc3RJbmRleCkge1xuICAgICAgICBvdXRwdXQucHVzaChzdHIuc2xpY2UobGFzdExhc3RJbmRleCwgbWF0Y2guaW5kZXgpKTtcbiAgICAgICAgLy8gRml4IGJyb3dzZXJzIHdob3NlIGBleGVjYCBtZXRob2RzIGRvbid0IGNvbnNpc3RlbnRseSByZXR1cm4gYHVuZGVmaW5lZGAgZm9yXG4gICAgICAgIC8vIG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3Vwc1xuICAgICAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnICYmIG1hdGNoLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBtYXRjaFswXS5yZXBsYWNlKHNlcGFyYXRvcjIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoIC0gMjsgaSsrKSB7XG4gICAgICAgICAgICAgIGlmIChhcmd1bWVudHNbaV0gPT09IHVuZGVmKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hbaV0gPSB1bmRlZjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaC5sZW5ndGggPiAxICYmIG1hdGNoLmluZGV4IDwgc3RyLmxlbmd0aCkge1xuICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KG91dHB1dCwgbWF0Y2guc2xpY2UoMSkpO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RMZW5ndGggPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgIGxhc3RMYXN0SW5kZXggPSBsYXN0SW5kZXg7XG4gICAgICAgIGlmIChvdXRwdXQubGVuZ3RoID49IGxpbWl0KSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzZXBhcmF0b3IubGFzdEluZGV4ID09PSBtYXRjaC5pbmRleCkge1xuICAgICAgICBzZXBhcmF0b3IubGFzdEluZGV4Kys7IC8vIEF2b2lkIGFuIGluZmluaXRlIGxvb3BcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGxhc3RMYXN0SW5kZXggPT09IHN0ci5sZW5ndGgpIHtcbiAgICAgIGlmIChsYXN0TGVuZ3RoIHx8ICFzZXBhcmF0b3IudGVzdChcIlwiKSkge1xuICAgICAgICBvdXRwdXQucHVzaChcIlwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dC5sZW5ndGggPiBsaW1pdCA/IG91dHB1dC5zbGljZSgwLCBsaW1pdCkgOiBvdXRwdXQ7XG4gIH07XG5cbiAgcmV0dXJuIHNlbGY7XG59KSgpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBpc09iamVjdFxuXG5mdW5jdGlvbiBpc09iamVjdCh4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSBcIm9iamVjdFwiICYmIHggIT09IG51bGxcbn1cbiIsInZhciBpc09iamVjdCA9IHJlcXVpcmUoXCJpcy1vYmplY3RcIilcbnZhciBpc0hvb2sgPSByZXF1aXJlKFwidnRyZWUvaXMtdmhvb2tcIilcblxubW9kdWxlLmV4cG9ydHMgPSBhcHBseVByb3BlcnRpZXNcblxuZnVuY3Rpb24gYXBwbHlQcm9wZXJ0aWVzKG5vZGUsIHByb3BzLCBwcmV2aW91cykge1xuICAgIGZvciAodmFyIHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV1cblxuICAgICAgICBpZiAocHJvcFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJlbW92ZVByb3BlcnR5KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzSG9vayhwcm9wVmFsdWUpKSB7XG4gICAgICAgICAgICBwcm9wVmFsdWUuaG9vayhub2RlLFxuICAgICAgICAgICAgICAgIHByb3BOYW1lLFxuICAgICAgICAgICAgICAgIHByZXZpb3VzID8gcHJldmlvdXNbcHJvcE5hbWVdIDogdW5kZWZpbmVkKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGlzT2JqZWN0KHByb3BWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBwYXRjaE9iamVjdChub2RlLCBwcm9wcywgcHJldmlvdXMsIHByb3BOYW1lLCBwcm9wVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wVmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIG5vZGVbcHJvcE5hbWVdID0gcHJvcFZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVByb3BlcnR5KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUpIHtcbiAgICBpZiAocHJldmlvdXMpIHtcbiAgICAgICAgdmFyIHByZXZpb3VzVmFsdWUgPSBwcmV2aW91c1twcm9wTmFtZV1cblxuICAgICAgICBpZiAoIWlzSG9vayhwcmV2aW91c1ZhbHVlKSkge1xuICAgICAgICAgICAgaWYgKHByb3BOYW1lID09PSBcImF0dHJpYnV0ZXNcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGF0dHJOYW1lIGluIHByZXZpb3VzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wTmFtZSA9PT0gXCJzdHlsZVwiKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBwcmV2aW91c1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUuc3R5bGVbaV0gPSBcIlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcHJldmlvdXNWYWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIG5vZGVbcHJvcE5hbWVdID0gXCJcIlxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlW3Byb3BOYW1lXSA9IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcGF0Y2hPYmplY3Qobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSwgcHJvcFZhbHVlKSB7XG4gICAgdmFyIHByZXZpb3VzVmFsdWUgPSBwcmV2aW91cyA/IHByZXZpb3VzW3Byb3BOYW1lXSA6IHVuZGVmaW5lZFxuXG4gICAgLy8gU2V0IGF0dHJpYnV0ZXNcbiAgICBpZiAocHJvcE5hbWUgPT09IFwiYXR0cmlidXRlc1wiKSB7XG4gICAgICAgIGZvciAodmFyIGF0dHJOYW1lIGluIHByb3BWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIGF0dHJWYWx1ZSA9IHByb3BWYWx1ZVthdHRyTmFtZV1cblxuICAgICAgICAgICAgaWYgKGF0dHJWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBhdHRyVmFsdWUpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZihwcmV2aW91c1ZhbHVlICYmIGlzT2JqZWN0KHByZXZpb3VzVmFsdWUpICYmXG4gICAgICAgIGdldFByb3RvdHlwZShwcmV2aW91c1ZhbHVlKSAhPT0gZ2V0UHJvdG90eXBlKHByb3BWYWx1ZSkpIHtcbiAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBwcm9wVmFsdWVcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKCFpc09iamVjdChub2RlW3Byb3BOYW1lXSkpIHtcbiAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSB7fVxuICAgIH1cblxuICAgIHZhciByZXBsYWNlciA9IHByb3BOYW1lID09PSBcInN0eWxlXCIgPyBcIlwiIDogdW5kZWZpbmVkXG5cbiAgICBmb3IgKHZhciBrIGluIHByb3BWYWx1ZSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwcm9wVmFsdWVba11cbiAgICAgICAgbm9kZVtwcm9wTmFtZV1ba10gPSAodmFsdWUgPT09IHVuZGVmaW5lZCkgPyByZXBsYWNlciA6IHZhbHVlXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcm90b3R5cGUodmFsdWUpIHtcbiAgICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5fX3Byb3RvX18pIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLl9fcHJvdG9fX1xuICAgIH0gZWxzZSBpZiAodmFsdWUuY29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZVxuICAgIH1cbn1cbiIsInZhciBkb2N1bWVudCA9IHJlcXVpcmUoXCJnbG9iYWwvZG9jdW1lbnRcIilcblxudmFyIGFwcGx5UHJvcGVydGllcyA9IHJlcXVpcmUoXCIuL2FwcGx5LXByb3BlcnRpZXNcIilcblxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwidnRyZWUvaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcInZ0cmVlL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwidnRyZWUvaXMtd2lkZ2V0XCIpXG52YXIgaGFuZGxlVGh1bmsgPSByZXF1aXJlKFwidnRyZWUvaGFuZGxlLXRodW5rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlRWxlbWVudFxuXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50KHZub2RlLCBvcHRzKSB7XG4gICAgdmFyIGRvYyA9IG9wdHMgPyBvcHRzLmRvY3VtZW50IHx8IGRvY3VtZW50IDogZG9jdW1lbnRcbiAgICB2YXIgd2FybiA9IG9wdHMgPyBvcHRzLndhcm4gOiBudWxsXG5cbiAgICB2bm9kZSA9IGhhbmRsZVRodW5rKHZub2RlKS5hXG5cbiAgICBpZiAoaXNXaWRnZXQodm5vZGUpKSB7XG4gICAgICAgIHJldHVybiB2bm9kZS5pbml0KClcbiAgICB9IGVsc2UgaWYgKGlzVlRleHQodm5vZGUpKSB7XG4gICAgICAgIHJldHVybiBkb2MuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dClcbiAgICB9IGVsc2UgaWYgKCFpc1ZOb2RlKHZub2RlKSkge1xuICAgICAgICBpZiAod2Fybikge1xuICAgICAgICAgICAgd2FybihcIkl0ZW0gaXMgbm90IGEgdmFsaWQgdmlydHVhbCBkb20gbm9kZVwiLCB2bm9kZSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHZhciBub2RlID0gKHZub2RlLm5hbWVzcGFjZSA9PT0gbnVsbCkgP1xuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudCh2bm9kZS50YWdOYW1lKSA6XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50TlModm5vZGUubmFtZXNwYWNlLCB2bm9kZS50YWdOYW1lKVxuXG4gICAgdmFyIHByb3BzID0gdm5vZGUucHJvcGVydGllc1xuICAgIGFwcGx5UHJvcGVydGllcyhub2RlLCBwcm9wcylcblxuICAgIHZhciBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZE5vZGUgPSBjcmVhdGVFbGVtZW50KGNoaWxkcmVuW2ldLCBvcHRzKVxuICAgICAgICBpZiAoY2hpbGROb2RlKSB7XG4gICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKGNoaWxkTm9kZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2RlXG59XG4iLCIvLyBNYXBzIGEgdmlydHVhbCBET00gdHJlZSBvbnRvIGEgcmVhbCBET00gdHJlZSBpbiBhbiBlZmZpY2llbnQgbWFubmVyLlxuLy8gV2UgZG9uJ3Qgd2FudCB0byByZWFkIGFsbCBvZiB0aGUgRE9NIG5vZGVzIGluIHRoZSB0cmVlIHNvIHdlIHVzZVxuLy8gdGhlIGluLW9yZGVyIHRyZWUgaW5kZXhpbmcgdG8gZWxpbWluYXRlIHJlY3Vyc2lvbiBkb3duIGNlcnRhaW4gYnJhbmNoZXMuXG4vLyBXZSBvbmx5IHJlY3Vyc2UgaW50byBhIERPTSBub2RlIGlmIHdlIGtub3cgdGhhdCBpdCBjb250YWlucyBhIGNoaWxkIG9mXG4vLyBpbnRlcmVzdC5cblxudmFyIG5vQ2hpbGQgPSB7fVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUluZGV4XG5cbmZ1bmN0aW9uIGRvbUluZGV4KHJvb3ROb2RlLCB0cmVlLCBpbmRpY2VzLCBub2Rlcykge1xuICAgIGlmICghaW5kaWNlcyB8fCBpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge31cbiAgICB9IGVsc2Uge1xuICAgICAgICBpbmRpY2VzLnNvcnQoYXNjZW5kaW5nKVxuICAgICAgICByZXR1cm4gcmVjdXJzZShyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMsIDApXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWN1cnNlKHJvb3ROb2RlLCB0cmVlLCBpbmRpY2VzLCBub2Rlcywgcm9vdEluZGV4KSB7XG4gICAgbm9kZXMgPSBub2RlcyB8fCB7fVxuXG5cbiAgICBpZiAocm9vdE5vZGUpIHtcbiAgICAgICAgaWYgKGluZGV4SW5SYW5nZShpbmRpY2VzLCByb290SW5kZXgsIHJvb3RJbmRleCkpIHtcbiAgICAgICAgICAgIG5vZGVzW3Jvb3RJbmRleF0gPSByb290Tm9kZVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZDaGlsZHJlbiA9IHRyZWUuY2hpbGRyZW5cblxuICAgICAgICBpZiAodkNoaWxkcmVuKSB7XG5cbiAgICAgICAgICAgIHZhciBjaGlsZE5vZGVzID0gcm9vdE5vZGUuY2hpbGROb2Rlc1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRyZWUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByb290SW5kZXggKz0gMVxuXG4gICAgICAgICAgICAgICAgdmFyIHZDaGlsZCA9IHZDaGlsZHJlbltpXSB8fCBub0NoaWxkXG4gICAgICAgICAgICAgICAgdmFyIG5leHRJbmRleCA9IHJvb3RJbmRleCArICh2Q2hpbGQuY291bnQgfHwgMClcblxuICAgICAgICAgICAgICAgIC8vIHNraXAgcmVjdXJzaW9uIGRvd24gdGhlIHRyZWUgaWYgdGhlcmUgYXJlIG5vIG5vZGVzIGRvd24gaGVyZVxuICAgICAgICAgICAgICAgIGlmIChpbmRleEluUmFuZ2UoaW5kaWNlcywgcm9vdEluZGV4LCBuZXh0SW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlY3Vyc2UoY2hpbGROb2Rlc1tpXSwgdkNoaWxkLCBpbmRpY2VzLCBub2Rlcywgcm9vdEluZGV4KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJvb3RJbmRleCA9IG5leHRJbmRleFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGVzXG59XG5cbi8vIEJpbmFyeSBzZWFyY2ggZm9yIGFuIGluZGV4IGluIHRoZSBpbnRlcnZhbCBbbGVmdCwgcmlnaHRdXG5mdW5jdGlvbiBpbmRleEluUmFuZ2UoaW5kaWNlcywgbGVmdCwgcmlnaHQpIHtcbiAgICBpZiAoaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIG1pbkluZGV4ID0gMFxuICAgIHZhciBtYXhJbmRleCA9IGluZGljZXMubGVuZ3RoIC0gMVxuICAgIHZhciBjdXJyZW50SW5kZXhcbiAgICB2YXIgY3VycmVudEl0ZW1cblxuICAgIHdoaWxlIChtaW5JbmRleCA8PSBtYXhJbmRleCkge1xuICAgICAgICBjdXJyZW50SW5kZXggPSAoKG1heEluZGV4ICsgbWluSW5kZXgpIC8gMikgPj4gMFxuICAgICAgICBjdXJyZW50SXRlbSA9IGluZGljZXNbY3VycmVudEluZGV4XVxuXG4gICAgICAgIGlmIChtaW5JbmRleCA9PT0gbWF4SW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJyZW50SXRlbSA+PSBsZWZ0ICYmIGN1cnJlbnRJdGVtIDw9IHJpZ2h0XG4gICAgICAgIH0gZWxzZSBpZiAoY3VycmVudEl0ZW0gPCBsZWZ0KSB7XG4gICAgICAgICAgICBtaW5JbmRleCA9IGN1cnJlbnRJbmRleCArIDFcbiAgICAgICAgfSBlbHNlICBpZiAoY3VycmVudEl0ZW0gPiByaWdodCkge1xuICAgICAgICAgICAgbWF4SW5kZXggPSBjdXJyZW50SW5kZXggLSAxXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBhc2NlbmRpbmcoYSwgYikge1xuICAgIHJldHVybiBhID4gYiA/IDEgOiAtMVxufVxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIHRvcExldmVsID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge31cbnZhciBtaW5Eb2MgPSByZXF1aXJlKCdtaW4tZG9jdW1lbnQnKTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICB2YXIgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddO1xuXG4gICAgaWYgKCFkb2NjeSkge1xuICAgICAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J10gPSBtaW5Eb2M7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2NjeTtcbn1cblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwidmFyIGFwcGx5UHJvcGVydGllcyA9IHJlcXVpcmUoXCIuL2FwcGx5LXByb3BlcnRpZXNcIilcblxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcInZ0cmVlL2lzLXdpZGdldFwiKVxudmFyIFZQYXRjaCA9IHJlcXVpcmUoXCJ2dHJlZS92cGF0Y2hcIilcblxudmFyIHJlbmRlciA9IHJlcXVpcmUoXCIuL2NyZWF0ZS1lbGVtZW50XCIpXG52YXIgdXBkYXRlV2lkZ2V0ID0gcmVxdWlyZShcIi4vdXBkYXRlLXdpZGdldFwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcGx5UGF0Y2hcblxuZnVuY3Rpb24gYXBwbHlQYXRjaCh2cGF0Y2gsIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgdHlwZSA9IHZwYXRjaC50eXBlXG4gICAgdmFyIHZOb2RlID0gdnBhdGNoLnZOb2RlXG4gICAgdmFyIHBhdGNoID0gdnBhdGNoLnBhdGNoXG5cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSBWUGF0Y2guUkVNT1ZFOlxuICAgICAgICAgICAgcmV0dXJuIHJlbW92ZU5vZGUoZG9tTm9kZSwgdk5vZGUpXG4gICAgICAgIGNhc2UgVlBhdGNoLklOU0VSVDpcbiAgICAgICAgICAgIHJldHVybiBpbnNlcnROb2RlKGRvbU5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5WVEVYVDpcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmdQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLldJREdFVDpcbiAgICAgICAgICAgIHJldHVybiB3aWRnZXRQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLlZOT0RFOlxuICAgICAgICAgICAgcmV0dXJuIHZOb2RlUGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5PUkRFUjpcbiAgICAgICAgICAgIHJlb3JkZXJDaGlsZHJlbihkb21Ob2RlLCBwYXRjaClcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgICAgIGNhc2UgVlBhdGNoLlBST1BTOlxuICAgICAgICAgICAgYXBwbHlQcm9wZXJ0aWVzKGRvbU5vZGUsIHBhdGNoLCB2Tm9kZS5wcm9wZXJ0aWVzKVxuICAgICAgICAgICAgcmV0dXJuIGRvbU5vZGVcbiAgICAgICAgY2FzZSBWUGF0Y2guVEhVTks6XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZVJvb3QoZG9tTm9kZSxcbiAgICAgICAgICAgICAgICByZW5kZXJPcHRpb25zLnBhdGNoKGRvbU5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKSlcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVOb2RlKGRvbU5vZGUsIHZOb2RlKSB7XG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZG9tTm9kZSlcbiAgICB9XG5cbiAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIHZOb2RlKTtcblxuICAgIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIGluc2VydE5vZGUocGFyZW50Tm9kZSwgdk5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgbmV3Tm9kZSA9IHJlbmRlcih2Tm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUuYXBwZW5kQ2hpbGQobmV3Tm9kZSlcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyZW50Tm9kZVxufVxuXG5mdW5jdGlvbiBzdHJpbmdQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHZUZXh0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIG5ld05vZGVcblxuICAgIGlmIChkb21Ob2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIGRvbU5vZGUucmVwbGFjZURhdGEoMCwgZG9tTm9kZS5sZW5ndGgsIHZUZXh0LnRleHQpXG4gICAgICAgIG5ld05vZGUgPSBkb21Ob2RlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcbiAgICAgICAgbmV3Tm9kZSA9IHJlbmRlcih2VGV4dCwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZG9tTm9kZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgbGVmdFZOb2RlKVxuXG4gICAgcmV0dXJuIG5ld05vZGVcbn1cblxuZnVuY3Rpb24gd2lkZ2V0UGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB3aWRnZXQsIHJlbmRlck9wdGlvbnMpIHtcbiAgICBpZiAodXBkYXRlV2lkZ2V0KGxlZnRWTm9kZSwgd2lkZ2V0KSkge1xuICAgICAgICByZXR1cm4gd2lkZ2V0LnVwZGF0ZShsZWZ0Vk5vZGUsIGRvbU5vZGUpIHx8IGRvbU5vZGVcbiAgICB9XG5cbiAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuICAgIHZhciBuZXdXaWRnZXQgPSByZW5kZXIod2lkZ2V0LCByZW5kZXJPcHRpb25zKVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3V2lkZ2V0LCBkb21Ob2RlKVxuICAgIH1cblxuICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgbGVmdFZOb2RlKVxuXG4gICAgcmV0dXJuIG5ld1dpZGdldFxufVxuXG5mdW5jdGlvbiB2Tm9kZVBhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgdk5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuICAgIHZhciBuZXdOb2RlID0gcmVuZGVyKHZOb2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZG9tTm9kZSlcbiAgICB9XG5cbiAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIGxlZnRWTm9kZSlcblxuICAgIHJldHVybiBuZXdOb2RlXG59XG5cbmZ1bmN0aW9uIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgdykge1xuICAgIGlmICh0eXBlb2Ygdy5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIgJiYgaXNXaWRnZXQodykpIHtcbiAgICAgICAgdy5kZXN0cm95KGRvbU5vZGUpXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW9yZGVyQ2hpbGRyZW4oZG9tTm9kZSwgYkluZGV4KSB7XG4gICAgdmFyIGNoaWxkcmVuID0gW11cbiAgICB2YXIgY2hpbGROb2RlcyA9IGRvbU5vZGUuY2hpbGROb2Rlc1xuICAgIHZhciBsZW4gPSBjaGlsZE5vZGVzLmxlbmd0aFxuICAgIHZhciBpXG4gICAgdmFyIHJldmVyc2VJbmRleCA9IGJJbmRleC5yZXZlcnNlXG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY2hpbGRyZW4ucHVzaChkb21Ob2RlLmNoaWxkTm9kZXNbaV0pXG4gICAgfVxuXG4gICAgdmFyIGluc2VydE9mZnNldCA9IDBcbiAgICB2YXIgbW92ZVxuICAgIHZhciBub2RlXG4gICAgdmFyIGluc2VydE5vZGVcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgbW92ZSA9IGJJbmRleFtpXVxuICAgICAgICBpZiAobW92ZSAhPT0gdW5kZWZpbmVkICYmIG1vdmUgIT09IGkpIHtcbiAgICAgICAgICAgIC8vIHRoZSBlbGVtZW50IGN1cnJlbnRseSBhdCB0aGlzIGluZGV4IHdpbGwgYmUgbW92ZWQgbGF0ZXIgc28gaW5jcmVhc2UgdGhlIGluc2VydCBvZmZzZXRcbiAgICAgICAgICAgIGlmIChyZXZlcnNlSW5kZXhbaV0gPiBpKSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0T2Zmc2V0KytcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbm9kZSA9IGNoaWxkcmVuW21vdmVdXG4gICAgICAgICAgICBpbnNlcnROb2RlID0gY2hpbGROb2Rlc1tpICsgaW5zZXJ0T2Zmc2V0XSB8fCBudWxsXG4gICAgICAgICAgICBpZiAobm9kZSAhPT0gaW5zZXJ0Tm9kZSkge1xuICAgICAgICAgICAgICAgIGRvbU5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGluc2VydE5vZGUpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRoZSBtb3ZlZCBlbGVtZW50IGNhbWUgZnJvbSB0aGUgZnJvbnQgb2YgdGhlIGFycmF5IHNvIHJlZHVjZSB0aGUgaW5zZXJ0IG9mZnNldFxuICAgICAgICAgICAgaWYgKG1vdmUgPCBpKSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0T2Zmc2V0LS1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVsZW1lbnQgYXQgdGhpcyBpbmRleCBpcyBzY2hlZHVsZWQgdG8gYmUgcmVtb3ZlZCBzbyBpbmNyZWFzZSBpbnNlcnQgb2Zmc2V0XG4gICAgICAgIGlmIChpIGluIGJJbmRleC5yZW1vdmVzKSB7XG4gICAgICAgICAgICBpbnNlcnRPZmZzZXQrK1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZXBsYWNlUm9vdChvbGRSb290LCBuZXdSb290KSB7XG4gICAgaWYgKG9sZFJvb3QgJiYgbmV3Um9vdCAmJiBvbGRSb290ICE9PSBuZXdSb290ICYmIG9sZFJvb3QucGFyZW50Tm9kZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhvbGRSb290KVxuICAgICAgICBvbGRSb290LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld1Jvb3QsIG9sZFJvb3QpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld1Jvb3Q7XG59XG4iLCJ2YXIgZG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoXCJ4LWlzLWFycmF5XCIpXG5cbnZhciBkb21JbmRleCA9IHJlcXVpcmUoXCIuL2RvbS1pbmRleFwiKVxudmFyIHBhdGNoT3AgPSByZXF1aXJlKFwiLi9wYXRjaC1vcFwiKVxubW9kdWxlLmV4cG9ydHMgPSBwYXRjaFxuXG5mdW5jdGlvbiBwYXRjaChyb290Tm9kZSwgcGF0Y2hlcykge1xuICAgIHJldHVybiBwYXRjaFJlY3Vyc2l2ZShyb290Tm9kZSwgcGF0Y2hlcylcbn1cblxuZnVuY3Rpb24gcGF0Y2hSZWN1cnNpdmUocm9vdE5vZGUsIHBhdGNoZXMsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgaW5kaWNlcyA9IHBhdGNoSW5kaWNlcyhwYXRjaGVzKVxuXG4gICAgaWYgKGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByb290Tm9kZVxuICAgIH1cblxuICAgIHZhciBpbmRleCA9IGRvbUluZGV4KHJvb3ROb2RlLCBwYXRjaGVzLmEsIGluZGljZXMpXG4gICAgdmFyIG93bmVyRG9jdW1lbnQgPSByb290Tm9kZS5vd25lckRvY3VtZW50XG5cbiAgICBpZiAoIXJlbmRlck9wdGlvbnMpIHtcbiAgICAgICAgcmVuZGVyT3B0aW9ucyA9IHsgcGF0Y2g6IHBhdGNoUmVjdXJzaXZlIH1cbiAgICAgICAgaWYgKG93bmVyRG9jdW1lbnQgIT09IGRvY3VtZW50KSB7XG4gICAgICAgICAgICByZW5kZXJPcHRpb25zLmRvY3VtZW50ID0gb3duZXJEb2N1bWVudFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbmRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBub2RlSW5kZXggPSBpbmRpY2VzW2ldXG4gICAgICAgIHJvb3ROb2RlID0gYXBwbHlQYXRjaChyb290Tm9kZSxcbiAgICAgICAgICAgIGluZGV4W25vZGVJbmRleF0sXG4gICAgICAgICAgICBwYXRjaGVzW25vZGVJbmRleF0sXG4gICAgICAgICAgICByZW5kZXJPcHRpb25zKVxuICAgIH1cblxuICAgIHJldHVybiByb290Tm9kZVxufVxuXG5mdW5jdGlvbiBhcHBseVBhdGNoKHJvb3ROb2RlLCBkb21Ob2RlLCBwYXRjaExpc3QsIHJlbmRlck9wdGlvbnMpIHtcbiAgICBpZiAoIWRvbU5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHJvb3ROb2RlXG4gICAgfVxuXG4gICAgdmFyIG5ld05vZGVcblxuICAgIGlmIChpc0FycmF5KHBhdGNoTGlzdCkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRjaExpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG5ld05vZGUgPSBwYXRjaE9wKHBhdGNoTGlzdFtpXSwgZG9tTm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICAgICAgaWYgKGRvbU5vZGUgPT09IHJvb3ROb2RlKSB7XG4gICAgICAgICAgICAgICAgcm9vdE5vZGUgPSBuZXdOb2RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBuZXdOb2RlID0gcGF0Y2hPcChwYXRjaExpc3QsIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgaWYgKGRvbU5vZGUgPT09IHJvb3ROb2RlKSB7XG4gICAgICAgICAgICByb290Tm9kZSA9IG5ld05vZGVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByb290Tm9kZVxufVxuXG5mdW5jdGlvbiBwYXRjaEluZGljZXMocGF0Y2hlcykge1xuICAgIHZhciBpbmRpY2VzID0gW11cblxuICAgIGZvciAodmFyIGtleSBpbiBwYXRjaGVzKSB7XG4gICAgICAgIGlmIChrZXkgIT09IFwiYVwiKSB7XG4gICAgICAgICAgICBpbmRpY2VzLnB1c2goTnVtYmVyKGtleSkpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaW5kaWNlc1xufVxuIiwidmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcInZ0cmVlL2lzLXdpZGdldFwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHVwZGF0ZVdpZGdldFxuXG5mdW5jdGlvbiB1cGRhdGVXaWRnZXQoYSwgYikge1xuICAgIGlmIChpc1dpZGdldChhKSAmJiBpc1dpZGdldChiKSkge1xuICAgICAgICBpZiAoXCJuYW1lXCIgaW4gYSAmJiBcIm5hbWVcIiBpbiBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYS5pZCA9PT0gYi5pZFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGEuaW5pdCA9PT0gYi5pbml0XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2Vcbn1cbiIsInZhciBpc0FycmF5ID0gcmVxdWlyZShcIngtaXMtYXJyYXlcIilcbnZhciBpc09iamVjdCA9IHJlcXVpcmUoXCJpcy1vYmplY3RcIilcblxudmFyIFZQYXRjaCA9IHJlcXVpcmUoXCIuL3ZwYXRjaFwiKVxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwiLi9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4vaXMtd2lkZ2V0XCIpXG52YXIgaXNUaHVuayA9IHJlcXVpcmUoXCIuL2lzLXRodW5rXCIpXG52YXIgaGFuZGxlVGh1bmsgPSByZXF1aXJlKFwiLi9oYW5kbGUtdGh1bmtcIilcblxubW9kdWxlLmV4cG9ydHMgPSBkaWZmXG5cbmZ1bmN0aW9uIGRpZmYoYSwgYikge1xuICAgIHZhciBwYXRjaCA9IHsgYTogYSB9XG4gICAgd2FsayhhLCBiLCBwYXRjaCwgMClcbiAgICByZXR1cm4gcGF0Y2hcbn1cblxuZnVuY3Rpb24gd2FsayhhLCBiLCBwYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoYSA9PT0gYikge1xuICAgICAgICBpZiAoaXNUaHVuayhhKSB8fCBpc1RodW5rKGIpKSB7XG4gICAgICAgICAgICB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaG9va3MoYiwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBhcHBseSA9IHBhdGNoW2luZGV4XVxuXG4gICAgaWYgKGIgPT0gbnVsbCkge1xuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5SRU1PVkUsIGEsIGIpKVxuICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgfSBlbHNlIGlmIChpc1RodW5rKGEpIHx8IGlzVGh1bmsoYikpIHtcbiAgICAgICAgdGh1bmtzKGEsIGIsIHBhdGNoLCBpbmRleClcbiAgICB9IGVsc2UgaWYgKGlzVk5vZGUoYikpIHtcbiAgICAgICAgaWYgKGlzVk5vZGUoYSkpIHtcbiAgICAgICAgICAgIGlmIChhLnRhZ05hbWUgPT09IGIudGFnTmFtZSAmJlxuICAgICAgICAgICAgICAgIGEubmFtZXNwYWNlID09PSBiLm5hbWVzcGFjZSAmJlxuICAgICAgICAgICAgICAgIGEua2V5ID09PSBiLmtleSkge1xuICAgICAgICAgICAgICAgIHZhciBwcm9wc1BhdGNoID0gZGlmZlByb3BzKGEucHJvcGVydGllcywgYi5wcm9wZXJ0aWVzLCBiLmhvb2tzKVxuICAgICAgICAgICAgICAgIGlmIChwcm9wc1BhdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFZQYXRjaC5QUk9QUywgYSwgcHJvcHNQYXRjaCkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WTk9ERSwgYSwgYikpXG4gICAgICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoYSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhcHBseSA9IGRpZmZDaGlsZHJlbihhLCBiLCBwYXRjaCwgYXBwbHksIGluZGV4KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVk5PREUsIGEsIGIpKVxuICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoYSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1ZUZXh0KGIpKSB7XG4gICAgICAgIGlmICghaXNWVGV4dChhKSkge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVlRFWFQsIGEsIGIpKVxuICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoYSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9IGVsc2UgaWYgKGEudGV4dCAhPT0gYi50ZXh0KSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WVEVYVCwgYSwgYikpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzV2lkZ2V0KGIpKSB7XG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLldJREdFVCwgYSwgYikpXG5cbiAgICAgICAgaWYgKCFpc1dpZGdldChhKSkge1xuICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoYSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFwcGx5KSB7XG4gICAgICAgIHBhdGNoW2luZGV4XSA9IGFwcGx5XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkaWZmUHJvcHMoYSwgYiwgaG9va3MpIHtcbiAgICB2YXIgZGlmZlxuXG4gICAgZm9yICh2YXIgYUtleSBpbiBhKSB7XG4gICAgICAgIGlmICghKGFLZXkgaW4gYikpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2FLZXldID0gdW5kZWZpbmVkXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYVZhbHVlID0gYVthS2V5XVxuICAgICAgICB2YXIgYlZhbHVlID0gYlthS2V5XVxuXG4gICAgICAgIGlmIChob29rcyAmJiBhS2V5IGluIGhvb2tzKSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGlzT2JqZWN0KGFWYWx1ZSkgJiYgaXNPYmplY3QoYlZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGlmIChnZXRQcm90b3R5cGUoYlZhbHVlKSAhPT0gZ2V0UHJvdG90eXBlKGFWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvYmplY3REaWZmID0gZGlmZlByb3BzKGFWYWx1ZSwgYlZhbHVlKVxuICAgICAgICAgICAgICAgICAgICBpZiAob2JqZWN0RGlmZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBvYmplY3REaWZmXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFWYWx1ZSAhPT0gYlZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBiS2V5IGluIGIpIHtcbiAgICAgICAgaWYgKCEoYktleSBpbiBhKSkge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYktleV0gPSBiW2JLZXldXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGlmZlxufVxuXG5mdW5jdGlvbiBnZXRQcm90b3R5cGUodmFsdWUpIHtcbiAgICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5fX3Byb3RvX18pIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLl9fcHJvdG9fX1xuICAgIH0gZWxzZSBpZiAodmFsdWUuY29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZGlmZkNoaWxkcmVuKGEsIGIsIHBhdGNoLCBhcHBseSwgaW5kZXgpIHtcbiAgICB2YXIgYUNoaWxkcmVuID0gYS5jaGlsZHJlblxuICAgIHZhciBiQ2hpbGRyZW4gPSByZW9yZGVyKGFDaGlsZHJlbiwgYi5jaGlsZHJlbilcblxuICAgIHZhciBhTGVuID0gYUNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBiTGVuID0gYkNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBsZW4gPSBhTGVuID4gYkxlbiA/IGFMZW4gOiBiTGVuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBsZWZ0Tm9kZSA9IGFDaGlsZHJlbltpXVxuICAgICAgICB2YXIgcmlnaHROb2RlID0gYkNoaWxkcmVuW2ldXG4gICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICBpZiAoIWxlZnROb2RlKSB7XG4gICAgICAgICAgICBpZiAocmlnaHROb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhjZXNzIG5vZGVzIGluIGIgbmVlZCB0byBiZSBhZGRlZFxuICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksXG4gICAgICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goVlBhdGNoLklOU0VSVCwgbnVsbCwgcmlnaHROb2RlKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghcmlnaHROb2RlKSB7XG4gICAgICAgICAgICBpZiAobGVmdE5vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBFeGNlc3Mgbm9kZXMgaW4gYSBuZWVkIHRvIGJlIHJlbW92ZWRcbiAgICAgICAgICAgICAgICBwYXRjaFtpbmRleF0gPSBuZXcgVlBhdGNoKFZQYXRjaC5SRU1PVkUsIGxlZnROb2RlLCBudWxsKVxuICAgICAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGxlZnROb2RlLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3YWxrKGxlZnROb2RlLCByaWdodE5vZGUsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1ZOb2RlKGxlZnROb2RlKSAmJiBsZWZ0Tm9kZS5jb3VudCkge1xuICAgICAgICAgICAgaW5kZXggKz0gbGVmdE5vZGUuY291bnRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChiQ2hpbGRyZW4ubW92ZXMpIHtcbiAgICAgICAgLy8gUmVvcmRlciBub2RlcyBsYXN0XG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLk9SREVSLCBhLCBiQ2hpbGRyZW4ubW92ZXMpKVxuICAgIH1cblxuICAgIHJldHVybiBhcHBseVxufVxuXG4vLyBQYXRjaCByZWNvcmRzIGZvciBhbGwgZGVzdHJveWVkIHdpZGdldHMgbXVzdCBiZSBhZGRlZCBiZWNhdXNlIHdlIG5lZWRcbi8vIGEgRE9NIG5vZGUgcmVmZXJlbmNlIGZvciB0aGUgZGVzdHJveSBmdW5jdGlvblxuZnVuY3Rpb24gZGVzdHJveVdpZGdldHModk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChpc1dpZGdldCh2Tm9kZSkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2Tm9kZS5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlJFTU9WRSwgdk5vZGUsIG51bGwpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVk5vZGUodk5vZGUpICYmIHZOb2RlLmhhc1dpZGdldHMpIHtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gdk5vZGUuY2hpbGRyZW5cbiAgICAgICAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhjaGlsZCwgcGF0Y2gsIGluZGV4KVxuXG4gICAgICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkgJiYgY2hpbGQuY291bnQpIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSBjaGlsZC5jb3VudFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBDcmVhdGUgYSBzdWItcGF0Y2ggZm9yIHRodW5rc1xuZnVuY3Rpb24gdGh1bmtzKGEsIGIsIHBhdGNoLCBpbmRleCkge1xuICAgIHZhciBub2RlcyA9IGhhbmRsZVRodW5rKGEsIGIpO1xuICAgIHZhciB0aHVua1BhdGNoID0gZGlmZihub2Rlcy5hLCBub2Rlcy5iKVxuICAgIGlmIChoYXNQYXRjaGVzKHRodW5rUGF0Y2gpKSB7XG4gICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlRIVU5LLCBudWxsLCB0aHVua1BhdGNoKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gaGFzUGF0Y2hlcyhwYXRjaCkge1xuICAgIGZvciAodmFyIGluZGV4IGluIHBhdGNoKSB7XG4gICAgICAgIGlmIChpbmRleCAhPT0gXCJhXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBFeGVjdXRlIGhvb2tzIHdoZW4gdHdvIG5vZGVzIGFyZSBpZGVudGljYWxcbmZ1bmN0aW9uIGhvb2tzKHZOb2RlLCBwYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaXNWTm9kZSh2Tm9kZSkpIHtcbiAgICAgICAgaWYgKHZOb2RlLmhvb2tzKSB7XG4gICAgICAgICAgICBwYXRjaFtpbmRleF0gPSBuZXcgVlBhdGNoKFZQYXRjaC5QUk9QUywgdk5vZGUuaG9va3MsIHZOb2RlLmhvb2tzKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZOb2RlLmRlc2NlbmRhbnRIb29rcykge1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gdk5vZGUuY2hpbGRyZW5cbiAgICAgICAgICAgIHZhciBsZW4gPSBjaGlsZHJlbi5sZW5ndGhcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICAgICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICAgICAgICAgIGhvb2tzKGNoaWxkLCBwYXRjaCwgaW5kZXgpXG5cbiAgICAgICAgICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkgJiYgY2hpbGQuY291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gY2hpbGQuY291bnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIExpc3QgZGlmZiwgbmFpdmUgbGVmdCB0byByaWdodCByZW9yZGVyaW5nXG5mdW5jdGlvbiByZW9yZGVyKGFDaGlsZHJlbiwgYkNoaWxkcmVuKSB7XG5cbiAgICB2YXIgYktleXMgPSBrZXlJbmRleChiQ2hpbGRyZW4pXG5cbiAgICBpZiAoIWJLZXlzKSB7XG4gICAgICAgIHJldHVybiBiQ2hpbGRyZW5cbiAgICB9XG5cbiAgICB2YXIgYUtleXMgPSBrZXlJbmRleChhQ2hpbGRyZW4pXG5cbiAgICBpZiAoIWFLZXlzKSB7XG4gICAgICAgIHJldHVybiBiQ2hpbGRyZW5cbiAgICB9XG5cbiAgICB2YXIgYk1hdGNoID0ge30sIGFNYXRjaCA9IHt9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gYktleXMpIHtcbiAgICAgICAgYk1hdGNoW2JLZXlzW2tleV1dID0gYUtleXNba2V5XVxuICAgIH1cblxuICAgIGZvciAodmFyIGtleSBpbiBhS2V5cykge1xuICAgICAgICBhTWF0Y2hbYUtleXNba2V5XV0gPSBiS2V5c1trZXldXG4gICAgfVxuXG4gICAgdmFyIGFMZW4gPSBhQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGJMZW4gPSBiQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGxlbiA9IGFMZW4gPiBiTGVuID8gYUxlbiA6IGJMZW5cbiAgICB2YXIgc2h1ZmZsZSA9IFtdXG4gICAgdmFyIGZyZWVJbmRleCA9IDBcbiAgICB2YXIgaSA9IDBcbiAgICB2YXIgbW92ZUluZGV4ID0gMFxuICAgIHZhciBtb3ZlcyA9IHt9XG4gICAgdmFyIHJlbW92ZXMgPSBtb3Zlcy5yZW1vdmVzID0ge31cbiAgICB2YXIgcmV2ZXJzZSA9IG1vdmVzLnJldmVyc2UgPSB7fVxuICAgIHZhciBoYXNNb3ZlcyA9IGZhbHNlXG5cbiAgICB3aGlsZSAoZnJlZUluZGV4IDwgbGVuKSB7XG4gICAgICAgIHZhciBtb3ZlID0gYU1hdGNoW2ldXG4gICAgICAgIGlmIChtb3ZlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNodWZmbGVbaV0gPSBiQ2hpbGRyZW5bbW92ZV1cbiAgICAgICAgICAgIGlmIChtb3ZlICE9PSBtb3ZlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBtb3Zlc1ttb3ZlXSA9IG1vdmVJbmRleFxuICAgICAgICAgICAgICAgIHJldmVyc2VbbW92ZUluZGV4XSA9IG1vdmVcbiAgICAgICAgICAgICAgICBoYXNNb3ZlcyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1vdmVJbmRleCsrXG4gICAgICAgIH0gZWxzZSBpZiAoaSBpbiBhTWF0Y2gpIHtcbiAgICAgICAgICAgIHNodWZmbGVbaV0gPSB1bmRlZmluZWRcbiAgICAgICAgICAgIHJlbW92ZXNbaV0gPSBtb3ZlSW5kZXgrK1xuICAgICAgICAgICAgaGFzTW92ZXMgPSB0cnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aGlsZSAoYk1hdGNoW2ZyZWVJbmRleF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGZyZWVJbmRleCsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmcmVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICB2YXIgZnJlZUNoaWxkID0gYkNoaWxkcmVuW2ZyZWVJbmRleF1cbiAgICAgICAgICAgICAgICBpZiAoZnJlZUNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNodWZmbGVbaV0gPSBmcmVlQ2hpbGRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyZWVJbmRleCAhPT0gbW92ZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNNb3ZlcyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdmVzW2ZyZWVJbmRleF0gPSBtb3ZlSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldmVyc2VbbW92ZUluZGV4XSA9IGZyZWVJbmRleFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG1vdmVJbmRleCsrXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyZWVJbmRleCsrXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaSsrXG4gICAgfVxuXG4gICAgaWYgKGhhc01vdmVzKSB7XG4gICAgICAgIHNodWZmbGUubW92ZXMgPSBtb3Zlc1xuICAgIH1cblxuICAgIHJldHVybiBzaHVmZmxlXG59XG5cbmZ1bmN0aW9uIGtleUluZGV4KGNoaWxkcmVuKSB7XG4gICAgdmFyIGksIGtleXNcblxuICAgIGZvciAoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuXG4gICAgICAgIGlmIChjaGlsZC5rZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAga2V5cyA9IGtleXMgfHwge31cbiAgICAgICAgICAgIGtleXNbY2hpbGQua2V5XSA9IGlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBrZXlzXG59XG5cbmZ1bmN0aW9uIGFwcGVuZFBhdGNoKGFwcGx5LCBwYXRjaCkge1xuICAgIGlmIChhcHBseSkge1xuICAgICAgICBpZiAoaXNBcnJheShhcHBseSkpIHtcbiAgICAgICAgICAgIGFwcGx5LnB1c2gocGF0Y2gpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcHBseSA9IFthcHBseSwgcGF0Y2hdXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXBwbHlcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcGF0Y2hcbiAgICB9XG59XG4iLCJ2YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCIuL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4vaXMtdGh1bmtcIilcblxubW9kdWxlLmV4cG9ydHMgPSBoYW5kbGVUaHVua1xuXG5mdW5jdGlvbiBoYW5kbGVUaHVuayhhLCBiKSB7XG4gICAgdmFyIHJlbmRlcmVkQSA9IGFcbiAgICB2YXIgcmVuZGVyZWRCID0gYlxuXG4gICAgaWYgKGlzVGh1bmsoYikpIHtcbiAgICAgICAgcmVuZGVyZWRCID0gcmVuZGVyVGh1bmsoYiwgYSlcbiAgICB9XG5cbiAgICBpZiAoaXNUaHVuayhhKSkge1xuICAgICAgICByZW5kZXJlZEEgPSByZW5kZXJUaHVuayhhLCBudWxsKVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGE6IHJlbmRlcmVkQSxcbiAgICAgICAgYjogcmVuZGVyZWRCXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJUaHVuayh0aHVuaywgcHJldmlvdXMpIHtcbiAgICB2YXIgcmVuZGVyZWRUaHVuayA9IHRodW5rLnZub2RlXG5cbiAgICBpZiAoIXJlbmRlcmVkVGh1bmspIHtcbiAgICAgICAgcmVuZGVyZWRUaHVuayA9IHRodW5rLnZub2RlID0gdGh1bmsucmVuZGVyKHByZXZpb3VzKVxuICAgIH1cblxuICAgIGlmICghKGlzVk5vZGUocmVuZGVyZWRUaHVuaykgfHxcbiAgICAgICAgICAgIGlzVlRleHQocmVuZGVyZWRUaHVuaykgfHxcbiAgICAgICAgICAgIGlzV2lkZ2V0KHJlbmRlcmVkVGh1bmspKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0aHVuayBkaWQgbm90IHJldHVybiBhIHZhbGlkIG5vZGVcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbmRlcmVkVGh1bmtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNUaHVua1xyXG5cclxuZnVuY3Rpb24gaXNUaHVuayh0KSB7XHJcbiAgICByZXR1cm4gdCAmJiB0LnR5cGUgPT09IFwiVGh1bmtcIlxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gaXNIb29rXG5cbmZ1bmN0aW9uIGlzSG9vayhob29rKSB7XG4gICAgcmV0dXJuIGhvb2sgJiYgdHlwZW9mIGhvb2suaG9vayA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICFob29rLmhhc093blByb3BlcnR5KFwiaG9va1wiKVxufVxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaXNWaXJ0dWFsTm9kZVxuXG5mdW5jdGlvbiBpc1ZpcnR1YWxOb2RlKHgpIHtcbiAgICByZXR1cm4geCAmJiB4LnR5cGUgPT09IFwiVmlydHVhbE5vZGVcIiAmJiB4LnZlcnNpb24gPT09IHZlcnNpb25cbn1cbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzVmlydHVhbFRleHRcblxuZnVuY3Rpb24gaXNWaXJ0dWFsVGV4dCh4KSB7XG4gICAgcmV0dXJuIHggJiYgeC50eXBlID09PSBcIlZpcnR1YWxUZXh0XCIgJiYgeC52ZXJzaW9uID09PSB2ZXJzaW9uXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzV2lkZ2V0XG5cbmZ1bmN0aW9uIGlzV2lkZ2V0KHcpIHtcbiAgICByZXR1cm4gdyAmJiB3LnR5cGUgPT09IFwiV2lkZ2V0XCJcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCIxXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi9pcy12bm9kZVwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4vaXMtd2lkZ2V0XCIpXG52YXIgaXNWSG9vayA9IHJlcXVpcmUoXCIuL2lzLXZob29rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbE5vZGVcblxudmFyIG5vUHJvcGVydGllcyA9IHt9XG52YXIgbm9DaGlsZHJlbiA9IFtdXG5cbmZ1bmN0aW9uIFZpcnR1YWxOb2RlKHRhZ05hbWUsIHByb3BlcnRpZXMsIGNoaWxkcmVuLCBrZXksIG5hbWVzcGFjZSkge1xuICAgIHRoaXMudGFnTmFtZSA9IHRhZ05hbWVcbiAgICB0aGlzLnByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzIHx8IG5vUHJvcGVydGllc1xuICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbiB8fCBub0NoaWxkcmVuXG4gICAgdGhpcy5rZXkgPSBrZXkgIT0gbnVsbCA/IFN0cmluZyhrZXkpIDogdW5kZWZpbmVkXG4gICAgdGhpcy5uYW1lc3BhY2UgPSAodHlwZW9mIG5hbWVzcGFjZSA9PT0gXCJzdHJpbmdcIikgPyBuYW1lc3BhY2UgOiBudWxsXG5cbiAgICB2YXIgY291bnQgPSAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKSB8fCAwXG4gICAgdmFyIGRlc2NlbmRhbnRzID0gMFxuICAgIHZhciBoYXNXaWRnZXRzID0gZmFsc2VcbiAgICB2YXIgZGVzY2VuZGFudEhvb2tzID0gZmFsc2VcbiAgICB2YXIgaG9va3NcblxuICAgIGZvciAodmFyIHByb3BOYW1lIGluIHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKHByb3BlcnRpZXMuaGFzT3duUHJvcGVydHkocHJvcE5hbWUpKSB7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHkgPSBwcm9wZXJ0aWVzW3Byb3BOYW1lXVxuICAgICAgICAgICAgaWYgKGlzVkhvb2socHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFob29rcykge1xuICAgICAgICAgICAgICAgICAgICBob29rcyA9IHt9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaG9va3NbcHJvcE5hbWVdID0gcHJvcGVydHlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkpIHtcbiAgICAgICAgICAgIGRlc2NlbmRhbnRzICs9IGNoaWxkLmNvdW50IHx8IDBcblxuICAgICAgICAgICAgaWYgKCFoYXNXaWRnZXRzICYmIGNoaWxkLmhhc1dpZGdldHMpIHtcbiAgICAgICAgICAgICAgICBoYXNXaWRnZXRzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRlc2NlbmRhbnRIb29rcyAmJiAoY2hpbGQuaG9va3MgfHwgY2hpbGQuZGVzY2VuZGFudEhvb2tzKSkge1xuICAgICAgICAgICAgICAgIGRlc2NlbmRhbnRIb29rcyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghaGFzV2lkZ2V0cyAmJiBpc1dpZGdldChjaGlsZCkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2hpbGQuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgaGFzV2lkZ2V0cyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY291bnQgPSBjb3VudCArIGRlc2NlbmRhbnRzXG4gICAgdGhpcy5oYXNXaWRnZXRzID0gaGFzV2lkZ2V0c1xuICAgIHRoaXMuaG9va3MgPSBob29rc1xuICAgIHRoaXMuZGVzY2VuZGFudEhvb2tzID0gZGVzY2VuZGFudEhvb2tzXG59XG5cblZpcnR1YWxOb2RlLnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbE5vZGUucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxOb2RlXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5WaXJ0dWFsUGF0Y2guTk9ORSA9IDBcblZpcnR1YWxQYXRjaC5WVEVYVCA9IDFcblZpcnR1YWxQYXRjaC5WTk9ERSA9IDJcblZpcnR1YWxQYXRjaC5XSURHRVQgPSAzXG5WaXJ0dWFsUGF0Y2guUFJPUFMgPSA0XG5WaXJ0dWFsUGF0Y2guT1JERVIgPSA1XG5WaXJ0dWFsUGF0Y2guSU5TRVJUID0gNlxuVmlydHVhbFBhdGNoLlJFTU9WRSA9IDdcblZpcnR1YWxQYXRjaC5USFVOSyA9IDhcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsUGF0Y2hcblxuZnVuY3Rpb24gVmlydHVhbFBhdGNoKHR5cGUsIHZOb2RlLCBwYXRjaCkge1xuICAgIHRoaXMudHlwZSA9IE51bWJlcih0eXBlKVxuICAgIHRoaXMudk5vZGUgPSB2Tm9kZVxuICAgIHRoaXMucGF0Y2ggPSBwYXRjaFxufVxuXG5WaXJ0dWFsUGF0Y2gucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsUGF0Y2gucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxQYXRjaFwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsVGV4dFxuXG5mdW5jdGlvbiBWaXJ0dWFsVGV4dCh0ZXh0KSB7XG4gICAgdGhpcy50ZXh0ID0gU3RyaW5nKHRleHQpXG59XG5cblZpcnR1YWxUZXh0LnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbFRleHQucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxUZXh0XCJcbiIsInZhciBuYXRpdmVJc0FycmF5ID0gQXJyYXkuaXNBcnJheVxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5hdGl2ZUlzQXJyYXkgfHwgaXNBcnJheVxuXG5mdW5jdGlvbiBpc0FycmF5KG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIlxufVxuIiwidmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzU3RyaW5nXG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBTdHJpbmddXCJcbn1cbiIsInZhciBwYXRjaCA9IHJlcXVpcmUoXCJ2ZG9tL3BhdGNoXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gcGF0Y2hcbiJdfQ==
