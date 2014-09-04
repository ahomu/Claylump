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
   * @returns {VTree}
   */
  computeVtree: function() {
    console.time('convert vtree');
    var ret = this.currentVTree = this.convertParsedDomToVTree(this.struct);
    console.timeEnd('convert vtree');
    return ret;
  },
  /**
   */
  createElement: function(doc) {
    return create(this.computeVtree(), {
      document: doc
    });
  },
  /**
   *
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
        attrs    = dom.attribs || {},
        children = dom.children || [],
        style    = {},
        keys, key, i = 0;

    switch(type) {
      case 'tag':
        // styles
        if (attrs.style) {
          style = applyInterpolateValues(data, this.scope);
          style = convertCssStringToObject(style);
          delete attrs.style;
        }

        // attributes
        keys = Object.keys(attrs);
        while ((key = keys[i++])) {
          attrs[key] = applyInterpolateValues(attrs[key], this.scope);
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
