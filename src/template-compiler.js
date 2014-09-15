'use strict';

var helper     = require("./helper");
var tmplHelper = require("./template-helper");
var htmlParser = require("htmlParser");

var REX_INTERPOLATE_SYMBOL = /{{[^{}]+}}/g,
    REX_REPEAT_SYMBOL      = /{{(\w+)\sin\s([\w\.]+)}}/,
    STR_REPEAT_ATTRIBUTE   = 'cl-repeat';

/**
 * @class ClayTemplateCompiler
 */
module.exports = {
  /**
   * @static
   * @param {String} html
   * @returns {ClayTemplateCompiler}
   */
  create: function(html) {
    return new ClayTemplateCompiler(html);
  }
};

/**
 * @param {String} html
 * @constructor
 */
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

helper.mix(ClayTemplateCompiler.prototype, {
  /**
   @typedef {Object} DomStructure
   @property {?String} data
   @property {Object.<string, string>} attribs
   @property {String} style
   @property {Object.<string, function>} hooks
   @property {Object} evaluators
   @property {Object.<string, function>} evaluators.attrs
   @property {?Function} evaluators.style
   @property {?Function} evaluators.data
   @property {?Function} evaluators.repeat
   @property {Array} children
   */

  /**
   * parsed DOM structure
   * @property {DomStructure}
   */
  structure: {},

  /**
   *
   * @returns {DomStructure}
   */
  getCompiled: function() {
    return this.structure;
  }
});

/**
 * @destructive
 * @param {Object} domStructure
 */
function compileDomStructure(domStructure) {
  domStructure = domStructure || {};
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
    delete attrs.style;
    evals.style = compileValue(domStructure.style);
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
      delete attrs[STR_REPEAT_ATTRIBUTE];
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

  return domStructure
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

/**
 * hook class
 * @class HookWrapper
 * @param {Function} fn
 * @constructor
 */
function HookWrapper(fn) {
  this.fn = fn
}

HookWrapper.prototype.hook = function () {
  this.fn.apply(this, arguments)
};

/**
 * @param {Function} fn
 * @returns {HookWrapper}
 * @constructor
 */
function hook(fn) {
  return new HookWrapper(fn)
}
