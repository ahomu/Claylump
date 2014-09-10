'use strict';

var h            = require('virtual-dom/h');
var diff         = require('virtual-dom/diff');
var patch        = require('virtual-dom/patch');
var htmlParser   = require("htmlParser");
var helper       = require("./helper");
var tmplCompiler = require("./template-compiler");
var create       = require('virtual-dom/create-element');

var REX_INTERPOLATE  = /{{[^{}]+}}/g;

/**
 * TODO refactor & improve performance
 * @class ClayTemplate
 */
module.exports = {
  /**
   * @static
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

  this.handler = new htmlParser.DefaultHandler(function (err, dom) {
    if (err) {
      console.error(err);
    }
  }, {
    enforceEmptyTags : true,
    ignoreWhitespace : true,
    verbose          : false
  });
  this.parser = new htmlParser.Parser(this.handler);

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
   * Parsed DOM structure
   * @property {Object} struct
   */
  struct: {},

  /**
   * @property {Function} parser
   */
  parser: null,

  /**
   * @property {Function} handler
   */
  handler : null,

  /**
   * @private
   * @property {VTree} _currentVTree
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
   *
   */
  init: function() {
    this.parseHtml();
    this.observeScope();
    this.compileStructure()
  },

  /**
   * compile dom structure
   */
  compileStructure: function() {
    tmplCompiler.exec(this.struct);
  },

  /**
   * parse html string
   * restrict should be one root element
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
    // @see https://github.com/Polymer/observe-js
    var observer = new CompoundObserver();
    Object.keys(uniq).map(function(symbolPath) {
      var host     = this.scope,
          tokens   = symbolPath.split('.');

      if (tokens.length > 1) {
        // remove target property name;
        tokens.splice(-1);

        // fill object
        var i = 0, token;
        while ((token = tokens[i++])) {
          host[token] || (host[token] = {});
          host = host[token];
        }
      }

      // add observe path
      observer.addPath(this.scope, symbolPath);

    }.bind(this));

    observer.open(this.invalidate.bind(this));
  },

  /**
   * @returns {VTree}
   */
  createVTree: function() {
    console.time('compute vtree');
    var ret = this._currentVTree = convertParsedDomToVTree(this.struct, this.scope);
    console.timeEnd('compute vtree');
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
    console.time('compute vtree');
    var current = this._currentVTree,
        updated = convertParsedDomToVTree(this.struct, this.scope);
    console.timeEnd('compute vtree');

    console.time('compute diff');
    this._diffQueue = diff(current, updated);
    console.timeEnd('compute diff');
    this._currentVTree = updated;

    this._invalidated = false;
  },

  /**
   *
   * @param {Element} targetRoot
   */
  drawLoop: function(targetRoot) {
    var patchDOM = function() {
      if (this._diffQueue) {
        console.time('apply patch');
        patch(targetRoot, this._diffQueue);
        console.timeEnd('apply patch');
        this._diffQueue = null;
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
  }
});

/**
 *
 * @param {Object} dom
 * @param {Object} scope
 * @param {Boolean} [ignoreRepeat]
 * @returns {Object|Array}
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
