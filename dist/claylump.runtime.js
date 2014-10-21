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
        var matches = str.match(REX_INTERPOLATE_SYMBOL);

        if (matches === null) {
          return null;
        }

        var funcObj = function(_funcObj) {
          _funcObj[STR_EVAL_FUNCTION_SYMBOL] = true;
          return _funcObj;
        }({
          args : ['data', ["var s=[];",
            "s.push('",
            str.replace(/[\r\n\t]/g, ' ')
              .split("'").join("\\'")
              .replace(/{{([^{}]+)}}/g, "',(data.$1 != null ? data.$1 : ''),'")
              .split(/\s{2,}/).join(' '),
            "');",
            "return s.join('');"
          ].join('')]
        });
        return this.preCompile ? funcObj : helper.invoke(Function, funcObj.args);
      }
    },

    compileRepeatExpression: {
      writable: true,

      value: function(repeatExpr) {
        var matches = (repeatExpr || '').match(REX_REPEAT_SYMBOL),
          parentTargetPath,
          childScopeName;

        if (matches === null) {
          throw new Error('Unexpected syntax for repeat: ' + repeatExpr)
        }

        parentTargetPath = matches[2];
        childScopeName   = matches[1];

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9kaXN0L3RlbXAvX3J1bnRpbWUuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9kaXN0L3RlbXAvaGVscGVyLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvZGlzdC90ZW1wL3RlbXBsYXRlLWNvbXBpbGVyLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL2h0bWxQYXJzZXIvbGliL2h0bWxwYXJzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIENsYXlDb21waWxlciA9IHJlcXVpcmUoJy4vdGVtcGxhdGUtY29tcGlsZXInKS5kZWZhdWx0O1xudmFyIGhlbHBlciA9IHJlcXVpcmUoJy4vaGVscGVyJykuZGVmYXVsdDtcblxuLyoqXG4gKiBAY2xhc3MgQ2xheVJ1bnRpbWVcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbndpbmRvdy5DbGF5UnVudGltZSA9IHtcbiAgY29tcGlsZXI6IENsYXlDb21waWxlclxufTsiLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICogQHBhcmFtIHtCb29sZWFufSBbb3ZlcndyaXRlXVxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5mdW5jdGlvbiBtaXgodG8sIGZyb20sIG92ZXJ3cml0ZSkge1xuICB2YXIgaSA9IDAsIGtleXMgPSBPYmplY3Qua2V5cyhmcm9tKSwgcHJvcDtcblxuICB3aGlsZSAoKHByb3AgPSBrZXlzW2krK10pKSB7XG4gICAgaWYgKG92ZXJ3cml0ZSB8fCAhdG9bcHJvcF0pIHtcbiAgICAgIHRvW3Byb3BdID0gZnJvbVtwcm9wXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRvO1xufVxuXG4vKipcbiAqIHNoYWxsb3cgZmxhdHRlblxuICogQHBhcmFtIHtBcnJheX0gbGlzdFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiBmbGF0dGVuKGxpc3QpIHtcbiAgdmFyIGkgPSAwLCBpdGVtLCByZXQgPSBbXTtcbiAgd2hpbGUgKChpdGVtID0gbGlzdFtpKytdKSkge1xuICAgIGlmIChpc0FycmF5KGl0ZW0pKSB7XG4gICAgICByZXQgPSByZXQuY29uY2F0KGl0ZW0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXQucHVzaChpdGVtKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY2xvbmUob2JqKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IG1peCh7fSwgb2JqKVxufVxuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHVuaXEoYXJyYXkpIHtcbiAgdmFyIHJldCA9IFtdLCBpID0gMCwgaXRlbTtcblxuICB3aGlsZSAoKGl0ZW0gPSBhcnJheVtpKytdKSkge1xuICAgIGlmIChyZXQuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgIHJldC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIGdldCBjYWNoZWQgYG1hdGNoZXNTZWxlY3RvcmAgbWV0aG9kIG5hbWVcbiAqL1xudmFyIG1hdGNoZXJOYW1lO1xuZnVuY3Rpb24gZ2V0TWF0Y2hlck5hbWUoKSB7XG4gIGlmIChtYXRjaGVyTmFtZSkge1xuICAgIHJldHVybiBtYXRjaGVyTmFtZTtcbiAgfVxuXG4gIHZhciBsaXN0ICA9IFsnbWF0Y2hlcycsICd3ZWJraXRNYXRjaGVzU2VsZWN0b3InLCAnbW96TWF0Y2hlc1NlbGVjdG9yJywgJ21zTWF0Y2hlc1NlbGVjdG9yJ10sXG4gICAgICBwcm90byA9IEhUTUxFbGVtZW50LnByb3RvdHlwZSwgaSA9IDAsIG5hbWU7XG5cbiAgd2hpbGUoKG5hbWUgPSBsaXN0W2krK10pKSB7XG4gICAgaWYgKHByb3RvW25hbWVdKSB7XG4gICAgICBtYXRjaGVyTmFtZSA9IG5hbWU7XG4gICAgICByZXR1cm4gbWF0Y2hlck5hbWU7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogbWF0Y2ggZWxlbWVudCB3aXRoIHNlbGVjdG9yXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBtYXRjaEVsZW1lbnQoZWxlbWVudCwgc2VsZWN0b3IpIHtcbiAgcmV0dXJuIGVsZW1lbnRbZ2V0TWF0Y2hlck5hbWUoKV0oc2VsZWN0b3IpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHRvU3RyaW5nKHZhbHVlKSB7XG4gIHZhciBvYmpTdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICByZXR1cm4gb2JqU3RyLnNsaWNlKG9ialN0ci5pbmRleE9mKCcgJykgKyAxLCAtMSk7XG59XG5cbi8qKlxuICogZmFrZSBhcnJheSAobGlrZSBOb2RlTGlzdCwgQXJndW1lbnRzIGV0YykgY29udmVydCB0byBBcnJheVxuICogQHBhcmFtIHsqfSBmYWtlQXJyYXlcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gdG9BcnJheShmYWtlQXJyYXkpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZha2VBcnJheSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5KHZhbHVlKSB7XG4gIHJldHVybiB0b1N0cmluZyh2YWx1ZSkgPT09ICdBcnJheSc7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiB0b1N0cmluZyh2YWx1ZSkgPT09ICdPYmplY3QnO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7U3RyaW5nfSBsb2NhbE5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc0N1c3RvbUVsZW1lbnROYW1lKGxvY2FsTmFtZSkge1xuICByZXR1cm4gbG9jYWxOYW1lLmluZGV4T2YoJy0nKSAhPT0gLTE7XG59XG5cbi8qKlxuICogQHNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE2MDY3OTcvdXNlLW9mLWFwcGx5LXdpdGgtbmV3LW9wZXJhdG9yLWlzLXRoaXMtcG9zc2libGUvMTM5MzE2MjcjMTM5MzE2MjdcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzXG4gKiBAcmV0dXJucyB7aW52b2tlLkZ9XG4gKi9cbmZ1bmN0aW9uIGludm9rZShjb25zdHJ1Y3RvciwgYXJncykge1xuICB2YXIgZjtcbiAgZnVuY3Rpb24gRigpIHtcbiAgICAvLyBjb25zdHJ1Y3RvciByZXR1cm5zICoqdGhpcyoqXG4gICAgcmV0dXJuIGNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG4gIEYucHJvdG90eXBlID0gY29uc3RydWN0b3IucHJvdG90eXBlO1xuICBmID0gbmV3IEYoKTtcbiAgZi5jb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yO1xuICByZXR1cm4gZjtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIHJlYWR5KGhhbmRsZXIpIHtcbiAgaWYgKEZMR19ET01fQUxSRUFEWSkge1xuICAgIGhhbmRsZXIoKTtcbiAgfSBlbHNlIHtcbiAgICBTVEFDS19SRUFEWV9IQU5ETEVSUy5wdXNoKGhhbmRsZXIpO1xuICB9XG59XG5cbnZhciBGTEdfRE9NX0FMUkVBRFkgICAgICA9IGZhbHNlLFxuICAgIFNUQUNLX1JFQURZX0hBTkRMRVJTID0gW107XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgRkxHX0RPTV9BTFJFQURZID0gdHJ1ZTtcbiAgdmFyIGkgPSAwLCByZWFkeTtcbiAgd2hpbGUgKHJlYWR5ID0gU1RBQ0tfUkVBRFlfSEFORExFUlNbaSsrXSkge1xuICAgIHJlYWR5KCk7XG4gIH1cbn0sIGZhbHNlKTtcblxuZXhwb3J0cy5kZWZhdWx0ID0ge1xuICBub29wICAgICAgOiBmdW5jdGlvbiBub29wKCkge30sXG4gIG1peCAgICAgICA6IG1peCxcbiAgdW5pcSAgICAgIDogdW5pcSxcbiAgY2xvbmUgICAgIDogY2xvbmUsXG4gIGZsYXR0ZW4gICA6IGZsYXR0ZW4sXG4gIHJlYWR5ICAgICA6IHJlYWR5LFxuICBpbnZva2UgICAgOiBpbnZva2UsXG4gIHRvQXJyYXkgICA6IHRvQXJyYXksXG4gIHRvU3RyaW5nICA6IHRvU3RyaW5nLFxuXG4gIG1hdGNoRWxlbWVudCA6IG1hdGNoRWxlbWVudCxcblxuICBpc1N0cmluZyAgICAgICAgICAgIDogaXNTdHJpbmcsXG4gIGlzTnVtYmVyICAgICAgICAgICAgOiBpc051bWJlcixcbiAgaXNBcnJheSAgICAgICAgICAgICA6IGlzQXJyYXksXG4gIGlzRnVuY3Rpb24gICAgICAgICAgOiBpc0Z1bmN0aW9uLFxuICBpc09iamVjdCAgICAgICAgICAgIDogaXNPYmplY3QsXG4gIGlzQ3VzdG9tRWxlbWVudE5hbWUgOiBpc0N1c3RvbUVsZW1lbnROYW1lXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyID0gcmVxdWlyZShcIi4vaGVscGVyXCIpLmRlZmF1bHQ7XG52YXIgaHRtbFBhcnNlciA9IHJlcXVpcmUoXCJodG1sUGFyc2VyXCIpO1xuXG52YXIgUkVYX0lOVEVSUE9MQVRFX1NZTUJPTCA9IC97e1tee31dK319L2c7XG52YXIgUkVYX1JFUEVBVF9TWU1CT0wgICAgICA9IC97eyhcXHcrKVxcc2luXFxzKFtcXHdcXC5dKyl9fS87XG52YXIgU1RSX1JFUEVBVF9BVFRSSUJVVEUgICA9ICdjbC1yZXBlYXQnO1xudmFyIFNUUl9FVkFMX0ZVTkNUSU9OX1NZTUJPTCA9ICdfX0VWQUxfRlVOQ1RJT05fXyc7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IHtcbiAgLyoqXG4gICAqIEBzdGF0aWNcbiAgICogQHJldHVybnMge0NsYXlUZW1wbGF0ZUNvbXBpbGVyfVxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IENsYXlUZW1wbGF0ZUNvbXBpbGVyKCk7XG4gIH1cbn07XG5cbnZhciBDbGF5VGVtcGxhdGVDb21waWxlciA9IGZ1bmN0aW9uKCkge1xuICB2YXIgQ2xheVRlbXBsYXRlQ29tcGlsZXIgPSBmdW5jdGlvbiBDbGF5VGVtcGxhdGVDb21waWxlcigpIC8vIG5vb3BcbiAge1xuICAgIC8vIG5vb3BcbiAgfTtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhDbGF5VGVtcGxhdGVDb21waWxlci5wcm90b3R5cGUsIHtcbiAgICBjb21waWxlRnJvbUh0bWw6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oaHRtbCkge1xuICAgICAgICB2YXIgcGFyc2VkID0gdGhpcy5wYXJzZUh0bWwoaHRtbCk7XG4gICAgICAgIHRoaXMucHJlQ29tcGlsZSA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gdGhpcy5jb21waWxlRG9tU3RydWN0dXJlKHBhcnNlZCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIHNlcmlhbGl6ZUZyb21IdG1sOiB7XG4gICAgICB3cml0YWJsZTogdHJ1ZSxcblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uKGh0bWwpIHtcbiAgICAgICAgdmFyIHBhcnNlZCA9IHRoaXMucGFyc2VIdG1sKGh0bWwpO1xuICAgICAgICB0aGlzLnByZUNvbXBpbGUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcy5jb21waWxlRG9tU3RydWN0dXJlKHBhcnNlZCkpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBwYXJzZUh0bWw6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oaHRtbCkge1xuICAgICAgICB2YXIgaGFuZGxlciA9IG5ldyBodG1sUGFyc2VyLkRlZmF1bHRIYW5kbGVyKGZ1bmN0aW9uIChlcnIsIGRvbSkge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgZW5mb3JjZUVtcHR5VGFncyA6IHRydWUsXG4gICAgICAgICAgICBpZ25vcmVXaGl0ZXNwYWNlIDogdHJ1ZSxcbiAgICAgICAgICAgIHZlcmJvc2UgICAgICAgICAgOiBmYWxzZVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIHBhcnNlciA9IG5ldyBodG1sUGFyc2VyLlBhcnNlcihoYW5kbGVyKTtcblxuICAgICAgICAvLyBwYXJzZSBodG1sXG4gICAgICAgIHBhcnNlci5wYXJzZUNvbXBsZXRlKGh0bWwpO1xuICAgICAgICBpZiAoaGFuZGxlci5kb20ubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdUZW1wbGF0ZSBtdXN0IGhhdmUgZXhhY3RseSBvbmUgcm9vdCBlbGVtZW50LiB3YXM6ICcgKyBodG1sKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBoYW5kbGVyLmRvbVswXTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgY29tcGlsZURvbVN0cnVjdHVyZToge1xuICAgICAgd3JpdGFibGU6IHRydWUsXG5cbiAgICAgIHZhbHVlOiBmdW5jdGlvbihkb21TdHJ1Y3R1cmUpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICBpZiAoZG9tU3RydWN0dXJlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgZG9tU3RydWN0dXJlID0ge307XG5cbiAgICAgICAgdmFyIGRhdGEgICAgID0gZG9tU3RydWN0dXJlLmRhdGEsXG4gICAgICAgICAgICBhdHRycyAgICA9IGRvbVN0cnVjdHVyZS5hdHRyaWJzICAgIHx8IHt9LFxuICAgICAgICAgICAgY2hpbGRyZW4gPSBkb21TdHJ1Y3R1cmUuY2hpbGRyZW4gICB8fCBbXSxcbiAgICAgICAgICAgIGV2YWxzICAgID0gZG9tU3RydWN0dXJlLmV2YWx1YXRvcnMgPSB7XG4gICAgICAgICAgICAgIGF0dHJzICA6IHt9LFxuICAgICAgICAgICAgICBzdHlsZSAgOiBudWxsLFxuICAgICAgICAgICAgICBkYXRhICAgOiBudWxsLFxuICAgICAgICAgICAgICByZXBlYXQgOiBudWxsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAga2V5cywga2V5LCBpID0gMDtcblxuICAgICAgICAvLyBzdHlsZXMgZXZhbHVhdG9yXG4gICAgICAgIGlmIChhdHRycy5zdHlsZSkge1xuICAgICAgICAgIGRvbVN0cnVjdHVyZS5zdHlsZSA9IGF0dHJzLnN0eWxlO1xuICAgICAgICAgIGV2YWxzLnN0eWxlID0gdGhpcy5jb21waWxlVmFsdWUoZG9tU3RydWN0dXJlLnN0eWxlKTtcbiAgICAgICAgICBkZWxldGUgYXR0cnMuc3R5bGU7ICAvLyBkZWxldGUgZnJvbSBvcmlnIGF0dHJpYiBvYmplY3RcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGF0dHJpYnV0ZXMgZXZhbHVhdG9yXG4gICAgICAgIGtleXMgPSBPYmplY3Qua2V5cyhhdHRycyk7XG4gICAgICAgIHdoaWxlICgoa2V5ID0ga2V5c1tpKytdKSkge1xuICAgICAgICAgIC8vIHJlcGVhdFxuICAgICAgICAgIGlmIChrZXkgPT09IFNUUl9SRVBFQVRfQVRUUklCVVRFKSB7XG4gICAgICAgICAgICBldmFscy5yZXBlYXQgPSB0aGlzLmNvbXBpbGVSZXBlYXRFeHByZXNzaW9uKGF0dHJzW1NUUl9SRVBFQVRfQVRUUklCVVRFXSk7XG4gICAgICAgICAgICBkZWxldGUgYXR0cnNbU1RSX1JFUEVBVF9BVFRSSUJVVEVdOyAvLyBkZWxldGUgZnJvbSBvcmlnIGF0dHJpYiBvYmplY3RcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gaW50ZXJwb2xhdGVcbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGV2YWxzLmF0dHJzW2tleV0gPSB0aGlzLmNvbXBpbGVWYWx1ZShhdHRyc1trZXldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkYXRhICh0ZXh0KSBldmFsdWF0b3JcbiAgICAgICAgZXZhbHMuZGF0YSA9IHRoaXMuY29tcGlsZVZhbHVlKGRhdGEpO1xuXG4gICAgICAgIC8vIHJlY3Vyc2l2ZVxuICAgICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzLmNvbXBpbGVEb21TdHJ1Y3R1cmUoY2hpbGQpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZG9tU3RydWN0dXJlO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBjb21waWxlVmFsdWU6IHtcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuXG4gICAgICB2YWx1ZTogZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgIHN0ciA9IChzdHIgfHwgJycpO1xuICAgICAgICB2YXIgbWF0Y2hlcyA9IHN0ci5tYXRjaChSRVhfSU5URVJQT0xBVEVfU1lNQk9MKTtcblxuICAgICAgICBpZiAobWF0Y2hlcyA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGZ1bmNPYmogPSBmdW5jdGlvbihfZnVuY09iaikge1xuICAgICAgICAgIF9mdW5jT2JqW1NUUl9FVkFMX0ZVTkNUSU9OX1NZTUJPTF0gPSB0cnVlO1xuICAgICAgICAgIHJldHVybiBfZnVuY09iajtcbiAgICAgICAgfSh7XG4gICAgICAgICAgYXJncyA6IFsnZGF0YScsIFtcInZhciBzPVtdO1wiLFxuICAgICAgICAgICAgXCJzLnB1c2goJ1wiLFxuICAgICAgICAgICAgc3RyLnJlcGxhY2UoL1tcXHJcXG5cXHRdL2csICcgJylcbiAgICAgICAgICAgICAgLnNwbGl0KFwiJ1wiKS5qb2luKFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCBcIicsKGRhdGEuJDEgIT0gbnVsbCA/IGRhdGEuJDEgOiAnJyksJ1wiKVxuICAgICAgICAgICAgICAuc3BsaXQoL1xcc3syLH0vKS5qb2luKCcgJyksXG4gICAgICAgICAgICBcIicpO1wiLFxuICAgICAgICAgICAgXCJyZXR1cm4gcy5qb2luKCcnKTtcIlxuICAgICAgICAgIF0uam9pbignJyldXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5wcmVDb21waWxlID8gZnVuY09iaiA6IGhlbHBlci5pbnZva2UoRnVuY3Rpb24sIGZ1bmNPYmouYXJncyk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGNvbXBpbGVSZXBlYXRFeHByZXNzaW9uOiB7XG4gICAgICB3cml0YWJsZTogdHJ1ZSxcblxuICAgICAgdmFsdWU6IGZ1bmN0aW9uKHJlcGVhdEV4cHIpIHtcbiAgICAgICAgdmFyIG1hdGNoZXMgPSAocmVwZWF0RXhwciB8fCAnJykubWF0Y2goUkVYX1JFUEVBVF9TWU1CT0wpLFxuICAgICAgICAgIHBhcmVudFRhcmdldFBhdGgsXG4gICAgICAgICAgY2hpbGRTY29wZU5hbWU7XG5cbiAgICAgICAgaWYgKG1hdGNoZXMgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgc3ludGF4IGZvciByZXBlYXQ6ICcgKyByZXBlYXRFeHByKVxuICAgICAgICB9XG5cbiAgICAgICAgcGFyZW50VGFyZ2V0UGF0aCA9IG1hdGNoZXNbMl07XG4gICAgICAgIGNoaWxkU2NvcGVOYW1lICAgPSBtYXRjaGVzWzFdO1xuXG4gICAgICAgIHZhciBmdW5jT2JqID0gZnVuY3Rpb24oX2Z1bmNPYmoyKSB7XG4gICAgICAgICAgX2Z1bmNPYmoyW1NUUl9FVkFMX0ZVTkNUSU9OX1NZTUJPTF0gPSB0cnVlO1xuICAgICAgICAgIHJldHVybiBfZnVuY09iajI7XG4gICAgICAgIH0oe1xuICAgICAgICAgIGFyZ3MgOiBbJ2RhdGEnLCBbXG4gICAgICAgICAgICAgIFwicmV0dXJuIGRhdGEuXCIgKyBwYXJlbnRUYXJnZXRQYXRoICsgXCIubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcIixcbiAgICAgICAgICAgIFwiICB2YXIga3MsIGssIGkgPSAwLCByID0ge307XCIsXG4gICAgICAgICAgICBcIiAga3MgPSBPYmplY3Qua2V5cyhkYXRhKTtcIixcbiAgICAgICAgICAgIFwiICB3aGlsZSAoKGsgPSBrc1tpKytdKSkge1wiLFxuICAgICAgICAgICAgXCIgICAgcltrXSA9IGRhdGFba107XCIsXG4gICAgICAgICAgICBcIiAgfVwiLFxuICAgICAgICAgICAgICBcIiAgci5cIiArIGNoaWxkU2NvcGVOYW1lICsgXCIgPSBpdGVtO1wiLFxuICAgICAgICAgICAgXCIgIHJldHVybiByO1wiLFxuICAgICAgICAgICAgXCJ9KTtcIlxuICAgICAgICAgIF0uam9pbignJyldXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5wcmVDb21waWxlID8gZnVuY09iaiA6IGhlbHBlci5pbnZva2UoRnVuY3Rpb24sIGZ1bmNPYmouYXJncyk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gQ2xheVRlbXBsYXRlQ29tcGlsZXI7XG59KCk7XG4iLCIoZnVuY3Rpb24gKF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuQ29weXJpZ2h0IDIwMTAsIDIwMTEsIENocmlzIFdpbmJlcnJ5IDxjaHJpc0B3aW5iZXJyeS5uZXQ+LiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxub2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG9cbmRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlXG5yaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3JcbnNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG5BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lOR1xuRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HU1xuSU4gVEhFIFNPRlRXQVJFLlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKiB2MS43LjYgKi9cblxuKGZ1bmN0aW9uICgpIHtcblxuZnVuY3Rpb24gcnVubmluZ0luTm9kZSAoKSB7XG5cdHJldHVybihcblx0XHQodHlwZW9mIHJlcXVpcmUpID09IFwiZnVuY3Rpb25cIlxuXHRcdCYmXG5cdFx0KHR5cGVvZiBleHBvcnRzKSA9PSBcIm9iamVjdFwiXG5cdFx0JiZcblx0XHQodHlwZW9mIG1vZHVsZSkgPT0gXCJvYmplY3RcIlxuXHRcdCYmXG5cdFx0KHR5cGVvZiBfX2ZpbGVuYW1lKSA9PSBcInN0cmluZ1wiXG5cdFx0JiZcblx0XHQodHlwZW9mIF9fZGlybmFtZSkgPT0gXCJzdHJpbmdcIlxuXHRcdCk7XG59XG5cbmlmICghcnVubmluZ0luTm9kZSgpKSB7XG5cdGlmICghdGhpcy5UYXV0b2xvZ2lzdGljcylcblx0XHR0aGlzLlRhdXRvbG9naXN0aWNzID0ge307XG5cdGVsc2UgaWYgKHRoaXMuVGF1dG9sb2dpc3RpY3MuTm9kZUh0bWxQYXJzZXIpXG5cdFx0cmV0dXJuOyAvL05vZGVIdG1sUGFyc2VyIGFscmVhZHkgZGVmaW5lZCFcblx0dGhpcy5UYXV0b2xvZ2lzdGljcy5Ob2RlSHRtbFBhcnNlciA9IHt9O1xuXHRleHBvcnRzID0gdGhpcy5UYXV0b2xvZ2lzdGljcy5Ob2RlSHRtbFBhcnNlcjtcbn1cblxuLy9UeXBlcyBvZiBlbGVtZW50cyBmb3VuZCBpbiB0aGUgRE9NXG52YXIgRWxlbWVudFR5cGUgPSB7XG5cdCAgVGV4dDogXCJ0ZXh0XCIgLy9QbGFpbiB0ZXh0XG5cdCwgRGlyZWN0aXZlOiBcImRpcmVjdGl2ZVwiIC8vU3BlY2lhbCB0YWcgPCEuLi4+XG5cdCwgQ29tbWVudDogXCJjb21tZW50XCIgLy9TcGVjaWFsIHRhZyA8IS0tLi4uLS0+XG5cdCwgU2NyaXB0OiBcInNjcmlwdFwiIC8vU3BlY2lhbCB0YWcgPHNjcmlwdD4uLi48L3NjcmlwdD5cblx0LCBTdHlsZTogXCJzdHlsZVwiIC8vU3BlY2lhbCB0YWcgPHN0eWxlPi4uLjwvc3R5bGU+XG5cdCwgVGFnOiBcInRhZ1wiIC8vQW55IHRhZyB0aGF0IGlzbid0IHNwZWNpYWxcbn1cblxuZnVuY3Rpb24gUGFyc2VyIChoYW5kbGVyLCBvcHRpb25zKSB7XG5cdHRoaXMuX29wdGlvbnMgPSBvcHRpb25zID8gb3B0aW9ucyA6IHsgfTtcblx0aWYgKHRoaXMuX29wdGlvbnMuaW5jbHVkZUxvY2F0aW9uID09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX29wdGlvbnMuaW5jbHVkZUxvY2F0aW9uID0gZmFsc2U7IC8vRG8gbm90IHRyYWNrIGVsZW1lbnQgcG9zaXRpb24gaW4gZG9jdW1lbnQgYnkgZGVmYXVsdFxuXHR9XG5cblx0dGhpcy52YWxpZGF0ZUhhbmRsZXIoaGFuZGxlcik7XG5cdHRoaXMuX2hhbmRsZXIgPSBoYW5kbGVyO1xuXHR0aGlzLnJlc2V0KCk7XG59XG5cblx0Ly8qKlwiU3RhdGljXCIqKi8vXG5cdC8vUmVndWxhciBleHByZXNzaW9ucyB1c2VkIGZvciBjbGVhbmluZyB1cCBhbmQgcGFyc2luZyAoc3RhdGVsZXNzKVxuXHRQYXJzZXIuX3JlVHJpbSA9IC8oXlxccyt8XFxzKyQpL2c7IC8vVHJpbSBsZWFkaW5nL3RyYWlsaW5nIHdoaXRlc3BhY2Vcblx0UGFyc2VyLl9yZVRyaW1Db21tZW50ID0gLyheXFwhLS18LS0kKS9nOyAvL1JlbW92ZSBjb21tZW50IHRhZyBtYXJrdXAgZnJvbSBjb21tZW50IGNvbnRlbnRzXG5cdFBhcnNlci5fcmVXaGl0ZXNwYWNlID0gL1xccy9nOyAvL1VzZWQgdG8gZmluZCBhbnkgd2hpdGVzcGFjZSB0byBzcGxpdCBvblxuXHRQYXJzZXIuX3JlVGFnTmFtZSA9IC9eXFxzKihcXC8/KVxccyooW15cXHNcXC9dKykvOyAvL1VzZWQgdG8gZmluZCB0aGUgdGFnIG5hbWUgZm9yIGFuIGVsZW1lbnRcblxuXHQvL1JlZ3VsYXIgZXhwcmVzc2lvbnMgdXNlZCBmb3IgcGFyc2luZyAoc3RhdGVmdWwpXG5cdFBhcnNlci5fcmVBdHRyaWIgPSAvL0ZpbmQgYXR0cmlidXRlcyBpbiBhIHRhZ1xuXHRcdC8oW149PD5cXFwiXFwnXFxzXSspXFxzKj1cXHMqXCIoW15cIl0qKVwifChbXj08PlxcXCJcXCdcXHNdKylcXHMqPVxccyonKFteJ10qKSd8KFtePTw+XFxcIlxcJ1xcc10rKVxccyo9XFxzKihbXidcIlxcc10rKXwoW149PD5cXFwiXFwnXFxzXFwvXSspL2c7XG5cdFBhcnNlci5fcmVUYWdzID0gL1tcXDxcXD5dL2c7IC8vRmluZCB0YWcgbWFya2Vyc1xuXG5cdC8vKipQdWJsaWMqKi8vXG5cdC8vTWV0aG9kcy8vXG5cdC8vUGFyc2VzIGEgY29tcGxldGUgSFRNTCBhbmQgcHVzaGVzIGl0IHRvIHRoZSBoYW5kbGVyXG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VDb21wbGV0ZSA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZUNvbXBsZXRlIChkYXRhKSB7XG5cdFx0dGhpcy5yZXNldCgpO1xuXHRcdHRoaXMucGFyc2VDaHVuayhkYXRhKTtcblx0XHR0aGlzLmRvbmUoKTtcblx0fVxuXG5cdC8vUGFyc2VzIGEgcGllY2Ugb2YgYW4gSFRNTCBkb2N1bWVudFxuXHRQYXJzZXIucHJvdG90eXBlLnBhcnNlQ2h1bmsgPSBmdW5jdGlvbiBQYXJzZXIkcGFyc2VDaHVuayAoZGF0YSkge1xuXHRcdGlmICh0aGlzLl9kb25lKVxuXHRcdFx0dGhpcy5oYW5kbGVFcnJvcihuZXcgRXJyb3IoXCJBdHRlbXB0ZWQgdG8gcGFyc2UgY2h1bmsgYWZ0ZXIgcGFyc2luZyBhbHJlYWR5IGRvbmVcIikpO1xuXHRcdHRoaXMuX2J1ZmZlciArPSBkYXRhOyAvL0ZJWE1FOiB0aGlzIGNhbiBiZSBhIGJvdHRsZW5lY2tcblx0XHR0aGlzLnBhcnNlVGFncygpO1xuXHR9XG5cblx0Ly9UZWxscyB0aGUgcGFyc2VyIHRoYXQgdGhlIEhUTUwgYmVpbmcgcGFyc2VkIGlzIGNvbXBsZXRlXG5cdFBhcnNlci5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIFBhcnNlciRkb25lICgpIHtcblx0XHRpZiAodGhpcy5fZG9uZSlcblx0XHRcdHJldHVybjtcblx0XHR0aGlzLl9kb25lID0gdHJ1ZTtcblx0XG5cdFx0Ly9QdXNoIGFueSB1bnBhcnNlZCB0ZXh0IGludG8gYSBmaW5hbCBlbGVtZW50IGluIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRpZiAodGhpcy5fYnVmZmVyLmxlbmd0aCkge1xuXHRcdFx0dmFyIHJhd0RhdGEgPSB0aGlzLl9idWZmZXI7XG5cdFx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdFx0dmFyIGVsZW1lbnQgPSB7XG5cdFx0XHRcdCAgcmF3OiByYXdEYXRhXG5cdFx0XHRcdCwgZGF0YTogKHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuVGV4dCkgPyByYXdEYXRhIDogcmF3RGF0YS5yZXBsYWNlKFBhcnNlci5fcmVUcmltLCBcIlwiKVxuXHRcdFx0XHQsIHR5cGU6IHRoaXMuX3BhcnNlU3RhdGVcblx0XHRcdFx0fTtcblx0XHRcdGlmICh0aGlzLl9wYXJzZVN0YXRlID09IEVsZW1lbnRUeXBlLlRhZyB8fCB0aGlzLl9wYXJzZVN0YXRlID09IEVsZW1lbnRUeXBlLlNjcmlwdCB8fCB0aGlzLl9wYXJzZVN0YXRlID09IEVsZW1lbnRUeXBlLlN0eWxlKVxuXHRcdFx0XHRlbGVtZW50Lm5hbWUgPSB0aGlzLnBhcnNlVGFnTmFtZShlbGVtZW50LmRhdGEpO1xuXHRcdFx0dGhpcy5wYXJzZUF0dHJpYnMoZWxlbWVudCk7XG5cdFx0XHR0aGlzLl9lbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuXHRcdH1cblx0XG5cdFx0dGhpcy53cml0ZUhhbmRsZXIoKTtcblx0XHR0aGlzLl9oYW5kbGVyLmRvbmUoKTtcblx0fVxuXG5cdC8vUmVzZXRzIHRoZSBwYXJzZXIgdG8gYSBibGFuayBzdGF0ZSwgcmVhZHkgdG8gcGFyc2UgYSBuZXcgSFRNTCBkb2N1bWVudFxuXHRQYXJzZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gUGFyc2VyJHJlc2V0ICgpIHtcblx0XHR0aGlzLl9idWZmZXIgPSBcIlwiO1xuXHRcdHRoaXMuX2RvbmUgPSBmYWxzZTtcblx0XHR0aGlzLl9lbGVtZW50cyA9IFtdO1xuXHRcdHRoaXMuX2VsZW1lbnRzQ3VycmVudCA9IDA7XG5cdFx0dGhpcy5fY3VycmVudCA9IDA7XG5cdFx0dGhpcy5fbmV4dCA9IDA7XG5cdFx0dGhpcy5fbG9jYXRpb24gPSB7XG5cdFx0XHQgIHJvdzogMFxuXHRcdFx0LCBjb2w6IDBcblx0XHRcdCwgY2hhck9mZnNldDogMFxuXHRcdFx0LCBpbkJ1ZmZlcjogMFxuXHRcdH07XG5cdFx0dGhpcy5fcGFyc2VTdGF0ZSA9IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0dGhpcy5fcHJldlRhZ1NlcCA9ICcnO1xuXHRcdHRoaXMuX3RhZ1N0YWNrID0gW107XG5cdFx0dGhpcy5faGFuZGxlci5yZXNldCgpO1xuXHR9XG5cdFxuXHQvLyoqUHJpdmF0ZSoqLy9cblx0Ly9Qcm9wZXJ0aWVzLy9cblx0UGFyc2VyLnByb3RvdHlwZS5fb3B0aW9ucyA9IG51bGw7IC8vUGFyc2VyIG9wdGlvbnMgZm9yIGhvdyB0byBiZWhhdmVcblx0UGFyc2VyLnByb3RvdHlwZS5faGFuZGxlciA9IG51bGw7IC8vSGFuZGxlciBmb3IgcGFyc2VkIGVsZW1lbnRzXG5cdFBhcnNlci5wcm90b3R5cGUuX2J1ZmZlciA9IG51bGw7IC8vQnVmZmVyIG9mIHVucGFyc2VkIGRhdGFcblx0UGFyc2VyLnByb3RvdHlwZS5fZG9uZSA9IGZhbHNlOyAvL0ZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIHBhcnNpbmcgaXMgZG9uZVxuXHRQYXJzZXIucHJvdG90eXBlLl9lbGVtZW50cyA9ICBudWxsOyAvL0FycmF5IG9mIHBhcnNlZCBlbGVtZW50c1xuXHRQYXJzZXIucHJvdG90eXBlLl9lbGVtZW50c0N1cnJlbnQgPSAwOyAvL1BvaW50ZXIgdG8gbGFzdCBlbGVtZW50IGluIF9lbGVtZW50cyB0aGF0IGhhcyBiZWVuIHByb2Nlc3NlZFxuXHRQYXJzZXIucHJvdG90eXBlLl9jdXJyZW50ID0gMDsgLy9Qb3NpdGlvbiBpbiBkYXRhIHRoYXQgaGFzIGFscmVhZHkgYmVlbiBwYXJzZWRcblx0UGFyc2VyLnByb3RvdHlwZS5fbmV4dCA9IDA7IC8vUG9zaXRpb24gaW4gZGF0YSBvZiB0aGUgbmV4dCB0YWcgbWFya2VyICg8Pilcblx0UGFyc2VyLnByb3RvdHlwZS5fbG9jYXRpb24gPSBudWxsOyAvL1Bvc2l0aW9uIHRyYWNraW5nIGZvciBlbGVtZW50cyBpbiBhIHN0cmVhbVxuXHRQYXJzZXIucHJvdG90eXBlLl9wYXJzZVN0YXRlID0gRWxlbWVudFR5cGUuVGV4dDsgLy9DdXJyZW50IHR5cGUgb2YgZWxlbWVudCBiZWluZyBwYXJzZWRcblx0UGFyc2VyLnByb3RvdHlwZS5fcHJldlRhZ1NlcCA9ICcnOyAvL1ByZXZpb3VzIHRhZyBtYXJrZXIgZm91bmRcblx0Ly9TdGFjayBvZiBlbGVtZW50IHR5cGVzIHByZXZpb3VzbHkgZW5jb3VudGVyZWQ7IGtlZXBzIHRyYWNrIG9mIHdoZW5cblx0Ly9wYXJzaW5nIG9jY3VycyBpbnNpZGUgYSBzY3JpcHQvY29tbWVudC9zdHlsZSB0YWdcblx0UGFyc2VyLnByb3RvdHlwZS5fdGFnU3RhY2sgPSBudWxsO1xuXG5cdC8vTWV0aG9kcy8vXG5cdC8vVGFrZXMgYW4gYXJyYXkgb2YgZWxlbWVudHMgYW5kIHBhcnNlcyBhbnkgZm91bmQgYXR0cmlidXRlc1xuXHRQYXJzZXIucHJvdG90eXBlLnBhcnNlVGFnQXR0cmlicyA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZVRhZ0F0dHJpYnMgKGVsZW1lbnRzKSB7XG5cdFx0dmFyIGlkeEVuZCA9IGVsZW1lbnRzLmxlbmd0aDtcblx0XHR2YXIgaWR4ID0gMDtcblx0XG5cdFx0d2hpbGUgKGlkeCA8IGlkeEVuZCkge1xuXHRcdFx0dmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpZHgrK107XG5cdFx0XHRpZiAoZWxlbWVudC50eXBlID09IEVsZW1lbnRUeXBlLlRhZyB8fCBlbGVtZW50LnR5cGUgPT0gRWxlbWVudFR5cGUuU2NyaXB0IHx8IGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5zdHlsZSlcblx0XHRcdFx0dGhpcy5wYXJzZUF0dHJpYnMoZWxlbWVudCk7XG5cdFx0fVxuXHRcblx0XHRyZXR1cm4oZWxlbWVudHMpO1xuXHR9XG5cblx0Ly9UYWtlcyBhbiBlbGVtZW50IGFuZCBhZGRzIGFuIFwiYXR0cmlic1wiIHByb3BlcnR5IGZvciBhbnkgZWxlbWVudCBhdHRyaWJ1dGVzIGZvdW5kIFxuXHRQYXJzZXIucHJvdG90eXBlLnBhcnNlQXR0cmlicyA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZUF0dHJpYnMgKGVsZW1lbnQpIHtcblx0XHQvL09ubHkgcGFyc2UgYXR0cmlidXRlcyBmb3IgdGFnc1xuXHRcdGlmIChlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuU2NyaXB0ICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5TdHlsZSAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuVGFnKVxuXHRcdFx0cmV0dXJuO1xuXHRcblx0XHR2YXIgdGFnTmFtZSA9IGVsZW1lbnQuZGF0YS5zcGxpdChQYXJzZXIuX3JlV2hpdGVzcGFjZSwgMSlbMF07XG5cdFx0dmFyIGF0dHJpYlJhdyA9IGVsZW1lbnQuZGF0YS5zdWJzdHJpbmcodGFnTmFtZS5sZW5ndGgpO1xuXHRcdGlmIChhdHRyaWJSYXcubGVuZ3RoIDwgMSlcblx0XHRcdHJldHVybjtcblx0XG5cdFx0dmFyIG1hdGNoO1xuXHRcdFBhcnNlci5fcmVBdHRyaWIubGFzdEluZGV4ID0gMDtcblx0XHR3aGlsZSAobWF0Y2ggPSBQYXJzZXIuX3JlQXR0cmliLmV4ZWMoYXR0cmliUmF3KSkge1xuXHRcdFx0aWYgKGVsZW1lbnQuYXR0cmlicyA9PSB1bmRlZmluZWQpXG5cdFx0XHRcdGVsZW1lbnQuYXR0cmlicyA9IHt9O1xuXHRcblx0XHRcdGlmICh0eXBlb2YgbWF0Y2hbMV0gPT0gXCJzdHJpbmdcIiAmJiBtYXRjaFsxXS5sZW5ndGgpIHtcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzW21hdGNoWzFdXSA9IG1hdGNoWzJdO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgbWF0Y2hbM10gPT0gXCJzdHJpbmdcIiAmJiBtYXRjaFszXS5sZW5ndGgpIHtcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzW21hdGNoWzNdLnRvU3RyaW5nKCldID0gbWF0Y2hbNF0udG9TdHJpbmcoKTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIG1hdGNoWzVdID09IFwic3RyaW5nXCIgJiYgbWF0Y2hbNV0ubGVuZ3RoKSB7XG5cdFx0XHRcdGVsZW1lbnQuYXR0cmlic1ttYXRjaFs1XV0gPSBtYXRjaFs2XTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIG1hdGNoWzddID09IFwic3RyaW5nXCIgJiYgbWF0Y2hbN10ubGVuZ3RoKSB7XG5cdFx0XHRcdGVsZW1lbnQuYXR0cmlic1ttYXRjaFs3XV0gPSBtYXRjaFs3XTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvL0V4dHJhY3RzIHRoZSBiYXNlIHRhZyBuYW1lIGZyb20gdGhlIGRhdGEgdmFsdWUgb2YgYW4gZWxlbWVudFxuXHRQYXJzZXIucHJvdG90eXBlLnBhcnNlVGFnTmFtZSA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZVRhZ05hbWUgKGRhdGEpIHtcblx0XHRpZiAoZGF0YSA9PSBudWxsIHx8IGRhdGEgPT0gXCJcIilcblx0XHRcdHJldHVybihcIlwiKTtcblx0XHR2YXIgbWF0Y2ggPSBQYXJzZXIuX3JlVGFnTmFtZS5leGVjKGRhdGEpO1xuXHRcdGlmICghbWF0Y2gpXG5cdFx0XHRyZXR1cm4oXCJcIik7XG5cdFx0cmV0dXJuKChtYXRjaFsxXSA/IFwiL1wiIDogXCJcIikgKyBtYXRjaFsyXSk7XG5cdH1cblxuXHQvL1BhcnNlcyB0aHJvdWdoIEhUTUwgdGV4dCBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBmb3VuZCBlbGVtZW50c1xuXHQvL0kgYWRtaXQsIHRoaXMgZnVuY3Rpb24gaXMgcmF0aGVyIGxhcmdlIGJ1dCBzcGxpdHRpbmcgdXAgaGFkIGFuIG5vdGljZWFibGUgaW1wYWN0IG9uIHNwZWVkXG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VUYWdzID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlVGFncyAoKSB7XG5cdFx0dmFyIGJ1ZmZlckVuZCA9IHRoaXMuX2J1ZmZlci5sZW5ndGggLSAxO1xuXHRcdHdoaWxlIChQYXJzZXIuX3JlVGFncy50ZXN0KHRoaXMuX2J1ZmZlcikpIHtcblx0XHRcdHRoaXMuX25leHQgPSBQYXJzZXIuX3JlVGFncy5sYXN0SW5kZXggLSAxO1xuXHRcdFx0dmFyIHRhZ1NlcCA9IHRoaXMuX2J1ZmZlci5jaGFyQXQodGhpcy5fbmV4dCk7IC8vVGhlIGN1cnJlbnRseSBmb3VuZCB0YWcgbWFya2VyXG5cdFx0XHR2YXIgcmF3RGF0YSA9IHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fY3VycmVudCwgdGhpcy5fbmV4dCk7IC8vVGhlIG5leHQgY2h1bmsgb2YgZGF0YSB0byBwYXJzZVxuXHRcblx0XHRcdC8vQSBuZXcgZWxlbWVudCB0byBldmVudHVhbGx5IGJlIGFwcGVuZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdHZhciBlbGVtZW50ID0ge1xuXHRcdFx0XHQgIHJhdzogcmF3RGF0YVxuXHRcdFx0XHQsIGRhdGE6ICh0aGlzLl9wYXJzZVN0YXRlID09IEVsZW1lbnRUeXBlLlRleHQpID8gcmF3RGF0YSA6IHJhd0RhdGEucmVwbGFjZShQYXJzZXIuX3JlVHJpbSwgXCJcIilcblx0XHRcdFx0LCB0eXBlOiB0aGlzLl9wYXJzZVN0YXRlXG5cdFx0XHR9O1xuXHRcblx0XHRcdHZhciBlbGVtZW50TmFtZSA9IHRoaXMucGFyc2VUYWdOYW1lKGVsZW1lbnQuZGF0YSk7XG5cdFxuXHRcdFx0Ly9UaGlzIHNlY3Rpb24gaW5zcGVjdHMgdGhlIGN1cnJlbnQgdGFnIHN0YWNrIGFuZCBtb2RpZmllcyB0aGUgY3VycmVudFxuXHRcdFx0Ly9lbGVtZW50IGlmIHdlJ3JlIGFjdHVhbGx5IHBhcnNpbmcgYSBzcGVjaWFsIGFyZWEgKHNjcmlwdC9jb21tZW50L3N0eWxlIHRhZylcblx0XHRcdGlmICh0aGlzLl90YWdTdGFjay5sZW5ndGgpIHsgLy9XZSdyZSBwYXJzaW5nIGluc2lkZSBhIHNjcmlwdC9jb21tZW50L3N0eWxlIHRhZ1xuXHRcdFx0XHRpZiAodGhpcy5fdGFnU3RhY2tbdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMV0gPT0gRWxlbWVudFR5cGUuU2NyaXB0KSB7IC8vV2UncmUgY3VycmVudGx5IGluIGEgc2NyaXB0IHRhZ1xuXHRcdFx0XHRcdGlmIChlbGVtZW50TmFtZS50b0xvd2VyQ2FzZSgpID09IFwiL3NjcmlwdFwiKSAvL0FjdHVhbGx5LCB3ZSdyZSBubyBsb25nZXIgaW4gYSBzY3JpcHQgdGFnLCBzbyBwb3AgaXQgb2ZmIHRoZSBzdGFja1xuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucG9wKCk7XG5cdFx0XHRcdFx0ZWxzZSB7IC8vTm90IGEgY2xvc2luZyBzY3JpcHQgdGFnXG5cdFx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuaW5kZXhPZihcIiEtLVwiKSAhPSAwKSB7IC8vTWFrZSBzdXJlIHdlJ3JlIG5vdCBpbiBhIGNvbW1lbnRcblx0XHRcdFx0XHRcdFx0Ly9BbGwgZGF0YSBmcm9tIGhlcmUgdG8gc2NyaXB0IGNsb3NlIGlzIG5vdyBhIHRleHQgZWxlbWVudFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdFx0XHRcdFx0XHQvL0lmIHRoZSBwcmV2aW91cyBlbGVtZW50IGlzIHRleHQsIGFwcGVuZCB0aGUgY3VycmVudCB0ZXh0IHRvIGl0XG5cdFx0XHRcdFx0XHRcdGlmICh0aGlzLl9lbGVtZW50cy5sZW5ndGggJiYgdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBFbGVtZW50VHlwZS5UZXh0KSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIHByZXZFbGVtZW50ID0gdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0XHRcdFx0cHJldkVsZW1lbnQucmF3ID0gcHJldkVsZW1lbnQuZGF0YSA9IHByZXZFbGVtZW50LnJhdyArIHRoaXMuX3ByZXZUYWdTZXAgKyBlbGVtZW50LnJhdztcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IFwiXCI7IC8vVGhpcyBjYXVzZXMgdGhlIGN1cnJlbnQgZWxlbWVudCB0byBub3QgYmUgYWRkZWQgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKHRoaXMuX3RhZ1N0YWNrW3RoaXMuX3RhZ1N0YWNrLmxlbmd0aCAtIDFdID09IEVsZW1lbnRUeXBlLlN0eWxlKSB7IC8vV2UncmUgY3VycmVudGx5IGluIGEgc3R5bGUgdGFnXG5cdFx0XHRcdFx0aWYgKGVsZW1lbnROYW1lLnRvTG93ZXJDYXNlKCkgPT0gXCIvc3R5bGVcIikgLy9BY3R1YWxseSwgd2UncmUgbm8gbG9uZ2VyIGluIGEgc3R5bGUgdGFnLCBzbyBwb3AgaXQgb2ZmIHRoZSBzdGFja1xuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucG9wKCk7XG5cdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuaW5kZXhPZihcIiEtLVwiKSAhPSAwKSB7IC8vTWFrZSBzdXJlIHdlJ3JlIG5vdCBpbiBhIGNvbW1lbnRcblx0XHRcdFx0XHRcdFx0Ly9BbGwgZGF0YSBmcm9tIGhlcmUgdG8gc3R5bGUgY2xvc2UgaXMgbm93IGEgdGV4dCBlbGVtZW50XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0XHRcdFx0XHRcdC8vSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaXMgdGV4dCwgYXBwZW5kIHRoZSBjdXJyZW50IHRleHQgdG8gaXRcblx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IEVsZW1lbnRUeXBlLlRleHQpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgcHJldkVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXTtcblx0XHRcdFx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcgIT0gXCJcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0cHJldkVsZW1lbnQucmF3ID0gcHJldkVsZW1lbnQuZGF0YSA9IHByZXZFbGVtZW50LnJhdyArIHRoaXMuX3ByZXZUYWdTZXAgKyBlbGVtZW50LnJhdztcblx0XHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gXCJcIjsgLy9UaGlzIGNhdXNlcyB0aGUgY3VycmVudCBlbGVtZW50IHRvIG5vdCBiZSBhZGRlZCB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHsgLy9FbGVtZW50IGlzIGVtcHR5LCBzbyBqdXN0IGFwcGVuZCB0aGUgbGFzdCB0YWcgbWFya2VyIGZvdW5kXG5cdFx0XHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gcHJldkVsZW1lbnQucmF3ICsgdGhpcy5fcHJldlRhZ1NlcDtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7IC8vVGhlIHByZXZpb3VzIGVsZW1lbnQgd2FzIG5vdCB0ZXh0XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGVsZW1lbnQucmF3ICE9IFwiXCIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gZWxlbWVudC5yYXc7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKHRoaXMuX3RhZ1N0YWNrW3RoaXMuX3RhZ1N0YWNrLmxlbmd0aCAtIDFdID09IEVsZW1lbnRUeXBlLkNvbW1lbnQpIHsgLy9XZSdyZSBjdXJyZW50bHkgaW4gYSBjb21tZW50IHRhZ1xuXHRcdFx0XHRcdHZhciByYXdMZW4gPSBlbGVtZW50LnJhdy5sZW5ndGg7XG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQucmF3LmNoYXJBdChyYXdMZW4gLSAyKSA9PSBcIi1cIiAmJiBlbGVtZW50LnJhdy5jaGFyQXQocmF3TGVuIC0gMSkgPT0gXCItXCIgJiYgdGFnU2VwID09IFwiPlwiKSB7XG5cdFx0XHRcdFx0XHQvL0FjdHVhbGx5LCB3ZSdyZSBubyBsb25nZXIgaW4gYSBzdHlsZSB0YWcsIHNvIHBvcCBpdCBvZmYgdGhlIHN0YWNrXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wb3AoKTtcblx0XHRcdFx0XHRcdC8vSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaXMgYSBjb21tZW50LCBhcHBlbmQgdGhlIGN1cnJlbnQgdGV4dCB0byBpdFxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IEVsZW1lbnRUeXBlLkNvbW1lbnQpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHByZXZFbGVtZW50ID0gdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0XHRcdHByZXZFbGVtZW50LnJhdyA9IHByZXZFbGVtZW50LmRhdGEgPSAocHJldkVsZW1lbnQucmF3ICsgZWxlbWVudC5yYXcpLnJlcGxhY2UoUGFyc2VyLl9yZVRyaW1Db21tZW50LCBcIlwiKTtcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBcIlwiOyAvL1RoaXMgY2F1c2VzIHRoZSBjdXJyZW50IGVsZW1lbnQgdG8gbm90IGJlIGFkZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2UgLy9QcmV2aW91cyBlbGVtZW50IG5vdCBhIGNvbW1lbnRcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuQ29tbWVudDsgLy9DaGFuZ2UgdGhlIGN1cnJlbnQgZWxlbWVudCdzIHR5cGUgdG8gYSBjb21tZW50XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgeyAvL1N0aWxsIGluIGEgY29tbWVudCB0YWdcblx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLkNvbW1lbnQ7XG5cdFx0XHRcdFx0XHQvL0lmIHRoZSBwcmV2aW91cyBlbGVtZW50IGlzIGEgY29tbWVudCwgYXBwZW5kIHRoZSBjdXJyZW50IHRleHQgdG8gaXRcblx0XHRcdFx0XHRcdGlmICh0aGlzLl9lbGVtZW50cy5sZW5ndGggJiYgdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBFbGVtZW50VHlwZS5Db21tZW50KSB7XG5cdFx0XHRcdFx0XHRcdHZhciBwcmV2RWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gcHJldkVsZW1lbnQucmF3ICsgZWxlbWVudC5yYXcgKyB0YWdTZXA7XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gXCJcIjsgLy9UaGlzIGNhdXNlcyB0aGUgY3VycmVudCBlbGVtZW50IHRvIG5vdCBiZSBhZGRlZCB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gZWxlbWVudC5yYXcgKyB0YWdTZXA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFxuXHRcdFx0Ly9Qcm9jZXNzaW5nIG9mIG5vbi1zcGVjaWFsIHRhZ3Ncblx0XHRcdGlmIChlbGVtZW50LnR5cGUgPT0gRWxlbWVudFR5cGUuVGFnKSB7XG5cdFx0XHRcdGVsZW1lbnQubmFtZSA9IGVsZW1lbnROYW1lO1xuXHRcdFx0XHR2YXIgZWxlbWVudE5hbWVDSSA9IGVsZW1lbnROYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuaW5kZXhPZihcIiEtLVwiKSA9PSAwKSB7IC8vVGhpcyB0YWcgaXMgcmVhbGx5IGNvbW1lbnRcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5Db21tZW50O1xuXHRcdFx0XHRcdGRlbGV0ZSBlbGVtZW50W1wibmFtZVwiXTtcblx0XHRcdFx0XHR2YXIgcmF3TGVuID0gZWxlbWVudC5yYXcubGVuZ3RoO1xuXHRcdFx0XHRcdC8vQ2hlY2sgaWYgdGhlIGNvbW1lbnQgaXMgdGVybWluYXRlZCBpbiB0aGUgY3VycmVudCBlbGVtZW50XG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQucmF3LmNoYXJBdChyYXdMZW4gLSAxKSA9PSBcIi1cIiAmJiBlbGVtZW50LnJhdy5jaGFyQXQocmF3TGVuIC0gMikgPT0gXCItXCIgJiYgdGFnU2VwID09IFwiPlwiKVxuXHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBlbGVtZW50LnJhdy5yZXBsYWNlKFBhcnNlci5fcmVUcmltQ29tbWVudCwgXCJcIik7XG5cdFx0XHRcdFx0ZWxzZSB7IC8vSXQncyBub3Qgc28gcHVzaCB0aGUgY29tbWVudCBvbnRvIHRoZSB0YWcgc3RhY2tcblx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ICs9IHRhZ1NlcDtcblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnB1c2goRWxlbWVudFR5cGUuQ29tbWVudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGVsZW1lbnQucmF3LmluZGV4T2YoXCIhXCIpID09IDAgfHwgZWxlbWVudC5yYXcuaW5kZXhPZihcIj9cIikgPT0gMCkge1xuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLkRpcmVjdGl2ZTtcblx0XHRcdFx0XHQvL1RPRE86IHdoYXQgYWJvdXQgQ0RBVEE/XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudE5hbWVDSSA9PSBcInNjcmlwdFwiKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuU2NyaXB0O1xuXHRcdFx0XHRcdC8vU3BlY2lhbCB0YWcsIHB1c2ggb250byB0aGUgdGFnIHN0YWNrIGlmIG5vdCB0ZXJtaW5hdGVkXG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQuZGF0YS5jaGFyQXQoZWxlbWVudC5kYXRhLmxlbmd0aCAtIDEpICE9IFwiL1wiKVxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChFbGVtZW50VHlwZS5TY3JpcHQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGVsZW1lbnROYW1lQ0kgPT0gXCIvc2NyaXB0XCIpXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuU2NyaXB0O1xuXHRcdFx0XHRlbHNlIGlmIChlbGVtZW50TmFtZUNJID09IFwic3R5bGVcIikge1xuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlN0eWxlO1xuXHRcdFx0XHRcdC8vU3BlY2lhbCB0YWcsIHB1c2ggb250byB0aGUgdGFnIHN0YWNrIGlmIG5vdCB0ZXJtaW5hdGVkXG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQuZGF0YS5jaGFyQXQoZWxlbWVudC5kYXRhLmxlbmd0aCAtIDEpICE9IFwiL1wiKVxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChFbGVtZW50VHlwZS5TdHlsZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudE5hbWVDSSA9PSBcIi9zdHlsZVwiKVxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlN0eWxlO1xuXHRcdFx0XHRpZiAoZWxlbWVudC5uYW1lICYmIGVsZW1lbnQubmFtZS5jaGFyQXQoMCkgPT0gXCIvXCIpXG5cdFx0XHRcdFx0ZWxlbWVudC5kYXRhID0gZWxlbWVudC5uYW1lO1xuXHRcdFx0fVxuXHRcblx0XHRcdC8vQWRkIGFsbCB0YWdzIGFuZCBub24tZW1wdHkgdGV4dCBlbGVtZW50cyB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHRpZiAoZWxlbWVudC5yYXcgIT0gXCJcIiB8fCBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuVGV4dCkge1xuXHRcdFx0XHRpZiAodGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24gJiYgIWVsZW1lbnQubG9jYXRpb24pIHtcblx0XHRcdFx0XHRlbGVtZW50LmxvY2F0aW9uID0gdGhpcy5nZXRMb2NhdGlvbihlbGVtZW50LnR5cGUgPT0gRWxlbWVudFR5cGUuVGFnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLnBhcnNlQXR0cmlicyhlbGVtZW50KTtcblx0XHRcdFx0dGhpcy5fZWxlbWVudHMucHVzaChlbGVtZW50KTtcblx0XHRcdFx0Ly9JZiB0YWcgc2VsZi10ZXJtaW5hdGVzLCBhZGQgYW4gZXhwbGljaXQsIHNlcGFyYXRlIGNsb3NpbmcgdGFnXG5cdFx0XHRcdGlmIChcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuVGV4dFxuXHRcdFx0XHRcdCYmXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkNvbW1lbnRcblx0XHRcdFx0XHQmJlxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5EaXJlY3RpdmVcblx0XHRcdFx0XHQmJlxuXHRcdFx0XHRcdGVsZW1lbnQuZGF0YS5jaGFyQXQoZWxlbWVudC5kYXRhLmxlbmd0aCAtIDEpID09IFwiL1wiXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHRcdHRoaXMuX2VsZW1lbnRzLnB1c2goe1xuXHRcdFx0XHRcdFx0ICByYXc6IFwiL1wiICsgZWxlbWVudC5uYW1lXG5cdFx0XHRcdFx0XHQsIGRhdGE6IFwiL1wiICsgZWxlbWVudC5uYW1lXG5cdFx0XHRcdFx0XHQsIG5hbWU6IFwiL1wiICsgZWxlbWVudC5uYW1lXG5cdFx0XHRcdFx0XHQsIHR5cGU6IGVsZW1lbnQudHlwZVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fcGFyc2VTdGF0ZSA9ICh0YWdTZXAgPT0gXCI8XCIpID8gRWxlbWVudFR5cGUuVGFnIDogRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdHRoaXMuX2N1cnJlbnQgPSB0aGlzLl9uZXh0ICsgMTtcblx0XHRcdHRoaXMuX3ByZXZUYWdTZXAgPSB0YWdTZXA7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX29wdGlvbnMuaW5jbHVkZUxvY2F0aW9uKSB7XG5cdFx0XHR0aGlzLmdldExvY2F0aW9uKCk7XG5cdFx0XHR0aGlzLl9sb2NhdGlvbi5yb3cgKz0gdGhpcy5fbG9jYXRpb24uaW5CdWZmZXI7XG5cdFx0XHR0aGlzLl9sb2NhdGlvbi5pbkJ1ZmZlciA9IDA7XG5cdFx0XHR0aGlzLl9sb2NhdGlvbi5jaGFyT2Zmc2V0ID0gMDtcblx0XHR9XG5cdFx0dGhpcy5fYnVmZmVyID0gKHRoaXMuX2N1cnJlbnQgPD0gYnVmZmVyRW5kKSA/IHRoaXMuX2J1ZmZlci5zdWJzdHJpbmcodGhpcy5fY3VycmVudCkgOiBcIlwiO1xuXHRcdHRoaXMuX2N1cnJlbnQgPSAwO1xuXHRcblx0XHR0aGlzLndyaXRlSGFuZGxlcigpO1xuXHR9XG5cblx0UGFyc2VyLnByb3RvdHlwZS5nZXRMb2NhdGlvbiA9IGZ1bmN0aW9uIFBhcnNlciRnZXRMb2NhdGlvbiAoc3RhcnRUYWcpIHtcblx0XHR2YXIgYyxcblx0XHRcdGwgPSB0aGlzLl9sb2NhdGlvbixcblx0XHRcdGVuZCA9IHRoaXMuX2N1cnJlbnQgLSAoc3RhcnRUYWcgPyAxIDogMCksXG5cdFx0XHRjaHVuayA9IHN0YXJ0VGFnICYmIGwuY2hhck9mZnNldCA9PSAwICYmIHRoaXMuX2N1cnJlbnQgPT0gMDtcblx0XHRcblx0XHRmb3IgKDsgbC5jaGFyT2Zmc2V0IDwgZW5kOyBsLmNoYXJPZmZzZXQrKykge1xuXHRcdFx0YyA9IHRoaXMuX2J1ZmZlci5jaGFyQXQobC5jaGFyT2Zmc2V0KTtcblx0XHRcdGlmIChjID09ICdcXG4nKSB7XG5cdFx0XHRcdGwuaW5CdWZmZXIrKztcblx0XHRcdFx0bC5jb2wgPSAwO1xuXHRcdFx0fSBlbHNlIGlmIChjICE9ICdcXHInKSB7XG5cdFx0XHRcdGwuY29sKys7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB7XG5cdFx0XHQgIGxpbmU6IGwucm93ICsgbC5pbkJ1ZmZlciArIDFcblx0XHRcdCwgY29sOiBsLmNvbCArIChjaHVuayA/IDA6IDEpXG5cdFx0fTtcblx0fVxuXG5cdC8vQ2hlY2tzIHRoZSBoYW5kbGVyIHRvIG1ha2UgaXQgaXMgYW4gb2JqZWN0IHdpdGggdGhlIHJpZ2h0IFwiaW50ZXJmYWNlXCJcblx0UGFyc2VyLnByb3RvdHlwZS52YWxpZGF0ZUhhbmRsZXIgPSBmdW5jdGlvbiBQYXJzZXIkdmFsaWRhdGVIYW5kbGVyIChoYW5kbGVyKSB7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlcikgIT0gXCJvYmplY3RcIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgaXMgbm90IGFuIG9iamVjdFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLnJlc2V0KSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAncmVzZXQnIGlzIGludmFsaWRcIik7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlci5kb25lKSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAnZG9uZScgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlVGFnKSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAnd3JpdGVUYWcnIGlzIGludmFsaWRcIik7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlci53cml0ZVRleHQpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICd3cml0ZVRleHQnIGlzIGludmFsaWRcIik7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlci53cml0ZUNvbW1lbnQpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICd3cml0ZUNvbW1lbnQnIGlzIGludmFsaWRcIik7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlci53cml0ZURpcmVjdGl2ZSkgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ3dyaXRlRGlyZWN0aXZlJyBpcyBpbnZhbGlkXCIpO1xuXHR9XG5cblx0Ly9Xcml0ZXMgcGFyc2VkIGVsZW1lbnRzIG91dCB0byB0aGUgaGFuZGxlclxuXHRQYXJzZXIucHJvdG90eXBlLndyaXRlSGFuZGxlciA9IGZ1bmN0aW9uIFBhcnNlciR3cml0ZUhhbmRsZXIgKGZvcmNlRmx1c2gpIHtcblx0XHRmb3JjZUZsdXNoID0gISFmb3JjZUZsdXNoO1xuXHRcdGlmICh0aGlzLl90YWdTdGFjay5sZW5ndGggJiYgIWZvcmNlRmx1c2gpXG5cdFx0XHRyZXR1cm47XG5cdFx0d2hpbGUgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0dmFyIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50cy5zaGlmdCgpO1xuXHRcdFx0c3dpdGNoIChlbGVtZW50LnR5cGUpIHtcblx0XHRcdFx0Y2FzZSBFbGVtZW50VHlwZS5Db21tZW50OlxuXHRcdFx0XHRcdHRoaXMuX2hhbmRsZXIud3JpdGVDb21tZW50KGVsZW1lbnQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIEVsZW1lbnRUeXBlLkRpcmVjdGl2ZTpcblx0XHRcdFx0XHR0aGlzLl9oYW5kbGVyLndyaXRlRGlyZWN0aXZlKGVsZW1lbnQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIEVsZW1lbnRUeXBlLlRleHQ6XG5cdFx0XHRcdFx0dGhpcy5faGFuZGxlci53cml0ZVRleHQoZWxlbWVudCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0dGhpcy5faGFuZGxlci53cml0ZVRhZyhlbGVtZW50KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRQYXJzZXIucHJvdG90eXBlLmhhbmRsZUVycm9yID0gZnVuY3Rpb24gUGFyc2VyJGhhbmRsZUVycm9yIChlcnJvcikge1xuXHRcdGlmICgodHlwZW9mIHRoaXMuX2hhbmRsZXIuZXJyb3IpID09IFwiZnVuY3Rpb25cIilcblx0XHRcdHRoaXMuX2hhbmRsZXIuZXJyb3IoZXJyb3IpO1xuXHRcdGVsc2Vcblx0XHRcdHRocm93IGVycm9yO1xuXHR9XG5cbi8vVE9ETzogbWFrZSB0aGlzIGEgdHJ1bGx5IHN0cmVhbWFibGUgaGFuZGxlclxuZnVuY3Rpb24gUnNzSGFuZGxlciAoY2FsbGJhY2spIHtcblx0UnNzSGFuZGxlci5zdXBlcl8uY2FsbCh0aGlzLCBjYWxsYmFjaywgeyBpZ25vcmVXaGl0ZXNwYWNlOiB0cnVlLCB2ZXJib3NlOiBmYWxzZSwgZW5mb3JjZUVtcHR5VGFnczogZmFsc2UgfSk7XG59XG5pbmhlcml0cyhSc3NIYW5kbGVyLCBEZWZhdWx0SGFuZGxlcik7XG5cblx0UnNzSGFuZGxlci5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIFJzc0hhbmRsZXIkZG9uZSAoKSB7XG5cdFx0dmFyIGZlZWQgPSB7IH07XG5cdFx0dmFyIGZlZWRSb290O1xuXG5cdFx0dmFyIGZvdW5kID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoZnVuY3Rpb24gKHZhbHVlKSB7IHJldHVybih2YWx1ZSA9PSBcInJzc1wiIHx8IHZhbHVlID09IFwiZmVlZFwiKTsgfSwgdGhpcy5kb20sIGZhbHNlKTtcblx0XHRpZiAoZm91bmQubGVuZ3RoKSB7XG5cdFx0XHRmZWVkUm9vdCA9IGZvdW5kWzBdO1xuXHRcdH1cblx0XHRpZiAoZmVlZFJvb3QpIHtcblx0XHRcdGlmIChmZWVkUm9vdC5uYW1lID09IFwicnNzXCIpIHtcblx0XHRcdFx0ZmVlZC50eXBlID0gXCJyc3NcIjtcblx0XHRcdFx0ZmVlZFJvb3QgPSBmZWVkUm9vdC5jaGlsZHJlblswXTsgLy88Y2hhbm5lbC8+XG5cdFx0XHRcdGZlZWQuaWQgPSBcIlwiO1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQudGl0bGUgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRpdGxlXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQubGluayA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGlua1wiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLmRlc2NyaXB0aW9uID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJkZXNjcmlwdGlvblwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLnVwZGF0ZWQgPSBuZXcgRGF0ZShEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImxhc3RCdWlsZERhdGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhKTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQuYXV0aG9yID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJtYW5hZ2luZ0VkaXRvclwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0ZmVlZC5pdGVtcyA9IFtdO1xuXHRcdFx0XHREb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcIml0ZW1cIiwgZmVlZFJvb3QuY2hpbGRyZW4pLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0sIGluZGV4LCBsaXN0KSB7XG5cdFx0XHRcdFx0dmFyIGVudHJ5ID0ge307XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LmlkID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJndWlkXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkudGl0bGUgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRpdGxlXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkubGluayA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGlua1wiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LmRlc2NyaXB0aW9uID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJkZXNjcmlwdGlvblwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LnB1YkRhdGUgPSBuZXcgRGF0ZShEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInB1YkRhdGVcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGEpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHRmZWVkLml0ZW1zLnB1c2goZW50cnkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZlZWQudHlwZSA9IFwiYXRvbVwiO1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQuaWQgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImlkXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQudGl0bGUgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRpdGxlXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQubGluayA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGlua1wiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmF0dHJpYnMuaHJlZjtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQuZGVzY3JpcHRpb24gPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN1YnRpdGxlXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQudXBkYXRlZCA9IG5ldyBEYXRlKERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidXBkYXRlZFwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGEpO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5hdXRob3IgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImVtYWlsXCIsIGZlZWRSb290LmNoaWxkcmVuLCB0cnVlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdGZlZWQuaXRlbXMgPSBbXTtcblx0XHRcdFx0RG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJlbnRyeVwiLCBmZWVkUm9vdC5jaGlsZHJlbikuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdFx0XHR2YXIgZW50cnkgPSB7fTtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkuaWQgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImlkXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkudGl0bGUgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRpdGxlXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkubGluayA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGlua1wiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uYXR0cmlicy5ocmVmO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkuZGVzY3JpcHRpb24gPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN1bW1hcnlcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5wdWJEYXRlID0gbmV3IERhdGUoRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ1cGRhdGVkXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhKTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0ZmVlZC5pdGVtcy5wdXNoKGVudHJ5KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuZG9tID0gZmVlZDtcblx0XHR9XG5cdFx0UnNzSGFuZGxlci5zdXBlcl8ucHJvdG90eXBlLmRvbmUuY2FsbCh0aGlzKTtcblx0fVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIgKGNhbGxiYWNrLCBvcHRpb25zKSB7XG5cdHRoaXMucmVzZXQoKTtcblx0dGhpcy5fb3B0aW9ucyA9IG9wdGlvbnMgPyBvcHRpb25zIDogeyB9O1xuXHRpZiAodGhpcy5fb3B0aW9ucy5pZ25vcmVXaGl0ZXNwYWNlID09IHVuZGVmaW5lZClcblx0XHR0aGlzLl9vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UgPSBmYWxzZTsgLy9LZWVwIHdoaXRlc3BhY2Utb25seSB0ZXh0IG5vZGVzXG5cdGlmICh0aGlzLl9vcHRpb25zLnZlcmJvc2UgPT0gdW5kZWZpbmVkKVxuXHRcdHRoaXMuX29wdGlvbnMudmVyYm9zZSA9IHRydWU7IC8vS2VlcCBkYXRhIHByb3BlcnR5IGZvciB0YWdzIGFuZCByYXcgcHJvcGVydHkgZm9yIGFsbFxuXHRpZiAodGhpcy5fb3B0aW9ucy5lbmZvcmNlRW1wdHlUYWdzID09IHVuZGVmaW5lZClcblx0XHR0aGlzLl9vcHRpb25zLmVuZm9yY2VFbXB0eVRhZ3MgPSB0cnVlOyAvL0Rvbid0IGFsbG93IGNoaWxkcmVuIGZvciBIVE1MIHRhZ3MgZGVmaW5lZCBhcyBlbXB0eSBpbiBzcGVjXG5cdGlmICgodHlwZW9mIGNhbGxiYWNrKSA9PSBcImZ1bmN0aW9uXCIpXG5cdFx0dGhpcy5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbn1cblxuXHQvLyoqXCJTdGF0aWNcIioqLy9cblx0Ly9IVE1MIFRhZ3MgdGhhdCBzaG91bGRuJ3QgY29udGFpbiBjaGlsZCBub2Rlc1xuXHREZWZhdWx0SGFuZGxlci5fZW1wdHlUYWdzID0ge1xuXHRcdCAgYXJlYTogMVxuXHRcdCwgYmFzZTogMVxuXHRcdCwgYmFzZWZvbnQ6IDFcblx0XHQsIGJyOiAxXG5cdFx0LCBjb2w6IDFcblx0XHQsIGZyYW1lOiAxXG5cdFx0LCBocjogMVxuXHRcdCwgaW1nOiAxXG5cdFx0LCBpbnB1dDogMVxuXHRcdCwgaXNpbmRleDogMVxuXHRcdCwgbGluazogMVxuXHRcdCwgbWV0YTogMVxuXHRcdCwgcGFyYW06IDFcblx0XHQsIGVtYmVkOiAxXG5cdH1cblx0Ly9SZWdleCB0byBkZXRlY3Qgd2hpdGVzcGFjZSBvbmx5IHRleHQgbm9kZXNcblx0RGVmYXVsdEhhbmRsZXIucmVXaGl0ZXNwYWNlID0gL15cXHMqJC87XG5cblx0Ly8qKlB1YmxpYyoqLy9cblx0Ly9Qcm9wZXJ0aWVzLy9cblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmRvbSA9IG51bGw7IC8vVGhlIGhpZXJhcmNoaWNhbCBvYmplY3QgY29udGFpbmluZyB0aGUgcGFyc2VkIEhUTUxcblx0Ly9NZXRob2RzLy9cblx0Ly9SZXNldHMgdGhlIGhhbmRsZXIgYmFjayB0byBzdGFydGluZyBzdGF0ZVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRyZXNldCgpIHtcblx0XHR0aGlzLmRvbSA9IFtdO1xuXHRcdHRoaXMuX2RvbmUgPSBmYWxzZTtcblx0XHR0aGlzLl90YWdTdGFjayA9IFtdO1xuXHRcdHRoaXMuX3RhZ1N0YWNrLmxhc3QgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRfdGFnU3RhY2skbGFzdCAoKSB7XG5cdFx0XHRyZXR1cm4odGhpcy5sZW5ndGggPyB0aGlzW3RoaXMubGVuZ3RoIC0gMV0gOiBudWxsKTtcblx0XHR9XG5cdH1cblx0Ly9TaWduYWxzIHRoZSBoYW5kbGVyIHRoYXQgcGFyc2luZyBpcyBkb25lXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkZG9uZSAoKSB7XG5cdFx0dGhpcy5fZG9uZSA9IHRydWU7XG5cdFx0dGhpcy5oYW5kbGVDYWxsYmFjayhudWxsKTtcblx0fVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVUYWcgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciR3cml0ZVRhZyAoZWxlbWVudCkge1xuXHRcdHRoaXMuaGFuZGxlRWxlbWVudChlbGVtZW50KTtcblx0fSBcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLndyaXRlVGV4dCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHdyaXRlVGV4dCAoZWxlbWVudCkge1xuXHRcdGlmICh0aGlzLl9vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UpXG5cdFx0XHRpZiAoRGVmYXVsdEhhbmRsZXIucmVXaGl0ZXNwYWNlLnRlc3QoZWxlbWVudC5kYXRhKSlcblx0XHRcdFx0cmV0dXJuO1xuXHRcdHRoaXMuaGFuZGxlRWxlbWVudChlbGVtZW50KTtcblx0fSBcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLndyaXRlQ29tbWVudCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHdyaXRlQ29tbWVudCAoZWxlbWVudCkge1xuXHRcdHRoaXMuaGFuZGxlRWxlbWVudChlbGVtZW50KTtcblx0fSBcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLndyaXRlRGlyZWN0aXZlID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkd3JpdGVEaXJlY3RpdmUgKGVsZW1lbnQpIHtcblx0XHR0aGlzLmhhbmRsZUVsZW1lbnQoZWxlbWVudCk7XG5cdH1cblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkZXJyb3IgKGVycm9yKSB7XG5cdFx0dGhpcy5oYW5kbGVDYWxsYmFjayhlcnJvcik7XG5cdH1cblxuXHQvLyoqUHJpdmF0ZSoqLy9cblx0Ly9Qcm9wZXJ0aWVzLy9cblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLl9vcHRpb25zID0gbnVsbDsgLy9IYW5kbGVyIG9wdGlvbnMgZm9yIGhvdyB0byBiZWhhdmVcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLl9jYWxsYmFjayA9IG51bGw7IC8vQ2FsbGJhY2sgdG8gcmVzcG9uZCB0byB3aGVuIHBhcnNpbmcgZG9uZVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuX2RvbmUgPSBmYWxzZTsgLy9GbGFnIGluZGljYXRpbmcgd2hldGhlciBoYW5kbGVyIGhhcyBiZWVuIG5vdGlmaWVkIG9mIHBhcnNpbmcgY29tcGxldGVkXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5fdGFnU3RhY2sgPSBudWxsOyAvL0xpc3Qgb2YgcGFyZW50cyB0byB0aGUgY3VycmVudGx5IGVsZW1lbnQgYmVpbmcgcHJvY2Vzc2VkXG5cdC8vTWV0aG9kcy8vXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5oYW5kbGVDYWxsYmFjayA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJGhhbmRsZUNhbGxiYWNrIChlcnJvcikge1xuXHRcdFx0aWYgKCh0eXBlb2YgdGhpcy5fY2FsbGJhY2spICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdFx0aWYgKGVycm9yKVxuXHRcdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0dGhpcy5fY2FsbGJhY2soZXJyb3IsIHRoaXMuZG9tKTtcblx0fVxuXHRcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmlzRW1wdHlUYWcgPSBmdW5jdGlvbihlbGVtZW50KSB7XG5cdFx0dmFyIG5hbWUgPSBlbGVtZW50Lm5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRpZiAobmFtZS5jaGFyQXQoMCkgPT0gJy8nKSB7XG5cdFx0XHRuYW1lID0gbmFtZS5zdWJzdHJpbmcoMSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLl9vcHRpb25zLmVuZm9yY2VFbXB0eVRhZ3MgJiYgISFEZWZhdWx0SGFuZGxlci5fZW1wdHlUYWdzW25hbWVdO1xuXHR9O1xuXHRcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmhhbmRsZUVsZW1lbnQgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRoYW5kbGVFbGVtZW50IChlbGVtZW50KSB7XG5cdFx0aWYgKHRoaXMuX2RvbmUpXG5cdFx0XHR0aGlzLmhhbmRsZUNhbGxiYWNrKG5ldyBFcnJvcihcIldyaXRpbmcgdG8gdGhlIGhhbmRsZXIgYWZ0ZXIgZG9uZSgpIGNhbGxlZCBpcyBub3QgYWxsb3dlZCB3aXRob3V0IGEgcmVzZXQoKVwiKSk7XG5cdFx0aWYgKCF0aGlzLl9vcHRpb25zLnZlcmJvc2UpIHtcbi8vXHRcdFx0ZWxlbWVudC5yYXcgPSBudWxsOyAvL0ZJWE1FOiBOb3QgY2xlYW5cblx0XHRcdC8vRklYTUU6IFNlcmlvdXMgcGVyZm9ybWFuY2UgcHJvYmxlbSB1c2luZyBkZWxldGVcblx0XHRcdGRlbGV0ZSBlbGVtZW50LnJhdztcblx0XHRcdGlmIChlbGVtZW50LnR5cGUgPT0gXCJ0YWdcIiB8fCBlbGVtZW50LnR5cGUgPT0gXCJzY3JpcHRcIiB8fCBlbGVtZW50LnR5cGUgPT0gXCJzdHlsZVwiKVxuXHRcdFx0XHRkZWxldGUgZWxlbWVudC5kYXRhO1xuXHRcdH1cblx0XHRpZiAoIXRoaXMuX3RhZ1N0YWNrLmxhc3QoKSkgeyAvL1RoZXJlIGFyZSBubyBwYXJlbnQgZWxlbWVudHNcblx0XHRcdC8vSWYgdGhlIGVsZW1lbnQgY2FuIGJlIGEgY29udGFpbmVyLCBhZGQgaXQgdG8gdGhlIHRhZyBzdGFjayBhbmQgdGhlIHRvcCBsZXZlbCBsaXN0XG5cdFx0XHRpZiAoZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlRleHQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkNvbW1lbnQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkRpcmVjdGl2ZSkge1xuXHRcdFx0XHRpZiAoZWxlbWVudC5uYW1lLmNoYXJBdCgwKSAhPSBcIi9cIikgeyAvL0lnbm9yZSBjbG9zaW5nIHRhZ3MgdGhhdCBvYnZpb3VzbHkgZG9uJ3QgaGF2ZSBhbiBvcGVuaW5nIHRhZ1xuXHRcdFx0XHRcdHRoaXMuZG9tLnB1c2goZWxlbWVudCk7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLmlzRW1wdHlUYWcoZWxlbWVudCkpIHsgLy9Eb24ndCBhZGQgdGFncyB0byB0aGUgdGFnIHN0YWNrIHRoYXQgY2FuJ3QgaGF2ZSBjaGlsZHJlblxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChlbGVtZW50KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgLy9PdGhlcndpc2UganVzdCBhZGQgdG8gdGhlIHRvcCBsZXZlbCBsaXN0XG5cdFx0XHRcdHRoaXMuZG9tLnB1c2goZWxlbWVudCk7XG5cdFx0fVxuXHRcdGVsc2UgeyAvL1RoZXJlIGFyZSBwYXJlbnQgZWxlbWVudHNcblx0XHRcdC8vSWYgdGhlIGVsZW1lbnQgY2FuIGJlIGEgY29udGFpbmVyLCBhZGQgaXQgYXMgYSBjaGlsZCBvZiB0aGUgZWxlbWVudFxuXHRcdFx0Ly9vbiB0b3Agb2YgdGhlIHRhZyBzdGFjayBhbmQgdGhlbiBhZGQgaXQgdG8gdGhlIHRhZyBzdGFja1xuXHRcdFx0aWYgKGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UZXh0ICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5Db21tZW50ICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5EaXJlY3RpdmUpIHtcblx0XHRcdFx0aWYgKGVsZW1lbnQubmFtZS5jaGFyQXQoMCkgPT0gXCIvXCIpIHtcblx0XHRcdFx0XHQvL1RoaXMgaXMgYSBjbG9zaW5nIHRhZywgc2NhbiB0aGUgdGFnU3RhY2sgdG8gZmluZCB0aGUgbWF0Y2hpbmcgb3BlbmluZyB0YWdcblx0XHRcdFx0XHQvL2FuZCBwb3AgdGhlIHN0YWNrIHVwIHRvIHRoZSBvcGVuaW5nIHRhZydzIHBhcmVudFxuXHRcdFx0XHRcdHZhciBiYXNlTmFtZSA9IGVsZW1lbnQubmFtZS5zdWJzdHJpbmcoMSk7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLmlzRW1wdHlUYWcoZWxlbWVudCkpIHtcblx0XHRcdFx0XHRcdHZhciBwb3MgPSB0aGlzLl90YWdTdGFjay5sZW5ndGggLSAxO1xuXHRcdFx0XHRcdFx0d2hpbGUgKHBvcyA+IC0xICYmIHRoaXMuX3RhZ1N0YWNrW3Bvcy0tXS5uYW1lICE9IGJhc2VOYW1lKSB7IH1cblx0XHRcdFx0XHRcdGlmIChwb3MgPiAtMSB8fCB0aGlzLl90YWdTdGFja1swXS5uYW1lID09IGJhc2VOYW1lKVxuXHRcdFx0XHRcdFx0XHR3aGlsZSAocG9zIDwgdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMSlcblx0XHRcdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wb3AoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7IC8vVGhpcyBpcyBub3QgYSBjbG9zaW5nIHRhZ1xuXHRcdFx0XHRcdGlmICghdGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuKVxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuID0gW107XG5cdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuLnB1c2goZWxlbWVudCk7XG5cdFx0XHRcdFx0aWYgKCF0aGlzLmlzRW1wdHlUYWcoZWxlbWVudCkpIC8vRG9uJ3QgYWRkIHRhZ3MgdG8gdGhlIHRhZyBzdGFjayB0aGF0IGNhbid0IGhhdmUgY2hpbGRyZW5cblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnB1c2goZWxlbWVudCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGVsc2UgeyAvL1RoaXMgaXMgbm90IGEgY29udGFpbmVyIGVsZW1lbnRcblx0XHRcdFx0aWYgKCF0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4pXG5cdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuID0gW107XG5cdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLmxhc3QoKS5jaGlsZHJlbi5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHZhciBEb21VdGlscyA9IHtcblx0XHQgIHRlc3RFbGVtZW50OiBmdW5jdGlvbiBEb21VdGlscyR0ZXN0RWxlbWVudCAob3B0aW9ucywgZWxlbWVudCkge1xuXHRcdFx0aWYgKCFlbGVtZW50KSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRpZiAoa2V5ID09IFwidGFnX25hbWVcIikge1xuXHRcdFx0XHRcdGlmIChlbGVtZW50LnR5cGUgIT0gXCJ0YWdcIiAmJiBlbGVtZW50LnR5cGUgIT0gXCJzY3JpcHRcIiAmJiBlbGVtZW50LnR5cGUgIT0gXCJzdHlsZVwiKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICghb3B0aW9uc1tcInRhZ19uYW1lXCJdKGVsZW1lbnQubmFtZSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoa2V5ID09IFwidGFnX3R5cGVcIikge1xuXHRcdFx0XHRcdGlmICghb3B0aW9uc1tcInRhZ190eXBlXCJdKGVsZW1lbnQudHlwZSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoa2V5ID09IFwidGFnX2NvbnRhaW5zXCIpIHtcblx0XHRcdFx0XHRpZiAoZWxlbWVudC50eXBlICE9IFwidGV4dFwiICYmIGVsZW1lbnQudHlwZSAhPSBcImNvbW1lbnRcIiAmJiBlbGVtZW50LnR5cGUgIT0gXCJkaXJlY3RpdmVcIikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIW9wdGlvbnNbXCJ0YWdfY29udGFpbnNcIl0oZWxlbWVudC5kYXRhKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAoIWVsZW1lbnQuYXR0cmlicyB8fCAhb3B0aW9uc1trZXldKGVsZW1lbnQuYXR0cmlic1trZXldKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcblx0XHQsIGdldEVsZW1lbnRzOiBmdW5jdGlvbiBEb21VdGlscyRnZXRFbGVtZW50cyAob3B0aW9ucywgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIGxpbWl0KSB7XG5cdFx0XHRyZWN1cnNlID0gKHJlY3Vyc2UgPT09IHVuZGVmaW5lZCB8fCByZWN1cnNlID09PSBudWxsKSB8fCAhIXJlY3Vyc2U7XG5cdFx0XHRsaW1pdCA9IGlzTmFOKHBhcnNlSW50KGxpbWl0KSkgPyAtMSA6IHBhcnNlSW50KGxpbWl0KTtcblxuXHRcdFx0aWYgKCFjdXJyZW50RWxlbWVudCkge1xuXHRcdFx0XHRyZXR1cm4oW10pO1xuXHRcdFx0fVxuXHRcblx0XHRcdHZhciBmb3VuZCA9IFtdO1xuXHRcdFx0dmFyIGVsZW1lbnRMaXN0O1xuXG5cdFx0XHRmdW5jdGlvbiBnZXRUZXN0IChjaGVja1ZhbCkge1xuXHRcdFx0XHRyZXR1cm4oZnVuY3Rpb24gKHZhbHVlKSB7IHJldHVybih2YWx1ZSA9PSBjaGVja1ZhbCk7IH0pO1xuXHRcdFx0fVxuXHRcdFx0Zm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcblx0XHRcdFx0aWYgKCh0eXBlb2Ygb3B0aW9uc1trZXldKSAhPSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHRvcHRpb25zW2tleV0gPSBnZXRUZXN0KG9wdGlvbnNba2V5XSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XG5cdFx0XHRpZiAoRG9tVXRpbHMudGVzdEVsZW1lbnQob3B0aW9ucywgY3VycmVudEVsZW1lbnQpKSB7XG5cdFx0XHRcdGZvdW5kLnB1c2goY3VycmVudEVsZW1lbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobGltaXQgPj0gMCAmJiBmb3VuZC5sZW5ndGggPj0gbGltaXQpIHtcblx0XHRcdFx0cmV0dXJuKGZvdW5kKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHJlY3Vyc2UgJiYgY3VycmVudEVsZW1lbnQuY2hpbGRyZW4pIHtcblx0XHRcdFx0ZWxlbWVudExpc3QgPSBjdXJyZW50RWxlbWVudC5jaGlsZHJlbjtcblx0XHRcdH0gZWxzZSBpZiAoY3VycmVudEVsZW1lbnQgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRlbGVtZW50TGlzdCA9IGN1cnJlbnRFbGVtZW50O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuKGZvdW5kKTtcblx0XHRcdH1cblx0XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRMaXN0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGZvdW5kID0gZm91bmQuY29uY2F0KERvbVV0aWxzLmdldEVsZW1lbnRzKG9wdGlvbnMsIGVsZW1lbnRMaXN0W2ldLCByZWN1cnNlLCBsaW1pdCkpO1xuXHRcdFx0XHRpZiAobGltaXQgPj0gMCAmJiBmb3VuZC5sZW5ndGggPj0gbGltaXQpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcblx0XHRcdHJldHVybihmb3VuZCk7XG5cdFx0fVxuXHRcdFxuXHRcdCwgZ2V0RWxlbWVudEJ5SWQ6IGZ1bmN0aW9uIERvbVV0aWxzJGdldEVsZW1lbnRCeUlkIChpZCwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UpIHtcblx0XHRcdHZhciByZXN1bHQgPSBEb21VdGlscy5nZXRFbGVtZW50cyh7IGlkOiBpZCB9LCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgMSk7XG5cdFx0XHRyZXR1cm4ocmVzdWx0Lmxlbmd0aCA/IHJlc3VsdFswXSA6IG51bGwpO1xuXHRcdH1cblx0XHRcblx0XHQsIGdldEVsZW1lbnRzQnlUYWdOYW1lOiBmdW5jdGlvbiBEb21VdGlscyRnZXRFbGVtZW50c0J5VGFnTmFtZSAobmFtZSwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIGxpbWl0KSB7XG5cdFx0XHRyZXR1cm4oRG9tVXRpbHMuZ2V0RWxlbWVudHMoeyB0YWdfbmFtZTogbmFtZSB9LCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpKTtcblx0XHR9XG5cdFx0XG5cdFx0LCBnZXRFbGVtZW50c0J5VGFnVHlwZTogZnVuY3Rpb24gRG9tVXRpbHMkZ2V0RWxlbWVudHNCeVRhZ1R5cGUgKHR5cGUsIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCBsaW1pdCkge1xuXHRcdFx0cmV0dXJuKERvbVV0aWxzLmdldEVsZW1lbnRzKHsgdGFnX3R5cGU6IHR5cGUgfSwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIGxpbWl0KSk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gaW5oZXJpdHMgKGN0b3IsIHN1cGVyQ3Rvcikge1xuXHRcdHZhciB0ZW1wQ3RvciA9IGZ1bmN0aW9uKCl7fTtcblx0XHR0ZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlO1xuXHRcdGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yO1xuXHRcdGN0b3IucHJvdG90eXBlID0gbmV3IHRlbXBDdG9yKCk7XG5cdFx0Y3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yO1xuXHR9XG5cbmV4cG9ydHMuUGFyc2VyID0gUGFyc2VyO1xuXG5leHBvcnRzLkRlZmF1bHRIYW5kbGVyID0gRGVmYXVsdEhhbmRsZXI7XG5cbmV4cG9ydHMuUnNzSGFuZGxlciA9IFJzc0hhbmRsZXI7XG5cbmV4cG9ydHMuRWxlbWVudFR5cGUgPSBFbGVtZW50VHlwZTtcblxuZXhwb3J0cy5Eb21VdGlscyA9IERvbVV0aWxzO1xuXG59KSgpO1xuXG59KS5jYWxsKHRoaXMsXCIvbm9kZV9tb2R1bGVzL2h0bWxQYXJzZXIvbGliL2h0bWxwYXJzZXIuanNcIixcIi9ub2RlX21vZHVsZXMvaHRtbFBhcnNlci9saWJcIikiXX0=
