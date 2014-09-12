(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var ClayRegister = require('./src/register');
var helper       = require('./src/helper');

window.Claylump = helper.mix(ClayRegister, {

  Template       : require('./src/template'),
  TemplateHelper : require('./src/template-helper'),
  Element        : require('./src/element'),
  Observer       : require('./src/observer'),
  Event          : require('./src/event'),
  Helper         : require('./src/helper'),

  modules : {
    http : require('./src/modules/http')
  }
});

},{"./src/element":33,"./src/event":34,"./src/helper":35,"./src/modules/http":36,"./src/observer":37,"./src/register":38,"./src/template":41,"./src/template-helper":40}],2:[function(require,module,exports){

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

}).call(this,"/node_modules/htmlParser/lib/htmlparser.js","/node_modules/htmlParser/lib")
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

module.exports = {
  /**
   * @type {RegExp}
   */
  REX_INTERPOLATE_SYMBOL: /{{[^{}]+}}/g,
  /**
   * @type {RegExp}
   */
  REX_REPEAT_SYMBOL: /{{(\w+)\sin\s([\w\.]+)}}/,
  /**
   * @type {RegExp}
   */
  STR_REPEAT_ATTRIBUTE: 'cl-repeat'
};

},{}],33:[function(require,module,exports){
'use strict';

var helper   = require('./helper');
var template = require('./template');

/**
 * @class ClayElement
 */
module.exports = {
  /**
   * @static
   * @param {String} name
   * @param {Object} proto
   * @returns {ClayElement}
   */
  create: function(name, proto) {

    var defaults = {
      /**
       * @private
       * @property {Document} _doc
       */
      _doc:  document._currentScript ? document._currentScript.ownerDocument
                                     : document.currentScript ? document.currentScript.ownerDocument
                                                              : document,
      /**
       * @private
       * @method {Function} _created
       */
      _created: helper.isFunction(proto.createdCallback) ? proto.createdCallback
                                                         : helper.noop,
      /**
       * @private
       * @method {Function} _attached
       */
      _attached: helper.isFunction(proto.attachedCallback) ? proto.attachedCallback
                                                           : helper.noop,
      /**
       * @private
       * @method {Function} _detached
       */
      _detached: helper.isFunction(proto.detachedCallback) ? proto.detachedCallback
                                                           : helper.noop,
      /**
       * @private
       * @method {Function} _attrChanged
       */
      _attrChanged: helper.isFunction(proto.attributeChangedCallback) ? proto.attributeChangedCallback
                                                                      : helper.noop,
      /**
       * @private
       * @property {String} _html
       */
      _html: '',

      /**
       * @property {Element} root
       */
      root: null,

      /**
       * @property {ClayTemplate} template
       */
      template: null,

      /**
       * @property {Object} scope
       */
      scope : {},

      /**
       * @property {Object} events
       */
      events: {},

      /**
       * @property {Object} use
       */
      use: {}
    };

    // mix claylump implementation
    helper.mix(helper.mix(proto, defaults), ClayElement.prototype, true);

    // dom ready required
    helper.ready(function() {
      var template = proto._doc.querySelector('[cl-element="'+name+'"]');
      proto._html  = template ? template.innerHTML : '';
    });

    // extends element
    var baseElement, extendedScope;
    if (proto.extends) {
      // FIXME cannot use `is="x-child"` in `<template>`

      // element instance -> constructor -> create host object
      baseElement = Object.create(proto._doc.createElement(proto.extends).constructor);

      if (helper.isCustomElementName(proto.extends)) {
        // extends custom element
        // FIXME create baseElements prototype by deeply clone
        extendedScope   = helper.mix(helper.clone(baseElement.prototype.scope), proto.scope, true);
        proto           = helper.mix(helper.clone(baseElement.prototype),       proto,       true);
        proto.scope     = extendedScope;
        proto.__super__ = baseElement.prototype;
        baseElement     = HTMLElement;
      }

    } else {
      // new custom element
      baseElement = HTMLElement;
    }

    return helper.mix(Object.create(baseElement.prototype), proto);
  }
};

function ClayElement() {
  // don't call directly
}

helper.mix(ClayElement.prototype, {
  /**
   *
   * @private
   */
  _injectUseObject: function() {
    var self = this,
        keys = Object.keys(this.use || {}), i = 0, alias;

    while ((alias = keys[i++])) {
      if (self[alias]) {
        throw new Error('Conflict assign property `' + alias + '`!')
      }
      self[alias] = this.use[alias](this);
    }

    this.use = null;
  },

  /**
   * @private
   */
  _cloneScopeObjects: function() {
    var scope = this.scope,
        keys = Object.keys(scope), i = 0, key;

    while ((key = keys[i++])) {
      if (typeof scope[key] === 'object') {
        // FIXME create own object|array by deeply clone
        scope[key] = helper.clone(scope[key]);
      }
    }
  },

  /**
   * shorthand of template.invalidate
   */
  invalidate: function() {
    this.template.invalidate();
  },

  /**
   *
   */
  createdCallback : function() {

    // resolve use injection
    this._injectUseObject();

    // clone objects
    this._cloneScopeObjects();

    // original
    this._created();
  },

  /**
   *
   */
  attachedCallback : function() {

    // create virtual template & actual dom
    this.createShadowRoot();
    this.template = template.create(this._html, this.scope);
    this.root     = this.template.createElement(this._doc);

    if (this.root) {
      this.shadowRoot.appendChild(this.root);
      this.template.drawLoop(this.root);
    }

    // original
    this._attached();
  },

  /**
   *
   */
  detachedCallback : function() {
    this.template.destroy();

    // original
    this._detached();
  },

  /**
   *
   */
  attributeChangedCallback : function() {
    // original
    this._attrChanged();
  },

  /**
   * @param {String} methodName
   * @param {*} ...
   */
  super: function() {
    if (!this.__super__) {
      throw new Error('This element does not have the `__super__`');
    }

    var origArgs    = helper.toArray(arguments),
        methodName  = origArgs.slice(0, 1),
        passArgs    = origArgs.slice(1),
        superMethod = this.__super__[methodName];

    if (helper.isFunction(superMethod)) {
      return superMethod.apply(this, passArgs);
    } else {
      throw new Error('Does not exists method in super element specified: ' + superMethod);
    }
  }
});

},{"./helper":35,"./template":41}],34:[function(require,module,exports){
'use strict';

/**
 * TODO implement
 * @class ClayEvent
 */
module.exports = {
  /**
   * @static
   * @returns {ClayEvent}
   */
  create: function() {
    return new ClayEvent();
  }
};

function ClayEvent() {

}

},{}],35:[function(require,module,exports){
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
 * @param {String} localName
 * @returns {boolean}
 */
function isCustomElementName(localName) {
  return localName.indexOf('-') !== -1;
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
  uniq      : uniq,
  clone     : clone,
  flatten   : flatten,
  ready     : ready,
  toArray   : toArray,
  toString  : toString,

  isString            : isString,
  isNumber            : isNumber,
  isArray             : isArray,
  isFunction          : isFunction,
  isCustomElementName : isCustomElementName
};

},{}],36:[function(require,module,exports){
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

},{"../helper":35}],37:[function(require,module,exports){
'use strict';

/**
 * TODO implement
 * @class ClayObserver
 */
module.exports = {
  /**
   * @static
   * @returns {ClayObserver}
   */
  create: function() {
    return new ClayObserver();
  }
};

function ClayObserver() {

}

},{}],38:[function(require,module,exports){
'use strict';

var element = require('./element');
var helper  = require('./helper');

/**
 * @param {String} name
 * @param {Object} proto
 */
function ClayRegister(name, proto) {
  var options = {
    prototype: element.create(name, proto)
  };

  if (proto.extends && !helper.isCustomElementName(proto.extends)) {
    options.extends = proto.extends;
  }

  document.registerElement(name, options);
}

module.exports = ClayRegister;

},{"./element":33,"./helper":35}],39:[function(require,module,exports){
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

},{"./constants":32,"./helper":35,"./template-helper":40,"htmlParser":3}],40:[function(require,module,exports){
'use strict';

var helper     = require("./helper");

/**
 *
 */
module.exports = {
  register: function(name, func) {
    this[name] = func;
  },
  hook: function(el) {
    console.log('hook', el);
  }
};

},{"./helper":35}],41:[function(require,module,exports){
'use strict';

var h            = require('virtual-dom/h');
var diff         = require('virtual-dom/diff');
var patch        = require('virtual-dom/patch');
var helper       = require("./helper");
var tmplCompiler = require("./template-compiler");
var create       = require('virtual-dom/create-element');

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

  this.compiled = tmplCompiler.create(html).compile();
}

helper.mix(ClayTemplate.prototype, {

  /**
   * @property {Object} scope
   */
  scope: {},

  /**
   * compiled DOM structure
   * @property {Object} compiled
   */
  compiled: {},

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
   * @returns {VTree}
   */
  createVTree: function() {
    console.time('compute vtree');
    var ret = this._currentVTree = convertParsedDomToVTree(this.compiled, this.scope);
    console.timeEnd('compute vtree');
    return ret;
  },

  /**
   * @param {Document} [doc]
   * @returns {Element|Null}
   */
  createElement: function(doc) {
    return create(this.createVTree(), {
      document: doc || document
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
   * @private
   */
  _update: function() {
    console.time('compute vtree');
    var current = this._currentVTree,
        updated = convertParsedDomToVTree(this.compiled, this.scope);
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
    this.scope = this.compiled = null;
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

},{"./helper":35,"./template-compiler":39,"virtual-dom/create-element":4,"virtual-dom/diff":5,"virtual-dom/h":6,"virtual-dom/patch":31}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9pbmRleC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvZW1wdHkuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvaHRtbFBhcnNlci9saWIvaHRtbHBhcnNlci5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9jcmVhdGUtZWxlbWVudC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9kaWZmLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2guanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vaC9pbmRleC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9oL3BhcnNlLXRhZy5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvYnJvd3Nlci1zcGxpdC9pbmRleC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvaXMtb2JqZWN0L2luZGV4LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL2FwcGx5LXByb3BlcnRpZXMuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vY3JlYXRlLWVsZW1lbnQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vZG9tLWluZGV4LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92ZG9tL25vZGVfbW9kdWxlcy9nbG9iYWwvZG9jdW1lbnQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vcGF0Y2gtb3AuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vcGF0Y2guanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vdXBkYXRlLXdpZGdldC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvZGlmZi5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaGFuZGxlLXRodW5rLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS9pcy10aHVuay5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdmhvb2suanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXZub2RlLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS9pcy12dGV4dC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaXMtd2lkZ2V0LmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS92ZXJzaW9uLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS92bm9kZS5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvdnBhdGNoLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS92dGV4dC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMveC1pcy1hcnJheS9pbmRleC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMveC1pcy1zdHJpbmcvaW5kZXguanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vcGF0Y2guanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvY29uc3RhbnRzLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvc3JjL2VsZW1lbnQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvZXZlbnQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvaGVscGVyLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvc3JjL21vZHVsZXMvaHR0cC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy9vYnNlcnZlci5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy9yZWdpc3Rlci5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy90ZW1wbGF0ZS1jb21waWxlci5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy90ZW1wbGF0ZS1oZWxwZXIuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvdGVtcGxhdGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDenpCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ2xheVJlZ2lzdGVyID0gcmVxdWlyZSgnLi9zcmMvcmVnaXN0ZXInKTtcbnZhciBoZWxwZXIgICAgICAgPSByZXF1aXJlKCcuL3NyYy9oZWxwZXInKTtcblxud2luZG93LkNsYXlsdW1wID0gaGVscGVyLm1peChDbGF5UmVnaXN0ZXIsIHtcblxuICBUZW1wbGF0ZSAgICAgICA6IHJlcXVpcmUoJy4vc3JjL3RlbXBsYXRlJyksXG4gIFRlbXBsYXRlSGVscGVyIDogcmVxdWlyZSgnLi9zcmMvdGVtcGxhdGUtaGVscGVyJyksXG4gIEVsZW1lbnQgICAgICAgIDogcmVxdWlyZSgnLi9zcmMvZWxlbWVudCcpLFxuICBPYnNlcnZlciAgICAgICA6IHJlcXVpcmUoJy4vc3JjL29ic2VydmVyJyksXG4gIEV2ZW50ICAgICAgICAgIDogcmVxdWlyZSgnLi9zcmMvZXZlbnQnKSxcbiAgSGVscGVyICAgICAgICAgOiByZXF1aXJlKCcuL3NyYy9oZWxwZXInKSxcblxuICBtb2R1bGVzIDoge1xuICAgIGh0dHAgOiByZXF1aXJlKCcuL3NyYy9tb2R1bGVzL2h0dHAnKVxuICB9XG59KTtcbiIsbnVsbCwiKGZ1bmN0aW9uIChfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbkNvcHlyaWdodCAyMDEwLCAyMDExLCBDaHJpcyBXaW5iZXJyeSA8Y2hyaXNAd2luYmVycnkubmV0Pi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cblBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbm9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvXG5kZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZVxucmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yXG5zZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbmFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG5JTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbkZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkdcbkZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1NcbklOIFRIRSBTT0ZUV0FSRS5cbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyogdjEuNy42ICovXG5cbihmdW5jdGlvbiAoKSB7XG5cbmZ1bmN0aW9uIHJ1bm5pbmdJbk5vZGUgKCkge1xuXHRyZXR1cm4oXG5cdFx0KHR5cGVvZiByZXF1aXJlKSA9PSBcImZ1bmN0aW9uXCJcblx0XHQmJlxuXHRcdCh0eXBlb2YgZXhwb3J0cykgPT0gXCJvYmplY3RcIlxuXHRcdCYmXG5cdFx0KHR5cGVvZiBtb2R1bGUpID09IFwib2JqZWN0XCJcblx0XHQmJlxuXHRcdCh0eXBlb2YgX19maWxlbmFtZSkgPT0gXCJzdHJpbmdcIlxuXHRcdCYmXG5cdFx0KHR5cGVvZiBfX2Rpcm5hbWUpID09IFwic3RyaW5nXCJcblx0XHQpO1xufVxuXG5pZiAoIXJ1bm5pbmdJbk5vZGUoKSkge1xuXHRpZiAoIXRoaXMuVGF1dG9sb2dpc3RpY3MpXG5cdFx0dGhpcy5UYXV0b2xvZ2lzdGljcyA9IHt9O1xuXHRlbHNlIGlmICh0aGlzLlRhdXRvbG9naXN0aWNzLk5vZGVIdG1sUGFyc2VyKVxuXHRcdHJldHVybjsgLy9Ob2RlSHRtbFBhcnNlciBhbHJlYWR5IGRlZmluZWQhXG5cdHRoaXMuVGF1dG9sb2dpc3RpY3MuTm9kZUh0bWxQYXJzZXIgPSB7fTtcblx0ZXhwb3J0cyA9IHRoaXMuVGF1dG9sb2dpc3RpY3MuTm9kZUh0bWxQYXJzZXI7XG59XG5cbi8vVHlwZXMgb2YgZWxlbWVudHMgZm91bmQgaW4gdGhlIERPTVxudmFyIEVsZW1lbnRUeXBlID0ge1xuXHQgIFRleHQ6IFwidGV4dFwiIC8vUGxhaW4gdGV4dFxuXHQsIERpcmVjdGl2ZTogXCJkaXJlY3RpdmVcIiAvL1NwZWNpYWwgdGFnIDwhLi4uPlxuXHQsIENvbW1lbnQ6IFwiY29tbWVudFwiIC8vU3BlY2lhbCB0YWcgPCEtLS4uLi0tPlxuXHQsIFNjcmlwdDogXCJzY3JpcHRcIiAvL1NwZWNpYWwgdGFnIDxzY3JpcHQ+Li4uPC9zY3JpcHQ+XG5cdCwgU3R5bGU6IFwic3R5bGVcIiAvL1NwZWNpYWwgdGFnIDxzdHlsZT4uLi48L3N0eWxlPlxuXHQsIFRhZzogXCJ0YWdcIiAvL0FueSB0YWcgdGhhdCBpc24ndCBzcGVjaWFsXG59XG5cbmZ1bmN0aW9uIFBhcnNlciAoaGFuZGxlciwgb3B0aW9ucykge1xuXHR0aGlzLl9vcHRpb25zID0gb3B0aW9ucyA/IG9wdGlvbnMgOiB7IH07XG5cdGlmICh0aGlzLl9vcHRpb25zLmluY2x1ZGVMb2NhdGlvbiA9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9vcHRpb25zLmluY2x1ZGVMb2NhdGlvbiA9IGZhbHNlOyAvL0RvIG5vdCB0cmFjayBlbGVtZW50IHBvc2l0aW9uIGluIGRvY3VtZW50IGJ5IGRlZmF1bHRcblx0fVxuXG5cdHRoaXMudmFsaWRhdGVIYW5kbGVyKGhhbmRsZXIpO1xuXHR0aGlzLl9oYW5kbGVyID0gaGFuZGxlcjtcblx0dGhpcy5yZXNldCgpO1xufVxuXG5cdC8vKipcIlN0YXRpY1wiKiovL1xuXHQvL1JlZ3VsYXIgZXhwcmVzc2lvbnMgdXNlZCBmb3IgY2xlYW5pbmcgdXAgYW5kIHBhcnNpbmcgKHN0YXRlbGVzcylcblx0UGFyc2VyLl9yZVRyaW0gPSAvKF5cXHMrfFxccyskKS9nOyAvL1RyaW0gbGVhZGluZy90cmFpbGluZyB3aGl0ZXNwYWNlXG5cdFBhcnNlci5fcmVUcmltQ29tbWVudCA9IC8oXlxcIS0tfC0tJCkvZzsgLy9SZW1vdmUgY29tbWVudCB0YWcgbWFya3VwIGZyb20gY29tbWVudCBjb250ZW50c1xuXHRQYXJzZXIuX3JlV2hpdGVzcGFjZSA9IC9cXHMvZzsgLy9Vc2VkIHRvIGZpbmQgYW55IHdoaXRlc3BhY2UgdG8gc3BsaXQgb25cblx0UGFyc2VyLl9yZVRhZ05hbWUgPSAvXlxccyooXFwvPylcXHMqKFteXFxzXFwvXSspLzsgLy9Vc2VkIHRvIGZpbmQgdGhlIHRhZyBuYW1lIGZvciBhbiBlbGVtZW50XG5cblx0Ly9SZWd1bGFyIGV4cHJlc3Npb25zIHVzZWQgZm9yIHBhcnNpbmcgKHN0YXRlZnVsKVxuXHRQYXJzZXIuX3JlQXR0cmliID0gLy9GaW5kIGF0dHJpYnV0ZXMgaW4gYSB0YWdcblx0XHQvKFtePTw+XFxcIlxcJ1xcc10rKVxccyo9XFxzKlwiKFteXCJdKilcInwoW149PD5cXFwiXFwnXFxzXSspXFxzKj1cXHMqJyhbXiddKiknfChbXj08PlxcXCJcXCdcXHNdKylcXHMqPVxccyooW14nXCJcXHNdKyl8KFtePTw+XFxcIlxcJ1xcc1xcL10rKS9nO1xuXHRQYXJzZXIuX3JlVGFncyA9IC9bXFw8XFw+XS9nOyAvL0ZpbmQgdGFnIG1hcmtlcnNcblxuXHQvLyoqUHVibGljKiovL1xuXHQvL01ldGhvZHMvL1xuXHQvL1BhcnNlcyBhIGNvbXBsZXRlIEhUTUwgYW5kIHB1c2hlcyBpdCB0byB0aGUgaGFuZGxlclxuXHRQYXJzZXIucHJvdG90eXBlLnBhcnNlQ29tcGxldGUgPSBmdW5jdGlvbiBQYXJzZXIkcGFyc2VDb21wbGV0ZSAoZGF0YSkge1xuXHRcdHRoaXMucmVzZXQoKTtcblx0XHR0aGlzLnBhcnNlQ2h1bmsoZGF0YSk7XG5cdFx0dGhpcy5kb25lKCk7XG5cdH1cblxuXHQvL1BhcnNlcyBhIHBpZWNlIG9mIGFuIEhUTUwgZG9jdW1lbnRcblx0UGFyc2VyLnByb3RvdHlwZS5wYXJzZUNodW5rID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlQ2h1bmsgKGRhdGEpIHtcblx0XHRpZiAodGhpcy5fZG9uZSlcblx0XHRcdHRoaXMuaGFuZGxlRXJyb3IobmV3IEVycm9yKFwiQXR0ZW1wdGVkIHRvIHBhcnNlIGNodW5rIGFmdGVyIHBhcnNpbmcgYWxyZWFkeSBkb25lXCIpKTtcblx0XHR0aGlzLl9idWZmZXIgKz0gZGF0YTsgLy9GSVhNRTogdGhpcyBjYW4gYmUgYSBib3R0bGVuZWNrXG5cdFx0dGhpcy5wYXJzZVRhZ3MoKTtcblx0fVxuXG5cdC8vVGVsbHMgdGhlIHBhcnNlciB0aGF0IHRoZSBIVE1MIGJlaW5nIHBhcnNlZCBpcyBjb21wbGV0ZVxuXHRQYXJzZXIucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiBQYXJzZXIkZG9uZSAoKSB7XG5cdFx0aWYgKHRoaXMuX2RvbmUpXG5cdFx0XHRyZXR1cm47XG5cdFx0dGhpcy5fZG9uZSA9IHRydWU7XG5cdFxuXHRcdC8vUHVzaCBhbnkgdW5wYXJzZWQgdGV4dCBpbnRvIGEgZmluYWwgZWxlbWVudCBpbiB0aGUgZWxlbWVudCBsaXN0XG5cdFx0aWYgKHRoaXMuX2J1ZmZlci5sZW5ndGgpIHtcblx0XHRcdHZhciByYXdEYXRhID0gdGhpcy5fYnVmZmVyO1xuXHRcdFx0dGhpcy5fYnVmZmVyID0gXCJcIjtcblx0XHRcdHZhciBlbGVtZW50ID0ge1xuXHRcdFx0XHQgIHJhdzogcmF3RGF0YVxuXHRcdFx0XHQsIGRhdGE6ICh0aGlzLl9wYXJzZVN0YXRlID09IEVsZW1lbnRUeXBlLlRleHQpID8gcmF3RGF0YSA6IHJhd0RhdGEucmVwbGFjZShQYXJzZXIuX3JlVHJpbSwgXCJcIilcblx0XHRcdFx0LCB0eXBlOiB0aGlzLl9wYXJzZVN0YXRlXG5cdFx0XHRcdH07XG5cdFx0XHRpZiAodGhpcy5fcGFyc2VTdGF0ZSA9PSBFbGVtZW50VHlwZS5UYWcgfHwgdGhpcy5fcGFyc2VTdGF0ZSA9PSBFbGVtZW50VHlwZS5TY3JpcHQgfHwgdGhpcy5fcGFyc2VTdGF0ZSA9PSBFbGVtZW50VHlwZS5TdHlsZSlcblx0XHRcdFx0ZWxlbWVudC5uYW1lID0gdGhpcy5wYXJzZVRhZ05hbWUoZWxlbWVudC5kYXRhKTtcblx0XHRcdHRoaXMucGFyc2VBdHRyaWJzKGVsZW1lbnQpO1xuXHRcdFx0dGhpcy5fZWxlbWVudHMucHVzaChlbGVtZW50KTtcblx0XHR9XG5cdFxuXHRcdHRoaXMud3JpdGVIYW5kbGVyKCk7XG5cdFx0dGhpcy5faGFuZGxlci5kb25lKCk7XG5cdH1cblxuXHQvL1Jlc2V0cyB0aGUgcGFyc2VyIHRvIGEgYmxhbmsgc3RhdGUsIHJlYWR5IHRvIHBhcnNlIGEgbmV3IEhUTUwgZG9jdW1lbnRcblx0UGFyc2VyLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uIFBhcnNlciRyZXNldCAoKSB7XG5cdFx0dGhpcy5fYnVmZmVyID0gXCJcIjtcblx0XHR0aGlzLl9kb25lID0gZmFsc2U7XG5cdFx0dGhpcy5fZWxlbWVudHMgPSBbXTtcblx0XHR0aGlzLl9lbGVtZW50c0N1cnJlbnQgPSAwO1xuXHRcdHRoaXMuX2N1cnJlbnQgPSAwO1xuXHRcdHRoaXMuX25leHQgPSAwO1xuXHRcdHRoaXMuX2xvY2F0aW9uID0ge1xuXHRcdFx0ICByb3c6IDBcblx0XHRcdCwgY29sOiAwXG5cdFx0XHQsIGNoYXJPZmZzZXQ6IDBcblx0XHRcdCwgaW5CdWZmZXI6IDBcblx0XHR9O1xuXHRcdHRoaXMuX3BhcnNlU3RhdGUgPSBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdHRoaXMuX3ByZXZUYWdTZXAgPSAnJztcblx0XHR0aGlzLl90YWdTdGFjayA9IFtdO1xuXHRcdHRoaXMuX2hhbmRsZXIucmVzZXQoKTtcblx0fVxuXHRcblx0Ly8qKlByaXZhdGUqKi8vXG5cdC8vUHJvcGVydGllcy8vXG5cdFBhcnNlci5wcm90b3R5cGUuX29wdGlvbnMgPSBudWxsOyAvL1BhcnNlciBvcHRpb25zIGZvciBob3cgdG8gYmVoYXZlXG5cdFBhcnNlci5wcm90b3R5cGUuX2hhbmRsZXIgPSBudWxsOyAvL0hhbmRsZXIgZm9yIHBhcnNlZCBlbGVtZW50c1xuXHRQYXJzZXIucHJvdG90eXBlLl9idWZmZXIgPSBudWxsOyAvL0J1ZmZlciBvZiB1bnBhcnNlZCBkYXRhXG5cdFBhcnNlci5wcm90b3R5cGUuX2RvbmUgPSBmYWxzZTsgLy9GbGFnIGluZGljYXRpbmcgd2hldGhlciBwYXJzaW5nIGlzIGRvbmVcblx0UGFyc2VyLnByb3RvdHlwZS5fZWxlbWVudHMgPSAgbnVsbDsgLy9BcnJheSBvZiBwYXJzZWQgZWxlbWVudHNcblx0UGFyc2VyLnByb3RvdHlwZS5fZWxlbWVudHNDdXJyZW50ID0gMDsgLy9Qb2ludGVyIHRvIGxhc3QgZWxlbWVudCBpbiBfZWxlbWVudHMgdGhhdCBoYXMgYmVlbiBwcm9jZXNzZWRcblx0UGFyc2VyLnByb3RvdHlwZS5fY3VycmVudCA9IDA7IC8vUG9zaXRpb24gaW4gZGF0YSB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gcGFyc2VkXG5cdFBhcnNlci5wcm90b3R5cGUuX25leHQgPSAwOyAvL1Bvc2l0aW9uIGluIGRhdGEgb2YgdGhlIG5leHQgdGFnIG1hcmtlciAoPD4pXG5cdFBhcnNlci5wcm90b3R5cGUuX2xvY2F0aW9uID0gbnVsbDsgLy9Qb3NpdGlvbiB0cmFja2luZyBmb3IgZWxlbWVudHMgaW4gYSBzdHJlYW1cblx0UGFyc2VyLnByb3RvdHlwZS5fcGFyc2VTdGF0ZSA9IEVsZW1lbnRUeXBlLlRleHQ7IC8vQ3VycmVudCB0eXBlIG9mIGVsZW1lbnQgYmVpbmcgcGFyc2VkXG5cdFBhcnNlci5wcm90b3R5cGUuX3ByZXZUYWdTZXAgPSAnJzsgLy9QcmV2aW91cyB0YWcgbWFya2VyIGZvdW5kXG5cdC8vU3RhY2sgb2YgZWxlbWVudCB0eXBlcyBwcmV2aW91c2x5IGVuY291bnRlcmVkOyBrZWVwcyB0cmFjayBvZiB3aGVuXG5cdC8vcGFyc2luZyBvY2N1cnMgaW5zaWRlIGEgc2NyaXB0L2NvbW1lbnQvc3R5bGUgdGFnXG5cdFBhcnNlci5wcm90b3R5cGUuX3RhZ1N0YWNrID0gbnVsbDtcblxuXHQvL01ldGhvZHMvL1xuXHQvL1Rha2VzIGFuIGFycmF5IG9mIGVsZW1lbnRzIGFuZCBwYXJzZXMgYW55IGZvdW5kIGF0dHJpYnV0ZXNcblx0UGFyc2VyLnByb3RvdHlwZS5wYXJzZVRhZ0F0dHJpYnMgPSBmdW5jdGlvbiBQYXJzZXIkcGFyc2VUYWdBdHRyaWJzIChlbGVtZW50cykge1xuXHRcdHZhciBpZHhFbmQgPSBlbGVtZW50cy5sZW5ndGg7XG5cdFx0dmFyIGlkeCA9IDA7XG5cdFxuXHRcdHdoaWxlIChpZHggPCBpZHhFbmQpIHtcblx0XHRcdHZhciBlbGVtZW50ID0gZWxlbWVudHNbaWR4KytdO1xuXHRcdFx0aWYgKGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5UYWcgfHwgZWxlbWVudC50eXBlID09IEVsZW1lbnRUeXBlLlNjcmlwdCB8fCBlbGVtZW50LnR5cGUgPT0gRWxlbWVudFR5cGUuc3R5bGUpXG5cdFx0XHRcdHRoaXMucGFyc2VBdHRyaWJzKGVsZW1lbnQpO1xuXHRcdH1cblx0XG5cdFx0cmV0dXJuKGVsZW1lbnRzKTtcblx0fVxuXG5cdC8vVGFrZXMgYW4gZWxlbWVudCBhbmQgYWRkcyBhbiBcImF0dHJpYnNcIiBwcm9wZXJ0eSBmb3IgYW55IGVsZW1lbnQgYXR0cmlidXRlcyBmb3VuZCBcblx0UGFyc2VyLnByb3RvdHlwZS5wYXJzZUF0dHJpYnMgPSBmdW5jdGlvbiBQYXJzZXIkcGFyc2VBdHRyaWJzIChlbGVtZW50KSB7XG5cdFx0Ly9Pbmx5IHBhcnNlIGF0dHJpYnV0ZXMgZm9yIHRhZ3Ncblx0XHRpZiAoZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlNjcmlwdCAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuU3R5bGUgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlRhZylcblx0XHRcdHJldHVybjtcblx0XG5cdFx0dmFyIHRhZ05hbWUgPSBlbGVtZW50LmRhdGEuc3BsaXQoUGFyc2VyLl9yZVdoaXRlc3BhY2UsIDEpWzBdO1xuXHRcdHZhciBhdHRyaWJSYXcgPSBlbGVtZW50LmRhdGEuc3Vic3RyaW5nKHRhZ05hbWUubGVuZ3RoKTtcblx0XHRpZiAoYXR0cmliUmF3Lmxlbmd0aCA8IDEpXG5cdFx0XHRyZXR1cm47XG5cdFxuXHRcdHZhciBtYXRjaDtcblx0XHRQYXJzZXIuX3JlQXR0cmliLmxhc3RJbmRleCA9IDA7XG5cdFx0d2hpbGUgKG1hdGNoID0gUGFyc2VyLl9yZUF0dHJpYi5leGVjKGF0dHJpYlJhdykpIHtcblx0XHRcdGlmIChlbGVtZW50LmF0dHJpYnMgPT0gdW5kZWZpbmVkKVxuXHRcdFx0XHRlbGVtZW50LmF0dHJpYnMgPSB7fTtcblx0XG5cdFx0XHRpZiAodHlwZW9mIG1hdGNoWzFdID09IFwic3RyaW5nXCIgJiYgbWF0Y2hbMV0ubGVuZ3RoKSB7XG5cdFx0XHRcdGVsZW1lbnQuYXR0cmlic1ttYXRjaFsxXV0gPSBtYXRjaFsyXTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIG1hdGNoWzNdID09IFwic3RyaW5nXCIgJiYgbWF0Y2hbM10ubGVuZ3RoKSB7XG5cdFx0XHRcdGVsZW1lbnQuYXR0cmlic1ttYXRjaFszXS50b1N0cmluZygpXSA9IG1hdGNoWzRdLnRvU3RyaW5nKCk7XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBtYXRjaFs1XSA9PSBcInN0cmluZ1wiICYmIG1hdGNoWzVdLmxlbmd0aCkge1xuXHRcdFx0XHRlbGVtZW50LmF0dHJpYnNbbWF0Y2hbNV1dID0gbWF0Y2hbNl07XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBtYXRjaFs3XSA9PSBcInN0cmluZ1wiICYmIG1hdGNoWzddLmxlbmd0aCkge1xuXHRcdFx0XHRlbGVtZW50LmF0dHJpYnNbbWF0Y2hbN11dID0gbWF0Y2hbN107XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly9FeHRyYWN0cyB0aGUgYmFzZSB0YWcgbmFtZSBmcm9tIHRoZSBkYXRhIHZhbHVlIG9mIGFuIGVsZW1lbnRcblx0UGFyc2VyLnByb3RvdHlwZS5wYXJzZVRhZ05hbWUgPSBmdW5jdGlvbiBQYXJzZXIkcGFyc2VUYWdOYW1lIChkYXRhKSB7XG5cdFx0aWYgKGRhdGEgPT0gbnVsbCB8fCBkYXRhID09IFwiXCIpXG5cdFx0XHRyZXR1cm4oXCJcIik7XG5cdFx0dmFyIG1hdGNoID0gUGFyc2VyLl9yZVRhZ05hbWUuZXhlYyhkYXRhKTtcblx0XHRpZiAoIW1hdGNoKVxuXHRcdFx0cmV0dXJuKFwiXCIpO1xuXHRcdHJldHVybigobWF0Y2hbMV0gPyBcIi9cIiA6IFwiXCIpICsgbWF0Y2hbMl0pO1xuXHR9XG5cblx0Ly9QYXJzZXMgdGhyb3VnaCBIVE1MIHRleHQgYW5kIHJldHVybnMgYW4gYXJyYXkgb2YgZm91bmQgZWxlbWVudHNcblx0Ly9JIGFkbWl0LCB0aGlzIGZ1bmN0aW9uIGlzIHJhdGhlciBsYXJnZSBidXQgc3BsaXR0aW5nIHVwIGhhZCBhbiBub3RpY2VhYmxlIGltcGFjdCBvbiBzcGVlZFxuXHRQYXJzZXIucHJvdG90eXBlLnBhcnNlVGFncyA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZVRhZ3MgKCkge1xuXHRcdHZhciBidWZmZXJFbmQgPSB0aGlzLl9idWZmZXIubGVuZ3RoIC0gMTtcblx0XHR3aGlsZSAoUGFyc2VyLl9yZVRhZ3MudGVzdCh0aGlzLl9idWZmZXIpKSB7XG5cdFx0XHR0aGlzLl9uZXh0ID0gUGFyc2VyLl9yZVRhZ3MubGFzdEluZGV4IC0gMTtcblx0XHRcdHZhciB0YWdTZXAgPSB0aGlzLl9idWZmZXIuY2hhckF0KHRoaXMuX25leHQpOyAvL1RoZSBjdXJyZW50bHkgZm91bmQgdGFnIG1hcmtlclxuXHRcdFx0dmFyIHJhd0RhdGEgPSB0aGlzLl9idWZmZXIuc3Vic3RyaW5nKHRoaXMuX2N1cnJlbnQsIHRoaXMuX25leHQpOyAvL1RoZSBuZXh0IGNodW5rIG9mIGRhdGEgdG8gcGFyc2Vcblx0XG5cdFx0XHQvL0EgbmV3IGVsZW1lbnQgdG8gZXZlbnR1YWxseSBiZSBhcHBlbmRlZCB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHR2YXIgZWxlbWVudCA9IHtcblx0XHRcdFx0ICByYXc6IHJhd0RhdGFcblx0XHRcdFx0LCBkYXRhOiAodGhpcy5fcGFyc2VTdGF0ZSA9PSBFbGVtZW50VHlwZS5UZXh0KSA/IHJhd0RhdGEgOiByYXdEYXRhLnJlcGxhY2UoUGFyc2VyLl9yZVRyaW0sIFwiXCIpXG5cdFx0XHRcdCwgdHlwZTogdGhpcy5fcGFyc2VTdGF0ZVxuXHRcdFx0fTtcblx0XG5cdFx0XHR2YXIgZWxlbWVudE5hbWUgPSB0aGlzLnBhcnNlVGFnTmFtZShlbGVtZW50LmRhdGEpO1xuXHRcblx0XHRcdC8vVGhpcyBzZWN0aW9uIGluc3BlY3RzIHRoZSBjdXJyZW50IHRhZyBzdGFjayBhbmQgbW9kaWZpZXMgdGhlIGN1cnJlbnRcblx0XHRcdC8vZWxlbWVudCBpZiB3ZSdyZSBhY3R1YWxseSBwYXJzaW5nIGEgc3BlY2lhbCBhcmVhIChzY3JpcHQvY29tbWVudC9zdHlsZSB0YWcpXG5cdFx0XHRpZiAodGhpcy5fdGFnU3RhY2subGVuZ3RoKSB7IC8vV2UncmUgcGFyc2luZyBpbnNpZGUgYSBzY3JpcHQvY29tbWVudC9zdHlsZSB0YWdcblx0XHRcdFx0aWYgKHRoaXMuX3RhZ1N0YWNrW3RoaXMuX3RhZ1N0YWNrLmxlbmd0aCAtIDFdID09IEVsZW1lbnRUeXBlLlNjcmlwdCkgeyAvL1dlJ3JlIGN1cnJlbnRseSBpbiBhIHNjcmlwdCB0YWdcblx0XHRcdFx0XHRpZiAoZWxlbWVudE5hbWUudG9Mb3dlckNhc2UoKSA9PSBcIi9zY3JpcHRcIikgLy9BY3R1YWxseSwgd2UncmUgbm8gbG9uZ2VyIGluIGEgc2NyaXB0IHRhZywgc28gcG9wIGl0IG9mZiB0aGUgc3RhY2tcblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnBvcCgpO1xuXHRcdFx0XHRcdGVsc2UgeyAvL05vdCBhIGNsb3Npbmcgc2NyaXB0IHRhZ1xuXHRcdFx0XHRcdFx0aWYgKGVsZW1lbnQucmF3LmluZGV4T2YoXCIhLS1cIikgIT0gMCkgeyAvL01ha2Ugc3VyZSB3ZSdyZSBub3QgaW4gYSBjb21tZW50XG5cdFx0XHRcdFx0XHRcdC8vQWxsIGRhdGEgZnJvbSBoZXJlIHRvIHNjcmlwdCBjbG9zZSBpcyBub3cgYSB0ZXh0IGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdFx0XHRcdFx0Ly9JZiB0aGUgcHJldmlvdXMgZWxlbWVudCBpcyB0ZXh0LCBhcHBlbmQgdGhlIGN1cnJlbnQgdGV4dCB0byBpdFxuXHRcdFx0XHRcdFx0XHRpZiAodGhpcy5fZWxlbWVudHMubGVuZ3RoICYmIHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdLnR5cGUgPT0gRWxlbWVudFR5cGUuVGV4dCkge1xuXHRcdFx0XHRcdFx0XHRcdHZhciBwcmV2RWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRcdFx0XHRcdHByZXZFbGVtZW50LnJhdyA9IHByZXZFbGVtZW50LmRhdGEgPSBwcmV2RWxlbWVudC5yYXcgKyB0aGlzLl9wcmV2VGFnU2VwICsgZWxlbWVudC5yYXc7XG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBcIlwiOyAvL1RoaXMgY2F1c2VzIHRoZSBjdXJyZW50IGVsZW1lbnQgdG8gbm90IGJlIGFkZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmICh0aGlzLl90YWdTdGFja1t0aGlzLl90YWdTdGFjay5sZW5ndGggLSAxXSA9PSBFbGVtZW50VHlwZS5TdHlsZSkgeyAvL1dlJ3JlIGN1cnJlbnRseSBpbiBhIHN0eWxlIHRhZ1xuXHRcdFx0XHRcdGlmIChlbGVtZW50TmFtZS50b0xvd2VyQ2FzZSgpID09IFwiL3N0eWxlXCIpIC8vQWN0dWFsbHksIHdlJ3JlIG5vIGxvbmdlciBpbiBhIHN0eWxlIHRhZywgc28gcG9wIGl0IG9mZiB0aGUgc3RhY2tcblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnBvcCgpO1xuXHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0aWYgKGVsZW1lbnQucmF3LmluZGV4T2YoXCIhLS1cIikgIT0gMCkgeyAvL01ha2Ugc3VyZSB3ZSdyZSBub3QgaW4gYSBjb21tZW50XG5cdFx0XHRcdFx0XHRcdC8vQWxsIGRhdGEgZnJvbSBoZXJlIHRvIHN0eWxlIGNsb3NlIGlzIG5vdyBhIHRleHQgZWxlbWVudFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdFx0XHRcdFx0XHQvL0lmIHRoZSBwcmV2aW91cyBlbGVtZW50IGlzIHRleHQsIGFwcGVuZCB0aGUgY3VycmVudCB0ZXh0IHRvIGl0XG5cdFx0XHRcdFx0XHRcdGlmICh0aGlzLl9lbGVtZW50cy5sZW5ndGggJiYgdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBFbGVtZW50VHlwZS5UZXh0KSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIHByZXZFbGVtZW50ID0gdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGVsZW1lbnQucmF3ICE9IFwiXCIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHByZXZFbGVtZW50LnJhdyA9IHByZXZFbGVtZW50LmRhdGEgPSBwcmV2RWxlbWVudC5yYXcgKyB0aGlzLl9wcmV2VGFnU2VwICsgZWxlbWVudC5yYXc7XG5cdFx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IFwiXCI7IC8vVGhpcyBjYXVzZXMgdGhlIGN1cnJlbnQgZWxlbWVudCB0byBub3QgYmUgYWRkZWQgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7IC8vRWxlbWVudCBpcyBlbXB0eSwgc28ganVzdCBhcHBlbmQgdGhlIGxhc3QgdGFnIG1hcmtlciBmb3VuZFxuXHRcdFx0XHRcdFx0XHRcdFx0cHJldkVsZW1lbnQucmF3ID0gcHJldkVsZW1lbnQuZGF0YSA9IHByZXZFbGVtZW50LnJhdyArIHRoaXMuX3ByZXZUYWdTZXA7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgeyAvL1RoZSBwcmV2aW91cyBlbGVtZW50IHdhcyBub3QgdGV4dFxuXHRcdFx0XHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdyAhPSBcIlwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IGVsZW1lbnQucmF3O1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmICh0aGlzLl90YWdTdGFja1t0aGlzLl90YWdTdGFjay5sZW5ndGggLSAxXSA9PSBFbGVtZW50VHlwZS5Db21tZW50KSB7IC8vV2UncmUgY3VycmVudGx5IGluIGEgY29tbWVudCB0YWdcblx0XHRcdFx0XHR2YXIgcmF3TGVuID0gZWxlbWVudC5yYXcubGVuZ3RoO1xuXHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdy5jaGFyQXQocmF3TGVuIC0gMikgPT0gXCItXCIgJiYgZWxlbWVudC5yYXcuY2hhckF0KHJhd0xlbiAtIDEpID09IFwiLVwiICYmIHRhZ1NlcCA9PSBcIj5cIikge1xuXHRcdFx0XHRcdFx0Ly9BY3R1YWxseSwgd2UncmUgbm8gbG9uZ2VyIGluIGEgc3R5bGUgdGFnLCBzbyBwb3AgaXQgb2ZmIHRoZSBzdGFja1xuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucG9wKCk7XG5cdFx0XHRcdFx0XHQvL0lmIHRoZSBwcmV2aW91cyBlbGVtZW50IGlzIGEgY29tbWVudCwgYXBwZW5kIHRoZSBjdXJyZW50IHRleHQgdG8gaXRcblx0XHRcdFx0XHRcdGlmICh0aGlzLl9lbGVtZW50cy5sZW5ndGggJiYgdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV0udHlwZSA9PSBFbGVtZW50VHlwZS5Db21tZW50KSB7XG5cdFx0XHRcdFx0XHRcdHZhciBwcmV2RWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gKHByZXZFbGVtZW50LnJhdyArIGVsZW1lbnQucmF3KS5yZXBsYWNlKFBhcnNlci5fcmVUcmltQ29tbWVudCwgXCJcIik7XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gXCJcIjsgLy9UaGlzIGNhdXNlcyB0aGUgY3VycmVudCBlbGVtZW50IHRvIG5vdCBiZSBhZGRlZCB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIC8vUHJldmlvdXMgZWxlbWVudCBub3QgYSBjb21tZW50XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLkNvbW1lbnQ7IC8vQ2hhbmdlIHRoZSBjdXJyZW50IGVsZW1lbnQncyB0eXBlIHRvIGEgY29tbWVudFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIHsgLy9TdGlsbCBpbiBhIGNvbW1lbnQgdGFnXG5cdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5Db21tZW50O1xuXHRcdFx0XHRcdFx0Ly9JZiB0aGUgcHJldmlvdXMgZWxlbWVudCBpcyBhIGNvbW1lbnQsIGFwcGVuZCB0aGUgY3VycmVudCB0ZXh0IHRvIGl0XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5fZWxlbWVudHMubGVuZ3RoICYmIHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdLnR5cGUgPT0gRWxlbWVudFR5cGUuQ29tbWVudCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgcHJldkVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXTtcblx0XHRcdFx0XHRcdFx0cHJldkVsZW1lbnQucmF3ID0gcHJldkVsZW1lbnQuZGF0YSA9IHByZXZFbGVtZW50LnJhdyArIGVsZW1lbnQucmF3ICsgdGFnU2VwO1xuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IFwiXCI7IC8vVGhpcyBjYXVzZXMgdGhlIGN1cnJlbnQgZWxlbWVudCB0byBub3QgYmUgYWRkZWQgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IGVsZW1lbnQucmF3ICsgdGFnU2VwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcblx0XHRcdC8vUHJvY2Vzc2luZyBvZiBub24tc3BlY2lhbCB0YWdzXG5cdFx0XHRpZiAoZWxlbWVudC50eXBlID09IEVsZW1lbnRUeXBlLlRhZykge1xuXHRcdFx0XHRlbGVtZW50Lm5hbWUgPSBlbGVtZW50TmFtZTtcblx0XHRcdFx0dmFyIGVsZW1lbnROYW1lQ0kgPSBlbGVtZW50TmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKGVsZW1lbnQucmF3LmluZGV4T2YoXCIhLS1cIikgPT0gMCkgeyAvL1RoaXMgdGFnIGlzIHJlYWxseSBjb21tZW50XG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuQ29tbWVudDtcblx0XHRcdFx0XHRkZWxldGUgZWxlbWVudFtcIm5hbWVcIl07XG5cdFx0XHRcdFx0dmFyIHJhd0xlbiA9IGVsZW1lbnQucmF3Lmxlbmd0aDtcblx0XHRcdFx0XHQvL0NoZWNrIGlmIHRoZSBjb21tZW50IGlzIHRlcm1pbmF0ZWQgaW4gdGhlIGN1cnJlbnQgZWxlbWVudFxuXHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdy5jaGFyQXQocmF3TGVuIC0gMSkgPT0gXCItXCIgJiYgZWxlbWVudC5yYXcuY2hhckF0KHJhd0xlbiAtIDIpID09IFwiLVwiICYmIHRhZ1NlcCA9PSBcIj5cIilcblx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gZWxlbWVudC5yYXcucmVwbGFjZShQYXJzZXIuX3JlVHJpbUNvbW1lbnQsIFwiXCIpO1xuXHRcdFx0XHRcdGVsc2UgeyAvL0l0J3Mgbm90IHNvIHB1c2ggdGhlIGNvbW1lbnQgb250byB0aGUgdGFnIHN0YWNrXG5cdFx0XHRcdFx0XHRlbGVtZW50LnJhdyArPSB0YWdTZXA7XG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKEVsZW1lbnRUeXBlLkNvbW1lbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChlbGVtZW50LnJhdy5pbmRleE9mKFwiIVwiKSA9PSAwIHx8IGVsZW1lbnQucmF3LmluZGV4T2YoXCI/XCIpID09IDApIHtcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5EaXJlY3RpdmU7XG5cdFx0XHRcdFx0Ly9UT0RPOiB3aGF0IGFib3V0IENEQVRBP1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGVsZW1lbnROYW1lQ0kgPT0gXCJzY3JpcHRcIikge1xuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlNjcmlwdDtcblx0XHRcdFx0XHQvL1NwZWNpYWwgdGFnLCBwdXNoIG9udG8gdGhlIHRhZyBzdGFjayBpZiBub3QgdGVybWluYXRlZFxuXHRcdFx0XHRcdGlmIChlbGVtZW50LmRhdGEuY2hhckF0KGVsZW1lbnQuZGF0YS5sZW5ndGggLSAxKSAhPSBcIi9cIilcblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnB1c2goRWxlbWVudFR5cGUuU2NyaXB0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChlbGVtZW50TmFtZUNJID09IFwiL3NjcmlwdFwiKVxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlNjcmlwdDtcblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudE5hbWVDSSA9PSBcInN0eWxlXCIpIHtcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5TdHlsZTtcblx0XHRcdFx0XHQvL1NwZWNpYWwgdGFnLCBwdXNoIG9udG8gdGhlIHRhZyBzdGFjayBpZiBub3QgdGVybWluYXRlZFxuXHRcdFx0XHRcdGlmIChlbGVtZW50LmRhdGEuY2hhckF0KGVsZW1lbnQuZGF0YS5sZW5ndGggLSAxKSAhPSBcIi9cIilcblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnB1c2goRWxlbWVudFR5cGUuU3R5bGUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGVsZW1lbnROYW1lQ0kgPT0gXCIvc3R5bGVcIilcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5TdHlsZTtcblx0XHRcdFx0aWYgKGVsZW1lbnQubmFtZSAmJiBlbGVtZW50Lm5hbWUuY2hhckF0KDApID09IFwiL1wiKVxuXHRcdFx0XHRcdGVsZW1lbnQuZGF0YSA9IGVsZW1lbnQubmFtZTtcblx0XHRcdH1cblx0XG5cdFx0XHQvL0FkZCBhbGwgdGFncyBhbmQgbm9uLWVtcHR5IHRleHQgZWxlbWVudHMgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0aWYgKGVsZW1lbnQucmF3ICE9IFwiXCIgfHwgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlRleHQpIHtcblx0XHRcdFx0aWYgKHRoaXMuX29wdGlvbnMuaW5jbHVkZUxvY2F0aW9uICYmICFlbGVtZW50LmxvY2F0aW9uKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC5sb2NhdGlvbiA9IHRoaXMuZ2V0TG9jYXRpb24oZWxlbWVudC50eXBlID09IEVsZW1lbnRUeXBlLlRhZyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5wYXJzZUF0dHJpYnMoZWxlbWVudCk7XG5cdFx0XHRcdHRoaXMuX2VsZW1lbnRzLnB1c2goZWxlbWVudCk7XG5cdFx0XHRcdC8vSWYgdGFnIHNlbGYtdGVybWluYXRlcywgYWRkIGFuIGV4cGxpY2l0LCBzZXBhcmF0ZSBjbG9zaW5nIHRhZ1xuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlRleHRcblx0XHRcdFx0XHQmJlxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5Db21tZW50XG5cdFx0XHRcdFx0JiZcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuRGlyZWN0aXZlXG5cdFx0XHRcdFx0JiZcblx0XHRcdFx0XHRlbGVtZW50LmRhdGEuY2hhckF0KGVsZW1lbnQuZGF0YS5sZW5ndGggLSAxKSA9PSBcIi9cIlxuXHRcdFx0XHRcdClcblx0XHRcdFx0XHR0aGlzLl9lbGVtZW50cy5wdXNoKHtcblx0XHRcdFx0XHRcdCAgcmF3OiBcIi9cIiArIGVsZW1lbnQubmFtZVxuXHRcdFx0XHRcdFx0LCBkYXRhOiBcIi9cIiArIGVsZW1lbnQubmFtZVxuXHRcdFx0XHRcdFx0LCBuYW1lOiBcIi9cIiArIGVsZW1lbnQubmFtZVxuXHRcdFx0XHRcdFx0LCB0eXBlOiBlbGVtZW50LnR5cGVcblx0XHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdHRoaXMuX3BhcnNlU3RhdGUgPSAodGFnU2VwID09IFwiPFwiKSA/IEVsZW1lbnRUeXBlLlRhZyA6IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0XHR0aGlzLl9jdXJyZW50ID0gdGhpcy5fbmV4dCArIDE7XG5cdFx0XHR0aGlzLl9wcmV2VGFnU2VwID0gdGFnU2VwO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9vcHRpb25zLmluY2x1ZGVMb2NhdGlvbikge1xuXHRcdFx0dGhpcy5nZXRMb2NhdGlvbigpO1xuXHRcdFx0dGhpcy5fbG9jYXRpb24ucm93ICs9IHRoaXMuX2xvY2F0aW9uLmluQnVmZmVyO1xuXHRcdFx0dGhpcy5fbG9jYXRpb24uaW5CdWZmZXIgPSAwO1xuXHRcdFx0dGhpcy5fbG9jYXRpb24uY2hhck9mZnNldCA9IDA7XG5cdFx0fVxuXHRcdHRoaXMuX2J1ZmZlciA9ICh0aGlzLl9jdXJyZW50IDw9IGJ1ZmZlckVuZCkgPyB0aGlzLl9idWZmZXIuc3Vic3RyaW5nKHRoaXMuX2N1cnJlbnQpIDogXCJcIjtcblx0XHR0aGlzLl9jdXJyZW50ID0gMDtcblx0XG5cdFx0dGhpcy53cml0ZUhhbmRsZXIoKTtcblx0fVxuXG5cdFBhcnNlci5wcm90b3R5cGUuZ2V0TG9jYXRpb24gPSBmdW5jdGlvbiBQYXJzZXIkZ2V0TG9jYXRpb24gKHN0YXJ0VGFnKSB7XG5cdFx0dmFyIGMsXG5cdFx0XHRsID0gdGhpcy5fbG9jYXRpb24sXG5cdFx0XHRlbmQgPSB0aGlzLl9jdXJyZW50IC0gKHN0YXJ0VGFnID8gMSA6IDApLFxuXHRcdFx0Y2h1bmsgPSBzdGFydFRhZyAmJiBsLmNoYXJPZmZzZXQgPT0gMCAmJiB0aGlzLl9jdXJyZW50ID09IDA7XG5cdFx0XG5cdFx0Zm9yICg7IGwuY2hhck9mZnNldCA8IGVuZDsgbC5jaGFyT2Zmc2V0KyspIHtcblx0XHRcdGMgPSB0aGlzLl9idWZmZXIuY2hhckF0KGwuY2hhck9mZnNldCk7XG5cdFx0XHRpZiAoYyA9PSAnXFxuJykge1xuXHRcdFx0XHRsLmluQnVmZmVyKys7XG5cdFx0XHRcdGwuY29sID0gMDtcblx0XHRcdH0gZWxzZSBpZiAoYyAhPSAnXFxyJykge1xuXHRcdFx0XHRsLmNvbCsrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0ICBsaW5lOiBsLnJvdyArIGwuaW5CdWZmZXIgKyAxXG5cdFx0XHQsIGNvbDogbC5jb2wgKyAoY2h1bmsgPyAwOiAxKVxuXHRcdH07XG5cdH1cblxuXHQvL0NoZWNrcyB0aGUgaGFuZGxlciB0byBtYWtlIGl0IGlzIGFuIG9iamVjdCB3aXRoIHRoZSByaWdodCBcImludGVyZmFjZVwiXG5cdFBhcnNlci5wcm90b3R5cGUudmFsaWRhdGVIYW5kbGVyID0gZnVuY3Rpb24gUGFyc2VyJHZhbGlkYXRlSGFuZGxlciAoaGFuZGxlcikge1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIpICE9IFwib2JqZWN0XCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIGlzIG5vdCBhbiBvYmplY3RcIik7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlci5yZXNldCkgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ3Jlc2V0JyBpcyBpbnZhbGlkXCIpO1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIuZG9uZSkgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ2RvbmUnIGlzIGludmFsaWRcIik7XG5cdFx0aWYgKCh0eXBlb2YgaGFuZGxlci53cml0ZVRhZykgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ3dyaXRlVGFnJyBpcyBpbnZhbGlkXCIpO1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIud3JpdGVUZXh0KSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAnd3JpdGVUZXh0JyBpcyBpbnZhbGlkXCIpO1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIud3JpdGVDb21tZW50KSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAnd3JpdGVDb21tZW50JyBpcyBpbnZhbGlkXCIpO1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIud3JpdGVEaXJlY3RpdmUpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICd3cml0ZURpcmVjdGl2ZScgaXMgaW52YWxpZFwiKTtcblx0fVxuXG5cdC8vV3JpdGVzIHBhcnNlZCBlbGVtZW50cyBvdXQgdG8gdGhlIGhhbmRsZXJcblx0UGFyc2VyLnByb3RvdHlwZS53cml0ZUhhbmRsZXIgPSBmdW5jdGlvbiBQYXJzZXIkd3JpdGVIYW5kbGVyIChmb3JjZUZsdXNoKSB7XG5cdFx0Zm9yY2VGbHVzaCA9ICEhZm9yY2VGbHVzaDtcblx0XHRpZiAodGhpcy5fdGFnU3RhY2subGVuZ3RoICYmICFmb3JjZUZsdXNoKVxuXHRcdFx0cmV0dXJuO1xuXHRcdHdoaWxlICh0aGlzLl9lbGVtZW50cy5sZW5ndGgpIHtcblx0XHRcdHZhciBlbGVtZW50ID0gdGhpcy5fZWxlbWVudHMuc2hpZnQoKTtcblx0XHRcdHN3aXRjaCAoZWxlbWVudC50eXBlKSB7XG5cdFx0XHRcdGNhc2UgRWxlbWVudFR5cGUuQ29tbWVudDpcblx0XHRcdFx0XHR0aGlzLl9oYW5kbGVyLndyaXRlQ29tbWVudChlbGVtZW50KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBFbGVtZW50VHlwZS5EaXJlY3RpdmU6XG5cdFx0XHRcdFx0dGhpcy5faGFuZGxlci53cml0ZURpcmVjdGl2ZShlbGVtZW50KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSBFbGVtZW50VHlwZS5UZXh0OlxuXHRcdFx0XHRcdHRoaXMuX2hhbmRsZXIud3JpdGVUZXh0KGVsZW1lbnQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdHRoaXMuX2hhbmRsZXIud3JpdGVUYWcoZWxlbWVudCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0UGFyc2VyLnByb3RvdHlwZS5oYW5kbGVFcnJvciA9IGZ1bmN0aW9uIFBhcnNlciRoYW5kbGVFcnJvciAoZXJyb3IpIHtcblx0XHRpZiAoKHR5cGVvZiB0aGlzLl9oYW5kbGVyLmVycm9yKSA9PSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aGlzLl9oYW5kbGVyLmVycm9yKGVycm9yKTtcblx0XHRlbHNlXG5cdFx0XHR0aHJvdyBlcnJvcjtcblx0fVxuXG4vL1RPRE86IG1ha2UgdGhpcyBhIHRydWxseSBzdHJlYW1hYmxlIGhhbmRsZXJcbmZ1bmN0aW9uIFJzc0hhbmRsZXIgKGNhbGxiYWNrKSB7XG5cdFJzc0hhbmRsZXIuc3VwZXJfLmNhbGwodGhpcywgY2FsbGJhY2ssIHsgaWdub3JlV2hpdGVzcGFjZTogdHJ1ZSwgdmVyYm9zZTogZmFsc2UsIGVuZm9yY2VFbXB0eVRhZ3M6IGZhbHNlIH0pO1xufVxuaW5oZXJpdHMoUnNzSGFuZGxlciwgRGVmYXVsdEhhbmRsZXIpO1xuXG5cdFJzc0hhbmRsZXIucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiBSc3NIYW5kbGVyJGRvbmUgKCkge1xuXHRcdHZhciBmZWVkID0geyB9O1xuXHRcdHZhciBmZWVkUm9vdDtcblxuXHRcdHZhciBmb3VuZCA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKGZ1bmN0aW9uICh2YWx1ZSkgeyByZXR1cm4odmFsdWUgPT0gXCJyc3NcIiB8fCB2YWx1ZSA9PSBcImZlZWRcIik7IH0sIHRoaXMuZG9tLCBmYWxzZSk7XG5cdFx0aWYgKGZvdW5kLmxlbmd0aCkge1xuXHRcdFx0ZmVlZFJvb3QgPSBmb3VuZFswXTtcblx0XHR9XG5cdFx0aWYgKGZlZWRSb290KSB7XG5cdFx0XHRpZiAoZmVlZFJvb3QubmFtZSA9PSBcInJzc1wiKSB7XG5cdFx0XHRcdGZlZWQudHlwZSA9IFwicnNzXCI7XG5cdFx0XHRcdGZlZWRSb290ID0gZmVlZFJvb3QuY2hpbGRyZW5bMF07IC8vPGNoYW5uZWwvPlxuXHRcdFx0XHRmZWVkLmlkID0gXCJcIjtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLnRpdGxlID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ0aXRsZVwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLmxpbmsgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImxpbmtcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5kZXNjcmlwdGlvbiA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZGVzY3JpcHRpb25cIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC51cGRhdGVkID0gbmV3IERhdGUoRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsYXN0QnVpbGREYXRlXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLmF1dGhvciA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibWFuYWdpbmdFZGl0b3JcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdGZlZWQuaXRlbXMgPSBbXTtcblx0XHRcdFx0RG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpdGVtXCIsIGZlZWRSb290LmNoaWxkcmVuKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0XHRcdHZhciBlbnRyeSA9IHt9O1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5pZCA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZ3VpZFwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LnRpdGxlID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ0aXRsZVwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LmxpbmsgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImxpbmtcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5kZXNjcmlwdGlvbiA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZGVzY3JpcHRpb25cIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5wdWJEYXRlID0gbmV3IERhdGUoRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJwdWJEYXRlXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhKTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0ZmVlZC5pdGVtcy5wdXNoKGVudHJ5KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmZWVkLnR5cGUgPSBcImF0b21cIjtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLmlkID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpZFwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLnRpdGxlID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ0aXRsZVwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLmxpbmsgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImxpbmtcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5hdHRyaWJzLmhyZWY7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLmRlc2NyaXB0aW9uID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzdWJ0aXRsZVwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLnVwZGF0ZWQgPSBuZXcgRGF0ZShEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInVwZGF0ZWRcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhKTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQuYXV0aG9yID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJlbWFpbFwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgdHJ1ZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRmZWVkLml0ZW1zID0gW107XG5cdFx0XHRcdERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZW50cnlcIiwgZmVlZFJvb3QuY2hpbGRyZW4pLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0sIGluZGV4LCBsaXN0KSB7XG5cdFx0XHRcdFx0dmFyIGVudHJ5ID0ge307XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LmlkID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpZFwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LnRpdGxlID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ0aXRsZVwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LmxpbmsgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImxpbmtcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmF0dHJpYnMuaHJlZjtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LmRlc2NyaXB0aW9uID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzdW1tYXJ5XCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkucHViRGF0ZSA9IG5ldyBEYXRlKERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidXBkYXRlZFwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdGZlZWQuaXRlbXMucHVzaChlbnRyeSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmRvbSA9IGZlZWQ7XG5cdFx0fVxuXHRcdFJzc0hhbmRsZXIuc3VwZXJfLnByb3RvdHlwZS5kb25lLmNhbGwodGhpcyk7XG5cdH1cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbmZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyIChjYWxsYmFjaywgb3B0aW9ucykge1xuXHR0aGlzLnJlc2V0KCk7XG5cdHRoaXMuX29wdGlvbnMgPSBvcHRpb25zID8gb3B0aW9ucyA6IHsgfTtcblx0aWYgKHRoaXMuX29wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSA9PSB1bmRlZmluZWQpXG5cdFx0dGhpcy5fb3B0aW9ucy5pZ25vcmVXaGl0ZXNwYWNlID0gZmFsc2U7IC8vS2VlcCB3aGl0ZXNwYWNlLW9ubHkgdGV4dCBub2Rlc1xuXHRpZiAodGhpcy5fb3B0aW9ucy52ZXJib3NlID09IHVuZGVmaW5lZClcblx0XHR0aGlzLl9vcHRpb25zLnZlcmJvc2UgPSB0cnVlOyAvL0tlZXAgZGF0YSBwcm9wZXJ0eSBmb3IgdGFncyBhbmQgcmF3IHByb3BlcnR5IGZvciBhbGxcblx0aWYgKHRoaXMuX29wdGlvbnMuZW5mb3JjZUVtcHR5VGFncyA9PSB1bmRlZmluZWQpXG5cdFx0dGhpcy5fb3B0aW9ucy5lbmZvcmNlRW1wdHlUYWdzID0gdHJ1ZTsgLy9Eb24ndCBhbGxvdyBjaGlsZHJlbiBmb3IgSFRNTCB0YWdzIGRlZmluZWQgYXMgZW1wdHkgaW4gc3BlY1xuXHRpZiAoKHR5cGVvZiBjYWxsYmFjaykgPT0gXCJmdW5jdGlvblwiKVxuXHRcdHRoaXMuX2NhbGxiYWNrID0gY2FsbGJhY2s7XG59XG5cblx0Ly8qKlwiU3RhdGljXCIqKi8vXG5cdC8vSFRNTCBUYWdzIHRoYXQgc2hvdWxkbid0IGNvbnRhaW4gY2hpbGQgbm9kZXNcblx0RGVmYXVsdEhhbmRsZXIuX2VtcHR5VGFncyA9IHtcblx0XHQgIGFyZWE6IDFcblx0XHQsIGJhc2U6IDFcblx0XHQsIGJhc2Vmb250OiAxXG5cdFx0LCBicjogMVxuXHRcdCwgY29sOiAxXG5cdFx0LCBmcmFtZTogMVxuXHRcdCwgaHI6IDFcblx0XHQsIGltZzogMVxuXHRcdCwgaW5wdXQ6IDFcblx0XHQsIGlzaW5kZXg6IDFcblx0XHQsIGxpbms6IDFcblx0XHQsIG1ldGE6IDFcblx0XHQsIHBhcmFtOiAxXG5cdFx0LCBlbWJlZDogMVxuXHR9XG5cdC8vUmVnZXggdG8gZGV0ZWN0IHdoaXRlc3BhY2Ugb25seSB0ZXh0IG5vZGVzXG5cdERlZmF1bHRIYW5kbGVyLnJlV2hpdGVzcGFjZSA9IC9eXFxzKiQvO1xuXG5cdC8vKipQdWJsaWMqKi8vXG5cdC8vUHJvcGVydGllcy8vXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5kb20gPSBudWxsOyAvL1RoZSBoaWVyYXJjaGljYWwgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHBhcnNlZCBIVE1MXG5cdC8vTWV0aG9kcy8vXG5cdC8vUmVzZXRzIHRoZSBoYW5kbGVyIGJhY2sgdG8gc3RhcnRpbmcgc3RhdGVcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkcmVzZXQoKSB7XG5cdFx0dGhpcy5kb20gPSBbXTtcblx0XHR0aGlzLl9kb25lID0gZmFsc2U7XG5cdFx0dGhpcy5fdGFnU3RhY2sgPSBbXTtcblx0XHR0aGlzLl90YWdTdGFjay5sYXN0ID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkX3RhZ1N0YWNrJGxhc3QgKCkge1xuXHRcdFx0cmV0dXJuKHRoaXMubGVuZ3RoID8gdGhpc1t0aGlzLmxlbmd0aCAtIDFdIDogbnVsbCk7XG5cdFx0fVxuXHR9XG5cdC8vU2lnbmFscyB0aGUgaGFuZGxlciB0aGF0IHBhcnNpbmcgaXMgZG9uZVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJGRvbmUgKCkge1xuXHRcdHRoaXMuX2RvbmUgPSB0cnVlO1xuXHRcdHRoaXMuaGFuZGxlQ2FsbGJhY2sobnVsbCk7XG5cdH1cblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLndyaXRlVGFnID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkd3JpdGVUYWcgKGVsZW1lbnQpIHtcblx0XHR0aGlzLmhhbmRsZUVsZW1lbnQoZWxlbWVudCk7XG5cdH0gXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS53cml0ZVRleHQgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciR3cml0ZVRleHQgKGVsZW1lbnQpIHtcblx0XHRpZiAodGhpcy5fb3B0aW9ucy5pZ25vcmVXaGl0ZXNwYWNlKVxuXHRcdFx0aWYgKERlZmF1bHRIYW5kbGVyLnJlV2hpdGVzcGFjZS50ZXN0KGVsZW1lbnQuZGF0YSkpXG5cdFx0XHRcdHJldHVybjtcblx0XHR0aGlzLmhhbmRsZUVsZW1lbnQoZWxlbWVudCk7XG5cdH0gXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS53cml0ZUNvbW1lbnQgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciR3cml0ZUNvbW1lbnQgKGVsZW1lbnQpIHtcblx0XHR0aGlzLmhhbmRsZUVsZW1lbnQoZWxlbWVudCk7XG5cdH0gXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS53cml0ZURpcmVjdGl2ZSA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHdyaXRlRGlyZWN0aXZlIChlbGVtZW50KSB7XG5cdFx0dGhpcy5oYW5kbGVFbGVtZW50KGVsZW1lbnQpO1xuXHR9XG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJGVycm9yIChlcnJvcikge1xuXHRcdHRoaXMuaGFuZGxlQ2FsbGJhY2soZXJyb3IpO1xuXHR9XG5cblx0Ly8qKlByaXZhdGUqKi8vXG5cdC8vUHJvcGVydGllcy8vXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5fb3B0aW9ucyA9IG51bGw7IC8vSGFuZGxlciBvcHRpb25zIGZvciBob3cgdG8gYmVoYXZlXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5fY2FsbGJhY2sgPSBudWxsOyAvL0NhbGxiYWNrIHRvIHJlc3BvbmQgdG8gd2hlbiBwYXJzaW5nIGRvbmVcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLl9kb25lID0gZmFsc2U7IC8vRmxhZyBpbmRpY2F0aW5nIHdoZXRoZXIgaGFuZGxlciBoYXMgYmVlbiBub3RpZmllZCBvZiBwYXJzaW5nIGNvbXBsZXRlZFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuX3RhZ1N0YWNrID0gbnVsbDsgLy9MaXN0IG9mIHBhcmVudHMgdG8gdGhlIGN1cnJlbnRseSBlbGVtZW50IGJlaW5nIHByb2Nlc3NlZFxuXHQvL01ldGhvZHMvL1xuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuaGFuZGxlQ2FsbGJhY2sgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRoYW5kbGVDYWxsYmFjayAoZXJyb3IpIHtcblx0XHRcdGlmICgodHlwZW9mIHRoaXMuX2NhbGxiYWNrKSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHRcdGlmIChlcnJvcilcblx0XHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdHRoaXMuX2NhbGxiYWNrKGVycm9yLCB0aGlzLmRvbSk7XG5cdH1cblx0XG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5pc0VtcHR5VGFnID0gZnVuY3Rpb24oZWxlbWVudCkge1xuXHRcdHZhciBuYW1lID0gZWxlbWVudC5uYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0aWYgKG5hbWUuY2hhckF0KDApID09ICcvJykge1xuXHRcdFx0bmFtZSA9IG5hbWUuc3Vic3RyaW5nKDEpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fb3B0aW9ucy5lbmZvcmNlRW1wdHlUYWdzICYmICEhRGVmYXVsdEhhbmRsZXIuX2VtcHR5VGFnc1tuYW1lXTtcblx0fTtcblx0XG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5oYW5kbGVFbGVtZW50ID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkaGFuZGxlRWxlbWVudCAoZWxlbWVudCkge1xuXHRcdGlmICh0aGlzLl9kb25lKVxuXHRcdFx0dGhpcy5oYW5kbGVDYWxsYmFjayhuZXcgRXJyb3IoXCJXcml0aW5nIHRvIHRoZSBoYW5kbGVyIGFmdGVyIGRvbmUoKSBjYWxsZWQgaXMgbm90IGFsbG93ZWQgd2l0aG91dCBhIHJlc2V0KClcIikpO1xuXHRcdGlmICghdGhpcy5fb3B0aW9ucy52ZXJib3NlKSB7XG4vL1x0XHRcdGVsZW1lbnQucmF3ID0gbnVsbDsgLy9GSVhNRTogTm90IGNsZWFuXG5cdFx0XHQvL0ZJWE1FOiBTZXJpb3VzIHBlcmZvcm1hbmNlIHByb2JsZW0gdXNpbmcgZGVsZXRlXG5cdFx0XHRkZWxldGUgZWxlbWVudC5yYXc7XG5cdFx0XHRpZiAoZWxlbWVudC50eXBlID09IFwidGFnXCIgfHwgZWxlbWVudC50eXBlID09IFwic2NyaXB0XCIgfHwgZWxlbWVudC50eXBlID09IFwic3R5bGVcIilcblx0XHRcdFx0ZGVsZXRlIGVsZW1lbnQuZGF0YTtcblx0XHR9XG5cdFx0aWYgKCF0aGlzLl90YWdTdGFjay5sYXN0KCkpIHsgLy9UaGVyZSBhcmUgbm8gcGFyZW50IGVsZW1lbnRzXG5cdFx0XHQvL0lmIHRoZSBlbGVtZW50IGNhbiBiZSBhIGNvbnRhaW5lciwgYWRkIGl0IHRvIHRoZSB0YWcgc3RhY2sgYW5kIHRoZSB0b3AgbGV2ZWwgbGlzdFxuXHRcdFx0aWYgKGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UZXh0ICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5Db21tZW50ICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5EaXJlY3RpdmUpIHtcblx0XHRcdFx0aWYgKGVsZW1lbnQubmFtZS5jaGFyQXQoMCkgIT0gXCIvXCIpIHsgLy9JZ25vcmUgY2xvc2luZyB0YWdzIHRoYXQgb2J2aW91c2x5IGRvbid0IGhhdmUgYW4gb3BlbmluZyB0YWdcblx0XHRcdFx0XHR0aGlzLmRvbS5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0XHRcdGlmICghdGhpcy5pc0VtcHR5VGFnKGVsZW1lbnQpKSB7IC8vRG9uJ3QgYWRkIHRhZ3MgdG8gdGhlIHRhZyBzdGFjayB0aGF0IGNhbid0IGhhdmUgY2hpbGRyZW5cblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnB1c2goZWxlbWVudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlIC8vT3RoZXJ3aXNlIGp1c3QgYWRkIHRvIHRoZSB0b3AgbGV2ZWwgbGlzdFxuXHRcdFx0XHR0aGlzLmRvbS5wdXNoKGVsZW1lbnQpO1xuXHRcdH1cblx0XHRlbHNlIHsgLy9UaGVyZSBhcmUgcGFyZW50IGVsZW1lbnRzXG5cdFx0XHQvL0lmIHRoZSBlbGVtZW50IGNhbiBiZSBhIGNvbnRhaW5lciwgYWRkIGl0IGFzIGEgY2hpbGQgb2YgdGhlIGVsZW1lbnRcblx0XHRcdC8vb24gdG9wIG9mIHRoZSB0YWcgc3RhY2sgYW5kIHRoZW4gYWRkIGl0IHRvIHRoZSB0YWcgc3RhY2tcblx0XHRcdGlmIChlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuVGV4dCAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuQ29tbWVudCAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuRGlyZWN0aXZlKSB7XG5cdFx0XHRcdGlmIChlbGVtZW50Lm5hbWUuY2hhckF0KDApID09IFwiL1wiKSB7XG5cdFx0XHRcdFx0Ly9UaGlzIGlzIGEgY2xvc2luZyB0YWcsIHNjYW4gdGhlIHRhZ1N0YWNrIHRvIGZpbmQgdGhlIG1hdGNoaW5nIG9wZW5pbmcgdGFnXG5cdFx0XHRcdFx0Ly9hbmQgcG9wIHRoZSBzdGFjayB1cCB0byB0aGUgb3BlbmluZyB0YWcncyBwYXJlbnRcblx0XHRcdFx0XHR2YXIgYmFzZU5hbWUgPSBlbGVtZW50Lm5hbWUuc3Vic3RyaW5nKDEpO1xuXHRcdFx0XHRcdGlmICghdGhpcy5pc0VtcHR5VGFnKGVsZW1lbnQpKSB7XG5cdFx0XHRcdFx0XHR2YXIgcG9zID0gdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMTtcblx0XHRcdFx0XHRcdHdoaWxlIChwb3MgPiAtMSAmJiB0aGlzLl90YWdTdGFja1twb3MtLV0ubmFtZSAhPSBiYXNlTmFtZSkgeyB9XG5cdFx0XHRcdFx0XHRpZiAocG9zID4gLTEgfHwgdGhpcy5fdGFnU3RhY2tbMF0ubmFtZSA9PSBiYXNlTmFtZSlcblx0XHRcdFx0XHRcdFx0d2hpbGUgKHBvcyA8IHRoaXMuX3RhZ1N0YWNrLmxlbmd0aCAtIDEpXG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucG9wKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgeyAvL1RoaXMgaXMgbm90IGEgY2xvc2luZyB0YWdcblx0XHRcdFx0XHRpZiAoIXRoaXMuX3RhZ1N0YWNrLmxhc3QoKS5jaGlsZHJlbilcblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLmxhc3QoKS5jaGlsZHJlbiA9IFtdO1xuXHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLmxhc3QoKS5jaGlsZHJlbi5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0XHRcdGlmICghdGhpcy5pc0VtcHR5VGFnKGVsZW1lbnQpKSAvL0Rvbid0IGFkZCB0YWdzIHRvIHRoZSB0YWcgc3RhY2sgdGhhdCBjYW4ndCBoYXZlIGNoaWxkcmVuXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHsgLy9UaGlzIGlzIG5vdCBhIGNvbnRhaW5lciBlbGVtZW50XG5cdFx0XHRcdGlmICghdGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuKVxuXHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLmxhc3QoKS5jaGlsZHJlbiA9IFtdO1xuXHRcdFx0XHR0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4ucHVzaChlbGVtZW50KTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHR2YXIgRG9tVXRpbHMgPSB7XG5cdFx0ICB0ZXN0RWxlbWVudDogZnVuY3Rpb24gRG9tVXRpbHMkdGVzdEVsZW1lbnQgKG9wdGlvbnMsIGVsZW1lbnQpIHtcblx0XHRcdGlmICghZWxlbWVudCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFxuXHRcdFx0Zm9yICh2YXIga2V5IGluIG9wdGlvbnMpIHtcblx0XHRcdFx0aWYgKGtleSA9PSBcInRhZ19uYW1lXCIpIHtcblx0XHRcdFx0XHRpZiAoZWxlbWVudC50eXBlICE9IFwidGFnXCIgJiYgZWxlbWVudC50eXBlICE9IFwic2NyaXB0XCIgJiYgZWxlbWVudC50eXBlICE9IFwic3R5bGVcIikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIW9wdGlvbnNbXCJ0YWdfbmFtZVwiXShlbGVtZW50Lm5hbWUpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKGtleSA9PSBcInRhZ190eXBlXCIpIHtcblx0XHRcdFx0XHRpZiAoIW9wdGlvbnNbXCJ0YWdfdHlwZVwiXShlbGVtZW50LnR5cGUpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2UgaWYgKGtleSA9PSBcInRhZ19jb250YWluc1wiKSB7XG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQudHlwZSAhPSBcInRleHRcIiAmJiBlbGVtZW50LnR5cGUgIT0gXCJjb21tZW50XCIgJiYgZWxlbWVudC50eXBlICE9IFwiZGlyZWN0aXZlXCIpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCFvcHRpb25zW1widGFnX2NvbnRhaW5zXCJdKGVsZW1lbnQuZGF0YSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKCFlbGVtZW50LmF0dHJpYnMgfHwgIW9wdGlvbnNba2V5XShlbGVtZW50LmF0dHJpYnNba2V5XSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XG5cdFx0LCBnZXRFbGVtZW50czogZnVuY3Rpb24gRG9tVXRpbHMkZ2V0RWxlbWVudHMgKG9wdGlvbnMsIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCBsaW1pdCkge1xuXHRcdFx0cmVjdXJzZSA9IChyZWN1cnNlID09PSB1bmRlZmluZWQgfHwgcmVjdXJzZSA9PT0gbnVsbCkgfHwgISFyZWN1cnNlO1xuXHRcdFx0bGltaXQgPSBpc05hTihwYXJzZUludChsaW1pdCkpID8gLTEgOiBwYXJzZUludChsaW1pdCk7XG5cblx0XHRcdGlmICghY3VycmVudEVsZW1lbnQpIHtcblx0XHRcdFx0cmV0dXJuKFtdKTtcblx0XHRcdH1cblx0XG5cdFx0XHR2YXIgZm91bmQgPSBbXTtcblx0XHRcdHZhciBlbGVtZW50TGlzdDtcblxuXHRcdFx0ZnVuY3Rpb24gZ2V0VGVzdCAoY2hlY2tWYWwpIHtcblx0XHRcdFx0cmV0dXJuKGZ1bmN0aW9uICh2YWx1ZSkgeyByZXR1cm4odmFsdWUgPT0gY2hlY2tWYWwpOyB9KTtcblx0XHRcdH1cblx0XHRcdGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdGlmICgodHlwZW9mIG9wdGlvbnNba2V5XSkgIT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0b3B0aW9uc1trZXldID0gZ2V0VGVzdChvcHRpb25zW2tleV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFxuXHRcdFx0aWYgKERvbVV0aWxzLnRlc3RFbGVtZW50KG9wdGlvbnMsIGN1cnJlbnRFbGVtZW50KSkge1xuXHRcdFx0XHRmb3VuZC5wdXNoKGN1cnJlbnRFbGVtZW50KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGxpbWl0ID49IDAgJiYgZm91bmQubGVuZ3RoID49IGxpbWl0KSB7XG5cdFx0XHRcdHJldHVybihmb3VuZCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChyZWN1cnNlICYmIGN1cnJlbnRFbGVtZW50LmNoaWxkcmVuKSB7XG5cdFx0XHRcdGVsZW1lbnRMaXN0ID0gY3VycmVudEVsZW1lbnQuY2hpbGRyZW47XG5cdFx0XHR9IGVsc2UgaWYgKGN1cnJlbnRFbGVtZW50IGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0ZWxlbWVudExpc3QgPSBjdXJyZW50RWxlbWVudDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybihmb3VuZCk7XG5cdFx0XHR9XG5cdFxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50TGlzdC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRmb3VuZCA9IGZvdW5kLmNvbmNhdChEb21VdGlscy5nZXRFbGVtZW50cyhvcHRpb25zLCBlbGVtZW50TGlzdFtpXSwgcmVjdXJzZSwgbGltaXQpKTtcblx0XHRcdFx0aWYgKGxpbWl0ID49IDAgJiYgZm91bmQubGVuZ3RoID49IGxpbWl0KSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XG5cdFx0XHRyZXR1cm4oZm91bmQpO1xuXHRcdH1cblx0XHRcblx0XHQsIGdldEVsZW1lbnRCeUlkOiBmdW5jdGlvbiBEb21VdGlscyRnZXRFbGVtZW50QnlJZCAoaWQsIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlKSB7XG5cdFx0XHR2YXIgcmVzdWx0ID0gRG9tVXRpbHMuZ2V0RWxlbWVudHMoeyBpZDogaWQgfSwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIDEpO1xuXHRcdFx0cmV0dXJuKHJlc3VsdC5sZW5ndGggPyByZXN1bHRbMF0gOiBudWxsKTtcblx0XHR9XG5cdFx0XG5cdFx0LCBnZXRFbGVtZW50c0J5VGFnTmFtZTogZnVuY3Rpb24gRG9tVXRpbHMkZ2V0RWxlbWVudHNCeVRhZ05hbWUgKG5hbWUsIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCBsaW1pdCkge1xuXHRcdFx0cmV0dXJuKERvbVV0aWxzLmdldEVsZW1lbnRzKHsgdGFnX25hbWU6IG5hbWUgfSwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIGxpbWl0KSk7XG5cdFx0fVxuXHRcdFxuXHRcdCwgZ2V0RWxlbWVudHNCeVRhZ1R5cGU6IGZ1bmN0aW9uIERvbVV0aWxzJGdldEVsZW1lbnRzQnlUYWdUeXBlICh0eXBlLCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpIHtcblx0XHRcdHJldHVybihEb21VdGlscy5nZXRFbGVtZW50cyh7IHRhZ190eXBlOiB0eXBlIH0sIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCBsaW1pdCkpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGluaGVyaXRzIChjdG9yLCBzdXBlckN0b3IpIHtcblx0XHR2YXIgdGVtcEN0b3IgPSBmdW5jdGlvbigpe307XG5cdFx0dGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZTtcblx0XHRjdG9yLnN1cGVyXyA9IHN1cGVyQ3Rvcjtcblx0XHRjdG9yLnByb3RvdHlwZSA9IG5ldyB0ZW1wQ3RvcigpO1xuXHRcdGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3Rvcjtcblx0fVxuXG5leHBvcnRzLlBhcnNlciA9IFBhcnNlcjtcblxuZXhwb3J0cy5EZWZhdWx0SGFuZGxlciA9IERlZmF1bHRIYW5kbGVyO1xuXG5leHBvcnRzLlJzc0hhbmRsZXIgPSBSc3NIYW5kbGVyO1xuXG5leHBvcnRzLkVsZW1lbnRUeXBlID0gRWxlbWVudFR5cGU7XG5cbmV4cG9ydHMuRG9tVXRpbHMgPSBEb21VdGlscztcblxufSkoKTtcblxufSkuY2FsbCh0aGlzLFwiL25vZGVfbW9kdWxlcy9odG1sUGFyc2VyL2xpYi9odG1scGFyc2VyLmpzXCIsXCIvbm9kZV9tb2R1bGVzL2h0bWxQYXJzZXIvbGliXCIpIiwidmFyIGNyZWF0ZUVsZW1lbnQgPSByZXF1aXJlKFwidmRvbS9jcmVhdGUtZWxlbWVudFwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUVsZW1lbnRcbiIsInZhciBkaWZmID0gcmVxdWlyZShcInZ0cmVlL2RpZmZcIilcblxubW9kdWxlLmV4cG9ydHMgPSBkaWZmXG4iLCJ2YXIgaCA9IHJlcXVpcmUoXCIuL2gvaW5kZXguanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBoXG4iLCJ2YXIgaXNBcnJheSA9IHJlcXVpcmUoXCJ4LWlzLWFycmF5XCIpXG52YXIgaXNTdHJpbmcgPSByZXF1aXJlKFwieC1pcy1zdHJpbmdcIilcblxudmFyIFZOb2RlID0gcmVxdWlyZShcInZ0cmVlL3Zub2RlLmpzXCIpXG52YXIgVlRleHQgPSByZXF1aXJlKFwidnRyZWUvdnRleHQuanNcIilcbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcInZ0cmVlL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcInZ0cmVlL2lzLXdpZGdldFwiKVxuXG52YXIgcGFyc2VUYWcgPSByZXF1aXJlKFwiLi9wYXJzZS10YWdcIilcblxubW9kdWxlLmV4cG9ydHMgPSBoXG5cbmZ1bmN0aW9uIGgodGFnTmFtZSwgcHJvcGVydGllcywgY2hpbGRyZW4pIHtcbiAgICB2YXIgdGFnLCBwcm9wcywgY2hpbGROb2Rlcywga2V5XG5cbiAgICBpZiAoIWNoaWxkcmVuKSB7XG4gICAgICAgIGlmIChpc0NoaWxkcmVuKHByb3BlcnRpZXMpKSB7XG4gICAgICAgICAgICBjaGlsZHJlbiA9IHByb3BlcnRpZXNcbiAgICAgICAgICAgIHByb3BlcnRpZXMgPSB1bmRlZmluZWRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRhZyA9IHBhcnNlVGFnKHRhZ05hbWUsIHByb3BlcnRpZXMpXG5cbiAgICBpZiAoIWlzU3RyaW5nKHRhZykpIHtcbiAgICAgICAgcHJvcHMgPSB0YWcucHJvcGVydGllc1xuICAgICAgICB0YWcgPSB0YWcudGFnTmFtZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHByb3BzID0gcHJvcGVydGllc1xuICAgIH1cblxuICAgIGlmIChpc0FycmF5KGNoaWxkcmVuKSkge1xuICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhjaGlsZCkpIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbltpXSA9IG5ldyBWVGV4dChjaGlsZClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNoaWxkTm9kZXMgPSBjaGlsZHJlblxuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoY2hpbGRyZW4pKSB7XG4gICAgICAgIGNoaWxkTm9kZXMgPSBbbmV3IFZUZXh0KGNoaWxkcmVuKV1cbiAgICB9IGVsc2UgaWYgKGlzQ2hpbGQoY2hpbGRyZW4pKSB7XG4gICAgICAgIGNoaWxkTm9kZXMgPSBbY2hpbGRyZW5dXG4gICAgfVxuXG4gICAgaWYgKHByb3BzICYmIFwia2V5XCIgaW4gcHJvcHMpIHtcbiAgICAgICAga2V5ID0gcHJvcHMua2V5XG4gICAgICAgIGRlbGV0ZSBwcm9wcy5rZXlcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFZOb2RlKHRhZywgcHJvcHMsIGNoaWxkTm9kZXMsIGtleSlcbn1cblxuZnVuY3Rpb24gaXNDaGlsZCh4KSB7XG4gICAgcmV0dXJuIGlzVk5vZGUoeCkgfHwgaXNWVGV4dCh4KSB8fCBpc1dpZGdldCh4KVxufVxuXG5mdW5jdGlvbiBpc0NoaWxkcmVuKHgpIHtcbiAgICByZXR1cm4gaXNBcnJheSh4KSB8fCBpc1N0cmluZyh4KSB8fCBpc0NoaWxkKHgpXG59XG4iLCJ2YXIgc3BsaXQgPSByZXF1aXJlKFwiYnJvd3Nlci1zcGxpdFwiKVxuXG52YXIgY2xhc3NJZFNwbGl0ID0gLyhbXFwuI10/W2EtekEtWjAtOV86LV0rKS9cbnZhciBub3RDbGFzc0lkID0gL15cXC58Iy9cblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZVRhZ1xuXG5mdW5jdGlvbiBwYXJzZVRhZyh0YWcsIHByb3BzKSB7XG4gICAgaWYgKCF0YWcpIHtcbiAgICAgICAgcmV0dXJuIFwiZGl2XCJcbiAgICB9XG5cbiAgICB2YXIgbm9JZCA9ICFwcm9wcyB8fCAhKFwiaWRcIiBpbiBwcm9wcylcblxuICAgIHZhciB0YWdQYXJ0cyA9IHNwbGl0KHRhZywgY2xhc3NJZFNwbGl0KVxuICAgIHZhciB0YWdOYW1lID0gbnVsbFxuXG4gICAgaWYobm90Q2xhc3NJZC50ZXN0KHRhZ1BhcnRzWzFdKSkge1xuICAgICAgICB0YWdOYW1lID0gXCJkaXZcIlxuICAgIH1cblxuICAgIHZhciBpZCwgY2xhc3NlcywgcGFydCwgdHlwZSwgaVxuICAgIGZvciAoaSA9IDA7IGkgPCB0YWdQYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJ0ID0gdGFnUGFydHNbaV1cblxuICAgICAgICBpZiAoIXBhcnQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICB0eXBlID0gcGFydC5jaGFyQXQoMClcblxuICAgICAgICBpZiAoIXRhZ05hbWUpIHtcbiAgICAgICAgICAgIHRhZ05hbWUgPSBwYXJ0XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCIuXCIpIHtcbiAgICAgICAgICAgIGNsYXNzZXMgPSBjbGFzc2VzIHx8IFtdXG4gICAgICAgICAgICBjbGFzc2VzLnB1c2gocGFydC5zdWJzdHJpbmcoMSwgcGFydC5sZW5ndGgpKVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwiI1wiICYmIG5vSWQpIHtcbiAgICAgICAgICAgIGlkID0gcGFydC5zdWJzdHJpbmcoMSwgcGFydC5sZW5ndGgpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcGFyc2VkVGFnc1xuXG4gICAgaWYgKHByb3BzKSB7XG4gICAgICAgIGlmIChpZCAhPT0gdW5kZWZpbmVkICYmICEoXCJpZFwiIGluIHByb3BzKSkge1xuICAgICAgICAgICAgcHJvcHMuaWQgPSBpZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNsYXNzZXMpIHtcbiAgICAgICAgICAgIGlmIChwcm9wcy5jbGFzc05hbWUpIHtcbiAgICAgICAgICAgICAgICBjbGFzc2VzLnB1c2gocHJvcHMuY2xhc3NOYW1lKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcm9wcy5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oXCIgXCIpXG4gICAgICAgIH1cblxuICAgICAgICBwYXJzZWRUYWdzID0gdGFnTmFtZVxuICAgIH0gZWxzZSBpZiAoY2xhc3NlcyB8fCBpZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhciBwcm9wZXJ0aWVzID0ge31cblxuICAgICAgICBpZiAoaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcHJvcGVydGllcy5pZCA9IGlkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2xhc3Nlcykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oXCIgXCIpXG4gICAgICAgIH1cblxuICAgICAgICBwYXJzZWRUYWdzID0ge1xuICAgICAgICAgICAgdGFnTmFtZTogdGFnTmFtZSxcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHByb3BlcnRpZXNcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnNlZFRhZ3MgPSB0YWdOYW1lXG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlZFRhZ3Ncbn1cbiIsIi8qIVxuICogQ3Jvc3MtQnJvd3NlciBTcGxpdCAxLjEuMVxuICogQ29weXJpZ2h0IDIwMDctMjAxMiBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT5cbiAqIEF2YWlsYWJsZSB1bmRlciB0aGUgTUlUIExpY2Vuc2VcbiAqIEVDTUFTY3JpcHQgY29tcGxpYW50LCB1bmlmb3JtIGNyb3NzLWJyb3dzZXIgc3BsaXQgbWV0aG9kXG4gKi9cblxuLyoqXG4gKiBTcGxpdHMgYSBzdHJpbmcgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzIHVzaW5nIGEgcmVnZXggb3Igc3RyaW5nIHNlcGFyYXRvci4gTWF0Y2hlcyBvZiB0aGVcbiAqIHNlcGFyYXRvciBhcmUgbm90IGluY2x1ZGVkIGluIHRoZSByZXN1bHQgYXJyYXkuIEhvd2V2ZXIsIGlmIGBzZXBhcmF0b3JgIGlzIGEgcmVnZXggdGhhdCBjb250YWluc1xuICogY2FwdHVyaW5nIGdyb3VwcywgYmFja3JlZmVyZW5jZXMgYXJlIHNwbGljZWQgaW50byB0aGUgcmVzdWx0IGVhY2ggdGltZSBgc2VwYXJhdG9yYCBpcyBtYXRjaGVkLlxuICogRml4ZXMgYnJvd3NlciBidWdzIGNvbXBhcmVkIHRvIHRoZSBuYXRpdmUgYFN0cmluZy5wcm90b3R5cGUuc3BsaXRgIGFuZCBjYW4gYmUgdXNlZCByZWxpYWJseVxuICogY3Jvc3MtYnJvd3Nlci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgU3RyaW5nIHRvIHNwbGl0LlxuICogQHBhcmFtIHtSZWdFeHB8U3RyaW5nfSBzZXBhcmF0b3IgUmVnZXggb3Igc3RyaW5nIHRvIHVzZSBmb3Igc2VwYXJhdGluZyB0aGUgc3RyaW5nLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtsaW1pdF0gTWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gaW5jbHVkZSBpbiB0aGUgcmVzdWx0IGFycmF5LlxuICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJzdHJpbmdzLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBCYXNpYyB1c2VcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnKTtcbiAqIC8vIC0+IFsnYScsICdiJywgJ2MnLCAnZCddXG4gKlxuICogLy8gV2l0aCBsaW1pdFxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcsIDIpO1xuICogLy8gLT4gWydhJywgJ2InXVxuICpcbiAqIC8vIEJhY2tyZWZlcmVuY2VzIGluIHJlc3VsdCBhcnJheVxuICogc3BsaXQoJy4ud29yZDEgd29yZDIuLicsIC8oW2Etel0rKShcXGQrKS9pKTtcbiAqIC8vIC0+IFsnLi4nLCAnd29yZCcsICcxJywgJyAnLCAnd29yZCcsICcyJywgJy4uJ11cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gc3BsaXQodW5kZWYpIHtcblxuICB2YXIgbmF0aXZlU3BsaXQgPSBTdHJpbmcucHJvdG90eXBlLnNwbGl0LFxuICAgIGNvbXBsaWFudEV4ZWNOcGNnID0gLygpPz8vLmV4ZWMoXCJcIilbMV0gPT09IHVuZGVmLFxuICAgIC8vIE5QQ0c6IG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3VwXG4gICAgc2VsZjtcblxuICBzZWxmID0gZnVuY3Rpb24oc3RyLCBzZXBhcmF0b3IsIGxpbWl0KSB7XG4gICAgLy8gSWYgYHNlcGFyYXRvcmAgaXMgbm90IGEgcmVnZXgsIHVzZSBgbmF0aXZlU3BsaXRgXG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzZXBhcmF0b3IpICE9PSBcIltvYmplY3QgUmVnRXhwXVwiKSB7XG4gICAgICByZXR1cm4gbmF0aXZlU3BsaXQuY2FsbChzdHIsIHNlcGFyYXRvciwgbGltaXQpO1xuICAgIH1cbiAgICB2YXIgb3V0cHV0ID0gW10sXG4gICAgICBmbGFncyA9IChzZXBhcmF0b3IuaWdub3JlQ2FzZSA/IFwiaVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLm11bHRpbGluZSA/IFwibVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLmV4dGVuZGVkID8gXCJ4XCIgOiBcIlwiKSArIC8vIFByb3Bvc2VkIGZvciBFUzZcbiAgICAgIChzZXBhcmF0b3Iuc3RpY2t5ID8gXCJ5XCIgOiBcIlwiKSxcbiAgICAgIC8vIEZpcmVmb3ggMytcbiAgICAgIGxhc3RMYXN0SW5kZXggPSAwLFxuICAgICAgLy8gTWFrZSBgZ2xvYmFsYCBhbmQgYXZvaWQgYGxhc3RJbmRleGAgaXNzdWVzIGJ5IHdvcmtpbmcgd2l0aCBhIGNvcHlcbiAgICAgIHNlcGFyYXRvciA9IG5ldyBSZWdFeHAoc2VwYXJhdG9yLnNvdXJjZSwgZmxhZ3MgKyBcImdcIiksXG4gICAgICBzZXBhcmF0b3IyLCBtYXRjaCwgbGFzdEluZGV4LCBsYXN0TGVuZ3RoO1xuICAgIHN0ciArPSBcIlwiOyAvLyBUeXBlLWNvbnZlcnRcbiAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnKSB7XG4gICAgICAvLyBEb2Vzbid0IG5lZWQgZmxhZ3MgZ3ksIGJ1dCB0aGV5IGRvbid0IGh1cnRcbiAgICAgIHNlcGFyYXRvcjIgPSBuZXcgUmVnRXhwKFwiXlwiICsgc2VwYXJhdG9yLnNvdXJjZSArIFwiJCg/IVxcXFxzKVwiLCBmbGFncyk7XG4gICAgfVxuICAgIC8qIFZhbHVlcyBmb3IgYGxpbWl0YCwgcGVyIHRoZSBzcGVjOlxuICAgICAqIElmIHVuZGVmaW5lZDogNDI5NDk2NzI5NSAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgICogSWYgMCwgSW5maW5pdHksIG9yIE5hTjogMFxuICAgICAqIElmIHBvc2l0aXZlIG51bWJlcjogbGltaXQgPSBNYXRoLmZsb29yKGxpbWl0KTsgaWYgKGxpbWl0ID4gNDI5NDk2NzI5NSkgbGltaXQgLT0gNDI5NDk2NzI5NjtcbiAgICAgKiBJZiBuZWdhdGl2ZSBudW1iZXI6IDQyOTQ5NjcyOTYgLSBNYXRoLmZsb29yKE1hdGguYWJzKGxpbWl0KSlcbiAgICAgKiBJZiBvdGhlcjogVHlwZS1jb252ZXJ0LCB0aGVuIHVzZSB0aGUgYWJvdmUgcnVsZXNcbiAgICAgKi9cbiAgICBsaW1pdCA9IGxpbWl0ID09PSB1bmRlZiA/IC0xID4+PiAwIDogLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgIGxpbWl0ID4+PiAwOyAvLyBUb1VpbnQzMihsaW1pdClcbiAgICB3aGlsZSAobWF0Y2ggPSBzZXBhcmF0b3IuZXhlYyhzdHIpKSB7XG4gICAgICAvLyBgc2VwYXJhdG9yLmxhc3RJbmRleGAgaXMgbm90IHJlbGlhYmxlIGNyb3NzLWJyb3dzZXJcbiAgICAgIGxhc3RJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgaWYgKGxhc3RJbmRleCA+IGxhc3RMYXN0SW5kZXgpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgIC8vIEZpeCBicm93c2VycyB3aG9zZSBgZXhlY2AgbWV0aG9kcyBkb24ndCBjb25zaXN0ZW50bHkgcmV0dXJuIGB1bmRlZmluZWRgIGZvclxuICAgICAgICAvLyBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cHNcbiAgICAgICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZyAmJiBtYXRjaC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWF0Y2hbMF0ucmVwbGFjZShzZXBhcmF0b3IyLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzW2ldID09PSB1bmRlZikge1xuICAgICAgICAgICAgICAgIG1hdGNoW2ldID0gdW5kZWY7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaC5pbmRleCA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShvdXRwdXQsIG1hdGNoLnNsaWNlKDEpKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0TGVuZ3RoID0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICBsYXN0TGFzdEluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgICBpZiAob3V0cHV0Lmxlbmd0aCA+PSBsaW1pdCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2VwYXJhdG9yLmxhc3RJbmRleCA9PT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgc2VwYXJhdG9yLmxhc3RJbmRleCsrOyAvLyBBdm9pZCBhbiBpbmZpbml0ZSBsb29wXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChsYXN0TGFzdEluZGV4ID09PSBzdHIubGVuZ3RoKSB7XG4gICAgICBpZiAobGFzdExlbmd0aCB8fCAhc2VwYXJhdG9yLnRlc3QoXCJcIikpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goXCJcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4KSk7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQubGVuZ3RoID4gbGltaXQgPyBvdXRwdXQuc2xpY2UoMCwgbGltaXQpIDogb3V0cHV0O1xuICB9O1xuXG4gIHJldHVybiBzZWxmO1xufSkoKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gaXNPYmplY3RcblxuZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gXCJvYmplY3RcIiAmJiB4ICE9PSBudWxsXG59XG4iLCJ2YXIgaXNPYmplY3QgPSByZXF1aXJlKFwiaXMtb2JqZWN0XCIpXG52YXIgaXNIb29rID0gcmVxdWlyZShcInZ0cmVlL2lzLXZob29rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gYXBwbHlQcm9wZXJ0aWVzXG5cbmZ1bmN0aW9uIGFwcGx5UHJvcGVydGllcyhub2RlLCBwcm9wcywgcHJldmlvdXMpIHtcbiAgICBmb3IgKHZhciBwcm9wTmFtZSBpbiBwcm9wcykge1xuICAgICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdXG5cbiAgICAgICAgaWYgKHByb3BWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZW1vdmVQcm9wZXJ0eShub2RlLCBwcm9wcywgcHJldmlvdXMsIHByb3BOYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0hvb2socHJvcFZhbHVlKSkge1xuICAgICAgICAgICAgcHJvcFZhbHVlLmhvb2sobm9kZSxcbiAgICAgICAgICAgICAgICBwcm9wTmFtZSxcbiAgICAgICAgICAgICAgICBwcmV2aW91cyA/IHByZXZpb3VzW3Byb3BOYW1lXSA6IHVuZGVmaW5lZClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc09iamVjdChwcm9wVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcGF0Y2hPYmplY3Qobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSwgcHJvcFZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHByb3BWYWx1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVQcm9wZXJ0eShub2RlLCBwcm9wcywgcHJldmlvdXMsIHByb3BOYW1lKSB7XG4gICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgIHZhciBwcmV2aW91c1ZhbHVlID0gcHJldmlvdXNbcHJvcE5hbWVdXG5cbiAgICAgICAgaWYgKCFpc0hvb2socHJldmlvdXNWYWx1ZSkpIHtcbiAgICAgICAgICAgIGlmIChwcm9wTmFtZSA9PT0gXCJhdHRyaWJ1dGVzXCIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhdHRyTmFtZSBpbiBwcmV2aW91c1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcE5hbWUgPT09IFwic3R5bGVcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcHJldmlvdXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnN0eWxlW2ldID0gXCJcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByZXZpb3VzVmFsdWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBub2RlW3Byb3BOYW1lXSA9IFwiXCJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHBhdGNoT2JqZWN0KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUsIHByb3BWYWx1ZSkge1xuICAgIHZhciBwcmV2aW91c1ZhbHVlID0gcHJldmlvdXMgPyBwcmV2aW91c1twcm9wTmFtZV0gOiB1bmRlZmluZWRcblxuICAgIC8vIFNldCBhdHRyaWJ1dGVzXG4gICAgaWYgKHByb3BOYW1lID09PSBcImF0dHJpYnV0ZXNcIikge1xuICAgICAgICBmb3IgKHZhciBhdHRyTmFtZSBpbiBwcm9wVmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBhdHRyVmFsdWUgPSBwcm9wVmFsdWVbYXR0ck5hbWVdXG5cbiAgICAgICAgICAgIGlmIChhdHRyVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgYXR0clZhbHVlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYocHJldmlvdXNWYWx1ZSAmJiBpc09iamVjdChwcmV2aW91c1ZhbHVlKSAmJlxuICAgICAgICBnZXRQcm90b3R5cGUocHJldmlvdXNWYWx1ZSkgIT09IGdldFByb3RvdHlwZShwcm9wVmFsdWUpKSB7XG4gICAgICAgIG5vZGVbcHJvcE5hbWVdID0gcHJvcFZhbHVlXG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICghaXNPYmplY3Qobm9kZVtwcm9wTmFtZV0pKSB7XG4gICAgICAgIG5vZGVbcHJvcE5hbWVdID0ge31cbiAgICB9XG5cbiAgICB2YXIgcmVwbGFjZXIgPSBwcm9wTmFtZSA9PT0gXCJzdHlsZVwiID8gXCJcIiA6IHVuZGVmaW5lZFxuXG4gICAgZm9yICh2YXIgayBpbiBwcm9wVmFsdWUpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcHJvcFZhbHVlW2tdXG4gICAgICAgIG5vZGVbcHJvcE5hbWVdW2tdID0gKHZhbHVlID09PSB1bmRlZmluZWQpID8gcmVwbGFjZXIgOiB2YWx1ZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJvdG90eXBlKHZhbHVlKSB7XG4gICAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKVxuICAgIH0gZWxzZSBpZiAodmFsdWUuX19wcm90b19fKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5fX3Byb3RvX19cbiAgICB9IGVsc2UgaWYgKHZhbHVlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGVcbiAgICB9XG59XG4iLCJ2YXIgZG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG5cbnZhciBhcHBseVByb3BlcnRpZXMgPSByZXF1aXJlKFwiLi9hcHBseS1wcm9wZXJ0aWVzXCIpXG5cbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcInZ0cmVlL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcInZ0cmVlL2lzLXdpZGdldFwiKVxudmFyIGhhbmRsZVRodW5rID0gcmVxdWlyZShcInZ0cmVlL2hhbmRsZS10aHVua1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUVsZW1lbnRcblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh2bm9kZSwgb3B0cykge1xuICAgIHZhciBkb2MgPSBvcHRzID8gb3B0cy5kb2N1bWVudCB8fCBkb2N1bWVudCA6IGRvY3VtZW50XG4gICAgdmFyIHdhcm4gPSBvcHRzID8gb3B0cy53YXJuIDogbnVsbFxuXG4gICAgdm5vZGUgPSBoYW5kbGVUaHVuayh2bm9kZSkuYVxuXG4gICAgaWYgKGlzV2lkZ2V0KHZub2RlKSkge1xuICAgICAgICByZXR1cm4gdm5vZGUuaW5pdCgpXG4gICAgfSBlbHNlIGlmIChpc1ZUZXh0KHZub2RlKSkge1xuICAgICAgICByZXR1cm4gZG9jLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpXG4gICAgfSBlbHNlIGlmICghaXNWTm9kZSh2bm9kZSkpIHtcbiAgICAgICAgaWYgKHdhcm4pIHtcbiAgICAgICAgICAgIHdhcm4oXCJJdGVtIGlzIG5vdCBhIHZhbGlkIHZpcnR1YWwgZG9tIG5vZGVcIiwgdm5vZGUpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9ICh2bm9kZS5uYW1lc3BhY2UgPT09IG51bGwpID9cbiAgICAgICAgZG9jLmNyZWF0ZUVsZW1lbnQodm5vZGUudGFnTmFtZSkgOlxuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudE5TKHZub2RlLm5hbWVzcGFjZSwgdm5vZGUudGFnTmFtZSlcblxuICAgIHZhciBwcm9wcyA9IHZub2RlLnByb3BlcnRpZXNcbiAgICBhcHBseVByb3BlcnRpZXMobm9kZSwgcHJvcHMpXG5cbiAgICB2YXIgY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGROb2RlID0gY3JlYXRlRWxlbWVudChjaGlsZHJlbltpXSwgb3B0cylcbiAgICAgICAgaWYgKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZE5vZGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZVxufVxuIiwiLy8gTWFwcyBhIHZpcnR1YWwgRE9NIHRyZWUgb250byBhIHJlYWwgRE9NIHRyZWUgaW4gYW4gZWZmaWNpZW50IG1hbm5lci5cbi8vIFdlIGRvbid0IHdhbnQgdG8gcmVhZCBhbGwgb2YgdGhlIERPTSBub2RlcyBpbiB0aGUgdHJlZSBzbyB3ZSB1c2Vcbi8vIHRoZSBpbi1vcmRlciB0cmVlIGluZGV4aW5nIHRvIGVsaW1pbmF0ZSByZWN1cnNpb24gZG93biBjZXJ0YWluIGJyYW5jaGVzLlxuLy8gV2Ugb25seSByZWN1cnNlIGludG8gYSBET00gbm9kZSBpZiB3ZSBrbm93IHRoYXQgaXQgY29udGFpbnMgYSBjaGlsZCBvZlxuLy8gaW50ZXJlc3QuXG5cbnZhciBub0NoaWxkID0ge31cblxubW9kdWxlLmV4cG9ydHMgPSBkb21JbmRleFxuXG5mdW5jdGlvbiBkb21JbmRleChyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMpIHtcbiAgICBpZiAoIWluZGljZXMgfHwgaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHt9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaW5kaWNlcy5zb3J0KGFzY2VuZGluZylcbiAgICAgICAgcmV0dXJuIHJlY3Vyc2Uocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzLCAwKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVjdXJzZShyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMsIHJvb3RJbmRleCkge1xuICAgIG5vZGVzID0gbm9kZXMgfHwge31cblxuXG4gICAgaWYgKHJvb3ROb2RlKSB7XG4gICAgICAgIGlmIChpbmRleEluUmFuZ2UoaW5kaWNlcywgcm9vdEluZGV4LCByb290SW5kZXgpKSB7XG4gICAgICAgICAgICBub2Rlc1tyb290SW5kZXhdID0gcm9vdE5vZGVcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2Q2hpbGRyZW4gPSB0cmVlLmNoaWxkcmVuXG5cbiAgICAgICAgaWYgKHZDaGlsZHJlbikge1xuXG4gICAgICAgICAgICB2YXIgY2hpbGROb2RlcyA9IHJvb3ROb2RlLmNoaWxkTm9kZXNcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmVlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcm9vdEluZGV4ICs9IDFcblxuICAgICAgICAgICAgICAgIHZhciB2Q2hpbGQgPSB2Q2hpbGRyZW5baV0gfHwgbm9DaGlsZFxuICAgICAgICAgICAgICAgIHZhciBuZXh0SW5kZXggPSByb290SW5kZXggKyAodkNoaWxkLmNvdW50IHx8IDApXG5cbiAgICAgICAgICAgICAgICAvLyBza2lwIHJlY3Vyc2lvbiBkb3duIHRoZSB0cmVlIGlmIHRoZXJlIGFyZSBubyBub2RlcyBkb3duIGhlcmVcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXhJblJhbmdlKGluZGljZXMsIHJvb3RJbmRleCwgbmV4dEluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICByZWN1cnNlKGNoaWxkTm9kZXNbaV0sIHZDaGlsZCwgaW5kaWNlcywgbm9kZXMsIHJvb3RJbmRleClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByb290SW5kZXggPSBuZXh0SW5kZXhcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2Rlc1xufVxuXG4vLyBCaW5hcnkgc2VhcmNoIGZvciBhbiBpbmRleCBpbiB0aGUgaW50ZXJ2YWwgW2xlZnQsIHJpZ2h0XVxuZnVuY3Rpb24gaW5kZXhJblJhbmdlKGluZGljZXMsIGxlZnQsIHJpZ2h0KSB7XG4gICAgaWYgKGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHZhciBtaW5JbmRleCA9IDBcbiAgICB2YXIgbWF4SW5kZXggPSBpbmRpY2VzLmxlbmd0aCAtIDFcbiAgICB2YXIgY3VycmVudEluZGV4XG4gICAgdmFyIGN1cnJlbnRJdGVtXG5cbiAgICB3aGlsZSAobWluSW5kZXggPD0gbWF4SW5kZXgpIHtcbiAgICAgICAgY3VycmVudEluZGV4ID0gKChtYXhJbmRleCArIG1pbkluZGV4KSAvIDIpID4+IDBcbiAgICAgICAgY3VycmVudEl0ZW0gPSBpbmRpY2VzW2N1cnJlbnRJbmRleF1cblxuICAgICAgICBpZiAobWluSW5kZXggPT09IG1heEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudEl0ZW0gPj0gbGVmdCAmJiBjdXJyZW50SXRlbSA8PSByaWdodFxuICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRJdGVtIDwgbGVmdCkge1xuICAgICAgICAgICAgbWluSW5kZXggPSBjdXJyZW50SW5kZXggKyAxXG4gICAgICAgIH0gZWxzZSAgaWYgKGN1cnJlbnRJdGVtID4gcmlnaHQpIHtcbiAgICAgICAgICAgIG1heEluZGV4ID0gY3VycmVudEluZGV4IC0gMVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gYXNjZW5kaW5nKGEsIGIpIHtcbiAgICByZXR1cm4gYSA+IGIgPyAxIDogLTFcbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciB0b3BMZXZlbCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDpcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9XG52YXIgbWluRG9jID0gcmVxdWlyZSgnbWluLWRvY3VtZW50Jyk7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2N1bWVudDtcbn0gZWxzZSB7XG4gICAgdmFyIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXTtcblxuICAgIGlmICghZG9jY3kpIHtcbiAgICAgICAgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddID0gbWluRG9jO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jY3k7XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsInZhciBhcHBseVByb3BlcnRpZXMgPSByZXF1aXJlKFwiLi9hcHBseS1wcm9wZXJ0aWVzXCIpXG5cbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy13aWRnZXRcIilcbnZhciBWUGF0Y2ggPSByZXF1aXJlKFwidnRyZWUvdnBhdGNoXCIpXG5cbnZhciByZW5kZXIgPSByZXF1aXJlKFwiLi9jcmVhdGUtZWxlbWVudFwiKVxudmFyIHVwZGF0ZVdpZGdldCA9IHJlcXVpcmUoXCIuL3VwZGF0ZS13aWRnZXRcIilcblxubW9kdWxlLmV4cG9ydHMgPSBhcHBseVBhdGNoXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2godnBhdGNoLCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIHR5cGUgPSB2cGF0Y2gudHlwZVxuICAgIHZhciB2Tm9kZSA9IHZwYXRjaC52Tm9kZVxuICAgIHZhciBwYXRjaCA9IHZwYXRjaC5wYXRjaFxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgVlBhdGNoLlJFTU9WRTpcbiAgICAgICAgICAgIHJldHVybiByZW1vdmVOb2RlKGRvbU5vZGUsIHZOb2RlKVxuICAgICAgICBjYXNlIFZQYXRjaC5JTlNFUlQ6XG4gICAgICAgICAgICByZXR1cm4gaW5zZXJ0Tm9kZShkb21Ob2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guVlRFWFQ6XG4gICAgICAgICAgICByZXR1cm4gc3RyaW5nUGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5XSURHRVQ6XG4gICAgICAgICAgICByZXR1cm4gd2lkZ2V0UGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5WTk9ERTpcbiAgICAgICAgICAgIHJldHVybiB2Tm9kZVBhdGNoKGRvbU5vZGUsIHZOb2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guT1JERVI6XG4gICAgICAgICAgICByZW9yZGVyQ2hpbGRyZW4oZG9tTm9kZSwgcGF0Y2gpXG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgICAgICBjYXNlIFZQYXRjaC5QUk9QUzpcbiAgICAgICAgICAgIGFwcGx5UHJvcGVydGllcyhkb21Ob2RlLCBwYXRjaCwgdk5vZGUucHJvcGVydGllcylcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgICAgIGNhc2UgVlBhdGNoLlRIVU5LOlxuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2VSb290KGRvbU5vZGUsXG4gICAgICAgICAgICAgICAgcmVuZGVyT3B0aW9ucy5wYXRjaChkb21Ob2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucykpXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlTm9kZShkb21Ob2RlLCB2Tm9kZSkge1xuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKGRvbU5vZGUpXG4gICAgfVxuXG4gICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCB2Tm9kZSk7XG5cbiAgICByZXR1cm4gbnVsbFxufVxuXG5mdW5jdGlvbiBpbnNlcnROb2RlKHBhcmVudE5vZGUsIHZOb2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIG5ld05vZGUgPSByZW5kZXIodk5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLmFwcGVuZENoaWxkKG5ld05vZGUpXG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmVudE5vZGVcbn1cblxuZnVuY3Rpb24gc3RyaW5nUGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB2VGV4dCwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBuZXdOb2RlXG5cbiAgICBpZiAoZG9tTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBkb21Ob2RlLnJlcGxhY2VEYXRhKDAsIGRvbU5vZGUubGVuZ3RoLCB2VGV4dC50ZXh0KVxuICAgICAgICBuZXdOb2RlID0gZG9tTm9kZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG4gICAgICAgIG5ld05vZGUgPSByZW5kZXIodlRleHQsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIGRvbU5vZGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIGxlZnRWTm9kZSlcblxuICAgIHJldHVybiBuZXdOb2RlXG59XG5cbmZ1bmN0aW9uIHdpZGdldFBhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgd2lkZ2V0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgaWYgKHVwZGF0ZVdpZGdldChsZWZ0Vk5vZGUsIHdpZGdldCkpIHtcbiAgICAgICAgcmV0dXJuIHdpZGdldC51cGRhdGUobGVmdFZOb2RlLCBkb21Ob2RlKSB8fCBkb21Ob2RlXG4gICAgfVxuXG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcbiAgICB2YXIgbmV3V2lkZ2V0ID0gcmVuZGVyKHdpZGdldCwgcmVuZGVyT3B0aW9ucylcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld1dpZGdldCwgZG9tTm9kZSlcbiAgICB9XG5cbiAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIGxlZnRWTm9kZSlcblxuICAgIHJldHVybiBuZXdXaWRnZXRcbn1cblxuZnVuY3Rpb24gdk5vZGVQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHZOb2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcbiAgICB2YXIgbmV3Tm9kZSA9IHJlbmRlcih2Tm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIGRvbU5vZGUpXG4gICAgfVxuXG4gICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCBsZWZ0Vk5vZGUpXG5cbiAgICByZXR1cm4gbmV3Tm9kZVxufVxuXG5mdW5jdGlvbiBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIHcpIHtcbiAgICBpZiAodHlwZW9mIHcuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiICYmIGlzV2lkZ2V0KHcpKSB7XG4gICAgICAgIHcuZGVzdHJveShkb21Ob2RlKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVvcmRlckNoaWxkcmVuKGRvbU5vZGUsIGJJbmRleCkge1xuICAgIHZhciBjaGlsZHJlbiA9IFtdXG4gICAgdmFyIGNoaWxkTm9kZXMgPSBkb21Ob2RlLmNoaWxkTm9kZXNcbiAgICB2YXIgbGVuID0gY2hpbGROb2Rlcy5sZW5ndGhcbiAgICB2YXIgaVxuICAgIHZhciByZXZlcnNlSW5kZXggPSBiSW5kZXgucmV2ZXJzZVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNoaWxkcmVuLnB1c2goZG9tTm9kZS5jaGlsZE5vZGVzW2ldKVxuICAgIH1cblxuICAgIHZhciBpbnNlcnRPZmZzZXQgPSAwXG4gICAgdmFyIG1vdmVcbiAgICB2YXIgbm9kZVxuICAgIHZhciBpbnNlcnROb2RlXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIG1vdmUgPSBiSW5kZXhbaV1cbiAgICAgICAgaWYgKG1vdmUgIT09IHVuZGVmaW5lZCAmJiBtb3ZlICE9PSBpKSB7XG4gICAgICAgICAgICAvLyB0aGUgZWxlbWVudCBjdXJyZW50bHkgYXQgdGhpcyBpbmRleCB3aWxsIGJlIG1vdmVkIGxhdGVyIHNvIGluY3JlYXNlIHRoZSBpbnNlcnQgb2Zmc2V0XG4gICAgICAgICAgICBpZiAocmV2ZXJzZUluZGV4W2ldID4gaSkge1xuICAgICAgICAgICAgICAgIGluc2VydE9mZnNldCsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5vZGUgPSBjaGlsZHJlblttb3ZlXVxuICAgICAgICAgICAgaW5zZXJ0Tm9kZSA9IGNoaWxkTm9kZXNbaSArIGluc2VydE9mZnNldF0gfHwgbnVsbFxuICAgICAgICAgICAgaWYgKG5vZGUgIT09IGluc2VydE5vZGUpIHtcbiAgICAgICAgICAgICAgICBkb21Ob2RlLmluc2VydEJlZm9yZShub2RlLCBpbnNlcnROb2RlKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0aGUgbW92ZWQgZWxlbWVudCBjYW1lIGZyb20gdGhlIGZyb250IG9mIHRoZSBhcnJheSBzbyByZWR1Y2UgdGhlIGluc2VydCBvZmZzZXRcbiAgICAgICAgICAgIGlmIChtb3ZlIDwgaSkge1xuICAgICAgICAgICAgICAgIGluc2VydE9mZnNldC0tXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBlbGVtZW50IGF0IHRoaXMgaW5kZXggaXMgc2NoZWR1bGVkIHRvIGJlIHJlbW92ZWQgc28gaW5jcmVhc2UgaW5zZXJ0IG9mZnNldFxuICAgICAgICBpZiAoaSBpbiBiSW5kZXgucmVtb3Zlcykge1xuICAgICAgICAgICAgaW5zZXJ0T2Zmc2V0KytcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVwbGFjZVJvb3Qob2xkUm9vdCwgbmV3Um9vdCkge1xuICAgIGlmIChvbGRSb290ICYmIG5ld1Jvb3QgJiYgb2xkUm9vdCAhPT0gbmV3Um9vdCAmJiBvbGRSb290LnBhcmVudE5vZGUpIHtcbiAgICAgICAgY29uc29sZS5sb2cob2xkUm9vdClcbiAgICAgICAgb2xkUm9vdC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdSb290LCBvbGRSb290KVxuICAgIH1cblxuICAgIHJldHVybiBuZXdSb290O1xufVxuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxuXG52YXIgZG9tSW5kZXggPSByZXF1aXJlKFwiLi9kb20taW5kZXhcIilcbnZhciBwYXRjaE9wID0gcmVxdWlyZShcIi4vcGF0Y2gtb3BcIilcbm1vZHVsZS5leHBvcnRzID0gcGF0Y2hcblxuZnVuY3Rpb24gcGF0Y2gocm9vdE5vZGUsIHBhdGNoZXMpIHtcbiAgICByZXR1cm4gcGF0Y2hSZWN1cnNpdmUocm9vdE5vZGUsIHBhdGNoZXMpXG59XG5cbmZ1bmN0aW9uIHBhdGNoUmVjdXJzaXZlKHJvb3ROb2RlLCBwYXRjaGVzLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIGluZGljZXMgPSBwYXRjaEluZGljZXMocGF0Y2hlcylcblxuICAgIGlmIChpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcm9vdE5vZGVcbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBkb21JbmRleChyb290Tm9kZSwgcGF0Y2hlcy5hLCBpbmRpY2VzKVxuICAgIHZhciBvd25lckRvY3VtZW50ID0gcm9vdE5vZGUub3duZXJEb2N1bWVudFxuXG4gICAgaWYgKCFyZW5kZXJPcHRpb25zKSB7XG4gICAgICAgIHJlbmRlck9wdGlvbnMgPSB7IHBhdGNoOiBwYXRjaFJlY3Vyc2l2ZSB9XG4gICAgICAgIGlmIChvd25lckRvY3VtZW50ICE9PSBkb2N1bWVudCkge1xuICAgICAgICAgICAgcmVuZGVyT3B0aW9ucy5kb2N1bWVudCA9IG93bmVyRG9jdW1lbnRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5kaWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbm9kZUluZGV4ID0gaW5kaWNlc1tpXVxuICAgICAgICByb290Tm9kZSA9IGFwcGx5UGF0Y2gocm9vdE5vZGUsXG4gICAgICAgICAgICBpbmRleFtub2RlSW5kZXhdLFxuICAgICAgICAgICAgcGF0Y2hlc1tub2RlSW5kZXhdLFxuICAgICAgICAgICAgcmVuZGVyT3B0aW9ucylcbiAgICB9XG5cbiAgICByZXR1cm4gcm9vdE5vZGVcbn1cblxuZnVuY3Rpb24gYXBwbHlQYXRjaChyb290Tm9kZSwgZG9tTm9kZSwgcGF0Y2hMaXN0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgaWYgKCFkb21Ob2RlKSB7XG4gICAgICAgIHJldHVybiByb290Tm9kZVxuICAgIH1cblxuICAgIHZhciBuZXdOb2RlXG5cbiAgICBpZiAoaXNBcnJheShwYXRjaExpc3QpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0Y2hMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBuZXdOb2RlID0gcGF0Y2hPcChwYXRjaExpc3RbaV0sIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgICAgIGlmIChkb21Ob2RlID09PSByb290Tm9kZSkge1xuICAgICAgICAgICAgICAgIHJvb3ROb2RlID0gbmV3Tm9kZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmV3Tm9kZSA9IHBhdGNoT3AocGF0Y2hMaXN0LCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgIGlmIChkb21Ob2RlID09PSByb290Tm9kZSkge1xuICAgICAgICAgICAgcm9vdE5vZGUgPSBuZXdOb2RlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcm9vdE5vZGVcbn1cblxuZnVuY3Rpb24gcGF0Y2hJbmRpY2VzKHBhdGNoZXMpIHtcbiAgICB2YXIgaW5kaWNlcyA9IFtdXG5cbiAgICBmb3IgKHZhciBrZXkgaW4gcGF0Y2hlcykge1xuICAgICAgICBpZiAoa2V5ICE9PSBcImFcIikge1xuICAgICAgICAgICAgaW5kaWNlcy5wdXNoKE51bWJlcihrZXkpKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGluZGljZXNcbn1cbiIsInZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy13aWRnZXRcIilcblxubW9kdWxlLmV4cG9ydHMgPSB1cGRhdGVXaWRnZXRcblxuZnVuY3Rpb24gdXBkYXRlV2lkZ2V0KGEsIGIpIHtcbiAgICBpZiAoaXNXaWRnZXQoYSkgJiYgaXNXaWRnZXQoYikpIHtcbiAgICAgICAgaWYgKFwibmFtZVwiIGluIGEgJiYgXCJuYW1lXCIgaW4gYikge1xuICAgICAgICAgICAgcmV0dXJuIGEuaWQgPT09IGIuaWRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhLmluaXQgPT09IGIuaW5pdFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlXG59XG4iLCJ2YXIgaXNBcnJheSA9IHJlcXVpcmUoXCJ4LWlzLWFycmF5XCIpXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKFwiaXMtb2JqZWN0XCIpXG5cbnZhciBWUGF0Y2ggPSByZXF1aXJlKFwiLi92cGF0Y2hcIilcbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4vaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4vaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuL2lzLXdpZGdldFwiKVxudmFyIGlzVGh1bmsgPSByZXF1aXJlKFwiLi9pcy10aHVua1wiKVxudmFyIGhhbmRsZVRodW5rID0gcmVxdWlyZShcIi4vaGFuZGxlLXRodW5rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZGlmZlxuXG5mdW5jdGlvbiBkaWZmKGEsIGIpIHtcbiAgICB2YXIgcGF0Y2ggPSB7IGE6IGEgfVxuICAgIHdhbGsoYSwgYiwgcGF0Y2gsIDApXG4gICAgcmV0dXJuIHBhdGNoXG59XG5cbmZ1bmN0aW9uIHdhbGsoYSwgYiwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgaWYgKGlzVGh1bmsoYSkgfHwgaXNUaHVuayhiKSkge1xuICAgICAgICAgICAgdGh1bmtzKGEsIGIsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGhvb2tzKGIsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgYXBwbHkgPSBwYXRjaFtpbmRleF1cblxuICAgIGlmIChiID09IG51bGwpIHtcbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCBhLCBiKSlcbiAgICAgICAgZGVzdHJveVdpZGdldHMoYSwgcGF0Y2gsIGluZGV4KVxuICAgIH0gZWxzZSBpZiAoaXNUaHVuayhhKSB8fCBpc1RodW5rKGIpKSB7XG4gICAgICAgIHRodW5rcyhhLCBiLCBwYXRjaCwgaW5kZXgpXG4gICAgfSBlbHNlIGlmIChpc1ZOb2RlKGIpKSB7XG4gICAgICAgIGlmIChpc1ZOb2RlKGEpKSB7XG4gICAgICAgICAgICBpZiAoYS50YWdOYW1lID09PSBiLnRhZ05hbWUgJiZcbiAgICAgICAgICAgICAgICBhLm5hbWVzcGFjZSA9PT0gYi5uYW1lc3BhY2UgJiZcbiAgICAgICAgICAgICAgICBhLmtleSA9PT0gYi5rZXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvcHNQYXRjaCA9IGRpZmZQcm9wcyhhLnByb3BlcnRpZXMsIGIucHJvcGVydGllcywgYi5ob29rcylcbiAgICAgICAgICAgICAgICBpZiAocHJvcHNQYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFZQYXRjaChWUGF0Y2guUFJPUFMsIGEsIHByb3BzUGF0Y2gpKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVk5PREUsIGEsIGIpKVxuICAgICAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXBwbHkgPSBkaWZmQ2hpbGRyZW4oYSwgYiwgcGF0Y2gsIGFwcGx5LCBpbmRleClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZOT0RFLCBhLCBiKSlcbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWVGV4dChiKSkge1xuICAgICAgICBpZiAoIWlzVlRleHQoYSkpIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZURVhULCBhLCBiKSlcbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfSBlbHNlIGlmIChhLnRleHQgIT09IGIudGV4dCkge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVlRFWFQsIGEsIGIpKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1dpZGdldChiKSkge1xuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5XSURHRVQsIGEsIGIpKVxuXG4gICAgICAgIGlmICghaXNXaWRnZXQoYSkpIHtcbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChhcHBseSkge1xuICAgICAgICBwYXRjaFtpbmRleF0gPSBhcHBseVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZGlmZlByb3BzKGEsIGIsIGhvb2tzKSB7XG4gICAgdmFyIGRpZmZcblxuICAgIGZvciAodmFyIGFLZXkgaW4gYSkge1xuICAgICAgICBpZiAoIShhS2V5IGluIGIpKSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZlthS2V5XSA9IHVuZGVmaW5lZFxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFWYWx1ZSA9IGFbYUtleV1cbiAgICAgICAgdmFyIGJWYWx1ZSA9IGJbYUtleV1cblxuICAgICAgICBpZiAoaG9va3MgJiYgYUtleSBpbiBob29rcykge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc09iamVjdChhVmFsdWUpICYmIGlzT2JqZWN0KGJWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2V0UHJvdG90eXBlKGJWYWx1ZSkgIT09IGdldFByb3RvdHlwZShhVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2JqZWN0RGlmZiA9IGRpZmZQcm9wcyhhVmFsdWUsIGJWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9iamVjdERpZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gb2JqZWN0RGlmZlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhVmFsdWUgIT09IGJWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgYktleSBpbiBiKSB7XG4gICAgICAgIGlmICghKGJLZXkgaW4gYSkpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2JLZXldID0gYltiS2V5XVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpZmZcbn1cblxuZnVuY3Rpb24gZ2V0UHJvdG90eXBlKHZhbHVlKSB7XG4gICAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKVxuICAgIH0gZWxzZSBpZiAodmFsdWUuX19wcm90b19fKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5fX3Byb3RvX19cbiAgICB9IGVsc2UgaWYgKHZhbHVlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRpZmZDaGlsZHJlbihhLCBiLCBwYXRjaCwgYXBwbHksIGluZGV4KSB7XG4gICAgdmFyIGFDaGlsZHJlbiA9IGEuY2hpbGRyZW5cbiAgICB2YXIgYkNoaWxkcmVuID0gcmVvcmRlcihhQ2hpbGRyZW4sIGIuY2hpbGRyZW4pXG5cbiAgICB2YXIgYUxlbiA9IGFDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgYkxlbiA9IGJDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgbGVuID0gYUxlbiA+IGJMZW4gPyBhTGVuIDogYkxlblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgbGVmdE5vZGUgPSBhQ2hpbGRyZW5baV1cbiAgICAgICAgdmFyIHJpZ2h0Tm9kZSA9IGJDaGlsZHJlbltpXVxuICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgaWYgKCFsZWZ0Tm9kZSkge1xuICAgICAgICAgICAgaWYgKHJpZ2h0Tm9kZSkge1xuICAgICAgICAgICAgICAgIC8vIEV4Y2VzcyBub2RlcyBpbiBiIG5lZWQgdG8gYmUgYWRkZWRcbiAgICAgICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LFxuICAgICAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFZQYXRjaC5JTlNFUlQsIG51bGwsIHJpZ2h0Tm9kZSkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXJpZ2h0Tm9kZSkge1xuICAgICAgICAgICAgaWYgKGxlZnROb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhjZXNzIG5vZGVzIGluIGEgbmVlZCB0byBiZSByZW1vdmVkXG4gICAgICAgICAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCBsZWZ0Tm9kZSwgbnVsbClcbiAgICAgICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhsZWZ0Tm9kZSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2FsayhsZWZ0Tm9kZSwgcmlnaHROb2RlLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNWTm9kZShsZWZ0Tm9kZSkgJiYgbGVmdE5vZGUuY291bnQpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IGxlZnROb2RlLmNvdW50XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYkNoaWxkcmVuLm1vdmVzKSB7XG4gICAgICAgIC8vIFJlb3JkZXIgbm9kZXMgbGFzdFxuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5PUkRFUiwgYSwgYkNoaWxkcmVuLm1vdmVzKSlcbiAgICB9XG5cbiAgICByZXR1cm4gYXBwbHlcbn1cblxuLy8gUGF0Y2ggcmVjb3JkcyBmb3IgYWxsIGRlc3Ryb3llZCB3aWRnZXRzIG11c3QgYmUgYWRkZWQgYmVjYXVzZSB3ZSBuZWVkXG4vLyBhIERPTSBub2RlIHJlZmVyZW5jZSBmb3IgdGhlIGRlc3Ryb3kgZnVuY3Rpb25cbmZ1bmN0aW9uIGRlc3Ryb3lXaWRnZXRzKHZOb2RlLCBwYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaXNXaWRnZXQodk5vZGUpKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygdk5vZGUuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBwYXRjaFtpbmRleF0gPSBuZXcgVlBhdGNoKFZQYXRjaC5SRU1PVkUsIHZOb2RlLCBudWxsKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1ZOb2RlKHZOb2RlKSAmJiB2Tm9kZS5oYXNXaWRnZXRzKSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IHZOb2RlLmNoaWxkcmVuXG4gICAgICAgIHZhciBsZW4gPSBjaGlsZHJlbi5sZW5ndGhcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoY2hpbGQsIHBhdGNoLCBpbmRleClcblxuICAgICAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpICYmIGNoaWxkLmNvdW50KSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gY2hpbGQuY291bnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gQ3JlYXRlIGEgc3ViLXBhdGNoIGZvciB0aHVua3NcbmZ1bmN0aW9uIHRodW5rcyhhLCBiLCBwYXRjaCwgaW5kZXgpIHtcbiAgICB2YXIgbm9kZXMgPSBoYW5kbGVUaHVuayhhLCBiKTtcbiAgICB2YXIgdGh1bmtQYXRjaCA9IGRpZmYobm9kZXMuYSwgbm9kZXMuYilcbiAgICBpZiAoaGFzUGF0Y2hlcyh0aHVua1BhdGNoKSkge1xuICAgICAgICBwYXRjaFtpbmRleF0gPSBuZXcgVlBhdGNoKFZQYXRjaC5USFVOSywgbnVsbCwgdGh1bmtQYXRjaClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1BhdGNoZXMocGF0Y2gpIHtcbiAgICBmb3IgKHZhciBpbmRleCBpbiBwYXRjaCkge1xuICAgICAgICBpZiAoaW5kZXggIT09IFwiYVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLy8gRXhlY3V0ZSBob29rcyB3aGVuIHR3byBub2RlcyBhcmUgaWRlbnRpY2FsXG5mdW5jdGlvbiBob29rcyh2Tm9kZSwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGlzVk5vZGUodk5vZGUpKSB7XG4gICAgICAgIGlmICh2Tm9kZS5ob29rcykge1xuICAgICAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guUFJPUFMsIHZOb2RlLmhvb2tzLCB2Tm9kZS5ob29rcylcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2Tm9kZS5kZXNjZW5kYW50SG9va3MpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHZOb2RlLmNoaWxkcmVuXG4gICAgICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgICAgICAgICBob29rcyhjaGlsZCwgcGF0Y2gsIGluZGV4KVxuXG4gICAgICAgICAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpICYmIGNoaWxkLmNvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IGNoaWxkLmNvdW50XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBMaXN0IGRpZmYsIG5haXZlIGxlZnQgdG8gcmlnaHQgcmVvcmRlcmluZ1xuZnVuY3Rpb24gcmVvcmRlcihhQ2hpbGRyZW4sIGJDaGlsZHJlbikge1xuXG4gICAgdmFyIGJLZXlzID0ga2V5SW5kZXgoYkNoaWxkcmVuKVxuXG4gICAgaWYgKCFiS2V5cykge1xuICAgICAgICByZXR1cm4gYkNoaWxkcmVuXG4gICAgfVxuXG4gICAgdmFyIGFLZXlzID0ga2V5SW5kZXgoYUNoaWxkcmVuKVxuXG4gICAgaWYgKCFhS2V5cykge1xuICAgICAgICByZXR1cm4gYkNoaWxkcmVuXG4gICAgfVxuXG4gICAgdmFyIGJNYXRjaCA9IHt9LCBhTWF0Y2ggPSB7fVxuXG4gICAgZm9yICh2YXIga2V5IGluIGJLZXlzKSB7XG4gICAgICAgIGJNYXRjaFtiS2V5c1trZXldXSA9IGFLZXlzW2tleV1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gYUtleXMpIHtcbiAgICAgICAgYU1hdGNoW2FLZXlzW2tleV1dID0gYktleXNba2V5XVxuICAgIH1cblxuICAgIHZhciBhTGVuID0gYUNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBiTGVuID0gYkNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBsZW4gPSBhTGVuID4gYkxlbiA/IGFMZW4gOiBiTGVuXG4gICAgdmFyIHNodWZmbGUgPSBbXVxuICAgIHZhciBmcmVlSW5kZXggPSAwXG4gICAgdmFyIGkgPSAwXG4gICAgdmFyIG1vdmVJbmRleCA9IDBcbiAgICB2YXIgbW92ZXMgPSB7fVxuICAgIHZhciByZW1vdmVzID0gbW92ZXMucmVtb3ZlcyA9IHt9XG4gICAgdmFyIHJldmVyc2UgPSBtb3Zlcy5yZXZlcnNlID0ge31cbiAgICB2YXIgaGFzTW92ZXMgPSBmYWxzZVxuXG4gICAgd2hpbGUgKGZyZWVJbmRleCA8IGxlbikge1xuICAgICAgICB2YXIgbW92ZSA9IGFNYXRjaFtpXVxuICAgICAgICBpZiAobW92ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzaHVmZmxlW2ldID0gYkNoaWxkcmVuW21vdmVdXG4gICAgICAgICAgICBpZiAobW92ZSAhPT0gbW92ZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgbW92ZXNbbW92ZV0gPSBtb3ZlSW5kZXhcbiAgICAgICAgICAgICAgICByZXZlcnNlW21vdmVJbmRleF0gPSBtb3ZlXG4gICAgICAgICAgICAgICAgaGFzTW92ZXMgPSB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtb3ZlSW5kZXgrK1xuICAgICAgICB9IGVsc2UgaWYgKGkgaW4gYU1hdGNoKSB7XG4gICAgICAgICAgICBzaHVmZmxlW2ldID0gdW5kZWZpbmVkXG4gICAgICAgICAgICByZW1vdmVzW2ldID0gbW92ZUluZGV4KytcbiAgICAgICAgICAgIGhhc01vdmVzID0gdHJ1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKGJNYXRjaFtmcmVlSW5kZXhdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBmcmVlSW5kZXgrK1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZnJlZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZyZWVDaGlsZCA9IGJDaGlsZHJlbltmcmVlSW5kZXhdXG4gICAgICAgICAgICAgICAgaWYgKGZyZWVDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBzaHVmZmxlW2ldID0gZnJlZUNoaWxkXG4gICAgICAgICAgICAgICAgICAgIGlmIChmcmVlSW5kZXggIT09IG1vdmVJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzTW92ZXMgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3Zlc1tmcmVlSW5kZXhdID0gbW92ZUluZGV4XG4gICAgICAgICAgICAgICAgICAgICAgICByZXZlcnNlW21vdmVJbmRleF0gPSBmcmVlSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtb3ZlSW5kZXgrK1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmcmVlSW5kZXgrK1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGkrK1xuICAgIH1cblxuICAgIGlmIChoYXNNb3Zlcykge1xuICAgICAgICBzaHVmZmxlLm1vdmVzID0gbW92ZXNcbiAgICB9XG5cbiAgICByZXR1cm4gc2h1ZmZsZVxufVxuXG5mdW5jdGlvbiBrZXlJbmRleChjaGlsZHJlbikge1xuICAgIHZhciBpLCBrZXlzXG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cblxuICAgICAgICBpZiAoY2hpbGQua2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGtleXMgPSBrZXlzIHx8IHt9XG4gICAgICAgICAgICBrZXlzW2NoaWxkLmtleV0gPSBpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ga2V5c1xufVxuXG5mdW5jdGlvbiBhcHBlbmRQYXRjaChhcHBseSwgcGF0Y2gpIHtcbiAgICBpZiAoYXBwbHkpIHtcbiAgICAgICAgaWYgKGlzQXJyYXkoYXBwbHkpKSB7XG4gICAgICAgICAgICBhcHBseS5wdXNoKHBhdGNoKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXBwbHkgPSBbYXBwbHksIHBhdGNoXVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFwcGx5XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHBhdGNoXG4gICAgfVxufVxuIiwidmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwiLi9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4vaXMtd2lkZ2V0XCIpXG52YXIgaXNUaHVuayA9IHJlcXVpcmUoXCIuL2lzLXRodW5rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaGFuZGxlVGh1bmtcblxuZnVuY3Rpb24gaGFuZGxlVGh1bmsoYSwgYikge1xuICAgIHZhciByZW5kZXJlZEEgPSBhXG4gICAgdmFyIHJlbmRlcmVkQiA9IGJcblxuICAgIGlmIChpc1RodW5rKGIpKSB7XG4gICAgICAgIHJlbmRlcmVkQiA9IHJlbmRlclRodW5rKGIsIGEpXG4gICAgfVxuXG4gICAgaWYgKGlzVGh1bmsoYSkpIHtcbiAgICAgICAgcmVuZGVyZWRBID0gcmVuZGVyVGh1bmsoYSwgbnVsbClcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBhOiByZW5kZXJlZEEsXG4gICAgICAgIGI6IHJlbmRlcmVkQlxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVyVGh1bmsodGh1bmssIHByZXZpb3VzKSB7XG4gICAgdmFyIHJlbmRlcmVkVGh1bmsgPSB0aHVuay52bm9kZVxuXG4gICAgaWYgKCFyZW5kZXJlZFRodW5rKSB7XG4gICAgICAgIHJlbmRlcmVkVGh1bmsgPSB0aHVuay52bm9kZSA9IHRodW5rLnJlbmRlcihwcmV2aW91cylcbiAgICB9XG5cbiAgICBpZiAoIShpc1ZOb2RlKHJlbmRlcmVkVGh1bmspIHx8XG4gICAgICAgICAgICBpc1ZUZXh0KHJlbmRlcmVkVGh1bmspIHx8XG4gICAgICAgICAgICBpc1dpZGdldChyZW5kZXJlZFRodW5rKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidGh1bmsgZGlkIG5vdCByZXR1cm4gYSB2YWxpZCBub2RlXCIpO1xuICAgIH1cblxuICAgIHJldHVybiByZW5kZXJlZFRodW5rXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzVGh1bmtcclxuXHJcbmZ1bmN0aW9uIGlzVGh1bmsodCkge1xyXG4gICAgcmV0dXJuIHQgJiYgdC50eXBlID09PSBcIlRodW5rXCJcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzSG9va1xuXG5mdW5jdGlvbiBpc0hvb2soaG9vaykge1xuICAgIHJldHVybiBob29rICYmIHR5cGVvZiBob29rLmhvb2sgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAhaG9vay5oYXNPd25Qcm9wZXJ0eShcImhvb2tcIilcbn1cbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzVmlydHVhbE5vZGVcblxuZnVuY3Rpb24gaXNWaXJ0dWFsTm9kZSh4KSB7XG4gICAgcmV0dXJuIHggJiYgeC50eXBlID09PSBcIlZpcnR1YWxOb2RlXCIgJiYgeC52ZXJzaW9uID09PSB2ZXJzaW9uXG59XG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBpc1ZpcnR1YWxUZXh0XG5cbmZ1bmN0aW9uIGlzVmlydHVhbFRleHQoeCkge1xuICAgIHJldHVybiB4ICYmIHgudHlwZSA9PT0gXCJWaXJ0dWFsVGV4dFwiICYmIHgudmVyc2lvbiA9PT0gdmVyc2lvblxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc1dpZGdldFxuXG5mdW5jdGlvbiBpc1dpZGdldCh3KSB7XG4gICAgcmV0dXJuIHcgJiYgdy50eXBlID09PSBcIldpZGdldFwiXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiMVwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4vaXMtdm5vZGVcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuL2lzLXdpZGdldFwiKVxudmFyIGlzVkhvb2sgPSByZXF1aXJlKFwiLi9pcy12aG9va1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxOb2RlXG5cbnZhciBub1Byb3BlcnRpZXMgPSB7fVxudmFyIG5vQ2hpbGRyZW4gPSBbXVxuXG5mdW5jdGlvbiBWaXJ0dWFsTm9kZSh0YWdOYW1lLCBwcm9wZXJ0aWVzLCBjaGlsZHJlbiwga2V5LCBuYW1lc3BhY2UpIHtcbiAgICB0aGlzLnRhZ05hbWUgPSB0YWdOYW1lXG4gICAgdGhpcy5wcm9wZXJ0aWVzID0gcHJvcGVydGllcyB8fCBub1Byb3BlcnRpZXNcbiAgICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW4gfHwgbm9DaGlsZHJlblxuICAgIHRoaXMua2V5ID0ga2V5ICE9IG51bGwgPyBTdHJpbmcoa2V5KSA6IHVuZGVmaW5lZFxuICAgIHRoaXMubmFtZXNwYWNlID0gKHR5cGVvZiBuYW1lc3BhY2UgPT09IFwic3RyaW5nXCIpID8gbmFtZXNwYWNlIDogbnVsbFxuXG4gICAgdmFyIGNvdW50ID0gKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkgfHwgMFxuICAgIHZhciBkZXNjZW5kYW50cyA9IDBcbiAgICB2YXIgaGFzV2lkZ2V0cyA9IGZhbHNlXG4gICAgdmFyIGRlc2NlbmRhbnRIb29rcyA9IGZhbHNlXG4gICAgdmFyIGhvb2tzXG5cbiAgICBmb3IgKHZhciBwcm9wTmFtZSBpbiBwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmIChwcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KHByb3BOYW1lKSkge1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5ID0gcHJvcGVydGllc1twcm9wTmFtZV1cbiAgICAgICAgICAgIGlmIChpc1ZIb29rKHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIGlmICghaG9va3MpIHtcbiAgICAgICAgICAgICAgICAgICAgaG9va3MgPSB7fVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGhvb2tzW3Byb3BOYW1lXSA9IHByb3BlcnR5XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpKSB7XG4gICAgICAgICAgICBkZXNjZW5kYW50cyArPSBjaGlsZC5jb3VudCB8fCAwXG5cbiAgICAgICAgICAgIGlmICghaGFzV2lkZ2V0cyAmJiBjaGlsZC5oYXNXaWRnZXRzKSB7XG4gICAgICAgICAgICAgICAgaGFzV2lkZ2V0cyA9IHRydWVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFkZXNjZW5kYW50SG9va3MgJiYgKGNoaWxkLmhvb2tzIHx8IGNoaWxkLmRlc2NlbmRhbnRIb29rcykpIHtcbiAgICAgICAgICAgICAgICBkZXNjZW5kYW50SG9va3MgPSB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWhhc1dpZGdldHMgJiYgaXNXaWRnZXQoY2hpbGQpKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNoaWxkLmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIGhhc1dpZGdldHMgPSB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvdW50ID0gY291bnQgKyBkZXNjZW5kYW50c1xuICAgIHRoaXMuaGFzV2lkZ2V0cyA9IGhhc1dpZGdldHNcbiAgICB0aGlzLmhvb2tzID0gaG9va3NcbiAgICB0aGlzLmRlc2NlbmRhbnRIb29rcyA9IGRlc2NlbmRhbnRIb29rc1xufVxuXG5WaXJ0dWFsTm9kZS5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxOb2RlLnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsTm9kZVwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxuVmlydHVhbFBhdGNoLk5PTkUgPSAwXG5WaXJ0dWFsUGF0Y2guVlRFWFQgPSAxXG5WaXJ0dWFsUGF0Y2guVk5PREUgPSAyXG5WaXJ0dWFsUGF0Y2guV0lER0VUID0gM1xuVmlydHVhbFBhdGNoLlBST1BTID0gNFxuVmlydHVhbFBhdGNoLk9SREVSID0gNVxuVmlydHVhbFBhdGNoLklOU0VSVCA9IDZcblZpcnR1YWxQYXRjaC5SRU1PVkUgPSA3XG5WaXJ0dWFsUGF0Y2guVEhVTksgPSA4XG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFBhdGNoXG5cbmZ1bmN0aW9uIFZpcnR1YWxQYXRjaCh0eXBlLCB2Tm9kZSwgcGF0Y2gpIHtcbiAgICB0aGlzLnR5cGUgPSBOdW1iZXIodHlwZSlcbiAgICB0aGlzLnZOb2RlID0gdk5vZGVcbiAgICB0aGlzLnBhdGNoID0gcGF0Y2hcbn1cblxuVmlydHVhbFBhdGNoLnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbFBhdGNoLnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsUGF0Y2hcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFRleHRcblxuZnVuY3Rpb24gVmlydHVhbFRleHQodGV4dCkge1xuICAgIHRoaXMudGV4dCA9IFN0cmluZyh0ZXh0KVxufVxuXG5WaXJ0dWFsVGV4dC5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxUZXh0LnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsVGV4dFwiXG4iLCJ2YXIgbmF0aXZlSXNBcnJheSA9IEFycmF5LmlzQXJyYXlcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBuYXRpdmVJc0FycmF5IHx8IGlzQXJyYXlcblxuZnVuY3Rpb24gaXNBcnJheShvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCJcbn1cbiIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBpc1N0cmluZ1xuXG5mdW5jdGlvbiBpc1N0cmluZyhvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgU3RyaW5nXVwiXG59XG4iLCJ2YXIgcGF0Y2ggPSByZXF1aXJlKFwidmRvbS9wYXRjaFwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGNoXG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvKipcbiAgICogQHR5cGUge1JlZ0V4cH1cbiAgICovXG4gIFJFWF9JTlRFUlBPTEFURV9TWU1CT0w6IC97e1tee31dK319L2csXG4gIC8qKlxuICAgKiBAdHlwZSB7UmVnRXhwfVxuICAgKi9cbiAgUkVYX1JFUEVBVF9TWU1CT0w6IC97eyhcXHcrKVxcc2luXFxzKFtcXHdcXC5dKyl9fS8sXG4gIC8qKlxuICAgKiBAdHlwZSB7UmVnRXhwfVxuICAgKi9cbiAgU1RSX1JFUEVBVF9BVFRSSUJVVEU6ICdjbC1yZXBlYXQnXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyICAgPSByZXF1aXJlKCcuL2hlbHBlcicpO1xudmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi90ZW1wbGF0ZScpO1xuXG4vKipcbiAqIEBjbGFzcyBDbGF5RWxlbWVudFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIEBzdGF0aWNcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IHByb3RvXG4gICAqIEByZXR1cm5zIHtDbGF5RWxlbWVudH1cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24obmFtZSwgcHJvdG8pIHtcblxuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgIC8qKlxuICAgICAgICogQHByaXZhdGVcbiAgICAgICAqIEBwcm9wZXJ0eSB7RG9jdW1lbnR9IF9kb2NcbiAgICAgICAqL1xuICAgICAgX2RvYzogIGRvY3VtZW50Ll9jdXJyZW50U2NyaXB0ID8gZG9jdW1lbnQuX2N1cnJlbnRTY3JpcHQub3duZXJEb2N1bWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogZG9jdW1lbnQuY3VycmVudFNjcmlwdCA/IGRvY3VtZW50LmN1cnJlbnRTY3JpcHQub3duZXJEb2N1bWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGRvY3VtZW50LFxuICAgICAgLyoqXG4gICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICogQG1ldGhvZCB7RnVuY3Rpb259IF9jcmVhdGVkXG4gICAgICAgKi9cbiAgICAgIF9jcmVhdGVkOiBoZWxwZXIuaXNGdW5jdGlvbihwcm90by5jcmVhdGVkQ2FsbGJhY2spID8gcHJvdG8uY3JlYXRlZENhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGhlbHBlci5ub29wLFxuICAgICAgLyoqXG4gICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICogQG1ldGhvZCB7RnVuY3Rpb259IF9hdHRhY2hlZFxuICAgICAgICovXG4gICAgICBfYXR0YWNoZWQ6IGhlbHBlci5pc0Z1bmN0aW9uKHByb3RvLmF0dGFjaGVkQ2FsbGJhY2spID8gcHJvdG8uYXR0YWNoZWRDYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGhlbHBlci5ub29wLFxuICAgICAgLyoqXG4gICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICogQG1ldGhvZCB7RnVuY3Rpb259IF9kZXRhY2hlZFxuICAgICAgICovXG4gICAgICBfZGV0YWNoZWQ6IGhlbHBlci5pc0Z1bmN0aW9uKHByb3RvLmRldGFjaGVkQ2FsbGJhY2spID8gcHJvdG8uZGV0YWNoZWRDYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGhlbHBlci5ub29wLFxuICAgICAgLyoqXG4gICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICogQG1ldGhvZCB7RnVuY3Rpb259IF9hdHRyQ2hhbmdlZFxuICAgICAgICovXG4gICAgICBfYXR0ckNoYW5nZWQ6IGhlbHBlci5pc0Z1bmN0aW9uKHByb3RvLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjaykgPyBwcm90by5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGhlbHBlci5ub29wLFxuICAgICAgLyoqXG4gICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICogQHByb3BlcnR5IHtTdHJpbmd9IF9odG1sXG4gICAgICAgKi9cbiAgICAgIF9odG1sOiAnJyxcblxuICAgICAgLyoqXG4gICAgICAgKiBAcHJvcGVydHkge0VsZW1lbnR9IHJvb3RcbiAgICAgICAqL1xuICAgICAgcm9vdDogbnVsbCxcblxuICAgICAgLyoqXG4gICAgICAgKiBAcHJvcGVydHkge0NsYXlUZW1wbGF0ZX0gdGVtcGxhdGVcbiAgICAgICAqL1xuICAgICAgdGVtcGxhdGU6IG51bGwsXG5cbiAgICAgIC8qKlxuICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IHNjb3BlXG4gICAgICAgKi9cbiAgICAgIHNjb3BlIDoge30sXG5cbiAgICAgIC8qKlxuICAgICAgICogQHByb3BlcnR5IHtPYmplY3R9IGV2ZW50c1xuICAgICAgICovXG4gICAgICBldmVudHM6IHt9LFxuXG4gICAgICAvKipcbiAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSB1c2VcbiAgICAgICAqL1xuICAgICAgdXNlOiB7fVxuICAgIH07XG5cbiAgICAvLyBtaXggY2xheWx1bXAgaW1wbGVtZW50YXRpb25cbiAgICBoZWxwZXIubWl4KGhlbHBlci5taXgocHJvdG8sIGRlZmF1bHRzKSwgQ2xheUVsZW1lbnQucHJvdG90eXBlLCB0cnVlKTtcblxuICAgIC8vIGRvbSByZWFkeSByZXF1aXJlZFxuICAgIGhlbHBlci5yZWFkeShmdW5jdGlvbigpIHtcbiAgICAgIHZhciB0ZW1wbGF0ZSA9IHByb3RvLl9kb2MucXVlcnlTZWxlY3RvcignW2NsLWVsZW1lbnQ9XCInK25hbWUrJ1wiXScpO1xuICAgICAgcHJvdG8uX2h0bWwgID0gdGVtcGxhdGUgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiAnJztcbiAgICB9KTtcblxuICAgIC8vIGV4dGVuZHMgZWxlbWVudFxuICAgIHZhciBiYXNlRWxlbWVudCwgZXh0ZW5kZWRTY29wZTtcbiAgICBpZiAocHJvdG8uZXh0ZW5kcykge1xuICAgICAgLy8gRklYTUUgY2Fubm90IHVzZSBgaXM9XCJ4LWNoaWxkXCJgIGluIGA8dGVtcGxhdGU+YFxuXG4gICAgICAvLyBlbGVtZW50IGluc3RhbmNlIC0+IGNvbnN0cnVjdG9yIC0+IGNyZWF0ZSBob3N0IG9iamVjdFxuICAgICAgYmFzZUVsZW1lbnQgPSBPYmplY3QuY3JlYXRlKHByb3RvLl9kb2MuY3JlYXRlRWxlbWVudChwcm90by5leHRlbmRzKS5jb25zdHJ1Y3Rvcik7XG5cbiAgICAgIGlmIChoZWxwZXIuaXNDdXN0b21FbGVtZW50TmFtZShwcm90by5leHRlbmRzKSkge1xuICAgICAgICAvLyBleHRlbmRzIGN1c3RvbSBlbGVtZW50XG4gICAgICAgIC8vIEZJWE1FIGNyZWF0ZSBiYXNlRWxlbWVudHMgcHJvdG90eXBlIGJ5IGRlZXBseSBjbG9uZVxuICAgICAgICBleHRlbmRlZFNjb3BlICAgPSBoZWxwZXIubWl4KGhlbHBlci5jbG9uZShiYXNlRWxlbWVudC5wcm90b3R5cGUuc2NvcGUpLCBwcm90by5zY29wZSwgdHJ1ZSk7XG4gICAgICAgIHByb3RvICAgICAgICAgICA9IGhlbHBlci5taXgoaGVscGVyLmNsb25lKGJhc2VFbGVtZW50LnByb3RvdHlwZSksICAgICAgIHByb3RvLCAgICAgICB0cnVlKTtcbiAgICAgICAgcHJvdG8uc2NvcGUgICAgID0gZXh0ZW5kZWRTY29wZTtcbiAgICAgICAgcHJvdG8uX19zdXBlcl9fID0gYmFzZUVsZW1lbnQucHJvdG90eXBlO1xuICAgICAgICBiYXNlRWxlbWVudCAgICAgPSBIVE1MRWxlbWVudDtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBuZXcgY3VzdG9tIGVsZW1lbnRcbiAgICAgIGJhc2VFbGVtZW50ID0gSFRNTEVsZW1lbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhlbHBlci5taXgoT2JqZWN0LmNyZWF0ZShiYXNlRWxlbWVudC5wcm90b3R5cGUpLCBwcm90byk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIENsYXlFbGVtZW50KCkge1xuICAvLyBkb24ndCBjYWxsIGRpcmVjdGx5XG59XG5cbmhlbHBlci5taXgoQ2xheUVsZW1lbnQucHJvdG90eXBlLCB7XG4gIC8qKlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luamVjdFVzZU9iamVjdDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBrZXlzID0gT2JqZWN0LmtleXModGhpcy51c2UgfHwge30pLCBpID0gMCwgYWxpYXM7XG5cbiAgICB3aGlsZSAoKGFsaWFzID0ga2V5c1tpKytdKSkge1xuICAgICAgaWYgKHNlbGZbYWxpYXNdKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZmxpY3QgYXNzaWduIHByb3BlcnR5IGAnICsgYWxpYXMgKyAnYCEnKVxuICAgICAgfVxuICAgICAgc2VsZlthbGlhc10gPSB0aGlzLnVzZVthbGlhc10odGhpcyk7XG4gICAgfVxuXG4gICAgdGhpcy51c2UgPSBudWxsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2Nsb25lU2NvcGVPYmplY3RzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2NvcGUgPSB0aGlzLnNjb3BlLFxuICAgICAgICBrZXlzID0gT2JqZWN0LmtleXMoc2NvcGUpLCBpID0gMCwga2V5O1xuXG4gICAgd2hpbGUgKChrZXkgPSBrZXlzW2krK10pKSB7XG4gICAgICBpZiAodHlwZW9mIHNjb3BlW2tleV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIC8vIEZJWE1FIGNyZWF0ZSBvd24gb2JqZWN0fGFycmF5IGJ5IGRlZXBseSBjbG9uZVxuICAgICAgICBzY29wZVtrZXldID0gaGVscGVyLmNsb25lKHNjb3BlW2tleV0pO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogc2hvcnRoYW5kIG9mIHRlbXBsYXRlLmludmFsaWRhdGVcbiAgICovXG4gIGludmFsaWRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGVtcGxhdGUuaW52YWxpZGF0ZSgpO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKi9cbiAgY3JlYXRlZENhbGxiYWNrIDogZnVuY3Rpb24oKSB7XG5cbiAgICAvLyByZXNvbHZlIHVzZSBpbmplY3Rpb25cbiAgICB0aGlzLl9pbmplY3RVc2VPYmplY3QoKTtcblxuICAgIC8vIGNsb25lIG9iamVjdHNcbiAgICB0aGlzLl9jbG9uZVNjb3BlT2JqZWN0cygpO1xuXG4gICAgLy8gb3JpZ2luYWxcbiAgICB0aGlzLl9jcmVhdGVkKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBhdHRhY2hlZENhbGxiYWNrIDogZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBjcmVhdGUgdmlydHVhbCB0ZW1wbGF0ZSAmIGFjdHVhbCBkb21cbiAgICB0aGlzLmNyZWF0ZVNoYWRvd1Jvb3QoKTtcbiAgICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGUuY3JlYXRlKHRoaXMuX2h0bWwsIHRoaXMuc2NvcGUpO1xuICAgIHRoaXMucm9vdCAgICAgPSB0aGlzLnRlbXBsYXRlLmNyZWF0ZUVsZW1lbnQodGhpcy5fZG9jKTtcblxuICAgIGlmICh0aGlzLnJvb3QpIHtcbiAgICAgIHRoaXMuc2hhZG93Um9vdC5hcHBlbmRDaGlsZCh0aGlzLnJvb3QpO1xuICAgICAgdGhpcy50ZW1wbGF0ZS5kcmF3TG9vcCh0aGlzLnJvb3QpO1xuICAgIH1cblxuICAgIC8vIG9yaWdpbmFsXG4gICAgdGhpcy5fYXR0YWNoZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICpcbiAgICovXG4gIGRldGFjaGVkQ2FsbGJhY2sgOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnRlbXBsYXRlLmRlc3Ryb3koKTtcblxuICAgIC8vIG9yaWdpbmFsXG4gICAgdGhpcy5fZGV0YWNoZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICpcbiAgICovXG4gIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuICAgIC8vIG9yaWdpbmFsXG4gICAgdGhpcy5fYXR0ckNoYW5nZWQoKTtcbiAgfSxcblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZE5hbWVcbiAgICogQHBhcmFtIHsqfSAuLi5cbiAgICovXG4gIHN1cGVyOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX19zdXBlcl9fKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZWxlbWVudCBkb2VzIG5vdCBoYXZlIHRoZSBgX19zdXBlcl9fYCcpO1xuICAgIH1cblxuICAgIHZhciBvcmlnQXJncyAgICA9IGhlbHBlci50b0FycmF5KGFyZ3VtZW50cyksXG4gICAgICAgIG1ldGhvZE5hbWUgID0gb3JpZ0FyZ3Muc2xpY2UoMCwgMSksXG4gICAgICAgIHBhc3NBcmdzICAgID0gb3JpZ0FyZ3Muc2xpY2UoMSksXG4gICAgICAgIHN1cGVyTWV0aG9kID0gdGhpcy5fX3N1cGVyX19bbWV0aG9kTmFtZV07XG5cbiAgICBpZiAoaGVscGVyLmlzRnVuY3Rpb24oc3VwZXJNZXRob2QpKSB7XG4gICAgICByZXR1cm4gc3VwZXJNZXRob2QuYXBwbHkodGhpcywgcGFzc0FyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvZXMgbm90IGV4aXN0cyBtZXRob2QgaW4gc3VwZXIgZWxlbWVudCBzcGVjaWZpZWQ6ICcgKyBzdXBlck1ldGhvZCk7XG4gICAgfVxuICB9XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUT0RPIGltcGxlbWVudFxuICogQGNsYXNzIENsYXlFdmVudFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIEBzdGF0aWNcbiAgICogQHJldHVybnMge0NsYXlFdmVudH1cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBDbGF5RXZlbnQoKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gQ2xheUV2ZW50KCkge1xuXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICogQHBhcmFtIHtCb29sZWFufSBbb3ZlcndyaXRlXVxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5mdW5jdGlvbiBtaXgodG8sIGZyb20sIG92ZXJ3cml0ZSkge1xuICB2YXIgaSA9IDAsIGtleXMgPSBPYmplY3Qua2V5cyhmcm9tKSwgcHJvcDtcblxuICB3aGlsZSAoKHByb3AgPSBrZXlzW2krK10pKSB7XG4gICAgaWYgKG92ZXJ3cml0ZSB8fCAhdG9bcHJvcF0pIHtcbiAgICAgIHRvW3Byb3BdID0gZnJvbVtwcm9wXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRvO1xufVxuXG4vKipcbiAqIHNoYWxsb3cgZmxhdHRlblxuICogQHBhcmFtIHtBcnJheX0gbGlzdFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiBmbGF0dGVuKGxpc3QpIHtcbiAgdmFyIGkgPSAwLCBpdGVtLCByZXQgPSBbXTtcbiAgd2hpbGUgKChpdGVtID0gbGlzdFtpKytdKSkge1xuICAgIGlmIChpc0FycmF5KGl0ZW0pKSB7XG4gICAgICByZXQgPSByZXQuY29uY2F0KGl0ZW0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXQucHVzaChpdGVtKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZnVuY3Rpb24gY2xvbmUob2JqKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoMClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IG1peCh7fSwgb2JqKVxufVxuXG4vKipcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHVuaXEoYXJyYXkpIHtcbiAgdmFyIHJldCA9IFtdLCBpID0gMCwgaXRlbTtcblxuICB3aGlsZSAoKGl0ZW0gPSBhcnJheVtpKytdKSkge1xuICAgIGlmIChyZXQuaW5kZXhPZihpdGVtKSA9PT0gLTEpIHtcbiAgICAgIHJldC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIHRvU3RyaW5nKHZhbHVlKSB7XG4gIHZhciBvYmpTdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICByZXR1cm4gb2JqU3RyLnNsaWNlKG9ialN0ci5pbmRleE9mKCcgJykgKyAxLCAtMSk7XG59XG5cbi8qKlxuICogZmFrZSBhcnJheSAobGlrZSBOb2RlTGlzdCwgQXJndW1lbnRzIGV0YykgY29udmVydCB0byBBcnJheVxuICogQHBhcmFtIHsqfSBmYWtlQXJyYXlcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gdG9BcnJheShmYWtlQXJyYXkpIHtcbiAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZha2VBcnJheSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzTnVtYmVyKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0FycmF5KHZhbHVlKSB7XG4gIHJldHVybiB0b1N0cmluZyh2YWx1ZSkgPT09ICdBcnJheSc7XG59XG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IGxvY2FsTmFtZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQ3VzdG9tRWxlbWVudE5hbWUobG9jYWxOYW1lKSB7XG4gIHJldHVybiBsb2NhbE5hbWUuaW5kZXhPZignLScpICE9PSAtMTtcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBoYW5kbGVyXG4gKi9cbmZ1bmN0aW9uIHJlYWR5KGhhbmRsZXIpIHtcbiAgaWYgKEZMR19ET01fQUxSRUFEWSkge1xuICAgIGhhbmRsZXIoKTtcbiAgfSBlbHNlIHtcbiAgICBTVEFDS19SRUFEWV9IQU5ETEVSUy5wdXNoKGhhbmRsZXIpO1xuICB9XG59XG5cbnZhciBGTEdfRE9NX0FMUkVBRFkgICAgICA9IGZhbHNlLFxuICAgIFNUQUNLX1JFQURZX0hBTkRMRVJTID0gW107XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgRkxHX0RPTV9BTFJFQURZID0gdHJ1ZTtcbiAgdmFyIGkgPSAwLCByZWFkeTtcbiAgd2hpbGUgKHJlYWR5ID0gU1RBQ0tfUkVBRFlfSEFORExFUlNbaSsrXSkge1xuICAgIHJlYWR5KCk7XG4gIH1cbn0sIGZhbHNlKTtcblxud2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSAgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cub1JlcXVlc3RBbmltYXRpb25GcmFtZTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG5vb3AgICAgICA6IGZ1bmN0aW9uIG5vb3AoKSB7fSxcbiAgbWl4ICAgICAgIDogbWl4LFxuICB1bmlxICAgICAgOiB1bmlxLFxuICBjbG9uZSAgICAgOiBjbG9uZSxcbiAgZmxhdHRlbiAgIDogZmxhdHRlbixcbiAgcmVhZHkgICAgIDogcmVhZHksXG4gIHRvQXJyYXkgICA6IHRvQXJyYXksXG4gIHRvU3RyaW5nICA6IHRvU3RyaW5nLFxuXG4gIGlzU3RyaW5nICAgICAgICAgICAgOiBpc1N0cmluZyxcbiAgaXNOdW1iZXIgICAgICAgICAgICA6IGlzTnVtYmVyLFxuICBpc0FycmF5ICAgICAgICAgICAgIDogaXNBcnJheSxcbiAgaXNGdW5jdGlvbiAgICAgICAgICA6IGlzRnVuY3Rpb24sXG4gIGlzQ3VzdG9tRWxlbWVudE5hbWUgOiBpc0N1c3RvbUVsZW1lbnROYW1lXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaGVscGVyID0gcmVxdWlyZSgnLi4vaGVscGVyJyk7XG5cbi8vIHRlc3Qgc2FtcGxlXG5mdW5jdGlvbiBIdHRwKGN0eCkge1xuICB0aGlzLmNvbnRleHQgPSBjdHg7XG59XG5cbmhlbHBlci5taXgoSHR0cC5wcm90b3R5cGUsIHtcbiAgZ2V0OiBmdW5jdGlvbih1cmwpIHtcblxuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmYWN0b3J5KGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBIdHRwKGNvbnRleHQpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUT0RPIGltcGxlbWVudFxuICogQGNsYXNzIENsYXlPYnNlcnZlclxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLyoqXG4gICAqIEBzdGF0aWNcbiAgICogQHJldHVybnMge0NsYXlPYnNlcnZlcn1cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBDbGF5T2JzZXJ2ZXIoKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gQ2xheU9ic2VydmVyKCkge1xuXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBlbGVtZW50ID0gcmVxdWlyZSgnLi9lbGVtZW50Jyk7XG52YXIgaGVscGVyICA9IHJlcXVpcmUoJy4vaGVscGVyJyk7XG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBwcm90b1xuICovXG5mdW5jdGlvbiBDbGF5UmVnaXN0ZXIobmFtZSwgcHJvdG8pIHtcbiAgdmFyIG9wdGlvbnMgPSB7XG4gICAgcHJvdG90eXBlOiBlbGVtZW50LmNyZWF0ZShuYW1lLCBwcm90bylcbiAgfTtcblxuICBpZiAocHJvdG8uZXh0ZW5kcyAmJiAhaGVscGVyLmlzQ3VzdG9tRWxlbWVudE5hbWUocHJvdG8uZXh0ZW5kcykpIHtcbiAgICBvcHRpb25zLmV4dGVuZHMgPSBwcm90by5leHRlbmRzO1xuICB9XG5cbiAgZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KG5hbWUsIG9wdGlvbnMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXlSZWdpc3RlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbnN0YW50cyAgPSByZXF1aXJlKFwiLi9jb25zdGFudHNcIik7XG52YXIgaGVscGVyICAgICA9IHJlcXVpcmUoXCIuL2hlbHBlclwiKTtcbnZhciB0bXBsSGVscGVyID0gcmVxdWlyZShcIi4vdGVtcGxhdGUtaGVscGVyXCIpO1xudmFyIGh0bWxQYXJzZXIgPSByZXF1aXJlKFwiaHRtbFBhcnNlclwiKTtcblxuLyoqXG4gKiBAY2xhc3MgQ2xheVRlbXBsYXRlQ29tcGlsZXJcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8qKlxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBodG1sXG4gICAqIEByZXR1cm5zIHtDbGF5VGVtcGxhdGVDb21waWxlcn1cbiAgICovXG4gIGNyZWF0ZTogZnVuY3Rpb24oaHRtbCkge1xuICAgIHJldHVybiBuZXcgQ2xheVRlbXBsYXRlQ29tcGlsZXIoaHRtbCk7XG4gIH1cbn07XG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IGh0bWxcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDbGF5VGVtcGxhdGVDb21waWxlcihodG1sKSB7XG4gIHZhciBoYW5kbGVyID0gbmV3IGh0bWxQYXJzZXIuRGVmYXVsdEhhbmRsZXIoZnVuY3Rpb24gKGVyciwgZG9tKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAgZW5mb3JjZUVtcHR5VGFncyA6IHRydWUsXG4gICAgICAgIGlnbm9yZVdoaXRlc3BhY2UgOiB0cnVlLFxuICAgICAgICB2ZXJib3NlICAgICAgICAgIDogZmFsc2VcbiAgICAgIH0pLFxuICAgICAgcGFyc2VyID0gbmV3IGh0bWxQYXJzZXIuUGFyc2VyKGhhbmRsZXIpO1xuXG4gIGNvbnNvbGUudGltZSgncGFyc2UgaHRtbCcpO1xuICBwYXJzZXIucGFyc2VDb21wbGV0ZShodG1sKTtcbiAgY29uc29sZS50aW1lRW5kKCdwYXJzZSBodG1sJyk7XG5cbiAgaWYgKGhhbmRsZXIuZG9tLmxlbmd0aCA+IDEpIHtcbiAgICB0aHJvdyBFcnJvcignVGVtcGxhdGUgbXVzdCBoYXZlIGV4YWN0bHkgb25lIHJvb3QgZWxlbWVudC4gd2FzOiAnICsgaHRtbCk7XG4gIH1cblxuICB0aGlzLnN0cnVjdHVyZSA9IGhhbmRsZXIuZG9tWzBdO1xufVxuXG5oZWxwZXIubWl4KENsYXlUZW1wbGF0ZUNvbXBpbGVyLnByb3RvdHlwZSwge1xuICAvKipcbiAgICogcGFyc2VkIERPTSBzdHJ1Y3R1cmVcbiAgICogQHByb3BlcnR5XG4gICAqL1xuICBzdHJ1Y3R1cmU6IHt9LFxuXG4gIC8qKlxuICAgKlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgY29tcGlsZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNvbXBpbGVEb21TdHJ1Y3R1cmUodGhpcy5zdHJ1Y3R1cmUpO1xuICB9XG59KTtcblxuLyoqXG4gKiBAZGVzdHJ1Y3RpdmVcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb21TdHJ1Y3R1cmVcbiAqL1xuZnVuY3Rpb24gY29tcGlsZURvbVN0cnVjdHVyZShkb21TdHJ1Y3R1cmUpIHtcbiAgZG9tU3RydWN0dXJlID0gZG9tU3RydWN0dXJlIHx8IHt9O1xuICB2YXIgZGF0YSAgICAgPSBkb21TdHJ1Y3R1cmUuZGF0YSxcbiAgICAgIGF0dHJzICAgID0gZG9tU3RydWN0dXJlLmF0dHJpYnMgICAgfHwge30sXG4gICAgICBjaGlsZHJlbiA9IGRvbVN0cnVjdHVyZS5jaGlsZHJlbiAgIHx8IFtdLFxuICAgICAgaG9va3MgICAgPSBkb21TdHJ1Y3R1cmUuaG9va3MgICAgICA9IHt9LFxuICAgICAgZXZhbHMgICAgPSBkb21TdHJ1Y3R1cmUuZXZhbHVhdG9ycyA9IHtcbiAgICAgICAgYXR0cnMgIDoge30sXG4gICAgICAgIHN0eWxlICA6IGZhbHNlLFxuICAgICAgICBkYXRhICAgOiBmYWxzZSxcbiAgICAgICAgcmVwZWF0IDogZmFsc2VcbiAgICAgIH0sXG4gICAgICBrZXlzLCBrZXksIGkgPSAwO1xuXG4gIC8vIHN0eWxlcyBldmFsdWF0b3JcbiAgaWYgKGF0dHJzLnN0eWxlKSB7XG4gICAgZG9tU3RydWN0dXJlLnN0eWxlID0gYXR0cnMuc3R5bGU7XG4gICAgZGVsZXRlIGF0dHJzLnN0eWxlO1xuICAgIGV2YWxzLnN0eWxlID0gY29tcGlsZVZhbHVlKGRvbVN0cnVjdHVyZS5zdHlsZSk7XG4gIH1cblxuICAvLyBhdHRyaWJ1dGVzIGV2YWx1YXRvciAmIGhvb2tcbiAga2V5cyA9IE9iamVjdC5rZXlzKGF0dHJzKTtcbiAgd2hpbGUgKChrZXkgPSBrZXlzW2krK10pKSB7XG4gICAgLy8gaG9va1xuICAgIGlmICh0bXBsSGVscGVyW2tleV0pIHtcbiAgICAgIGhvb2tzW2tleV0gPSBob29rKHRtcGxIZWxwZXJba2V5XSk7XG4gICAgfVxuICAgIC8vIHJlcGVhdFxuICAgIGVsc2UgaWYgKGtleSA9PT0gY29uc3RhbnRzLlNUUl9SRVBFQVRfQVRUUklCVVRFKSB7XG4gICAgICBldmFscy5yZXBlYXQgPSBjb21waWxlUmVwZWF0RXhwcmVzc2lvbihhdHRyc1tjb25zdGFudHMuU1RSX1JFUEVBVF9BVFRSSUJVVEVdKTtcbiAgICAgIGRlbGV0ZSBhdHRyc1tjb25zdGFudHMuU1RSX1JFUEVBVF9BVFRSSUJVVEVdO1xuICAgIH1cbiAgICAvLyBpbnRlcnBvbGF0ZVxuICAgIGVsc2Uge1xuICAgICAgZXZhbHMuYXR0cnNba2V5XSA9IGNvbXBpbGVWYWx1ZShhdHRyc1trZXldKTtcbiAgICB9XG4gIH1cblxuICAvLyBkYXRhICh0ZXh0KSBldmFsdWF0b3JcbiAgZXZhbHMuZGF0YSA9IGNvbXBpbGVWYWx1ZShkYXRhKTtcblxuICAvLyByZWN1cnNpdmVcbiAgY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbihjaGlsZCkge1xuICAgIGNvbXBpbGVEb21TdHJ1Y3R1cmUoY2hpbGQpO1xuICB9KTtcblxuICByZXR1cm4gZG9tU3RydWN0dXJlXG59XG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybnMge0Z1bmN0aW9ufE51bGx9XG4gKi9cbmZ1bmN0aW9uIGNvbXBpbGVWYWx1ZShzdHIpIHtcbiAgc3RyID0gKHN0ciB8fCAnJyk7XG4gIHZhciBtYXRjaGVzID0gc3RyLm1hdGNoKGNvbnN0YW50cy5SRVhfSU5URVJQT0xBVEVfU1lNQk9MKTtcblxuICBpZiAobWF0Y2hlcyA9PT0gbnVsbCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHJldHVybiBuZXcgRnVuY3Rpb24oJ2RhdGEnLFtcbiAgICBcInZhciBzPVtdO1wiLFxuICAgIFwicy5wdXNoKCdcIixcbiAgICBzdHIucmVwbGFjZSgvW1xcclxcblxcdF0vZywgJyAnKVxuICAgICAgIC5zcGxpdChcIidcIikuam9pbihcIlxcXFwnXCIpXG4gICAgICAgLnJlcGxhY2UoL3t7KFtee31dKyl9fS9nLCBcIicsKGRhdGEuJDEgIT0gbnVsbCA/IGRhdGEuJDEgOiAnJyksJ1wiKVxuICAgICAgIC5zcGxpdCgvXFxzezIsfS8pLmpvaW4oJyAnKSxcbiAgICBcIicpO1wiLFxuICAgIFwicmV0dXJuIHMuam9pbignJyk7XCJcbiAgXS5qb2luKCcnKSk7XG59XG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IHJlcGVhdEV4cHJcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqL1xuZnVuY3Rpb24gY29tcGlsZVJlcGVhdEV4cHJlc3Npb24ocmVwZWF0RXhwcikge1xuICB2YXIgbWF0Y2hlcyA9IChyZXBlYXRFeHByIHx8ICcnKS5tYXRjaChjb25zdGFudHMuUkVYX1JFUEVBVF9TWU1CT0wpLFxuICAgICAgcGFyZW50VGFyZ2V0UGF0aCxcbiAgICAgIGNoaWxkU2NvcGVOYW1lO1xuXG4gIGlmIChtYXRjaGVzID09PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHN5bnRheCBmb3IgcmVwZWF0OiAnICsgcmVwZWF0RXhwcilcbiAgfVxuXG4gIHBhcmVudFRhcmdldFBhdGggPSBtYXRjaGVzWzJdO1xuICBjaGlsZFNjb3BlTmFtZSAgID0gbWF0Y2hlc1sxXTtcblxuICByZXR1cm4gbmV3IEZ1bmN0aW9uKCdkYXRhJywgW1xuICAgIFwicmV0dXJuIGRhdGEuXCIgKyBwYXJlbnRUYXJnZXRQYXRoICsgXCIubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcIixcbiAgICBcIiAgdmFyIGtzLCBrLCBpID0gMCwgciA9IHt9O1wiLFxuICAgIFwiICBrcyA9IE9iamVjdC5rZXlzKGRhdGEpO1wiLFxuICAgIFwiICB3aGlsZSAoKGsgPSBrc1tpKytdKSkge1wiLFxuICAgIFwiICAgIHJba10gPSBkYXRhW2tdO1wiLFxuICAgIFwiICB9XCIsXG4gICAgXCIgIHIuXCIgKyBjaGlsZFNjb3BlTmFtZSArIFwiID0gaXRlbTtcIixcbiAgICBcIiAgcmV0dXJuIHI7XCIsXG4gICAgXCJ9KTtcIlxuICBdLmpvaW4oJycpKTtcbn1cblxuLyoqXG4gKiBob29rIGNsYXNzXG4gKiBAY2xhc3MgSG9va1dyYXBwZXJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gSG9va1dyYXBwZXIoZm4pIHtcbiAgdGhpcy5mbiA9IGZuXG59XG5cbkhvb2tXcmFwcGVyLnByb3RvdHlwZS5ob29rID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn07XG5cbi8qKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm5zIHtIb29rV3JhcHBlcn1cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBob29rKGZuKSB7XG4gIHJldHVybiBuZXcgSG9va1dyYXBwZXIoZm4pXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBoZWxwZXIgICAgID0gcmVxdWlyZShcIi4vaGVscGVyXCIpO1xuXG4vKipcbiAqXG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuICByZWdpc3RlcjogZnVuY3Rpb24obmFtZSwgZnVuYykge1xuICAgIHRoaXNbbmFtZV0gPSBmdW5jO1xuICB9LFxuICBob29rOiBmdW5jdGlvbihlbCkge1xuICAgIGNvbnNvbGUubG9nKCdob29rJywgZWwpO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaCAgICAgICAgICAgID0gcmVxdWlyZSgndmlydHVhbC1kb20vaCcpO1xudmFyIGRpZmYgICAgICAgICA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL2RpZmYnKTtcbnZhciBwYXRjaCAgICAgICAgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9wYXRjaCcpO1xudmFyIGhlbHBlciAgICAgICA9IHJlcXVpcmUoXCIuL2hlbHBlclwiKTtcbnZhciB0bXBsQ29tcGlsZXIgPSByZXF1aXJlKFwiLi90ZW1wbGF0ZS1jb21waWxlclwiKTtcbnZhciBjcmVhdGUgICAgICAgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9jcmVhdGUtZWxlbWVudCcpO1xuXG4vKipcbiAqIEBjbGFzcyBDbGF5VGVtcGxhdGVcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIC8qKlxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBodG1sXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbc2NvcGVdXG4gICAqIEByZXR1cm5zIHtDbGF5VGVtcGxhdGV9XG4gICAqL1xuICBjcmVhdGU6IGZ1bmN0aW9uKGh0bWwsIHNjb3BlKSB7XG4gICAgcmV0dXJuIG5ldyBDbGF5VGVtcGxhdGUoaHRtbCwgc2NvcGUpO1xuICB9XG59O1xuXG4vKipcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHBhcmFtIHtPYmplY3R9IFtzY29wZV1cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBDbGF5VGVtcGxhdGUoaHRtbCwgc2NvcGUpIHtcbiAgdGhpcy5zY29wZSA9IHNjb3BlIHx8IHt9O1xuXG4gIHRoaXMuY29tcGlsZWQgPSB0bXBsQ29tcGlsZXIuY3JlYXRlKGh0bWwpLmNvbXBpbGUoKTtcbn1cblxuaGVscGVyLm1peChDbGF5VGVtcGxhdGUucHJvdG90eXBlLCB7XG5cbiAgLyoqXG4gICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzY29wZVxuICAgKi9cbiAgc2NvcGU6IHt9LFxuXG4gIC8qKlxuICAgKiBjb21waWxlZCBET00gc3RydWN0dXJlXG4gICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBjb21waWxlZFxuICAgKi9cbiAgY29tcGlsZWQ6IHt9LFxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcHJvcGVydHkge1ZUcmVlfSBfY3VycmVudFZUcmVlXG4gICAqL1xuICBfY3VycmVudFZUcmVlOiBudWxsLFxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcHJvcGVydHkge0FycmF5fSBfZGlmZlF1ZXVlXG4gICAqL1xuICBfZGlmZlF1ZXVlOiBbXSxcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICogQHByb3BlcnR5IHtCb29sZWFufSBfaW52YWxpZGF0ZWRcbiAgICovXG4gIF9pbnZhbGlkYXRlZDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEByZXR1cm5zIHtWVHJlZX1cbiAgICovXG4gIGNyZWF0ZVZUcmVlOiBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLnRpbWUoJ2NvbXB1dGUgdnRyZWUnKTtcbiAgICB2YXIgcmV0ID0gdGhpcy5fY3VycmVudFZUcmVlID0gY29udmVydFBhcnNlZERvbVRvVlRyZWUodGhpcy5jb21waWxlZCwgdGhpcy5zY29wZSk7XG4gICAgY29uc29sZS50aW1lRW5kKCdjb21wdXRlIHZ0cmVlJyk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICAvKipcbiAgICogQHBhcmFtIHtEb2N1bWVudH0gW2RvY11cbiAgICogQHJldHVybnMge0VsZW1lbnR8TnVsbH1cbiAgICovXG4gIGNyZWF0ZUVsZW1lbnQ6IGZ1bmN0aW9uKGRvYykge1xuICAgIHJldHVybiBjcmVhdGUodGhpcy5jcmVhdGVWVHJlZSgpLCB7XG4gICAgICBkb2N1bWVudDogZG9jIHx8IGRvY3VtZW50XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBpbnZhbGlkYXRlOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5faW52YWxpZGF0ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW52YWxpZGF0ZWQgPSB0cnVlO1xuICAgIHNldFRpbWVvdXQodGhpcy5fdXBkYXRlLmJpbmQodGhpcyksIDQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3VwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS50aW1lKCdjb21wdXRlIHZ0cmVlJyk7XG4gICAgdmFyIGN1cnJlbnQgPSB0aGlzLl9jdXJyZW50VlRyZWUsXG4gICAgICAgIHVwZGF0ZWQgPSBjb252ZXJ0UGFyc2VkRG9tVG9WVHJlZSh0aGlzLmNvbXBpbGVkLCB0aGlzLnNjb3BlKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoJ2NvbXB1dGUgdnRyZWUnKTtcblxuICAgIGNvbnNvbGUudGltZSgnY29tcHV0ZSBkaWZmJyk7XG4gICAgdGhpcy5fZGlmZlF1ZXVlID0gZGlmZihjdXJyZW50LCB1cGRhdGVkKTtcbiAgICBjb25zb2xlLnRpbWVFbmQoJ2NvbXB1dGUgZGlmZicpO1xuICAgIHRoaXMuX2N1cnJlbnRWVHJlZSA9IHVwZGF0ZWQ7XG5cbiAgICB0aGlzLl9pbnZhbGlkYXRlZCA9IGZhbHNlO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFJvb3RcbiAgICovXG4gIGRyYXdMb29wOiBmdW5jdGlvbih0YXJnZXRSb290KSB7XG4gICAgdmFyIHBhdGNoRE9NID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5fZGlmZlF1ZXVlKSB7XG4gICAgICAgIGNvbnNvbGUudGltZSgnYXBwbHkgcGF0Y2gnKTtcbiAgICAgICAgcGF0Y2godGFyZ2V0Um9vdCwgdGhpcy5fZGlmZlF1ZXVlKTtcbiAgICAgICAgY29uc29sZS50aW1lRW5kKCdhcHBseSBwYXRjaCcpO1xuICAgICAgICB0aGlzLl9kaWZmUXVldWUgPSBudWxsO1xuICAgICAgfVxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShwYXRjaERPTSk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgcGF0Y2hET00oKTtcbiAgfSxcblxuICAvKipcbiAgICpcbiAgICovXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2NvcGUgPSB0aGlzLmNvbXBpbGVkID0gbnVsbDtcbiAgfVxufSk7XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkb21cbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlUmVwZWF0XVxuICogQHJldHVybnMge09iamVjdHxBcnJheX1cbiAqL1xuZnVuY3Rpb24gY29udmVydFBhcnNlZERvbVRvVlRyZWUoZG9tLCBzY29wZSwgaWdub3JlUmVwZWF0KSB7XG4gIHZhciB0YWcgICAgICA9IGRvbS5uYW1lLFxuICAgICAgdHlwZSAgICAgPSBkb20udHlwZSxcbiAgICAgIGRhdGEgICAgID0gZG9tLmRhdGEsXG4gICAgICBvcmdBdHRycyA9IGRvbS5hdHRyaWJzICB8fCB7fSxcbiAgICAgIG9yZ1N0eWxlID0gZG9tLnN0eWxlICAgIHx8ICcnLFxuICAgICAgY2hpbGRyZW4gPSBkb20uY2hpbGRyZW4gfHwgW10sXG4gICAgICBldmFscyAgICA9IGRvbS5ldmFsdWF0b3JzLFxuICAgICAgYXR0cnMgICAgPSB7fSxcbiAgICAgIHN0eWxlICAgID0ge30sXG4gICAgICBob29rcyAgICA9IGRvbS5ob29rcyxcbiAgICAgIGtleXMsIGtleSwgaSA9IDA7XG5cbiAgc3dpdGNoKHR5cGUpIHtcbiAgICBjYXNlICd0YWcnOlxuXG4gICAgICAvLyByZXBlYXQgZWxlbWVudHNcbiAgICAgIGlmIChldmFscy5yZXBlYXQgJiYgIWlnbm9yZVJlcGVhdCkge1xuICAgICAgICByZXR1cm4gZXZhbHMucmVwZWF0KHNjb3BlKS5tYXAoZnVuY3Rpb24oY2hpbGRTY29wZSkge1xuICAgICAgICAgIHJldHVybiBjb252ZXJ0UGFyc2VkRG9tVG9WVHJlZShkb20sIGNoaWxkU2NvcGUsIHRydWUpXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBldmFsIHN0eWxlc1xuICAgICAgaWYgKG9yZ1N0eWxlKSB7XG4gICAgICAgIHN0eWxlID0gZXZhbHMuc3R5bGUgPyBldmFscy5zdHlsZShzY29wZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IG9yZ1N0eWxlO1xuICAgICAgICBzdHlsZSA9IGNvbnZlcnRDc3NTdHJpbmdUb09iamVjdChzdHlsZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGV2YWwgYXR0cmlidXRlc1xuICAgICAga2V5cyA9IE9iamVjdC5rZXlzKG9yZ0F0dHJzKTtcbiAgICAgIHdoaWxlICgoa2V5ID0ga2V5c1tpKytdKSkge1xuICAgICAgICBhdHRyc1trZXldID0gZXZhbHMuYXR0cnNba2V5XSA/IGV2YWxzLmF0dHJzW2tleV0oc2NvcGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogb3JnQXR0cnNba2V5XTtcbiAgICAgIH1cblxuICAgICAgLy8gZmxhdHRlbiBjaGlsZHJlblxuICAgICAgY2hpbGRyZW4gPSBjaGlsZHJlbi5tYXAoZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29udmVydFBhcnNlZERvbVRvVlRyZWUoY2hpbGQsIHNjb3BlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHYpIHsgcmV0dXJuICEhdjsgfSk7XG4gICAgICBjaGlsZHJlbiA9IGhlbHBlci5mbGF0dGVuKGNoaWxkcmVuKTtcblxuICAgICAgLy8gY3JlYXRlIFZUcmVlXG4gICAgICByZXR1cm4gaCh0YWcsIGhlbHBlci5taXgoe1xuICAgICAgICBhdHRyaWJ1dGVzIDogYXR0cnMsXG4gICAgICAgIHN0eWxlICAgICAgOiBzdHlsZVxuICAgICAgfSwgaG9va3MpLCBjaGlsZHJlbik7XG5cbiAgICBjYXNlICd0ZXh0JzpcbiAgICAgIC8vIGV2YWwgdGV4dFxuICAgICAgcmV0dXJuIFN0cmluZyhldmFscy5kYXRhID8gZXZhbHMuZGF0YShzY29wZSkgOiBkYXRhKTtcblxuICAgIGNhc2UgJ2NvbW1lbnQnOlxuICAgICAgLy8gaWdub3JlXG4gICAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIEBwYXJhbSB7U3RyaW5nfSBjc3NTdHJcbiAqIEByZXR1cm5zIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIGNvbnZlcnRDc3NTdHJpbmdUb09iamVjdChjc3NTdHIpIHtcbiAgdmFyIGNzc1N0cmluZ3MgPSBjc3NTdHIucmVwbGFjZSgvXFxzL2csICcnKS5zcGxpdCgnOycpLFxuICAgICAgcmV0U3R5bGUgICA9IHt9LFxuICAgICAgaSA9IDAsIHByb3BfdmFsdWU7XG5cbiAgd2hpbGUgKChwcm9wX3ZhbHVlID0gY3NzU3RyaW5nc1tpKytdKSkge1xuICAgIHByb3BfdmFsdWUgPSBwcm9wX3ZhbHVlLnNwbGl0KCc6Jyk7XG4gICAgcmV0U3R5bGVbcHJvcF92YWx1ZVswXV0gPSBwcm9wX3ZhbHVlWzFdO1xuICB9XG5cbiAgcmV0dXJuIHJldFN0eWxlO1xufVxuIl19
