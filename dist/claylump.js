(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var ClayRegister = require('./src/register');
var helper       = require('./src/helper');

window.Claylump = helper.mix(ClayRegister, {
  factory: {
    http: require('./src/factory/http')
  },
  mixin: {
    log : require('./src/mixin/log')
  }
});

},{"./src/factory/http":33,"./src/helper":34,"./src/mixin/log":35,"./src/register":36}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
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

}).call(this,"/node_modules/htmlparser/lib/htmlparser.js","/node_modules/htmlparser/lib")
},{}],4:[function(require,module,exports){
var createElement = require("vdom/create-element")

module.exports = createElement

},{"vdom/create-element":12}],5:[function(require,module,exports){
var diff = require("vtree/diff")

module.exports = diff

},{"vtree/diff":18}],6:[function(require,module,exports){
var h = require("./h/index.js")

module.exports = h

},{"./h/index.js":7}],7:[function(require,module,exports){
var isArray = require("x-is-array")
var isString = require("x-is-string")

var VNode = require("vtree/vnode.js")
var VText = require("vtree/vtext.js")
var isVNode = require("vtree/is-vnode")
var isVText = require("vtree/is-vtext")
var isWidget = require("vtree/is-widget")

var parseTag = require("./parse-tag")

module.exports = h

function h(tagName, properties, children) {
    var tag, props, childNodes, key

    if (!children) {
        if (isChildren(properties)) {
            children = properties
            properties = undefined
        }
    }

    tag = parseTag(tagName, properties)

    if (!isString(tag)) {
        props = tag.properties
        tag = tag.tagName
    } else {
        props = properties
    }

    if (isArray(children)) {
        var len = children.length

        for (var i = 0; i < len; i++) {
            var child = children[i]
            if (isString(child)) {
                children[i] = new VText(child)
            }
        }

        childNodes = children
    } else if (isString(children)) {
        childNodes = [new VText(children)]
    } else if (isChild(children)) {
        childNodes = [children]
    }

    if (props && "key" in props) {
        key = props.key
        delete props.key
    }

    return new VNode(tag, props, childNodes, key)
}

function isChild(x) {
    return isVNode(x) || isVText(x) || isWidget(x)
}

function isChildren(x) {
    return isArray(x) || isString(x) || isChild(x)
}

},{"./parse-tag":8,"vtree/is-vnode":22,"vtree/is-vtext":23,"vtree/is-widget":24,"vtree/vnode.js":26,"vtree/vtext.js":28,"x-is-array":29,"x-is-string":30}],8:[function(require,module,exports){
var split = require("browser-split")

var classIdSplit = /([\.#]?[a-zA-Z0-9_:-]+)/
var notClassId = /^\.|#/

module.exports = parseTag

function parseTag(tag, props) {
    if (!tag) {
        return "div"
    }

    var noId = !props || !("id" in props)

    var tagParts = split(tag, classIdSplit)
    var tagName = null

    if(notClassId.test(tagParts[1])) {
        tagName = "div"
    }

    var id, classes, part, type, i
    for (i = 0; i < tagParts.length; i++) {
        part = tagParts[i]

        if (!part) {
            continue
        }

        type = part.charAt(0)

        if (!tagName) {
            tagName = part
        } else if (type === ".") {
            classes = classes || []
            classes.push(part.substring(1, part.length))
        } else if (type === "#" && noId) {
            id = part.substring(1, part.length)
        }
    }

    var parsedTags

    if (props) {
        if (id !== undefined && !("id" in props)) {
            props.id = id
        }

        if (classes) {
            if (props.className) {
                classes.push(props.className)
            }

            props.className = classes.join(" ")
        }

        parsedTags = tagName
    } else if (classes || id !== undefined) {
        var properties = {}

        if (id !== undefined) {
            properties.id = id
        }

        if (classes) {
            properties.className = classes.join(" ")
        }

        parsedTags = {
            tagName: tagName,
            properties: properties
        }
    } else {
        parsedTags = tagName
    }

    return parsedTags
}

},{"browser-split":9}],9:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],10:[function(require,module,exports){
module.exports = isObject

function isObject(x) {
    return typeof x === "object" && x !== null
}

},{}],11:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("vtree/is-vhook")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, props, previous, propName);
        } else if (isHook(propValue)) {
            propValue.hook(node,
                propName,
                previous ? previous[propName] : undefined)
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else if (propValue !== undefined) {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, props, previous, propName) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"is-object":10,"vtree/is-vhook":21}],12:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("vtree/is-vnode")
var isVText = require("vtree/is-vtext")
var isWidget = require("vtree/is-widget")
var handleThunk = require("vtree/handle-thunk")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"./apply-properties":11,"global/document":14,"vtree/handle-thunk":19,"vtree/is-vnode":22,"vtree/is-vtext":23,"vtree/is-widget":24}],13:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],14:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":2}],15:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("vtree/is-widget")
var VPatch = require("vtree/vpatch")

var render = require("./create-element")
var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = render(vText, renderOptions)

        if (parentNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    destroyWidget(domNode, leftVNode)

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    if (updateWidget(leftVNode, widget)) {
        return widget.update(leftVNode, domNode) || domNode
    }

    var parentNode = domNode.parentNode
    var newWidget = render(widget, renderOptions)

    if (parentNode) {
        parentNode.replaceChild(newWidget, domNode)
    }

    destroyWidget(domNode, leftVNode)

    return newWidget
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    destroyWidget(domNode, leftVNode)

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, bIndex) {
    var children = []
    var childNodes = domNode.childNodes
    var len = childNodes.length
    var i
    var reverseIndex = bIndex.reverse

    for (i = 0; i < len; i++) {
        children.push(domNode.childNodes[i])
    }

    var insertOffset = 0
    var move
    var node
    var insertNode
    for (i = 0; i < len; i++) {
        move = bIndex[i]
        if (move !== undefined && move !== i) {
            // the element currently at this index will be moved later so increase the insert offset
            if (reverseIndex[i] > i) {
                insertOffset++
            }

            node = children[move]
            insertNode = childNodes[i + insertOffset] || null
            if (node !== insertNode) {
                domNode.insertBefore(node, insertNode)
            }

            // the moved element came from the front of the array so reduce the insert offset
            if (move < i) {
                insertOffset--
            }
        }

        // element at this index is scheduled to be removed so increase insert offset
        if (i in bIndex.removes) {
            insertOffset++
        }
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        console.log(oldRoot)
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"./apply-properties":11,"./create-element":12,"./update-widget":17,"vtree/is-widget":24,"vtree/vpatch":27}],16:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches) {
    return patchRecursive(rootNode, patches)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions) {
        renderOptions = { patch: patchRecursive }
        if (ownerDocument !== document) {
            renderOptions.document = ownerDocument
        }
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./dom-index":13,"./patch-op":15,"global/document":14,"x-is-array":29}],17:[function(require,module,exports){
var isWidget = require("vtree/is-widget")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"vtree/is-widget":24}],18:[function(require,module,exports){
var isArray = require("x-is-array")
var isObject = require("is-object")

var VPatch = require("./vpatch")
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var handleThunk = require("./handle-thunk")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        if (isThunk(a) || isThunk(b)) {
            thunks(a, b, patch, index)
        } else {
            hooks(b, patch, index)
        }
        return
    }

    var apply = patch[index]

    if (b == null) {
        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
        destroyWidgets(a, patch, index)
    } else if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties, b.hooks)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                destroyWidgets(a, patch, index)
            }

            apply = diffChildren(a, b, patch, apply, index)
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            destroyWidgets(a, patch, index)
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            destroyWidgets(a, patch, index)
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))

        if (!isWidget(a)) {
            destroyWidgets(a, patch, index)
        }
    }

    if (apply) {
        patch[index] = apply
    }
}

function diffProps(a, b, hooks) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (hooks && aKey in hooks) {
            diff = diff || {}
            diff[aKey] = bValue
        } else {
            if (isObject(aValue) && isObject(bValue)) {
                if (getPrototype(bValue) !== getPrototype(aValue)) {
                    diff = diff || {}
                    diff[aKey] = bValue
                } else {
                    var objectDiff = diffProps(aValue, bValue)
                    if (objectDiff) {
                        diff = diff || {}
                        diff[aKey] = objectDiff
                    }
                }
            } else if (aValue !== bValue) {
                diff = diff || {}
                diff[aKey] = bValue
            }
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var bChildren = reorder(aChildren, b.children)

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else if (!rightNode) {
            if (leftNode) {
                // Excess nodes in a need to be removed
                patch[index] = new VPatch(VPatch.REMOVE, leftNode, null)
                destroyWidgets(leftNode, patch, index)
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (bChildren.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(VPatch.ORDER, a, bChildren.moves))
    }

    return apply
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = new VPatch(VPatch.REMOVE, vNode, null)
        }
    } else if (isVNode(vNode) && vNode.hasWidgets) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b);
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true;
        }
    }

    return false;
}

// Execute hooks when two nodes are identical
function hooks(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = new VPatch(VPatch.PROPS, vNode.hooks, vNode.hooks)
        }

        if (vNode.descendantHooks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                hooks(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    }
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {

    var bKeys = keyIndex(bChildren)

    if (!bKeys) {
        return bChildren
    }

    var aKeys = keyIndex(aChildren)

    if (!aKeys) {
        return bChildren
    }

    var bMatch = {}, aMatch = {}

    for (var key in bKeys) {
        bMatch[bKeys[key]] = aKeys[key]
    }

    for (var key in aKeys) {
        aMatch[aKeys[key]] = bKeys[key]
    }

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen
    var shuffle = []
    var freeIndex = 0
    var i = 0
    var moveIndex = 0
    var moves = {}
    var removes = moves.removes = {}
    var reverse = moves.reverse = {}
    var hasMoves = false

    while (freeIndex < len) {
        var move = aMatch[i]
        if (move !== undefined) {
            shuffle[i] = bChildren[move]
            if (move !== moveIndex) {
                moves[move] = moveIndex
                reverse[moveIndex] = move
                hasMoves = true
            }
            moveIndex++
        } else if (i in aMatch) {
            shuffle[i] = undefined
            removes[i] = moveIndex++
            hasMoves = true
        } else {
            while (bMatch[freeIndex] !== undefined) {
                freeIndex++
            }

            if (freeIndex < len) {
                var freeChild = bChildren[freeIndex]
                if (freeChild) {
                    shuffle[i] = freeChild
                    if (freeIndex !== moveIndex) {
                        hasMoves = true
                        moves[freeIndex] = moveIndex
                        reverse[moveIndex] = freeIndex
                    }
                    moveIndex++
                }
                freeIndex++
            }
        }
        i++
    }

    if (hasMoves) {
        shuffle.moves = moves
    }

    return shuffle
}

function keyIndex(children) {
    var i, keys

    for (i = 0; i < children.length; i++) {
        var child = children[i]

        if (child.key !== undefined) {
            keys = keys || {}
            keys[child.key] = i
        }
    }

    return keys
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"./handle-thunk":19,"./is-thunk":20,"./is-vnode":22,"./is-vtext":23,"./is-widget":24,"./vpatch":27,"is-object":10,"x-is-array":29}],19:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":20,"./is-vnode":22,"./is-vtext":23,"./is-widget":24}],20:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],21:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook && typeof hook.hook === "function" &&
        !hook.hasOwnProperty("hook")
}

},{}],22:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":25}],23:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":25}],24:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],25:[function(require,module,exports){
module.exports = "1"

},{}],26:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property)) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-vhook":21,"./is-vnode":22,"./is-widget":24,"./version":25}],27:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":25}],28:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":25}],29:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],30:[function(require,module,exports){
var toString = Object.prototype.toString

module.exports = isString

function isString(obj) {
    return toString.call(obj) === "[object String]"
}

},{}],31:[function(require,module,exports){
var patch = require("vdom/patch")

module.exports = patch

},{"vdom/patch":16}],32:[function(require,module,exports){
'use strict';

var helper   = require('./helper');
var template = require('./template');

module.exports = {
  create: function(name, proto) {
    /**
     * @private
     * @property {Document} _doc
     */
    proto._doc = document._currentScript ? document._currentScript.ownerDocument
                                         : document.currentScript.ownerDocument;
    /**
     * @private
     * @method {Function} _created
     */
    proto._created = helper.is.func(proto.createdCallback) ? proto.createdCallback
                                                           : helper.noop;
    /**
     * @private
     * @method {Function} _attached
     */
    proto._attached = helper.is.func(proto.attachedCallback) ? proto.attachedCallback
                                                             : helper.noop;
    /**
     * @private
     * @method {Function} _detached
     */
    proto._detached = helper.is.func(proto.detachedCallback) ? proto.detachedCallback
                                                             : helper.noop;
    /**
     * @private
     * @method {Function} _attrChanged
     */
    proto._attrChanged = helper.is.func(proto.attributeChangedCallback) ? proto.attributeChangedCallback
                                                                        : helper.noop;
    /**
     * @private
     * @property {String} _html
     */
    proto._html = '';

    /**
     * @property {Element} root
     */
    proto.root = null;

    // dom ready required
    helper.ready(function() {
      var template = proto._doc.querySelector('[cl-element="'+name+'"]');
      proto._html  = template.innerHTML;
    });

    // mix to proto
    var mixins = proto.mixin || [];
    mixins.forEach(function(mixin) {
      helper.mix(proto, mixin);
    });

    // mix claylump implementation
    helper.mix(proto, ClayMethods);

    // TODO extends element
    return helper.mix(Object.create(HTMLElement.prototype), proto);
  }
};

var ClayMethods = {
  /**
   *
   */
  createdCallback : function() {
    // create virtual template & actual dom
    this.createShadowRoot();

    // resolve use injection
    var factories = helper.mix({}, this.use || {}), // clone!
        keys      = Object.keys(factories),
        i = 0, alias;

    while ((alias = keys[i++])) {
      this.use[alias] = factories[alias](this);
    }

    this._created();
  },

  /**
   *
   */
  attachedCallback : function() {
    this.template = template.create(this._html, this);
    this.root     = this.template.createElement(this._doc);
    this.shadowRoot.appendChild(this.root);
    this.template.drawLoop(this.root);
    this._attached();
  },

  /**
   *
   */
  detachedCallback : function() {
    this.template.destroy();
    this._detached();
  },

  /**
   *
   */
  attributeChangedCallback : function() {
    this._attrChanged();
  }
};

},{"./helper":34,"./template":37}],33:[function(require,module,exports){
'use strict';

var helper = require('../helper');

// test sample
function Http(ctx) {
  this.context = ctx;
}

helper.mix(Http.prototype, {
  get: function(url) {

  }
});

module.exports = function factory(context) {
  return new Http(context);
};

},{"../helper":34}],34:[function(require,module,exports){
'use strict';

/**
 * @param {Object} given
 * @param {Object} passed
 * @return {Object}
 */
function mix(given, passed) {
  var i = 0, ary = Object.keys(passed), iz = ary.length, prop;
  for (; i<iz; i++) {
    prop = ary[i];
    given[prop] = passed[prop];
  }
  return given;
}

/**
 * @param {*} handler
 */
function isFunction(value) {
  return typeof value === 'function';
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

window.requestAnimationFrame  = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame || window.oRequestAnimationFrame;

module.exports = {
  noop      : function noop() {},
  mix       : mix,
  ready     : ready,
  is        : {
    func : isFunction
  }
};

},{}],35:[function(require,module,exports){
'use strict';

// test sample
module.exports = {
  log: function() {
    console.log.apply(arguments);
  },
  debug: function() {
    console.debug.apply(arguments);
  },
  info: function() {
    console.info.apply(arguments);
  },
  warn: function() {
    console.warn.apply(arguments);
  },
  fatal: function() {
    console.error.apply(arguments);
  }
};

},{}],36:[function(require,module,exports){
'use strict';

var element = require('./element');

function ClayRegister(name, proto) {
  document.registerElement(name, {
    prototype: element.create(name, proto)
  });
}

module.exports = ClayRegister;

},{"./element":32}],37:[function(require,module,exports){
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

},{"./helper":34,"htmlparser":3,"virtual-dom/create-element":4,"virtual-dom/diff":5,"virtual-dom/h":6,"virtual-dom/patch":31}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9pbmRleC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvZW1wdHkuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvaHRtbHBhcnNlci9saWIvaHRtbHBhcnNlci5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9jcmVhdGUtZWxlbWVudC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9kaWZmLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2guanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vaC9pbmRleC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9oL3BhcnNlLXRhZy5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvYnJvd3Nlci1zcGxpdC9pbmRleC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvaXMtb2JqZWN0L2luZGV4LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL2FwcGx5LXByb3BlcnRpZXMuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vY3JlYXRlLWVsZW1lbnQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vZG9tLWluZGV4LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL25vZGVfbW9kdWxlcy9nbG9iYWwvZG9jdW1lbnQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vcGF0Y2gtb3AuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vcGF0Y2guanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vdXBkYXRlLXdpZGdldC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvZGlmZi5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaGFuZGxlLXRodW5rLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS9pcy10aHVuay5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdmhvb2suanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXZub2RlLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS9pcy12dGV4dC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaXMtd2lkZ2V0LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS92ZXJzaW9uLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS92bm9kZS5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvdnBhdGNoLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS92dGV4dC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMveC1pcy1hcnJheS9pbmRleC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMveC1pcy1zdHJpbmcvaW5kZXguanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vcGF0Y2guanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvZWxlbWVudC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy9mYWN0b3J5L2h0dHAuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvaGVscGVyLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvc3JjL21peGluL2xvZy5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy9yZWdpc3Rlci5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy90ZW1wbGF0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDenpCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xheVJlZ2lzdGVyID0gcmVxdWlyZSgnLi9zcmMvcmVnaXN0ZXInKTtcbnZhciBoZWxwZXIgICAgICAgPSByZXF1aXJlKCcuL3NyYy9oZWxwZXInKTtcblxud2luZG93LkNsYXlsdW1wID0gaGVscGVyLm1peChDbGF5UmVnaXN0ZXIsIHtcbiAgZmFjdG9yeToge1xuICAgIGh0dHA6IHJlcXVpcmUoJy4vc3JjL2ZhY3RvcnkvaHR0cCcpXG4gIH0sXG4gIG1peGluOiB7XG4gICAgbG9nIDogcmVxdWlyZSgnLi9zcmMvbWl4aW4vbG9nJylcbiAgfVxufSk7XG4iLG51bGwsIihmdW5jdGlvbiAoX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5Db3B5cmlnaHQgMjAxMCwgMjAxMSwgQ2hyaXMgV2luYmVycnkgPGNocmlzQHdpbmJlcnJ5Lm5ldD4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0b1xuZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGVcbnJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vclxuc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HXG5GUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTXG5JTiBUSEUgU09GVFdBUkUuXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qIHYxLjcuNiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG5mdW5jdGlvbiBydW5uaW5nSW5Ob2RlICgpIHtcblx0cmV0dXJuKFxuXHRcdCh0eXBlb2YgcmVxdWlyZSkgPT0gXCJmdW5jdGlvblwiXG5cdFx0JiZcblx0XHQodHlwZW9mIGV4cG9ydHMpID09IFwib2JqZWN0XCJcblx0XHQmJlxuXHRcdCh0eXBlb2YgbW9kdWxlKSA9PSBcIm9iamVjdFwiXG5cdFx0JiZcblx0XHQodHlwZW9mIF9fZmlsZW5hbWUpID09IFwic3RyaW5nXCJcblx0XHQmJlxuXHRcdCh0eXBlb2YgX19kaXJuYW1lKSA9PSBcInN0cmluZ1wiXG5cdFx0KTtcbn1cblxuaWYgKCFydW5uaW5nSW5Ob2RlKCkpIHtcblx0aWYgKCF0aGlzLlRhdXRvbG9naXN0aWNzKVxuXHRcdHRoaXMuVGF1dG9sb2dpc3RpY3MgPSB7fTtcblx0ZWxzZSBpZiAodGhpcy5UYXV0b2xvZ2lzdGljcy5Ob2RlSHRtbFBhcnNlcilcblx0XHRyZXR1cm47IC8vTm9kZUh0bWxQYXJzZXIgYWxyZWFkeSBkZWZpbmVkIVxuXHR0aGlzLlRhdXRvbG9naXN0aWNzLk5vZGVIdG1sUGFyc2VyID0ge307XG5cdGV4cG9ydHMgPSB0aGlzLlRhdXRvbG9naXN0aWNzLk5vZGVIdG1sUGFyc2VyO1xufVxuXG4vL1R5cGVzIG9mIGVsZW1lbnRzIGZvdW5kIGluIHRoZSBET01cbnZhciBFbGVtZW50VHlwZSA9IHtcblx0ICBUZXh0OiBcInRleHRcIiAvL1BsYWluIHRleHRcblx0LCBEaXJlY3RpdmU6IFwiZGlyZWN0aXZlXCIgLy9TcGVjaWFsIHRhZyA8IS4uLj5cblx0LCBDb21tZW50OiBcImNvbW1lbnRcIiAvL1NwZWNpYWwgdGFnIDwhLS0uLi4tLT5cblx0LCBTY3JpcHQ6IFwic2NyaXB0XCIgLy9TcGVjaWFsIHRhZyA8c2NyaXB0Pi4uLjwvc2NyaXB0PlxuXHQsIFN0eWxlOiBcInN0eWxlXCIgLy9TcGVjaWFsIHRhZyA8c3R5bGU+Li4uPC9zdHlsZT5cblx0LCBUYWc6IFwidGFnXCIgLy9BbnkgdGFnIHRoYXQgaXNuJ3Qgc3BlY2lhbFxufVxuXG5mdW5jdGlvbiBQYXJzZXIgKGhhbmRsZXIsIG9wdGlvbnMpIHtcblx0dGhpcy5fb3B0aW9ucyA9IG9wdGlvbnMgPyBvcHRpb25zIDogeyB9O1xuXHRpZiAodGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24gPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24gPSBmYWxzZTsgLy9EbyBub3QgdHJhY2sgZWxlbWVudCBwb3NpdGlvbiBpbiBkb2N1bWVudCBieSBkZWZhdWx0XG5cdH1cblxuXHR0aGlzLnZhbGlkYXRlSGFuZGxlcihoYW5kbGVyKTtcblx0dGhpcy5faGFuZGxlciA9IGhhbmRsZXI7XG5cdHRoaXMucmVzZXQoKTtcbn1cblxuXHQvLyoqXCJTdGF0aWNcIioqLy9cblx0Ly9SZWd1bGFyIGV4cHJlc3Npb25zIHVzZWQgZm9yIGNsZWFuaW5nIHVwIGFuZCBwYXJzaW5nIChzdGF0ZWxlc3MpXG5cdFBhcnNlci5fcmVUcmltID0gLyheXFxzK3xcXHMrJCkvZzsgLy9UcmltIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZVxuXHRQYXJzZXIuX3JlVHJpbUNvbW1lbnQgPSAvKF5cXCEtLXwtLSQpL2c7IC8vUmVtb3ZlIGNvbW1lbnQgdGFnIG1hcmt1cCBmcm9tIGNvbW1lbnQgY29udGVudHNcblx0UGFyc2VyLl9yZVdoaXRlc3BhY2UgPSAvXFxzL2c7IC8vVXNlZCB0byBmaW5kIGFueSB3aGl0ZXNwYWNlIHRvIHNwbGl0IG9uXG5cdFBhcnNlci5fcmVUYWdOYW1lID0gL15cXHMqKFxcLz8pXFxzKihbXlxcc1xcL10rKS87IC8vVXNlZCB0byBmaW5kIHRoZSB0YWcgbmFtZSBmb3IgYW4gZWxlbWVudFxuXG5cdC8vUmVndWxhciBleHByZXNzaW9ucyB1c2VkIGZvciBwYXJzaW5nIChzdGF0ZWZ1bClcblx0UGFyc2VyLl9yZUF0dHJpYiA9IC8vRmluZCBhdHRyaWJ1dGVzIGluIGEgdGFnXG5cdFx0LyhbXj08PlxcXCJcXCdcXHNdKylcXHMqPVxccypcIihbXlwiXSopXCJ8KFtePTw+XFxcIlxcJ1xcc10rKVxccyo9XFxzKicoW14nXSopJ3woW149PD5cXFwiXFwnXFxzXSspXFxzKj1cXHMqKFteJ1wiXFxzXSspfChbXj08PlxcXCJcXCdcXHNcXC9dKykvZztcblx0UGFyc2VyLl9yZVRhZ3MgPSAvW1xcPFxcPl0vZzsgLy9GaW5kIHRhZyBtYXJrZXJzXG5cblx0Ly8qKlB1YmxpYyoqLy9cblx0Ly9NZXRob2RzLy9cblx0Ly9QYXJzZXMgYSBjb21wbGV0ZSBIVE1MIGFuZCBwdXNoZXMgaXQgdG8gdGhlIGhhbmRsZXJcblx0UGFyc2VyLnByb3RvdHlwZS5wYXJzZUNvbXBsZXRlID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlQ29tcGxldGUgKGRhdGEpIHtcblx0XHR0aGlzLnJlc2V0KCk7XG5cdFx0dGhpcy5wYXJzZUNodW5rKGRhdGEpO1xuXHRcdHRoaXMuZG9uZSgpO1xuXHR9XG5cblx0Ly9QYXJzZXMgYSBwaWVjZSBvZiBhbiBIVE1MIGRvY3VtZW50XG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VDaHVuayA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZUNodW5rIChkYXRhKSB7XG5cdFx0aWYgKHRoaXMuX2RvbmUpXG5cdFx0XHR0aGlzLmhhbmRsZUVycm9yKG5ldyBFcnJvcihcIkF0dGVtcHRlZCB0byBwYXJzZSBjaHVuayBhZnRlciBwYXJzaW5nIGFscmVhZHkgZG9uZVwiKSk7XG5cdFx0dGhpcy5fYnVmZmVyICs9IGRhdGE7IC8vRklYTUU6IHRoaXMgY2FuIGJlIGEgYm90dGxlbmVja1xuXHRcdHRoaXMucGFyc2VUYWdzKCk7XG5cdH1cblxuXHQvL1RlbGxzIHRoZSBwYXJzZXIgdGhhdCB0aGUgSFRNTCBiZWluZyBwYXJzZWQgaXMgY29tcGxldGVcblx0UGFyc2VyLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gUGFyc2VyJGRvbmUgKCkge1xuXHRcdGlmICh0aGlzLl9kb25lKVxuXHRcdFx0cmV0dXJuO1xuXHRcdHRoaXMuX2RvbmUgPSB0cnVlO1xuXHRcblx0XHQvL1B1c2ggYW55IHVucGFyc2VkIHRleHQgaW50byBhIGZpbmFsIGVsZW1lbnQgaW4gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdGlmICh0aGlzLl9idWZmZXIubGVuZ3RoKSB7XG5cdFx0XHR2YXIgcmF3RGF0YSA9IHRoaXMuX2J1ZmZlcjtcblx0XHRcdHRoaXMuX2J1ZmZlciA9IFwiXCI7XG5cdFx0XHR2YXIgZWxlbWVudCA9IHtcblx0XHRcdFx0ICByYXc6IHJhd0RhdGFcblx0XHRcdFx0LCBkYXRhOiAodGhpcy5fcGFyc2VTdGF0ZSA9PSBFbGVtZW50VHlwZS5UZXh0KSA/IHJhd0RhdGEgOiByYXdEYXRhLnJlcGxhY2UoUGFyc2VyLl9yZVRyaW0sIFwiXCIpXG5cdFx0XHRcdCwgdHlwZTogdGhpcy5fcGFyc2VTdGF0ZVxuXHRcdFx0XHR9O1xuXHRcdFx0aWYgKHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuVGFnIHx8IHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuU2NyaXB0IHx8IHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuU3R5bGUpXG5cdFx0XHRcdGVsZW1lbnQubmFtZSA9IHRoaXMucGFyc2VUYWdOYW1lKGVsZW1lbnQuZGF0YSk7XG5cdFx0XHR0aGlzLnBhcnNlQXR0cmlicyhlbGVtZW50KTtcblx0XHRcdHRoaXMuX2VsZW1lbnRzLnB1c2goZWxlbWVudCk7XG5cdFx0fVxuXHRcblx0XHR0aGlzLndyaXRlSGFuZGxlcigpO1xuXHRcdHRoaXMuX2hhbmRsZXIuZG9uZSgpO1xuXHR9XG5cblx0Ly9SZXNldHMgdGhlIHBhcnNlciB0byBhIGJsYW5rIHN0YXRlLCByZWFkeSB0byBwYXJzZSBhIG5ldyBIVE1MIGRvY3VtZW50XG5cdFBhcnNlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiBQYXJzZXIkcmVzZXQgKCkge1xuXHRcdHRoaXMuX2J1ZmZlciA9IFwiXCI7XG5cdFx0dGhpcy5fZG9uZSA9IGZhbHNlO1xuXHRcdHRoaXMuX2VsZW1lbnRzID0gW107XG5cdFx0dGhpcy5fZWxlbWVudHNDdXJyZW50ID0gMDtcblx0XHR0aGlzLl9jdXJyZW50ID0gMDtcblx0XHR0aGlzLl9uZXh0ID0gMDtcblx0XHR0aGlzLl9sb2NhdGlvbiA9IHtcblx0XHRcdCAgcm93OiAwXG5cdFx0XHQsIGNvbDogMFxuXHRcdFx0LCBjaGFyT2Zmc2V0OiAwXG5cdFx0XHQsIGluQnVmZmVyOiAwXG5cdFx0fTtcblx0XHR0aGlzLl9wYXJzZVN0YXRlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHR0aGlzLl9wcmV2VGFnU2VwID0gJyc7XG5cdFx0dGhpcy5fdGFnU3RhY2sgPSBbXTtcblx0XHR0aGlzLl9oYW5kbGVyLnJlc2V0KCk7XG5cdH1cblx0XG5cdC8vKipQcml2YXRlKiovL1xuXHQvL1Byb3BlcnRpZXMvL1xuXHRQYXJzZXIucHJvdG90eXBlLl9vcHRpb25zID0gbnVsbDsgLy9QYXJzZXIgb3B0aW9ucyBmb3IgaG93IHRvIGJlaGF2ZVxuXHRQYXJzZXIucHJvdG90eXBlLl9oYW5kbGVyID0gbnVsbDsgLy9IYW5kbGVyIGZvciBwYXJzZWQgZWxlbWVudHNcblx0UGFyc2VyLnByb3RvdHlwZS5fYnVmZmVyID0gbnVsbDsgLy9CdWZmZXIgb2YgdW5wYXJzZWQgZGF0YVxuXHRQYXJzZXIucHJvdG90eXBlLl9kb25lID0gZmFsc2U7IC8vRmxhZyBpbmRpY2F0aW5nIHdoZXRoZXIgcGFyc2luZyBpcyBkb25lXG5cdFBhcnNlci5wcm90b3R5cGUuX2VsZW1lbnRzID0gIG51bGw7IC8vQXJyYXkgb2YgcGFyc2VkIGVsZW1lbnRzXG5cdFBhcnNlci5wcm90b3R5cGUuX2VsZW1lbnRzQ3VycmVudCA9IDA7IC8vUG9pbnRlciB0byBsYXN0IGVsZW1lbnQgaW4gX2VsZW1lbnRzIHRoYXQgaGFzIGJlZW4gcHJvY2Vzc2VkXG5cdFBhcnNlci5wcm90b3R5cGUuX2N1cnJlbnQgPSAwOyAvL1Bvc2l0aW9uIGluIGRhdGEgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHBhcnNlZFxuXHRQYXJzZXIucHJvdG90eXBlLl9uZXh0ID0gMDsgLy9Qb3NpdGlvbiBpbiBkYXRhIG9mIHRoZSBuZXh0IHRhZyBtYXJrZXIgKDw+KVxuXHRQYXJzZXIucHJvdG90eXBlLl9sb2NhdGlvbiA9IG51bGw7IC8vUG9zaXRpb24gdHJhY2tpbmcgZm9yIGVsZW1lbnRzIGluIGEgc3RyZWFtXG5cdFBhcnNlci5wcm90b3R5cGUuX3BhcnNlU3RhdGUgPSBFbGVtZW50VHlwZS5UZXh0OyAvL0N1cnJlbnQgdHlwZSBvZiBlbGVtZW50IGJlaW5nIHBhcnNlZFxuXHRQYXJzZXIucHJvdG90eXBlLl9wcmV2VGFnU2VwID0gJyc7IC8vUHJldmlvdXMgdGFnIG1hcmtlciBmb3VuZFxuXHQvL1N0YWNrIG9mIGVsZW1lbnQgdHlwZXMgcHJldmlvdXNseSBlbmNvdW50ZXJlZDsga2VlcHMgdHJhY2sgb2Ygd2hlblxuXHQvL3BhcnNpbmcgb2NjdXJzIGluc2lkZSBhIHNjcmlwdC9jb21tZW50L3N0eWxlIHRhZ1xuXHRQYXJzZXIucHJvdG90eXBlLl90YWdTdGFjayA9IG51bGw7XG5cblx0Ly9NZXRob2RzLy9cblx0Ly9UYWtlcyBhbiBhcnJheSBvZiBlbGVtZW50cyBhbmQgcGFyc2VzIGFueSBmb3VuZCBhdHRyaWJ1dGVzXG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VUYWdBdHRyaWJzID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlVGFnQXR0cmlicyAoZWxlbWVudHMpIHtcblx0XHR2YXIgaWR4RW5kID0gZWxlbWVudHMubGVuZ3RoO1xuXHRcdHZhciBpZHggPSAwO1xuXHRcblx0XHR3aGlsZSAoaWR4IDwgaWR4RW5kKSB7XG5cdFx0XHR2YXIgZWxlbWVudCA9IGVsZW1lbnRzW2lkeCsrXTtcblx0XHRcdGlmIChlbGVtZW50LnR5cGUgPT0gRWxlbWVudFR5cGUuVGFnIHx8IGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5TY3JpcHQgfHwgZWxlbWVudC50eXBlID09IEVsZW1lbnRUeXBlLnN0eWxlKVxuXHRcdFx0XHR0aGlzLnBhcnNlQXR0cmlicyhlbGVtZW50KTtcblx0XHR9XG5cdFxuXHRcdHJldHVybihlbGVtZW50cyk7XG5cdH1cblxuXHQvL1Rha2VzIGFuIGVsZW1lbnQgYW5kIGFkZHMgYW4gXCJhdHRyaWJzXCIgcHJvcGVydHkgZm9yIGFueSBlbGVtZW50IGF0dHJpYnV0ZXMgZm91bmQgXG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VBdHRyaWJzID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlQXR0cmlicyAoZWxlbWVudCkge1xuXHRcdC8vT25seSBwYXJzZSBhdHRyaWJ1dGVzIGZvciB0YWdzXG5cdFx0aWYgKGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5TY3JpcHQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlN0eWxlICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UYWcpXG5cdFx0XHRyZXR1cm47XG5cdFxuXHRcdHZhciB0YWdOYW1lID0gZWxlbWVudC5kYXRhLnNwbGl0KFBhcnNlci5fcmVXaGl0ZXNwYWNlLCAxKVswXTtcblx0XHR2YXIgYXR0cmliUmF3ID0gZWxlbWVudC5kYXRhLnN1YnN0cmluZyh0YWdOYW1lLmxlbmd0aCk7XG5cdFx0aWYgKGF0dHJpYlJhdy5sZW5ndGggPCAxKVxuXHRcdFx0cmV0dXJuO1xuXHRcblx0XHR2YXIgbWF0Y2g7XG5cdFx0UGFyc2VyLl9yZUF0dHJpYi5sYXN0SW5kZXggPSAwO1xuXHRcdHdoaWxlIChtYXRjaCA9IFBhcnNlci5fcmVBdHRyaWIuZXhlYyhhdHRyaWJSYXcpKSB7XG5cdFx0XHRpZiAoZWxlbWVudC5hdHRyaWJzID09IHVuZGVmaW5lZClcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzID0ge307XG5cdFxuXHRcdFx0aWYgKHR5cGVvZiBtYXRjaFsxXSA9PSBcInN0cmluZ1wiICYmIG1hdGNoWzFdLmxlbmd0aCkge1xuXHRcdFx0XHRlbGVtZW50LmF0dHJpYnNbbWF0Y2hbMV1dID0gbWF0Y2hbMl07XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBtYXRjaFszXSA9PSBcInN0cmluZ1wiICYmIG1hdGNoWzNdLmxlbmd0aCkge1xuXHRcdFx0XHRlbGVtZW50LmF0dHJpYnNbbWF0Y2hbM10udG9TdHJpbmcoKV0gPSBtYXRjaFs0XS50b1N0cmluZygpO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgbWF0Y2hbNV0gPT0gXCJzdHJpbmdcIiAmJiBtYXRjaFs1XS5sZW5ndGgpIHtcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzW21hdGNoWzVdXSA9IG1hdGNoWzZdO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgbWF0Y2hbN10gPT0gXCJzdHJpbmdcIiAmJiBtYXRjaFs3XS5sZW5ndGgpIHtcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzW21hdGNoWzddXSA9IG1hdGNoWzddO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vRXh0cmFjdHMgdGhlIGJhc2UgdGFnIG5hbWUgZnJvbSB0aGUgZGF0YSB2YWx1ZSBvZiBhbiBlbGVtZW50XG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VUYWdOYW1lID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlVGFnTmFtZSAoZGF0YSkge1xuXHRcdGlmIChkYXRhID09IG51bGwgfHwgZGF0YSA9PSBcIlwiKVxuXHRcdFx0cmV0dXJuKFwiXCIpO1xuXHRcdHZhciBtYXRjaCA9IFBhcnNlci5fcmVUYWdOYW1lLmV4ZWMoZGF0YSk7XG5cdFx0aWYgKCFtYXRjaClcblx0XHRcdHJldHVybihcIlwiKTtcblx0XHRyZXR1cm4oKG1hdGNoWzFdID8gXCIvXCIgOiBcIlwiKSArIG1hdGNoWzJdKTtcblx0fVxuXG5cdC8vUGFyc2VzIHRocm91Z2ggSFRNTCB0ZXh0IGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIGZvdW5kIGVsZW1lbnRzXG5cdC8vSSBhZG1pdCwgdGhpcyBmdW5jdGlvbiBpcyByYXRoZXIgbGFyZ2UgYnV0IHNwbGl0dGluZyB1cCBoYWQgYW4gbm90aWNlYWJsZSBpbXBhY3Qgb24gc3BlZWRcblx0UGFyc2VyLnByb3RvdHlwZS5wYXJzZVRhZ3MgPSBmdW5jdGlvbiBQYXJzZXIkcGFyc2VUYWdzICgpIHtcblx0XHR2YXIgYnVmZmVyRW5kID0gdGhpcy5fYnVmZmVyLmxlbmd0aCAtIDE7XG5cdFx0d2hpbGUgKFBhcnNlci5fcmVUYWdzLnRlc3QodGhpcy5fYnVmZmVyKSkge1xuXHRcdFx0dGhpcy5fbmV4dCA9IFBhcnNlci5fcmVUYWdzLmxhc3RJbmRleCAtIDE7XG5cdFx0XHR2YXIgdGFnU2VwID0gdGhpcy5fYnVmZmVyLmNoYXJBdCh0aGlzLl9uZXh0KTsgLy9UaGUgY3VycmVudGx5IGZvdW5kIHRhZyBtYXJrZXJcblx0XHRcdHZhciByYXdEYXRhID0gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9jdXJyZW50LCB0aGlzLl9uZXh0KTsgLy9UaGUgbmV4dCBjaHVuayBvZiBkYXRhIHRvIHBhcnNlXG5cdFxuXHRcdFx0Ly9BIG5ldyBlbGVtZW50IHRvIGV2ZW50dWFsbHkgYmUgYXBwZW5kZWQgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0dmFyIGVsZW1lbnQgPSB7XG5cdFx0XHRcdCAgcmF3OiByYXdEYXRhXG5cdFx0XHRcdCwgZGF0YTogKHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuVGV4dCkgPyByYXdEYXRhIDogcmF3RGF0YS5yZXBsYWNlKFBhcnNlci5fcmVUcmltLCBcIlwiKVxuXHRcdFx0XHQsIHR5cGU6IHRoaXMuX3BhcnNlU3RhdGVcblx0XHRcdH07XG5cdFxuXHRcdFx0dmFyIGVsZW1lbnROYW1lID0gdGhpcy5wYXJzZVRhZ05hbWUoZWxlbWVudC5kYXRhKTtcblx0XG5cdFx0XHQvL1RoaXMgc2VjdGlvbiBpbnNwZWN0cyB0aGUgY3VycmVudCB0YWcgc3RhY2sgYW5kIG1vZGlmaWVzIHRoZSBjdXJyZW50XG5cdFx0XHQvL2VsZW1lbnQgaWYgd2UncmUgYWN0dWFsbHkgcGFyc2luZyBhIHNwZWNpYWwgYXJlYSAoc2NyaXB0L2NvbW1lbnQvc3R5bGUgdGFnKVxuXHRcdFx0aWYgKHRoaXMuX3RhZ1N0YWNrLmxlbmd0aCkgeyAvL1dlJ3JlIHBhcnNpbmcgaW5zaWRlIGEgc2NyaXB0L2NvbW1lbnQvc3R5bGUgdGFnXG5cdFx0XHRcdGlmICh0aGlzLl90YWdTdGFja1t0aGlzLl90YWdTdGFjay5sZW5ndGggLSAxXSA9PSBFbGVtZW50VHlwZS5TY3JpcHQpIHsgLy9XZSdyZSBjdXJyZW50bHkgaW4gYSBzY3JpcHQgdGFnXG5cdFx0XHRcdFx0aWYgKGVsZW1lbnROYW1lLnRvTG93ZXJDYXNlKCkgPT0gXCIvc2NyaXB0XCIpIC8vQWN0dWFsbHksIHdlJ3JlIG5vIGxvbmdlciBpbiBhIHNjcmlwdCB0YWcsIHNvIHBvcCBpdCBvZmYgdGhlIHN0YWNrXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wb3AoKTtcblx0XHRcdFx0XHRlbHNlIHsgLy9Ob3QgYSBjbG9zaW5nIHNjcmlwdCB0YWdcblx0XHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdy5pbmRleE9mKFwiIS0tXCIpICE9IDApIHsgLy9NYWtlIHN1cmUgd2UncmUgbm90IGluIGEgY29tbWVudFxuXHRcdFx0XHRcdFx0XHQvL0FsbCBkYXRhIGZyb20gaGVyZSB0byBzY3JpcHQgY2xvc2UgaXMgbm93IGEgdGV4dCBlbGVtZW50XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0XHRcdFx0XHRcdC8vSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaXMgdGV4dCwgYXBwZW5kIHRoZSBjdXJyZW50IHRleHQgdG8gaXRcblx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IEVsZW1lbnRUeXBlLlRleHQpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgcHJldkVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXTtcblx0XHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gcHJldkVsZW1lbnQucmF3ICsgdGhpcy5fcHJldlRhZ1NlcCArIGVsZW1lbnQucmF3O1xuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gXCJcIjsgLy9UaGlzIGNhdXNlcyB0aGUgY3VycmVudCBlbGVtZW50IHRvIG5vdCBiZSBhZGRlZCB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAodGhpcy5fdGFnU3RhY2tbdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMV0gPT0gRWxlbWVudFR5cGUuU3R5bGUpIHsgLy9XZSdyZSBjdXJyZW50bHkgaW4gYSBzdHlsZSB0YWdcblx0XHRcdFx0XHRpZiAoZWxlbWVudE5hbWUudG9Mb3dlckNhc2UoKSA9PSBcIi9zdHlsZVwiKSAvL0FjdHVhbGx5LCB3ZSdyZSBubyBsb25nZXIgaW4gYSBzdHlsZSB0YWcsIHNvIHBvcCBpdCBvZmYgdGhlIHN0YWNrXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wb3AoKTtcblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdy5pbmRleE9mKFwiIS0tXCIpICE9IDApIHsgLy9NYWtlIHN1cmUgd2UncmUgbm90IGluIGEgY29tbWVudFxuXHRcdFx0XHRcdFx0XHQvL0FsbCBkYXRhIGZyb20gaGVyZSB0byBzdHlsZSBjbG9zZSBpcyBub3cgYSB0ZXh0IGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdFx0XHRcdFx0Ly9JZiB0aGUgcHJldmlvdXMgZWxlbWVudCBpcyB0ZXh0LCBhcHBlbmQgdGhlIGN1cnJlbnQgdGV4dCB0byBpdFxuXHRcdFx0XHRcdFx0XHRpZiAodGhpcy5fZWxlbWVudHMubGVuZ3RoICYmIHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdLnR5cGUgPT0gRWxlbWVudFR5cGUuVGV4dCkge1xuXHRcdFx0XHRcdFx0XHRcdHZhciBwcmV2RWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdyAhPSBcIlwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gcHJldkVsZW1lbnQucmF3ICsgdGhpcy5fcHJldlRhZ1NlcCArIGVsZW1lbnQucmF3O1xuXHRcdFx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBcIlwiOyAvL1RoaXMgY2F1c2VzIHRoZSBjdXJyZW50IGVsZW1lbnQgdG8gbm90IGJlIGFkZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgeyAvL0VsZW1lbnQgaXMgZW1wdHksIHNvIGp1c3QgYXBwZW5kIHRoZSBsYXN0IHRhZyBtYXJrZXIgZm91bmRcblx0XHRcdFx0XHRcdFx0XHRcdHByZXZFbGVtZW50LnJhdyA9IHByZXZFbGVtZW50LmRhdGEgPSBwcmV2RWxlbWVudC5yYXcgKyB0aGlzLl9wcmV2VGFnU2VwO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHsgLy9UaGUgcHJldmlvdXMgZWxlbWVudCB3YXMgbm90IHRleHRcblx0XHRcdFx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcgIT0gXCJcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBlbGVtZW50LnJhdztcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAodGhpcy5fdGFnU3RhY2tbdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMV0gPT0gRWxlbWVudFR5cGUuQ29tbWVudCkgeyAvL1dlJ3JlIGN1cnJlbnRseSBpbiBhIGNvbW1lbnQgdGFnXG5cdFx0XHRcdFx0dmFyIHJhd0xlbiA9IGVsZW1lbnQucmF3Lmxlbmd0aDtcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuY2hhckF0KHJhd0xlbiAtIDIpID09IFwiLVwiICYmIGVsZW1lbnQucmF3LmNoYXJBdChyYXdMZW4gLSAxKSA9PSBcIi1cIiAmJiB0YWdTZXAgPT0gXCI+XCIpIHtcblx0XHRcdFx0XHRcdC8vQWN0dWFsbHksIHdlJ3JlIG5vIGxvbmdlciBpbiBhIHN0eWxlIHRhZywgc28gcG9wIGl0IG9mZiB0aGUgc3RhY2tcblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnBvcCgpO1xuXHRcdFx0XHRcdFx0Ly9JZiB0aGUgcHJldmlvdXMgZWxlbWVudCBpcyBhIGNvbW1lbnQsIGFwcGVuZCB0aGUgY3VycmVudCB0ZXh0IHRvIGl0XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5fZWxlbWVudHMubGVuZ3RoICYmIHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdLnR5cGUgPT0gRWxlbWVudFR5cGUuQ29tbWVudCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgcHJldkVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXTtcblx0XHRcdFx0XHRcdFx0cHJldkVsZW1lbnQucmF3ID0gcHJldkVsZW1lbnQuZGF0YSA9IChwcmV2RWxlbWVudC5yYXcgKyBlbGVtZW50LnJhdykucmVwbGFjZShQYXJzZXIuX3JlVHJpbUNvbW1lbnQsIFwiXCIpO1xuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IFwiXCI7IC8vVGhpcyBjYXVzZXMgdGhlIGN1cnJlbnQgZWxlbWVudCB0byBub3QgYmUgYWRkZWQgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSAvL1ByZXZpb3VzIGVsZW1lbnQgbm90IGEgY29tbWVudFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5Db21tZW50OyAvL0NoYW5nZSB0aGUgY3VycmVudCBlbGVtZW50J3MgdHlwZSB0byBhIGNvbW1lbnRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7IC8vU3RpbGwgaW4gYSBjb21tZW50IHRhZ1xuXHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuQ29tbWVudDtcblx0XHRcdFx0XHRcdC8vSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaXMgYSBjb21tZW50LCBhcHBlbmQgdGhlIGN1cnJlbnQgdGV4dCB0byBpdFxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IEVsZW1lbnRUeXBlLkNvbW1lbnQpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHByZXZFbGVtZW50ID0gdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0XHRcdHByZXZFbGVtZW50LnJhdyA9IHByZXZFbGVtZW50LmRhdGEgPSBwcmV2RWxlbWVudC5yYXcgKyBlbGVtZW50LnJhdyArIHRhZ1NlcDtcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBcIlwiOyAvL1RoaXMgY2F1c2VzIHRoZSBjdXJyZW50IGVsZW1lbnQgdG8gbm90IGJlIGFkZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBlbGVtZW50LnJhdyArIHRhZ1NlcDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XG5cdFx0XHQvL1Byb2Nlc3Npbmcgb2Ygbm9uLXNwZWNpYWwgdGFnc1xuXHRcdFx0aWYgKGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5UYWcpIHtcblx0XHRcdFx0ZWxlbWVudC5uYW1lID0gZWxlbWVudE5hbWU7XG5cdFx0XHRcdHZhciBlbGVtZW50TmFtZUNJID0gZWxlbWVudE5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChlbGVtZW50LnJhdy5pbmRleE9mKFwiIS0tXCIpID09IDApIHsgLy9UaGlzIHRhZyBpcyByZWFsbHkgY29tbWVudFxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLkNvbW1lbnQ7XG5cdFx0XHRcdFx0ZGVsZXRlIGVsZW1lbnRbXCJuYW1lXCJdO1xuXHRcdFx0XHRcdHZhciByYXdMZW4gPSBlbGVtZW50LnJhdy5sZW5ndGg7XG5cdFx0XHRcdFx0Ly9DaGVjayBpZiB0aGUgY29tbWVudCBpcyB0ZXJtaW5hdGVkIGluIHRoZSBjdXJyZW50IGVsZW1lbnRcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuY2hhckF0KHJhd0xlbiAtIDEpID09IFwiLVwiICYmIGVsZW1lbnQucmF3LmNoYXJBdChyYXdMZW4gLSAyKSA9PSBcIi1cIiAmJiB0YWdTZXAgPT0gXCI+XCIpXG5cdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IGVsZW1lbnQucmF3LnJlcGxhY2UoUGFyc2VyLl9yZVRyaW1Db21tZW50LCBcIlwiKTtcblx0XHRcdFx0XHRlbHNlIHsgLy9JdCdzIG5vdCBzbyBwdXNoIHRoZSBjb21tZW50IG9udG8gdGhlIHRhZyBzdGFja1xuXHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgKz0gdGFnU2VwO1xuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChFbGVtZW50VHlwZS5Db21tZW50KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudC5yYXcuaW5kZXhPZihcIiFcIikgPT0gMCB8fCBlbGVtZW50LnJhdy5pbmRleE9mKFwiP1wiKSA9PSAwKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuRGlyZWN0aXZlO1xuXHRcdFx0XHRcdC8vVE9ETzogd2hhdCBhYm91dCBDREFUQT9cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChlbGVtZW50TmFtZUNJID09IFwic2NyaXB0XCIpIHtcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5TY3JpcHQ7XG5cdFx0XHRcdFx0Ly9TcGVjaWFsIHRhZywgcHVzaCBvbnRvIHRoZSB0YWcgc3RhY2sgaWYgbm90IHRlcm1pbmF0ZWRcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5kYXRhLmNoYXJBdChlbGVtZW50LmRhdGEubGVuZ3RoIC0gMSkgIT0gXCIvXCIpXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKEVsZW1lbnRUeXBlLlNjcmlwdCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudE5hbWVDSSA9PSBcIi9zY3JpcHRcIilcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5TY3JpcHQ7XG5cdFx0XHRcdGVsc2UgaWYgKGVsZW1lbnROYW1lQ0kgPT0gXCJzdHlsZVwiKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuU3R5bGU7XG5cdFx0XHRcdFx0Ly9TcGVjaWFsIHRhZywgcHVzaCBvbnRvIHRoZSB0YWcgc3RhY2sgaWYgbm90IHRlcm1pbmF0ZWRcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5kYXRhLmNoYXJBdChlbGVtZW50LmRhdGEubGVuZ3RoIC0gMSkgIT0gXCIvXCIpXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKEVsZW1lbnRUeXBlLlN0eWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChlbGVtZW50TmFtZUNJID09IFwiL3N0eWxlXCIpXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuU3R5bGU7XG5cdFx0XHRcdGlmIChlbGVtZW50Lm5hbWUgJiYgZWxlbWVudC5uYW1lLmNoYXJBdCgwKSA9PSBcIi9cIilcblx0XHRcdFx0XHRlbGVtZW50LmRhdGEgPSBlbGVtZW50Lm5hbWU7XG5cdFx0XHR9XG5cdFxuXHRcdFx0Ly9BZGQgYWxsIHRhZ3MgYW5kIG5vbi1lbXB0eSB0ZXh0IGVsZW1lbnRzIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdGlmIChlbGVtZW50LnJhdyAhPSBcIlwiIHx8IGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UZXh0KSB7XG5cdFx0XHRcdGlmICh0aGlzLl9vcHRpb25zLmluY2x1ZGVMb2NhdGlvbiAmJiAhZWxlbWVudC5sb2NhdGlvbikge1xuXHRcdFx0XHRcdGVsZW1lbnQubG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5UYWcpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMucGFyc2VBdHRyaWJzKGVsZW1lbnQpO1xuXHRcdFx0XHR0aGlzLl9lbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0XHQvL0lmIHRhZyBzZWxmLXRlcm1pbmF0ZXMsIGFkZCBhbiBleHBsaWNpdCwgc2VwYXJhdGUgY2xvc2luZyB0YWdcblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UZXh0XG5cdFx0XHRcdFx0JiZcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuQ29tbWVudFxuXHRcdFx0XHRcdCYmXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkRpcmVjdGl2ZVxuXHRcdFx0XHRcdCYmXG5cdFx0XHRcdFx0ZWxlbWVudC5kYXRhLmNoYXJBdChlbGVtZW50LmRhdGEubGVuZ3RoIC0gMSkgPT0gXCIvXCJcblx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0dGhpcy5fZWxlbWVudHMucHVzaCh7XG5cdFx0XHRcdFx0XHQgIHJhdzogXCIvXCIgKyBlbGVtZW50Lm5hbWVcblx0XHRcdFx0XHRcdCwgZGF0YTogXCIvXCIgKyBlbGVtZW50Lm5hbWVcblx0XHRcdFx0XHRcdCwgbmFtZTogXCIvXCIgKyBlbGVtZW50Lm5hbWVcblx0XHRcdFx0XHRcdCwgdHlwZTogZWxlbWVudC50eXBlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9wYXJzZVN0YXRlID0gKHRhZ1NlcCA9PSBcIjxcIikgPyBFbGVtZW50VHlwZS5UYWcgOiBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdFx0dGhpcy5fY3VycmVudCA9IHRoaXMuX25leHQgKyAxO1xuXHRcdFx0dGhpcy5fcHJldlRhZ1NlcCA9IHRhZ1NlcDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24pIHtcblx0XHRcdHRoaXMuZ2V0TG9jYXRpb24oKTtcblx0XHRcdHRoaXMuX2xvY2F0aW9uLnJvdyArPSB0aGlzLl9sb2NhdGlvbi5pbkJ1ZmZlcjtcblx0XHRcdHRoaXMuX2xvY2F0aW9uLmluQnVmZmVyID0gMDtcblx0XHRcdHRoaXMuX2xvY2F0aW9uLmNoYXJPZmZzZXQgPSAwO1xuXHRcdH1cblx0XHR0aGlzLl9idWZmZXIgPSAodGhpcy5fY3VycmVudCA8PSBidWZmZXJFbmQpID8gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9jdXJyZW50KSA6IFwiXCI7XG5cdFx0dGhpcy5fY3VycmVudCA9IDA7XG5cdFxuXHRcdHRoaXMud3JpdGVIYW5kbGVyKCk7XG5cdH1cblxuXHRQYXJzZXIucHJvdG90eXBlLmdldExvY2F0aW9uID0gZnVuY3Rpb24gUGFyc2VyJGdldExvY2F0aW9uIChzdGFydFRhZykge1xuXHRcdHZhciBjLFxuXHRcdFx0bCA9IHRoaXMuX2xvY2F0aW9uLFxuXHRcdFx0ZW5kID0gdGhpcy5fY3VycmVudCAtIChzdGFydFRhZyA/IDEgOiAwKSxcblx0XHRcdGNodW5rID0gc3RhcnRUYWcgJiYgbC5jaGFyT2Zmc2V0ID09IDAgJiYgdGhpcy5fY3VycmVudCA9PSAwO1xuXHRcdFxuXHRcdGZvciAoOyBsLmNoYXJPZmZzZXQgPCBlbmQ7IGwuY2hhck9mZnNldCsrKSB7XG5cdFx0XHRjID0gdGhpcy5fYnVmZmVyLmNoYXJBdChsLmNoYXJPZmZzZXQpO1xuXHRcdFx0aWYgKGMgPT0gJ1xcbicpIHtcblx0XHRcdFx0bC5pbkJ1ZmZlcisrO1xuXHRcdFx0XHRsLmNvbCA9IDA7XG5cdFx0XHR9IGVsc2UgaWYgKGMgIT0gJ1xccicpIHtcblx0XHRcdFx0bC5jb2wrKztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHtcblx0XHRcdCAgbGluZTogbC5yb3cgKyBsLmluQnVmZmVyICsgMVxuXHRcdFx0LCBjb2w6IGwuY29sICsgKGNodW5rID8gMDogMSlcblx0XHR9O1xuXHR9XG5cblx0Ly9DaGVja3MgdGhlIGhhbmRsZXIgdG8gbWFrZSBpdCBpcyBhbiBvYmplY3Qgd2l0aCB0aGUgcmlnaHQgXCJpbnRlcmZhY2VcIlxuXHRQYXJzZXIucHJvdG90eXBlLnZhbGlkYXRlSGFuZGxlciA9IGZ1bmN0aW9uIFBhcnNlciR2YWxpZGF0ZUhhbmRsZXIgKGhhbmRsZXIpIHtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyKSAhPSBcIm9iamVjdFwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBpcyBub3QgYW4gb2JqZWN0XCIpO1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIucmVzZXQpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICdyZXNldCcgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLmRvbmUpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICdkb25lJyBpcyBpbnZhbGlkXCIpO1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIud3JpdGVUYWcpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICd3cml0ZVRhZycgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlVGV4dCkgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ3dyaXRlVGV4dCcgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlQ29tbWVudCkgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ3dyaXRlQ29tbWVudCcgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlRGlyZWN0aXZlKSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAnd3JpdGVEaXJlY3RpdmUnIGlzIGludmFsaWRcIik7XG5cdH1cblxuXHQvL1dyaXRlcyBwYXJzZWQgZWxlbWVudHMgb3V0IHRvIHRoZSBoYW5kbGVyXG5cdFBhcnNlci5wcm90b3R5cGUud3JpdGVIYW5kbGVyID0gZnVuY3Rpb24gUGFyc2VyJHdyaXRlSGFuZGxlciAoZm9yY2VGbHVzaCkge1xuXHRcdGZvcmNlRmx1c2ggPSAhIWZvcmNlRmx1c2g7XG5cdFx0aWYgKHRoaXMuX3RhZ1N0YWNrLmxlbmd0aCAmJiAhZm9yY2VGbHVzaClcblx0XHRcdHJldHVybjtcblx0XHR3aGlsZSAodGhpcy5fZWxlbWVudHMubGVuZ3RoKSB7XG5cdFx0XHR2YXIgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzLnNoaWZ0KCk7XG5cdFx0XHRzd2l0Y2ggKGVsZW1lbnQudHlwZSkge1xuXHRcdFx0XHRjYXNlIEVsZW1lbnRUeXBlLkNvbW1lbnQ6XG5cdFx0XHRcdFx0dGhpcy5faGFuZGxlci53cml0ZUNvbW1lbnQoZWxlbWVudCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgRWxlbWVudFR5cGUuRGlyZWN0aXZlOlxuXHRcdFx0XHRcdHRoaXMuX2hhbmRsZXIud3JpdGVEaXJlY3RpdmUoZWxlbWVudCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgRWxlbWVudFR5cGUuVGV4dDpcblx0XHRcdFx0XHR0aGlzLl9oYW5kbGVyLndyaXRlVGV4dChlbGVtZW50KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHR0aGlzLl9oYW5kbGVyLndyaXRlVGFnKGVsZW1lbnQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdFBhcnNlci5wcm90b3R5cGUuaGFuZGxlRXJyb3IgPSBmdW5jdGlvbiBQYXJzZXIkaGFuZGxlRXJyb3IgKGVycm9yKSB7XG5cdFx0aWYgKCh0eXBlb2YgdGhpcy5faGFuZGxlci5lcnJvcikgPT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhpcy5faGFuZGxlci5lcnJvcihlcnJvcik7XG5cdFx0ZWxzZVxuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdH1cblxuLy9UT0RPOiBtYWtlIHRoaXMgYSB0cnVsbHkgc3RyZWFtYWJsZSBoYW5kbGVyXG5mdW5jdGlvbiBSc3NIYW5kbGVyIChjYWxsYmFjaykge1xuXHRSc3NIYW5kbGVyLnN1cGVyXy5jYWxsKHRoaXMsIGNhbGxiYWNrLCB7IGlnbm9yZVdoaXRlc3BhY2U6IHRydWUsIHZlcmJvc2U6IGZhbHNlLCBlbmZvcmNlRW1wdHlUYWdzOiBmYWxzZSB9KTtcbn1cbmluaGVyaXRzKFJzc0hhbmRsZXIsIERlZmF1bHRIYW5kbGVyKTtcblxuXHRSc3NIYW5kbGVyLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gUnNzSGFuZGxlciRkb25lICgpIHtcblx0XHR2YXIgZmVlZCA9IHsgfTtcblx0XHR2YXIgZmVlZFJvb3Q7XG5cblx0XHR2YXIgZm91bmQgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShmdW5jdGlvbiAodmFsdWUpIHsgcmV0dXJuKHZhbHVlID09IFwicnNzXCIgfHwgdmFsdWUgPT0gXCJmZWVkXCIpOyB9LCB0aGlzLmRvbSwgZmFsc2UpO1xuXHRcdGlmIChmb3VuZC5sZW5ndGgpIHtcblx0XHRcdGZlZWRSb290ID0gZm91bmRbMF07XG5cdFx0fVxuXHRcdGlmIChmZWVkUm9vdCkge1xuXHRcdFx0aWYgKGZlZWRSb290Lm5hbWUgPT0gXCJyc3NcIikge1xuXHRcdFx0XHRmZWVkLnR5cGUgPSBcInJzc1wiO1xuXHRcdFx0XHRmZWVkUm9vdCA9IGZlZWRSb290LmNoaWxkcmVuWzBdOyAvLzxjaGFubmVsLz5cblx0XHRcdFx0ZmVlZC5pZCA9IFwiXCI7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQuZGVzY3JpcHRpb24gPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImRlc2NyaXB0aW9uXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQudXBkYXRlZCA9IG5ldyBEYXRlKERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGFzdEJ1aWxkRGF0ZVwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGEpO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5hdXRob3IgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcIm1hbmFnaW5nRWRpdG9yXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRmZWVkLml0ZW1zID0gW107XG5cdFx0XHRcdERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaXRlbVwiLCBmZWVkUm9vdC5jaGlsZHJlbikuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdFx0XHR2YXIgZW50cnkgPSB7fTtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkuaWQgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImd1aWRcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkuZGVzY3JpcHRpb24gPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImRlc2NyaXB0aW9uXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkucHViRGF0ZSA9IG5ldyBEYXRlKERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicHViRGF0ZVwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdGZlZWQuaXRlbXMucHVzaChlbnRyeSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZmVlZC50eXBlID0gXCJhdG9tXCI7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5pZCA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaWRcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uYXR0cmlicy5ocmVmO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5kZXNjcmlwdGlvbiA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3VidGl0bGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC51cGRhdGVkID0gbmV3IERhdGUoRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ1cGRhdGVkXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLmF1dGhvciA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZW1haWxcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIHRydWUpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0ZmVlZC5pdGVtcyA9IFtdO1xuXHRcdFx0XHREb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImVudHJ5XCIsIGZlZWRSb290LmNoaWxkcmVuKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0XHRcdHZhciBlbnRyeSA9IHt9O1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5pZCA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaWRcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5hdHRyaWJzLmhyZWY7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5kZXNjcmlwdGlvbiA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3VtbWFyeVwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LnB1YkRhdGUgPSBuZXcgRGF0ZShEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInVwZGF0ZWRcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGEpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHRmZWVkLml0ZW1zLnB1c2goZW50cnkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5kb20gPSBmZWVkO1xuXHRcdH1cblx0XHRSc3NIYW5kbGVyLnN1cGVyXy5wcm90b3R5cGUuZG9uZS5jYWxsKHRoaXMpO1xuXHR9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBEZWZhdWx0SGFuZGxlciAoY2FsbGJhY2ssIG9wdGlvbnMpIHtcblx0dGhpcy5yZXNldCgpO1xuXHR0aGlzLl9vcHRpb25zID0gb3B0aW9ucyA/IG9wdGlvbnMgOiB7IH07XG5cdGlmICh0aGlzLl9vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UgPT0gdW5kZWZpbmVkKVxuXHRcdHRoaXMuX29wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSA9IGZhbHNlOyAvL0tlZXAgd2hpdGVzcGFjZS1vbmx5IHRleHQgbm9kZXNcblx0aWYgKHRoaXMuX29wdGlvbnMudmVyYm9zZSA9PSB1bmRlZmluZWQpXG5cdFx0dGhpcy5fb3B0aW9ucy52ZXJib3NlID0gdHJ1ZTsgLy9LZWVwIGRhdGEgcHJvcGVydHkgZm9yIHRhZ3MgYW5kIHJhdyBwcm9wZXJ0eSBmb3IgYWxsXG5cdGlmICh0aGlzLl9vcHRpb25zLmVuZm9yY2VFbXB0eVRhZ3MgPT0gdW5kZWZpbmVkKVxuXHRcdHRoaXMuX29wdGlvbnMuZW5mb3JjZUVtcHR5VGFncyA9IHRydWU7IC8vRG9uJ3QgYWxsb3cgY2hpbGRyZW4gZm9yIEhUTUwgdGFncyBkZWZpbmVkIGFzIGVtcHR5IGluIHNwZWNcblx0aWYgKCh0eXBlb2YgY2FsbGJhY2spID09IFwiZnVuY3Rpb25cIilcblx0XHR0aGlzLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xufVxuXG5cdC8vKipcIlN0YXRpY1wiKiovL1xuXHQvL0hUTUwgVGFncyB0aGF0IHNob3VsZG4ndCBjb250YWluIGNoaWxkIG5vZGVzXG5cdERlZmF1bHRIYW5kbGVyLl9lbXB0eVRhZ3MgPSB7XG5cdFx0ICBhcmVhOiAxXG5cdFx0LCBiYXNlOiAxXG5cdFx0LCBiYXNlZm9udDogMVxuXHRcdCwgYnI6IDFcblx0XHQsIGNvbDogMVxuXHRcdCwgZnJhbWU6IDFcblx0XHQsIGhyOiAxXG5cdFx0LCBpbWc6IDFcblx0XHQsIGlucHV0OiAxXG5cdFx0LCBpc2luZGV4OiAxXG5cdFx0LCBsaW5rOiAxXG5cdFx0LCBtZXRhOiAxXG5cdFx0LCBwYXJhbTogMVxuXHRcdCwgZW1iZWQ6IDFcblx0fVxuXHQvL1JlZ2V4IHRvIGRldGVjdCB3aGl0ZXNwYWNlIG9ubHkgdGV4dCBub2Rlc1xuXHREZWZhdWx0SGFuZGxlci5yZVdoaXRlc3BhY2UgPSAvXlxccyokLztcblxuXHQvLyoqUHVibGljKiovL1xuXHQvL1Byb3BlcnRpZXMvL1xuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuZG9tID0gbnVsbDsgLy9UaGUgaGllcmFyY2hpY2FsIG9iamVjdCBjb250YWluaW5nIHRoZSBwYXJzZWQgSFRNTFxuXHQvL01ldGhvZHMvL1xuXHQvL1Jlc2V0cyB0aGUgaGFuZGxlciBiYWNrIHRvIHN0YXJ0aW5nIHN0YXRlXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHJlc2V0KCkge1xuXHRcdHRoaXMuZG9tID0gW107XG5cdFx0dGhpcy5fZG9uZSA9IGZhbHNlO1xuXHRcdHRoaXMuX3RhZ1N0YWNrID0gW107XG5cdFx0dGhpcy5fdGFnU3RhY2subGFzdCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJF90YWdTdGFjayRsYXN0ICgpIHtcblx0XHRcdHJldHVybih0aGlzLmxlbmd0aCA/IHRoaXNbdGhpcy5sZW5ndGggLSAxXSA6IG51bGwpO1xuXHRcdH1cblx0fVxuXHQvL1NpZ25hbHMgdGhlIGhhbmRsZXIgdGhhdCBwYXJzaW5nIGlzIGRvbmVcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRkb25lICgpIHtcblx0XHR0aGlzLl9kb25lID0gdHJ1ZTtcblx0XHR0aGlzLmhhbmRsZUNhbGxiYWNrKG51bGwpO1xuXHR9XG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS53cml0ZVRhZyA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHdyaXRlVGFnIChlbGVtZW50KSB7XG5cdFx0dGhpcy5oYW5kbGVFbGVtZW50KGVsZW1lbnQpO1xuXHR9IFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVUZXh0ID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkd3JpdGVUZXh0IChlbGVtZW50KSB7XG5cdFx0aWYgKHRoaXMuX29wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSlcblx0XHRcdGlmIChEZWZhdWx0SGFuZGxlci5yZVdoaXRlc3BhY2UudGVzdChlbGVtZW50LmRhdGEpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0dGhpcy5oYW5kbGVFbGVtZW50KGVsZW1lbnQpO1xuXHR9IFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVDb21tZW50ID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkd3JpdGVDb21tZW50IChlbGVtZW50KSB7XG5cdFx0dGhpcy5oYW5kbGVFbGVtZW50KGVsZW1lbnQpO1xuXHR9IFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVEaXJlY3RpdmUgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciR3cml0ZURpcmVjdGl2ZSAoZWxlbWVudCkge1xuXHRcdHRoaXMuaGFuZGxlRWxlbWVudChlbGVtZW50KTtcblx0fVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRlcnJvciAoZXJyb3IpIHtcblx0XHR0aGlzLmhhbmRsZUNhbGxiYWNrKGVycm9yKTtcblx0fVxuXG5cdC8vKipQcml2YXRlKiovL1xuXHQvL1Byb3BlcnRpZXMvL1xuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuX29wdGlvbnMgPSBudWxsOyAvL0hhbmRsZXIgb3B0aW9ucyBmb3IgaG93IHRvIGJlaGF2ZVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuX2NhbGxiYWNrID0gbnVsbDsgLy9DYWxsYmFjayB0byByZXNwb25kIHRvIHdoZW4gcGFyc2luZyBkb25lXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5fZG9uZSA9IGZhbHNlOyAvL0ZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIGhhbmRsZXIgaGFzIGJlZW4gbm90aWZpZWQgb2YgcGFyc2luZyBjb21wbGV0ZWRcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLl90YWdTdGFjayA9IG51bGw7IC8vTGlzdCBvZiBwYXJlbnRzIHRvIHRoZSBjdXJyZW50bHkgZWxlbWVudCBiZWluZyBwcm9jZXNzZWRcblx0Ly9NZXRob2RzLy9cblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmhhbmRsZUNhbGxiYWNrID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkaGFuZGxlQ2FsbGJhY2sgKGVycm9yKSB7XG5cdFx0XHRpZiAoKHR5cGVvZiB0aGlzLl9jYWxsYmFjaykgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRpZiAoZXJyb3IpXG5cdFx0XHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHR0aGlzLl9jYWxsYmFjayhlcnJvciwgdGhpcy5kb20pO1xuXHR9XG5cdFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuaXNFbXB0eVRhZyA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcblx0XHR2YXIgbmFtZSA9IGVsZW1lbnQubmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmIChuYW1lLmNoYXJBdCgwKSA9PSAnLycpIHtcblx0XHRcdG5hbWUgPSBuYW1lLnN1YnN0cmluZygxKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX29wdGlvbnMuZW5mb3JjZUVtcHR5VGFncyAmJiAhIURlZmF1bHRIYW5kbGVyLl9lbXB0eVRhZ3NbbmFtZV07XG5cdH07XG5cdFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuaGFuZGxlRWxlbWVudCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJGhhbmRsZUVsZW1lbnQgKGVsZW1lbnQpIHtcblx0XHRpZiAodGhpcy5fZG9uZSlcblx0XHRcdHRoaXMuaGFuZGxlQ2FsbGJhY2sobmV3IEVycm9yKFwiV3JpdGluZyB0byB0aGUgaGFuZGxlciBhZnRlciBkb25lKCkgY2FsbGVkIGlzIG5vdCBhbGxvd2VkIHdpdGhvdXQgYSByZXNldCgpXCIpKTtcblx0XHRpZiAoIXRoaXMuX29wdGlvbnMudmVyYm9zZSkge1xuLy9cdFx0XHRlbGVtZW50LnJhdyA9IG51bGw7IC8vRklYTUU6IE5vdCBjbGVhblxuXHRcdFx0Ly9GSVhNRTogU2VyaW91cyBwZXJmb3JtYW5jZSBwcm9ibGVtIHVzaW5nIGRlbGV0ZVxuXHRcdFx0ZGVsZXRlIGVsZW1lbnQucmF3O1xuXHRcdFx0aWYgKGVsZW1lbnQudHlwZSA9PSBcInRhZ1wiIHx8IGVsZW1lbnQudHlwZSA9PSBcInNjcmlwdFwiIHx8IGVsZW1lbnQudHlwZSA9PSBcInN0eWxlXCIpXG5cdFx0XHRcdGRlbGV0ZSBlbGVtZW50LmRhdGE7XG5cdFx0fVxuXHRcdGlmICghdGhpcy5fdGFnU3RhY2subGFzdCgpKSB7IC8vVGhlcmUgYXJlIG5vIHBhcmVudCBlbGVtZW50c1xuXHRcdFx0Ly9JZiB0aGUgZWxlbWVudCBjYW4gYmUgYSBjb250YWluZXIsIGFkZCBpdCB0byB0aGUgdGFnIHN0YWNrIGFuZCB0aGUgdG9wIGxldmVsIGxpc3Rcblx0XHRcdGlmIChlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuVGV4dCAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuQ29tbWVudCAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuRGlyZWN0aXZlKSB7XG5cdFx0XHRcdGlmIChlbGVtZW50Lm5hbWUuY2hhckF0KDApICE9IFwiL1wiKSB7IC8vSWdub3JlIGNsb3NpbmcgdGFncyB0aGF0IG9idmlvdXNseSBkb24ndCBoYXZlIGFuIG9wZW5pbmcgdGFnXG5cdFx0XHRcdFx0dGhpcy5kb20ucHVzaChlbGVtZW50KTtcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNFbXB0eVRhZyhlbGVtZW50KSkgeyAvL0Rvbid0IGFkZCB0YWdzIHRvIHRoZSB0YWcgc3RhY2sgdGhhdCBjYW4ndCBoYXZlIGNoaWxkcmVuXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSAvL090aGVyd2lzZSBqdXN0IGFkZCB0byB0aGUgdG9wIGxldmVsIGxpc3Rcblx0XHRcdFx0dGhpcy5kb20ucHVzaChlbGVtZW50KTtcblx0XHR9XG5cdFx0ZWxzZSB7IC8vVGhlcmUgYXJlIHBhcmVudCBlbGVtZW50c1xuXHRcdFx0Ly9JZiB0aGUgZWxlbWVudCBjYW4gYmUgYSBjb250YWluZXIsIGFkZCBpdCBhcyBhIGNoaWxkIG9mIHRoZSBlbGVtZW50XG5cdFx0XHQvL29uIHRvcCBvZiB0aGUgdGFnIHN0YWNrIGFuZCB0aGVuIGFkZCBpdCB0byB0aGUgdGFnIHN0YWNrXG5cdFx0XHRpZiAoZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlRleHQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkNvbW1lbnQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkRpcmVjdGl2ZSkge1xuXHRcdFx0XHRpZiAoZWxlbWVudC5uYW1lLmNoYXJBdCgwKSA9PSBcIi9cIikge1xuXHRcdFx0XHRcdC8vVGhpcyBpcyBhIGNsb3NpbmcgdGFnLCBzY2FuIHRoZSB0YWdTdGFjayB0byBmaW5kIHRoZSBtYXRjaGluZyBvcGVuaW5nIHRhZ1xuXHRcdFx0XHRcdC8vYW5kIHBvcCB0aGUgc3RhY2sgdXAgdG8gdGhlIG9wZW5pbmcgdGFnJ3MgcGFyZW50XG5cdFx0XHRcdFx0dmFyIGJhc2VOYW1lID0gZWxlbWVudC5uYW1lLnN1YnN0cmluZygxKTtcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNFbXB0eVRhZyhlbGVtZW50KSkge1xuXHRcdFx0XHRcdFx0dmFyIHBvcyA9IHRoaXMuX3RhZ1N0YWNrLmxlbmd0aCAtIDE7XG5cdFx0XHRcdFx0XHR3aGlsZSAocG9zID4gLTEgJiYgdGhpcy5fdGFnU3RhY2tbcG9zLS1dLm5hbWUgIT0gYmFzZU5hbWUpIHsgfVxuXHRcdFx0XHRcdFx0aWYgKHBvcyA+IC0xIHx8IHRoaXMuX3RhZ1N0YWNrWzBdLm5hbWUgPT0gYmFzZU5hbWUpXG5cdFx0XHRcdFx0XHRcdHdoaWxlIChwb3MgPCB0aGlzLl90YWdTdGFjay5sZW5ndGggLSAxKVxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnBvcCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHsgLy9UaGlzIGlzIG5vdCBhIGNsb3NpbmcgdGFnXG5cdFx0XHRcdFx0aWYgKCF0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4pXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4gPSBbXTtcblx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4ucHVzaChlbGVtZW50KTtcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNFbXB0eVRhZyhlbGVtZW50KSkgLy9Eb24ndCBhZGQgdGFncyB0byB0aGUgdGFnIHN0YWNrIHRoYXQgY2FuJ3QgaGF2ZSBjaGlsZHJlblxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChlbGVtZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7IC8vVGhpcyBpcyBub3QgYSBjb250YWluZXIgZWxlbWVudFxuXHRcdFx0XHRpZiAoIXRoaXMuX3RhZ1N0YWNrLmxhc3QoKS5jaGlsZHJlbilcblx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4gPSBbXTtcblx0XHRcdFx0dGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuLnB1c2goZWxlbWVudCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0dmFyIERvbVV0aWxzID0ge1xuXHRcdCAgdGVzdEVsZW1lbnQ6IGZ1bmN0aW9uIERvbVV0aWxzJHRlc3RFbGVtZW50IChvcHRpb25zLCBlbGVtZW50KSB7XG5cdFx0XHRpZiAoIWVsZW1lbnQpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcblx0XHRcdGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdGlmIChrZXkgPT0gXCJ0YWdfbmFtZVwiKSB7XG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQudHlwZSAhPSBcInRhZ1wiICYmIGVsZW1lbnQudHlwZSAhPSBcInNjcmlwdFwiICYmIGVsZW1lbnQudHlwZSAhPSBcInN0eWxlXCIpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCFvcHRpb25zW1widGFnX25hbWVcIl0oZWxlbWVudC5uYW1lKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChrZXkgPT0gXCJ0YWdfdHlwZVwiKSB7XG5cdFx0XHRcdFx0aWYgKCFvcHRpb25zW1widGFnX3R5cGVcIl0oZWxlbWVudC50eXBlKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChrZXkgPT0gXCJ0YWdfY29udGFpbnNcIikge1xuXHRcdFx0XHRcdGlmIChlbGVtZW50LnR5cGUgIT0gXCJ0ZXh0XCIgJiYgZWxlbWVudC50eXBlICE9IFwiY29tbWVudFwiICYmIGVsZW1lbnQudHlwZSAhPSBcImRpcmVjdGl2ZVwiKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICghb3B0aW9uc1tcInRhZ19jb250YWluc1wiXShlbGVtZW50LmRhdGEpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmICghZWxlbWVudC5hdHRyaWJzIHx8ICFvcHRpb25zW2tleV0oZWxlbWVudC5hdHRyaWJzW2tleV0pKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFxuXHRcdCwgZ2V0RWxlbWVudHM6IGZ1bmN0aW9uIERvbVV0aWxzJGdldEVsZW1lbnRzIChvcHRpb25zLCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpIHtcblx0XHRcdHJlY3Vyc2UgPSAocmVjdXJzZSA9PT0gdW5kZWZpbmVkIHx8IHJlY3Vyc2UgPT09IG51bGwpIHx8ICEhcmVjdXJzZTtcblx0XHRcdGxpbWl0ID0gaXNOYU4ocGFyc2VJbnQobGltaXQpKSA/IC0xIDogcGFyc2VJbnQobGltaXQpO1xuXG5cdFx0XHRpZiAoIWN1cnJlbnRFbGVtZW50KSB7XG5cdFx0XHRcdHJldHVybihbXSk7XG5cdFx0XHR9XG5cdFxuXHRcdFx0dmFyIGZvdW5kID0gW107XG5cdFx0XHR2YXIgZWxlbWVudExpc3Q7XG5cblx0XHRcdGZ1bmN0aW9uIGdldFRlc3QgKGNoZWNrVmFsKSB7XG5cdFx0XHRcdHJldHVybihmdW5jdGlvbiAodmFsdWUpIHsgcmV0dXJuKHZhbHVlID09IGNoZWNrVmFsKTsgfSk7XG5cdFx0XHR9XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRpZiAoKHR5cGVvZiBvcHRpb25zW2tleV0pICE9IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdG9wdGlvbnNba2V5XSA9IGdldFRlc3Qob3B0aW9uc1trZXldKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcblx0XHRcdGlmIChEb21VdGlscy50ZXN0RWxlbWVudChvcHRpb25zLCBjdXJyZW50RWxlbWVudCkpIHtcblx0XHRcdFx0Zm91bmQucHVzaChjdXJyZW50RWxlbWVudCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChsaW1pdCA+PSAwICYmIGZvdW5kLmxlbmd0aCA+PSBsaW1pdCkge1xuXHRcdFx0XHRyZXR1cm4oZm91bmQpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmVjdXJzZSAmJiBjdXJyZW50RWxlbWVudC5jaGlsZHJlbikge1xuXHRcdFx0XHRlbGVtZW50TGlzdCA9IGN1cnJlbnRFbGVtZW50LmNoaWxkcmVuO1xuXHRcdFx0fSBlbHNlIGlmIChjdXJyZW50RWxlbWVudCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdGVsZW1lbnRMaXN0ID0gY3VycmVudEVsZW1lbnQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4oZm91bmQpO1xuXHRcdFx0fVxuXHRcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudExpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0Zm91bmQgPSBmb3VuZC5jb25jYXQoRG9tVXRpbHMuZ2V0RWxlbWVudHMob3B0aW9ucywgZWxlbWVudExpc3RbaV0sIHJlY3Vyc2UsIGxpbWl0KSk7XG5cdFx0XHRcdGlmIChsaW1pdCA+PSAwICYmIGZvdW5kLmxlbmd0aCA+PSBsaW1pdCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFxuXHRcdFx0cmV0dXJuKGZvdW5kKTtcblx0XHR9XG5cdFx0XG5cdFx0LCBnZXRFbGVtZW50QnlJZDogZnVuY3Rpb24gRG9tVXRpbHMkZ2V0RWxlbWVudEJ5SWQgKGlkLCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSkge1xuXHRcdFx0dmFyIHJlc3VsdCA9IERvbVV0aWxzLmdldEVsZW1lbnRzKHsgaWQ6IGlkIH0sIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCAxKTtcblx0XHRcdHJldHVybihyZXN1bHQubGVuZ3RoID8gcmVzdWx0WzBdIDogbnVsbCk7XG5cdFx0fVxuXHRcdFxuXHRcdCwgZ2V0RWxlbWVudHNCeVRhZ05hbWU6IGZ1bmN0aW9uIERvbVV0aWxzJGdldEVsZW1lbnRzQnlUYWdOYW1lIChuYW1lLCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpIHtcblx0XHRcdHJldHVybihEb21VdGlscy5nZXRFbGVtZW50cyh7IHRhZ19uYW1lOiBuYW1lIH0sIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCBsaW1pdCkpO1xuXHRcdH1cblx0XHRcblx0XHQsIGdldEVsZW1lbnRzQnlUYWdUeXBlOiBmdW5jdGlvbiBEb21VdGlscyRnZXRFbGVtZW50c0J5VGFnVHlwZSAodHlwZSwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIGxpbWl0KSB7XG5cdFx0XHRyZXR1cm4oRG9tVXRpbHMuZ2V0RWxlbWVudHMoeyB0YWdfdHlwZTogdHlwZSB9LCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBpbmhlcml0cyAoY3Rvciwgc3VwZXJDdG9yKSB7XG5cdFx0dmFyIHRlbXBDdG9yID0gZnVuY3Rpb24oKXt9O1xuXHRcdHRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGU7XG5cdFx0Y3Rvci5zdXBlcl8gPSBzdXBlckN0b3I7XG5cdFx0Y3Rvci5wcm90b3R5cGUgPSBuZXcgdGVtcEN0b3IoKTtcblx0XHRjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3I7XG5cdH1cblxuZXhwb3J0cy5QYXJzZXIgPSBQYXJzZXI7XG5cbmV4cG9ydHMuRGVmYXVsdEhhbmRsZXIgPSBEZWZhdWx0SGFuZGxlcjtcblxuZXhwb3J0cy5Sc3NIYW5kbGVyID0gUnNzSGFuZGxlcjtcblxuZXhwb3J0cy5FbGVtZW50VHlwZSA9IEVsZW1lbnRUeXBlO1xuXG5leHBvcnRzLkRvbVV0aWxzID0gRG9tVXRpbHM7XG5cbn0pKCk7XG5cbn0pLmNhbGwodGhpcyxcIi9ub2RlX21vZHVsZXMvaHRtbHBhcnNlci9saWIvaHRtbHBhcnNlci5qc1wiLFwiL25vZGVfbW9kdWxlcy9odG1scGFyc2VyL2xpYlwiKSIsInZhciBjcmVhdGVFbGVtZW50ID0gcmVxdWlyZShcInZkb20vY3JlYXRlLWVsZW1lbnRcIilcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50XG4iLCJ2YXIgZGlmZiA9IHJlcXVpcmUoXCJ2dHJlZS9kaWZmXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZGlmZlxuIiwidmFyIGggPSByZXF1aXJlKFwiLi9oL2luZGV4LmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaFxuIiwidmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxudmFyIGlzU3RyaW5nID0gcmVxdWlyZShcIngtaXMtc3RyaW5nXCIpXG5cbnZhciBWTm9kZSA9IHJlcXVpcmUoXCJ2dHJlZS92bm9kZS5qc1wiKVxudmFyIFZUZXh0ID0gcmVxdWlyZShcInZ0cmVlL3Z0ZXh0LmpzXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwidnRyZWUvaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy13aWRnZXRcIilcblxudmFyIHBhcnNlVGFnID0gcmVxdWlyZShcIi4vcGFyc2UtdGFnXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaFxuXG5mdW5jdGlvbiBoKHRhZ05hbWUsIHByb3BlcnRpZXMsIGNoaWxkcmVuKSB7XG4gICAgdmFyIHRhZywgcHJvcHMsIGNoaWxkTm9kZXMsIGtleVxuXG4gICAgaWYgKCFjaGlsZHJlbikge1xuICAgICAgICBpZiAoaXNDaGlsZHJlbihwcm9wZXJ0aWVzKSkge1xuICAgICAgICAgICAgY2hpbGRyZW4gPSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBwcm9wZXJ0aWVzID0gdW5kZWZpbmVkXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0YWcgPSBwYXJzZVRhZyh0YWdOYW1lLCBwcm9wZXJ0aWVzKVxuXG4gICAgaWYgKCFpc1N0cmluZyh0YWcpKSB7XG4gICAgICAgIHByb3BzID0gdGFnLnByb3BlcnRpZXNcbiAgICAgICAgdGFnID0gdGFnLnRhZ05hbWVcbiAgICB9IGVsc2Uge1xuICAgICAgICBwcm9wcyA9IHByb3BlcnRpZXNcbiAgICB9XG5cbiAgICBpZiAoaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICBpZiAoaXNTdHJpbmcoY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW5baV0gPSBuZXcgVlRleHQoY2hpbGQpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjaGlsZE5vZGVzID0gY2hpbGRyZW5cbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGNoaWxkcmVuKSkge1xuICAgICAgICBjaGlsZE5vZGVzID0gW25ldyBWVGV4dChjaGlsZHJlbildXG4gICAgfSBlbHNlIGlmIChpc0NoaWxkKGNoaWxkcmVuKSkge1xuICAgICAgICBjaGlsZE5vZGVzID0gW2NoaWxkcmVuXVxuICAgIH1cblxuICAgIGlmIChwcm9wcyAmJiBcImtleVwiIGluIHByb3BzKSB7XG4gICAgICAgIGtleSA9IHByb3BzLmtleVxuICAgICAgICBkZWxldGUgcHJvcHMua2V5XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBWTm9kZSh0YWcsIHByb3BzLCBjaGlsZE5vZGVzLCBrZXkpXG59XG5cbmZ1bmN0aW9uIGlzQ2hpbGQoeCkge1xuICAgIHJldHVybiBpc1ZOb2RlKHgpIHx8IGlzVlRleHQoeCkgfHwgaXNXaWRnZXQoeClcbn1cblxuZnVuY3Rpb24gaXNDaGlsZHJlbih4KSB7XG4gICAgcmV0dXJuIGlzQXJyYXkoeCkgfHwgaXNTdHJpbmcoeCkgfHwgaXNDaGlsZCh4KVxufVxuIiwidmFyIHNwbGl0ID0gcmVxdWlyZShcImJyb3dzZXItc3BsaXRcIilcblxudmFyIGNsYXNzSWRTcGxpdCA9IC8oW1xcLiNdP1thLXpBLVowLTlfOi1dKykvXG52YXIgbm90Q2xhc3NJZCA9IC9eXFwufCMvXG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2VUYWdcblxuZnVuY3Rpb24gcGFyc2VUYWcodGFnLCBwcm9wcykge1xuICAgIGlmICghdGFnKSB7XG4gICAgICAgIHJldHVybiBcImRpdlwiXG4gICAgfVxuXG4gICAgdmFyIG5vSWQgPSAhcHJvcHMgfHwgIShcImlkXCIgaW4gcHJvcHMpXG5cbiAgICB2YXIgdGFnUGFydHMgPSBzcGxpdCh0YWcsIGNsYXNzSWRTcGxpdClcbiAgICB2YXIgdGFnTmFtZSA9IG51bGxcblxuICAgIGlmKG5vdENsYXNzSWQudGVzdCh0YWdQYXJ0c1sxXSkpIHtcbiAgICAgICAgdGFnTmFtZSA9IFwiZGl2XCJcbiAgICB9XG5cbiAgICB2YXIgaWQsIGNsYXNzZXMsIHBhcnQsIHR5cGUsIGlcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGFnUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFydCA9IHRhZ1BhcnRzW2ldXG5cbiAgICAgICAgaWYgKCFwYXJ0KSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgdHlwZSA9IHBhcnQuY2hhckF0KDApXG5cbiAgICAgICAgaWYgKCF0YWdOYW1lKSB7XG4gICAgICAgICAgICB0YWdOYW1lID0gcGFydFxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwiLlwiKSB7XG4gICAgICAgICAgICBjbGFzc2VzID0gY2xhc3NlcyB8fCBbXVxuICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKHBhcnQuc3Vic3RyaW5nKDEsIHBhcnQubGVuZ3RoKSlcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBcIiNcIiAmJiBub0lkKSB7XG4gICAgICAgICAgICBpZCA9IHBhcnQuc3Vic3RyaW5nKDEsIHBhcnQubGVuZ3RoKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHBhcnNlZFRhZ3NcblxuICAgIGlmIChwcm9wcykge1xuICAgICAgICBpZiAoaWQgIT09IHVuZGVmaW5lZCAmJiAhKFwiaWRcIiBpbiBwcm9wcykpIHtcbiAgICAgICAgICAgIHByb3BzLmlkID0gaWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjbGFzc2VzKSB7XG4gICAgICAgICAgICBpZiAocHJvcHMuY2xhc3NOYW1lKSB7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKHByb3BzLmNsYXNzTmFtZSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJvcHMuY2xhc3NOYW1lID0gY2xhc3Nlcy5qb2luKFwiIFwiKVxuICAgICAgICB9XG5cbiAgICAgICAgcGFyc2VkVGFncyA9IHRhZ05hbWVcbiAgICB9IGVsc2UgaWYgKGNsYXNzZXMgfHwgaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB2YXIgcHJvcGVydGllcyA9IHt9XG5cbiAgICAgICAgaWYgKGlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuaWQgPSBpZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNsYXNzZXMpIHtcbiAgICAgICAgICAgIHByb3BlcnRpZXMuY2xhc3NOYW1lID0gY2xhc3Nlcy5qb2luKFwiIFwiKVxuICAgICAgICB9XG5cbiAgICAgICAgcGFyc2VkVGFncyA9IHtcbiAgICAgICAgICAgIHRhZ05hbWU6IHRhZ05hbWUsXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzXG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXJzZWRUYWdzID0gdGFnTmFtZVxuICAgIH1cblxuICAgIHJldHVybiBwYXJzZWRUYWdzXG59XG4iLCIvKiFcbiAqIENyb3NzLUJyb3dzZXIgU3BsaXQgMS4xLjFcbiAqIENvcHlyaWdodCAyMDA3LTIwMTIgU3RldmVuIExldml0aGFuIDxzdGV2ZW5sZXZpdGhhbi5jb20+XG4gKiBBdmFpbGFibGUgdW5kZXIgdGhlIE1JVCBMaWNlbnNlXG4gKiBFQ01BU2NyaXB0IGNvbXBsaWFudCwgdW5pZm9ybSBjcm9zcy1icm93c2VyIHNwbGl0IG1ldGhvZFxuICovXG5cbi8qKlxuICogU3BsaXRzIGEgc3RyaW5nIGludG8gYW4gYXJyYXkgb2Ygc3RyaW5ncyB1c2luZyBhIHJlZ2V4IG9yIHN0cmluZyBzZXBhcmF0b3IuIE1hdGNoZXMgb2YgdGhlXG4gKiBzZXBhcmF0b3IgYXJlIG5vdCBpbmNsdWRlZCBpbiB0aGUgcmVzdWx0IGFycmF5LiBIb3dldmVyLCBpZiBgc2VwYXJhdG9yYCBpcyBhIHJlZ2V4IHRoYXQgY29udGFpbnNcbiAqIGNhcHR1cmluZyBncm91cHMsIGJhY2tyZWZlcmVuY2VzIGFyZSBzcGxpY2VkIGludG8gdGhlIHJlc3VsdCBlYWNoIHRpbWUgYHNlcGFyYXRvcmAgaXMgbWF0Y2hlZC5cbiAqIEZpeGVzIGJyb3dzZXIgYnVncyBjb21wYXJlZCB0byB0aGUgbmF0aXZlIGBTdHJpbmcucHJvdG90eXBlLnNwbGl0YCBhbmQgY2FuIGJlIHVzZWQgcmVsaWFibHlcbiAqIGNyb3NzLWJyb3dzZXIuXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFN0cmluZyB0byBzcGxpdC5cbiAqIEBwYXJhbSB7UmVnRXhwfFN0cmluZ30gc2VwYXJhdG9yIFJlZ2V4IG9yIHN0cmluZyB0byB1c2UgZm9yIHNlcGFyYXRpbmcgdGhlIHN0cmluZy5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbbGltaXRdIE1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRvIGluY2x1ZGUgaW4gdGhlIHJlc3VsdCBhcnJheS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygc3Vic3RyaW5ncy5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gQmFzaWMgdXNlXG4gKiBzcGxpdCgnYSBiIGMgZCcsICcgJyk7XG4gKiAvLyAtPiBbJ2EnLCAnYicsICdjJywgJ2QnXVxuICpcbiAqIC8vIFdpdGggbGltaXRcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnLCAyKTtcbiAqIC8vIC0+IFsnYScsICdiJ11cbiAqXG4gKiAvLyBCYWNrcmVmZXJlbmNlcyBpbiByZXN1bHQgYXJyYXlcbiAqIHNwbGl0KCcuLndvcmQxIHdvcmQyLi4nLCAvKFthLXpdKykoXFxkKykvaSk7XG4gKiAvLyAtPiBbJy4uJywgJ3dvcmQnLCAnMScsICcgJywgJ3dvcmQnLCAnMicsICcuLiddXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIHNwbGl0KHVuZGVmKSB7XG5cbiAgdmFyIG5hdGl2ZVNwbGl0ID0gU3RyaW5nLnByb3RvdHlwZS5zcGxpdCxcbiAgICBjb21wbGlhbnRFeGVjTnBjZyA9IC8oKT8/Ly5leGVjKFwiXCIpWzFdID09PSB1bmRlZixcbiAgICAvLyBOUENHOiBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cFxuICAgIHNlbGY7XG5cbiAgc2VsZiA9IGZ1bmN0aW9uKHN0ciwgc2VwYXJhdG9yLCBsaW1pdCkge1xuICAgIC8vIElmIGBzZXBhcmF0b3JgIGlzIG5vdCBhIHJlZ2V4LCB1c2UgYG5hdGl2ZVNwbGl0YFxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc2VwYXJhdG9yKSAhPT0gXCJbb2JqZWN0IFJlZ0V4cF1cIikge1xuICAgICAgcmV0dXJuIG5hdGl2ZVNwbGl0LmNhbGwoc3RyLCBzZXBhcmF0b3IsIGxpbWl0KTtcbiAgICB9XG4gICAgdmFyIG91dHB1dCA9IFtdLFxuICAgICAgZmxhZ3MgPSAoc2VwYXJhdG9yLmlnbm9yZUNhc2UgPyBcImlcIiA6IFwiXCIpICsgKHNlcGFyYXRvci5tdWx0aWxpbmUgPyBcIm1cIiA6IFwiXCIpICsgKHNlcGFyYXRvci5leHRlbmRlZCA/IFwieFwiIDogXCJcIikgKyAvLyBQcm9wb3NlZCBmb3IgRVM2XG4gICAgICAoc2VwYXJhdG9yLnN0aWNreSA/IFwieVwiIDogXCJcIiksXG4gICAgICAvLyBGaXJlZm94IDMrXG4gICAgICBsYXN0TGFzdEluZGV4ID0gMCxcbiAgICAgIC8vIE1ha2UgYGdsb2JhbGAgYW5kIGF2b2lkIGBsYXN0SW5kZXhgIGlzc3VlcyBieSB3b3JraW5nIHdpdGggYSBjb3B5XG4gICAgICBzZXBhcmF0b3IgPSBuZXcgUmVnRXhwKHNlcGFyYXRvci5zb3VyY2UsIGZsYWdzICsgXCJnXCIpLFxuICAgICAgc2VwYXJhdG9yMiwgbWF0Y2gsIGxhc3RJbmRleCwgbGFzdExlbmd0aDtcbiAgICBzdHIgKz0gXCJcIjsgLy8gVHlwZS1jb252ZXJ0XG4gICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZykge1xuICAgICAgLy8gRG9lc24ndCBuZWVkIGZsYWdzIGd5LCBidXQgdGhleSBkb24ndCBodXJ0XG4gICAgICBzZXBhcmF0b3IyID0gbmV3IFJlZ0V4cChcIl5cIiArIHNlcGFyYXRvci5zb3VyY2UgKyBcIiQoPyFcXFxccylcIiwgZmxhZ3MpO1xuICAgIH1cbiAgICAvKiBWYWx1ZXMgZm9yIGBsaW1pdGAsIHBlciB0aGUgc3BlYzpcbiAgICAgKiBJZiB1bmRlZmluZWQ6IDQyOTQ5NjcyOTUgLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgICAqIElmIDAsIEluZmluaXR5LCBvciBOYU46IDBcbiAgICAgKiBJZiBwb3NpdGl2ZSBudW1iZXI6IGxpbWl0ID0gTWF0aC5mbG9vcihsaW1pdCk7IGlmIChsaW1pdCA+IDQyOTQ5NjcyOTUpIGxpbWl0IC09IDQyOTQ5NjcyOTY7XG4gICAgICogSWYgbmVnYXRpdmUgbnVtYmVyOiA0Mjk0OTY3Mjk2IC0gTWF0aC5mbG9vcihNYXRoLmFicyhsaW1pdCkpXG4gICAgICogSWYgb3RoZXI6IFR5cGUtY29udmVydCwgdGhlbiB1c2UgdGhlIGFib3ZlIHJ1bGVzXG4gICAgICovXG4gICAgbGltaXQgPSBsaW1pdCA9PT0gdW5kZWYgPyAtMSA+Pj4gMCA6IC8vIE1hdGgucG93KDIsIDMyKSAtIDFcbiAgICBsaW1pdCA+Pj4gMDsgLy8gVG9VaW50MzIobGltaXQpXG4gICAgd2hpbGUgKG1hdGNoID0gc2VwYXJhdG9yLmV4ZWMoc3RyKSkge1xuICAgICAgLy8gYHNlcGFyYXRvci5sYXN0SW5kZXhgIGlzIG5vdCByZWxpYWJsZSBjcm9zcy1icm93c2VyXG4gICAgICBsYXN0SW5kZXggPSBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgIGlmIChsYXN0SW5kZXggPiBsYXN0TGFzdEluZGV4KSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4LCBtYXRjaC5pbmRleCkpO1xuICAgICAgICAvLyBGaXggYnJvd3NlcnMgd2hvc2UgYGV4ZWNgIG1ldGhvZHMgZG9uJ3QgY29uc2lzdGVudGx5IHJldHVybiBgdW5kZWZpbmVkYCBmb3JcbiAgICAgICAgLy8gbm9ucGFydGljaXBhdGluZyBjYXB0dXJpbmcgZ3JvdXBzXG4gICAgICAgIGlmICghY29tcGxpYW50RXhlY05wY2cgJiYgbWF0Y2gubGVuZ3RoID4gMSkge1xuICAgICAgICAgIG1hdGNoWzBdLnJlcGxhY2Uoc2VwYXJhdG9yMiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGggLSAyOyBpKyspIHtcbiAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50c1tpXSA9PT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICBtYXRjaFtpXSA9IHVuZGVmO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoLmxlbmd0aCA+IDEgJiYgbWF0Y2guaW5kZXggPCBzdHIubGVuZ3RoKSB7XG4gICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkob3V0cHV0LCBtYXRjaC5zbGljZSgxKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdExlbmd0aCA9IG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgICAgbGFzdExhc3RJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgICAgaWYgKG91dHB1dC5sZW5ndGggPj0gbGltaXQpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHNlcGFyYXRvci5sYXN0SW5kZXggPT09IG1hdGNoLmluZGV4KSB7XG4gICAgICAgIHNlcGFyYXRvci5sYXN0SW5kZXgrKzsgLy8gQXZvaWQgYW4gaW5maW5pdGUgbG9vcFxuICAgICAgfVxuICAgIH1cbiAgICBpZiAobGFzdExhc3RJbmRleCA9PT0gc3RyLmxlbmd0aCkge1xuICAgICAgaWYgKGxhc3RMZW5ndGggfHwgIXNlcGFyYXRvci50ZXN0KFwiXCIpKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKFwiXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaChzdHIuc2xpY2UobGFzdExhc3RJbmRleCkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0Lmxlbmd0aCA+IGxpbWl0ID8gb3V0cHV0LnNsaWNlKDAsIGxpbWl0KSA6IG91dHB1dDtcbiAgfTtcblxuICByZXR1cm4gc2VsZjtcbn0pKCk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzT2JqZWN0XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KHgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwib2JqZWN0XCIgJiYgeCAhPT0gbnVsbFxufVxuIiwidmFyIGlzT2JqZWN0ID0gcmVxdWlyZShcImlzLW9iamVjdFwiKVxudmFyIGlzSG9vayA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12aG9va1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcGx5UHJvcGVydGllc1xuXG5mdW5jdGlvbiBhcHBseVByb3BlcnRpZXMobm9kZSwgcHJvcHMsIHByZXZpb3VzKSB7XG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcHMpIHtcbiAgICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXVxuXG4gICAgICAgIGlmIChwcm9wVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNIb29rKHByb3BWYWx1ZSkpIHtcbiAgICAgICAgICAgIHByb3BWYWx1ZS5ob29rKG5vZGUsXG4gICAgICAgICAgICAgICAgcHJvcE5hbWUsXG4gICAgICAgICAgICAgICAgcHJldmlvdXMgPyBwcmV2aW91c1twcm9wTmFtZV0gOiB1bmRlZmluZWQpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXNPYmplY3QocHJvcFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHBhdGNoT2JqZWN0KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUsIHByb3BWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBwcm9wVmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSkge1xuICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzW3Byb3BOYW1lXVxuXG4gICAgICAgIGlmICghaXNIb29rKHByZXZpb3VzVmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAocHJvcE5hbWUgPT09IFwiYXR0cmlidXRlc1wiKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXR0ck5hbWUgaW4gcHJldmlvdXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BOYW1lID09PSBcInN0eWxlXCIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHByZXZpb3VzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zdHlsZVtpXSA9IFwiXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcmV2aW91c1ZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBcIlwiXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVbcHJvcE5hbWVdID0gbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBwYXRjaE9iamVjdChub2RlLCBwcm9wcywgcHJldmlvdXMsIHByb3BOYW1lLCBwcm9wVmFsdWUpIHtcbiAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzID8gcHJldmlvdXNbcHJvcE5hbWVdIDogdW5kZWZpbmVkXG5cbiAgICAvLyBTZXQgYXR0cmlidXRlc1xuICAgIGlmIChwcm9wTmFtZSA9PT0gXCJhdHRyaWJ1dGVzXCIpIHtcbiAgICAgICAgZm9yICh2YXIgYXR0ck5hbWUgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgYXR0clZhbHVlID0gcHJvcFZhbHVlW2F0dHJOYW1lXVxuXG4gICAgICAgICAgICBpZiAoYXR0clZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0ck5hbWUsIGF0dHJWYWx1ZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmKHByZXZpb3VzVmFsdWUgJiYgaXNPYmplY3QocHJldmlvdXNWYWx1ZSkgJiZcbiAgICAgICAgZ2V0UHJvdG90eXBlKHByZXZpb3VzVmFsdWUpICE9PSBnZXRQcm90b3R5cGUocHJvcFZhbHVlKSkge1xuICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHByb3BWYWx1ZVxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAoIWlzT2JqZWN0KG5vZGVbcHJvcE5hbWVdKSkge1xuICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHt9XG4gICAgfVxuXG4gICAgdmFyIHJlcGxhY2VyID0gcHJvcE5hbWUgPT09IFwic3R5bGVcIiA/IFwiXCIgOiB1bmRlZmluZWRcblxuICAgIGZvciAodmFyIGsgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHByb3BWYWx1ZVtrXVxuICAgICAgICBub2RlW3Byb3BOYW1lXVtrXSA9ICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSA/IHJlcGxhY2VyIDogdmFsdWVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZSh2YWx1ZSkge1xuICAgIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSlcbiAgICB9IGVsc2UgaWYgKHZhbHVlLl9fcHJvdG9fXykge1xuICAgICAgICByZXR1cm4gdmFsdWUuX19wcm90b19fXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlXG4gICAgfVxufVxuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxuXG52YXIgYXBwbHlQcm9wZXJ0aWVzID0gcmVxdWlyZShcIi4vYXBwbHktcHJvcGVydGllc1wiKVxuXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwidnRyZWUvaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy13aWRnZXRcIilcbnZhciBoYW5kbGVUaHVuayA9IHJlcXVpcmUoXCJ2dHJlZS9oYW5kbGUtdGh1bmtcIilcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodm5vZGUsIG9wdHMpIHtcbiAgICB2YXIgZG9jID0gb3B0cyA/IG9wdHMuZG9jdW1lbnQgfHwgZG9jdW1lbnQgOiBkb2N1bWVudFxuICAgIHZhciB3YXJuID0gb3B0cyA/IG9wdHMud2FybiA6IG51bGxcblxuICAgIHZub2RlID0gaGFuZGxlVGh1bmsodm5vZGUpLmFcblxuICAgIGlmIChpc1dpZGdldCh2bm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIHZub2RlLmluaXQoKVxuICAgIH0gZWxzZSBpZiAoaXNWVGV4dCh2bm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIGRvYy5jcmVhdGVUZXh0Tm9kZSh2bm9kZS50ZXh0KVxuICAgIH0gZWxzZSBpZiAoIWlzVk5vZGUodm5vZGUpKSB7XG4gICAgICAgIGlmICh3YXJuKSB7XG4gICAgICAgICAgICB3YXJuKFwiSXRlbSBpcyBub3QgYSB2YWxpZCB2aXJ0dWFsIGRvbSBub2RlXCIsIHZub2RlKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSAodm5vZGUubmFtZXNwYWNlID09PSBudWxsKSA/XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50KHZub2RlLnRhZ05hbWUpIDpcbiAgICAgICAgZG9jLmNyZWF0ZUVsZW1lbnROUyh2bm9kZS5uYW1lc3BhY2UsIHZub2RlLnRhZ05hbWUpXG5cbiAgICB2YXIgcHJvcHMgPSB2bm9kZS5wcm9wZXJ0aWVzXG4gICAgYXBwbHlQcm9wZXJ0aWVzKG5vZGUsIHByb3BzKVxuXG4gICAgdmFyIGNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkTm9kZSA9IGNyZWF0ZUVsZW1lbnQoY2hpbGRyZW5baV0sIG9wdHMpXG4gICAgICAgIGlmIChjaGlsZE5vZGUpIHtcbiAgICAgICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGROb2RlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGVcbn1cbiIsIi8vIE1hcHMgYSB2aXJ0dWFsIERPTSB0cmVlIG9udG8gYSByZWFsIERPTSB0cmVlIGluIGFuIGVmZmljaWVudCBtYW5uZXIuXG4vLyBXZSBkb24ndCB3YW50IHRvIHJlYWQgYWxsIG9mIHRoZSBET00gbm9kZXMgaW4gdGhlIHRyZWUgc28gd2UgdXNlXG4vLyB0aGUgaW4tb3JkZXIgdHJlZSBpbmRleGluZyB0byBlbGltaW5hdGUgcmVjdXJzaW9uIGRvd24gY2VydGFpbiBicmFuY2hlcy5cbi8vIFdlIG9ubHkgcmVjdXJzZSBpbnRvIGEgRE9NIG5vZGUgaWYgd2Uga25vdyB0aGF0IGl0IGNvbnRhaW5zIGEgY2hpbGQgb2Zcbi8vIGludGVyZXN0LlxuXG52YXIgbm9DaGlsZCA9IHt9XG5cbm1vZHVsZS5leHBvcnRzID0gZG9tSW5kZXhcblxuZnVuY3Rpb24gZG9tSW5kZXgocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzKSB7XG4gICAgaWYgKCFpbmRpY2VzIHx8IGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7fVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGluZGljZXMuc29ydChhc2NlbmRpbmcpXG4gICAgICAgIHJldHVybiByZWN1cnNlKHJvb3ROb2RlLCB0cmVlLCBpbmRpY2VzLCBub2RlcywgMClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlY3Vyc2Uocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzLCByb290SW5kZXgpIHtcbiAgICBub2RlcyA9IG5vZGVzIHx8IHt9XG5cblxuICAgIGlmIChyb290Tm9kZSkge1xuICAgICAgICBpZiAoaW5kZXhJblJhbmdlKGluZGljZXMsIHJvb3RJbmRleCwgcm9vdEluZGV4KSkge1xuICAgICAgICAgICAgbm9kZXNbcm9vdEluZGV4XSA9IHJvb3ROb2RlXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdkNoaWxkcmVuID0gdHJlZS5jaGlsZHJlblxuXG4gICAgICAgIGlmICh2Q2hpbGRyZW4pIHtcblxuICAgICAgICAgICAgdmFyIGNoaWxkTm9kZXMgPSByb290Tm9kZS5jaGlsZE5vZGVzXG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJvb3RJbmRleCArPSAxXG5cbiAgICAgICAgICAgICAgICB2YXIgdkNoaWxkID0gdkNoaWxkcmVuW2ldIHx8IG5vQ2hpbGRcbiAgICAgICAgICAgICAgICB2YXIgbmV4dEluZGV4ID0gcm9vdEluZGV4ICsgKHZDaGlsZC5jb3VudCB8fCAwKVxuXG4gICAgICAgICAgICAgICAgLy8gc2tpcCByZWN1cnNpb24gZG93biB0aGUgdHJlZSBpZiB0aGVyZSBhcmUgbm8gbm9kZXMgZG93biBoZXJlXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4SW5SYW5nZShpbmRpY2VzLCByb290SW5kZXgsIG5leHRJbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVjdXJzZShjaGlsZE5vZGVzW2ldLCB2Q2hpbGQsIGluZGljZXMsIG5vZGVzLCByb290SW5kZXgpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcm9vdEluZGV4ID0gbmV4dEluZGV4XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZXNcbn1cblxuLy8gQmluYXJ5IHNlYXJjaCBmb3IgYW4gaW5kZXggaW4gdGhlIGludGVydmFsIFtsZWZ0LCByaWdodF1cbmZ1bmN0aW9uIGluZGV4SW5SYW5nZShpbmRpY2VzLCBsZWZ0LCByaWdodCkge1xuICAgIGlmIChpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB2YXIgbWluSW5kZXggPSAwXG4gICAgdmFyIG1heEluZGV4ID0gaW5kaWNlcy5sZW5ndGggLSAxXG4gICAgdmFyIGN1cnJlbnRJbmRleFxuICAgIHZhciBjdXJyZW50SXRlbVxuXG4gICAgd2hpbGUgKG1pbkluZGV4IDw9IG1heEluZGV4KSB7XG4gICAgICAgIGN1cnJlbnRJbmRleCA9ICgobWF4SW5kZXggKyBtaW5JbmRleCkgLyAyKSA+PiAwXG4gICAgICAgIGN1cnJlbnRJdGVtID0gaW5kaWNlc1tjdXJyZW50SW5kZXhdXG5cbiAgICAgICAgaWYgKG1pbkluZGV4ID09PSBtYXhJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRJdGVtID49IGxlZnQgJiYgY3VycmVudEl0ZW0gPD0gcmlnaHRcbiAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50SXRlbSA8IGxlZnQpIHtcbiAgICAgICAgICAgIG1pbkluZGV4ID0gY3VycmVudEluZGV4ICsgMVxuICAgICAgICB9IGVsc2UgIGlmIChjdXJyZW50SXRlbSA+IHJpZ2h0KSB7XG4gICAgICAgICAgICBtYXhJbmRleCA9IGN1cnJlbnRJbmRleCAtIDFcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gICAgcmV0dXJuIGEgPiBiID8gMSA6IC0xXG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIHZhciBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJ2YXIgYXBwbHlQcm9wZXJ0aWVzID0gcmVxdWlyZShcIi4vYXBwbHktcHJvcGVydGllc1wiKVxuXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwidnRyZWUvaXMtd2lkZ2V0XCIpXG52YXIgVlBhdGNoID0gcmVxdWlyZShcInZ0cmVlL3ZwYXRjaFwiKVxuXG52YXIgcmVuZGVyID0gcmVxdWlyZShcIi4vY3JlYXRlLWVsZW1lbnRcIilcbnZhciB1cGRhdGVXaWRnZXQgPSByZXF1aXJlKFwiLi91cGRhdGUtd2lkZ2V0XCIpXG5cbm1vZHVsZS5leHBvcnRzID0gYXBwbHlQYXRjaFxuXG5mdW5jdGlvbiBhcHBseVBhdGNoKHZwYXRjaCwgZG9tTm9kZSwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciB0eXBlID0gdnBhdGNoLnR5cGVcbiAgICB2YXIgdk5vZGUgPSB2cGF0Y2gudk5vZGVcbiAgICB2YXIgcGF0Y2ggPSB2cGF0Y2gucGF0Y2hcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIFZQYXRjaC5SRU1PVkU6XG4gICAgICAgICAgICByZXR1cm4gcmVtb3ZlTm9kZShkb21Ob2RlLCB2Tm9kZSlcbiAgICAgICAgY2FzZSBWUGF0Y2guSU5TRVJUOlxuICAgICAgICAgICAgcmV0dXJuIGluc2VydE5vZGUoZG9tTm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLlZURVhUOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmluZ1BhdGNoKGRvbU5vZGUsIHZOb2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guV0lER0VUOlxuICAgICAgICAgICAgcmV0dXJuIHdpZGdldFBhdGNoKGRvbU5vZGUsIHZOb2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guVk5PREU6XG4gICAgICAgICAgICByZXR1cm4gdk5vZGVQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLk9SREVSOlxuICAgICAgICAgICAgcmVvcmRlckNoaWxkcmVuKGRvbU5vZGUsIHBhdGNoKVxuICAgICAgICAgICAgcmV0dXJuIGRvbU5vZGVcbiAgICAgICAgY2FzZSBWUGF0Y2guUFJPUFM6XG4gICAgICAgICAgICBhcHBseVByb3BlcnRpZXMoZG9tTm9kZSwgcGF0Y2gsIHZOb2RlLnByb3BlcnRpZXMpXG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgICAgICBjYXNlIFZQYXRjaC5USFVOSzpcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlUm9vdChkb21Ob2RlLFxuICAgICAgICAgICAgICAgIHJlbmRlck9wdGlvbnMucGF0Y2goZG9tTm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpKVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGRvbU5vZGVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZU5vZGUoZG9tTm9kZSwgdk5vZGUpIHtcbiAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChkb21Ob2RlKVxuICAgIH1cblxuICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgdk5vZGUpO1xuXG4gICAgcmV0dXJuIG51bGxcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Tm9kZShwYXJlbnROb2RlLCB2Tm9kZSwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBuZXdOb2RlID0gcmVuZGVyKHZOb2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5hcHBlbmRDaGlsZChuZXdOb2RlKVxuICAgIH1cblxuICAgIHJldHVybiBwYXJlbnROb2RlXG59XG5cbmZ1bmN0aW9uIHN0cmluZ1BhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgdlRleHQsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgbmV3Tm9kZVxuXG4gICAgaWYgKGRvbU5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgZG9tTm9kZS5yZXBsYWNlRGF0YSgwLCBkb21Ob2RlLmxlbmd0aCwgdlRleHQudGV4dClcbiAgICAgICAgbmV3Tm9kZSA9IGRvbU5vZGVcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuICAgICAgICBuZXdOb2RlID0gcmVuZGVyKHZUZXh0LCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkb21Ob2RlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCBsZWZ0Vk5vZGUpXG5cbiAgICByZXR1cm4gbmV3Tm9kZVxufVxuXG5mdW5jdGlvbiB3aWRnZXRQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHdpZGdldCwgcmVuZGVyT3B0aW9ucykge1xuICAgIGlmICh1cGRhdGVXaWRnZXQobGVmdFZOb2RlLCB3aWRnZXQpKSB7XG4gICAgICAgIHJldHVybiB3aWRnZXQudXBkYXRlKGxlZnRWTm9kZSwgZG9tTm9kZSkgfHwgZG9tTm9kZVxuICAgIH1cblxuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG4gICAgdmFyIG5ld1dpZGdldCA9IHJlbmRlcih3aWRnZXQsIHJlbmRlck9wdGlvbnMpXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdXaWRnZXQsIGRvbU5vZGUpXG4gICAgfVxuXG4gICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCBsZWZ0Vk5vZGUpXG5cbiAgICByZXR1cm4gbmV3V2lkZ2V0XG59XG5cbmZ1bmN0aW9uIHZOb2RlUGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB2Tm9kZSwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG4gICAgdmFyIG5ld05vZGUgPSByZW5kZXIodk5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkb21Ob2RlKVxuICAgIH1cblxuICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgbGVmdFZOb2RlKVxuXG4gICAgcmV0dXJuIG5ld05vZGVcbn1cblxuZnVuY3Rpb24gZGVzdHJveVdpZGdldChkb21Ob2RlLCB3KSB7XG4gICAgaWYgKHR5cGVvZiB3LmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIiAmJiBpc1dpZGdldCh3KSkge1xuICAgICAgICB3LmRlc3Ryb3koZG9tTm9kZSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlb3JkZXJDaGlsZHJlbihkb21Ob2RlLCBiSW5kZXgpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBbXVxuICAgIHZhciBjaGlsZE5vZGVzID0gZG9tTm9kZS5jaGlsZE5vZGVzXG4gICAgdmFyIGxlbiA9IGNoaWxkTm9kZXMubGVuZ3RoXG4gICAgdmFyIGlcbiAgICB2YXIgcmV2ZXJzZUluZGV4ID0gYkluZGV4LnJldmVyc2VcblxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjaGlsZHJlbi5wdXNoKGRvbU5vZGUuY2hpbGROb2Rlc1tpXSlcbiAgICB9XG5cbiAgICB2YXIgaW5zZXJ0T2Zmc2V0ID0gMFxuICAgIHZhciBtb3ZlXG4gICAgdmFyIG5vZGVcbiAgICB2YXIgaW5zZXJ0Tm9kZVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBtb3ZlID0gYkluZGV4W2ldXG4gICAgICAgIGlmIChtb3ZlICE9PSB1bmRlZmluZWQgJiYgbW92ZSAhPT0gaSkge1xuICAgICAgICAgICAgLy8gdGhlIGVsZW1lbnQgY3VycmVudGx5IGF0IHRoaXMgaW5kZXggd2lsbCBiZSBtb3ZlZCBsYXRlciBzbyBpbmNyZWFzZSB0aGUgaW5zZXJ0IG9mZnNldFxuICAgICAgICAgICAgaWYgKHJldmVyc2VJbmRleFtpXSA+IGkpIHtcbiAgICAgICAgICAgICAgICBpbnNlcnRPZmZzZXQrK1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBub2RlID0gY2hpbGRyZW5bbW92ZV1cbiAgICAgICAgICAgIGluc2VydE5vZGUgPSBjaGlsZE5vZGVzW2kgKyBpbnNlcnRPZmZzZXRdIHx8IG51bGxcbiAgICAgICAgICAgIGlmIChub2RlICE9PSBpbnNlcnROb2RlKSB7XG4gICAgICAgICAgICAgICAgZG9tTm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgaW5zZXJ0Tm9kZSlcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gdGhlIG1vdmVkIGVsZW1lbnQgY2FtZSBmcm9tIHRoZSBmcm9udCBvZiB0aGUgYXJyYXkgc28gcmVkdWNlIHRoZSBpbnNlcnQgb2Zmc2V0XG4gICAgICAgICAgICBpZiAobW92ZSA8IGkpIHtcbiAgICAgICAgICAgICAgICBpbnNlcnRPZmZzZXQtLVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gZWxlbWVudCBhdCB0aGlzIGluZGV4IGlzIHNjaGVkdWxlZCB0byBiZSByZW1vdmVkIHNvIGluY3JlYXNlIGluc2VydCBvZmZzZXRcbiAgICAgICAgaWYgKGkgaW4gYkluZGV4LnJlbW92ZXMpIHtcbiAgICAgICAgICAgIGluc2VydE9mZnNldCsrXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VSb290KG9sZFJvb3QsIG5ld1Jvb3QpIHtcbiAgICBpZiAob2xkUm9vdCAmJiBuZXdSb290ICYmIG9sZFJvb3QgIT09IG5ld1Jvb3QgJiYgb2xkUm9vdC5wYXJlbnROb2RlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKG9sZFJvb3QpXG4gICAgICAgIG9sZFJvb3QucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Um9vdCwgb2xkUm9vdClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Um9vdDtcbn1cbiIsInZhciBkb2N1bWVudCA9IHJlcXVpcmUoXCJnbG9iYWwvZG9jdW1lbnRcIilcbnZhciBpc0FycmF5ID0gcmVxdWlyZShcIngtaXMtYXJyYXlcIilcblxudmFyIGRvbUluZGV4ID0gcmVxdWlyZShcIi4vZG9tLWluZGV4XCIpXG52YXIgcGF0Y2hPcCA9IHJlcXVpcmUoXCIuL3BhdGNoLW9wXCIpXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGNoXG5cbmZ1bmN0aW9uIHBhdGNoKHJvb3ROb2RlLCBwYXRjaGVzKSB7XG4gICAgcmV0dXJuIHBhdGNoUmVjdXJzaXZlKHJvb3ROb2RlLCBwYXRjaGVzKVxufVxuXG5mdW5jdGlvbiBwYXRjaFJlY3Vyc2l2ZShyb290Tm9kZSwgcGF0Y2hlcywgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBpbmRpY2VzID0gcGF0Y2hJbmRpY2VzKHBhdGNoZXMpXG5cbiAgICBpZiAoaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJvb3ROb2RlXG4gICAgfVxuXG4gICAgdmFyIGluZGV4ID0gZG9tSW5kZXgocm9vdE5vZGUsIHBhdGNoZXMuYSwgaW5kaWNlcylcbiAgICB2YXIgb3duZXJEb2N1bWVudCA9IHJvb3ROb2RlLm93bmVyRG9jdW1lbnRcblxuICAgIGlmICghcmVuZGVyT3B0aW9ucykge1xuICAgICAgICByZW5kZXJPcHRpb25zID0geyBwYXRjaDogcGF0Y2hSZWN1cnNpdmUgfVxuICAgICAgICBpZiAob3duZXJEb2N1bWVudCAhPT0gZG9jdW1lbnQpIHtcbiAgICAgICAgICAgIHJlbmRlck9wdGlvbnMuZG9jdW1lbnQgPSBvd25lckRvY3VtZW50XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluZGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG5vZGVJbmRleCA9IGluZGljZXNbaV1cbiAgICAgICAgcm9vdE5vZGUgPSBhcHBseVBhdGNoKHJvb3ROb2RlLFxuICAgICAgICAgICAgaW5kZXhbbm9kZUluZGV4XSxcbiAgICAgICAgICAgIHBhdGNoZXNbbm9kZUluZGV4XSxcbiAgICAgICAgICAgIHJlbmRlck9wdGlvbnMpXG4gICAgfVxuXG4gICAgcmV0dXJuIHJvb3ROb2RlXG59XG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2gocm9vdE5vZGUsIGRvbU5vZGUsIHBhdGNoTGlzdCwgcmVuZGVyT3B0aW9ucykge1xuICAgIGlmICghZG9tTm9kZSkge1xuICAgICAgICByZXR1cm4gcm9vdE5vZGVcbiAgICB9XG5cbiAgICB2YXIgbmV3Tm9kZVxuXG4gICAgaWYgKGlzQXJyYXkocGF0Y2hMaXN0KSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGNoTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbmV3Tm9kZSA9IHBhdGNoT3AocGF0Y2hMaXN0W2ldLCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgICAgICBpZiAoZG9tTm9kZSA9PT0gcm9vdE5vZGUpIHtcbiAgICAgICAgICAgICAgICByb290Tm9kZSA9IG5ld05vZGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld05vZGUgPSBwYXRjaE9wKHBhdGNoTGlzdCwgZG9tTm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICBpZiAoZG9tTm9kZSA9PT0gcm9vdE5vZGUpIHtcbiAgICAgICAgICAgIHJvb3ROb2RlID0gbmV3Tm9kZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJvb3ROb2RlXG59XG5cbmZ1bmN0aW9uIHBhdGNoSW5kaWNlcyhwYXRjaGVzKSB7XG4gICAgdmFyIGluZGljZXMgPSBbXVxuXG4gICAgZm9yICh2YXIga2V5IGluIHBhdGNoZXMpIHtcbiAgICAgICAgaWYgKGtleSAhPT0gXCJhXCIpIHtcbiAgICAgICAgICAgIGluZGljZXMucHVzaChOdW1iZXIoa2V5KSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpbmRpY2VzXG59XG4iLCJ2YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwidnRyZWUvaXMtd2lkZ2V0XCIpXG5cbm1vZHVsZS5leHBvcnRzID0gdXBkYXRlV2lkZ2V0XG5cbmZ1bmN0aW9uIHVwZGF0ZVdpZGdldChhLCBiKSB7XG4gICAgaWYgKGlzV2lkZ2V0KGEpICYmIGlzV2lkZ2V0KGIpKSB7XG4gICAgICAgIGlmIChcIm5hbWVcIiBpbiBhICYmIFwibmFtZVwiIGluIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBhLmlkID09PSBiLmlkXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYS5pbml0ID09PSBiLmluaXRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZVxufVxuIiwidmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxudmFyIGlzT2JqZWN0ID0gcmVxdWlyZShcImlzLW9iamVjdFwiKVxuXG52YXIgVlBhdGNoID0gcmVxdWlyZShcIi4vdnBhdGNoXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCIuL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4vaXMtdGh1bmtcIilcbnZhciBoYW5kbGVUaHVuayA9IHJlcXVpcmUoXCIuL2hhbmRsZS10aHVua1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRpZmZcblxuZnVuY3Rpb24gZGlmZihhLCBiKSB7XG4gICAgdmFyIHBhdGNoID0geyBhOiBhIH1cbiAgICB3YWxrKGEsIGIsIHBhdGNoLCAwKVxuICAgIHJldHVybiBwYXRjaFxufVxuXG5mdW5jdGlvbiB3YWxrKGEsIGIsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChhID09PSBiKSB7XG4gICAgICAgIGlmIChpc1RodW5rKGEpIHx8IGlzVGh1bmsoYikpIHtcbiAgICAgICAgICAgIHRodW5rcyhhLCBiLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBob29rcyhiLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIGFwcGx5ID0gcGF0Y2hbaW5kZXhdXG5cbiAgICBpZiAoYiA9PSBudWxsKSB7XG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlJFTU9WRSwgYSwgYikpXG4gICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICB9IGVsc2UgaWYgKGlzVGh1bmsoYSkgfHwgaXNUaHVuayhiKSkge1xuICAgICAgICB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KVxuICAgIH0gZWxzZSBpZiAoaXNWTm9kZShiKSkge1xuICAgICAgICBpZiAoaXNWTm9kZShhKSkge1xuICAgICAgICAgICAgaWYgKGEudGFnTmFtZSA9PT0gYi50YWdOYW1lICYmXG4gICAgICAgICAgICAgICAgYS5uYW1lc3BhY2UgPT09IGIubmFtZXNwYWNlICYmXG4gICAgICAgICAgICAgICAgYS5rZXkgPT09IGIua2V5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb3BzUGF0Y2ggPSBkaWZmUHJvcHMoYS5wcm9wZXJ0aWVzLCBiLnByb3BlcnRpZXMsIGIuaG9va3MpXG4gICAgICAgICAgICAgICAgaWYgKHByb3BzUGF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goVlBhdGNoLlBST1BTLCBhLCBwcm9wc1BhdGNoKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZOT0RFLCBhLCBiKSlcbiAgICAgICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFwcGx5ID0gZGlmZkNoaWxkcmVuKGEsIGIsIHBhdGNoLCBhcHBseSwgaW5kZXgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WTk9ERSwgYSwgYikpXG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVlRleHQoYikpIHtcbiAgICAgICAgaWYgKCFpc1ZUZXh0KGEpKSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WVEVYVCwgYSwgYikpXG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH0gZWxzZSBpZiAoYS50ZXh0ICE9PSBiLnRleHQpIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZURVhULCBhLCBiKSlcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNXaWRnZXQoYikpIHtcbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guV0lER0VULCBhLCBiKSlcblxuICAgICAgICBpZiAoIWlzV2lkZ2V0KGEpKSB7XG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYXBwbHkpIHtcbiAgICAgICAgcGF0Y2hbaW5kZXhdID0gYXBwbHlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRpZmZQcm9wcyhhLCBiLCBob29rcykge1xuICAgIHZhciBkaWZmXG5cbiAgICBmb3IgKHZhciBhS2V5IGluIGEpIHtcbiAgICAgICAgaWYgKCEoYUtleSBpbiBiKSkge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYUtleV0gPSB1bmRlZmluZWRcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhVmFsdWUgPSBhW2FLZXldXG4gICAgICAgIHZhciBiVmFsdWUgPSBiW2FLZXldXG5cbiAgICAgICAgaWYgKGhvb2tzICYmIGFLZXkgaW4gaG9va3MpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXNPYmplY3QoYVZhbHVlKSAmJiBpc09iamVjdChiVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdldFByb3RvdHlwZShiVmFsdWUpICE9PSBnZXRQcm90b3R5cGUoYVZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9iamVjdERpZmYgPSBkaWZmUHJvcHMoYVZhbHVlLCBiVmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIGlmIChvYmplY3REaWZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IG9iamVjdERpZmZcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYVZhbHVlICE9PSBiVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGJLZXkgaW4gYikge1xuICAgICAgICBpZiAoIShiS2V5IGluIGEpKSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZltiS2V5XSA9IGJbYktleV1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkaWZmXG59XG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZSh2YWx1ZSkge1xuICAgIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSlcbiAgICB9IGVsc2UgaWYgKHZhbHVlLl9fcHJvdG9fXykge1xuICAgICAgICByZXR1cm4gdmFsdWUuX19wcm90b19fXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlXG4gICAgfVxufVxuXG5mdW5jdGlvbiBkaWZmQ2hpbGRyZW4oYSwgYiwgcGF0Y2gsIGFwcGx5LCBpbmRleCkge1xuICAgIHZhciBhQ2hpbGRyZW4gPSBhLmNoaWxkcmVuXG4gICAgdmFyIGJDaGlsZHJlbiA9IHJlb3JkZXIoYUNoaWxkcmVuLCBiLmNoaWxkcmVuKVxuXG4gICAgdmFyIGFMZW4gPSBhQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGJMZW4gPSBiQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGxlbiA9IGFMZW4gPiBiTGVuID8gYUxlbiA6IGJMZW5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGxlZnROb2RlID0gYUNoaWxkcmVuW2ldXG4gICAgICAgIHZhciByaWdodE5vZGUgPSBiQ2hpbGRyZW5baV1cbiAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgIGlmICghbGVmdE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChyaWdodE5vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBFeGNlc3Mgbm9kZXMgaW4gYiBuZWVkIHRvIGJlIGFkZGVkXG4gICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IFZQYXRjaChWUGF0Y2guSU5TRVJULCBudWxsLCByaWdodE5vZGUpKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFyaWdodE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChsZWZ0Tm9kZSkge1xuICAgICAgICAgICAgICAgIC8vIEV4Y2VzcyBub2RlcyBpbiBhIG5lZWQgdG8gYmUgcmVtb3ZlZFxuICAgICAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlJFTU9WRSwgbGVmdE5vZGUsIG51bGwpXG4gICAgICAgICAgICAgICAgZGVzdHJveVdpZGdldHMobGVmdE5vZGUsIHBhdGNoLCBpbmRleClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdhbGsobGVmdE5vZGUsIHJpZ2h0Tm9kZSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzVk5vZGUobGVmdE5vZGUpICYmIGxlZnROb2RlLmNvdW50KSB7XG4gICAgICAgICAgICBpbmRleCArPSBsZWZ0Tm9kZS5jb3VudFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGJDaGlsZHJlbi5tb3Zlcykge1xuICAgICAgICAvLyBSZW9yZGVyIG5vZGVzIGxhc3RcbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guT1JERVIsIGEsIGJDaGlsZHJlbi5tb3ZlcykpXG4gICAgfVxuXG4gICAgcmV0dXJuIGFwcGx5XG59XG5cbi8vIFBhdGNoIHJlY29yZHMgZm9yIGFsbCBkZXN0cm95ZWQgd2lkZ2V0cyBtdXN0IGJlIGFkZGVkIGJlY2F1c2Ugd2UgbmVlZFxuLy8gYSBET00gbm9kZSByZWZlcmVuY2UgZm9yIHRoZSBkZXN0cm95IGZ1bmN0aW9uXG5mdW5jdGlvbiBkZXN0cm95V2lkZ2V0cyh2Tm9kZSwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGlzV2lkZ2V0KHZOb2RlKSkge1xuICAgICAgICBpZiAodHlwZW9mIHZOb2RlLmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCB2Tm9kZSwgbnVsbClcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWTm9kZSh2Tm9kZSkgJiYgdk5vZGUuaGFzV2lkZ2V0cykge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSB2Tm9kZS5jaGlsZHJlblxuICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGNoaWxkLCBwYXRjaCwgaW5kZXgpXG5cbiAgICAgICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSAmJiBjaGlsZC5jb3VudCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IGNoaWxkLmNvdW50XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIENyZWF0ZSBhIHN1Yi1wYXRjaCBmb3IgdGh1bmtzXG5mdW5jdGlvbiB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KSB7XG4gICAgdmFyIG5vZGVzID0gaGFuZGxlVGh1bmsoYSwgYik7XG4gICAgdmFyIHRodW5rUGF0Y2ggPSBkaWZmKG5vZGVzLmEsIG5vZGVzLmIpXG4gICAgaWYgKGhhc1BhdGNoZXModGh1bmtQYXRjaCkpIHtcbiAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guVEhVTkssIG51bGwsIHRodW5rUGF0Y2gpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBoYXNQYXRjaGVzKHBhdGNoKSB7XG4gICAgZm9yICh2YXIgaW5kZXggaW4gcGF0Y2gpIHtcbiAgICAgICAgaWYgKGluZGV4ICE9PSBcImFcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIEV4ZWN1dGUgaG9va3Mgd2hlbiB0d28gbm9kZXMgYXJlIGlkZW50aWNhbFxuZnVuY3Rpb24gaG9va3Modk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChpc1ZOb2RlKHZOb2RlKSkge1xuICAgICAgICBpZiAodk5vZGUuaG9va3MpIHtcbiAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlBST1BTLCB2Tm9kZS5ob29rcywgdk5vZGUuaG9va3MpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodk5vZGUuZGVzY2VuZGFudEhvb2tzKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSB2Tm9kZS5jaGlsZHJlblxuICAgICAgICAgICAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgICAgICAgICAgaG9va3MoY2hpbGQsIHBhdGNoLCBpbmRleClcblxuICAgICAgICAgICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSAmJiBjaGlsZC5jb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSBjaGlsZC5jb3VudFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gTGlzdCBkaWZmLCBuYWl2ZSBsZWZ0IHRvIHJpZ2h0IHJlb3JkZXJpbmdcbmZ1bmN0aW9uIHJlb3JkZXIoYUNoaWxkcmVuLCBiQ2hpbGRyZW4pIHtcblxuICAgIHZhciBiS2V5cyA9IGtleUluZGV4KGJDaGlsZHJlbilcblxuICAgIGlmICghYktleXMpIHtcbiAgICAgICAgcmV0dXJuIGJDaGlsZHJlblxuICAgIH1cblxuICAgIHZhciBhS2V5cyA9IGtleUluZGV4KGFDaGlsZHJlbilcblxuICAgIGlmICghYUtleXMpIHtcbiAgICAgICAgcmV0dXJuIGJDaGlsZHJlblxuICAgIH1cblxuICAgIHZhciBiTWF0Y2ggPSB7fSwgYU1hdGNoID0ge31cblxuICAgIGZvciAodmFyIGtleSBpbiBiS2V5cykge1xuICAgICAgICBiTWF0Y2hbYktleXNba2V5XV0gPSBhS2V5c1trZXldXG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIGFLZXlzKSB7XG4gICAgICAgIGFNYXRjaFthS2V5c1trZXldXSA9IGJLZXlzW2tleV1cbiAgICB9XG5cbiAgICB2YXIgYUxlbiA9IGFDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgYkxlbiA9IGJDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgbGVuID0gYUxlbiA+IGJMZW4gPyBhTGVuIDogYkxlblxuICAgIHZhciBzaHVmZmxlID0gW11cbiAgICB2YXIgZnJlZUluZGV4ID0gMFxuICAgIHZhciBpID0gMFxuICAgIHZhciBtb3ZlSW5kZXggPSAwXG4gICAgdmFyIG1vdmVzID0ge31cbiAgICB2YXIgcmVtb3ZlcyA9IG1vdmVzLnJlbW92ZXMgPSB7fVxuICAgIHZhciByZXZlcnNlID0gbW92ZXMucmV2ZXJzZSA9IHt9XG4gICAgdmFyIGhhc01vdmVzID0gZmFsc2VcblxuICAgIHdoaWxlIChmcmVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgdmFyIG1vdmUgPSBhTWF0Y2hbaV1cbiAgICAgICAgaWYgKG1vdmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IGJDaGlsZHJlblttb3ZlXVxuICAgICAgICAgICAgaWYgKG1vdmUgIT09IG1vdmVJbmRleCkge1xuICAgICAgICAgICAgICAgIG1vdmVzW21vdmVdID0gbW92ZUluZGV4XG4gICAgICAgICAgICAgICAgcmV2ZXJzZVttb3ZlSW5kZXhdID0gbW92ZVxuICAgICAgICAgICAgICAgIGhhc01vdmVzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbW92ZUluZGV4KytcbiAgICAgICAgfSBlbHNlIGlmIChpIGluIGFNYXRjaCkge1xuICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgcmVtb3Zlc1tpXSA9IG1vdmVJbmRleCsrXG4gICAgICAgICAgICBoYXNNb3ZlcyA9IHRydWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoaWxlIChiTWF0Y2hbZnJlZUluZGV4XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZnJlZUluZGV4KytcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZyZWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgICAgIHZhciBmcmVlQ2hpbGQgPSBiQ2hpbGRyZW5bZnJlZUluZGV4XVxuICAgICAgICAgICAgICAgIGlmIChmcmVlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IGZyZWVDaGlsZFxuICAgICAgICAgICAgICAgICAgICBpZiAoZnJlZUluZGV4ICE9PSBtb3ZlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc01vdmVzID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZXNbZnJlZUluZGV4XSA9IG1vdmVJbmRleFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV2ZXJzZVttb3ZlSW5kZXhdID0gZnJlZUluZGV4XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbW92ZUluZGV4KytcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJlZUluZGV4KytcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpKytcbiAgICB9XG5cbiAgICBpZiAoaGFzTW92ZXMpIHtcbiAgICAgICAgc2h1ZmZsZS5tb3ZlcyA9IG1vdmVzXG4gICAgfVxuXG4gICAgcmV0dXJuIHNodWZmbGVcbn1cblxuZnVuY3Rpb24ga2V5SW5kZXgoY2hpbGRyZW4pIHtcbiAgICB2YXIgaSwga2V5c1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG5cbiAgICAgICAgaWYgKGNoaWxkLmtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBrZXlzID0ga2V5cyB8fCB7fVxuICAgICAgICAgICAga2V5c1tjaGlsZC5rZXldID0gaVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGtleXNcbn1cblxuZnVuY3Rpb24gYXBwZW5kUGF0Y2goYXBwbHksIHBhdGNoKSB7XG4gICAgaWYgKGFwcGx5KSB7XG4gICAgICAgIGlmIChpc0FycmF5KGFwcGx5KSkge1xuICAgICAgICAgICAgYXBwbHkucHVzaChwYXRjaClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwcGx5ID0gW2FwcGx5LCBwYXRjaF1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcHBseVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwYXRjaFxuICAgIH1cbn1cbiIsInZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4vaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4vaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuL2lzLXdpZGdldFwiKVxudmFyIGlzVGh1bmsgPSByZXF1aXJlKFwiLi9pcy10aHVua1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhhbmRsZVRodW5rXG5cbmZ1bmN0aW9uIGhhbmRsZVRodW5rKGEsIGIpIHtcbiAgICB2YXIgcmVuZGVyZWRBID0gYVxuICAgIHZhciByZW5kZXJlZEIgPSBiXG5cbiAgICBpZiAoaXNUaHVuayhiKSkge1xuICAgICAgICByZW5kZXJlZEIgPSByZW5kZXJUaHVuayhiLCBhKVxuICAgIH1cblxuICAgIGlmIChpc1RodW5rKGEpKSB7XG4gICAgICAgIHJlbmRlcmVkQSA9IHJlbmRlclRodW5rKGEsIG51bGwpXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgYTogcmVuZGVyZWRBLFxuICAgICAgICBiOiByZW5kZXJlZEJcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbmRlclRodW5rKHRodW5rLCBwcmV2aW91cykge1xuICAgIHZhciByZW5kZXJlZFRodW5rID0gdGh1bmsudm5vZGVcblxuICAgIGlmICghcmVuZGVyZWRUaHVuaykge1xuICAgICAgICByZW5kZXJlZFRodW5rID0gdGh1bmsudm5vZGUgPSB0aHVuay5yZW5kZXIocHJldmlvdXMpXG4gICAgfVxuXG4gICAgaWYgKCEoaXNWTm9kZShyZW5kZXJlZFRodW5rKSB8fFxuICAgICAgICAgICAgaXNWVGV4dChyZW5kZXJlZFRodW5rKSB8fFxuICAgICAgICAgICAgaXNXaWRnZXQocmVuZGVyZWRUaHVuaykpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInRodW5rIGRpZCBub3QgcmV0dXJuIGEgdmFsaWQgbm9kZVwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVuZGVyZWRUaHVua1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc1RodW5rXHJcblxyXG5mdW5jdGlvbiBpc1RodW5rKHQpIHtcclxuICAgIHJldHVybiB0ICYmIHQudHlwZSA9PT0gXCJUaHVua1wiXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc0hvb2tcblxuZnVuY3Rpb24gaXNIb29rKGhvb2spIHtcbiAgICByZXR1cm4gaG9vayAmJiB0eXBlb2YgaG9vay5ob29rID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgIWhvb2suaGFzT3duUHJvcGVydHkoXCJob29rXCIpXG59XG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBpc1ZpcnR1YWxOb2RlXG5cbmZ1bmN0aW9uIGlzVmlydHVhbE5vZGUoeCkge1xuICAgIHJldHVybiB4ICYmIHgudHlwZSA9PT0gXCJWaXJ0dWFsTm9kZVwiICYmIHgudmVyc2lvbiA9PT0gdmVyc2lvblxufVxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaXNWaXJ0dWFsVGV4dFxuXG5mdW5jdGlvbiBpc1ZpcnR1YWxUZXh0KHgpIHtcbiAgICByZXR1cm4geCAmJiB4LnR5cGUgPT09IFwiVmlydHVhbFRleHRcIiAmJiB4LnZlcnNpb24gPT09IHZlcnNpb25cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNXaWRnZXRcblxuZnVuY3Rpb24gaXNXaWRnZXQodykge1xuICAgIHJldHVybiB3ICYmIHcudHlwZSA9PT0gXCJXaWRnZXRcIlxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjFcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1ZIb29rID0gcmVxdWlyZShcIi4vaXMtdmhvb2tcIilcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsTm9kZVxuXG52YXIgbm9Qcm9wZXJ0aWVzID0ge31cbnZhciBub0NoaWxkcmVuID0gW11cblxuZnVuY3Rpb24gVmlydHVhbE5vZGUodGFnTmFtZSwgcHJvcGVydGllcywgY2hpbGRyZW4sIGtleSwgbmFtZXNwYWNlKSB7XG4gICAgdGhpcy50YWdOYW1lID0gdGFnTmFtZVxuICAgIHRoaXMucHJvcGVydGllcyA9IHByb3BlcnRpZXMgfHwgbm9Qcm9wZXJ0aWVzXG4gICAgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuIHx8IG5vQ2hpbGRyZW5cbiAgICB0aGlzLmtleSA9IGtleSAhPSBudWxsID8gU3RyaW5nKGtleSkgOiB1bmRlZmluZWRcbiAgICB0aGlzLm5hbWVzcGFjZSA9ICh0eXBlb2YgbmFtZXNwYWNlID09PSBcInN0cmluZ1wiKSA/IG5hbWVzcGFjZSA6IG51bGxcblxuICAgIHZhciBjb3VudCA9IChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHx8IDBcbiAgICB2YXIgZGVzY2VuZGFudHMgPSAwXG4gICAgdmFyIGhhc1dpZGdldHMgPSBmYWxzZVxuICAgIHZhciBkZXNjZW5kYW50SG9va3MgPSBmYWxzZVxuICAgIHZhciBob29rc1xuXG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcGVydGllcykge1xuICAgICAgICBpZiAocHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShwcm9wTmFtZSkpIHtcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbcHJvcE5hbWVdXG4gICAgICAgICAgICBpZiAoaXNWSG9vayhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWhvb2tzKSB7XG4gICAgICAgICAgICAgICAgICAgIGhvb2tzID0ge31cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBob29rc1twcm9wTmFtZV0gPSBwcm9wZXJ0eVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSkge1xuICAgICAgICAgICAgZGVzY2VuZGFudHMgKz0gY2hpbGQuY291bnQgfHwgMFxuXG4gICAgICAgICAgICBpZiAoIWhhc1dpZGdldHMgJiYgY2hpbGQuaGFzV2lkZ2V0cykge1xuICAgICAgICAgICAgICAgIGhhc1dpZGdldHMgPSB0cnVlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZGVzY2VuZGFudEhvb2tzICYmIChjaGlsZC5ob29rcyB8fCBjaGlsZC5kZXNjZW5kYW50SG9va3MpKSB7XG4gICAgICAgICAgICAgICAgZGVzY2VuZGFudEhvb2tzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFoYXNXaWRnZXRzICYmIGlzV2lkZ2V0KGNoaWxkKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjaGlsZC5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBoYXNXaWRnZXRzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb3VudCA9IGNvdW50ICsgZGVzY2VuZGFudHNcbiAgICB0aGlzLmhhc1dpZGdldHMgPSBoYXNXaWRnZXRzXG4gICAgdGhpcy5ob29rcyA9IGhvb2tzXG4gICAgdGhpcy5kZXNjZW5kYW50SG9va3MgPSBkZXNjZW5kYW50SG9va3Ncbn1cblxuVmlydHVhbE5vZGUucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsTm9kZS5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbE5vZGVcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cblZpcnR1YWxQYXRjaC5OT05FID0gMFxuVmlydHVhbFBhdGNoLlZURVhUID0gMVxuVmlydHVhbFBhdGNoLlZOT0RFID0gMlxuVmlydHVhbFBhdGNoLldJREdFVCA9IDNcblZpcnR1YWxQYXRjaC5QUk9QUyA9IDRcblZpcnR1YWxQYXRjaC5PUkRFUiA9IDVcblZpcnR1YWxQYXRjaC5JTlNFUlQgPSA2XG5WaXJ0dWFsUGF0Y2guUkVNT1ZFID0gN1xuVmlydHVhbFBhdGNoLlRIVU5LID0gOFxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxQYXRjaFxuXG5mdW5jdGlvbiBWaXJ0dWFsUGF0Y2godHlwZSwgdk5vZGUsIHBhdGNoKSB7XG4gICAgdGhpcy50eXBlID0gTnVtYmVyKHR5cGUpXG4gICAgdGhpcy52Tm9kZSA9IHZOb2RlXG4gICAgdGhpcy5wYXRjaCA9IHBhdGNoXG59XG5cblZpcnR1YWxQYXRjaC5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxQYXRjaC5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbFBhdGNoXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxUZXh0XG5cbmZ1bmN0aW9uIFZpcnR1YWxUZXh0KHRleHQpIHtcbiAgICB0aGlzLnRleHQgPSBTdHJpbmcodGV4dClcbn1cblxuVmlydHVhbFRleHQucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsVGV4dC5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbFRleHRcIlxuIiwidmFyIG5hdGl2ZUlzQXJyYXkgPSBBcnJheS5pc0FycmF5XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG5cbm1vZHVsZS5leHBvcnRzID0gbmF0aXZlSXNBcnJheSB8fCBpc0FycmF5XG5cbmZ1bmN0aW9uIGlzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiXG59XG4iLCJ2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG5cbm1vZHVsZS5leHBvcnRzID0gaXNTdHJpbmdcblxuZnVuY3Rpb24gaXNTdHJpbmcob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IFN0cmluZ11cIlxufVxuIiwidmFyIHBhdGNoID0gcmVxdWlyZShcInZkb20vcGF0Y2hcIilcblxubW9kdWxlLmV4cG9ydHMgPSBwYXRjaFxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyICAgPSByZXF1aXJlKCcuL2hlbHBlcicpO1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3JlYXRlOiBmdW5jdGlvbihuYW1lLCBwcm90bykge1xuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHByb3BlcnR5IHtEb2N1bWVudH0gX2RvY1xuICAgICAqL1xuICAgIHByb3RvLl9kb2MgPSBkb2N1bWVudC5fY3VycmVudFNjcmlwdCA/IGRvY3VtZW50Ll9jdXJyZW50U2NyaXB0Lm93bmVyRG9jdW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBkb2N1bWVudC5jdXJyZW50U2NyaXB0Lm93bmVyRG9jdW1lbnQ7XG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIHtGdW5jdGlvbn0gX2NyZWF0ZWRcbiAgICAgKi9cbiAgICBwcm90by5fY3JlYXRlZCA9IGhlbHBlci5pcy5mdW5jKHByb3RvLmNyZWF0ZWRDYWxsYmFjaykgPyBwcm90by5jcmVhdGVkQ2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBoZWxwZXIubm9vcDtcbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBtZXRob2Qge0Z1bmN0aW9ufSBfYXR0YWNoZWRcbiAgICAgKi9cbiAgICBwcm90by5fYXR0YWNoZWQgPSBoZWxwZXIuaXMuZnVuYyhwcm90by5hdHRhY2hlZENhbGxiYWNrKSA/IHByb3RvLmF0dGFjaGVkQ2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGhlbHBlci5ub29wO1xuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQG1ldGhvZCB7RnVuY3Rpb259IF9kZXRhY2hlZFxuICAgICAqL1xuICAgIHByb3RvLl9kZXRhY2hlZCA9IGhlbHBlci5pcy5mdW5jKHByb3RvLmRldGFjaGVkQ2FsbGJhY2spID8gcHJvdG8uZGV0YWNoZWRDYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogaGVscGVyLm5vb3A7XG4gICAgLyoqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAbWV0aG9kIHtGdW5jdGlvbn0gX2F0dHJDaGFuZ2VkXG4gICAgICovXG4gICAgcHJvdG8uX2F0dHJDaGFuZ2VkID0gaGVscGVyLmlzLmZ1bmMocHJvdG8uYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKSA/IHByb3RvLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBoZWxwZXIubm9vcDtcbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBwcm9wZXJ0eSB7U3RyaW5nfSBfaHRtbFxuICAgICAqL1xuICAgIHByb3RvLl9odG1sID0gJyc7XG5cbiAgICAvKipcbiAgICAgKiBAcHJvcGVydHkge0VsZW1lbnR9IHJvb3RcbiAgICAgKi9cbiAgICBwcm90by5yb290ID0gbnVsbDtcblxuICAgIC8vIGRvbSByZWFkeSByZXF1aXJlZFxuICAgIGhlbHBlci5yZWFkeShmdW5jdGlvbigpIHtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9IHByb3RvLl9kb2MucXVlcnlTZWxlY3RvcignW2NsLWVsZW1lbnQ9XCInK25hbWUrJ1wiXScpO1xuICAgICAgcHJvdG8uX2h0bWwgID0gdGVtcGxhdGUuaW5uZXJIVE1MO1xuICAgIH0pO1xuXG4gICAgLy8gbWl4IHRvIHByb3RvXG4gICAgdmFyIG1peGlucyA9IHByb3RvLm1peGluIHx8IFtdO1xuICAgIG1peGlucy5mb3JFYWNoKGZ1bmN0aW9uKG1peGluKSB7XG4gICAgICBoZWxwZXIubWl4KHByb3RvLCBtaXhpbik7XG4gICAgfSk7XG5cbiAgICAvLyBtaXggY2xheWx1bXAgaW1wbGVtZW50YXRpb25cbiAgICBoZWxwZXIubWl4KHByb3RvLCBDbGF5TWV0aG9kcyk7XG5cbiAgICAvLyBUT0RPIGV4dGVuZHMgZWxlbWVudFxuICAgIHJldHVybiBoZWxwZXIubWl4KE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKSwgcHJvdG8pO1xuICB9XG59O1xuXG52YXIgQ2xheU1ldGhvZHMgPSB7XG4gIC8qKlxuICAgKlxuICAgKi9cbiAgY3JlYXRlZENhbGxiYWNrIDogZnVuY3Rpb24oKSB7XG4gICAgLy8gY3JlYXRlIHZpcnR1YWwgdGVtcGxhdGUgJiBhY3R1YWwgZG9tXG4gICAgdGhpcy5jcmVhdGVTaGFkb3dSb290KCk7XG5cbiAgICAvLyByZXNvbHZlIHVzZSBpbmplY3Rpb25cbiAgICB2YXIgZmFjdG9yaWVzID0gaGVscGVyLm1peCh7fSwgdGhpcy51c2UgfHwge30pLCAvLyBjbG9uZSFcbiAgICAgICAga2V5cyAgICAgID0gT2JqZWN0LmtleXMoZmFjdG9yaWVzKSxcbiAgICAgICAgaSA9IDAsIGFsaWFzO1xuXG4gICAgd2hpbGUgKChhbGlhcyA9IGtleXNbaSsrXSkpIHtcbiAgICAgIHRoaXMudXNlW2FsaWFzXSA9IGZhY3Rvcmllc1thbGlhc10odGhpcyk7XG4gICAgfVxuXG4gICAgdGhpcy5fY3JlYXRlZCgpO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgYXR0YWNoZWRDYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZS5jcmVhdGUodGhpcy5faHRtbCwgdGhpcyk7XG4gICAgdGhpcy5yb290ICAgICA9IHRoaXMudGVtcGxhdGUuY3JlYXRlRWxlbWVudCh0aGlzLl9kb2MpO1xuICAgIHRoaXMuc2hhZG93Um9vdC5hcHBlbmRDaGlsZCh0aGlzLnJvb3QpO1xuICAgIHRoaXMudGVtcGxhdGUuZHJhd0xvb3AodGhpcy5yb290KTtcbiAgICB0aGlzLl9hdHRhY2hlZCgpO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgZGV0YWNoZWRDYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGVtcGxhdGUuZGVzdHJveSgpO1xuICAgIHRoaXMuX2RldGFjaGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sgOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9hdHRyQ2hhbmdlZCgpO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyID0gcmVxdWlyZSgnLi4vaGVscGVyJyk7XG5cbi8vIHRlc3Qgc2FtcGxlXG5mdW5jdGlvbiBIdHRwKGN0eCkge1xuICB0aGlzLmNvbnRleHQgPSBjdHg7XG59XG5cbmhlbHBlci5taXgoSHR0cC5wcm90b3R5cGUsIHtcbiAgZ2V0OiBmdW5jdGlvbih1cmwpIHtcblxuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmYWN0b3J5KGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBIdHRwKGNvbnRleHQpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAcGFyYW0ge09iamVjdH0gZ2l2ZW5cbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXNzZWRcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gbWl4KGdpdmVuLCBwYXNzZWQpIHtcbiAgdmFyIGkgPSAwLCBhcnkgPSBPYmplY3Qua2V5cyhwYXNzZWQpLCBpeiA9IGFyeS5sZW5ndGgsIHByb3A7XG4gIGZvciAoOyBpPGl6OyBpKyspIHtcbiAgICBwcm9wID0gYXJ5W2ldO1xuICAgIGdpdmVuW3Byb3BdID0gcGFzc2VkW3Byb3BdO1xuICB9XG4gIHJldHVybiBnaXZlbjtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IGhhbmRsZXJcbiAqL1xuZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGhhbmRsZXJcbiAqL1xuZnVuY3Rpb24gcmVhZHkoaGFuZGxlcikge1xuICBpZiAoRkxHX0RPTV9BTFJFQURZKSB7XG4gICAgaGFuZGxlcigpO1xuICB9IGVsc2Uge1xuICAgIFNUQUNLX1JFQURZX0hBTkRMRVJTLnB1c2goaGFuZGxlcik7XG4gIH1cbn1cblxudmFyIEZMR19ET01fQUxSRUFEWSAgICAgID0gZmFsc2UsXG4gICAgU1RBQ0tfUkVBRFlfSEFORExFUlMgPSBbXTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICBGTEdfRE9NX0FMUkVBRFkgPSB0cnVlO1xuICB2YXIgaSA9IDAsIHJlYWR5O1xuICB3aGlsZSAocmVhZHkgPSBTVEFDS19SRUFEWV9IQU5ETEVSU1tpKytdKSB7XG4gICAgcmVhZHkoKTtcbiAgfVxufSwgZmFsc2UpO1xuXG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lICA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbm9vcCAgICAgIDogZnVuY3Rpb24gbm9vcCgpIHt9LFxuICBtaXggICAgICAgOiBtaXgsXG4gIHJlYWR5ICAgICA6IHJlYWR5LFxuICBpcyAgICAgICAgOiB7XG4gICAgZnVuYyA6IGlzRnVuY3Rpb25cbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gdGVzdCBzYW1wbGVcbm1vZHVsZS5leHBvcnRzID0ge1xuICBsb2c6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nLmFwcGx5KGFyZ3VtZW50cyk7XG4gIH0sXG4gIGRlYnVnOiBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmRlYnVnLmFwcGx5KGFyZ3VtZW50cyk7XG4gIH0sXG4gIGluZm86IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUuaW5mby5hcHBseShhcmd1bWVudHMpO1xuICB9LFxuICB3YXJuOiBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLndhcm4uYXBwbHkoYXJndW1lbnRzKTtcbiAgfSxcbiAgZmF0YWw6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUuZXJyb3IuYXBwbHkoYXJndW1lbnRzKTtcbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGVsZW1lbnQgPSByZXF1aXJlKCcuL2VsZW1lbnQnKTtcblxuZnVuY3Rpb24gQ2xheVJlZ2lzdGVyKG5hbWUsIHByb3RvKSB7XG4gIGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudChuYW1lLCB7XG4gICAgcHJvdG90eXBlOiBlbGVtZW50LmNyZWF0ZShuYW1lLCBwcm90bylcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ2xheVJlZ2lzdGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaCAgICAgICAgICA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL2gnKTtcbnZhciBkaWZmICAgICAgID0gcmVxdWlyZSgndmlydHVhbC1kb20vZGlmZicpO1xudmFyIHBhdGNoICAgICAgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9wYXRjaCcpO1xudmFyIGh0bWxwYXJzZXIgPSByZXF1aXJlKFwiaHRtbHBhcnNlclwiKTtcbnZhciBoZWxwZXIgICAgID0gcmVxdWlyZShcIi4vaGVscGVyXCIpO1xudmFyIGNyZWF0ZSAgICAgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9jcmVhdGUtZWxlbWVudCcpO1xuXG52YXIgUkVYX0lOVEVSUE9MQVRFICA9IC9cXHtcXHtbXnt9XSp9fS9nO1xudmFyIFJFWF9FU0NBUEVfU1RBUlQgPSAve3svZztcbnZhciBSRVhfRVNDQVBFX0VORCAgID0gL319L2c7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjcmVhdGU6IGZ1bmN0aW9uKGh0bWwsIHNjb3BlKSB7XG4gICAgcmV0dXJuIG5ldyBDbGF5VGVtcGxhdGUoaHRtbCwgc2NvcGUpO1xuICB9XG59O1xuXG4vKipcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gQ2xheVRlbXBsYXRlKGh0bWwsIHNjb3BlKSB7XG4gIHRoaXMudG1wbCAgPSBodG1sO1xuICB0aGlzLnNjb3BlID0gc2NvcGU7XG5cbiAgdGhpcy5oYW5kbGVyID0gbmV3IGh0bWxwYXJzZXIuRGVmYXVsdEhhbmRsZXIoZnVuY3Rpb24gKGVyciwgZG9tKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgIH1cbiAgfSwge1xuICAgIGVuZm9yY2VFbXB0eVRhZ3MgOiB0cnVlLFxuICAgIGlnbm9yZVdoaXRlc3BhY2UgOiB0cnVlLFxuICAgIHZlcmJvc2UgICAgICAgICAgOiBmYWxzZVxuICB9KTtcbiAgdGhpcy5wYXJzZXIgPSBuZXcgaHRtbHBhcnNlci5QYXJzZXIodGhpcy5oYW5kbGVyKTtcblxuICB0aGlzLmluaXQoKTtcbn1cblxuaGVscGVyLm1peChDbGF5VGVtcGxhdGUucHJvdG90eXBlLCB7XG4gIC8qKlxuICAgKiBAcHJvcGVydHkge09iamVjdH0gc2NvcGVcbiAgICovXG4gIHNjb3BlOiB7fSxcbiAgLyoqXG4gICAqIEBwcm9wZXJ0eSB7U3RyaW5nfSB0bXBsXG4gICAqL1xuICB0bXBsOiAnJyxcbiAgLyoqXG4gICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzdHJ1Y3RcbiAgICovXG4gIHN0cnVjdDoge30sXG4gIC8qKlxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBwYXJzZXJcbiAgICovXG4gIHBlcnNlcjogbnVsbCxcbiAgLyoqXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGhhbmRsZXJcbiAgICovXG4gIGhhbmRsZXIgOiBudWxsLFxuICAvKipcbiAgICogQHByb3BlcnR5IHtWVHJlZX0gY3VycmVudFZUcmVlXG4gICAqL1xuICBjdXJyZW50VlRyZWU6IG51bGwsXG4gIC8qKlxuICAgKiBAcHJvcGVydHkge0FycmF5fSBkaWZmUXVldWVcbiAgICovXG4gIGRpZmZRdWV1ZTogW10sXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wYXJzZUh0bWwoKTtcbiAgICB0aGlzLm9ic2VydmVTY29wZSgpXG4gIH0sXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgcGFyc2VIdG1sOiBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLnRpbWUoJ3BhcnNlIGh0bWwnKTtcbiAgICB0aGlzLnBhcnNlci5wYXJzZUNvbXBsZXRlKHRoaXMudG1wbCk7XG4gICAgY29uc29sZS50aW1lRW5kKCdwYXJzZSBodG1sJyk7XG5cbiAgICBpZiAodGhpcy5oYW5kbGVyLmRvbS5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBFcnJvcignVGVtcGxhdGUgbXVzdCBoYXZlIGV4YWN0bHkgb25lIHJvb3QgZWxlbWVudC4gd2FzOiAnICsgdGhpcy50bXBsKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5zdHJ1Y3QgPSB0aGlzLmhhbmRsZXIuZG9tWzBdO1xuICB9LFxuICAvKipcbiAgICogQHByb3BlcnR5IHtPYmplY3R9IHJvb3RPYnNlcnZlVGFyZ2V0XG4gICAqL1xuICByb290T2JzZXJ2ZVRhcmdldDoge30sXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgb2JzZXJ2ZVNjb3BlOiBmdW5jdGlvbigpIHtcbiAgICAvLyBUT0RPIHJlZmFjdG9yXG4gICAgdmFyIG1hdGNoZXMgPSB0aGlzLnRtcGwubWF0Y2goUkVYX0lOVEVSUE9MQVRFKSxcbiAgICAgICAgdW5pcSA9IHt9LCBpID0gMCwgc3ltYm9sO1xuXG4gICAgLy8gdW5pcXVlIGxpc3RcbiAgICB3aGlsZSAoKHN5bWJvbCA9IG1hdGNoZXNbaSsrXSkpIHtcbiAgICAgIHN5bWJvbCA9IHN5bWJvbC5zbGljZSgyLCAtMik7IC8vICd7e2Zvby5iYXJ9fScgLT4gJ2Zvby5iYXInXG4gICAgICBpZiAoIXVuaXFbc3ltYm9sXSkge1xuICAgICAgICB1bmlxW3N5bWJvbF0gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGludGVycG9sYXRlIHBhdGhcbiAgICBPYmplY3Qua2V5cyh1bmlxKS5tYXAoZnVuY3Rpb24oc3ltYm9sUGF0aCkge1xuICAgICAgdmFyIGhvc3QgICAgID0gdGhpcy5zY29wZSxcbiAgICAgICAgICB0b2tlbnMgICA9IHN5bWJvbFBhdGguc3BsaXQoJy4nKSxcbiAgICAgICAgICBvYnNlcnZlciA9IHRoaXMuaW52YWxpZGF0ZS5iaW5kKHRoaXMpO1xuXG4gICAgICBpZiAodG9rZW5zLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgLy8gb2JzZXJ2ZSBob3N0IG9iamVjdFxuXG4gICAgICAgIC8vIHJlbW92ZSB0YXJnZXQgcHJvcGVydHkgbmFtZTtcbiAgICAgICAgdG9rZW5zLnNwbGljZSgtMSk7XG5cbiAgICAgICAgLy8gZmlsbCBvYmplY3RcbiAgICAgICAgdmFyIGkgPSAwLCB0b2tlbjtcbiAgICAgICAgd2hpbGUgKCh0b2tlbiA9IHRva2Vuc1tpKytdKSkge1xuICAgICAgICAgIGhvc3RbdG9rZW5dIHx8IChob3N0W3Rva2VuXSA9IHt9KTtcbiAgICAgICAgICBob3N0ID0gaG9zdFt0b2tlbl07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBhdm9pZCBkdXBsaWNhdGUgb2JzZXJ2ZVxuICAgICAgICBpZiAoIWhvc3QuX19vYnNlcnZlZCkge1xuICAgICAgICAgIGhvc3QuX19vYnNlcnZlZCA9IHRydWU7XG4gICAgICAgICAgT2JqZWN0Lm9ic2VydmUoaG9zdCwgb2JzZXJ2ZXIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyByZWdpc3RlciByb290IHRhcmdldCBwcm9wXG4gICAgICAgIHRoaXMucm9vdE9ic2VydmVUYXJnZXRbdG9rZW5zWzBdXSA9IHRydWU7XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIC8vIG9ic2VydmUgcm9vdCBzY29wZVxuICAgIE9iamVjdC5vYnNlcnZlKHRoaXMuc2NvcGUsIGZ1bmN0aW9uKGNoYW5nZXMpIHtcbiAgICAgIHZhciBpID0gMCwgcHJvcDtcbiAgICAgIHdoaWxlICgocHJvcCA9IGNoYW5nZXNbaSsrXSkpIHtcbiAgICAgICAgaWYgKHRoaXMucm9vdE9ic2VydmVUYXJnZXRbcHJvcC5uYW1lXSkge1xuICAgICAgICAgIHRoaXMuaW52YWxpZGF0ZSgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyB7VlRyZWV9XG4gICAqL1xuICBjcmVhdGVWVHJlZTogZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS50aW1lKCdjb252ZXJ0IHZ0cmVlJyk7XG4gICAgdmFyIHJldCA9IHRoaXMuY3VycmVudFZUcmVlID0gdGhpcy5jb252ZXJ0UGFyc2VkRG9tVG9WVHJlZSh0aGlzLnN0cnVjdCk7XG4gICAgY29uc29sZS50aW1lRW5kKCdjb252ZXJ0IHZ0cmVlJyk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcbiAgLyoqXG4gICAqL1xuICBjcmVhdGVFbGVtZW50OiBmdW5jdGlvbihkb2MpIHtcbiAgICByZXR1cm4gY3JlYXRlKHRoaXMuY3JlYXRlVlRyZWUoKSwge1xuICAgICAgZG9jdW1lbnQ6IGRvY1xuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBfaW52YWxpZGF0ZWRcbiAgICovXG4gIF9pbnZhbGlkYXRlZDogZmFsc2UsXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgaW52YWxpZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2ludmFsaWRhdGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2ludmFsaWRhdGVkID0gdHJ1ZTtcbiAgICBzZXRUaW1lb3V0KHRoaXMuX3VwZGF0ZS5iaW5kKHRoaXMpLCA0KTtcbiAgfSxcbiAgLyoqXG4gICAqXG4gICAqL1xuICBfdXBkYXRlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgY3VycmVudCA9IHRoaXMuY3VycmVudFZUcmVlLFxuICAgICAgICB1cGRhdGVkID0gdGhpcy5jb252ZXJ0UGFyc2VkRG9tVG9WVHJlZSh0aGlzLnN0cnVjdCk7XG5cbiAgICBjb25zb2xlLnRpbWUoJ2NvbXB1dGUgZGlmZicpO1xuICAgIHRoaXMuZGlmZlF1ZXVlID0gZGlmZihjdXJyZW50LCB1cGRhdGVkKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoJ2NvbXB1dGUgZGlmZicpO1xuICAgIHRoaXMuY3VycmVudFZUcmVlID0gdXBkYXRlZDtcblxuICAgIHRoaXMuX2ludmFsaWRhdGVkID0gZmFsc2U7XG4gIH0sXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFJvb3RcbiAgICovXG4gIGRyYXdMb29wOiBmdW5jdGlvbih0YXJnZXRSb290KSB7XG4gICAgdmFyIHBhdGNoRE9NID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5kaWZmUXVldWUpIHtcbiAgICAgICAgY29uc29sZS50aW1lKCdhcHBseSBwYXRjaCcpO1xuICAgICAgICBwYXRjaCh0YXJnZXRSb290LCB0aGlzLmRpZmZRdWV1ZSk7XG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgnYXBwbHkgcGF0Y2gnKTtcbiAgICAgICAgdGhpcy5kaWZmUXVldWUgPSBudWxsO1xuICAgICAgfVxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShwYXRjaERPTSk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgcGF0Y2hET00oKTtcbiAgfSxcbiAgLyoqXG4gICAqXG4gICAqL1xuICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNjb3BlID0gdGhpcy50bXBsID0gdGhpcy5zdHJ1Y3QgPSB0aGlzLnBhcnNlciA9IHRoaXMuaGFuZGxlciA9IG51bGw7XG4gIH0sXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gZG9tXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgY29udmVydFBhcnNlZERvbVRvVlRyZWUgOiBmdW5jdGlvbihkb20pIHtcbiAgICB2YXIgdGFnICAgICAgPSBkb20ubmFtZSxcbiAgICAgICAgdHlwZSAgICAgPSBkb20udHlwZSxcbiAgICAgICAgZGF0YSAgICAgPSBkb20uZGF0YSxcbiAgICAgICAgYXR0cnMgICAgPSBkb20uYXR0cmlicyB8fCB7fSxcbiAgICAgICAgY2hpbGRyZW4gPSBkb20uY2hpbGRyZW4gfHwgW10sXG4gICAgICAgIHN0eWxlICAgID0ge30sXG4gICAgICAgIGtleXMsIGtleSwgaSA9IDA7XG5cbiAgICBzd2l0Y2godHlwZSkge1xuICAgICAgY2FzZSAndGFnJzpcbiAgICAgICAgLy8gc3R5bGVzXG4gICAgICAgIGlmIChhdHRycy5zdHlsZSkge1xuICAgICAgICAgIHN0eWxlID0gYXBwbHlJbnRlcnBvbGF0ZVZhbHVlcyhkYXRhLCB0aGlzLnNjb3BlKTtcbiAgICAgICAgICBzdHlsZSA9IGNvbnZlcnRDc3NTdHJpbmdUb09iamVjdChzdHlsZSk7XG4gICAgICAgICAgZGVsZXRlIGF0dHJzLnN0eWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYXR0cmlidXRlc1xuICAgICAgICBrZXlzID0gT2JqZWN0LmtleXMoYXR0cnMpO1xuICAgICAgICB3aGlsZSAoKGtleSA9IGtleXNbaSsrXSkpIHtcbiAgICAgICAgICBhdHRyc1trZXldID0gYXBwbHlJbnRlcnBvbGF0ZVZhbHVlcyhhdHRyc1trZXldLCB0aGlzLnNjb3BlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNyZWF0ZSB2dHJlZVxuICAgICAgICByZXR1cm4gaCh0YWcsIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMgOiBhdHRycyxcbiAgICAgICAgICAgIHN0eWxlICAgICAgOiBzdHlsZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgY2hpbGRyZW4ubWFwKHRoaXMuY29udmVydFBhcnNlZERvbVRvVlRyZWUsIHRoaXMpLmZpbHRlcihmdW5jdGlvbih2KSB7IHJldHVybiAhIXY7IH0pXG4gICAgICAgICk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd0ZXh0JzpcbiAgICAgICAgZGF0YSA9IGFwcGx5SW50ZXJwb2xhdGVWYWx1ZXMoZGF0YSwgdGhpcy5zY29wZSk7XG4gICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdjb21tZW50JzpcbiAgICAgICAgLy8gVE9ETyBjcmVhdGUgY29tbWVudCBub2RlP1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gYXBwbHlJbnRlcnBvbGF0ZVZhbHVlcyhzdHIsIG9iaikge1xuICB2YXIgbWF0Y2hlcyA9IHN0ci5tYXRjaChSRVhfSU5URVJQT0xBVEUpLFxuICAgICAgaSA9IDAsIG5lZWRsZSwgcGF0aCwgdmFsdWU7XG5cbiAgaWYgKG1hdGNoZXMpIHtcbiAgICB3aGlsZSAoKG5lZWRsZSA9IG1hdGNoZXNbaSsrXSkpIHtcbiAgICAgIHBhdGggID0gbmVlZGxlLnNsaWNlKDIsIC0yKTsgLy8gJ3t7Zm9vLmJhcn19JyAtPiAnZm9vLmJhcidcbiAgICAgIHZhbHVlID0gZ2V0VmFsdWVGcm9tRG90dGVkUGF0aChwYXRoLCBvYmopO1xuICAgICAgc3RyID0gc3RyLnJlcGxhY2UobmVlZGxlLCBlc2NhcGVJbnRlcnBvbGF0ZVN5bWJvbCh2YWx1ZSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVJbnRlcnBvbGF0ZVN5bWJvbCh0ZXh0KSB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoUkVYX0VTQ0FQRV9TVEFSVCwgJ1xcXFx7XFxcXHsnKS5yZXBsYWNlKFJFWF9FU0NBUEVfRU5ELCAnXFxcXH1cXFxcfScpO1xufVxuXG4vLyBUT0RPIGFkZCBjYWNoZSBtYXA/XG5mdW5jdGlvbiBnZXRWYWx1ZUZyb21Eb3R0ZWRQYXRoKHBhdGgsIG9iaikge1xuICB2YXIgc3RhY2sgPSBwYXRoLnNwbGl0KCcuJyksXG4gICAgICByZXQgICA9IG9iaixcbiAgICAgIGkgPSAwLCBrZXk7XG5cbiAgd2hpbGUgKChrZXkgPSBzdGFja1tpKytdKSkge1xuICAgIHJldCA9IHJldFtrZXldO1xuICAgIGlmIChyZXQgPT0gbnVsbCkgeyAvLyB1bmRlZmluZWQgfHwgbnVsbFxuICAgICAgcmV0ID0gJyc7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gY29udmVydENzc1N0cmluZ1RvT2JqZWN0KGNzc1N0cikge1xuICB2YXIgY3NzU3RyaW5ncyA9IGNzc1N0ci5yZXBsYWNlKC9cXHMvZywgJycpLnNwbGl0KCc7JyksXG4gICAgICByZXRTdHlsZSAgID0ge30sXG4gICAgICBpID0gMCwgcHJvcF92YWx1ZTtcblxuICB3aGlsZSAoKHByb3BfdmFsdWUgPSBjc3NTdHJpbmdzW2krK10pKSB7XG4gICAgcHJvcF92YWx1ZSA9IHByb3BfdmFsdWUuc3BsaXQoJzonKTtcbiAgICByZXRTdHlsZVtwcm9wX3ZhbHVlWzBdXSA9IHByb3BfdmFsdWVbMV07XG4gIH1cbiAgcmV0dXJuIHJldFN0eWxlO1xufVxuIl19
