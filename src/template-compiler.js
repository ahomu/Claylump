'use strict';

var helper     = require("./helper");
var tmplHelper = require("./template-helper");

var REX_INTERPOLATE = /{{[^{}]+}}/g;
var REX_REPEAT_FORM = /{{(\w+)\sin\s([\w\.]+)}}/;
var ATTR_REPEAT     = 'cl-repeat';

module.exports = {
  exec: function(dom) {
    compileDomStructure(dom);
  }
};

/**
 * @destructive
 * @param {Object} dom
 */
function compileDomStructure(dom) {
  var data     = dom.data,
      attrs    = dom.attribs    || {},
      children = dom.children   || [],
      hooks    = dom.hooks      = {},
      evals    = dom.evaluators = {
        attrs  : {},
        style  : false,
        data   : false,
        repeat : false
      },
      keys, key, i = 0;

  // styles evaluator
  if (attrs.style) {
    dom.style = attrs.style;
    delete attrs.style;
    evals.style = compileValue(attrs.style);
  }

  // attributes evaluator & hook
  keys = Object.keys(attrs);
  while ((key = keys[i++])) {
    // hook
    if (tmplHelper[key]) {
      hooks[key] = hook(tmplHelper[key]);
    }
    // repeat
    else if (key === ATTR_REPEAT) {
      evals.repeat = compileRepeatExpresison(attrs[ATTR_REPEAT]);
      delete attrs[ATTR_REPEAT];
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
}

/**
 * @param {String} str
 * @returns {Function|Null}
 */
function compileValue(str) {
  var matches = (str || '').match(REX_INTERPOLATE);

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

function compileRepeatExpresison(repeatExpr) {
  var matches = (repeatExpr || '').match(REX_REPEAT_FORM),
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
