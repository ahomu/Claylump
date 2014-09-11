'use strict';

var constants  = require("./constants");
var helper     = require("./helper");
var tmplHelper = require("./template-helper");
var htmlParser = require("htmlParser");

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

  console.time('parse html');
  parser.parseComplete(html);
  console.timeEnd('parse html');

  if (handler.dom.length > 1) {
    throw Error('Template must have exactly one root element. was: ' + html);
  }

  this.structure = handler.dom[0];
}

helper.mix(ClayTemplateCompiler.prototype, {
  /**
   * parsed DOM structure
   * @property
   */
  structure: {},

  /**
   *
   * @returns {Object}
   */
  compile: function() {
    return compileDomStructure(this.structure);
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
        style  : false,
        data   : false,
        repeat : false
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
    else if (key === constants.STR_REPEAT_ATTRIBUTE) {
      evals.repeat = compileRepeatExpression(attrs[constants.STR_REPEAT_ATTRIBUTE]);
      delete attrs[constants.STR_REPEAT_ATTRIBUTE];
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
 * @returns {Function|Null}
 */
function compileValue(str) {
  str = (str || '');
  var matches = str.match(constants.REX_INTERPOLATE_SYMBOL);

  if (matches === null) {
    return;
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
  var matches = (repeatExpr || '').match(constants.REX_REPEAT_SYMBOL),
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
