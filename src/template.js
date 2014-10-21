'use strict';

import * as h       from 'virtual-dom/h';
import * as diff    from 'virtual-dom/diff';
import * as patch   from 'virtual-dom/patch';
import * as create  from 'virtual-dom/create-element';

import helper       from "./helper";
import tmplCompiler from "./template-compiler";
import tmplHelper   from "./template-helper";

window.requestAnimationFrame  = window.requestAnimationFrame ||
                                window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame;

var STR_EVAL_FUNCTION_SYMBOL = '__EVAL_FUNCTION__';

export default {
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
 * @class ClayTemplate
 */
class ClayTemplate {

  /**
   *
   * @param {String} html
   * @param {Object} [scope]
   * @constructor
   */
  constructor(html, scope = {}) {
    this._diffQueue   = [];
    this._invalidated = false;

    this.scope    = scope;

    // TODO separate compile process
    var compiler   = tmplCompiler.create();
    try {
      this.compiled = JSON.parse(html, function(key, val) {
        if ((val || {})[STR_EVAL_FUNCTION_SYMBOL]) {
          return helper.invoke(Function, val.args);
        }
        return val;
      });
    } catch(e) {
      this.compiled = compiler.compileFromHtml(html);
    }
  }

  /**
   * @property {Object} scope
   */

  /**
   * compiled DOM structure
   * @property {DomStructure} compiled
   */

  /**
   * @private
   * @property {VirtualNode} _currentVTree
   */

  /**
   * @private
   * @property {Array} _diffQueue
   */

  /**
   * @private
   * @property {Boolean} _invalidated
   */

  /**
   * create VirtualNode from compiled DomStructure & given scope
   *
   * @returns {VirtualNode}
   */
  createVTree() {
    return this._currentVTree = convertParsedDomToVTree(this.compiled, this.scope);
  }

  /**
   * create Element from VirtualNode
   *
   * @param {Document} [doc]
   * @returns {?Element}
   */
  createElement(doc = document) {
    return create(this.createVTree(), {
      document: doc
    });
  }

  /**
   * invalidate scope VirtualNode needs updating diff
   * No matter how many times as was called
   * it is called only once in browser's next event loop
   */
  invalidate() {
    if (this._invalidated) {
      return;
    }
    this._invalidated = true;
    setTimeout(this._update.bind(this), 4);
  }

  /**
   * compute VirtualNode diff
   *
   * @private
   */
  _update() {
    var current = this._currentVTree,
        updated = convertParsedDomToVTree(this.compiled, this.scope);

    this._diffQueue = diff(current, updated);
    this._currentVTree = updated;

    this._invalidated = false;
  }

  /**
   * drawing requestAnimationFrame loop
   * apply patch for dom when diff exists
   *
   * @param {Element} targetRoot
   */
  drawLoop(targetRoot) {
    var patchDOM = ()=> {
      if (this._diffQueue) {
        patch(targetRoot, this._diffQueue);
        this._diffQueue = null;
      }
      window.requestAnimationFrame(patchDOM);
    };

    patchDOM();
  }

  /**
   * destruct property references
   */
  destroy() {
    this.scope = this.compiled = null;
  }
}

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

      // repeat elements
      if (evals.repeat && !ignoreRepeat) {
        return evals.repeat(scope).map(childScope => convertParsedDomToVTree(dom, childScope, true));
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
        if (tmplHelper[key]) {
          hooks[key] = hook(tmplHelper[key]); // TODO enhancement
        } else {
          attrs[key] = evals.attrs[key] ? evals.attrs[key](scope)
                                        : orgAttrs[key];
        }
      }

      // flatten children
      children = children.map(child => convertParsedDomToVTree(child, scope))
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

/**
 * hook class
 * @class HookWrapper
 * @param {Function} fn
 * @constructor
 */
class HookWrapper {

  constructor(fn) {
    this.fn = fn
  }

  hook() {
    this.fn.apply(this, arguments)
  }
}

/**
 * @param {Function} fn
 * @returns {HookWrapper}
 * @constructor
 */
function hook(fn) {
  return new HookWrapper(fn)
}
