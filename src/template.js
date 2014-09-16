'use strict';

var h            = require('virtual-dom/h');
var diff         = require('virtual-dom/diff');
var patch        = require('virtual-dom/patch');
var helper       = require("./helper");
var tmplCompiler = require("./template-compiler");
var create       = require('virtual-dom/create-element');

window.requestAnimationFrame  = window.requestAnimationFrame ||
                                window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame;

/**
 * @class ClayTemplate
 */
module.exports = {
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

/**
 *
 * @param {String} html
 * @param {Object} [scope]
 * @constructor
 */
function ClayTemplate(html, scope) {
  this.scope = scope || {};

  this.compiled = tmplCompiler.create(html).getCompiled();
}

helper.mix(ClayTemplate.prototype, {

  /**
   * @property {Object} scope
   */
  scope: {},

  /**
   * compiled DOM structure
   * @property {DomStructure} compiled
   */
  compiled: null,

  /**
   * @private
   * @property {VirtualNode} _currentVTree
   */
  _currentVTree: null,

  /**
   * @private
   * @property {Array} _diffQueue
   */
  _diffQueue: [],

  /**
   * @private
   * @property {Boolean} _invalidated
   */
  _invalidated: false,

  /**
   * create VirtualNode from compiled DomStructure & given scope
   *
   * @returns {VirtualNode}
   */
  createVTree: function() {
    console.time('compute vtree');
    var ret = this._currentVTree = convertParsedDomToVTree(this.compiled, this.scope);
    console.timeEnd('compute vtree');
    return ret;
  },

  /**
   * create Element from VirtualNode
   *
   * @param {Document} [doc]
   * @returns {?Element}
   */
  createElement: function(doc) {
    return create(this.createVTree(), {
      document: doc || document
    });
  },

  /**
   * invalidate scope VirtualNode needs updating diff
   * No matter how many times as was called
   * it is called only once in browser's next event loop
   */
  invalidate: function() {
    if (this._invalidated) {
      return;
    }
    this._invalidated = true;
    setTimeout(this._update.bind(this), 4);
  },

  /**
   * compute VirtualNode diff
   *
   * @private
   */
  _update: function() {
    console.time('compute vtree');
    var current = this._currentVTree,
        updated = convertParsedDomToVTree(this.compiled, this.scope);
    console.timeEnd('compute vtree');

    this._diffQueue = diff(current, updated);
    this._currentVTree = updated;

    this._invalidated = false;
  },

  /**
   * drawing requestAnimationFrame loop
   * apply patch for dom when diff exists
   *
   * @param {Element} targetRoot
   */
  drawLoop: function(targetRoot) {
    var patchDOM = function() {
      if (this._diffQueue) {
        patch(targetRoot, this._diffQueue);
        this._diffQueue = null;
      }
      window.requestAnimationFrame(patchDOM);
    }.bind(this);

    patchDOM();
  },

  /**
   * destruct property references
   */
  destroy: function() {
    this.scope = this.compiled = null;
  }
});

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
          return convertParsedDomToVTree(dom, childScope, true)
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
