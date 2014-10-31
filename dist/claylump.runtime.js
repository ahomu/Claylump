(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var ClayCompiler = require('./template-compiler').default;
var helper = require('./helper').default;

/**
 * @class ClayRuntime
 * @type {Object}
 */
window.ClayRuntime = {
  compiler: ClayCompiler
};

},{"./helper":2,"./template-compiler":3}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
'use strict';

var helper = require("./helper").default;
var htmlParser = require("htmlParser");

var REX_INTERPOLATE_SYMBOL = /{{[^{}]+}}/g;
var REX_REPEAT_SYMBOL      = /{{(\w+)\sin\s([\w\.]+)}}/;
var STR_REPEAT_ATTRIBUTE   = 'cl-repeat';
var STR_IF_ATTRIBUTE       = 'cl-if';
var STR_UNLESS_ATTRIBUTE   = 'cl-unless';
var STR_EVAL_FUNCTION_SYMBOL = '__EVAL_FUNCTION__';

exports.default = {
  /**
   * @static
   * @returns {ClayTemplateCompiler}
   */
  create: function() {
    return new ClayTemplateCompiler();
  }
};

var ClayTemplateCompiler = function() {
  var ClayTemplateCompiler = function ClayTemplateCompiler() // noop
  {
    // noop
  };

  Object.defineProperties(ClayTemplateCompiler.prototype, {
    compileFromHtml: {
      writable: true,

      value: function(html) {
        var parsed = this.parseHtml(html);
        this.preCompile = false;
        return this.compileDomStructure(parsed);
      }
    },

    serializeFromHtml: {
      writable: true,

      value: function(html) {
        var parsed = this.parseHtml(html);
        this.preCompile = true;
        return JSON.stringify(this.compileDomStructure(parsed));
      }
    },

    parseHtml: {
      writable: true,

      value: function(html) {
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

        return handler.dom[0];
      }
    },

    compileDomStructure: {
      writable: true,

      value: function(domStructure) {
        var _this = this;

        if (domStructure === undefined)
          domStructure = {};

        var data     = domStructure.data,
            attrs    = domStructure.attribs    || {},
            children = domStructure.children   || [],
            evals    = domStructure.evaluators = {
              attrs  : {},
              style  : null,
              data   : null,
              'if'   : null,
              unless : null,
              repeat : null
            },
            keys, key, i = 0;

        // styles evaluator
        if (attrs.style) {
          domStructure.style = attrs.style;
          evals.style = this.compileValue(domStructure.style);
          delete attrs.style;  // delete from orig attrib object
        }

        // attributes evaluator
        keys = Object.keys(attrs);
        while ((key = keys[i++])) {
          // repeat
          if (key === STR_REPEAT_ATTRIBUTE) {
            evals.repeat = this.compileRepeatExpression(attrs[STR_REPEAT_ATTRIBUTE]);
            delete attrs[STR_REPEAT_ATTRIBUTE]; // delete from orig attrib object
          }
          // if
          else if (key === STR_IF_ATTRIBUTE) {
            evals.if = this.compileIfExpression(attrs[STR_IF_ATTRIBUTE]);
            delete attrs[STR_IF_ATTRIBUTE]; // delete from orig attrib object
          }
          // unless
          else if (key === STR_UNLESS_ATTRIBUTE) {
            evals.unless = this.compileUnlessExpression(attrs[STR_UNLESS_ATTRIBUTE]);
            delete attrs[STR_UNLESS_ATTRIBUTE]; // delete from orig attrib object
          }
          // interpolate
          else {
            evals.attrs[key] = this.compileValue(attrs[key]);
          }
        }

        // data (text) evaluator
        evals.data = this.compileValue(data);

        // recursive
        children.forEach(function(child) {
          return _this.compileDomStructure(child);
        });

        return domStructure;
      }
    },

    compileValue: {
      writable: true,

      value: function(str) {
        str = (str || '');
        var matches = str.match(REX_INTERPOLATE_SYMBOL),
            funcBody;

        if (matches === null) {
          return null;
        }

        if (str === matches[0]) {
          // return primitive value (for hook)
          funcBody = 'return data.' + str.slice(2, -2) + ';';
        } else {
          // return processed string
          funcBody = ["var s=[];",
            "s.push('",
            str.replace(/[\r\n\t]/g, ' ')
               .split("'").join("\\'")
               .replace(/{{([^{}]+)}}/g, "',(data.$1 != null ? data.$1 : ''),'")
               .split(/\s{2,}/).join(' '),
            "');",
            "return s.join('');"
          ].join('')
        }

        var funcObj = function(_funcObj) {
          _funcObj[STR_EVAL_FUNCTION_SYMBOL] = true;
          return _funcObj;
        }({
          args : ['data', funcBody]
        });
        return this.preCompile ? funcObj : helper.invoke(Function, funcObj.args);
      }
    },

    compileRepeatExpression: {
      writable: true,

      value: function(repeatExpr) {
        var matches = (repeatExpr || '').match(REX_REPEAT_SYMBOL);

        if (matches === null) {
          throw new Error('Unexpected syntax for repeat: ' + repeatExpr)
        }

        var childScopeName = matches[1];
        var parentTargetPath = matches[2];

        var funcObj = function(_funcObj2) {
          _funcObj2[STR_EVAL_FUNCTION_SYMBOL] = true;
          return _funcObj2;
        }({
          args : ['data', [
              "return data." + parentTargetPath + ".map(function(item) {",
            "  var ks, k, i = 0, r = {};",
            "  ks = Object.keys(data);",
            "  while ((k = ks[i++])) {",
            "    r[k] = data[k];",
            "  }",
              "  r." + childScopeName + " = item;",
            "  return r;",
            "});"
          ].join('')]
        });
        return this.preCompile ? funcObj : helper.invoke(Function, funcObj.args);
      }
    },

    compileIfExpression: {
      writable: true,

      value: function(ifExpr) {
        ifExpr = (ifExpr || '');
        var matches = ifExpr.match(REX_INTERPOLATE_SYMBOL);

        if (matches === null) {
          return null;
        }

        var funcObj = function(_funcObj3) {
          _funcObj3[STR_EVAL_FUNCTION_SYMBOL] = true;
          return _funcObj3;
        }({
          // return primitive value
          args: ['data', 'return data.' + ifExpr.slice(2, -2) + ';']
        });

        return this.preCompile ? funcObj : helper.invoke(Function, funcObj.args);
      }
    },

    compileUnlessExpression: {
      writable: true,

      value: function(unlessExpr) {
        unlessExpr = (unlessExpr || '');
        var matches = unlessExpr.match(REX_INTERPOLATE_SYMBOL);

        if (matches === null) {
          return null;
        }

        var funcObj = function(_funcObj4) {
          _funcObj4[STR_EVAL_FUNCTION_SYMBOL] = true;
          return _funcObj4;
        }({
          // return primitive value
          args: ['data', 'return data.' + unlessExpr.slice(2, -2) + ';']
        });

        return this.preCompile ? funcObj : helper.invoke(Function, funcObj.args);
      }
    }
  });

  return ClayTemplateCompiler;
}();

},{"./helper":2,"htmlParser":4}],4:[function(require,module,exports){
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
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9kaXN0L3RlbXAvX3J1bnRpbWUuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9kaXN0L3RlbXAvaGVscGVyLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvZGlzdC90ZW1wL3RlbXBsYXRlLWNvbXBpbGVyLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL2h0bWxQYXJzZXIvbGliL2h0bWxwYXJzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25RQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBDbGF5Q29tcGlsZXIgPSByZXF1aXJlKCcuL3RlbXBsYXRlLWNvbXBpbGVyJykuZGVmYXVsdDtcbnZhciBoZWxwZXIgPSByZXF1aXJlKCcuL2hlbHBlcicpLmRlZmF1bHQ7XG5cbi8qKlxuICogQGNsYXNzIENsYXlSdW50aW1lXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG53aW5kb3cuQ2xheVJ1bnRpbWUgPSB7XG4gIGNvbXBpbGVyOiBDbGF5Q29tcGlsZXJcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICogQHBhcmFtIHtCb29sZWFufSBbb3ZlcndyaXRlXVxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5mdW5jdGlvbiBtaXgodG8sIGZyb20sIG92ZXJ3cml0ZSkge1xuICB2YXIgaSA9IDAsIGtleXMgPSBPYmplY3Qua2V5cyhmcm9tKSwgcHJvcDtcblxuICB3aGlsZSAoKHByb3AgPSBrZXlzW2krK10pKSB7XG4gICAgaWYgKG92ZXJ3cml0ZSB8fCAhdG9bcHJvcF0pIHtcbiAgICAgIHRvW3Byb3BdID0gZnJvbVtwcm9wXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRvO1xufVxuXG4vKipcbiAqIHNoYWxsb3cgZmxhdHRlblxuICogQHBhcmFtIHtBcnJheX0gbGlzdFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiBmbGF0dGVuKGxpc3QpIHtcbiAgdmFyIGkgPSAwLCBpdGVtLCByZXQgPSBbXTtcbiAgd2hpbGUgKChpdGVtID0gbGlzdFtpKytdKSkge1xuICAgIGlmIChpc0FycmF5KGl0ZW0pKSB7XG4gICAgICByZXQgPSByZXQuY29uY2F0KGl0ZW0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXQucHVzaChpdGVtKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY2xvbmUob2JqKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IG1peCh7fSwgb2JqKVxufVxuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHVuaXEoYXJyYXkpIHtcbiAgdmFyIHJldCA9IFtdLCBpID0gMCwgaXRlbTtcblxuICB3aGlsZSAoKGl0ZW0gPSBhcnJheVtpKytdKSkge1xuICAgIGlmIChyZXQuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgIHJldC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIGdldCBjYWNoZWQgYG1hdGNoZXNTZWxlY3RvcmAgbWV0aG9kIG5hbWVcbiAqL1xudmFyIG1hdGNoZXJOYW1lO1xuZnVuY3Rpb24gZ2V0TWF0Y2hlck5hbWUoKSB7XG4gIGlmIChtYXRjaGVyTmFtZSkge1xuICAgIHJldHVybiBtYXRjaGVyTmFtZTtcbiAgfVxuXG4gIHZhciBsaXN0ICA9IFsnbWF0Y2hlcycsICd3ZWJraXRNYXRjaGVzU2VsZWN0b3InLCAnbW96TWF0Y2hlc1NlbGVjdG9yJywgJ21zTWF0Y2hlc1NlbGVjdG9yJ10sXG4gICAgICBwcm90byA9IEhUTUxFbGVtZW50LnByb3RvdHlwZSwgaSA9IDAsIG5hbWU7XG5cbiAgd2hpbGUoKG5hbWUgPSBsaXN0W2krK10pKSB7XG4gICAgaWYgKHByb3RvW25hbWVdKSB7XG4gICAgICBtYXRjaGVyTmFtZSA9IG5hbWU7XG4gICAgICByZXR1cm4gbWF0Y2hlck5hbWU7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogbWF0Y2ggZWxlbWVudCB3aXRoIHNlbGVjdG9yXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBtYXRjaEVsZW1lbnQoZWxlbWVudCwgc2VsZWN0b3IpIHtcbiAgcmV0dXJuIGVsZW1lbnRbZ2V0TWF0Y2hlck5hbWUoKV0oc2VsZWN0b3IpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHRvU3RyaW5nKHZhbHVlKSB7XG4gIHZhciBvYmpTdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICByZXR1cm4gb2JqU3RyLnNsaWNlKG9ialN0ci5pbmRleE9mKCcgJykgKyAxLCAtMSk7XG59XG5cbi8qKlxuICogZmFrZSBhcnJheSAobGlrZSBOb2RlTGlzdCwgQXJndW1lbnRzIGV0YykgY29udmVydCB0byBBcnJheVxuICogQHBhcmFtIHsqfSBmYWtlQXJyYXlcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gdG9BcnJheShmYWtlQXJyYXkpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZha2VBcnJheSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5KHZhbHVlKSB7XG4gIHJldHVybiB0b1N0cmluZyh2YWx1ZSkgPT09ICdBcnJheSc7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiB0b1N0cmluZyh2YWx1ZSkgPT09ICdPYmplY3QnO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7U3RyaW5nfSBsb2NhbE5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0N1c3RvbUVsZW1lbnROYW1lKGxvY2FsTmFtZSkge1xuICByZXR1cm4gbG9jYWxOYW1lLmluZGV4T2YoJy0nKSAhPT0gLTE7XG59XG5cbi8qKlxuICogQHNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE2MDY3OTcvdXNlLW9mLWFwcGx5LXdpdGgtbmV3LW9wZXJhdG9yLWlzLXRoaXMtcG9zc2libGUvMTM5MzE2MjcjMTM5MzE2MjdcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzXG4gKiBAcmV0dXJucyB7aW52b2tlLkZ9XG4gKi9cbmZ1bmN0aW9uIGludm9rZShjb25zdHJ1Y3RvciwgYXJncykge1xuICB2YXIgZjtcbiAgZnVuY3Rpb24gRigpIHtcbiAgICAvLyBjb25zdHJ1Y3RvciByZXR1cm5zICoqdGhpcyoqXG4gICAgcmV0dXJuIGNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG4gIEYucHJvdG90eXBlID0gY29uc3RydWN0b3IucHJvdG90eXBlO1xuICBmID0gbmV3IEYoKTtcbiAgZi5jb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yO1xuICByZXR1cm4gZjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIHJlYWR5KGhhbmRsZXIpIHtcbiAgaWYgKEZMR19ET01fQUxSRUFEWSkge1xuICAgIGhhbmRsZXIoKTtcbiAgfSBlbHNlIHtcbiAgICBTVEFDS19SRUFEWV9IQU5ETEVSUy5wdXNoKGhhbmRsZXIpO1xuICB9XG59XG5cbnZhciBGTEdfRE9NX0FMUkVBRFkgICAgICA9IGZhbHNlLFxuICAgIFNUQUNLX1JFQURZX0hBTkRMRVJTID0gW107XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgRkxHX0RPTV9BTFJFQURZID0gdHJ1ZTtcbiAgdmFyIGkgPSAwLCByZWFkeTtcbiAgd2hpbGUgKHJlYWR5ID0gU1RBQ0tfUkVBRFlfSEFORExFUlNbaSsrXSkge1xuICAgIHJlYWR5KCk7XG4gIH1cbn0sIGZhbHNlKTtcblxuZXhwb3J0cy5kZWZhdWx0ID0ge1xuICBub29wICAgICAgOiBmdW5jdGlvbiBub29wKCkge30sXG4gIG1peCAgICAgICA6IG1peCxcbiAgdW5pcSAgICAgIDogdW5pcSxcbiAgY2xvbmUgICAgIDogY2xvbmUsXG4gIGZsYXR0ZW4gICA6IGZsYXR0ZW4sXG4gIHJlYWR5ICAgICA6IHJlYWR5LFxuICBpbnZva2UgICAgOiBpbnZva2UsXG4gIHRvQXJyYXkgICA6IHRvQXJyYXksXG4gIHRvU3RyaW5nICA6IHRvU3RyaW5nLFxuXG4gIG1hdGNoRWxlbWVudCA6IG1hdGNoRWxlbWVudCxcblxuICBpc1N0cmluZyAgICAgICAgICAgIDogaXNTdHJpbmcsXG4gIGlzTnVtYmVyICAgICAgICAgICAgOiBpc051bWJlcixcbiAgaXNBcnJheSAgICAgICAgICAgICA6IGlzQXJyYXksXG4gIGlzRnVuY3Rpb24gICAgICAgICAgOiBpc0Z1bmN0aW9uLFxuICBpc09iamVjdCAgICAgICAgICAgIDogaXNPYmplY3QsXG4gIGlzQ3VzdG9tRWxlbWVudE5hbWUgOiBpc0N1c3RvbUVsZW1lbnROYW1lXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyID0gcmVxdWlyZShcIi4vaGVscGVyXCIpLmRlZmF1bHQ7XG52YXIgaHRtbFBhcnNlciA9IHJlcXVpcmUoXCJodG1sUGFyc2VyXCIpO1xuXG52YXIgUkVYX0lOVEVSUE9MQVRFX1NZTUJPTCA9IC97e1tee31dK319L2c7XG52YXIgUkVYX1JFUEVBVF9TWU1CT0wgICAgICA9IC97eyhcXHcrKVxcc2luXFxzKFtcXHdcXC5dKyl9fS87XG52YXIgU1RSX1JFUEVBVF9BVFRSSUJVVEUgICA9ICdjbC1yZXBlYXQnO1xudmFyIFNUUl9JRl9BVFRSSUJVVEUgICAgICAgPSAnY2wtaWYnO1xudmFyIFNUUl9VTkxFU1NfQVRUUklCVVRFICAgPSAnY2wtdW5sZXNzJztcbnZhciBTVFJfRVZBTF9GVU5DVElPTl9TWU1CT0wgPSAnX19FVkFMX0ZVTkNUSU9OX18nO1xuXG5leHBvcnRzLmRlZmF1bHQgPSB7XG4gIC8qKlxuICAgKiBAc3RhdGljXG4gICAqIEByZXR1cm5zIHtDbGF5VGVtcGxhdGVDb21waWxlcn1cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBDbGF5VGVtcGxhdGVDb21waWxlcigpO1xuICB9XG59O1xuXG52YXIgQ2xheVRlbXBsYXRlQ29tcGlsZXIgPSBmdW5jdGlvbigpIHtcbiAgdmFyIENsYXlUZW1wbGF0ZUNvbXBpbGVyID0gZnVuY3Rpb24gQ2xheVRlbXBsYXRlQ29tcGlsZXIoKSAvLyBub29wXG4gIHtcbiAgICAvLyBub29wXG4gIH07XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQ2xheVRlbXBsYXRlQ29tcGlsZXIucHJvdG90eXBlLCB7XG4gICAgY29tcGlsZUZyb21IdG1sOiB7XG4gICAgICB3cml0YWJsZTogdHJ1ZSxcblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgICAgdmFyIHBhcnNlZCA9IHRoaXMucGFyc2VIdG1sKGh0bWwpO1xuICAgICAgICB0aGlzLnByZUNvbXBpbGUgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZURvbVN0cnVjdHVyZShwYXJzZWQpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBzZXJpYWxpemVGcm9tSHRtbDoge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihodG1sKSB7XG4gICAgICAgIHZhciBwYXJzZWQgPSB0aGlzLnBhcnNlSHRtbChodG1sKTtcbiAgICAgICAgdGhpcy5wcmVDb21waWxlID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMuY29tcGlsZURvbVN0cnVjdHVyZShwYXJzZWQpKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgcGFyc2VIdG1sOiB7XG4gICAgICB3cml0YWJsZTogdHJ1ZSxcblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgICAgdmFyIGhhbmRsZXIgPSBuZXcgaHRtbFBhcnNlci5EZWZhdWx0SGFuZGxlcihmdW5jdGlvbiAoZXJyLCBkb20pIHtcbiAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIGVuZm9yY2VFbXB0eVRhZ3MgOiB0cnVlLFxuICAgICAgICAgICAgaWdub3JlV2hpdGVzcGFjZSA6IHRydWUsXG4gICAgICAgICAgICB2ZXJib3NlICAgICAgICAgIDogZmFsc2VcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBwYXJzZXIgPSBuZXcgaHRtbFBhcnNlci5QYXJzZXIoaGFuZGxlcik7XG5cbiAgICAgICAgLy8gcGFyc2UgaHRtbFxuICAgICAgICBwYXJzZXIucGFyc2VDb21wbGV0ZShodG1sKTtcbiAgICAgICAgaWYgKGhhbmRsZXIuZG9tLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcignVGVtcGxhdGUgbXVzdCBoYXZlIGV4YWN0bHkgb25lIHJvb3QgZWxlbWVudC4gd2FzOiAnICsgaHRtbCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaGFuZGxlci5kb21bMF07XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNvbXBpbGVEb21TdHJ1Y3R1cmU6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oZG9tU3RydWN0dXJlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgaWYgKGRvbVN0cnVjdHVyZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgIGRvbVN0cnVjdHVyZSA9IHt9O1xuXG4gICAgICAgIHZhciBkYXRhICAgICA9IGRvbVN0cnVjdHVyZS5kYXRhLFxuICAgICAgICAgICAgYXR0cnMgICAgPSBkb21TdHJ1Y3R1cmUuYXR0cmlicyAgICB8fCB7fSxcbiAgICAgICAgICAgIGNoaWxkcmVuID0gZG9tU3RydWN0dXJlLmNoaWxkcmVuICAgfHwgW10sXG4gICAgICAgICAgICBldmFscyAgICA9IGRvbVN0cnVjdHVyZS5ldmFsdWF0b3JzID0ge1xuICAgICAgICAgICAgICBhdHRycyAgOiB7fSxcbiAgICAgICAgICAgICAgc3R5bGUgIDogbnVsbCxcbiAgICAgICAgICAgICAgZGF0YSAgIDogbnVsbCxcbiAgICAgICAgICAgICAgJ2lmJyAgIDogbnVsbCxcbiAgICAgICAgICAgICAgdW5sZXNzIDogbnVsbCxcbiAgICAgICAgICAgICAgcmVwZWF0IDogbnVsbFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGtleXMsIGtleSwgaSA9IDA7XG5cbiAgICAgICAgLy8gc3R5bGVzIGV2YWx1YXRvclxuICAgICAgICBpZiAoYXR0cnMuc3R5bGUpIHtcbiAgICAgICAgICBkb21TdHJ1Y3R1cmUuc3R5bGUgPSBhdHRycy5zdHlsZTtcbiAgICAgICAgICBldmFscy5zdHlsZSA9IHRoaXMuY29tcGlsZVZhbHVlKGRvbVN0cnVjdHVyZS5zdHlsZSk7XG4gICAgICAgICAgZGVsZXRlIGF0dHJzLnN0eWxlOyAgLy8gZGVsZXRlIGZyb20gb3JpZyBhdHRyaWIgb2JqZWN0XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhdHRyaWJ1dGVzIGV2YWx1YXRvclxuICAgICAgICBrZXlzID0gT2JqZWN0LmtleXMoYXR0cnMpO1xuICAgICAgICB3aGlsZSAoKGtleSA9IGtleXNbaSsrXSkpIHtcbiAgICAgICAgICAvLyByZXBlYXRcbiAgICAgICAgICBpZiAoa2V5ID09PSBTVFJfUkVQRUFUX0FUVFJJQlVURSkge1xuICAgICAgICAgICAgZXZhbHMucmVwZWF0ID0gdGhpcy5jb21waWxlUmVwZWF0RXhwcmVzc2lvbihhdHRyc1tTVFJfUkVQRUFUX0FUVFJJQlVURV0pO1xuICAgICAgICAgICAgZGVsZXRlIGF0dHJzW1NUUl9SRVBFQVRfQVRUUklCVVRFXTsgLy8gZGVsZXRlIGZyb20gb3JpZyBhdHRyaWIgb2JqZWN0XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGlmXG4gICAgICAgICAgZWxzZSBpZiAoa2V5ID09PSBTVFJfSUZfQVRUUklCVVRFKSB7XG4gICAgICAgICAgICBldmFscy5pZiA9IHRoaXMuY29tcGlsZUlmRXhwcmVzc2lvbihhdHRyc1tTVFJfSUZfQVRUUklCVVRFXSk7XG4gICAgICAgICAgICBkZWxldGUgYXR0cnNbU1RSX0lGX0FUVFJJQlVURV07IC8vIGRlbGV0ZSBmcm9tIG9yaWcgYXR0cmliIG9iamVjdFxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyB1bmxlc3NcbiAgICAgICAgICBlbHNlIGlmIChrZXkgPT09IFNUUl9VTkxFU1NfQVRUUklCVVRFKSB7XG4gICAgICAgICAgICBldmFscy51bmxlc3MgPSB0aGlzLmNvbXBpbGVVbmxlc3NFeHByZXNzaW9uKGF0dHJzW1NUUl9VTkxFU1NfQVRUUklCVVRFXSk7XG4gICAgICAgICAgICBkZWxldGUgYXR0cnNbU1RSX1VOTEVTU19BVFRSSUJVVEVdOyAvLyBkZWxldGUgZnJvbSBvcmlnIGF0dHJpYiBvYmplY3RcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gaW50ZXJwb2xhdGVcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGV2YWxzLmF0dHJzW2tleV0gPSB0aGlzLmNvbXBpbGVWYWx1ZShhdHRyc1trZXldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkYXRhICh0ZXh0KSBldmFsdWF0b3JcbiAgICAgICAgZXZhbHMuZGF0YSA9IHRoaXMuY29tcGlsZVZhbHVlKGRhdGEpO1xuXG4gICAgICAgIC8vIHJlY3Vyc2l2ZVxuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzLmNvbXBpbGVEb21TdHJ1Y3R1cmUoY2hpbGQpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZG9tU3RydWN0dXJlO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjb21waWxlVmFsdWU6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgIHN0ciA9IChzdHIgfHwgJycpO1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IHN0ci5tYXRjaChSRVhfSU5URVJQT0xBVEVfU1lNQk9MKSxcbiAgICAgICAgICAgIGZ1bmNCb2R5O1xuXG4gICAgICAgIGlmIChtYXRjaGVzID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RyID09PSBtYXRjaGVzWzBdKSB7XG4gICAgICAgICAgLy8gcmV0dXJuIHByaW1pdGl2ZSB2YWx1ZSAoZm9yIGhvb2spXG4gICAgICAgICAgZnVuY0JvZHkgPSAncmV0dXJuIGRhdGEuJyArIHN0ci5zbGljZSgyLCAtMikgKyAnOyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gcmV0dXJuIHByb2Nlc3NlZCBzdHJpbmdcbiAgICAgICAgICBmdW5jQm9keSA9IFtcInZhciBzPVtdO1wiLFxuICAgICAgICAgICAgXCJzLnB1c2goJ1wiLFxuICAgICAgICAgICAgc3RyLnJlcGxhY2UoL1tcXHJcXG5cXHRdL2csICcgJylcbiAgICAgICAgICAgICAgIC5zcGxpdChcIidcIikuam9pbihcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAucmVwbGFjZSgve3soW157fV0rKX19L2csIFwiJywoZGF0YS4kMSAhPSBudWxsID8gZGF0YS4kMSA6ICcnKSwnXCIpXG4gICAgICAgICAgICAgICAuc3BsaXQoL1xcc3syLH0vKS5qb2luKCcgJyksXG4gICAgICAgICAgICBcIicpO1wiLFxuICAgICAgICAgICAgXCJyZXR1cm4gcy5qb2luKCcnKTtcIlxuICAgICAgICAgIF0uam9pbignJylcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBmdW5jT2JqID0gZnVuY3Rpb24oX2Z1bmNPYmopIHtcbiAgICAgICAgICBfZnVuY09ialtTVFJfRVZBTF9GVU5DVElPTl9TWU1CT0xdID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gX2Z1bmNPYmo7XG4gICAgICAgIH0oe1xuICAgICAgICAgIGFyZ3MgOiBbJ2RhdGEnLCBmdW5jQm9keV1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzLnByZUNvbXBpbGUgPyBmdW5jT2JqIDogaGVscGVyLmludm9rZShGdW5jdGlvbiwgZnVuY09iai5hcmdzKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgY29tcGlsZVJlcGVhdEV4cHJlc3Npb246IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24ocmVwZWF0RXhwcikge1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IChyZXBlYXRFeHByIHx8ICcnKS5tYXRjaChSRVhfUkVQRUFUX1NZTUJPTCk7XG5cbiAgICAgICAgaWYgKG1hdGNoZXMgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc3ludGF4IGZvciByZXBlYXQ6ICcgKyByZXBlYXRFeHByKVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNoaWxkU2NvcGVOYW1lID0gbWF0Y2hlc1sxXTtcbiAgICAgICAgdmFyIHBhcmVudFRhcmdldFBhdGggPSBtYXRjaGVzWzJdO1xuXG4gICAgICAgIHZhciBmdW5jT2JqID0gZnVuY3Rpb24oX2Z1bmNPYmoyKSB7XG4gICAgICAgICAgX2Z1bmNPYmoyW1NUUl9FVkFMX0ZVTkNUSU9OX1NZTUJPTF0gPSB0cnVlO1xuICAgICAgICAgIHJldHVybiBfZnVuY09iajI7XG4gICAgICAgIH0oe1xuICAgICAgICAgIGFyZ3MgOiBbJ2RhdGEnLCBbXG4gICAgICAgICAgICAgIFwicmV0dXJuIGRhdGEuXCIgKyBwYXJlbnRUYXJnZXRQYXRoICsgXCIubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcIixcbiAgICAgICAgICAgIFwiICB2YXIga3MsIGssIGkgPSAwLCByID0ge307XCIsXG4gICAgICAgICAgICBcIiAga3MgPSBPYmplY3Qua2V5cyhkYXRhKTtcIixcbiAgICAgICAgICAgIFwiICB3aGlsZSAoKGsgPSBrc1tpKytdKSkge1wiLFxuICAgICAgICAgICAgXCIgICAgcltrXSA9IGRhdGFba107XCIsXG4gICAgICAgICAgICBcIiAgfVwiLFxuICAgICAgICAgICAgICBcIiAgci5cIiArIGNoaWxkU2NvcGVOYW1lICsgXCIgPSBpdGVtO1wiLFxuICAgICAgICAgICAgXCIgIHJldHVybiByO1wiLFxuICAgICAgICAgICAgXCJ9KTtcIlxuICAgICAgICAgIF0uam9pbignJyldXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5wcmVDb21waWxlID8gZnVuY09iaiA6IGhlbHBlci5pbnZva2UoRnVuY3Rpb24sIGZ1bmNPYmouYXJncyk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNvbXBpbGVJZkV4cHJlc3Npb246IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oaWZFeHByKSB7XG4gICAgICAgIGlmRXhwciA9IChpZkV4cHIgfHwgJycpO1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IGlmRXhwci5tYXRjaChSRVhfSU5URVJQT0xBVEVfU1lNQk9MKTtcblxuICAgICAgICBpZiAobWF0Y2hlcyA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGZ1bmNPYmogPSBmdW5jdGlvbihfZnVuY09iajMpIHtcbiAgICAgICAgICBfZnVuY09iajNbU1RSX0VWQUxfRlVOQ1RJT05fU1lNQk9MXSA9IHRydWU7XG4gICAgICAgICAgcmV0dXJuIF9mdW5jT2JqMztcbiAgICAgICAgfSh7XG4gICAgICAgICAgLy8gcmV0dXJuIHByaW1pdGl2ZSB2YWx1ZVxuICAgICAgICAgIGFyZ3M6IFsnZGF0YScsICdyZXR1cm4gZGF0YS4nICsgaWZFeHByLnNsaWNlKDIsIC0yKSArICc7J11cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucHJlQ29tcGlsZSA/IGZ1bmNPYmogOiBoZWxwZXIuaW52b2tlKEZ1bmN0aW9uLCBmdW5jT2JqLmFyZ3MpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjb21waWxlVW5sZXNzRXhwcmVzc2lvbjoge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbih1bmxlc3NFeHByKSB7XG4gICAgICAgIHVubGVzc0V4cHIgPSAodW5sZXNzRXhwciB8fCAnJyk7XG4gICAgICAgIHZhciBtYXRjaGVzID0gdW5sZXNzRXhwci5tYXRjaChSRVhfSU5URVJQT0xBVEVfU1lNQk9MKTtcblxuICAgICAgICBpZiAobWF0Y2hlcyA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGZ1bmNPYmogPSBmdW5jdGlvbihfZnVuY09iajQpIHtcbiAgICAgICAgICBfZnVuY09iajRbU1RSX0VWQUxfRlVOQ1RJT05fU1lNQk9MXSA9IHRydWU7XG4gICAgICAgICAgcmV0dXJuIF9mdW5jT2JqNDtcbiAgICAgICAgfSh7XG4gICAgICAgICAgLy8gcmV0dXJuIHByaW1pdGl2ZSB2YWx1ZVxuICAgICAgICAgIGFyZ3M6IFsnZGF0YScsICdyZXR1cm4gZGF0YS4nICsgdW5sZXNzRXhwci5zbGljZSgyLCAtMikgKyAnOyddXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzLnByZUNvbXBpbGUgPyBmdW5jT2JqIDogaGVscGVyLmludm9rZShGdW5jdGlvbiwgZnVuY09iai5hcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBDbGF5VGVtcGxhdGVDb21waWxlcjtcbn0oKTtcbiIsIihmdW5jdGlvbiAoX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5Db3B5cmlnaHQgMjAxMCwgMjAxMSwgQ2hyaXMgV2luYmVycnkgPGNocmlzQHdpbmJlcnJ5Lm5ldD4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0b1xuZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGVcbnJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vclxuc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HXG5GUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTXG5JTiBUSEUgU09GVFdBUkUuXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qIHYxLjcuNiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG5mdW5jdGlvbiBydW5uaW5nSW5Ob2RlICgpIHtcblx0cmV0dXJuKFxuXHRcdCh0eXBlb2YgcmVxdWlyZSkgPT0gXCJmdW5jdGlvblwiXG5cdFx0JiZcblx0XHQodHlwZW9mIGV4cG9ydHMpID09IFwib2JqZWN0XCJcblx0XHQmJlxuXHRcdCh0eXBlb2YgbW9kdWxlKSA9PSBcIm9iamVjdFwiXG5cdFx0JiZcblx0XHQodHlwZW9mIF9fZmlsZW5hbWUpID09IFwic3RyaW5nXCJcblx0XHQmJlxuXHRcdCh0eXBlb2YgX19kaXJuYW1lKSA9PSBcInN0cmluZ1wiXG5cdFx0KTtcbn1cblxuaWYgKCFydW5uaW5nSW5Ob2RlKCkpIHtcblx0aWYgKCF0aGlzLlRhdXRvbG9naXN0aWNzKVxuXHRcdHRoaXMuVGF1dG9sb2dpc3RpY3MgPSB7fTtcblx0ZWxzZSBpZiAodGhpcy5UYXV0b2xvZ2lzdGljcy5Ob2RlSHRtbFBhcnNlcilcblx0XHRyZXR1cm47IC8vTm9kZUh0bWxQYXJzZXIgYWxyZWFkeSBkZWZpbmVkIVxuXHR0aGlzLlRhdXRvbG9naXN0aWNzLk5vZGVIdG1sUGFyc2VyID0ge307XG5cdGV4cG9ydHMgPSB0aGlzLlRhdXRvbG9naXN0aWNzLk5vZGVIdG1sUGFyc2VyO1xufVxuXG4vL1R5cGVzIG9mIGVsZW1lbnRzIGZvdW5kIGluIHRoZSBET01cbnZhciBFbGVtZW50VHlwZSA9IHtcblx0ICBUZXh0OiBcInRleHRcIiAvL1BsYWluIHRleHRcblx0LCBEaXJlY3RpdmU6IFwiZGlyZWN0aXZlXCIgLy9TcGVjaWFsIHRhZyA8IS4uLj5cblx0LCBDb21tZW50OiBcImNvbW1lbnRcIiAvL1NwZWNpYWwgdGFnIDwhLS0uLi4tLT5cblx0LCBTY3JpcHQ6IFwic2NyaXB0XCIgLy9TcGVjaWFsIHRhZyA8c2NyaXB0Pi4uLjwvc2NyaXB0PlxuXHQsIFN0eWxlOiBcInN0eWxlXCIgLy9TcGVjaWFsIHRhZyA8c3R5bGU+Li4uPC9zdHlsZT5cblx0LCBUYWc6IFwidGFnXCIgLy9BbnkgdGFnIHRoYXQgaXNuJ3Qgc3BlY2lhbFxufVxuXG5mdW5jdGlvbiBQYXJzZXIgKGhhbmRsZXIsIG9wdGlvbnMpIHtcblx0dGhpcy5fb3B0aW9ucyA9IG9wdGlvbnMgPyBvcHRpb25zIDogeyB9O1xuXHRpZiAodGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24gPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24gPSBmYWxzZTsgLy9EbyBub3QgdHJhY2sgZWxlbWVudCBwb3NpdGlvbiBpbiBkb2N1bWVudCBieSBkZWZhdWx0XG5cdH1cblxuXHR0aGlzLnZhbGlkYXRlSGFuZGxlcihoYW5kbGVyKTtcblx0dGhpcy5faGFuZGxlciA9IGhhbmRsZXI7XG5cdHRoaXMucmVzZXQoKTtcbn1cblxuXHQvLyoqXCJTdGF0aWNcIioqLy9cblx0Ly9SZWd1bGFyIGV4cHJlc3Npb25zIHVzZWQgZm9yIGNsZWFuaW5nIHVwIGFuZCBwYXJzaW5nIChzdGF0ZWxlc3MpXG5cdFBhcnNlci5fcmVUcmltID0gLyheXFxzK3xcXHMrJCkvZzsgLy9UcmltIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZVxuXHRQYXJzZXIuX3JlVHJpbUNvbW1lbnQgPSAvKF5cXCEtLXwtLSQpL2c7IC8vUmVtb3ZlIGNvbW1lbnQgdGFnIG1hcmt1cCBmcm9tIGNvbW1lbnQgY29udGVudHNcblx0UGFyc2VyLl9yZVdoaXRlc3BhY2UgPSAvXFxzL2c7IC8vVXNlZCB0byBmaW5kIGFueSB3aGl0ZXNwYWNlIHRvIHNwbGl0IG9uXG5cdFBhcnNlci5fcmVUYWdOYW1lID0gL15cXHMqKFxcLz8pXFxzKihbXlxcc1xcL10rKS87IC8vVXNlZCB0byBmaW5kIHRoZSB0YWcgbmFtZSBmb3IgYW4gZWxlbWVudFxuXG5cdC8vUmVndWxhciBleHByZXNzaW9ucyB1c2VkIGZvciBwYXJzaW5nIChzdGF0ZWZ1bClcblx0UGFyc2VyLl9yZUF0dHJpYiA9IC8vRmluZCBhdHRyaWJ1dGVzIGluIGEgdGFnXG5cdFx0LyhbXj08PlxcXCJcXCdcXHNdKylcXHMqPVxccypcIihbXlwiXSopXCJ8KFtePTw+XFxcIlxcJ1xcc10rKVxccyo9XFxzKicoW14nXSopJ3woW149PD5cXFwiXFwnXFxzXSspXFxzKj1cXHMqKFteJ1wiXFxzXSspfChbXj08PlxcXCJcXCdcXHNcXC9dKykvZztcblx0UGFyc2VyLl9yZVRhZ3MgPSAvW1xcPFxcPl0vZzsgLy9GaW5kIHRhZyBtYXJrZXJzXG5cblx0Ly8qKlB1YmxpYyoqLy9cblx0Ly9NZXRob2RzLy9cblx0Ly9QYXJzZXMgYSBjb21wbGV0ZSBIVE1MIGFuZCBwdXNoZXMgaXQgdG8gdGhlIGhhbmRsZXJcblx0UGFyc2VyLnByb3RvdHlwZS5wYXJzZUNvbXBsZXRlID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlQ29tcGxldGUgKGRhdGEpIHtcblx0XHR0aGlzLnJlc2V0KCk7XG5cdFx0dGhpcy5wYXJzZUNodW5rKGRhdGEpO1xuXHRcdHRoaXMuZG9uZSgpO1xuXHR9XG5cblx0Ly9QYXJzZXMgYSBwaWVjZSBvZiBhbiBIVE1MIGRvY3VtZW50XG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VDaHVuayA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZUNodW5rIChkYXRhKSB7XG5cdFx0aWYgKHRoaXMuX2RvbmUpXG5cdFx0XHR0aGlzLmhhbmRsZUVycm9yKG5ldyBFcnJvcihcIkF0dGVtcHRlZCB0byBwYXJzZSBjaHVuayBhZnRlciBwYXJzaW5nIGFscmVhZHkgZG9uZVwiKSk7XG5cdFx0dGhpcy5fYnVmZmVyICs9IGRhdGE7IC8vRklYTUU6IHRoaXMgY2FuIGJlIGEgYm90dGxlbmVja1xuXHRcdHRoaXMucGFyc2VUYWdzKCk7XG5cdH1cblxuXHQvL1RlbGxzIHRoZSBwYXJzZXIgdGhhdCB0aGUgSFRNTCBiZWluZyBwYXJzZWQgaXMgY29tcGxldGVcblx0UGFyc2VyLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gUGFyc2VyJGRvbmUgKCkge1xuXHRcdGlmICh0aGlzLl9kb25lKVxuXHRcdFx0cmV0dXJuO1xuXHRcdHRoaXMuX2RvbmUgPSB0cnVlO1xuXHRcblx0XHQvL1B1c2ggYW55IHVucGFyc2VkIHRleHQgaW50byBhIGZpbmFsIGVsZW1lbnQgaW4gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdGlmICh0aGlzLl9idWZmZXIubGVuZ3RoKSB7XG5cdFx0XHR2YXIgcmF3RGF0YSA9IHRoaXMuX2J1ZmZlcjtcblx0XHRcdHRoaXMuX2J1ZmZlciA9IFwiXCI7XG5cdFx0XHR2YXIgZWxlbWVudCA9IHtcblx0XHRcdFx0ICByYXc6IHJhd0RhdGFcblx0XHRcdFx0LCBkYXRhOiAodGhpcy5fcGFyc2VTdGF0ZSA9PSBFbGVtZW50VHlwZS5UZXh0KSA/IHJhd0RhdGEgOiByYXdEYXRhLnJlcGxhY2UoUGFyc2VyLl9yZVRyaW0sIFwiXCIpXG5cdFx0XHRcdCwgdHlwZTogdGhpcy5fcGFyc2VTdGF0ZVxuXHRcdFx0XHR9O1xuXHRcdFx0aWYgKHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuVGFnIHx8IHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuU2NyaXB0IHx8IHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuU3R5bGUpXG5cdFx0XHRcdGVsZW1lbnQubmFtZSA9IHRoaXMucGFyc2VUYWdOYW1lKGVsZW1lbnQuZGF0YSk7XG5cdFx0XHR0aGlzLnBhcnNlQXR0cmlicyhlbGVtZW50KTtcblx0XHRcdHRoaXMuX2VsZW1lbnRzLnB1c2goZWxlbWVudCk7XG5cdFx0fVxuXHRcblx0XHR0aGlzLndyaXRlSGFuZGxlcigpO1xuXHRcdHRoaXMuX2hhbmRsZXIuZG9uZSgpO1xuXHR9XG5cblx0Ly9SZXNldHMgdGhlIHBhcnNlciB0byBhIGJsYW5rIHN0YXRlLCByZWFkeSB0byBwYXJzZSBhIG5ldyBIVE1MIGRvY3VtZW50XG5cdFBhcnNlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiBQYXJzZXIkcmVzZXQgKCkge1xuXHRcdHRoaXMuX2J1ZmZlciA9IFwiXCI7XG5cdFx0dGhpcy5fZG9uZSA9IGZhbHNlO1xuXHRcdHRoaXMuX2VsZW1lbnRzID0gW107XG5cdFx0dGhpcy5fZWxlbWVudHNDdXJyZW50ID0gMDtcblx0XHR0aGlzLl9jdXJyZW50ID0gMDtcblx0XHR0aGlzLl9uZXh0ID0gMDtcblx0XHR0aGlzLl9sb2NhdGlvbiA9IHtcblx0XHRcdCAgcm93OiAwXG5cdFx0XHQsIGNvbDogMFxuXHRcdFx0LCBjaGFyT2Zmc2V0OiAwXG5cdFx0XHQsIGluQnVmZmVyOiAwXG5cdFx0fTtcblx0XHR0aGlzLl9wYXJzZVN0YXRlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHR0aGlzLl9wcmV2VGFnU2VwID0gJyc7XG5cdFx0dGhpcy5fdGFnU3RhY2sgPSBbXTtcblx0XHR0aGlzLl9oYW5kbGVyLnJlc2V0KCk7XG5cdH1cblx0XG5cdC8vKipQcml2YXRlKiovL1xuXHQvL1Byb3BlcnRpZXMvL1xuXHRQYXJzZXIucHJvdG90eXBlLl9vcHRpb25zID0gbnVsbDsgLy9QYXJzZXIgb3B0aW9ucyBmb3IgaG93IHRvIGJlaGF2ZVxuXHRQYXJzZXIucHJvdG90eXBlLl9oYW5kbGVyID0gbnVsbDsgLy9IYW5kbGVyIGZvciBwYXJzZWQgZWxlbWVudHNcblx0UGFyc2VyLnByb3RvdHlwZS5fYnVmZmVyID0gbnVsbDsgLy9CdWZmZXIgb2YgdW5wYXJzZWQgZGF0YVxuXHRQYXJzZXIucHJvdG90eXBlLl9kb25lID0gZmFsc2U7IC8vRmxhZyBpbmRpY2F0aW5nIHdoZXRoZXIgcGFyc2luZyBpcyBkb25lXG5cdFBhcnNlci5wcm90b3R5cGUuX2VsZW1lbnRzID0gIG51bGw7IC8vQXJyYXkgb2YgcGFyc2VkIGVsZW1lbnRzXG5cdFBhcnNlci5wcm90b3R5cGUuX2VsZW1lbnRzQ3VycmVudCA9IDA7IC8vUG9pbnRlciB0byBsYXN0IGVsZW1lbnQgaW4gX2VsZW1lbnRzIHRoYXQgaGFzIGJlZW4gcHJvY2Vzc2VkXG5cdFBhcnNlci5wcm90b3R5cGUuX2N1cnJlbnQgPSAwOyAvL1Bvc2l0aW9uIGluIGRhdGEgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHBhcnNlZFxuXHRQYXJzZXIucHJvdG90eXBlLl9uZXh0ID0gMDsgLy9Qb3NpdGlvbiBpbiBkYXRhIG9mIHRoZSBuZXh0IHRhZyBtYXJrZXIgKDw+KVxuXHRQYXJzZXIucHJvdG90eXBlLl9sb2NhdGlvbiA9IG51bGw7IC8vUG9zaXRpb24gdHJhY2tpbmcgZm9yIGVsZW1lbnRzIGluIGEgc3RyZWFtXG5cdFBhcnNlci5wcm90b3R5cGUuX3BhcnNlU3RhdGUgPSBFbGVtZW50VHlwZS5UZXh0OyAvL0N1cnJlbnQgdHlwZSBvZiBlbGVtZW50IGJlaW5nIHBhcnNlZFxuXHRQYXJzZXIucHJvdG90eXBlLl9wcmV2VGFnU2VwID0gJyc7IC8vUHJldmlvdXMgdGFnIG1hcmtlciBmb3VuZFxuXHQvL1N0YWNrIG9mIGVsZW1lbnQgdHlwZXMgcHJldmlvdXNseSBlbmNvdW50ZXJlZDsga2VlcHMgdHJhY2sgb2Ygd2hlblxuXHQvL3BhcnNpbmcgb2NjdXJzIGluc2lkZSBhIHNjcmlwdC9jb21tZW50L3N0eWxlIHRhZ1xuXHRQYXJzZXIucHJvdG90eXBlLl90YWdTdGFjayA9IG51bGw7XG5cblx0Ly9NZXRob2RzLy9cblx0Ly9UYWtlcyBhbiBhcnJheSBvZiBlbGVtZW50cyBhbmQgcGFyc2VzIGFueSBmb3VuZCBhdHRyaWJ1dGVzXG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VUYWdBdHRyaWJzID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlVGFnQXR0cmlicyAoZWxlbWVudHMpIHtcblx0XHR2YXIgaWR4RW5kID0gZWxlbWVudHMubGVuZ3RoO1xuXHRcdHZhciBpZHggPSAwO1xuXHRcblx0XHR3aGlsZSAoaWR4IDwgaWR4RW5kKSB7XG5cdFx0XHR2YXIgZWxlbWVudCA9IGVsZW1lbnRzW2lkeCsrXTtcblx0XHRcdGlmIChlbGVtZW50LnR5cGUgPT0gRWxlbWVudFR5cGUuVGFnIHx8IGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5TY3JpcHQgfHwgZWxlbWVudC50eXBlID09IEVsZW1lbnRUeXBlLnN0eWxlKVxuXHRcdFx0XHR0aGlzLnBhcnNlQXR0cmlicyhlbGVtZW50KTtcblx0XHR9XG5cdFxuXHRcdHJldHVybihlbGVtZW50cyk7XG5cdH1cblxuXHQvL1Rha2VzIGFuIGVsZW1lbnQgYW5kIGFkZHMgYW4gXCJhdHRyaWJzXCIgcHJvcGVydHkgZm9yIGFueSBlbGVtZW50IGF0dHJpYnV0ZXMgZm91bmQgXG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VBdHRyaWJzID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlQXR0cmlicyAoZWxlbWVudCkge1xuXHRcdC8vT25seSBwYXJzZSBhdHRyaWJ1dGVzIGZvciB0YWdzXG5cdFx0aWYgKGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5TY3JpcHQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlN0eWxlICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UYWcpXG5cdFx0XHRyZXR1cm47XG5cdFxuXHRcdHZhciB0YWdOYW1lID0gZWxlbWVudC5kYXRhLnNwbGl0KFBhcnNlci5fcmVXaGl0ZXNwYWNlLCAxKVswXTtcblx0XHR2YXIgYXR0cmliUmF3ID0gZWxlbWVudC5kYXRhLnN1YnN0cmluZyh0YWdOYW1lLmxlbmd0aCk7XG5cdFx0aWYgKGF0dHJpYlJhdy5sZW5ndGggPCAxKVxuXHRcdFx0cmV0dXJuO1xuXHRcblx0XHR2YXIgbWF0Y2g7XG5cdFx0UGFyc2VyLl9yZUF0dHJpYi5sYXN0SW5kZXggPSAwO1xuXHRcdHdoaWxlIChtYXRjaCA9IFBhcnNlci5fcmVBdHRyaWIuZXhlYyhhdHRyaWJSYXcpKSB7XG5cdFx0XHRpZiAoZWxlbWVudC5hdHRyaWJzID09IHVuZGVmaW5lZClcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzID0ge307XG5cdFxuXHRcdFx0aWYgKHR5cGVvZiBtYXRjaFsxXSA9PSBcInN0cmluZ1wiICYmIG1hdGNoWzFdLmxlbmd0aCkge1xuXHRcdFx0XHRlbGVtZW50LmF0dHJpYnNbbWF0Y2hbMV1dID0gbWF0Y2hbMl07XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBtYXRjaFszXSA9PSBcInN0cmluZ1wiICYmIG1hdGNoWzNdLmxlbmd0aCkge1xuXHRcdFx0XHRlbGVtZW50LmF0dHJpYnNbbWF0Y2hbM10udG9TdHJpbmcoKV0gPSBtYXRjaFs0XS50b1N0cmluZygpO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgbWF0Y2hbNV0gPT0gXCJzdHJpbmdcIiAmJiBtYXRjaFs1XS5sZW5ndGgpIHtcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzW21hdGNoWzVdXSA9IG1hdGNoWzZdO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgbWF0Y2hbN10gPT0gXCJzdHJpbmdcIiAmJiBtYXRjaFs3XS5sZW5ndGgpIHtcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzW21hdGNoWzddXSA9IG1hdGNoWzddO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vRXh0cmFjdHMgdGhlIGJhc2UgdGFnIG5hbWUgZnJvbSB0aGUgZGF0YSB2YWx1ZSBvZiBhbiBlbGVtZW50XG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VUYWdOYW1lID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlVGFnTmFtZSAoZGF0YSkge1xuXHRcdGlmIChkYXRhID09IG51bGwgfHwgZGF0YSA9PSBcIlwiKVxuXHRcdFx0cmV0dXJuKFwiXCIpO1xuXHRcdHZhciBtYXRjaCA9IFBhcnNlci5fcmVUYWdOYW1lLmV4ZWMoZGF0YSk7XG5cdFx0aWYgKCFtYXRjaClcblx0XHRcdHJldHVybihcIlwiKTtcblx0XHRyZXR1cm4oKG1hdGNoWzFdID8gXCIvXCIgOiBcIlwiKSArIG1hdGNoWzJdKTtcblx0fVxuXG5cdC8vUGFyc2VzIHRocm91Z2ggSFRNTCB0ZXh0IGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIGZvdW5kIGVsZW1lbnRzXG5cdC8vSSBhZG1pdCwgdGhpcyBmdW5jdGlvbiBpcyByYXRoZXIgbGFyZ2UgYnV0IHNwbGl0dGluZyB1cCBoYWQgYW4gbm90aWNlYWJsZSBpbXBhY3Qgb24gc3BlZWRcblx0UGFyc2VyLnByb3RvdHlwZS5wYXJzZVRhZ3MgPSBmdW5jdGlvbiBQYXJzZXIkcGFyc2VUYWdzICgpIHtcblx0XHR2YXIgYnVmZmVyRW5kID0gdGhpcy5fYnVmZmVyLmxlbmd0aCAtIDE7XG5cdFx0d2hpbGUgKFBhcnNlci5fcmVUYWdzLnRlc3QodGhpcy5fYnVmZmVyKSkge1xuXHRcdFx0dGhpcy5fbmV4dCA9IFBhcnNlci5fcmVUYWdzLmxhc3RJbmRleCAtIDE7XG5cdFx0XHR2YXIgdGFnU2VwID0gdGhpcy5fYnVmZmVyLmNoYXJBdCh0aGlzLl9uZXh0KTsgLy9UaGUgY3VycmVudGx5IGZvdW5kIHRhZyBtYXJrZXJcblx0XHRcdHZhciByYXdEYXRhID0gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9jdXJyZW50LCB0aGlzLl9uZXh0KTsgLy9UaGUgbmV4dCBjaHVuayBvZiBkYXRhIHRvIHBhcnNlXG5cdFxuXHRcdFx0Ly9BIG5ldyBlbGVtZW50IHRvIGV2ZW50dWFsbHkgYmUgYXBwZW5kZWQgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0dmFyIGVsZW1lbnQgPSB7XG5cdFx0XHRcdCAgcmF3OiByYXdEYXRhXG5cdFx0XHRcdCwgZGF0YTogKHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuVGV4dCkgPyByYXdEYXRhIDogcmF3RGF0YS5yZXBsYWNlKFBhcnNlci5fcmVUcmltLCBcIlwiKVxuXHRcdFx0XHQsIHR5cGU6IHRoaXMuX3BhcnNlU3RhdGVcblx0XHRcdH07XG5cdFxuXHRcdFx0dmFyIGVsZW1lbnROYW1lID0gdGhpcy5wYXJzZVRhZ05hbWUoZWxlbWVudC5kYXRhKTtcblx0XG5cdFx0XHQvL1RoaXMgc2VjdGlvbiBpbnNwZWN0cyB0aGUgY3VycmVudCB0YWcgc3RhY2sgYW5kIG1vZGlmaWVzIHRoZSBjdXJyZW50XG5cdFx0XHQvL2VsZW1lbnQgaWYgd2UncmUgYWN0dWFsbHkgcGFyc2luZyBhIHNwZWNpYWwgYXJlYSAoc2NyaXB0L2NvbW1lbnQvc3R5bGUgdGFnKVxuXHRcdFx0aWYgKHRoaXMuX3RhZ1N0YWNrLmxlbmd0aCkgeyAvL1dlJ3JlIHBhcnNpbmcgaW5zaWRlIGEgc2NyaXB0L2NvbW1lbnQvc3R5bGUgdGFnXG5cdFx0XHRcdGlmICh0aGlzLl90YWdTdGFja1t0aGlzLl90YWdTdGFjay5sZW5ndGggLSAxXSA9PSBFbGVtZW50VHlwZS5TY3JpcHQpIHsgLy9XZSdyZSBjdXJyZW50bHkgaW4gYSBzY3JpcHQgdGFnXG5cdFx0XHRcdFx0aWYgKGVsZW1lbnROYW1lLnRvTG93ZXJDYXNlKCkgPT0gXCIvc2NyaXB0XCIpIC8vQWN0dWFsbHksIHdlJ3JlIG5vIGxvbmdlciBpbiBhIHNjcmlwdCB0YWcsIHNvIHBvcCBpdCBvZmYgdGhlIHN0YWNrXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wb3AoKTtcblx0XHRcdFx0XHRlbHNlIHsgLy9Ob3QgYSBjbG9zaW5nIHNjcmlwdCB0YWdcblx0XHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdy5pbmRleE9mKFwiIS0tXCIpICE9IDApIHsgLy9NYWtlIHN1cmUgd2UncmUgbm90IGluIGEgY29tbWVudFxuXHRcdFx0XHRcdFx0XHQvL0FsbCBkYXRhIGZyb20gaGVyZSB0byBzY3JpcHQgY2xvc2UgaXMgbm93IGEgdGV4dCBlbGVtZW50XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0XHRcdFx0XHRcdC8vSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaXMgdGV4dCwgYXBwZW5kIHRoZSBjdXJyZW50IHRleHQgdG8gaXRcblx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IEVsZW1lbnRUeXBlLlRleHQpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgcHJldkVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXTtcblx0XHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gcHJldkVsZW1lbnQucmF3ICsgdGhpcy5fcHJldlRhZ1NlcCArIGVsZW1lbnQucmF3O1xuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gXCJcIjsgLy9UaGlzIGNhdXNlcyB0aGUgY3VycmVudCBlbGVtZW50IHRvIG5vdCBiZSBhZGRlZCB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAodGhpcy5fdGFnU3RhY2tbdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMV0gPT0gRWxlbWVudFR5cGUuU3R5bGUpIHsgLy9XZSdyZSBjdXJyZW50bHkgaW4gYSBzdHlsZSB0YWdcblx0XHRcdFx0XHRpZiAoZWxlbWVudE5hbWUudG9Mb3dlckNhc2UoKSA9PSBcIi9zdHlsZVwiKSAvL0FjdHVhbGx5LCB3ZSdyZSBubyBsb25nZXIgaW4gYSBzdHlsZSB0YWcsIHNvIHBvcCBpdCBvZmYgdGhlIHN0YWNrXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wb3AoKTtcblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdy5pbmRleE9mKFwiIS0tXCIpICE9IDApIHsgLy9NYWtlIHN1cmUgd2UncmUgbm90IGluIGEgY29tbWVudFxuXHRcdFx0XHRcdFx0XHQvL0FsbCBkYXRhIGZyb20gaGVyZSB0byBzdHlsZSBjbG9zZSBpcyBub3cgYSB0ZXh0IGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdFx0XHRcdFx0Ly9JZiB0aGUgcHJldmlvdXMgZWxlbWVudCBpcyB0ZXh0LCBhcHBlbmQgdGhlIGN1cnJlbnQgdGV4dCB0byBpdFxuXHRcdFx0XHRcdFx0XHRpZiAodGhpcy5fZWxlbWVudHMubGVuZ3RoICYmIHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdLnR5cGUgPT0gRWxlbWVudFR5cGUuVGV4dCkge1xuXHRcdFx0XHRcdFx0XHRcdHZhciBwcmV2RWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdyAhPSBcIlwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gcHJldkVsZW1lbnQucmF3ICsgdGhpcy5fcHJldlRhZ1NlcCArIGVsZW1lbnQucmF3O1xuXHRcdFx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBcIlwiOyAvL1RoaXMgY2F1c2VzIHRoZSBjdXJyZW50IGVsZW1lbnQgdG8gbm90IGJlIGFkZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgeyAvL0VsZW1lbnQgaXMgZW1wdHksIHNvIGp1c3QgYXBwZW5kIHRoZSBsYXN0IHRhZyBtYXJrZXIgZm91bmRcblx0XHRcdFx0XHRcdFx0XHRcdHByZXZFbGVtZW50LnJhdyA9IHByZXZFbGVtZW50LmRhdGEgPSBwcmV2RWxlbWVudC5yYXcgKyB0aGlzLl9wcmV2VGFnU2VwO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHsgLy9UaGUgcHJldmlvdXMgZWxlbWVudCB3YXMgbm90IHRleHRcblx0XHRcdFx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcgIT0gXCJcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBlbGVtZW50LnJhdztcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAodGhpcy5fdGFnU3RhY2tbdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMV0gPT0gRWxlbWVudFR5cGUuQ29tbWVudCkgeyAvL1dlJ3JlIGN1cnJlbnRseSBpbiBhIGNvbW1lbnQgdGFnXG5cdFx0XHRcdFx0dmFyIHJhd0xlbiA9IGVsZW1lbnQucmF3Lmxlbmd0aDtcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuY2hhckF0KHJhd0xlbiAtIDIpID09IFwiLVwiICYmIGVsZW1lbnQucmF3LmNoYXJBdChyYXdMZW4gLSAxKSA9PSBcIi1cIiAmJiB0YWdTZXAgPT0gXCI+XCIpIHtcblx0XHRcdFx0XHRcdC8vQWN0dWFsbHksIHdlJ3JlIG5vIGxvbmdlciBpbiBhIHN0eWxlIHRhZywgc28gcG9wIGl0IG9mZiB0aGUgc3RhY2tcblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnBvcCgpO1xuXHRcdFx0XHRcdFx0Ly9JZiB0aGUgcHJldmlvdXMgZWxlbWVudCBpcyBhIGNvbW1lbnQsIGFwcGVuZCB0aGUgY3VycmVudCB0ZXh0IHRvIGl0XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5fZWxlbWVudHMubGVuZ3RoICYmIHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdLnR5cGUgPT0gRWxlbWVudFR5cGUuQ29tbWVudCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgcHJldkVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXTtcblx0XHRcdFx0XHRcdFx0cHJldkVsZW1lbnQucmF3ID0gcHJldkVsZW1lbnQuZGF0YSA9IChwcmV2RWxlbWVudC5yYXcgKyBlbGVtZW50LnJhdykucmVwbGFjZShQYXJzZXIuX3JlVHJpbUNvbW1lbnQsIFwiXCIpO1xuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IFwiXCI7IC8vVGhpcyBjYXVzZXMgdGhlIGN1cnJlbnQgZWxlbWVudCB0byBub3QgYmUgYWRkZWQgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSAvL1ByZXZpb3VzIGVsZW1lbnQgbm90IGEgY29tbWVudFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5Db21tZW50OyAvL0NoYW5nZSB0aGUgY3VycmVudCBlbGVtZW50J3MgdHlwZSB0byBhIGNvbW1lbnRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7IC8vU3RpbGwgaW4gYSBjb21tZW50IHRhZ1xuXHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuQ29tbWVudDtcblx0XHRcdFx0XHRcdC8vSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaXMgYSBjb21tZW50LCBhcHBlbmQgdGhlIGN1cnJlbnQgdGV4dCB0byBpdFxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IEVsZW1lbnRUeXBlLkNvbW1lbnQpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHByZXZFbGVtZW50ID0gdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0XHRcdHByZXZFbGVtZW50LnJhdyA9IHByZXZFbGVtZW50LmRhdGEgPSBwcmV2RWxlbWVudC5yYXcgKyBlbGVtZW50LnJhdyArIHRhZ1NlcDtcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBcIlwiOyAvL1RoaXMgY2F1c2VzIHRoZSBjdXJyZW50IGVsZW1lbnQgdG8gbm90IGJlIGFkZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBlbGVtZW50LnJhdyArIHRhZ1NlcDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XG5cdFx0XHQvL1Byb2Nlc3Npbmcgb2Ygbm9uLXNwZWNpYWwgdGFnc1xuXHRcdFx0aWYgKGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5UYWcpIHtcblx0XHRcdFx0ZWxlbWVudC5uYW1lID0gZWxlbWVudE5hbWU7XG5cdFx0XHRcdHZhciBlbGVtZW50TmFtZUNJID0gZWxlbWVudE5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChlbGVtZW50LnJhdy5pbmRleE9mKFwiIS0tXCIpID09IDApIHsgLy9UaGlzIHRhZyBpcyByZWFsbHkgY29tbWVudFxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLkNvbW1lbnQ7XG5cdFx0XHRcdFx0ZGVsZXRlIGVsZW1lbnRbXCJuYW1lXCJdO1xuXHRcdFx0XHRcdHZhciByYXdMZW4gPSBlbGVtZW50LnJhdy5sZW5ndGg7XG5cdFx0XHRcdFx0Ly9DaGVjayBpZiB0aGUgY29tbWVudCBpcyB0ZXJtaW5hdGVkIGluIHRoZSBjdXJyZW50IGVsZW1lbnRcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuY2hhckF0KHJhd0xlbiAtIDEpID09IFwiLVwiICYmIGVsZW1lbnQucmF3LmNoYXJBdChyYXdMZW4gLSAyKSA9PSBcIi1cIiAmJiB0YWdTZXAgPT0gXCI+XCIpXG5cdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IGVsZW1lbnQucmF3LnJlcGxhY2UoUGFyc2VyLl9yZVRyaW1Db21tZW50LCBcIlwiKTtcblx0XHRcdFx0XHRlbHNlIHsgLy9JdCdzIG5vdCBzbyBwdXNoIHRoZSBjb21tZW50IG9udG8gdGhlIHRhZyBzdGFja1xuXHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgKz0gdGFnU2VwO1xuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChFbGVtZW50VHlwZS5Db21tZW50KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudC5yYXcuaW5kZXhPZihcIiFcIikgPT0gMCB8fCBlbGVtZW50LnJhdy5pbmRleE9mKFwiP1wiKSA9PSAwKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuRGlyZWN0aXZlO1xuXHRcdFx0XHRcdC8vVE9ETzogd2hhdCBhYm91dCBDREFUQT9cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChlbGVtZW50TmFtZUNJID09IFwic2NyaXB0XCIpIHtcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5TY3JpcHQ7XG5cdFx0XHRcdFx0Ly9TcGVjaWFsIHRhZywgcHVzaCBvbnRvIHRoZSB0YWcgc3RhY2sgaWYgbm90IHRlcm1pbmF0ZWRcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5kYXRhLmNoYXJBdChlbGVtZW50LmRhdGEubGVuZ3RoIC0gMSkgIT0gXCIvXCIpXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKEVsZW1lbnRUeXBlLlNjcmlwdCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudE5hbWVDSSA9PSBcIi9zY3JpcHRcIilcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5TY3JpcHQ7XG5cdFx0XHRcdGVsc2UgaWYgKGVsZW1lbnROYW1lQ0kgPT0gXCJzdHlsZVwiKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuU3R5bGU7XG5cdFx0XHRcdFx0Ly9TcGVjaWFsIHRhZywgcHVzaCBvbnRvIHRoZSB0YWcgc3RhY2sgaWYgbm90IHRlcm1pbmF0ZWRcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5kYXRhLmNoYXJBdChlbGVtZW50LmRhdGEubGVuZ3RoIC0gMSkgIT0gXCIvXCIpXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKEVsZW1lbnRUeXBlLlN0eWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChlbGVtZW50TmFtZUNJID09IFwiL3N0eWxlXCIpXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuU3R5bGU7XG5cdFx0XHRcdGlmIChlbGVtZW50Lm5hbWUgJiYgZWxlbWVudC5uYW1lLmNoYXJBdCgwKSA9PSBcIi9cIilcblx0XHRcdFx0XHRlbGVtZW50LmRhdGEgPSBlbGVtZW50Lm5hbWU7XG5cdFx0XHR9XG5cdFxuXHRcdFx0Ly9BZGQgYWxsIHRhZ3MgYW5kIG5vbi1lbXB0eSB0ZXh0IGVsZW1lbnRzIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdGlmIChlbGVtZW50LnJhdyAhPSBcIlwiIHx8IGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UZXh0KSB7XG5cdFx0XHRcdGlmICh0aGlzLl9vcHRpb25zLmluY2x1ZGVMb2NhdGlvbiAmJiAhZWxlbWVudC5sb2NhdGlvbikge1xuXHRcdFx0XHRcdGVsZW1lbnQubG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5UYWcpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMucGFyc2VBdHRyaWJzKGVsZW1lbnQpO1xuXHRcdFx0XHR0aGlzLl9lbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0XHQvL0lmIHRhZyBzZWxmLXRlcm1pbmF0ZXMsIGFkZCBhbiBleHBsaWNpdCwgc2VwYXJhdGUgY2xvc2luZyB0YWdcblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UZXh0XG5cdFx0XHRcdFx0JiZcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuQ29tbWVudFxuXHRcdFx0XHRcdCYmXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkRpcmVjdGl2ZVxuXHRcdFx0XHRcdCYmXG5cdFx0XHRcdFx0ZWxlbWVudC5kYXRhLmNoYXJBdChlbGVtZW50LmRhdGEubGVuZ3RoIC0gMSkgPT0gXCIvXCJcblx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0dGhpcy5fZWxlbWVudHMucHVzaCh7XG5cdFx0XHRcdFx0XHQgIHJhdzogXCIvXCIgKyBlbGVtZW50Lm5hbWVcblx0XHRcdFx0XHRcdCwgZGF0YTogXCIvXCIgKyBlbGVtZW50Lm5hbWVcblx0XHRcdFx0XHRcdCwgbmFtZTogXCIvXCIgKyBlbGVtZW50Lm5hbWVcblx0XHRcdFx0XHRcdCwgdHlwZTogZWxlbWVudC50eXBlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9wYXJzZVN0YXRlID0gKHRhZ1NlcCA9PSBcIjxcIikgPyBFbGVtZW50VHlwZS5UYWcgOiBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdFx0dGhpcy5fY3VycmVudCA9IHRoaXMuX25leHQgKyAxO1xuXHRcdFx0dGhpcy5fcHJldlRhZ1NlcCA9IHRhZ1NlcDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24pIHtcblx0XHRcdHRoaXMuZ2V0TG9jYXRpb24oKTtcblx0XHRcdHRoaXMuX2xvY2F0aW9uLnJvdyArPSB0aGlzLl9sb2NhdGlvbi5pbkJ1ZmZlcjtcblx0XHRcdHRoaXMuX2xvY2F0aW9uLmluQnVmZmVyID0gMDtcblx0XHRcdHRoaXMuX2xvY2F0aW9uLmNoYXJPZmZzZXQgPSAwO1xuXHRcdH1cblx0XHR0aGlzLl9idWZmZXIgPSAodGhpcy5fY3VycmVudCA8PSBidWZmZXJFbmQpID8gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9jdXJyZW50KSA6IFwiXCI7XG5cdFx0dGhpcy5fY3VycmVudCA9IDA7XG5cdFxuXHRcdHRoaXMud3JpdGVIYW5kbGVyKCk7XG5cdH1cblxuXHRQYXJzZXIucHJvdG90eXBlLmdldExvY2F0aW9uID0gZnVuY3Rpb24gUGFyc2VyJGdldExvY2F0aW9uIChzdGFydFRhZykge1xuXHRcdHZhciBjLFxuXHRcdFx0bCA9IHRoaXMuX2xvY2F0aW9uLFxuXHRcdFx0ZW5kID0gdGhpcy5fY3VycmVudCAtIChzdGFydFRhZyA/IDEgOiAwKSxcblx0XHRcdGNodW5rID0gc3RhcnRUYWcgJiYgbC5jaGFyT2Zmc2V0ID09IDAgJiYgdGhpcy5fY3VycmVudCA9PSAwO1xuXHRcdFxuXHRcdGZvciAoOyBsLmNoYXJPZmZzZXQgPCBlbmQ7IGwuY2hhck9mZnNldCsrKSB7XG5cdFx0XHRjID0gdGhpcy5fYnVmZmVyLmNoYXJBdChsLmNoYXJPZmZzZXQpO1xuXHRcdFx0aWYgKGMgPT0gJ1xcbicpIHtcblx0XHRcdFx0bC5pbkJ1ZmZlcisrO1xuXHRcdFx0XHRsLmNvbCA9IDA7XG5cdFx0XHR9IGVsc2UgaWYgKGMgIT0gJ1xccicpIHtcblx0XHRcdFx0bC5jb2wrKztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHtcblx0XHRcdCAgbGluZTogbC5yb3cgKyBsLmluQnVmZmVyICsgMVxuXHRcdFx0LCBjb2w6IGwuY29sICsgKGNodW5rID8gMDogMSlcblx0XHR9O1xuXHR9XG5cblx0Ly9DaGVja3MgdGhlIGhhbmRsZXIgdG8gbWFrZSBpdCBpcyBhbiBvYmplY3Qgd2l0aCB0aGUgcmlnaHQgXCJpbnRlcmZhY2VcIlxuXHRQYXJzZXIucHJvdG90eXBlLnZhbGlkYXRlSGFuZGxlciA9IGZ1bmN0aW9uIFBhcnNlciR2YWxpZGF0ZUhhbmRsZXIgKGhhbmRsZXIpIHtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyKSAhPSBcIm9iamVjdFwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBpcyBub3QgYW4gb2JqZWN0XCIpO1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIucmVzZXQpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICdyZXNldCcgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLmRvbmUpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICdkb25lJyBpcyBpbnZhbGlkXCIpO1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIud3JpdGVUYWcpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICd3cml0ZVRhZycgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlVGV4dCkgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ3dyaXRlVGV4dCcgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlQ29tbWVudCkgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ3dyaXRlQ29tbWVudCcgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlRGlyZWN0aXZlKSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAnd3JpdGVEaXJlY3RpdmUnIGlzIGludmFsaWRcIik7XG5cdH1cblxuXHQvL1dyaXRlcyBwYXJzZWQgZWxlbWVudHMgb3V0IHRvIHRoZSBoYW5kbGVyXG5cdFBhcnNlci5wcm90b3R5cGUud3JpdGVIYW5kbGVyID0gZnVuY3Rpb24gUGFyc2VyJHdyaXRlSGFuZGxlciAoZm9yY2VGbHVzaCkge1xuXHRcdGZvcmNlRmx1c2ggPSAhIWZvcmNlRmx1c2g7XG5cdFx0aWYgKHRoaXMuX3RhZ1N0YWNrLmxlbmd0aCAmJiAhZm9yY2VGbHVzaClcblx0XHRcdHJldHVybjtcblx0XHR3aGlsZSAodGhpcy5fZWxlbWVudHMubGVuZ3RoKSB7XG5cdFx0XHR2YXIgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzLnNoaWZ0KCk7XG5cdFx0XHRzd2l0Y2ggKGVsZW1lbnQudHlwZSkge1xuXHRcdFx0XHRjYXNlIEVsZW1lbnRUeXBlLkNvbW1lbnQ6XG5cdFx0XHRcdFx0dGhpcy5faGFuZGxlci53cml0ZUNvbW1lbnQoZWxlbWVudCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgRWxlbWVudFR5cGUuRGlyZWN0aXZlOlxuXHRcdFx0XHRcdHRoaXMuX2hhbmRsZXIud3JpdGVEaXJlY3RpdmUoZWxlbWVudCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgRWxlbWVudFR5cGUuVGV4dDpcblx0XHRcdFx0XHR0aGlzLl9oYW5kbGVyLndyaXRlVGV4dChlbGVtZW50KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHR0aGlzLl9oYW5kbGVyLndyaXRlVGFnKGVsZW1lbnQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdFBhcnNlci5wcm90b3R5cGUuaGFuZGxlRXJyb3IgPSBmdW5jdGlvbiBQYXJzZXIkaGFuZGxlRXJyb3IgKGVycm9yKSB7XG5cdFx0aWYgKCh0eXBlb2YgdGhpcy5faGFuZGxlci5lcnJvcikgPT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhpcy5faGFuZGxlci5lcnJvcihlcnJvcik7XG5cdFx0ZWxzZVxuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdH1cblxuLy9UT0RPOiBtYWtlIHRoaXMgYSB0cnVsbHkgc3RyZWFtYWJsZSBoYW5kbGVyXG5mdW5jdGlvbiBSc3NIYW5kbGVyIChjYWxsYmFjaykge1xuXHRSc3NIYW5kbGVyLnN1cGVyXy5jYWxsKHRoaXMsIGNhbGxiYWNrLCB7IGlnbm9yZVdoaXRlc3BhY2U6IHRydWUsIHZlcmJvc2U6IGZhbHNlLCBlbmZvcmNlRW1wdHlUYWdzOiBmYWxzZSB9KTtcbn1cbmluaGVyaXRzKFJzc0hhbmRsZXIsIERlZmF1bHRIYW5kbGVyKTtcblxuXHRSc3NIYW5kbGVyLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gUnNzSGFuZGxlciRkb25lICgpIHtcblx0XHR2YXIgZmVlZCA9IHsgfTtcblx0XHR2YXIgZmVlZFJvb3Q7XG5cblx0XHR2YXIgZm91bmQgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShmdW5jdGlvbiAodmFsdWUpIHsgcmV0dXJuKHZhbHVlID09IFwicnNzXCIgfHwgdmFsdWUgPT0gXCJmZWVkXCIpOyB9LCB0aGlzLmRvbSwgZmFsc2UpO1xuXHRcdGlmIChmb3VuZC5sZW5ndGgpIHtcblx0XHRcdGZlZWRSb290ID0gZm91bmRbMF07XG5cdFx0fVxuXHRcdGlmIChmZWVkUm9vdCkge1xuXHRcdFx0aWYgKGZlZWRSb290Lm5hbWUgPT0gXCJyc3NcIikge1xuXHRcdFx0XHRmZWVkLnR5cGUgPSBcInJzc1wiO1xuXHRcdFx0XHRmZWVkUm9vdCA9IGZlZWRSb290LmNoaWxkcmVuWzBdOyAvLzxjaGFubmVsLz5cblx0XHRcdFx0ZmVlZC5pZCA9IFwiXCI7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQuZGVzY3JpcHRpb24gPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImRlc2NyaXB0aW9uXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQudXBkYXRlZCA9IG5ldyBEYXRlKERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGFzdEJ1aWxkRGF0ZVwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGEpO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5hdXRob3IgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcIm1hbmFnaW5nRWRpdG9yXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRmZWVkLml0ZW1zID0gW107XG5cdFx0XHRcdERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaXRlbVwiLCBmZWVkUm9vdC5jaGlsZHJlbikuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdFx0XHR2YXIgZW50cnkgPSB7fTtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkuaWQgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImd1aWRcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkuZGVzY3JpcHRpb24gPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImRlc2NyaXB0aW9uXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkucHViRGF0ZSA9IG5ldyBEYXRlKERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicHViRGF0ZVwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdGZlZWQuaXRlbXMucHVzaChlbnRyeSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZmVlZC50eXBlID0gXCJhdG9tXCI7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5pZCA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaWRcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uYXR0cmlicy5ocmVmO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5kZXNjcmlwdGlvbiA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3VidGl0bGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC51cGRhdGVkID0gbmV3IERhdGUoRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ1cGRhdGVkXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLmF1dGhvciA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZW1haWxcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIHRydWUpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0ZmVlZC5pdGVtcyA9IFtdO1xuXHRcdFx0XHREb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImVudHJ5XCIsIGZlZWRSb290LmNoaWxkcmVuKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0XHRcdHZhciBlbnRyeSA9IHt9O1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5pZCA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaWRcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5hdHRyaWJzLmhyZWY7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5kZXNjcmlwdGlvbiA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3VtbWFyeVwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LnB1YkRhdGUgPSBuZXcgRGF0ZShEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInVwZGF0ZWRcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGEpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHRmZWVkLml0ZW1zLnB1c2goZW50cnkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5kb20gPSBmZWVkO1xuXHRcdH1cblx0XHRSc3NIYW5kbGVyLnN1cGVyXy5wcm90b3R5cGUuZG9uZS5jYWxsKHRoaXMpO1xuXHR9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBEZWZhdWx0SGFuZGxlciAoY2FsbGJhY2ssIG9wdGlvbnMpIHtcblx0dGhpcy5yZXNldCgpO1xuXHR0aGlzLl9vcHRpb25zID0gb3B0aW9ucyA/IG9wdGlvbnMgOiB7IH07XG5cdGlmICh0aGlzLl9vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UgPT0gdW5kZWZpbmVkKVxuXHRcdHRoaXMuX29wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSA9IGZhbHNlOyAvL0tlZXAgd2hpdGVzcGFjZS1vbmx5IHRleHQgbm9kZXNcblx0aWYgKHRoaXMuX29wdGlvbnMudmVyYm9zZSA9PSB1bmRlZmluZWQpXG5cdFx0dGhpcy5fb3B0aW9ucy52ZXJib3NlID0gdHJ1ZTsgLy9LZWVwIGRhdGEgcHJvcGVydHkgZm9yIHRhZ3MgYW5kIHJhdyBwcm9wZXJ0eSBmb3IgYWxsXG5cdGlmICh0aGlzLl9vcHRpb25zLmVuZm9yY2VFbXB0eVRhZ3MgPT0gdW5kZWZpbmVkKVxuXHRcdHRoaXMuX29wdGlvbnMuZW5mb3JjZUVtcHR5VGFncyA9IHRydWU7IC8vRG9uJ3QgYWxsb3cgY2hpbGRyZW4gZm9yIEhUTUwgdGFncyBkZWZpbmVkIGFzIGVtcHR5IGluIHNwZWNcblx0aWYgKCh0eXBlb2YgY2FsbGJhY2spID09IFwiZnVuY3Rpb25cIilcblx0XHR0aGlzLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xufVxuXG5cdC8vKipcIlN0YXRpY1wiKiovL1xuXHQvL0hUTUwgVGFncyB0aGF0IHNob3VsZG4ndCBjb250YWluIGNoaWxkIG5vZGVzXG5cdERlZmF1bHRIYW5kbGVyLl9lbXB0eVRhZ3MgPSB7XG5cdFx0ICBhcmVhOiAxXG5cdFx0LCBiYXNlOiAxXG5cdFx0LCBiYXNlZm9udDogMVxuXHRcdCwgYnI6IDFcblx0XHQsIGNvbDogMVxuXHRcdCwgZnJhbWU6IDFcblx0XHQsIGhyOiAxXG5cdFx0LCBpbWc6IDFcblx0XHQsIGlucHV0OiAxXG5cdFx0LCBpc2luZGV4OiAxXG5cdFx0LCBsaW5rOiAxXG5cdFx0LCBtZXRhOiAxXG5cdFx0LCBwYXJhbTogMVxuXHRcdCwgZW1iZWQ6IDFcblx0fVxuXHQvL1JlZ2V4IHRvIGRldGVjdCB3aGl0ZXNwYWNlIG9ubHkgdGV4dCBub2Rlc1xuXHREZWZhdWx0SGFuZGxlci5yZVdoaXRlc3BhY2UgPSAvXlxccyokLztcblxuXHQvLyoqUHVibGljKiovL1xuXHQvL1Byb3BlcnRpZXMvL1xuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuZG9tID0gbnVsbDsgLy9UaGUgaGllcmFyY2hpY2FsIG9iamVjdCBjb250YWluaW5nIHRoZSBwYXJzZWQgSFRNTFxuXHQvL01ldGhvZHMvL1xuXHQvL1Jlc2V0cyB0aGUgaGFuZGxlciBiYWNrIHRvIHN0YXJ0aW5nIHN0YXRlXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHJlc2V0KCkge1xuXHRcdHRoaXMuZG9tID0gW107XG5cdFx0dGhpcy5fZG9uZSA9IGZhbHNlO1xuXHRcdHRoaXMuX3RhZ1N0YWNrID0gW107XG5cdFx0dGhpcy5fdGFnU3RhY2subGFzdCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJF90YWdTdGFjayRsYXN0ICgpIHtcblx0XHRcdHJldHVybih0aGlzLmxlbmd0aCA/IHRoaXNbdGhpcy5sZW5ndGggLSAxXSA6IG51bGwpO1xuXHRcdH1cblx0fVxuXHQvL1NpZ25hbHMgdGhlIGhhbmRsZXIgdGhhdCBwYXJzaW5nIGlzIGRvbmVcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRkb25lICgpIHtcblx0XHR0aGlzLl9kb25lID0gdHJ1ZTtcblx0XHR0aGlzLmhhbmRsZUNhbGxiYWNrKG51bGwpO1xuXHR9XG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS53cml0ZVRhZyA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHdyaXRlVGFnIChlbGVtZW50KSB7XG5cdFx0dGhpcy5oYW5kbGVFbGVtZW50KGVsZW1lbnQpO1xuXHR9IFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVUZXh0ID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkd3JpdGVUZXh0IChlbGVtZW50KSB7XG5cdFx0aWYgKHRoaXMuX29wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSlcblx0XHRcdGlmIChEZWZhdWx0SGFuZGxlci5yZVdoaXRlc3BhY2UudGVzdChlbGVtZW50LmRhdGEpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0dGhpcy5oYW5kbGVFbGVtZW50KGVsZW1lbnQpO1xuXHR9IFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVDb21tZW50ID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkd3JpdGVDb21tZW50IChlbGVtZW50KSB7XG5cdFx0dGhpcy5oYW5kbGVFbGVtZW50KGVsZW1lbnQpO1xuXHR9IFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVEaXJlY3RpdmUgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciR3cml0ZURpcmVjdGl2ZSAoZWxlbWVudCkge1xuXHRcdHRoaXMuaGFuZGxlRWxlbWVudChlbGVtZW50KTtcblx0fVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRlcnJvciAoZXJyb3IpIHtcblx0XHR0aGlzLmhhbmRsZUNhbGxiYWNrKGVycm9yKTtcblx0fVxuXG5cdC8vKipQcml2YXRlKiovL1xuXHQvL1Byb3BlcnRpZXMvL1xuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuX29wdGlvbnMgPSBudWxsOyAvL0hhbmRsZXIgb3B0aW9ucyBmb3IgaG93IHRvIGJlaGF2ZVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuX2NhbGxiYWNrID0gbnVsbDsgLy9DYWxsYmFjayB0byByZXNwb25kIHRvIHdoZW4gcGFyc2luZyBkb25lXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5fZG9uZSA9IGZhbHNlOyAvL0ZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIGhhbmRsZXIgaGFzIGJlZW4gbm90aWZpZWQgb2YgcGFyc2luZyBjb21wbGV0ZWRcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLl90YWdTdGFjayA9IG51bGw7IC8vTGlzdCBvZiBwYXJlbnRzIHRvIHRoZSBjdXJyZW50bHkgZWxlbWVudCBiZWluZyBwcm9jZXNzZWRcblx0Ly9NZXRob2RzLy9cblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmhhbmRsZUNhbGxiYWNrID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkaGFuZGxlQ2FsbGJhY2sgKGVycm9yKSB7XG5cdFx0XHRpZiAoKHR5cGVvZiB0aGlzLl9jYWxsYmFjaykgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRpZiAoZXJyb3IpXG5cdFx0XHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHR0aGlzLl9jYWxsYmFjayhlcnJvciwgdGhpcy5kb20pO1xuXHR9XG5cdFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuaXNFbXB0eVRhZyA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcblx0XHR2YXIgbmFtZSA9IGVsZW1lbnQubmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmIChuYW1lLmNoYXJBdCgwKSA9PSAnLycpIHtcblx0XHRcdG5hbWUgPSBuYW1lLnN1YnN0cmluZygxKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX29wdGlvbnMuZW5mb3JjZUVtcHR5VGFncyAmJiAhIURlZmF1bHRIYW5kbGVyLl9lbXB0eVRhZ3NbbmFtZV07XG5cdH07XG5cdFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuaGFuZGxlRWxlbWVudCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJGhhbmRsZUVsZW1lbnQgKGVsZW1lbnQpIHtcblx0XHRpZiAodGhpcy5fZG9uZSlcblx0XHRcdHRoaXMuaGFuZGxlQ2FsbGJhY2sobmV3IEVycm9yKFwiV3JpdGluZyB0byB0aGUgaGFuZGxlciBhZnRlciBkb25lKCkgY2FsbGVkIGlzIG5vdCBhbGxvd2VkIHdpdGhvdXQgYSByZXNldCgpXCIpKTtcblx0XHRpZiAoIXRoaXMuX29wdGlvbnMudmVyYm9zZSkge1xuLy9cdFx0XHRlbGVtZW50LnJhdyA9IG51bGw7IC8vRklYTUU6IE5vdCBjbGVhblxuXHRcdFx0Ly9GSVhNRTogU2VyaW91cyBwZXJmb3JtYW5jZSBwcm9ibGVtIHVzaW5nIGRlbGV0ZVxuXHRcdFx0ZGVsZXRlIGVsZW1lbnQucmF3O1xuXHRcdFx0aWYgKGVsZW1lbnQudHlwZSA9PSBcInRhZ1wiIHx8IGVsZW1lbnQudHlwZSA9PSBcInNjcmlwdFwiIHx8IGVsZW1lbnQudHlwZSA9PSBcInN0eWxlXCIpXG5cdFx0XHRcdGRlbGV0ZSBlbGVtZW50LmRhdGE7XG5cdFx0fVxuXHRcdGlmICghdGhpcy5fdGFnU3RhY2subGFzdCgpKSB7IC8vVGhlcmUgYXJlIG5vIHBhcmVudCBlbGVtZW50c1xuXHRcdFx0Ly9JZiB0aGUgZWxlbWVudCBjYW4gYmUgYSBjb250YWluZXIsIGFkZCBpdCB0byB0aGUgdGFnIHN0YWNrIGFuZCB0aGUgdG9wIGxldmVsIGxpc3Rcblx0XHRcdGlmIChlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuVGV4dCAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuQ29tbWVudCAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuRGlyZWN0aXZlKSB7XG5cdFx0XHRcdGlmIChlbGVtZW50Lm5hbWUuY2hhckF0KDApICE9IFwiL1wiKSB7IC8vSWdub3JlIGNsb3NpbmcgdGFncyB0aGF0IG9idmlvdXNseSBkb24ndCBoYXZlIGFuIG9wZW5pbmcgdGFnXG5cdFx0XHRcdFx0dGhpcy5kb20ucHVzaChlbGVtZW50KTtcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNFbXB0eVRhZyhlbGVtZW50KSkgeyAvL0Rvbid0IGFkZCB0YWdzIHRvIHRoZSB0YWcgc3RhY2sgdGhhdCBjYW4ndCBoYXZlIGNoaWxkcmVuXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSAvL090aGVyd2lzZSBqdXN0IGFkZCB0byB0aGUgdG9wIGxldmVsIGxpc3Rcblx0XHRcdFx0dGhpcy5kb20ucHVzaChlbGVtZW50KTtcblx0XHR9XG5cdFx0ZWxzZSB7IC8vVGhlcmUgYXJlIHBhcmVudCBlbGVtZW50c1xuXHRcdFx0Ly9JZiB0aGUgZWxlbWVudCBjYW4gYmUgYSBjb250YWluZXIsIGFkZCBpdCBhcyBhIGNoaWxkIG9mIHRoZSBlbGVtZW50XG5cdFx0XHQvL29uIHRvcCBvZiB0aGUgdGFnIHN0YWNrIGFuZCB0aGVuIGFkZCBpdCB0byB0aGUgdGFnIHN0YWNrXG5cdFx0XHRpZiAoZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlRleHQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkNvbW1lbnQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkRpcmVjdGl2ZSkge1xuXHRcdFx0XHRpZiAoZWxlbWVudC5uYW1lLmNoYXJBdCgwKSA9PSBcIi9cIikge1xuXHRcdFx0XHRcdC8vVGhpcyBpcyBhIGNsb3NpbmcgdGFnLCBzY2FuIHRoZSB0YWdTdGFjayB0byBmaW5kIHRoZSBtYXRjaGluZyBvcGVuaW5nIHRhZ1xuXHRcdFx0XHRcdC8vYW5kIHBvcCB0aGUgc3RhY2sgdXAgdG8gdGhlIG9wZW5pbmcgdGFnJ3MgcGFyZW50XG5cdFx0XHRcdFx0dmFyIGJhc2VOYW1lID0gZWxlbWVudC5uYW1lLnN1YnN0cmluZygxKTtcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNFbXB0eVRhZyhlbGVtZW50KSkge1xuXHRcdFx0XHRcdFx0dmFyIHBvcyA9IHRoaXMuX3RhZ1N0YWNrLmxlbmd0aCAtIDE7XG5cdFx0XHRcdFx0XHR3aGlsZSAocG9zID4gLTEgJiYgdGhpcy5fdGFnU3RhY2tbcG9zLS1dLm5hbWUgIT0gYmFzZU5hbWUpIHsgfVxuXHRcdFx0XHRcdFx0aWYgKHBvcyA+IC0xIHx8IHRoaXMuX3RhZ1N0YWNrWzBdLm5hbWUgPT0gYmFzZU5hbWUpXG5cdFx0XHRcdFx0XHRcdHdoaWxlIChwb3MgPCB0aGlzLl90YWdTdGFjay5sZW5ndGggLSAxKVxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnBvcCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHsgLy9UaGlzIGlzIG5vdCBhIGNsb3NpbmcgdGFnXG5cdFx0XHRcdFx0aWYgKCF0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4pXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4gPSBbXTtcblx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4ucHVzaChlbGVtZW50KTtcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNFbXB0eVRhZyhlbGVtZW50KSkgLy9Eb24ndCBhZGQgdGFncyB0byB0aGUgdGFnIHN0YWNrIHRoYXQgY2FuJ3QgaGF2ZSBjaGlsZHJlblxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChlbGVtZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7IC8vVGhpcyBpcyBub3QgYSBjb250YWluZXIgZWxlbWVudFxuXHRcdFx0XHRpZiAoIXRoaXMuX3RhZ1N0YWNrLmxhc3QoKS5jaGlsZHJlbilcblx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4gPSBbXTtcblx0XHRcdFx0dGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuLnB1c2goZWxlbWVudCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0dmFyIERvbVV0aWxzID0ge1xuXHRcdCAgdGVzdEVsZW1lbnQ6IGZ1bmN0aW9uIERvbVV0aWxzJHRlc3RFbGVtZW50IChvcHRpb25zLCBlbGVtZW50KSB7XG5cdFx0XHRpZiAoIWVsZW1lbnQpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcblx0XHRcdGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdGlmIChrZXkgPT0gXCJ0YWdfbmFtZVwiKSB7XG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQudHlwZSAhPSBcInRhZ1wiICYmIGVsZW1lbnQudHlwZSAhPSBcInNjcmlwdFwiICYmIGVsZW1lbnQudHlwZSAhPSBcInN0eWxlXCIpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCFvcHRpb25zW1widGFnX25hbWVcIl0oZWxlbWVudC5uYW1lKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChrZXkgPT0gXCJ0YWdfdHlwZVwiKSB7XG5cdFx0XHRcdFx0aWYgKCFvcHRpb25zW1widGFnX3R5cGVcIl0oZWxlbWVudC50eXBlKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChrZXkgPT0gXCJ0YWdfY29udGFpbnNcIikge1xuXHRcdFx0XHRcdGlmIChlbGVtZW50LnR5cGUgIT0gXCJ0ZXh0XCIgJiYgZWxlbWVudC50eXBlICE9IFwiY29tbWVudFwiICYmIGVsZW1lbnQudHlwZSAhPSBcImRpcmVjdGl2ZVwiKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICghb3B0aW9uc1tcInRhZ19jb250YWluc1wiXShlbGVtZW50LmRhdGEpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmICghZWxlbWVudC5hdHRyaWJzIHx8ICFvcHRpb25zW2tleV0oZWxlbWVudC5hdHRyaWJzW2tleV0pKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFxuXHRcdCwgZ2V0RWxlbWVudHM6IGZ1bmN0aW9uIERvbVV0aWxzJGdldEVsZW1lbnRzIChvcHRpb25zLCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpIHtcblx0XHRcdHJlY3Vyc2UgPSAocmVjdXJzZSA9PT0gdW5kZWZpbmVkIHx8IHJlY3Vyc2UgPT09IG51bGwpIHx8ICEhcmVjdXJzZTtcblx0XHRcdGxpbWl0ID0gaXNOYU4ocGFyc2VJbnQobGltaXQpKSA/IC0xIDogcGFyc2VJbnQobGltaXQpO1xuXG5cdFx0XHRpZiAoIWN1cnJlbnRFbGVtZW50KSB7XG5cdFx0XHRcdHJldHVybihbXSk7XG5cdFx0XHR9XG5cdFxuXHRcdFx0dmFyIGZvdW5kID0gW107XG5cdFx0XHR2YXIgZWxlbWVudExpc3Q7XG5cblx0XHRcdGZ1bmN0aW9uIGdldFRlc3QgKGNoZWNrVmFsKSB7XG5cdFx0XHRcdHJldHVybihmdW5jdGlvbiAodmFsdWUpIHsgcmV0dXJuKHZhbHVlID09IGNoZWNrVmFsKTsgfSk7XG5cdFx0XHR9XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRpZiAoKHR5cGVvZiBvcHRpb25zW2tleV0pICE9IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdG9wdGlvbnNba2V5XSA9IGdldFRlc3Qob3B0aW9uc1trZXldKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcblx0XHRcdGlmIChEb21VdGlscy50ZXN0RWxlbWVudChvcHRpb25zLCBjdXJyZW50RWxlbWVudCkpIHtcblx0XHRcdFx0Zm91bmQucHVzaChjdXJyZW50RWxlbWVudCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChsaW1pdCA+PSAwICYmIGZvdW5kLmxlbmd0aCA+PSBsaW1pdCkge1xuXHRcdFx0XHRyZXR1cm4oZm91bmQpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmVjdXJzZSAmJiBjdXJyZW50RWxlbWVudC5jaGlsZHJlbikge1xuXHRcdFx0XHRlbGVtZW50TGlzdCA9IGN1cnJlbnRFbGVtZW50LmNoaWxkcmVuO1xuXHRcdFx0fSBlbHNlIGlmIChjdXJyZW50RWxlbWVudCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdGVsZW1lbnRMaXN0ID0gY3VycmVudEVsZW1lbnQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4oZm91bmQpO1xuXHRcdFx0fVxuXHRcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudExpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0Zm91bmQgPSBmb3VuZC5jb25jYXQoRG9tVXRpbHMuZ2V0RWxlbWVudHMob3B0aW9ucywgZWxlbWVudExpc3RbaV0sIHJlY3Vyc2UsIGxpbWl0KSk7XG5cdFx0XHRcdGlmIChsaW1pdCA+PSAwICYmIGZvdW5kLmxlbmd0aCA+PSBsaW1pdCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFxuXHRcdFx0cmV0dXJuKGZvdW5kKTtcblx0XHR9XG5cdFx0XG5cdFx0LCBnZXRFbGVtZW50QnlJZDogZnVuY3Rpb24gRG9tVXRpbHMkZ2V0RWxlbWVudEJ5SWQgKGlkLCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSkge1xuXHRcdFx0dmFyIHJlc3VsdCA9IERvbVV0aWxzLmdldEVsZW1lbnRzKHsgaWQ6IGlkIH0sIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCAxKTtcblx0XHRcdHJldHVybihyZXN1bHQubGVuZ3RoID8gcmVzdWx0WzBdIDogbnVsbCk7XG5cdFx0fVxuXHRcdFxuXHRcdCwgZ2V0RWxlbWVudHNCeVRhZ05hbWU6IGZ1bmN0aW9uIERvbVV0aWxzJGdldEVsZW1lbnRzQnlUYWdOYW1lIChuYW1lLCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpIHtcblx0XHRcdHJldHVybihEb21VdGlscy5nZXRFbGVtZW50cyh7IHRhZ19uYW1lOiBuYW1lIH0sIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCBsaW1pdCkpO1xuXHRcdH1cblx0XHRcblx0XHQsIGdldEVsZW1lbnRzQnlUYWdUeXBlOiBmdW5jdGlvbiBEb21VdGlscyRnZXRFbGVtZW50c0J5VGFnVHlwZSAodHlwZSwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIGxpbWl0KSB7XG5cdFx0XHRyZXR1cm4oRG9tVXRpbHMuZ2V0RWxlbWVudHMoeyB0YWdfdHlwZTogdHlwZSB9LCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBpbmhlcml0cyAoY3Rvciwgc3VwZXJDdG9yKSB7XG5cdFx0dmFyIHRlbXBDdG9yID0gZnVuY3Rpb24oKXt9O1xuXHRcdHRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGU7XG5cdFx0Y3Rvci5zdXBlcl8gPSBzdXBlckN0b3I7XG5cdFx0Y3Rvci5wcm90b3R5cGUgPSBuZXcgdGVtcEN0b3IoKTtcblx0XHRjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3I7XG5cdH1cblxuZXhwb3J0cy5QYXJzZXIgPSBQYXJzZXI7XG5cbmV4cG9ydHMuRGVmYXVsdEhhbmRsZXIgPSBEZWZhdWx0SGFuZGxlcjtcblxuZXhwb3J0cy5Sc3NIYW5kbGVyID0gUnNzSGFuZGxlcjtcblxuZXhwb3J0cy5FbGVtZW50VHlwZSA9IEVsZW1lbnRUeXBlO1xuXG5leHBvcnRzLkRvbVV0aWxzID0gRG9tVXRpbHM7XG5cbn0pKCk7XG5cbn0pLmNhbGwodGhpcyxcIi9ub2RlX21vZHVsZXMvaHRtbFBhcnNlci9saWIvaHRtbHBhcnNlci5qc1wiLFwiL25vZGVfbW9kdWxlcy9odG1sUGFyc2VyL2xpYlwiKSJdfQ==
