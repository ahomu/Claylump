/*! ClayRuntime - v0.0.6 */!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.ClayRuntime=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{}],2:[function(require,module,exports){
"use strict";

var ClayCompiler = require('./template-compiler')["default"];
var helper = require('./helper')["default"];


/**
 * @class ClayRuntime
 * @type {Object}
 */
module.exports = {
  compiler: ClayCompiler
};

},{"./helper":3,"./template-compiler":4}],3:[function(require,module,exports){
"use strict";

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
  return Array.isArray(obj) ? obj.slice(0) : mix({}, obj);
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

  var list = ["matches", "webkitMatchesSelector", "mozMatchesSelector", "msMatchesSelector"], proto = HTMLElement.prototype, i = 0, name;

  while ((name = list[i++])) {
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
  return objStr.slice(objStr.indexOf(" ") + 1, -1);
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
  return typeof value === "function";
}

/**
 * @param {*} value
 * @returns {Boolean}
 */
function isString(value) {
  return typeof value === "string";
}

/**
 * @param {*} value
 * @returns {Boolean}
 */
function isNumber(value) {
  return typeof value === "number";
}

/**
 * @param {*} value
 * @returns {Boolean}
 */
function isArray(value) {
  return toString(value) === "Array";
}

/**
 * @param {*} value
 * @returns {Boolean}
 */
function isObject(value) {
  return toString(value) === "Object";
}

/**
 * @param {String} localName
 * @returns {boolean}
 */
function isCustomElementName(localName) {
  return localName.indexOf("-") !== -1;
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

var FLG_DOM_ALREADY = false, STACK_READY_HANDLERS = [];

document.addEventListener("DOMContentLoaded", function () {
  FLG_DOM_ALREADY = true;
  var i = 0, ready;
  while (ready = STACK_READY_HANDLERS[i++]) {
    ready();
  }
}, false);

exports["default"] = {
  noop: function noop() {},
  mix: mix,
  uniq: uniq,
  clone: clone,
  flatten: flatten,
  ready: ready,
  invoke: invoke,
  toArray: toArray,
  toString: toString,

  matchElement: matchElement,

  isString: isString,
  isNumber: isNumber,
  isArray: isArray,
  isFunction: isFunction,
  isObject: isObject,
  isCustomElementName: isCustomElementName
};

},{}],4:[function(require,module,exports){
"use strict";

var _toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

var _classProps = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

"use strict";

var helper = require("./helper")["default"];
var htmlParser = require("htmlParser");

var REX_INTERPOLATE_SYMBOL = /{{[^{}]+}}/g;
var REX_REPEAT_SYMBOL = /{{(\w+)\sin\s([\w\.]+)}}/;
var STR_REPEAT_ATTRIBUTE = "cl-repeat";
var STR_IF_ATTRIBUTE = "cl-if";
var STR_UNLESS_ATTRIBUTE = "cl-unless";
var STR_EVAL_FUNCTION_SYMBOL = "__EVAL_FUNCTION__";

exports["default"] = {
  /**
   * @static
   * @returns {ClayTemplateCompiler}
   */
  create: function () {
    return new ClayTemplateCompiler();
  }
};
var ClayTemplateCompiler = (function () {
  var ClayTemplateCompiler =
  /**
   * @constructor
   */
  function ClayTemplateCompiler() {};

  _classProps(ClayTemplateCompiler, null, {
    compileFromHtml: {
      writable: true,


      /**
       * @typedef {Object} DomStructure
       * @property {?String} data
       * @property {Object.<string, string>} attribs
       * @property {String} style
       * @property {TplEvaluators} evaluators
       * @property {Array.<DomStructure>} children
       */

      /**
       * @typedef {Object} TplEvaluators
       * @property {Object.<string, function>} attrs
       * @property {?Function} style
       * @property {?Function} data
       * @property {?Function} repeat
       */


      /**
       * @param {String} html
       * @returns {DomStructure}
       */
      value: function (html) {
        var parsed = this.parseHtml(html);
        this.preCompile = false;
        return this.compileDomStructure(parsed);
      }
    },
    serializeFromHtml: {
      writable: true,


      /**
       * @param {String} html
       * @returns {String}
       */
      value: function (html) {
        var parsed = this.parseHtml(html);
        this.preCompile = true;
        return JSON.stringify(this.compileDomStructure(parsed));
      }
    },
    parseHtml: {
      writable: true,
      value: function (html) {
        var handler = new htmlParser.DefaultHandler(function (err, dom) {
          if (err) {
            console.error(err);
          }
        }, {
          enforceEmptyTags: true,
          ignoreWhitespace: true,
          verbose: false
        }), parser = new htmlParser.Parser(handler);

        // parse html
        parser.parseComplete(html);
        if (handler.dom.length > 1) {
          throw Error("Template must have exactly one root element. was: " + html);
        }

        return handler.dom[0];
      }
    },
    compileDomStructure: {
      writable: true,



      /**
       * @destructive
       * @param {Object} domStructure
       */
      value: function (domStructure) {
        var _this = this;
        if (domStructure === undefined) domStructure = {};
        var data = domStructure.data, attrs = domStructure.attribs || {}, children = domStructure.children || [], evals = domStructure.evaluators = {
          attrs: {},
          style: null,
          data: null,
          if: null,
          unless: null,
          repeat: null
        }, keys, key, i = 0;

        // styles evaluator
        if (attrs.style) {
          domStructure.style = attrs.style;
          evals.style = this.compileValue(domStructure.style);
          delete attrs.style; // delete from orig attrib object
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
            evals["if"] = this.compileIfExpression(attrs[STR_IF_ATTRIBUTE]);
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
        children.forEach(function (child) {
          return _this.compileDomStructure(child);
        });

        return domStructure;
      }
    },
    compileValue: {
      writable: true,


      /**
       * @param {String} str
       * @returns {?Function}
       */
      value: function (str) {
        str = (str || "");
        var matches = str.match(REX_INTERPOLATE_SYMBOL), funcBody;

        if (matches === null) {
          return null;
        }

        if (str === matches[0]) {
          // return primitive value (for hook)
          funcBody = "return data." + str.slice(2, -2) + ";";
        } else {
          // return processed string
          funcBody = ["var s=[];", "s.push('", str.replace(/[\r\n\t]/g, " ").split("'").join("\\'").replace(/{{([^{}]+)}}/g, "',(data.$1 != null ? data.$1 : ''),'").split(/\s{2,}/).join(" "), "');", "return s.join('');"].join("");
        }

        var funcObj = (function (_funcObj) {
          _funcObj[STR_EVAL_FUNCTION_SYMBOL] = true;
          return _funcObj;
        })({
          args: ["data", funcBody]
        });
        return this.preCompile ? funcObj : helper.invoke(Function, funcObj.args);
      }
    },
    compileRepeatExpression: {
      writable: true,


      /**
       * @param {String} repeatExpr
       * @returns {Function|Object}
       */
      value: function (repeatExpr) {
        var matches = (repeatExpr || "").match(REX_REPEAT_SYMBOL);

        if (matches === null) {
          throw new Error("Unexpected syntax for repeat: " + repeatExpr);
        }

        var _ref = _toArray(matches);

        var childScopeName = _ref[1];
        var parentTargetPath = _ref[2];


        var funcObj = (function (_funcObj2) {
          _funcObj2[STR_EVAL_FUNCTION_SYMBOL] = true;
          return _funcObj2;
        })({
          args: ["data", ["return data." + parentTargetPath + ".map(function(item) {", "  var ks, k, i = 0, r = {};", "  ks = Object.keys(data);", "  while ((k = ks[i++])) {", "    r[k] = data[k];", "  }", "  r." + childScopeName + " = item;", "  return r;", "});"].join("")]
        });
        return this.preCompile ? funcObj : helper.invoke(Function, funcObj.args);
      }
    },
    compileIfExpression: {
      writable: true,


      /**
       * @param {String} ifExpr
       * @returns {Function|Object}
       */
      value: function (ifExpr) {
        ifExpr = (ifExpr || "");
        var matches = ifExpr.match(REX_INTERPOLATE_SYMBOL);

        if (matches === null) {
          return null;
        }

        var funcObj = (function (_funcObj3) {
          _funcObj3[STR_EVAL_FUNCTION_SYMBOL] = true;
          return _funcObj3;
        })({
          // return primitive value
          args: ["data", "return data." + ifExpr.slice(2, -2) + ";"]
        });

        return this.preCompile ? funcObj : helper.invoke(Function, funcObj.args);
      }
    },
    compileUnlessExpression: {
      writable: true,


      /**
       * @param {String} unlessExpr
       * @returns {Function|Object}
       */
      value: function (unlessExpr) {
        unlessExpr = (unlessExpr || "");
        var matches = unlessExpr.match(REX_INTERPOLATE_SYMBOL);

        if (matches === null) {
          return null;
        }

        var funcObj = (function (_funcObj4) {
          _funcObj4[STR_EVAL_FUNCTION_SYMBOL] = true;
          return _funcObj4;
        })({
          // return primitive value
          args: ["data", "return data." + unlessExpr.slice(2, -2) + ";"]
        });

        return this.preCompile ? funcObj : helper.invoke(Function, funcObj.args);
      }
    }
  });

  return ClayTemplateCompiler;
})();

},{"./helper":3,"htmlParser":1}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvaHRtbFBhcnNlci9saWIvaHRtbHBhcnNlci5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy9fcnVudGltZS5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy9oZWxwZXIuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvdGVtcGxhdGUtY29tcGlsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztJQ3Z6Qk8sWUFBWTtJQUNaLE1B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U0F4T0csb0JBQW9CIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5Db3B5cmlnaHQgMjAxMCwgMjAxMSwgQ2hyaXMgV2luYmVycnkgPGNocmlzQHdpbmJlcnJ5Lm5ldD4uIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0b1xuZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGVcbnJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vclxuc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG5hbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HXG5GUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTXG5JTiBUSEUgU09GVFdBUkUuXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qIHYxLjcuNiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG5mdW5jdGlvbiBydW5uaW5nSW5Ob2RlICgpIHtcblx0cmV0dXJuKFxuXHRcdCh0eXBlb2YgcmVxdWlyZSkgPT0gXCJmdW5jdGlvblwiXG5cdFx0JiZcblx0XHQodHlwZW9mIGV4cG9ydHMpID09IFwib2JqZWN0XCJcblx0XHQmJlxuXHRcdCh0eXBlb2YgbW9kdWxlKSA9PSBcIm9iamVjdFwiXG5cdFx0JiZcblx0XHQodHlwZW9mIF9fZmlsZW5hbWUpID09IFwic3RyaW5nXCJcblx0XHQmJlxuXHRcdCh0eXBlb2YgX19kaXJuYW1lKSA9PSBcInN0cmluZ1wiXG5cdFx0KTtcbn1cblxuaWYgKCFydW5uaW5nSW5Ob2RlKCkpIHtcblx0aWYgKCF0aGlzLlRhdXRvbG9naXN0aWNzKVxuXHRcdHRoaXMuVGF1dG9sb2dpc3RpY3MgPSB7fTtcblx0ZWxzZSBpZiAodGhpcy5UYXV0b2xvZ2lzdGljcy5Ob2RlSHRtbFBhcnNlcilcblx0XHRyZXR1cm47IC8vTm9kZUh0bWxQYXJzZXIgYWxyZWFkeSBkZWZpbmVkIVxuXHR0aGlzLlRhdXRvbG9naXN0aWNzLk5vZGVIdG1sUGFyc2VyID0ge307XG5cdGV4cG9ydHMgPSB0aGlzLlRhdXRvbG9naXN0aWNzLk5vZGVIdG1sUGFyc2VyO1xufVxuXG4vL1R5cGVzIG9mIGVsZW1lbnRzIGZvdW5kIGluIHRoZSBET01cbnZhciBFbGVtZW50VHlwZSA9IHtcblx0ICBUZXh0OiBcInRleHRcIiAvL1BsYWluIHRleHRcblx0LCBEaXJlY3RpdmU6IFwiZGlyZWN0aXZlXCIgLy9TcGVjaWFsIHRhZyA8IS4uLj5cblx0LCBDb21tZW50OiBcImNvbW1lbnRcIiAvL1NwZWNpYWwgdGFnIDwhLS0uLi4tLT5cblx0LCBTY3JpcHQ6IFwic2NyaXB0XCIgLy9TcGVjaWFsIHRhZyA8c2NyaXB0Pi4uLjwvc2NyaXB0PlxuXHQsIFN0eWxlOiBcInN0eWxlXCIgLy9TcGVjaWFsIHRhZyA8c3R5bGU+Li4uPC9zdHlsZT5cblx0LCBUYWc6IFwidGFnXCIgLy9BbnkgdGFnIHRoYXQgaXNuJ3Qgc3BlY2lhbFxufVxuXG5mdW5jdGlvbiBQYXJzZXIgKGhhbmRsZXIsIG9wdGlvbnMpIHtcblx0dGhpcy5fb3B0aW9ucyA9IG9wdGlvbnMgPyBvcHRpb25zIDogeyB9O1xuXHRpZiAodGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24gPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24gPSBmYWxzZTsgLy9EbyBub3QgdHJhY2sgZWxlbWVudCBwb3NpdGlvbiBpbiBkb2N1bWVudCBieSBkZWZhdWx0XG5cdH1cblxuXHR0aGlzLnZhbGlkYXRlSGFuZGxlcihoYW5kbGVyKTtcblx0dGhpcy5faGFuZGxlciA9IGhhbmRsZXI7XG5cdHRoaXMucmVzZXQoKTtcbn1cblxuXHQvLyoqXCJTdGF0aWNcIioqLy9cblx0Ly9SZWd1bGFyIGV4cHJlc3Npb25zIHVzZWQgZm9yIGNsZWFuaW5nIHVwIGFuZCBwYXJzaW5nIChzdGF0ZWxlc3MpXG5cdFBhcnNlci5fcmVUcmltID0gLyheXFxzK3xcXHMrJCkvZzsgLy9UcmltIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZVxuXHRQYXJzZXIuX3JlVHJpbUNvbW1lbnQgPSAvKF5cXCEtLXwtLSQpL2c7IC8vUmVtb3ZlIGNvbW1lbnQgdGFnIG1hcmt1cCBmcm9tIGNvbW1lbnQgY29udGVudHNcblx0UGFyc2VyLl9yZVdoaXRlc3BhY2UgPSAvXFxzL2c7IC8vVXNlZCB0byBmaW5kIGFueSB3aGl0ZXNwYWNlIHRvIHNwbGl0IG9uXG5cdFBhcnNlci5fcmVUYWdOYW1lID0gL15cXHMqKFxcLz8pXFxzKihbXlxcc1xcL10rKS87IC8vVXNlZCB0byBmaW5kIHRoZSB0YWcgbmFtZSBmb3IgYW4gZWxlbWVudFxuXG5cdC8vUmVndWxhciBleHByZXNzaW9ucyB1c2VkIGZvciBwYXJzaW5nIChzdGF0ZWZ1bClcblx0UGFyc2VyLl9yZUF0dHJpYiA9IC8vRmluZCBhdHRyaWJ1dGVzIGluIGEgdGFnXG5cdFx0LyhbXj08PlxcXCJcXCdcXHNdKylcXHMqPVxccypcIihbXlwiXSopXCJ8KFtePTw+XFxcIlxcJ1xcc10rKVxccyo9XFxzKicoW14nXSopJ3woW149PD5cXFwiXFwnXFxzXSspXFxzKj1cXHMqKFteJ1wiXFxzXSspfChbXj08PlxcXCJcXCdcXHNcXC9dKykvZztcblx0UGFyc2VyLl9yZVRhZ3MgPSAvW1xcPFxcPl0vZzsgLy9GaW5kIHRhZyBtYXJrZXJzXG5cblx0Ly8qKlB1YmxpYyoqLy9cblx0Ly9NZXRob2RzLy9cblx0Ly9QYXJzZXMgYSBjb21wbGV0ZSBIVE1MIGFuZCBwdXNoZXMgaXQgdG8gdGhlIGhhbmRsZXJcblx0UGFyc2VyLnByb3RvdHlwZS5wYXJzZUNvbXBsZXRlID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlQ29tcGxldGUgKGRhdGEpIHtcblx0XHR0aGlzLnJlc2V0KCk7XG5cdFx0dGhpcy5wYXJzZUNodW5rKGRhdGEpO1xuXHRcdHRoaXMuZG9uZSgpO1xuXHR9XG5cblx0Ly9QYXJzZXMgYSBwaWVjZSBvZiBhbiBIVE1MIGRvY3VtZW50XG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VDaHVuayA9IGZ1bmN0aW9uIFBhcnNlciRwYXJzZUNodW5rIChkYXRhKSB7XG5cdFx0aWYgKHRoaXMuX2RvbmUpXG5cdFx0XHR0aGlzLmhhbmRsZUVycm9yKG5ldyBFcnJvcihcIkF0dGVtcHRlZCB0byBwYXJzZSBjaHVuayBhZnRlciBwYXJzaW5nIGFscmVhZHkgZG9uZVwiKSk7XG5cdFx0dGhpcy5fYnVmZmVyICs9IGRhdGE7IC8vRklYTUU6IHRoaXMgY2FuIGJlIGEgYm90dGxlbmVja1xuXHRcdHRoaXMucGFyc2VUYWdzKCk7XG5cdH1cblxuXHQvL1RlbGxzIHRoZSBwYXJzZXIgdGhhdCB0aGUgSFRNTCBiZWluZyBwYXJzZWQgaXMgY29tcGxldGVcblx0UGFyc2VyLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gUGFyc2VyJGRvbmUgKCkge1xuXHRcdGlmICh0aGlzLl9kb25lKVxuXHRcdFx0cmV0dXJuO1xuXHRcdHRoaXMuX2RvbmUgPSB0cnVlO1xuXHRcblx0XHQvL1B1c2ggYW55IHVucGFyc2VkIHRleHQgaW50byBhIGZpbmFsIGVsZW1lbnQgaW4gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdGlmICh0aGlzLl9idWZmZXIubGVuZ3RoKSB7XG5cdFx0XHR2YXIgcmF3RGF0YSA9IHRoaXMuX2J1ZmZlcjtcblx0XHRcdHRoaXMuX2J1ZmZlciA9IFwiXCI7XG5cdFx0XHR2YXIgZWxlbWVudCA9IHtcblx0XHRcdFx0ICByYXc6IHJhd0RhdGFcblx0XHRcdFx0LCBkYXRhOiAodGhpcy5fcGFyc2VTdGF0ZSA9PSBFbGVtZW50VHlwZS5UZXh0KSA/IHJhd0RhdGEgOiByYXdEYXRhLnJlcGxhY2UoUGFyc2VyLl9yZVRyaW0sIFwiXCIpXG5cdFx0XHRcdCwgdHlwZTogdGhpcy5fcGFyc2VTdGF0ZVxuXHRcdFx0XHR9O1xuXHRcdFx0aWYgKHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuVGFnIHx8IHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuU2NyaXB0IHx8IHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuU3R5bGUpXG5cdFx0XHRcdGVsZW1lbnQubmFtZSA9IHRoaXMucGFyc2VUYWdOYW1lKGVsZW1lbnQuZGF0YSk7XG5cdFx0XHR0aGlzLnBhcnNlQXR0cmlicyhlbGVtZW50KTtcblx0XHRcdHRoaXMuX2VsZW1lbnRzLnB1c2goZWxlbWVudCk7XG5cdFx0fVxuXHRcblx0XHR0aGlzLndyaXRlSGFuZGxlcigpO1xuXHRcdHRoaXMuX2hhbmRsZXIuZG9uZSgpO1xuXHR9XG5cblx0Ly9SZXNldHMgdGhlIHBhcnNlciB0byBhIGJsYW5rIHN0YXRlLCByZWFkeSB0byBwYXJzZSBhIG5ldyBIVE1MIGRvY3VtZW50XG5cdFBhcnNlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiBQYXJzZXIkcmVzZXQgKCkge1xuXHRcdHRoaXMuX2J1ZmZlciA9IFwiXCI7XG5cdFx0dGhpcy5fZG9uZSA9IGZhbHNlO1xuXHRcdHRoaXMuX2VsZW1lbnRzID0gW107XG5cdFx0dGhpcy5fZWxlbWVudHNDdXJyZW50ID0gMDtcblx0XHR0aGlzLl9jdXJyZW50ID0gMDtcblx0XHR0aGlzLl9uZXh0ID0gMDtcblx0XHR0aGlzLl9sb2NhdGlvbiA9IHtcblx0XHRcdCAgcm93OiAwXG5cdFx0XHQsIGNvbDogMFxuXHRcdFx0LCBjaGFyT2Zmc2V0OiAwXG5cdFx0XHQsIGluQnVmZmVyOiAwXG5cdFx0fTtcblx0XHR0aGlzLl9wYXJzZVN0YXRlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHR0aGlzLl9wcmV2VGFnU2VwID0gJyc7XG5cdFx0dGhpcy5fdGFnU3RhY2sgPSBbXTtcblx0XHR0aGlzLl9oYW5kbGVyLnJlc2V0KCk7XG5cdH1cblx0XG5cdC8vKipQcml2YXRlKiovL1xuXHQvL1Byb3BlcnRpZXMvL1xuXHRQYXJzZXIucHJvdG90eXBlLl9vcHRpb25zID0gbnVsbDsgLy9QYXJzZXIgb3B0aW9ucyBmb3IgaG93IHRvIGJlaGF2ZVxuXHRQYXJzZXIucHJvdG90eXBlLl9oYW5kbGVyID0gbnVsbDsgLy9IYW5kbGVyIGZvciBwYXJzZWQgZWxlbWVudHNcblx0UGFyc2VyLnByb3RvdHlwZS5fYnVmZmVyID0gbnVsbDsgLy9CdWZmZXIgb2YgdW5wYXJzZWQgZGF0YVxuXHRQYXJzZXIucHJvdG90eXBlLl9kb25lID0gZmFsc2U7IC8vRmxhZyBpbmRpY2F0aW5nIHdoZXRoZXIgcGFyc2luZyBpcyBkb25lXG5cdFBhcnNlci5wcm90b3R5cGUuX2VsZW1lbnRzID0gIG51bGw7IC8vQXJyYXkgb2YgcGFyc2VkIGVsZW1lbnRzXG5cdFBhcnNlci5wcm90b3R5cGUuX2VsZW1lbnRzQ3VycmVudCA9IDA7IC8vUG9pbnRlciB0byBsYXN0IGVsZW1lbnQgaW4gX2VsZW1lbnRzIHRoYXQgaGFzIGJlZW4gcHJvY2Vzc2VkXG5cdFBhcnNlci5wcm90b3R5cGUuX2N1cnJlbnQgPSAwOyAvL1Bvc2l0aW9uIGluIGRhdGEgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHBhcnNlZFxuXHRQYXJzZXIucHJvdG90eXBlLl9uZXh0ID0gMDsgLy9Qb3NpdGlvbiBpbiBkYXRhIG9mIHRoZSBuZXh0IHRhZyBtYXJrZXIgKDw+KVxuXHRQYXJzZXIucHJvdG90eXBlLl9sb2NhdGlvbiA9IG51bGw7IC8vUG9zaXRpb24gdHJhY2tpbmcgZm9yIGVsZW1lbnRzIGluIGEgc3RyZWFtXG5cdFBhcnNlci5wcm90b3R5cGUuX3BhcnNlU3RhdGUgPSBFbGVtZW50VHlwZS5UZXh0OyAvL0N1cnJlbnQgdHlwZSBvZiBlbGVtZW50IGJlaW5nIHBhcnNlZFxuXHRQYXJzZXIucHJvdG90eXBlLl9wcmV2VGFnU2VwID0gJyc7IC8vUHJldmlvdXMgdGFnIG1hcmtlciBmb3VuZFxuXHQvL1N0YWNrIG9mIGVsZW1lbnQgdHlwZXMgcHJldmlvdXNseSBlbmNvdW50ZXJlZDsga2VlcHMgdHJhY2sgb2Ygd2hlblxuXHQvL3BhcnNpbmcgb2NjdXJzIGluc2lkZSBhIHNjcmlwdC9jb21tZW50L3N0eWxlIHRhZ1xuXHRQYXJzZXIucHJvdG90eXBlLl90YWdTdGFjayA9IG51bGw7XG5cblx0Ly9NZXRob2RzLy9cblx0Ly9UYWtlcyBhbiBhcnJheSBvZiBlbGVtZW50cyBhbmQgcGFyc2VzIGFueSBmb3VuZCBhdHRyaWJ1dGVzXG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VUYWdBdHRyaWJzID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlVGFnQXR0cmlicyAoZWxlbWVudHMpIHtcblx0XHR2YXIgaWR4RW5kID0gZWxlbWVudHMubGVuZ3RoO1xuXHRcdHZhciBpZHggPSAwO1xuXHRcblx0XHR3aGlsZSAoaWR4IDwgaWR4RW5kKSB7XG5cdFx0XHR2YXIgZWxlbWVudCA9IGVsZW1lbnRzW2lkeCsrXTtcblx0XHRcdGlmIChlbGVtZW50LnR5cGUgPT0gRWxlbWVudFR5cGUuVGFnIHx8IGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5TY3JpcHQgfHwgZWxlbWVudC50eXBlID09IEVsZW1lbnRUeXBlLnN0eWxlKVxuXHRcdFx0XHR0aGlzLnBhcnNlQXR0cmlicyhlbGVtZW50KTtcblx0XHR9XG5cdFxuXHRcdHJldHVybihlbGVtZW50cyk7XG5cdH1cblxuXHQvL1Rha2VzIGFuIGVsZW1lbnQgYW5kIGFkZHMgYW4gXCJhdHRyaWJzXCIgcHJvcGVydHkgZm9yIGFueSBlbGVtZW50IGF0dHJpYnV0ZXMgZm91bmQgXG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VBdHRyaWJzID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlQXR0cmlicyAoZWxlbWVudCkge1xuXHRcdC8vT25seSBwYXJzZSBhdHRyaWJ1dGVzIGZvciB0YWdzXG5cdFx0aWYgKGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5TY3JpcHQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlN0eWxlICYmIGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UYWcpXG5cdFx0XHRyZXR1cm47XG5cdFxuXHRcdHZhciB0YWdOYW1lID0gZWxlbWVudC5kYXRhLnNwbGl0KFBhcnNlci5fcmVXaGl0ZXNwYWNlLCAxKVswXTtcblx0XHR2YXIgYXR0cmliUmF3ID0gZWxlbWVudC5kYXRhLnN1YnN0cmluZyh0YWdOYW1lLmxlbmd0aCk7XG5cdFx0aWYgKGF0dHJpYlJhdy5sZW5ndGggPCAxKVxuXHRcdFx0cmV0dXJuO1xuXHRcblx0XHR2YXIgbWF0Y2g7XG5cdFx0UGFyc2VyLl9yZUF0dHJpYi5sYXN0SW5kZXggPSAwO1xuXHRcdHdoaWxlIChtYXRjaCA9IFBhcnNlci5fcmVBdHRyaWIuZXhlYyhhdHRyaWJSYXcpKSB7XG5cdFx0XHRpZiAoZWxlbWVudC5hdHRyaWJzID09IHVuZGVmaW5lZClcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzID0ge307XG5cdFxuXHRcdFx0aWYgKHR5cGVvZiBtYXRjaFsxXSA9PSBcInN0cmluZ1wiICYmIG1hdGNoWzFdLmxlbmd0aCkge1xuXHRcdFx0XHRlbGVtZW50LmF0dHJpYnNbbWF0Y2hbMV1dID0gbWF0Y2hbMl07XG5cdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiBtYXRjaFszXSA9PSBcInN0cmluZ1wiICYmIG1hdGNoWzNdLmxlbmd0aCkge1xuXHRcdFx0XHRlbGVtZW50LmF0dHJpYnNbbWF0Y2hbM10udG9TdHJpbmcoKV0gPSBtYXRjaFs0XS50b1N0cmluZygpO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgbWF0Y2hbNV0gPT0gXCJzdHJpbmdcIiAmJiBtYXRjaFs1XS5sZW5ndGgpIHtcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzW21hdGNoWzVdXSA9IG1hdGNoWzZdO1xuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YgbWF0Y2hbN10gPT0gXCJzdHJpbmdcIiAmJiBtYXRjaFs3XS5sZW5ndGgpIHtcblx0XHRcdFx0ZWxlbWVudC5hdHRyaWJzW21hdGNoWzddXSA9IG1hdGNoWzddO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vRXh0cmFjdHMgdGhlIGJhc2UgdGFnIG5hbWUgZnJvbSB0aGUgZGF0YSB2YWx1ZSBvZiBhbiBlbGVtZW50XG5cdFBhcnNlci5wcm90b3R5cGUucGFyc2VUYWdOYW1lID0gZnVuY3Rpb24gUGFyc2VyJHBhcnNlVGFnTmFtZSAoZGF0YSkge1xuXHRcdGlmIChkYXRhID09IG51bGwgfHwgZGF0YSA9PSBcIlwiKVxuXHRcdFx0cmV0dXJuKFwiXCIpO1xuXHRcdHZhciBtYXRjaCA9IFBhcnNlci5fcmVUYWdOYW1lLmV4ZWMoZGF0YSk7XG5cdFx0aWYgKCFtYXRjaClcblx0XHRcdHJldHVybihcIlwiKTtcblx0XHRyZXR1cm4oKG1hdGNoWzFdID8gXCIvXCIgOiBcIlwiKSArIG1hdGNoWzJdKTtcblx0fVxuXG5cdC8vUGFyc2VzIHRocm91Z2ggSFRNTCB0ZXh0IGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIGZvdW5kIGVsZW1lbnRzXG5cdC8vSSBhZG1pdCwgdGhpcyBmdW5jdGlvbiBpcyByYXRoZXIgbGFyZ2UgYnV0IHNwbGl0dGluZyB1cCBoYWQgYW4gbm90aWNlYWJsZSBpbXBhY3Qgb24gc3BlZWRcblx0UGFyc2VyLnByb3RvdHlwZS5wYXJzZVRhZ3MgPSBmdW5jdGlvbiBQYXJzZXIkcGFyc2VUYWdzICgpIHtcblx0XHR2YXIgYnVmZmVyRW5kID0gdGhpcy5fYnVmZmVyLmxlbmd0aCAtIDE7XG5cdFx0d2hpbGUgKFBhcnNlci5fcmVUYWdzLnRlc3QodGhpcy5fYnVmZmVyKSkge1xuXHRcdFx0dGhpcy5fbmV4dCA9IFBhcnNlci5fcmVUYWdzLmxhc3RJbmRleCAtIDE7XG5cdFx0XHR2YXIgdGFnU2VwID0gdGhpcy5fYnVmZmVyLmNoYXJBdCh0aGlzLl9uZXh0KTsgLy9UaGUgY3VycmVudGx5IGZvdW5kIHRhZyBtYXJrZXJcblx0XHRcdHZhciByYXdEYXRhID0gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9jdXJyZW50LCB0aGlzLl9uZXh0KTsgLy9UaGUgbmV4dCBjaHVuayBvZiBkYXRhIHRvIHBhcnNlXG5cdFxuXHRcdFx0Ly9BIG5ldyBlbGVtZW50IHRvIGV2ZW50dWFsbHkgYmUgYXBwZW5kZWQgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0dmFyIGVsZW1lbnQgPSB7XG5cdFx0XHRcdCAgcmF3OiByYXdEYXRhXG5cdFx0XHRcdCwgZGF0YTogKHRoaXMuX3BhcnNlU3RhdGUgPT0gRWxlbWVudFR5cGUuVGV4dCkgPyByYXdEYXRhIDogcmF3RGF0YS5yZXBsYWNlKFBhcnNlci5fcmVUcmltLCBcIlwiKVxuXHRcdFx0XHQsIHR5cGU6IHRoaXMuX3BhcnNlU3RhdGVcblx0XHRcdH07XG5cdFxuXHRcdFx0dmFyIGVsZW1lbnROYW1lID0gdGhpcy5wYXJzZVRhZ05hbWUoZWxlbWVudC5kYXRhKTtcblx0XG5cdFx0XHQvL1RoaXMgc2VjdGlvbiBpbnNwZWN0cyB0aGUgY3VycmVudCB0YWcgc3RhY2sgYW5kIG1vZGlmaWVzIHRoZSBjdXJyZW50XG5cdFx0XHQvL2VsZW1lbnQgaWYgd2UncmUgYWN0dWFsbHkgcGFyc2luZyBhIHNwZWNpYWwgYXJlYSAoc2NyaXB0L2NvbW1lbnQvc3R5bGUgdGFnKVxuXHRcdFx0aWYgKHRoaXMuX3RhZ1N0YWNrLmxlbmd0aCkgeyAvL1dlJ3JlIHBhcnNpbmcgaW5zaWRlIGEgc2NyaXB0L2NvbW1lbnQvc3R5bGUgdGFnXG5cdFx0XHRcdGlmICh0aGlzLl90YWdTdGFja1t0aGlzLl90YWdTdGFjay5sZW5ndGggLSAxXSA9PSBFbGVtZW50VHlwZS5TY3JpcHQpIHsgLy9XZSdyZSBjdXJyZW50bHkgaW4gYSBzY3JpcHQgdGFnXG5cdFx0XHRcdFx0aWYgKGVsZW1lbnROYW1lLnRvTG93ZXJDYXNlKCkgPT0gXCIvc2NyaXB0XCIpIC8vQWN0dWFsbHksIHdlJ3JlIG5vIGxvbmdlciBpbiBhIHNjcmlwdCB0YWcsIHNvIHBvcCBpdCBvZmYgdGhlIHN0YWNrXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wb3AoKTtcblx0XHRcdFx0XHRlbHNlIHsgLy9Ob3QgYSBjbG9zaW5nIHNjcmlwdCB0YWdcblx0XHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdy5pbmRleE9mKFwiIS0tXCIpICE9IDApIHsgLy9NYWtlIHN1cmUgd2UncmUgbm90IGluIGEgY29tbWVudFxuXHRcdFx0XHRcdFx0XHQvL0FsbCBkYXRhIGZyb20gaGVyZSB0byBzY3JpcHQgY2xvc2UgaXMgbm93IGEgdGV4dCBlbGVtZW50XG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLlRleHQ7XG5cdFx0XHRcdFx0XHRcdC8vSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaXMgdGV4dCwgYXBwZW5kIHRoZSBjdXJyZW50IHRleHQgdG8gaXRcblx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IEVsZW1lbnRUeXBlLlRleHQpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgcHJldkVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXTtcblx0XHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gcHJldkVsZW1lbnQucmF3ICsgdGhpcy5fcHJldlRhZ1NlcCArIGVsZW1lbnQucmF3O1xuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQucmF3ID0gZWxlbWVudC5kYXRhID0gXCJcIjsgLy9UaGlzIGNhdXNlcyB0aGUgY3VycmVudCBlbGVtZW50IHRvIG5vdCBiZSBhZGRlZCB0byB0aGUgZWxlbWVudCBsaXN0XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAodGhpcy5fdGFnU3RhY2tbdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMV0gPT0gRWxlbWVudFR5cGUuU3R5bGUpIHsgLy9XZSdyZSBjdXJyZW50bHkgaW4gYSBzdHlsZSB0YWdcblx0XHRcdFx0XHRpZiAoZWxlbWVudE5hbWUudG9Mb3dlckNhc2UoKSA9PSBcIi9zdHlsZVwiKSAvL0FjdHVhbGx5LCB3ZSdyZSBubyBsb25nZXIgaW4gYSBzdHlsZSB0YWcsIHNvIHBvcCBpdCBvZmYgdGhlIHN0YWNrXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wb3AoKTtcblx0XHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdy5pbmRleE9mKFwiIS0tXCIpICE9IDApIHsgLy9NYWtlIHN1cmUgd2UncmUgbm90IGluIGEgY29tbWVudFxuXHRcdFx0XHRcdFx0XHQvL0FsbCBkYXRhIGZyb20gaGVyZSB0byBzdHlsZSBjbG9zZSBpcyBub3cgYSB0ZXh0IGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdFx0XHRcdFx0Ly9JZiB0aGUgcHJldmlvdXMgZWxlbWVudCBpcyB0ZXh0LCBhcHBlbmQgdGhlIGN1cnJlbnQgdGV4dCB0byBpdFxuXHRcdFx0XHRcdFx0XHRpZiAodGhpcy5fZWxlbWVudHMubGVuZ3RoICYmIHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdLnR5cGUgPT0gRWxlbWVudFR5cGUuVGV4dCkge1xuXHRcdFx0XHRcdFx0XHRcdHZhciBwcmV2RWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChlbGVtZW50LnJhdyAhPSBcIlwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRwcmV2RWxlbWVudC5yYXcgPSBwcmV2RWxlbWVudC5kYXRhID0gcHJldkVsZW1lbnQucmF3ICsgdGhpcy5fcHJldlRhZ1NlcCArIGVsZW1lbnQucmF3O1xuXHRcdFx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBcIlwiOyAvL1RoaXMgY2F1c2VzIHRoZSBjdXJyZW50IGVsZW1lbnQgdG8gbm90IGJlIGFkZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgeyAvL0VsZW1lbnQgaXMgZW1wdHksIHNvIGp1c3QgYXBwZW5kIHRoZSBsYXN0IHRhZyBtYXJrZXIgZm91bmRcblx0XHRcdFx0XHRcdFx0XHRcdHByZXZFbGVtZW50LnJhdyA9IHByZXZFbGVtZW50LmRhdGEgPSBwcmV2RWxlbWVudC5yYXcgKyB0aGlzLl9wcmV2VGFnU2VwO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHsgLy9UaGUgcHJldmlvdXMgZWxlbWVudCB3YXMgbm90IHRleHRcblx0XHRcdFx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcgIT0gXCJcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBlbGVtZW50LnJhdztcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAodGhpcy5fdGFnU3RhY2tbdGhpcy5fdGFnU3RhY2subGVuZ3RoIC0gMV0gPT0gRWxlbWVudFR5cGUuQ29tbWVudCkgeyAvL1dlJ3JlIGN1cnJlbnRseSBpbiBhIGNvbW1lbnQgdGFnXG5cdFx0XHRcdFx0dmFyIHJhd0xlbiA9IGVsZW1lbnQucmF3Lmxlbmd0aDtcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuY2hhckF0KHJhd0xlbiAtIDIpID09IFwiLVwiICYmIGVsZW1lbnQucmF3LmNoYXJBdChyYXdMZW4gLSAxKSA9PSBcIi1cIiAmJiB0YWdTZXAgPT0gXCI+XCIpIHtcblx0XHRcdFx0XHRcdC8vQWN0dWFsbHksIHdlJ3JlIG5vIGxvbmdlciBpbiBhIHN0eWxlIHRhZywgc28gcG9wIGl0IG9mZiB0aGUgc3RhY2tcblx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnBvcCgpO1xuXHRcdFx0XHRcdFx0Ly9JZiB0aGUgcHJldmlvdXMgZWxlbWVudCBpcyBhIGNvbW1lbnQsIGFwcGVuZCB0aGUgY3VycmVudCB0ZXh0IHRvIGl0XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5fZWxlbWVudHMubGVuZ3RoICYmIHRoaXMuX2VsZW1lbnRzW3RoaXMuX2VsZW1lbnRzLmxlbmd0aCAtIDFdLnR5cGUgPT0gRWxlbWVudFR5cGUuQ29tbWVudCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgcHJldkVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXTtcblx0XHRcdFx0XHRcdFx0cHJldkVsZW1lbnQucmF3ID0gcHJldkVsZW1lbnQuZGF0YSA9IChwcmV2RWxlbWVudC5yYXcgKyBlbGVtZW50LnJhdykucmVwbGFjZShQYXJzZXIuX3JlVHJpbUNvbW1lbnQsIFwiXCIpO1xuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IFwiXCI7IC8vVGhpcyBjYXVzZXMgdGhlIGN1cnJlbnQgZWxlbWVudCB0byBub3QgYmUgYWRkZWQgdG8gdGhlIGVsZW1lbnQgbGlzdFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSAvL1ByZXZpb3VzIGVsZW1lbnQgbm90IGEgY29tbWVudFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5Db21tZW50OyAvL0NoYW5nZSB0aGUgY3VycmVudCBlbGVtZW50J3MgdHlwZSB0byBhIGNvbW1lbnRcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSB7IC8vU3RpbGwgaW4gYSBjb21tZW50IHRhZ1xuXHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuQ29tbWVudDtcblx0XHRcdFx0XHRcdC8vSWYgdGhlIHByZXZpb3VzIGVsZW1lbnQgaXMgYSBjb21tZW50LCBhcHBlbmQgdGhlIGN1cnJlbnQgdGV4dCB0byBpdFxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuX2VsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLl9lbGVtZW50c1t0aGlzLl9lbGVtZW50cy5sZW5ndGggLSAxXS50eXBlID09IEVsZW1lbnRUeXBlLkNvbW1lbnQpIHtcblx0XHRcdFx0XHRcdFx0dmFyIHByZXZFbGVtZW50ID0gdGhpcy5fZWxlbWVudHNbdGhpcy5fZWxlbWVudHMubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0XHRcdHByZXZFbGVtZW50LnJhdyA9IHByZXZFbGVtZW50LmRhdGEgPSBwcmV2RWxlbWVudC5yYXcgKyBlbGVtZW50LnJhdyArIHRhZ1NlcDtcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBcIlwiOyAvL1RoaXMgY2F1c2VzIHRoZSBjdXJyZW50IGVsZW1lbnQgdG8gbm90IGJlIGFkZGVkIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuVGV4dDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgPSBlbGVtZW50LmRhdGEgPSBlbGVtZW50LnJhdyArIHRhZ1NlcDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XG5cdFx0XHQvL1Byb2Nlc3Npbmcgb2Ygbm9uLXNwZWNpYWwgdGFnc1xuXHRcdFx0aWYgKGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5UYWcpIHtcblx0XHRcdFx0ZWxlbWVudC5uYW1lID0gZWxlbWVudE5hbWU7XG5cdFx0XHRcdHZhciBlbGVtZW50TmFtZUNJID0gZWxlbWVudE5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChlbGVtZW50LnJhdy5pbmRleE9mKFwiIS0tXCIpID09IDApIHsgLy9UaGlzIHRhZyBpcyByZWFsbHkgY29tbWVudFxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSA9IEVsZW1lbnRUeXBlLkNvbW1lbnQ7XG5cdFx0XHRcdFx0ZGVsZXRlIGVsZW1lbnRbXCJuYW1lXCJdO1xuXHRcdFx0XHRcdHZhciByYXdMZW4gPSBlbGVtZW50LnJhdy5sZW5ndGg7XG5cdFx0XHRcdFx0Ly9DaGVjayBpZiB0aGUgY29tbWVudCBpcyB0ZXJtaW5hdGVkIGluIHRoZSBjdXJyZW50IGVsZW1lbnRcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5yYXcuY2hhckF0KHJhd0xlbiAtIDEpID09IFwiLVwiICYmIGVsZW1lbnQucmF3LmNoYXJBdChyYXdMZW4gLSAyKSA9PSBcIi1cIiAmJiB0YWdTZXAgPT0gXCI+XCIpXG5cdFx0XHRcdFx0XHRlbGVtZW50LnJhdyA9IGVsZW1lbnQuZGF0YSA9IGVsZW1lbnQucmF3LnJlcGxhY2UoUGFyc2VyLl9yZVRyaW1Db21tZW50LCBcIlwiKTtcblx0XHRcdFx0XHRlbHNlIHsgLy9JdCdzIG5vdCBzbyBwdXNoIHRoZSBjb21tZW50IG9udG8gdGhlIHRhZyBzdGFja1xuXHRcdFx0XHRcdFx0ZWxlbWVudC5yYXcgKz0gdGFnU2VwO1xuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChFbGVtZW50VHlwZS5Db21tZW50KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudC5yYXcuaW5kZXhPZihcIiFcIikgPT0gMCB8fCBlbGVtZW50LnJhdy5pbmRleE9mKFwiP1wiKSA9PSAwKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuRGlyZWN0aXZlO1xuXHRcdFx0XHRcdC8vVE9ETzogd2hhdCBhYm91dCBDREFUQT9cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChlbGVtZW50TmFtZUNJID09IFwic2NyaXB0XCIpIHtcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5TY3JpcHQ7XG5cdFx0XHRcdFx0Ly9TcGVjaWFsIHRhZywgcHVzaCBvbnRvIHRoZSB0YWcgc3RhY2sgaWYgbm90IHRlcm1pbmF0ZWRcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5kYXRhLmNoYXJBdChlbGVtZW50LmRhdGEubGVuZ3RoIC0gMSkgIT0gXCIvXCIpXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKEVsZW1lbnRUeXBlLlNjcmlwdCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZWxlbWVudE5hbWVDSSA9PSBcIi9zY3JpcHRcIilcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgPSBFbGVtZW50VHlwZS5TY3JpcHQ7XG5cdFx0XHRcdGVsc2UgaWYgKGVsZW1lbnROYW1lQ0kgPT0gXCJzdHlsZVwiKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuU3R5bGU7XG5cdFx0XHRcdFx0Ly9TcGVjaWFsIHRhZywgcHVzaCBvbnRvIHRoZSB0YWcgc3RhY2sgaWYgbm90IHRlcm1pbmF0ZWRcblx0XHRcdFx0XHRpZiAoZWxlbWVudC5kYXRhLmNoYXJBdChlbGVtZW50LmRhdGEubGVuZ3RoIC0gMSkgIT0gXCIvXCIpXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKEVsZW1lbnRUeXBlLlN0eWxlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChlbGVtZW50TmFtZUNJID09IFwiL3N0eWxlXCIpXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlID0gRWxlbWVudFR5cGUuU3R5bGU7XG5cdFx0XHRcdGlmIChlbGVtZW50Lm5hbWUgJiYgZWxlbWVudC5uYW1lLmNoYXJBdCgwKSA9PSBcIi9cIilcblx0XHRcdFx0XHRlbGVtZW50LmRhdGEgPSBlbGVtZW50Lm5hbWU7XG5cdFx0XHR9XG5cdFxuXHRcdFx0Ly9BZGQgYWxsIHRhZ3MgYW5kIG5vbi1lbXB0eSB0ZXh0IGVsZW1lbnRzIHRvIHRoZSBlbGVtZW50IGxpc3Rcblx0XHRcdGlmIChlbGVtZW50LnJhdyAhPSBcIlwiIHx8IGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UZXh0KSB7XG5cdFx0XHRcdGlmICh0aGlzLl9vcHRpb25zLmluY2x1ZGVMb2NhdGlvbiAmJiAhZWxlbWVudC5sb2NhdGlvbikge1xuXHRcdFx0XHRcdGVsZW1lbnQubG9jYXRpb24gPSB0aGlzLmdldExvY2F0aW9uKGVsZW1lbnQudHlwZSA9PSBFbGVtZW50VHlwZS5UYWcpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMucGFyc2VBdHRyaWJzKGVsZW1lbnQpO1xuXHRcdFx0XHR0aGlzLl9lbGVtZW50cy5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0XHQvL0lmIHRhZyBzZWxmLXRlcm1pbmF0ZXMsIGFkZCBhbiBleHBsaWNpdCwgc2VwYXJhdGUgY2xvc2luZyB0YWdcblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdGVsZW1lbnQudHlwZSAhPSBFbGVtZW50VHlwZS5UZXh0XG5cdFx0XHRcdFx0JiZcblx0XHRcdFx0XHRlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuQ29tbWVudFxuXHRcdFx0XHRcdCYmXG5cdFx0XHRcdFx0ZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkRpcmVjdGl2ZVxuXHRcdFx0XHRcdCYmXG5cdFx0XHRcdFx0ZWxlbWVudC5kYXRhLmNoYXJBdChlbGVtZW50LmRhdGEubGVuZ3RoIC0gMSkgPT0gXCIvXCJcblx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0dGhpcy5fZWxlbWVudHMucHVzaCh7XG5cdFx0XHRcdFx0XHQgIHJhdzogXCIvXCIgKyBlbGVtZW50Lm5hbWVcblx0XHRcdFx0XHRcdCwgZGF0YTogXCIvXCIgKyBlbGVtZW50Lm5hbWVcblx0XHRcdFx0XHRcdCwgbmFtZTogXCIvXCIgKyBlbGVtZW50Lm5hbWVcblx0XHRcdFx0XHRcdCwgdHlwZTogZWxlbWVudC50eXBlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9wYXJzZVN0YXRlID0gKHRhZ1NlcCA9PSBcIjxcIikgPyBFbGVtZW50VHlwZS5UYWcgOiBFbGVtZW50VHlwZS5UZXh0O1xuXHRcdFx0dGhpcy5fY3VycmVudCA9IHRoaXMuX25leHQgKyAxO1xuXHRcdFx0dGhpcy5fcHJldlRhZ1NlcCA9IHRhZ1NlcDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5fb3B0aW9ucy5pbmNsdWRlTG9jYXRpb24pIHtcblx0XHRcdHRoaXMuZ2V0TG9jYXRpb24oKTtcblx0XHRcdHRoaXMuX2xvY2F0aW9uLnJvdyArPSB0aGlzLl9sb2NhdGlvbi5pbkJ1ZmZlcjtcblx0XHRcdHRoaXMuX2xvY2F0aW9uLmluQnVmZmVyID0gMDtcblx0XHRcdHRoaXMuX2xvY2F0aW9uLmNoYXJPZmZzZXQgPSAwO1xuXHRcdH1cblx0XHR0aGlzLl9idWZmZXIgPSAodGhpcy5fY3VycmVudCA8PSBidWZmZXJFbmQpID8gdGhpcy5fYnVmZmVyLnN1YnN0cmluZyh0aGlzLl9jdXJyZW50KSA6IFwiXCI7XG5cdFx0dGhpcy5fY3VycmVudCA9IDA7XG5cdFxuXHRcdHRoaXMud3JpdGVIYW5kbGVyKCk7XG5cdH1cblxuXHRQYXJzZXIucHJvdG90eXBlLmdldExvY2F0aW9uID0gZnVuY3Rpb24gUGFyc2VyJGdldExvY2F0aW9uIChzdGFydFRhZykge1xuXHRcdHZhciBjLFxuXHRcdFx0bCA9IHRoaXMuX2xvY2F0aW9uLFxuXHRcdFx0ZW5kID0gdGhpcy5fY3VycmVudCAtIChzdGFydFRhZyA/IDEgOiAwKSxcblx0XHRcdGNodW5rID0gc3RhcnRUYWcgJiYgbC5jaGFyT2Zmc2V0ID09IDAgJiYgdGhpcy5fY3VycmVudCA9PSAwO1xuXHRcdFxuXHRcdGZvciAoOyBsLmNoYXJPZmZzZXQgPCBlbmQ7IGwuY2hhck9mZnNldCsrKSB7XG5cdFx0XHRjID0gdGhpcy5fYnVmZmVyLmNoYXJBdChsLmNoYXJPZmZzZXQpO1xuXHRcdFx0aWYgKGMgPT0gJ1xcbicpIHtcblx0XHRcdFx0bC5pbkJ1ZmZlcisrO1xuXHRcdFx0XHRsLmNvbCA9IDA7XG5cdFx0XHR9IGVsc2UgaWYgKGMgIT0gJ1xccicpIHtcblx0XHRcdFx0bC5jb2wrKztcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHtcblx0XHRcdCAgbGluZTogbC5yb3cgKyBsLmluQnVmZmVyICsgMVxuXHRcdFx0LCBjb2w6IGwuY29sICsgKGNodW5rID8gMDogMSlcblx0XHR9O1xuXHR9XG5cblx0Ly9DaGVja3MgdGhlIGhhbmRsZXIgdG8gbWFrZSBpdCBpcyBhbiBvYmplY3Qgd2l0aCB0aGUgcmlnaHQgXCJpbnRlcmZhY2VcIlxuXHRQYXJzZXIucHJvdG90eXBlLnZhbGlkYXRlSGFuZGxlciA9IGZ1bmN0aW9uIFBhcnNlciR2YWxpZGF0ZUhhbmRsZXIgKGhhbmRsZXIpIHtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyKSAhPSBcIm9iamVjdFwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBpcyBub3QgYW4gb2JqZWN0XCIpO1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIucmVzZXQpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICdyZXNldCcgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLmRvbmUpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICdkb25lJyBpcyBpbnZhbGlkXCIpO1xuXHRcdGlmICgodHlwZW9mIGhhbmRsZXIud3JpdGVUYWcpICE9IFwiZnVuY3Rpb25cIilcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIkhhbmRsZXIgbWV0aG9kICd3cml0ZVRhZycgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlVGV4dCkgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ3dyaXRlVGV4dCcgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlQ29tbWVudCkgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiSGFuZGxlciBtZXRob2QgJ3dyaXRlQ29tbWVudCcgaXMgaW52YWxpZFwiKTtcblx0XHRpZiAoKHR5cGVvZiBoYW5kbGVyLndyaXRlRGlyZWN0aXZlKSAhPSBcImZ1bmN0aW9uXCIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJIYW5kbGVyIG1ldGhvZCAnd3JpdGVEaXJlY3RpdmUnIGlzIGludmFsaWRcIik7XG5cdH1cblxuXHQvL1dyaXRlcyBwYXJzZWQgZWxlbWVudHMgb3V0IHRvIHRoZSBoYW5kbGVyXG5cdFBhcnNlci5wcm90b3R5cGUud3JpdGVIYW5kbGVyID0gZnVuY3Rpb24gUGFyc2VyJHdyaXRlSGFuZGxlciAoZm9yY2VGbHVzaCkge1xuXHRcdGZvcmNlRmx1c2ggPSAhIWZvcmNlRmx1c2g7XG5cdFx0aWYgKHRoaXMuX3RhZ1N0YWNrLmxlbmd0aCAmJiAhZm9yY2VGbHVzaClcblx0XHRcdHJldHVybjtcblx0XHR3aGlsZSAodGhpcy5fZWxlbWVudHMubGVuZ3RoKSB7XG5cdFx0XHR2YXIgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzLnNoaWZ0KCk7XG5cdFx0XHRzd2l0Y2ggKGVsZW1lbnQudHlwZSkge1xuXHRcdFx0XHRjYXNlIEVsZW1lbnRUeXBlLkNvbW1lbnQ6XG5cdFx0XHRcdFx0dGhpcy5faGFuZGxlci53cml0ZUNvbW1lbnQoZWxlbWVudCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgRWxlbWVudFR5cGUuRGlyZWN0aXZlOlxuXHRcdFx0XHRcdHRoaXMuX2hhbmRsZXIud3JpdGVEaXJlY3RpdmUoZWxlbWVudCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgRWxlbWVudFR5cGUuVGV4dDpcblx0XHRcdFx0XHR0aGlzLl9oYW5kbGVyLndyaXRlVGV4dChlbGVtZW50KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHR0aGlzLl9oYW5kbGVyLndyaXRlVGFnKGVsZW1lbnQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdFBhcnNlci5wcm90b3R5cGUuaGFuZGxlRXJyb3IgPSBmdW5jdGlvbiBQYXJzZXIkaGFuZGxlRXJyb3IgKGVycm9yKSB7XG5cdFx0aWYgKCh0eXBlb2YgdGhpcy5faGFuZGxlci5lcnJvcikgPT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0dGhpcy5faGFuZGxlci5lcnJvcihlcnJvcik7XG5cdFx0ZWxzZVxuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdH1cblxuLy9UT0RPOiBtYWtlIHRoaXMgYSB0cnVsbHkgc3RyZWFtYWJsZSBoYW5kbGVyXG5mdW5jdGlvbiBSc3NIYW5kbGVyIChjYWxsYmFjaykge1xuXHRSc3NIYW5kbGVyLnN1cGVyXy5jYWxsKHRoaXMsIGNhbGxiYWNrLCB7IGlnbm9yZVdoaXRlc3BhY2U6IHRydWUsIHZlcmJvc2U6IGZhbHNlLCBlbmZvcmNlRW1wdHlUYWdzOiBmYWxzZSB9KTtcbn1cbmluaGVyaXRzKFJzc0hhbmRsZXIsIERlZmF1bHRIYW5kbGVyKTtcblxuXHRSc3NIYW5kbGVyLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gUnNzSGFuZGxlciRkb25lICgpIHtcblx0XHR2YXIgZmVlZCA9IHsgfTtcblx0XHR2YXIgZmVlZFJvb3Q7XG5cblx0XHR2YXIgZm91bmQgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShmdW5jdGlvbiAodmFsdWUpIHsgcmV0dXJuKHZhbHVlID09IFwicnNzXCIgfHwgdmFsdWUgPT0gXCJmZWVkXCIpOyB9LCB0aGlzLmRvbSwgZmFsc2UpO1xuXHRcdGlmIChmb3VuZC5sZW5ndGgpIHtcblx0XHRcdGZlZWRSb290ID0gZm91bmRbMF07XG5cdFx0fVxuXHRcdGlmIChmZWVkUm9vdCkge1xuXHRcdFx0aWYgKGZlZWRSb290Lm5hbWUgPT0gXCJyc3NcIikge1xuXHRcdFx0XHRmZWVkLnR5cGUgPSBcInJzc1wiO1xuXHRcdFx0XHRmZWVkUm9vdCA9IGZlZWRSb290LmNoaWxkcmVuWzBdOyAvLzxjaGFubmVsLz5cblx0XHRcdFx0ZmVlZC5pZCA9IFwiXCI7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQuZGVzY3JpcHRpb24gPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImRlc2NyaXB0aW9uXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGZlZWQudXBkYXRlZCA9IG5ldyBEYXRlKERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGFzdEJ1aWxkRGF0ZVwiLCBmZWVkUm9vdC5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGEpO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5hdXRob3IgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcIm1hbmFnaW5nRWRpdG9yXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRmZWVkLml0ZW1zID0gW107XG5cdFx0XHRcdERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaXRlbVwiLCBmZWVkUm9vdC5jaGlsZHJlbikuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaW5kZXgsIGxpc3QpIHtcblx0XHRcdFx0XHR2YXIgZW50cnkgPSB7fTtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkuaWQgPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImd1aWRcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkuZGVzY3JpcHRpb24gPSBEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImRlc2NyaXB0aW9uXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0ZW50cnkucHViRGF0ZSA9IG5ldyBEYXRlKERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwicHViRGF0ZVwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdGZlZWQuaXRlbXMucHVzaChlbnRyeSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZmVlZC50eXBlID0gXCJhdG9tXCI7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5pZCA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaWRcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uYXR0cmlicy5ocmVmO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC5kZXNjcmlwdGlvbiA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3VidGl0bGVcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIGZhbHNlKVswXS5jaGlsZHJlblswXS5kYXRhO1xuXHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0ZmVlZC51cGRhdGVkID0gbmV3IERhdGUoRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ1cGRhdGVkXCIsIGZlZWRSb290LmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YSk7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRmZWVkLmF1dGhvciA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZW1haWxcIiwgZmVlZFJvb3QuY2hpbGRyZW4sIHRydWUpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0ZmVlZC5pdGVtcyA9IFtdO1xuXHRcdFx0XHREb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImVudHJ5XCIsIGZlZWRSb290LmNoaWxkcmVuKS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpbmRleCwgbGlzdCkge1xuXHRcdFx0XHRcdHZhciBlbnRyeSA9IHt9O1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5pZCA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaWRcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS50aXRsZSA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGl0bGVcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGE7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5saW5rID0gRG9tVXRpbHMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIsIGl0ZW0uY2hpbGRyZW4sIGZhbHNlKVswXS5hdHRyaWJzLmhyZWY7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHsgfVxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRlbnRyeS5kZXNjcmlwdGlvbiA9IERvbVV0aWxzLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3VtbWFyeVwiLCBpdGVtLmNoaWxkcmVuLCBmYWxzZSlbMF0uY2hpbGRyZW5bMF0uZGF0YTtcblx0XHRcdFx0XHR9IGNhdGNoIChleCkgeyB9XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGVudHJ5LnB1YkRhdGUgPSBuZXcgRGF0ZShEb21VdGlscy5nZXRFbGVtZW50c0J5VGFnTmFtZShcInVwZGF0ZWRcIiwgaXRlbS5jaGlsZHJlbiwgZmFsc2UpWzBdLmNoaWxkcmVuWzBdLmRhdGEpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7IH1cblx0XHRcdFx0XHRmZWVkLml0ZW1zLnB1c2goZW50cnkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5kb20gPSBmZWVkO1xuXHRcdH1cblx0XHRSc3NIYW5kbGVyLnN1cGVyXy5wcm90b3R5cGUuZG9uZS5jYWxsKHRoaXMpO1xuXHR9XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBEZWZhdWx0SGFuZGxlciAoY2FsbGJhY2ssIG9wdGlvbnMpIHtcblx0dGhpcy5yZXNldCgpO1xuXHR0aGlzLl9vcHRpb25zID0gb3B0aW9ucyA/IG9wdGlvbnMgOiB7IH07XG5cdGlmICh0aGlzLl9vcHRpb25zLmlnbm9yZVdoaXRlc3BhY2UgPT0gdW5kZWZpbmVkKVxuXHRcdHRoaXMuX29wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSA9IGZhbHNlOyAvL0tlZXAgd2hpdGVzcGFjZS1vbmx5IHRleHQgbm9kZXNcblx0aWYgKHRoaXMuX29wdGlvbnMudmVyYm9zZSA9PSB1bmRlZmluZWQpXG5cdFx0dGhpcy5fb3B0aW9ucy52ZXJib3NlID0gdHJ1ZTsgLy9LZWVwIGRhdGEgcHJvcGVydHkgZm9yIHRhZ3MgYW5kIHJhdyBwcm9wZXJ0eSBmb3IgYWxsXG5cdGlmICh0aGlzLl9vcHRpb25zLmVuZm9yY2VFbXB0eVRhZ3MgPT0gdW5kZWZpbmVkKVxuXHRcdHRoaXMuX29wdGlvbnMuZW5mb3JjZUVtcHR5VGFncyA9IHRydWU7IC8vRG9uJ3QgYWxsb3cgY2hpbGRyZW4gZm9yIEhUTUwgdGFncyBkZWZpbmVkIGFzIGVtcHR5IGluIHNwZWNcblx0aWYgKCh0eXBlb2YgY2FsbGJhY2spID09IFwiZnVuY3Rpb25cIilcblx0XHR0aGlzLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xufVxuXG5cdC8vKipcIlN0YXRpY1wiKiovL1xuXHQvL0hUTUwgVGFncyB0aGF0IHNob3VsZG4ndCBjb250YWluIGNoaWxkIG5vZGVzXG5cdERlZmF1bHRIYW5kbGVyLl9lbXB0eVRhZ3MgPSB7XG5cdFx0ICBhcmVhOiAxXG5cdFx0LCBiYXNlOiAxXG5cdFx0LCBiYXNlZm9udDogMVxuXHRcdCwgYnI6IDFcblx0XHQsIGNvbDogMVxuXHRcdCwgZnJhbWU6IDFcblx0XHQsIGhyOiAxXG5cdFx0LCBpbWc6IDFcblx0XHQsIGlucHV0OiAxXG5cdFx0LCBpc2luZGV4OiAxXG5cdFx0LCBsaW5rOiAxXG5cdFx0LCBtZXRhOiAxXG5cdFx0LCBwYXJhbTogMVxuXHRcdCwgZW1iZWQ6IDFcblx0fVxuXHQvL1JlZ2V4IHRvIGRldGVjdCB3aGl0ZXNwYWNlIG9ubHkgdGV4dCBub2Rlc1xuXHREZWZhdWx0SGFuZGxlci5yZVdoaXRlc3BhY2UgPSAvXlxccyokLztcblxuXHQvLyoqUHVibGljKiovL1xuXHQvL1Byb3BlcnRpZXMvL1xuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuZG9tID0gbnVsbDsgLy9UaGUgaGllcmFyY2hpY2FsIG9iamVjdCBjb250YWluaW5nIHRoZSBwYXJzZWQgSFRNTFxuXHQvL01ldGhvZHMvL1xuXHQvL1Jlc2V0cyB0aGUgaGFuZGxlciBiYWNrIHRvIHN0YXJ0aW5nIHN0YXRlXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHJlc2V0KCkge1xuXHRcdHRoaXMuZG9tID0gW107XG5cdFx0dGhpcy5fZG9uZSA9IGZhbHNlO1xuXHRcdHRoaXMuX3RhZ1N0YWNrID0gW107XG5cdFx0dGhpcy5fdGFnU3RhY2subGFzdCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJF90YWdTdGFjayRsYXN0ICgpIHtcblx0XHRcdHJldHVybih0aGlzLmxlbmd0aCA/IHRoaXNbdGhpcy5sZW5ndGggLSAxXSA6IG51bGwpO1xuXHRcdH1cblx0fVxuXHQvL1NpZ25hbHMgdGhlIGhhbmRsZXIgdGhhdCBwYXJzaW5nIGlzIGRvbmVcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRkb25lICgpIHtcblx0XHR0aGlzLl9kb25lID0gdHJ1ZTtcblx0XHR0aGlzLmhhbmRsZUNhbGxiYWNrKG51bGwpO1xuXHR9XG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS53cml0ZVRhZyA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJHdyaXRlVGFnIChlbGVtZW50KSB7XG5cdFx0dGhpcy5oYW5kbGVFbGVtZW50KGVsZW1lbnQpO1xuXHR9IFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVUZXh0ID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkd3JpdGVUZXh0IChlbGVtZW50KSB7XG5cdFx0aWYgKHRoaXMuX29wdGlvbnMuaWdub3JlV2hpdGVzcGFjZSlcblx0XHRcdGlmIChEZWZhdWx0SGFuZGxlci5yZVdoaXRlc3BhY2UudGVzdChlbGVtZW50LmRhdGEpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0dGhpcy5oYW5kbGVFbGVtZW50KGVsZW1lbnQpO1xuXHR9IFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVDb21tZW50ID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkd3JpdGVDb21tZW50IChlbGVtZW50KSB7XG5cdFx0dGhpcy5oYW5kbGVFbGVtZW50KGVsZW1lbnQpO1xuXHR9IFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUud3JpdGVEaXJlY3RpdmUgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciR3cml0ZURpcmVjdGl2ZSAoZWxlbWVudCkge1xuXHRcdHRoaXMuaGFuZGxlRWxlbWVudChlbGVtZW50KTtcblx0fVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiBEZWZhdWx0SGFuZGxlciRlcnJvciAoZXJyb3IpIHtcblx0XHR0aGlzLmhhbmRsZUNhbGxiYWNrKGVycm9yKTtcblx0fVxuXG5cdC8vKipQcml2YXRlKiovL1xuXHQvL1Byb3BlcnRpZXMvL1xuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuX29wdGlvbnMgPSBudWxsOyAvL0hhbmRsZXIgb3B0aW9ucyBmb3IgaG93IHRvIGJlaGF2ZVxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuX2NhbGxiYWNrID0gbnVsbDsgLy9DYWxsYmFjayB0byByZXNwb25kIHRvIHdoZW4gcGFyc2luZyBkb25lXG5cdERlZmF1bHRIYW5kbGVyLnByb3RvdHlwZS5fZG9uZSA9IGZhbHNlOyAvL0ZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIGhhbmRsZXIgaGFzIGJlZW4gbm90aWZpZWQgb2YgcGFyc2luZyBjb21wbGV0ZWRcblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLl90YWdTdGFjayA9IG51bGw7IC8vTGlzdCBvZiBwYXJlbnRzIHRvIHRoZSBjdXJyZW50bHkgZWxlbWVudCBiZWluZyBwcm9jZXNzZWRcblx0Ly9NZXRob2RzLy9cblx0RGVmYXVsdEhhbmRsZXIucHJvdG90eXBlLmhhbmRsZUNhbGxiYWNrID0gZnVuY3Rpb24gRGVmYXVsdEhhbmRsZXIkaGFuZGxlQ2FsbGJhY2sgKGVycm9yKSB7XG5cdFx0XHRpZiAoKHR5cGVvZiB0aGlzLl9jYWxsYmFjaykgIT0gXCJmdW5jdGlvblwiKVxuXHRcdFx0XHRpZiAoZXJyb3IpXG5cdFx0XHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHR0aGlzLl9jYWxsYmFjayhlcnJvciwgdGhpcy5kb20pO1xuXHR9XG5cdFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuaXNFbXB0eVRhZyA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcblx0XHR2YXIgbmFtZSA9IGVsZW1lbnQubmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmIChuYW1lLmNoYXJBdCgwKSA9PSAnLycpIHtcblx0XHRcdG5hbWUgPSBuYW1lLnN1YnN0cmluZygxKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuX29wdGlvbnMuZW5mb3JjZUVtcHR5VGFncyAmJiAhIURlZmF1bHRIYW5kbGVyLl9lbXB0eVRhZ3NbbmFtZV07XG5cdH07XG5cdFxuXHREZWZhdWx0SGFuZGxlci5wcm90b3R5cGUuaGFuZGxlRWxlbWVudCA9IGZ1bmN0aW9uIERlZmF1bHRIYW5kbGVyJGhhbmRsZUVsZW1lbnQgKGVsZW1lbnQpIHtcblx0XHRpZiAodGhpcy5fZG9uZSlcblx0XHRcdHRoaXMuaGFuZGxlQ2FsbGJhY2sobmV3IEVycm9yKFwiV3JpdGluZyB0byB0aGUgaGFuZGxlciBhZnRlciBkb25lKCkgY2FsbGVkIGlzIG5vdCBhbGxvd2VkIHdpdGhvdXQgYSByZXNldCgpXCIpKTtcblx0XHRpZiAoIXRoaXMuX29wdGlvbnMudmVyYm9zZSkge1xuLy9cdFx0XHRlbGVtZW50LnJhdyA9IG51bGw7IC8vRklYTUU6IE5vdCBjbGVhblxuXHRcdFx0Ly9GSVhNRTogU2VyaW91cyBwZXJmb3JtYW5jZSBwcm9ibGVtIHVzaW5nIGRlbGV0ZVxuXHRcdFx0ZGVsZXRlIGVsZW1lbnQucmF3O1xuXHRcdFx0aWYgKGVsZW1lbnQudHlwZSA9PSBcInRhZ1wiIHx8IGVsZW1lbnQudHlwZSA9PSBcInNjcmlwdFwiIHx8IGVsZW1lbnQudHlwZSA9PSBcInN0eWxlXCIpXG5cdFx0XHRcdGRlbGV0ZSBlbGVtZW50LmRhdGE7XG5cdFx0fVxuXHRcdGlmICghdGhpcy5fdGFnU3RhY2subGFzdCgpKSB7IC8vVGhlcmUgYXJlIG5vIHBhcmVudCBlbGVtZW50c1xuXHRcdFx0Ly9JZiB0aGUgZWxlbWVudCBjYW4gYmUgYSBjb250YWluZXIsIGFkZCBpdCB0byB0aGUgdGFnIHN0YWNrIGFuZCB0aGUgdG9wIGxldmVsIGxpc3Rcblx0XHRcdGlmIChlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuVGV4dCAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuQ29tbWVudCAmJiBlbGVtZW50LnR5cGUgIT0gRWxlbWVudFR5cGUuRGlyZWN0aXZlKSB7XG5cdFx0XHRcdGlmIChlbGVtZW50Lm5hbWUuY2hhckF0KDApICE9IFwiL1wiKSB7IC8vSWdub3JlIGNsb3NpbmcgdGFncyB0aGF0IG9idmlvdXNseSBkb24ndCBoYXZlIGFuIG9wZW5pbmcgdGFnXG5cdFx0XHRcdFx0dGhpcy5kb20ucHVzaChlbGVtZW50KTtcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNFbXB0eVRhZyhlbGVtZW50KSkgeyAvL0Rvbid0IGFkZCB0YWdzIHRvIHRoZSB0YWcgc3RhY2sgdGhhdCBjYW4ndCBoYXZlIGNoaWxkcmVuXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5wdXNoKGVsZW1lbnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSAvL090aGVyd2lzZSBqdXN0IGFkZCB0byB0aGUgdG9wIGxldmVsIGxpc3Rcblx0XHRcdFx0dGhpcy5kb20ucHVzaChlbGVtZW50KTtcblx0XHR9XG5cdFx0ZWxzZSB7IC8vVGhlcmUgYXJlIHBhcmVudCBlbGVtZW50c1xuXHRcdFx0Ly9JZiB0aGUgZWxlbWVudCBjYW4gYmUgYSBjb250YWluZXIsIGFkZCBpdCBhcyBhIGNoaWxkIG9mIHRoZSBlbGVtZW50XG5cdFx0XHQvL29uIHRvcCBvZiB0aGUgdGFnIHN0YWNrIGFuZCB0aGVuIGFkZCBpdCB0byB0aGUgdGFnIHN0YWNrXG5cdFx0XHRpZiAoZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLlRleHQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkNvbW1lbnQgJiYgZWxlbWVudC50eXBlICE9IEVsZW1lbnRUeXBlLkRpcmVjdGl2ZSkge1xuXHRcdFx0XHRpZiAoZWxlbWVudC5uYW1lLmNoYXJBdCgwKSA9PSBcIi9cIikge1xuXHRcdFx0XHRcdC8vVGhpcyBpcyBhIGNsb3NpbmcgdGFnLCBzY2FuIHRoZSB0YWdTdGFjayB0byBmaW5kIHRoZSBtYXRjaGluZyBvcGVuaW5nIHRhZ1xuXHRcdFx0XHRcdC8vYW5kIHBvcCB0aGUgc3RhY2sgdXAgdG8gdGhlIG9wZW5pbmcgdGFnJ3MgcGFyZW50XG5cdFx0XHRcdFx0dmFyIGJhc2VOYW1lID0gZWxlbWVudC5uYW1lLnN1YnN0cmluZygxKTtcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNFbXB0eVRhZyhlbGVtZW50KSkge1xuXHRcdFx0XHRcdFx0dmFyIHBvcyA9IHRoaXMuX3RhZ1N0YWNrLmxlbmd0aCAtIDE7XG5cdFx0XHRcdFx0XHR3aGlsZSAocG9zID4gLTEgJiYgdGhpcy5fdGFnU3RhY2tbcG9zLS1dLm5hbWUgIT0gYmFzZU5hbWUpIHsgfVxuXHRcdFx0XHRcdFx0aWYgKHBvcyA+IC0xIHx8IHRoaXMuX3RhZ1N0YWNrWzBdLm5hbWUgPT0gYmFzZU5hbWUpXG5cdFx0XHRcdFx0XHRcdHdoaWxlIChwb3MgPCB0aGlzLl90YWdTdGFjay5sZW5ndGggLSAxKVxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX3RhZ1N0YWNrLnBvcCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHsgLy9UaGlzIGlzIG5vdCBhIGNsb3NpbmcgdGFnXG5cdFx0XHRcdFx0aWYgKCF0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4pXG5cdFx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4gPSBbXTtcblx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4ucHVzaChlbGVtZW50KTtcblx0XHRcdFx0XHRpZiAoIXRoaXMuaXNFbXB0eVRhZyhlbGVtZW50KSkgLy9Eb24ndCBhZGQgdGFncyB0byB0aGUgdGFnIHN0YWNrIHRoYXQgY2FuJ3QgaGF2ZSBjaGlsZHJlblxuXHRcdFx0XHRcdFx0dGhpcy5fdGFnU3RhY2sucHVzaChlbGVtZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7IC8vVGhpcyBpcyBub3QgYSBjb250YWluZXIgZWxlbWVudFxuXHRcdFx0XHRpZiAoIXRoaXMuX3RhZ1N0YWNrLmxhc3QoKS5jaGlsZHJlbilcblx0XHRcdFx0XHR0aGlzLl90YWdTdGFjay5sYXN0KCkuY2hpbGRyZW4gPSBbXTtcblx0XHRcdFx0dGhpcy5fdGFnU3RhY2subGFzdCgpLmNoaWxkcmVuLnB1c2goZWxlbWVudCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0dmFyIERvbVV0aWxzID0ge1xuXHRcdCAgdGVzdEVsZW1lbnQ6IGZ1bmN0aW9uIERvbVV0aWxzJHRlc3RFbGVtZW50IChvcHRpb25zLCBlbGVtZW50KSB7XG5cdFx0XHRpZiAoIWVsZW1lbnQpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcblx0XHRcdGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG5cdFx0XHRcdGlmIChrZXkgPT0gXCJ0YWdfbmFtZVwiKSB7XG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQudHlwZSAhPSBcInRhZ1wiICYmIGVsZW1lbnQudHlwZSAhPSBcInNjcmlwdFwiICYmIGVsZW1lbnQudHlwZSAhPSBcInN0eWxlXCIpIHtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCFvcHRpb25zW1widGFnX25hbWVcIl0oZWxlbWVudC5uYW1lKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChrZXkgPT0gXCJ0YWdfdHlwZVwiKSB7XG5cdFx0XHRcdFx0aWYgKCFvcHRpb25zW1widGFnX3R5cGVcIl0oZWxlbWVudC50eXBlKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChrZXkgPT0gXCJ0YWdfY29udGFpbnNcIikge1xuXHRcdFx0XHRcdGlmIChlbGVtZW50LnR5cGUgIT0gXCJ0ZXh0XCIgJiYgZWxlbWVudC50eXBlICE9IFwiY29tbWVudFwiICYmIGVsZW1lbnQudHlwZSAhPSBcImRpcmVjdGl2ZVwiKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICghb3B0aW9uc1tcInRhZ19jb250YWluc1wiXShlbGVtZW50LmRhdGEpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmICghZWxlbWVudC5hdHRyaWJzIHx8ICFvcHRpb25zW2tleV0oZWxlbWVudC5hdHRyaWJzW2tleV0pKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFxuXHRcdCwgZ2V0RWxlbWVudHM6IGZ1bmN0aW9uIERvbVV0aWxzJGdldEVsZW1lbnRzIChvcHRpb25zLCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpIHtcblx0XHRcdHJlY3Vyc2UgPSAocmVjdXJzZSA9PT0gdW5kZWZpbmVkIHx8IHJlY3Vyc2UgPT09IG51bGwpIHx8ICEhcmVjdXJzZTtcblx0XHRcdGxpbWl0ID0gaXNOYU4ocGFyc2VJbnQobGltaXQpKSA/IC0xIDogcGFyc2VJbnQobGltaXQpO1xuXG5cdFx0XHRpZiAoIWN1cnJlbnRFbGVtZW50KSB7XG5cdFx0XHRcdHJldHVybihbXSk7XG5cdFx0XHR9XG5cdFxuXHRcdFx0dmFyIGZvdW5kID0gW107XG5cdFx0XHR2YXIgZWxlbWVudExpc3Q7XG5cblx0XHRcdGZ1bmN0aW9uIGdldFRlc3QgKGNoZWNrVmFsKSB7XG5cdFx0XHRcdHJldHVybihmdW5jdGlvbiAodmFsdWUpIHsgcmV0dXJuKHZhbHVlID09IGNoZWNrVmFsKTsgfSk7XG5cdFx0XHR9XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRpZiAoKHR5cGVvZiBvcHRpb25zW2tleV0pICE9IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdG9wdGlvbnNba2V5XSA9IGdldFRlc3Qob3B0aW9uc1trZXldKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcblx0XHRcdGlmIChEb21VdGlscy50ZXN0RWxlbWVudChvcHRpb25zLCBjdXJyZW50RWxlbWVudCkpIHtcblx0XHRcdFx0Zm91bmQucHVzaChjdXJyZW50RWxlbWVudCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChsaW1pdCA+PSAwICYmIGZvdW5kLmxlbmd0aCA+PSBsaW1pdCkge1xuXHRcdFx0XHRyZXR1cm4oZm91bmQpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmVjdXJzZSAmJiBjdXJyZW50RWxlbWVudC5jaGlsZHJlbikge1xuXHRcdFx0XHRlbGVtZW50TGlzdCA9IGN1cnJlbnRFbGVtZW50LmNoaWxkcmVuO1xuXHRcdFx0fSBlbHNlIGlmIChjdXJyZW50RWxlbWVudCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdGVsZW1lbnRMaXN0ID0gY3VycmVudEVsZW1lbnQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4oZm91bmQpO1xuXHRcdFx0fVxuXHRcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudExpc3QubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0Zm91bmQgPSBmb3VuZC5jb25jYXQoRG9tVXRpbHMuZ2V0RWxlbWVudHMob3B0aW9ucywgZWxlbWVudExpc3RbaV0sIHJlY3Vyc2UsIGxpbWl0KSk7XG5cdFx0XHRcdGlmIChsaW1pdCA+PSAwICYmIGZvdW5kLmxlbmd0aCA+PSBsaW1pdCkge1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFxuXHRcdFx0cmV0dXJuKGZvdW5kKTtcblx0XHR9XG5cdFx0XG5cdFx0LCBnZXRFbGVtZW50QnlJZDogZnVuY3Rpb24gRG9tVXRpbHMkZ2V0RWxlbWVudEJ5SWQgKGlkLCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSkge1xuXHRcdFx0dmFyIHJlc3VsdCA9IERvbVV0aWxzLmdldEVsZW1lbnRzKHsgaWQ6IGlkIH0sIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCAxKTtcblx0XHRcdHJldHVybihyZXN1bHQubGVuZ3RoID8gcmVzdWx0WzBdIDogbnVsbCk7XG5cdFx0fVxuXHRcdFxuXHRcdCwgZ2V0RWxlbWVudHNCeVRhZ05hbWU6IGZ1bmN0aW9uIERvbVV0aWxzJGdldEVsZW1lbnRzQnlUYWdOYW1lIChuYW1lLCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpIHtcblx0XHRcdHJldHVybihEb21VdGlscy5nZXRFbGVtZW50cyh7IHRhZ19uYW1lOiBuYW1lIH0sIGN1cnJlbnRFbGVtZW50LCByZWN1cnNlLCBsaW1pdCkpO1xuXHRcdH1cblx0XHRcblx0XHQsIGdldEVsZW1lbnRzQnlUYWdUeXBlOiBmdW5jdGlvbiBEb21VdGlscyRnZXRFbGVtZW50c0J5VGFnVHlwZSAodHlwZSwgY3VycmVudEVsZW1lbnQsIHJlY3Vyc2UsIGxpbWl0KSB7XG5cdFx0XHRyZXR1cm4oRG9tVXRpbHMuZ2V0RWxlbWVudHMoeyB0YWdfdHlwZTogdHlwZSB9LCBjdXJyZW50RWxlbWVudCwgcmVjdXJzZSwgbGltaXQpKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBpbmhlcml0cyAoY3Rvciwgc3VwZXJDdG9yKSB7XG5cdFx0dmFyIHRlbXBDdG9yID0gZnVuY3Rpb24oKXt9O1xuXHRcdHRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGU7XG5cdFx0Y3Rvci5zdXBlcl8gPSBzdXBlckN0b3I7XG5cdFx0Y3Rvci5wcm90b3R5cGUgPSBuZXcgdGVtcEN0b3IoKTtcblx0XHRjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3I7XG5cdH1cblxuZXhwb3J0cy5QYXJzZXIgPSBQYXJzZXI7XG5cbmV4cG9ydHMuRGVmYXVsdEhhbmRsZXIgPSBEZWZhdWx0SGFuZGxlcjtcblxuZXhwb3J0cy5Sc3NIYW5kbGVyID0gUnNzSGFuZGxlcjtcblxuZXhwb3J0cy5FbGVtZW50VHlwZSA9IEVsZW1lbnRUeXBlO1xuXG5leHBvcnRzLkRvbVV0aWxzID0gRG9tVXRpbHM7XG5cbn0pKCk7XG5cbn0pLmNhbGwodGhpcyxcIi9ub2RlX21vZHVsZXMvaHRtbFBhcnNlci9saWIvaHRtbHBhcnNlci5qc1wiLFwiL25vZGVfbW9kdWxlcy9odG1sUGFyc2VyL2xpYlwiKSIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IENsYXlDb21waWxlciAgIGZyb20gJy4vdGVtcGxhdGUtY29tcGlsZXInO1xuaW1wb3J0IGhlbHBlciAgICAgICAgIGZyb20gJy4vaGVscGVyJztcblxuLyoqXG4gKiBAY2xhc3MgQ2xheVJ1bnRpbWVcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjb21waWxlcjogQ2xheUNvbXBpbGVyXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fSB0b1xuICogQHBhcmFtIHtPYmplY3R9IGZyb21cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW292ZXJ3cml0ZV1cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gbWl4KHRvLCBmcm9tLCBvdmVyd3JpdGUpIHtcbiAgdmFyIGkgPSAwLCBrZXlzID0gT2JqZWN0LmtleXMoZnJvbSksIHByb3A7XG5cbiAgd2hpbGUgKChwcm9wID0ga2V5c1tpKytdKSkge1xuICAgIGlmIChvdmVyd3JpdGUgfHwgIXRvW3Byb3BdKSB7XG4gICAgICB0b1twcm9wXSA9IGZyb21bcHJvcF07XG4gICAgfVxuICB9XG4gIHJldHVybiB0bztcbn1cblxuLyoqXG4gKiBzaGFsbG93IGZsYXR0ZW5cbiAqIEBwYXJhbSB7QXJyYXl9IGxpc3RcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbihsaXN0KSB7XG4gIHZhciBpID0gMCwgaXRlbSwgcmV0ID0gW107XG4gIHdoaWxlICgoaXRlbSA9IGxpc3RbaSsrXSkpIHtcbiAgICBpZiAoaXNBcnJheShpdGVtKSkge1xuICAgICAgcmV0ID0gcmV0LmNvbmNhdChpdGVtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0LnB1c2goaXRlbSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbi8qKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cbmZ1bmN0aW9uIGNsb25lKG9iaikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShvYmopID8gb2JqLnNsaWNlKDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBtaXgoe30sIG9iailcbn1cblxuLyoqXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJheVxuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiB1bmlxKGFycmF5KSB7XG4gIHZhciByZXQgPSBbXSwgaSA9IDAsIGl0ZW07XG5cbiAgd2hpbGUgKChpdGVtID0gYXJyYXlbaSsrXSkpIHtcbiAgICBpZiAocmV0LmluZGV4T2YoaXRlbSkgPT09IC0xKSB7XG4gICAgICByZXQucHVzaChpdGVtKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBnZXQgY2FjaGVkIGBtYXRjaGVzU2VsZWN0b3JgIG1ldGhvZCBuYW1lXG4gKi9cbnZhciBtYXRjaGVyTmFtZTtcbmZ1bmN0aW9uIGdldE1hdGNoZXJOYW1lKCkge1xuICBpZiAobWF0Y2hlck5hbWUpIHtcbiAgICByZXR1cm4gbWF0Y2hlck5hbWU7XG4gIH1cblxuICB2YXIgbGlzdCAgPSBbJ21hdGNoZXMnLCAnd2Via2l0TWF0Y2hlc1NlbGVjdG9yJywgJ21vek1hdGNoZXNTZWxlY3RvcicsICdtc01hdGNoZXNTZWxlY3RvciddLFxuICAgICAgcHJvdG8gPSBIVE1MRWxlbWVudC5wcm90b3R5cGUsIGkgPSAwLCBuYW1lO1xuXG4gIHdoaWxlKChuYW1lID0gbGlzdFtpKytdKSkge1xuICAgIGlmIChwcm90b1tuYW1lXSkge1xuICAgICAgbWF0Y2hlck5hbWUgPSBuYW1lO1xuICAgICAgcmV0dXJuIG1hdGNoZXJOYW1lO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIG1hdGNoIGVsZW1lbnQgd2l0aCBzZWxlY3RvclxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudFxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gbWF0Y2hFbGVtZW50KGVsZW1lbnQsIHNlbGVjdG9yKSB7XG4gIHJldHVybiBlbGVtZW50W2dldE1hdGNoZXJOYW1lKCldKHNlbGVjdG9yKTtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiB0b1N0cmluZyh2YWx1ZSkge1xuICB2YXIgb2JqU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgcmV0dXJuIG9ialN0ci5zbGljZShvYmpTdHIuaW5kZXhPZignICcpICsgMSwgLTEpO1xufVxuXG4vKipcbiAqIGZha2UgYXJyYXkgKGxpa2UgTm9kZUxpc3QsIEFyZ3VtZW50cyBldGMpIGNvbnZlcnQgdG8gQXJyYXlcbiAqIEBwYXJhbSB7Kn0gZmFrZUFycmF5XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHRvQXJyYXkoZmFrZUFycmF5KSB7XG4gIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmYWtlQXJyYXkpO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc051bWJlcih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNBcnJheSh2YWx1ZSkge1xuICByZXR1cm4gdG9TdHJpbmcodmFsdWUpID09PSAnQXJyYXknO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gdG9TdHJpbmcodmFsdWUpID09PSAnT2JqZWN0Jztcbn1cblxuLyoqXG4gKiBAcGFyYW0ge1N0cmluZ30gbG9jYWxOYW1lXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNDdXN0b21FbGVtZW50TmFtZShsb2NhbE5hbWUpIHtcbiAgcmV0dXJuIGxvY2FsTmFtZS5pbmRleE9mKCctJykgIT09IC0xO1xufVxuXG4vKipcbiAqIEBzZWUgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNjA2Nzk3L3VzZS1vZi1hcHBseS13aXRoLW5ldy1vcGVyYXRvci1pcy10aGlzLXBvc3NpYmxlLzEzOTMxNjI3IzEzOTMxNjI3XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtBcnJheX0gYXJnc1xuICogQHJldHVybnMge2ludm9rZS5GfVxuICovXG5mdW5jdGlvbiBpbnZva2UoY29uc3RydWN0b3IsIGFyZ3MpIHtcbiAgdmFyIGY7XG4gIGZ1bmN0aW9uIEYoKSB7XG4gICAgLy8gY29uc3RydWN0b3IgcmV0dXJucyAqKnRoaXMqKlxuICAgIHJldHVybiBjb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuICBGLnByb3RvdHlwZSA9IGNvbnN0cnVjdG9yLnByb3RvdHlwZTtcbiAgZiA9IG5ldyBGKCk7XG4gIGYuY29uc3RydWN0b3IgPSBjb25zdHJ1Y3RvcjtcbiAgcmV0dXJuIGY7XG59XG5cbi8qKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaGFuZGxlclxuICovXG5mdW5jdGlvbiByZWFkeShoYW5kbGVyKSB7XG4gIGlmIChGTEdfRE9NX0FMUkVBRFkpIHtcbiAgICBoYW5kbGVyKCk7XG4gIH0gZWxzZSB7XG4gICAgU1RBQ0tfUkVBRFlfSEFORExFUlMucHVzaChoYW5kbGVyKTtcbiAgfVxufVxuXG52YXIgRkxHX0RPTV9BTFJFQURZICAgICAgPSBmYWxzZSxcbiAgICBTVEFDS19SRUFEWV9IQU5ETEVSUyA9IFtdO1xuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gIEZMR19ET01fQUxSRUFEWSA9IHRydWU7XG4gIHZhciBpID0gMCwgcmVhZHk7XG4gIHdoaWxlIChyZWFkeSA9IFNUQUNLX1JFQURZX0hBTkRMRVJTW2krK10pIHtcbiAgICByZWFkeSgpO1xuICB9XG59LCBmYWxzZSk7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgbm9vcCAgICAgIDogZnVuY3Rpb24gbm9vcCgpIHt9LFxuICBtaXggICAgICAgOiBtaXgsXG4gIHVuaXEgICAgICA6IHVuaXEsXG4gIGNsb25lICAgICA6IGNsb25lLFxuICBmbGF0dGVuICAgOiBmbGF0dGVuLFxuICByZWFkeSAgICAgOiByZWFkeSxcbiAgaW52b2tlICAgIDogaW52b2tlLFxuICB0b0FycmF5ICAgOiB0b0FycmF5LFxuICB0b1N0cmluZyAgOiB0b1N0cmluZyxcblxuICBtYXRjaEVsZW1lbnQgOiBtYXRjaEVsZW1lbnQsXG5cbiAgaXNTdHJpbmcgICAgICAgICAgICA6IGlzU3RyaW5nLFxuICBpc051bWJlciAgICAgICAgICAgIDogaXNOdW1iZXIsXG4gIGlzQXJyYXkgICAgICAgICAgICAgOiBpc0FycmF5LFxuICBpc0Z1bmN0aW9uICAgICAgICAgIDogaXNGdW5jdGlvbixcbiAgaXNPYmplY3QgICAgICAgICAgICA6IGlzT2JqZWN0LFxuICBpc0N1c3RvbUVsZW1lbnROYW1lIDogaXNDdXN0b21FbGVtZW50TmFtZVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGhlbHBlciAgICAgZnJvbSBcIi4vaGVscGVyXCI7XG5pbXBvcnQgKiBhcyBodG1sUGFyc2VyIGZyb20gXCJodG1sUGFyc2VyXCI7XG5cbnZhciBSRVhfSU5URVJQT0xBVEVfU1lNQk9MID0gL3t7W157fV0rfX0vZztcbnZhciBSRVhfUkVQRUFUX1NZTUJPTCAgICAgID0gL3t7KFxcdyspXFxzaW5cXHMoW1xcd1xcLl0rKX19LztcbnZhciBTVFJfUkVQRUFUX0FUVFJJQlVURSAgID0gJ2NsLXJlcGVhdCc7XG52YXIgU1RSX0lGX0FUVFJJQlVURSAgICAgICA9ICdjbC1pZic7XG52YXIgU1RSX1VOTEVTU19BVFRSSUJVVEUgICA9ICdjbC11bmxlc3MnO1xudmFyIFNUUl9FVkFMX0ZVTkNUSU9OX1NZTUJPTCA9ICdfX0VWQUxfRlVOQ1RJT05fXyc7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgLyoqXG4gICAqIEBzdGF0aWNcbiAgICogQHJldHVybnMge0NsYXlUZW1wbGF0ZUNvbXBpbGVyfVxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IENsYXlUZW1wbGF0ZUNvbXBpbGVyKCk7XG4gIH1cbn07XG5cbi8qKlxuICogQGNsYXNzIENsYXlUZW1wbGF0ZUNvbXBpbGVyXG4gKi9cbmNsYXNzIENsYXlUZW1wbGF0ZUNvbXBpbGVyIHtcbiAgLyoqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gbm9vcFxuICB9XG5cbiAgLyoqXG4gICAqIEB0eXBlZGVmIHtPYmplY3R9IERvbVN0cnVjdHVyZVxuICAgKiBAcHJvcGVydHkgez9TdHJpbmd9IGRhdGFcbiAgICogQHByb3BlcnR5IHtPYmplY3QuPHN0cmluZywgc3RyaW5nPn0gYXR0cmlic1xuICAgKiBAcHJvcGVydHkge1N0cmluZ30gc3R5bGVcbiAgICogQHByb3BlcnR5IHtUcGxFdmFsdWF0b3JzfSBldmFsdWF0b3JzXG4gICAqIEBwcm9wZXJ0eSB7QXJyYXkuPERvbVN0cnVjdHVyZT59IGNoaWxkcmVuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBAdHlwZWRlZiB7T2JqZWN0fSBUcGxFdmFsdWF0b3JzXG4gICAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsIGZ1bmN0aW9uPn0gYXR0cnNcbiAgICogQHByb3BlcnR5IHs/RnVuY3Rpb259IHN0eWxlXG4gICAqIEBwcm9wZXJ0eSB7P0Z1bmN0aW9ufSBkYXRhXG4gICAqIEBwcm9wZXJ0eSB7P0Z1bmN0aW9ufSByZXBlYXRcbiAgICovXG5cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IGh0bWxcbiAgICogQHJldHVybnMge0RvbVN0cnVjdHVyZX1cbiAgICovXG4gIGNvbXBpbGVGcm9tSHRtbChodG1sKSB7XG4gICAgdmFyIHBhcnNlZCA9IHRoaXMucGFyc2VIdG1sKGh0bWwpO1xuICAgIHRoaXMucHJlQ29tcGlsZSA9IGZhbHNlO1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVEb21TdHJ1Y3R1cmUocGFyc2VkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICAgKiBAcmV0dXJucyB7U3RyaW5nfVxuICAgKi9cbiAgc2VyaWFsaXplRnJvbUh0bWwoaHRtbCkge1xuICAgIHZhciBwYXJzZWQgPSB0aGlzLnBhcnNlSHRtbChodG1sKTtcbiAgICB0aGlzLnByZUNvbXBpbGUgPSB0cnVlO1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLmNvbXBpbGVEb21TdHJ1Y3R1cmUocGFyc2VkKSk7XG4gIH1cblxuICBwYXJzZUh0bWwoaHRtbCkge1xuICAgIHZhciBoYW5kbGVyID0gbmV3IGh0bWxQYXJzZXIuRGVmYXVsdEhhbmRsZXIoZnVuY3Rpb24gKGVyciwgZG9tKSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIH1cbiAgICAgIH0sIHtcbiAgICAgICAgZW5mb3JjZUVtcHR5VGFncyA6IHRydWUsXG4gICAgICAgIGlnbm9yZVdoaXRlc3BhY2UgOiB0cnVlLFxuICAgICAgICB2ZXJib3NlICAgICAgICAgIDogZmFsc2VcbiAgICAgIH0pLFxuICAgICAgcGFyc2VyID0gbmV3IGh0bWxQYXJzZXIuUGFyc2VyKGhhbmRsZXIpO1xuXG4gICAgLy8gcGFyc2UgaHRtbFxuICAgIHBhcnNlci5wYXJzZUNvbXBsZXRlKGh0bWwpO1xuICAgIGlmIChoYW5kbGVyLmRvbS5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBFcnJvcignVGVtcGxhdGUgbXVzdCBoYXZlIGV4YWN0bHkgb25lIHJvb3QgZWxlbWVudC4gd2FzOiAnICsgaHRtbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGhhbmRsZXIuZG9tWzBdO1xuICB9XG5cblxuICAvKipcbiAgICogQGRlc3RydWN0aXZlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkb21TdHJ1Y3R1cmVcbiAgICovXG4gIGNvbXBpbGVEb21TdHJ1Y3R1cmUoZG9tU3RydWN0dXJlID0ge30pIHtcbiAgICB2YXIgZGF0YSAgICAgPSBkb21TdHJ1Y3R1cmUuZGF0YSxcbiAgICAgICAgYXR0cnMgICAgPSBkb21TdHJ1Y3R1cmUuYXR0cmlicyAgICB8fCB7fSxcbiAgICAgICAgY2hpbGRyZW4gPSBkb21TdHJ1Y3R1cmUuY2hpbGRyZW4gICB8fCBbXSxcbiAgICAgICAgZXZhbHMgICAgPSBkb21TdHJ1Y3R1cmUuZXZhbHVhdG9ycyA9IHtcbiAgICAgICAgICBhdHRycyAgOiB7fSxcbiAgICAgICAgICBzdHlsZSAgOiBudWxsLFxuICAgICAgICAgIGRhdGEgICA6IG51bGwsXG4gICAgICAgICAgJ2lmJyAgIDogbnVsbCxcbiAgICAgICAgICB1bmxlc3MgOiBudWxsLFxuICAgICAgICAgIHJlcGVhdCA6IG51bGxcbiAgICAgICAgfSxcbiAgICAgICAga2V5cywga2V5LCBpID0gMDtcblxuICAgIC8vIHN0eWxlcyBldmFsdWF0b3JcbiAgICBpZiAoYXR0cnMuc3R5bGUpIHtcbiAgICAgIGRvbVN0cnVjdHVyZS5zdHlsZSA9IGF0dHJzLnN0eWxlO1xuICAgICAgZXZhbHMuc3R5bGUgPSB0aGlzLmNvbXBpbGVWYWx1ZShkb21TdHJ1Y3R1cmUuc3R5bGUpO1xuICAgICAgZGVsZXRlIGF0dHJzLnN0eWxlOyAgLy8gZGVsZXRlIGZyb20gb3JpZyBhdHRyaWIgb2JqZWN0XG4gICAgfVxuXG4gICAgLy8gYXR0cmlidXRlcyBldmFsdWF0b3JcbiAgICBrZXlzID0gT2JqZWN0LmtleXMoYXR0cnMpO1xuICAgIHdoaWxlICgoa2V5ID0ga2V5c1tpKytdKSkge1xuICAgICAgLy8gcmVwZWF0XG4gICAgICBpZiAoa2V5ID09PSBTVFJfUkVQRUFUX0FUVFJJQlVURSkge1xuICAgICAgICBldmFscy5yZXBlYXQgPSB0aGlzLmNvbXBpbGVSZXBlYXRFeHByZXNzaW9uKGF0dHJzW1NUUl9SRVBFQVRfQVRUUklCVVRFXSk7XG4gICAgICAgIGRlbGV0ZSBhdHRyc1tTVFJfUkVQRUFUX0FUVFJJQlVURV07IC8vIGRlbGV0ZSBmcm9tIG9yaWcgYXR0cmliIG9iamVjdFxuICAgICAgfVxuICAgICAgLy8gaWZcbiAgICAgIGVsc2UgaWYgKGtleSA9PT0gU1RSX0lGX0FUVFJJQlVURSkge1xuICAgICAgICBldmFscy5pZiA9IHRoaXMuY29tcGlsZUlmRXhwcmVzc2lvbihhdHRyc1tTVFJfSUZfQVRUUklCVVRFXSk7XG4gICAgICAgIGRlbGV0ZSBhdHRyc1tTVFJfSUZfQVRUUklCVVRFXTsgLy8gZGVsZXRlIGZyb20gb3JpZyBhdHRyaWIgb2JqZWN0XG4gICAgICB9XG4gICAgICAvLyB1bmxlc3NcbiAgICAgIGVsc2UgaWYgKGtleSA9PT0gU1RSX1VOTEVTU19BVFRSSUJVVEUpIHtcbiAgICAgICAgZXZhbHMudW5sZXNzID0gdGhpcy5jb21waWxlVW5sZXNzRXhwcmVzc2lvbihhdHRyc1tTVFJfVU5MRVNTX0FUVFJJQlVURV0pO1xuICAgICAgICBkZWxldGUgYXR0cnNbU1RSX1VOTEVTU19BVFRSSUJVVEVdOyAvLyBkZWxldGUgZnJvbSBvcmlnIGF0dHJpYiBvYmplY3RcbiAgICAgIH1cbiAgICAgIC8vIGludGVycG9sYXRlXG4gICAgICBlbHNlIHtcbiAgICAgICAgZXZhbHMuYXR0cnNba2V5XSA9IHRoaXMuY29tcGlsZVZhbHVlKGF0dHJzW2tleV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRhdGEgKHRleHQpIGV2YWx1YXRvclxuICAgIGV2YWxzLmRhdGEgPSB0aGlzLmNvbXBpbGVWYWx1ZShkYXRhKTtcblxuICAgIC8vIHJlY3Vyc2l2ZVxuICAgIGNoaWxkcmVuLmZvckVhY2goY2hpbGQgPT4gdGhpcy5jb21waWxlRG9tU3RydWN0dXJlKGNoaWxkKSk7XG5cbiAgICByZXR1cm4gZG9tU3RydWN0dXJlXG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICAgKiBAcmV0dXJucyB7P0Z1bmN0aW9ufVxuICAgKi9cbiAgY29tcGlsZVZhbHVlKHN0cikge1xuICAgIHN0ciA9IChzdHIgfHwgJycpO1xuICAgIHZhciBtYXRjaGVzID0gc3RyLm1hdGNoKFJFWF9JTlRFUlBPTEFURV9TWU1CT0wpLFxuICAgICAgICBmdW5jQm9keTtcblxuICAgIGlmIChtYXRjaGVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAoc3RyID09PSBtYXRjaGVzWzBdKSB7XG4gICAgICAvLyByZXR1cm4gcHJpbWl0aXZlIHZhbHVlIChmb3IgaG9vaylcbiAgICAgIGZ1bmNCb2R5ID0gJ3JldHVybiBkYXRhLicgKyBzdHIuc2xpY2UoMiwgLTIpICsgJzsnO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyByZXR1cm4gcHJvY2Vzc2VkIHN0cmluZ1xuICAgICAgZnVuY0JvZHkgPSBbXCJ2YXIgcz1bXTtcIixcbiAgICAgICAgXCJzLnB1c2goJ1wiLFxuICAgICAgICBzdHIucmVwbGFjZSgvW1xcclxcblxcdF0vZywgJyAnKVxuICAgICAgICAgICAuc3BsaXQoXCInXCIpLmpvaW4oXCJcXFxcJ1wiKVxuICAgICAgICAgICAucmVwbGFjZSgve3soW157fV0rKX19L2csIFwiJywoZGF0YS4kMSAhPSBudWxsID8gZGF0YS4kMSA6ICcnKSwnXCIpXG4gICAgICAgICAgIC5zcGxpdCgvXFxzezIsfS8pLmpvaW4oJyAnKSxcbiAgICAgICAgXCInKTtcIixcbiAgICAgICAgXCJyZXR1cm4gcy5qb2luKCcnKTtcIlxuICAgICAgXS5qb2luKCcnKVxuICAgIH1cblxuICAgIHZhciBmdW5jT2JqID0ge1xuICAgICAgW1NUUl9FVkFMX0ZVTkNUSU9OX1NZTUJPTF06IHRydWUsXG4gICAgICBhcmdzIDogWydkYXRhJywgZnVuY0JvZHldXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5wcmVDb21waWxlID8gZnVuY09iaiA6IGhlbHBlci5pbnZva2UoRnVuY3Rpb24sIGZ1bmNPYmouYXJncyk7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IHJlcGVhdEV4cHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufE9iamVjdH1cbiAgICovXG4gIGNvbXBpbGVSZXBlYXRFeHByZXNzaW9uKHJlcGVhdEV4cHIpIHtcbiAgICB2YXIgbWF0Y2hlcyA9IChyZXBlYXRFeHByIHx8ICcnKS5tYXRjaChSRVhfUkVQRUFUX1NZTUJPTCk7XG5cbiAgICBpZiAobWF0Y2hlcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHN5bnRheCBmb3IgcmVwZWF0OiAnICsgcmVwZWF0RXhwcilcbiAgICB9XG5cbiAgICB2YXIgWywgY2hpbGRTY29wZU5hbWUsIHBhcmVudFRhcmdldFBhdGhdID0gbWF0Y2hlcztcblxuICAgIHZhciBmdW5jT2JqID0ge1xuICAgICAgW1NUUl9FVkFMX0ZVTkNUSU9OX1NZTUJPTF06IHRydWUsXG4gICAgICBhcmdzIDogWydkYXRhJywgW1xuICAgICAgICAgIFwicmV0dXJuIGRhdGEuXCIgKyBwYXJlbnRUYXJnZXRQYXRoICsgXCIubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcIixcbiAgICAgICAgXCIgIHZhciBrcywgaywgaSA9IDAsIHIgPSB7fTtcIixcbiAgICAgICAgXCIgIGtzID0gT2JqZWN0LmtleXMoZGF0YSk7XCIsXG4gICAgICAgIFwiICB3aGlsZSAoKGsgPSBrc1tpKytdKSkge1wiLFxuICAgICAgICBcIiAgICByW2tdID0gZGF0YVtrXTtcIixcbiAgICAgICAgXCIgIH1cIixcbiAgICAgICAgICBcIiAgci5cIiArIGNoaWxkU2NvcGVOYW1lICsgXCIgPSBpdGVtO1wiLFxuICAgICAgICBcIiAgcmV0dXJuIHI7XCIsXG4gICAgICAgIFwifSk7XCJcbiAgICAgIF0uam9pbignJyldXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5wcmVDb21waWxlID8gZnVuY09iaiA6IGhlbHBlci5pbnZva2UoRnVuY3Rpb24sIGZ1bmNPYmouYXJncyk7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IGlmRXhwclxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb258T2JqZWN0fVxuICAgKi9cbiAgY29tcGlsZUlmRXhwcmVzc2lvbihpZkV4cHIpIHtcbiAgICBpZkV4cHIgPSAoaWZFeHByIHx8ICcnKTtcbiAgICB2YXIgbWF0Y2hlcyA9IGlmRXhwci5tYXRjaChSRVhfSU5URVJQT0xBVEVfU1lNQk9MKTtcblxuICAgIGlmIChtYXRjaGVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgZnVuY09iaiA9IHtcbiAgICAgIFtTVFJfRVZBTF9GVU5DVElPTl9TWU1CT0xdOiB0cnVlLFxuICAgICAgLy8gcmV0dXJuIHByaW1pdGl2ZSB2YWx1ZVxuICAgICAgYXJnczogWydkYXRhJywgJ3JldHVybiBkYXRhLicgKyBpZkV4cHIuc2xpY2UoMiwgLTIpICsgJzsnXVxuICAgIH07XG5cbiAgICByZXR1cm4gdGhpcy5wcmVDb21waWxlID8gZnVuY09iaiA6IGhlbHBlci5pbnZva2UoRnVuY3Rpb24sIGZ1bmNPYmouYXJncyk7XG4gIH1cblxuICAvKipcbiAgICogQHBhcmFtIHtTdHJpbmd9IHVubGVzc0V4cHJcbiAgICogQHJldHVybnMge0Z1bmN0aW9ufE9iamVjdH1cbiAgICovXG4gIGNvbXBpbGVVbmxlc3NFeHByZXNzaW9uKHVubGVzc0V4cHIpIHtcbiAgICB1bmxlc3NFeHByID0gKHVubGVzc0V4cHIgfHwgJycpO1xuICAgIHZhciBtYXRjaGVzID0gdW5sZXNzRXhwci5tYXRjaChSRVhfSU5URVJQT0xBVEVfU1lNQk9MKTtcblxuICAgIGlmIChtYXRjaGVzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgZnVuY09iaiA9IHtcbiAgICAgIFtTVFJfRVZBTF9GVU5DVElPTl9TWU1CT0xdOiB0cnVlLFxuICAgICAgLy8gcmV0dXJuIHByaW1pdGl2ZSB2YWx1ZVxuICAgICAgYXJnczogWydkYXRhJywgJ3JldHVybiBkYXRhLicgKyB1bmxlc3NFeHByLnNsaWNlKDIsIC0yKSArICc7J11cbiAgICB9O1xuXG4gICAgcmV0dXJuIHRoaXMucHJlQ29tcGlsZSA/IGZ1bmNPYmogOiBoZWxwZXIuaW52b2tlKEZ1bmN0aW9uLCBmdW5jT2JqLmFyZ3MpO1xuICB9XG59XG4iXX0=
