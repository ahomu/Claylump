'use strict';

var h          = require('virtual-dom/h');
var diff       = require('virtual-dom/diff');
var patch      = require('virtual-dom/patch');
var htmlparser = require("htmlparser");
var helper     = require("./helper");
var create     = require('virtual-dom/create-element');

var REX_INTERPOLATE  = /\{\{[^{}]*}}/g;
var REX_ESCAPE_START = /{{/g;
var REX_ESCAPE_END   = /}}/g;

module.exports = {
  /**
   * @param {String} html
   * @param {Object} scope
   * @returns {ClayTemplate}
   */
  create: function(html, scope) {
    return new ClayTemplate(html, scope);
  }
};

/**
 *
 * @param {String} html
 * @param {Object} scope
 * @constructor
 */
function ClayTemplate(html, scope) {
  this.tmpl  = html;
  this.scope = scope;

  this.handler = new htmlparser.DefaultHandler(function (err, dom) {
    if (err) {
      console.error(err);
    }
  }, {
    enforceEmptyTags : true,
    ignoreWhitespace : true,
    verbose          : false
  });
  this.parser = new htmlparser.Parser(this.handler);

  this.init();
}

helper.mix(ClayTemplate.prototype, {
  /**
   * @property {Object} scope
   */
  scope: {},
  /**
   * @property {String} tmpl
   */
  tmpl: '',
  /**
   * @property {Object} struct
   */
  struct: {},
  /**
   * @property {Function} parser
   */
  perser: null,
  /**
   * @property {Function} handler
   */
  handler : null,
  /**
   * @property {VTree} currentVTree
   */
  currentVTree: null,
  /**
   * @property {Array} diffQueue
   */
  diffQueue: [],
  /**
   *
   */
  init: function() {
    this.parseHtml();
    this.observeScope()
  },
  /**
   *
   */
  parseHtml: function() {
    console.time('parse html');
    this.parser.parseComplete(this.tmpl);
    console.timeEnd('parse html');

    if (this.handler.dom.length > 1) {
      throw Error('Template must have exactly one root element. was: ' + this.tmpl);
    }

    return this.struct = this.handler.dom[0];
  },
  /**
   * @property {Object} rootObserveTarget
   */
  rootObserveTarget: {},
  /**
   *
   */
  observeScope: function() {
    // TODO refactor
    var matches = this.tmpl.match(REX_INTERPOLATE),
        uniq = {}, i = 0, symbol;

    if (matches === null) {
      return;
    }

    // unique list
    while ((symbol = matches[i++])) {
      symbol = symbol.slice(2, -2); // '{{foo.bar}}' -> 'foo.bar'
      if (!uniq[symbol]) {
        uniq[symbol] = true;
      }
    }

    // interpolate path
    Object.keys(uniq).map(function(symbolPath) {
      var host     = this.scope,
          tokens   = symbolPath.split('.'),
          observer = this.invalidate.bind(this);

      if (tokens.length > 1) {
        // observe host object

        // remove target property name;
        tokens.splice(-1);

        // fill object
        var i = 0, token;
        while ((token = tokens[i++])) {
          host[token] || (host[token] = {});
          host = host[token];
        }

        // avoid duplicate observe
        if (!host.__observed) {
          host.__observed = true;
          Object.observe(host, observer);
        }
      } else {
        // register root target prop
        this.rootObserveTarget[tokens[0]] = true;
      }
    }.bind(this));

    // observe root scope
    Object.observe(this.scope, function(changes) {
      var i = 0, prop;
      while ((prop = changes[i++])) {
        if (this.rootObserveTarget[prop.name]) {
          this.invalidate();
          break;
        }

      }
    }.bind(this));
  },

  /**
   * @returns {VTree}
   */
  createVTree: function() {
    console.time('convert vtree');
    var ret = this.currentVTree = this.convertParsedDomToVTree(this.struct);
    console.timeEnd('convert vtree');
    return ret;
  },
  /**
   */
  createElement: function(doc) {
    return create(this.createVTree(), {
      document: doc
    });
  },
  /**
   * @property {Boolean} _invalidated
   */
  _invalidated: false,
  /**
   *
   */
  invalidate: function() {
    if (this._invalidated) {
      return;
    }
    this._invalidated = true;
    setTimeout(this._update.bind(this), 4);
  },
  /**
   *
   */
  _update: function() {
    var current = this.currentVTree,
        updated = this.convertParsedDomToVTree(this.struct);

    console.time('compute diff');
    this.diffQueue = diff(current, updated);
    console.timeEnd('compute diff');
    this.currentVTree = updated;

    this._invalidated = false;
  },
  /**
   *
   * @param {Element} targetRoot
   */
  drawLoop: function(targetRoot) {
    var patchDOM = function() {
      if (this.diffQueue) {
        console.time('apply patch');
        patch(targetRoot, this.diffQueue);
        console.timeEnd('apply patch');
        this.diffQueue = null;
      }
      window.requestAnimationFrame(patchDOM);
    }.bind(this);

    patchDOM();
  },
  /**
   *
   */
  destroy: function() {
    this.scope = this.tmpl = this.struct = this.parser = this.handler = null;
  },
  /**
   *
   * @param {Object} dom
   * @returns {*}
   */
  convertParsedDomToVTree : function(dom) {
    var tag      = dom.name,
        type     = dom.type,
        data     = dom.data,
        orgAttrs = dom.attribs || {},
        children = dom.children || [],
        attrs    = {},
        style    = {},
        keys, key, i = 0;

    switch(type) {
      case 'tag':
        // styles
        if (orgAttrs.style) {
          style = applyInterpolateValues(orgAttrs.style, this.scope);
          style = convertCssStringToObject(style);
        }

        // attributes
        keys = Object.keys(orgAttrs);
        while ((key = keys[i++])) {
          attrs[key] = applyInterpolateValues(orgAttrs[key], this.scope);
        }

        // create vtree
        return h(tag, {
            attributes : attrs,
            style      : style
          },
          children.map(this.convertParsedDomToVTree, this).filter(function(v) { return !!v; })
        );
        break;

      case 'text':
        data = applyInterpolateValues(data, this.scope);
        return String(data);
        break;

      case 'comment':
        // TODO create comment node?
        return null;
        break;
    }
  }
});

function applyInterpolateValues(str, obj) {
  var matches = str.match(REX_INTERPOLATE),
      i = 0, needle, path, value;

  if (matches) {
    while ((needle = matches[i++])) {
      path  = needle.slice(2, -2); // '{{foo.bar}}' -> 'foo.bar'
      value = getValueFromDottedPath(path, obj);
      str = str.replace(needle, escapeInterpolateSymbol(value));
    }
  }
  return str;
}

function escapeInterpolateSymbol(text) {
  return text.replace(REX_ESCAPE_START, '\\{\\{').replace(REX_ESCAPE_END, '\\}\\}');
}

// TODO add cache map?
function getValueFromDottedPath(path, obj) {
  var stack = path.split('.'),
      ret   = obj,
      i = 0, key;

  while ((key = stack[i++])) {
    ret = ret[key];
    if (ret == null) { // undefined || null
      ret = '';
      break;
    }
  }
  return ret;
}

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
