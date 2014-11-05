/*! Claylump - v0.0.6 */!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Claylump=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
var createElement = require("vdom/create-element")

module.exports = createElement

},{"vdom/create-element":10}],3:[function(require,module,exports){
var diff = require("vtree/diff")

module.exports = diff

},{"vtree/diff":16}],4:[function(require,module,exports){
var h = require("./h/index.js")

module.exports = h

},{"./h/index.js":5}],5:[function(require,module,exports){
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

},{"./parse-tag":6,"vtree/is-vnode":20,"vtree/is-vtext":21,"vtree/is-widget":22,"vtree/vnode.js":24,"vtree/vtext.js":26,"x-is-array":27,"x-is-string":28}],6:[function(require,module,exports){
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

},{"browser-split":7}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
module.exports = isObject

function isObject(x) {
    return typeof x === "object" && x !== null
}

},{}],9:[function(require,module,exports){
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

},{"is-object":8,"vtree/is-vhook":19}],10:[function(require,module,exports){
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

},{"./apply-properties":9,"global/document":12,"vtree/handle-thunk":17,"vtree/is-vnode":20,"vtree/is-vtext":21,"vtree/is-widget":22}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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
},{"min-document":1}],13:[function(require,module,exports){
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

},{"./apply-properties":9,"./create-element":10,"./update-widget":15,"vtree/is-widget":22,"vtree/vpatch":25}],14:[function(require,module,exports){
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

},{"./dom-index":11,"./patch-op":13,"global/document":12,"x-is-array":27}],15:[function(require,module,exports){
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

},{"vtree/is-widget":22}],16:[function(require,module,exports){
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

},{"./handle-thunk":17,"./is-thunk":18,"./is-vnode":20,"./is-vtext":21,"./is-widget":22,"./vpatch":25,"is-object":8,"x-is-array":27}],17:[function(require,module,exports){
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

},{"./is-thunk":18,"./is-vnode":20,"./is-vtext":21,"./is-widget":22}],18:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],19:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook && typeof hook.hook === "function" &&
        !hook.hasOwnProperty("hook")
}

},{}],20:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":23}],21:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":23}],22:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],23:[function(require,module,exports){
module.exports = "1"

},{}],24:[function(require,module,exports){
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

},{"./is-vhook":19,"./is-vnode":20,"./is-widget":22,"./version":23}],25:[function(require,module,exports){
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

},{"./version":23}],26:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":23}],27:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],28:[function(require,module,exports){
var toString = Object.prototype.toString

module.exports = isString

function isString(obj) {
    return toString.call(obj) === "[object String]"
}

},{}],29:[function(require,module,exports){
var patch = require("vdom/patch")

module.exports = patch

},{"vdom/patch":14}],30:[function(require,module,exports){
"use strict";

var ClayRegister = require('./register')["default"];
var helper = require('./helper')["default"];
var template = require('./template')["default"];
var templateHelper = require('./template-helper')["default"];
var element = require('./element')["default"];
var moduleRegistry = require('./module')["default"];
var modEvent = require('./modules/event')["default"];


/**
 * @class Claylump
 * @type {Object}
 */
module.exports = helper.mix(ClayRegister, {
  element: element,
  helper: helper,
  template: template,
  templateHelper: templateHelper,
  modules: moduleRegistry
});

moduleRegistry.register("DOMEventDelegate", modEvent);

},{"./element":31,"./helper":32,"./module":33,"./modules/event":34,"./register":35,"./template":37,"./template-helper":36}],31:[function(require,module,exports){
"use strict";

var _argumentsToArray = function (args) {
  var target = new Array(args.length);
  for (var i = 0; i < args.length; i++) {
    target[i] = args[i];
  }

  return target;
};

"use strict";

var helper = require('./helper')["default"];
var template = require('./template')["default"];
var moduleRegistry = require('./module')["default"];


var REGISTRY_CLAY_PROTOTYPES = {};

exports["default"] = {
  /**
   * @static
   * @param {String} name
   * @param {Object} proto
   * @returns {ClayElement}
   */
  create: function (name, proto) {
    var defaults = {
      /**
       * @private
       * @property {Document} _doc
       */
      _doc: document._currentScript ? document._currentScript.ownerDocument : document.currentScript ? document.currentScript.ownerDocument : document,
      /**
       * @private
       * @method {Function} _created
       */
      _created: helper.isFunction(proto.createdCallback) ? proto.createdCallback : helper.noop,
      /**
       * @private
       * @method {Function} _attached
       */
      _attached: helper.isFunction(proto.attachedCallback) ? proto.attachedCallback : helper.noop,
      /**
       * @private
       * @method {Function} _detached
       */
      _detached: helper.isFunction(proto.detachedCallback) ? proto.detachedCallback : helper.noop,
      /**
       * @private
       * @method {Function} _attrChanged
       */
      _attrChanged: helper.isFunction(proto.attributeChangedCallback) ? proto.attributeChangedCallback : helper.noop,
      /**
       * @private
       * @property {String} _html
       */
      _html: "",

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
      scope: {},

      /**
       * @property {Object.<string, function>} use
       */
      use: {}
    };

    // defaults
    helper.mix(proto, defaults);
    helper.mix(proto.use, {
      event: "DOMEventDelegate"
    });

    // dom ready required
    helper.ready(function () {
      var template = proto._doc.querySelector("[cl-element=\"" + name + "\"]");
      proto._html = template ? template.innerHTML : "";
    });

    // extends element
    var extendsProto;
    if (proto["extends"]) {
      // FIXME cannot use `is="x-child"` in `<template>`

      if (helper.isCustomElementName(proto["extends"]) && (extendsProto = getExtendee(proto["extends"]))) {
        // extends custom element
        // FIXME create baseElements prototype by deeply clone
        helper.mix(proto.scope, extendsProto.scope);
        helper.mix(proto.use, extendsProto.use);
        helper.mix(proto, extendsProto);
        proto.__super__ = extendsProto;
        extendsProto = HTMLElement.prototype;
      } else {
        extendsProto = Object.create(proto._doc.createElement(proto["extends"]).constructor).prototype;
      }
    } else {
      // new custom element
      extendsProto = HTMLElement.prototype;
    }

    // register prototype for extends
    REGISTRY_CLAY_PROTOTYPES[name] = helper.clone(proto);

    // mix claylump implementation
    helper.mix(proto, ClayElementImpl, true);

    return helper.mix(Object.create(extendsProto), proto);
  }
};


function getExtendee(name) {
  var proto = REGISTRY_CLAY_PROTOTYPES[name];
  if (!proto) {
    throw new Error("Could not extends `" + name + "`, because not registered");
  }
  return proto;
}

/**
 * @implements ClayElement
 */
var ClayElementImpl = {
  /**
   * inject utility with element instance
   *
   * @private
   */
  _injectUseObject: function () {
    var self = this, keys = Object.keys(this.use || {}), i = 0, alias, factory;

    while ((alias = keys[i++])) {
      if (self[alias]) {
        throw new Error("Conflict assign property `" + alias + "`!");
      }

      if (helper.isString(this.use[alias])) {
        factory = moduleRegistry.load([this.use[alias]]);
      } else if (helper.isFunction(this.use[alias])) {
        factory = this.use[alias];
      } else {
        throw new Error("Cannot detect module factory");
      }

      self[alias] = factory(this);
    }
  },

  /**
   * protect object reference in prototype.scope
   *
   * @private
   */
  _cloneScopeObjects: function () {
    var scope = this.scope, keys = Object.keys(scope), i = 0, key;

    while ((key = keys[i++])) {
      if (typeof scope[key] === "object") {
        // FIXME create own object|array by deeply clone
        scope[key] = helper.clone(scope[key]);
      }
    }
  },

  /**
   * shorthand of `template.invalidate()`
   */
  invalidate: function () {
    this.template.invalidate();
  },

  /**
   * children finder
   *
   * @param {String} selector
   * @returns {?Element|Array}
   */
  find: function (selector) {
    var found = helper.toArray(this.root.querySelectorAll(selector));

    if (found.length <= 1) {
      return found[0] || null;
    } else {
      return found;
    }
  },

  /**
   * closest parent helper
   *
   * @param {Element|Array} el
   * @param {String} selector
   * @returns {?Element|Array}
   */
  closestOf: function (el, selector) {
    var _this = this;
    if (helper.isArray(el)) {
      return el.map(function (e) {
        return _this.closestOf(e, selector);
      });
    }

    var current = /** @type {Element} */el.parentNode;
    do {
      if (current === this.root) {
        return null;
      }
      if (helper.matchElement(current, selector)) {
        return current;
      }
    } while ((current = current.parentNode));

    return null;
  },

  /**
   * an instance of the element is created
   * execute several initialize processes
   */
  createdCallback: function () {
    // create virtual template & actual dom
    this.createShadowRoot();
    this.template = template.create(this._html, this.scope); // TODO
    this.root = this.template.createElement(this._doc);
    if (!this.root) {
      this.root = this._doc.createElement("div");
    }

    // set root element
    this.shadowRoot.appendChild(this.root);
    this.template.drawLoop(this.root);

    // resolve use injection
    this._injectUseObject();

    // clone objects
    this._cloneScopeObjects();

    // original
    this._created.apply(this, arguments);
  },

  /**
   * an instance was inserted into the document
   * call original attached callback
   */
  attachedCallback: function () {
    this.delegateModuleCallbacks("attachedCallback");

    // original
    this._attached.apply(this, arguments);
  },

  /**
   * an instance was removed from the document
   * call original detached callback
   */
  detachedCallback: function () {
    this.delegateModuleCallbacks("detachedCallback");

    // original
    this._detached.apply(this, arguments);
  },

  /**
   * an attribute was added, removed, or updated
   * call original attr changed callback
   */
  attributeChangedCallback: function () {
    // original
    this._attrChanged.apply(this, arguments);
  },

  /**
   *
   * @param {String} callbackMethod
   */
  delegateModuleCallbacks: function (callbackMethod) {
    var aliases = Object.keys(this.use), alias, module, callback, i = 0;

    while ((alias = aliases[i++])) {
      module = this[alias];
      callback = module[callbackMethod];
      if (helper.isFunction(callback)) {
        callback.apply(module, [this]);
      }
    }
  },

  /**
   * call super element's methods
   *
   * @param {String} methodName
   * @param {...*} args
   */
  super: function (methodName) {
    var args = _argumentsToArray(arguments).slice(1);

    if (!this.__super__) {
      throw new Error("This element does not have the `__super__`");
    }

    var superMethod = this.__super__[methodName];

    if (helper.isFunction(superMethod)) {
      return superMethod.apply(this, args);
    } else {
      throw new Error("Does not exists method in super element specified: " + superMethod);
    }
  }
};

},{"./helper":32,"./module":33,"./template":37}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
"use strict";

var _classProps = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

"use strict";

var helper = require('./helper')["default"];
var ClayModule = (function () {
  var ClayModule = function ClayModule() {
    this.registry = [];
  };

  _classProps(ClayModule, null, {
    register: {
      writable: true,
      value: function (name, factory) {
        this.registry[name] = factory;
      }
    },
    load: {
      writable: true,
      value: function (name) {
        return this.registry[name];
      }
    }
  });

  return ClayModule;
})();

exports["default"] = new ClayModule();

},{"./helper":32}],34:[function(require,module,exports){
"use strict";

var _classProps = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

"use strict";

var helper = require('../helper')["default"];


var REX_EVENT_SPRITTER = /\s+/;

function factory(context) {
  return new ClayEvent(context.root, context.events || {});
}exports["default"] = factory;
var ClayEvent = (function () {
  var ClayEvent =
  /**
   * @param {Element} el
   * @param {Object} events
   * @constructor
   */
  function ClayEvent(el, events) {
    this.currentHandlers = [];
    this.setEl(el);
    this.setEvents(events);
  };

  _classProps(ClayEvent, null, {
    setEl: {
      writable: true,


      /**
       * event host element
       *
       * @property {Element} el
       */

      /**
       * backbone.js style `events` object
       *
       * @example
       *   events = {
       *     'click .foo': 'onClick',
       *     'click .bar': function(e) {
       *       // do something
       *     }
       *   }
       *
       * @property {Object.<string, (string|function)>} events
       */

      /**
       * @typedef {Object} DelegateInfo
       * @property {String} event - event type name
       * @property {Function} handler - event handler (bound & delegated)
       */

      /**
       * store current delegate info for using `disable()`
       *
       * @property {Function.<DelegateInfo>} currentHandler
       */

      /**
       * @param {Element} el
       */
      value: function (el) {
        this.el = el;
      }
    },
    setEvents: {
      writable: true,


      /**
       * @param {Object} events
       */
      value: function (events) {
        this.events = events;
      }
    },
    enable: {
      writable: true,


      /**
       * enable all delegate events
       * handlers pickup from given context object
       *
       * @param {Object} [context]
       */
      value: function (context) {
        var i = 0, keys = Object.keys(this.events), eventAndSelector, methodOrName, handler;

        context = context || this;

        while ((eventAndSelector = keys[i++])) {
          methodOrName = this.events[eventAndSelector];
          handler = helper.isFunction(methodOrName) ? methodOrName : context[methodOrName];
          eventAndSelector = eventAndSelector.split(REX_EVENT_SPRITTER);
          this.on(eventAndSelector[0], eventAndSelector[1], handler, context);
        }
      }
    },
    on: {
      writable: true,


      /**
       * assign event delegation
       *
       * @param {String} event
       * @param {String} selector
       * @param {Function} handler
       * @param {*} context
       */
      value: function (event, selector, handler, context) {
        var delegated = this.createHandler(selector, handler).bind(context);
        this.currentHandlers.push({
          event: event,
          handler: delegated
        });
        this.el.addEventListener(event, delegated, true);
      }
    },
    createHandler: {
      writable: true,


      /**
       * create delegated handler
       *
       * @param {String} selector
       * @param {Function} handler
       * @returns {Function}
       */
      value: function (selector, handler) {
        /**
         * @param {Event} evt
         */
        return function (evt) {
          var host = evt.currentTarget, target = evt.target;

          do {
            if (target === host) {
              // not delegate
              break;
            }
            if (helper.matchElement(target, selector)) {
              handler.apply(this, arguments);
              break;
            }
          } while ((target = target.parentNode));
        };
      }
    },
    emit: {
      writable: true,


      /**
       * emit events to specified target element
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/Events
       * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
       * @see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
       * @see https://developer.mozilla.org/en-US/docs/Web/API/FocusEvent
       *
       * @param {Element|Array} target
       * @param {String} type
       * @param {Object} [options]
       * @param {Boolean} [bubble=false]
       * @param {Boolean} [cancel=true]
       */
      value: function (target, type, options, bubble, cancel) {
        var _this = this;
        if (options === undefined) options = {};
        if (bubble === undefined) bubble = false;
        if (cancel === undefined) cancel = true;
        if (helper.isArray(target)) {
          helper.toArray(target).forEach(function (el) {
            return _this.emit(el, type, options, bubble, cancel);
          });
          return;
        }

        var event;
        helper.mix(options, {
          canBubble: bubble,
          cancelable: cancel,
          view: window
        });

        switch (type) {
          case "click":
          case "dbclick":
          case "mouseover":
          case "mousemove":
          case "mouseout":
          case "mouseup":
          case "mousedown":
          case "mouseenter":
          case "mouseleave":
          case "contextmenu":
            event = new MouseEvent(type, options);
            break;
          case "focus":
          case "blur":
          case "focusin":
          case "focusout":
            event = new FocusEvent(type, options); // TODO implemented in any env?
            break;
          case "keyup":
          case "keydown":
          case "keypress":
            event = new KeyboardEvent(type, options);
            break;
          default:
            event = new Event(type, options);
            break;
        }

        target.dispatchEvent(event);
      }
    },
    disable: {
      writable: true,


      /**
       * disable all delegated events
       */
      value: function () {
        var i = 0, obj;
        while ((obj = this.currentHandlers[i++])) {
          this.el.removeEventListener(obj.event, obj.handler, true);
        }
        this.currentHandlers = [];
      }
    },
    attachedCallback: {
      writable: true,
      value: function (context) {
        this.enable(context);
      }
    },
    detachedCallback: {
      writable: true,
      value: function (context) {
        this.disable(context);
      }
    }
  });

  return ClayEvent;
})();

},{"../helper":32}],35:[function(require,module,exports){
"use strict";

var element = require('./element')["default"];
var helper = require('./helper')["default"];


var REGISTRY_CLAY_ELEMENTS = {};

/**
 * @param {String} name
 * @param {Object} [proto]
 */
function ClayRegister(name, proto) {
  if (proto === undefined) proto = {};


  if (REGISTRY_CLAY_ELEMENTS[name]) {
    // already registered
    return;
  }

  var options = {
    prototype: element.create(name, proto)
  };

  if (proto["extends"] && !helper.isCustomElementName(proto["extends"])) {
    options["extends"] = proto["extends"];
  }

  REGISTRY_CLAY_ELEMENTS[name] = document.registerElement(name, options);
}

exports["default"] = ClayRegister;

},{"./element":31,"./helper":32}],36:[function(require,module,exports){
"use strict";

var helper = require("./helper")["default"];
exports["default"] = {
  register: function (name, func) {
    this[name] = func;
  }
};

},{"./helper":32}],37:[function(require,module,exports){
"use strict";

var _classProps = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

"use strict";

var h = require('virtual-dom/h');

var diff = require('virtual-dom/diff');

var patch = require('virtual-dom/patch');

var create = require('virtual-dom/create-element');

var helper = require("./helper")["default"];
var tmplHelper = require("./template-helper")["default"];


window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;

var STR_EVAL_FUNCTION_SYMBOL = "__EVAL_FUNCTION__";

exports["default"] = {
  /**
   * @static
   * @param {String} html
   * @param {Object} [scope]
   * @returns {ClayTemplate}
   */
  create: function (html, scope) {
    return new ClayTemplate(html, scope);
  }
};
var ClayTemplate = (function () {
  var ClayTemplate =

  /**
   *
   * @param {String} html
   * @param {Object} [scope]
   * @constructor
   */
  function ClayTemplate(html, scope) {
    if (scope === undefined) scope = {};
    this._diffQueue = [];
    this._invalidated = false;

    this.scope = scope;

    try {
      this.compiled = JSON.parse(html, function (key, val) {
        if ((val || {})[STR_EVAL_FUNCTION_SYMBOL]) {
          return helper.invoke(Function, val.args);
        }
        return val;
      });
    } catch (e) {
      if (!window.ClayRuntime) {
        throw new Error("Require runtime library for template compiling");
      }
      var compiler = window.ClayRuntime.compiler.create();
      this.compiled = compiler.compileFromHtml(html);
    }
  };

  _classProps(ClayTemplate, null, {
    createVTree: {
      writable: true,


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
      value: function () {
        return this._currentVTree = convertParsedDomToVTree(this.compiled, this.scope);
      }
    },
    createElement: {
      writable: true,


      /**
       * create Element from VirtualNode
       *
       * @param {Document} [doc]
       * @returns {?Element}
       */
      value: function (doc) {
        var _this = this;
        if (doc === undefined) doc = document;
        return (function () {
          return create(_this.createVTree(), {
            document: doc
          });
        })();
      }
    },
    invalidate: {
      writable: true,


      /**
       * invalidate scope VirtualNode needs updating diff
       * No matter how many times as was called
       * it is called only once in browser's next event loop
       */
      value: function () {
        if (this._invalidated) {
          return;
        }
        this._invalidated = true;
        setTimeout(this._update.bind(this), 4);
      }
    },
    _update: {
      writable: true,


      /**
       * compute VirtualNode diff
       *
       * @private
       */
      value: function () {
        var current = this._currentVTree, updated = convertParsedDomToVTree(this.compiled, this.scope);

        this._diffQueue = diff(current, updated);
        this._currentVTree = updated;

        this._invalidated = false;
      }
    },
    drawLoop: {
      writable: true,


      /**
       * drawing requestAnimationFrame loop
       * apply patch for dom when diff exists
       *
       * @param {Element} targetRoot
       */
      value: function (targetRoot) {
        var _this2 = this;
        var patchDOM = function () {
          if (_this2._diffQueue) {
            patch(targetRoot, _this2._diffQueue);
            _this2._diffQueue = null;
          }
          window.requestAnimationFrame(patchDOM);
        };

        patchDOM();
      }
    },
    destroy: {
      writable: true,


      /**
       * destruct property references
       */
      value: function () {
        this.scope = this.compiled = null;
      }
    }
  });

  return ClayTemplate;
})();

/**
 * convert to VirtualNode from DomStructure
 *
 * @param {DomStructure} dom
 * @param {Object} scope
 * @param {Boolean} [ignoreRepeat]
 * @returns {VirtualNode}
 */
function convertParsedDomToVTree(dom, scope, ignoreRepeat) {
  var tag = dom.name, type = dom.type, data = dom.data, orgAttrs = dom.attribs || {}, orgStyle = dom.style || "", children = dom.children || [], evals = dom.evaluators, attrs = {}, style = {}, hooks = {}, keys, key, i = 0;

  switch (type) {
    case "tag":

      // if detection
      if (evals["if"] && !evals["if"](scope)) {
        return null;
      }

      // unless detection
      if (evals.unless && evals.unless(scope)) {
        return null;
      }

      // repeat elements
      if (evals.repeat && !ignoreRepeat) {
        return evals.repeat(scope).map(function (childScope) {
          return convertParsedDomToVTree(dom, childScope, true);
        });
      }

      // eval styles
      if (orgStyle) {
        style = evals.style ? evals.style(scope) : orgStyle;
        style = convertCssStringToObject(style);
      }

      // eval attributes
      keys = Object.keys(orgAttrs);
      while ((key = keys[i++])) {
        attrs[key] = evals.attrs[key] ? evals.attrs[key](scope) : orgAttrs[key];
        if (tmplHelper[key]) {
          hooks[key] = hook(tmplHelper[key], attrs[key]); // TODO enhancement
        }
      }

      // flatten children
      children = children.map(function (child) {
        return convertParsedDomToVTree(child, scope);
      }).filter(function (v) {
        return !!v;
      });
      children = helper.flatten(children);

      // create VTree
      return h(tag, helper.mix({
        attributes: attrs,
        style: style
      }, hooks), children);

    case "text":
      // eval text
      return String(evals.data ? evals.data(scope) : data);

    case "comment":
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
  var cssStrings = cssStr.replace(/\s/g, "").split(";"), retStyle = {}, i = 0, prop_value;

  while ((prop_value = cssStrings[i++])) {
    prop_value = prop_value.split(":");
    retStyle[prop_value[0]] = prop_value[1];
  }

  return retStyle;
}

var HookWrapper = (function () {
  var HookWrapper = function HookWrapper(fn, val) {
    this.fn = fn;
    this.val = val;
  };

  _classProps(HookWrapper, null, {
    hook: {
      writable: true,
      value: function () {
        this.fn.apply(this, [this.val].concat(helper.toArray(arguments)));
      }
    }
  });

  return HookWrapper;
})();

/**
 * @param {Function} fn
 * @param {*} val
 * @returns {HookWrapper}
 * @constructor
 */
function hook(fn, val) {
  return new HookWrapper(fn, val);
}

},{"./helper":32,"./template-helper":36,"virtual-dom/create-element":2,"virtual-dom/diff":3,"virtual-dom/h":4,"virtual-dom/patch":29}]},{},[30])(30)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2NyZWF0ZS1lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2RpZmYuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vaC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9oL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2gvcGFyc2UtdGFnLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy9icm93c2VyLXNwbGl0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy9pcy1vYmplY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vYXBwbHktcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdmRvbS9jcmVhdGUtZWxlbWVudC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdmRvbS9kb20taW5kZXguanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Zkb20vbm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdmRvbS9wYXRjaC1vcC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdmRvbS9wYXRjaC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdmRvbS91cGRhdGUtd2lkZ2V0LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS9kaWZmLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS9oYW5kbGUtdGh1bmsuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXRodW5rLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS9pcy12aG9vay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdm5vZGUuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXZ0ZXh0LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS9pcy13aWRnZXQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL3ZlcnNpb24uanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL3Zub2RlLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy92dHJlZS92cGF0Y2guanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3Z0cmVlL3Z0ZXh0LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy94LWlzLWFycmF5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy94LWlzLXN0cmluZy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9wYXRjaC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy9faW5kZXguanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvZWxlbWVudC5qcyIsIi9Vc2Vycy9hMTMwNDIvRHJvcGJveC9QbGF5Z3JvdW5kL0NsYXlsdW1wL3NyYy9oZWxwZXIuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvbW9kdWxlLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvc3JjL21vZHVsZXMvZXZlbnQuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvcmVnaXN0ZXIuanMiLCIvVXNlcnMvYTEzMDQyL0Ryb3Bib3gvUGxheWdyb3VuZC9DbGF5bHVtcC9zcmMvdGVtcGxhdGUtaGVscGVyLmpzIiwiL1VzZXJzL2ExMzA0Mi9Ecm9wYm94L1BsYXlncm91bmQvQ2xheWx1bXAvc3JjL3RlbXBsYXRlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFD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LFNBQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNyQyxjQUFVLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNuQyxZQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0dBQ3pDOztBQUVELFNBQU8sUUFBUSxDQUFDO0NBQ2pCOztJQVNLLFdBQVc7TUFBWCxXQUFXLEdBRUosU0FGUCxXQUFXLENBRUgsRUFBRSxFQUFFLEdBQUcsRUFBRTtBQUNuQixRQUFJLENBQUMsRUFBRSxHQUFJLEVBQUUsQ0FBQztBQUNkLFFBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0dBQ2hCOztjQUxHLFdBQVc7QUFPZixRQUFJOzthQUFBLFlBQUc7QUFDTCxZQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ25FOzs7O1NBVEcsV0FBVzs7Ozs7Ozs7O0FBa0JqQixTQUFTLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFO0FBQ3JCLFNBQU8sSUFBSSxXQUFXLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0NBQ2hDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsbnVsbCwidmFyIGNyZWF0ZUVsZW1lbnQgPSByZXF1aXJlKFwidmRvbS9jcmVhdGUtZWxlbWVudFwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUVsZW1lbnRcbiIsInZhciBkaWZmID0gcmVxdWlyZShcInZ0cmVlL2RpZmZcIilcblxubW9kdWxlLmV4cG9ydHMgPSBkaWZmXG4iLCJ2YXIgaCA9IHJlcXVpcmUoXCIuL2gvaW5kZXguanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBoXG4iLCJ2YXIgaXNBcnJheSA9IHJlcXVpcmUoXCJ4LWlzLWFycmF5XCIpXG52YXIgaXNTdHJpbmcgPSByZXF1aXJlKFwieC1pcy1zdHJpbmdcIilcblxudmFyIFZOb2RlID0gcmVxdWlyZShcInZ0cmVlL3Zub2RlLmpzXCIpXG52YXIgVlRleHQgPSByZXF1aXJlKFwidnRyZWUvdnRleHQuanNcIilcbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcInZ0cmVlL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcInZ0cmVlL2lzLXdpZGdldFwiKVxuXG52YXIgcGFyc2VUYWcgPSByZXF1aXJlKFwiLi9wYXJzZS10YWdcIilcblxubW9kdWxlLmV4cG9ydHMgPSBoXG5cbmZ1bmN0aW9uIGgodGFnTmFtZSwgcHJvcGVydGllcywgY2hpbGRyZW4pIHtcbiAgICB2YXIgdGFnLCBwcm9wcywgY2hpbGROb2Rlcywga2V5XG5cbiAgICBpZiAoIWNoaWxkcmVuKSB7XG4gICAgICAgIGlmIChpc0NoaWxkcmVuKHByb3BlcnRpZXMpKSB7XG4gICAgICAgICAgICBjaGlsZHJlbiA9IHByb3BlcnRpZXNcbiAgICAgICAgICAgIHByb3BlcnRpZXMgPSB1bmRlZmluZWRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRhZyA9IHBhcnNlVGFnKHRhZ05hbWUsIHByb3BlcnRpZXMpXG5cbiAgICBpZiAoIWlzU3RyaW5nKHRhZykpIHtcbiAgICAgICAgcHJvcHMgPSB0YWcucHJvcGVydGllc1xuICAgICAgICB0YWcgPSB0YWcudGFnTmFtZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHByb3BzID0gcHJvcGVydGllc1xuICAgIH1cblxuICAgIGlmIChpc0FycmF5KGNoaWxkcmVuKSkge1xuICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgICAgIGlmIChpc1N0cmluZyhjaGlsZCkpIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbltpXSA9IG5ldyBWVGV4dChjaGlsZClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNoaWxkTm9kZXMgPSBjaGlsZHJlblxuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoY2hpbGRyZW4pKSB7XG4gICAgICAgIGNoaWxkTm9kZXMgPSBbbmV3IFZUZXh0KGNoaWxkcmVuKV1cbiAgICB9IGVsc2UgaWYgKGlzQ2hpbGQoY2hpbGRyZW4pKSB7XG4gICAgICAgIGNoaWxkTm9kZXMgPSBbY2hpbGRyZW5dXG4gICAgfVxuXG4gICAgaWYgKHByb3BzICYmIFwia2V5XCIgaW4gcHJvcHMpIHtcbiAgICAgICAga2V5ID0gcHJvcHMua2V5XG4gICAgICAgIGRlbGV0ZSBwcm9wcy5rZXlcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFZOb2RlKHRhZywgcHJvcHMsIGNoaWxkTm9kZXMsIGtleSlcbn1cblxuZnVuY3Rpb24gaXNDaGlsZCh4KSB7XG4gICAgcmV0dXJuIGlzVk5vZGUoeCkgfHwgaXNWVGV4dCh4KSB8fCBpc1dpZGdldCh4KVxufVxuXG5mdW5jdGlvbiBpc0NoaWxkcmVuKHgpIHtcbiAgICByZXR1cm4gaXNBcnJheSh4KSB8fCBpc1N0cmluZyh4KSB8fCBpc0NoaWxkKHgpXG59XG4iLCJ2YXIgc3BsaXQgPSByZXF1aXJlKFwiYnJvd3Nlci1zcGxpdFwiKVxuXG52YXIgY2xhc3NJZFNwbGl0ID0gLyhbXFwuI10/W2EtekEtWjAtOV86LV0rKS9cbnZhciBub3RDbGFzc0lkID0gL15cXC58Iy9cblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZVRhZ1xuXG5mdW5jdGlvbiBwYXJzZVRhZyh0YWcsIHByb3BzKSB7XG4gICAgaWYgKCF0YWcpIHtcbiAgICAgICAgcmV0dXJuIFwiZGl2XCJcbiAgICB9XG5cbiAgICB2YXIgbm9JZCA9ICFwcm9wcyB8fCAhKFwiaWRcIiBpbiBwcm9wcylcblxuICAgIHZhciB0YWdQYXJ0cyA9IHNwbGl0KHRhZywgY2xhc3NJZFNwbGl0KVxuICAgIHZhciB0YWdOYW1lID0gbnVsbFxuXG4gICAgaWYobm90Q2xhc3NJZC50ZXN0KHRhZ1BhcnRzWzFdKSkge1xuICAgICAgICB0YWdOYW1lID0gXCJkaXZcIlxuICAgIH1cblxuICAgIHZhciBpZCwgY2xhc3NlcywgcGFydCwgdHlwZSwgaVxuICAgIGZvciAoaSA9IDA7IGkgPCB0YWdQYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJ0ID0gdGFnUGFydHNbaV1cblxuICAgICAgICBpZiAoIXBhcnQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICB0eXBlID0gcGFydC5jaGFyQXQoMClcblxuICAgICAgICBpZiAoIXRhZ05hbWUpIHtcbiAgICAgICAgICAgIHRhZ05hbWUgPSBwYXJ0XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCIuXCIpIHtcbiAgICAgICAgICAgIGNsYXNzZXMgPSBjbGFzc2VzIHx8IFtdXG4gICAgICAgICAgICBjbGFzc2VzLnB1c2gocGFydC5zdWJzdHJpbmcoMSwgcGFydC5sZW5ndGgpKVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwiI1wiICYmIG5vSWQpIHtcbiAgICAgICAgICAgIGlkID0gcGFydC5zdWJzdHJpbmcoMSwgcGFydC5sZW5ndGgpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcGFyc2VkVGFnc1xuXG4gICAgaWYgKHByb3BzKSB7XG4gICAgICAgIGlmIChpZCAhPT0gdW5kZWZpbmVkICYmICEoXCJpZFwiIGluIHByb3BzKSkge1xuICAgICAgICAgICAgcHJvcHMuaWQgPSBpZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNsYXNzZXMpIHtcbiAgICAgICAgICAgIGlmIChwcm9wcy5jbGFzc05hbWUpIHtcbiAgICAgICAgICAgICAgICBjbGFzc2VzLnB1c2gocHJvcHMuY2xhc3NOYW1lKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcm9wcy5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oXCIgXCIpXG4gICAgICAgIH1cblxuICAgICAgICBwYXJzZWRUYWdzID0gdGFnTmFtZVxuICAgIH0gZWxzZSBpZiAoY2xhc3NlcyB8fCBpZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHZhciBwcm9wZXJ0aWVzID0ge31cblxuICAgICAgICBpZiAoaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcHJvcGVydGllcy5pZCA9IGlkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2xhc3Nlcykge1xuICAgICAgICAgICAgcHJvcGVydGllcy5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oXCIgXCIpXG4gICAgICAgIH1cblxuICAgICAgICBwYXJzZWRUYWdzID0ge1xuICAgICAgICAgICAgdGFnTmFtZTogdGFnTmFtZSxcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHByb3BlcnRpZXNcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnNlZFRhZ3MgPSB0YWdOYW1lXG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlZFRhZ3Ncbn1cbiIsIi8qIVxuICogQ3Jvc3MtQnJvd3NlciBTcGxpdCAxLjEuMVxuICogQ29weXJpZ2h0IDIwMDctMjAxMiBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT5cbiAqIEF2YWlsYWJsZSB1bmRlciB0aGUgTUlUIExpY2Vuc2VcbiAqIEVDTUFTY3JpcHQgY29tcGxpYW50LCB1bmlmb3JtIGNyb3NzLWJyb3dzZXIgc3BsaXQgbWV0aG9kXG4gKi9cblxuLyoqXG4gKiBTcGxpdHMgYSBzdHJpbmcgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzIHVzaW5nIGEgcmVnZXggb3Igc3RyaW5nIHNlcGFyYXRvci4gTWF0Y2hlcyBvZiB0aGVcbiAqIHNlcGFyYXRvciBhcmUgbm90IGluY2x1ZGVkIGluIHRoZSByZXN1bHQgYXJyYXkuIEhvd2V2ZXIsIGlmIGBzZXBhcmF0b3JgIGlzIGEgcmVnZXggdGhhdCBjb250YWluc1xuICogY2FwdHVyaW5nIGdyb3VwcywgYmFja3JlZmVyZW5jZXMgYXJlIHNwbGljZWQgaW50byB0aGUgcmVzdWx0IGVhY2ggdGltZSBgc2VwYXJhdG9yYCBpcyBtYXRjaGVkLlxuICogRml4ZXMgYnJvd3NlciBidWdzIGNvbXBhcmVkIHRvIHRoZSBuYXRpdmUgYFN0cmluZy5wcm90b3R5cGUuc3BsaXRgIGFuZCBjYW4gYmUgdXNlZCByZWxpYWJseVxuICogY3Jvc3MtYnJvd3Nlci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgU3RyaW5nIHRvIHNwbGl0LlxuICogQHBhcmFtIHtSZWdFeHB8U3RyaW5nfSBzZXBhcmF0b3IgUmVnZXggb3Igc3RyaW5nIHRvIHVzZSBmb3Igc2VwYXJhdGluZyB0aGUgc3RyaW5nLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtsaW1pdF0gTWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gaW5jbHVkZSBpbiB0aGUgcmVzdWx0IGFycmF5LlxuICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJzdHJpbmdzLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBCYXNpYyB1c2VcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnKTtcbiAqIC8vIC0+IFsnYScsICdiJywgJ2MnLCAnZCddXG4gKlxuICogLy8gV2l0aCBsaW1pdFxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcsIDIpO1xuICogLy8gLT4gWydhJywgJ2InXVxuICpcbiAqIC8vIEJhY2tyZWZlcmVuY2VzIGluIHJlc3VsdCBhcnJheVxuICogc3BsaXQoJy4ud29yZDEgd29yZDIuLicsIC8oW2Etel0rKShcXGQrKS9pKTtcbiAqIC8vIC0+IFsnLi4nLCAnd29yZCcsICcxJywgJyAnLCAnd29yZCcsICcyJywgJy4uJ11cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gc3BsaXQodW5kZWYpIHtcblxuICB2YXIgbmF0aXZlU3BsaXQgPSBTdHJpbmcucHJvdG90eXBlLnNwbGl0LFxuICAgIGNvbXBsaWFudEV4ZWNOcGNnID0gLygpPz8vLmV4ZWMoXCJcIilbMV0gPT09IHVuZGVmLFxuICAgIC8vIE5QQ0c6IG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3VwXG4gICAgc2VsZjtcblxuICBzZWxmID0gZnVuY3Rpb24oc3RyLCBzZXBhcmF0b3IsIGxpbWl0KSB7XG4gICAgLy8gSWYgYHNlcGFyYXRvcmAgaXMgbm90IGEgcmVnZXgsIHVzZSBgbmF0aXZlU3BsaXRgXG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzZXBhcmF0b3IpICE9PSBcIltvYmplY3QgUmVnRXhwXVwiKSB7XG4gICAgICByZXR1cm4gbmF0aXZlU3BsaXQuY2FsbChzdHIsIHNlcGFyYXRvciwgbGltaXQpO1xuICAgIH1cbiAgICB2YXIgb3V0cHV0ID0gW10sXG4gICAgICBmbGFncyA9IChzZXBhcmF0b3IuaWdub3JlQ2FzZSA/IFwiaVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLm11bHRpbGluZSA/IFwibVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLmV4dGVuZGVkID8gXCJ4XCIgOiBcIlwiKSArIC8vIFByb3Bvc2VkIGZvciBFUzZcbiAgICAgIChzZXBhcmF0b3Iuc3RpY2t5ID8gXCJ5XCIgOiBcIlwiKSxcbiAgICAgIC8vIEZpcmVmb3ggMytcbiAgICAgIGxhc3RMYXN0SW5kZXggPSAwLFxuICAgICAgLy8gTWFrZSBgZ2xvYmFsYCBhbmQgYXZvaWQgYGxhc3RJbmRleGAgaXNzdWVzIGJ5IHdvcmtpbmcgd2l0aCBhIGNvcHlcbiAgICAgIHNlcGFyYXRvciA9IG5ldyBSZWdFeHAoc2VwYXJhdG9yLnNvdXJjZSwgZmxhZ3MgKyBcImdcIiksXG4gICAgICBzZXBhcmF0b3IyLCBtYXRjaCwgbGFzdEluZGV4LCBsYXN0TGVuZ3RoO1xuICAgIHN0ciArPSBcIlwiOyAvLyBUeXBlLWNvbnZlcnRcbiAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnKSB7XG4gICAgICAvLyBEb2Vzbid0IG5lZWQgZmxhZ3MgZ3ksIGJ1dCB0aGV5IGRvbid0IGh1cnRcbiAgICAgIHNlcGFyYXRvcjIgPSBuZXcgUmVnRXhwKFwiXlwiICsgc2VwYXJhdG9yLnNvdXJjZSArIFwiJCg/IVxcXFxzKVwiLCBmbGFncyk7XG4gICAgfVxuICAgIC8qIFZhbHVlcyBmb3IgYGxpbWl0YCwgcGVyIHRoZSBzcGVjOlxuICAgICAqIElmIHVuZGVmaW5lZDogNDI5NDk2NzI5NSAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgICogSWYgMCwgSW5maW5pdHksIG9yIE5hTjogMFxuICAgICAqIElmIHBvc2l0aXZlIG51bWJlcjogbGltaXQgPSBNYXRoLmZsb29yKGxpbWl0KTsgaWYgKGxpbWl0ID4gNDI5NDk2NzI5NSkgbGltaXQgLT0gNDI5NDk2NzI5NjtcbiAgICAgKiBJZiBuZWdhdGl2ZSBudW1iZXI6IDQyOTQ5NjcyOTYgLSBNYXRoLmZsb29yKE1hdGguYWJzKGxpbWl0KSlcbiAgICAgKiBJZiBvdGhlcjogVHlwZS1jb252ZXJ0LCB0aGVuIHVzZSB0aGUgYWJvdmUgcnVsZXNcbiAgICAgKi9cbiAgICBsaW1pdCA9IGxpbWl0ID09PSB1bmRlZiA/IC0xID4+PiAwIDogLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgIGxpbWl0ID4+PiAwOyAvLyBUb1VpbnQzMihsaW1pdClcbiAgICB3aGlsZSAobWF0Y2ggPSBzZXBhcmF0b3IuZXhlYyhzdHIpKSB7XG4gICAgICAvLyBgc2VwYXJhdG9yLmxhc3RJbmRleGAgaXMgbm90IHJlbGlhYmxlIGNyb3NzLWJyb3dzZXJcbiAgICAgIGxhc3RJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgaWYgKGxhc3RJbmRleCA+IGxhc3RMYXN0SW5kZXgpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgIC8vIEZpeCBicm93c2VycyB3aG9zZSBgZXhlY2AgbWV0aG9kcyBkb24ndCBjb25zaXN0ZW50bHkgcmV0dXJuIGB1bmRlZmluZWRgIGZvclxuICAgICAgICAvLyBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cHNcbiAgICAgICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZyAmJiBtYXRjaC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWF0Y2hbMF0ucmVwbGFjZShzZXBhcmF0b3IyLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzW2ldID09PSB1bmRlZikge1xuICAgICAgICAgICAgICAgIG1hdGNoW2ldID0gdW5kZWY7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaC5pbmRleCA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShvdXRwdXQsIG1hdGNoLnNsaWNlKDEpKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0TGVuZ3RoID0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICBsYXN0TGFzdEluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgICBpZiAob3V0cHV0Lmxlbmd0aCA+PSBsaW1pdCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2VwYXJhdG9yLmxhc3RJbmRleCA9PT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgc2VwYXJhdG9yLmxhc3RJbmRleCsrOyAvLyBBdm9pZCBhbiBpbmZpbml0ZSBsb29wXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChsYXN0TGFzdEluZGV4ID09PSBzdHIubGVuZ3RoKSB7XG4gICAgICBpZiAobGFzdExlbmd0aCB8fCAhc2VwYXJhdG9yLnRlc3QoXCJcIikpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goXCJcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4KSk7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQubGVuZ3RoID4gbGltaXQgPyBvdXRwdXQuc2xpY2UoMCwgbGltaXQpIDogb3V0cHV0O1xuICB9O1xuXG4gIHJldHVybiBzZWxmO1xufSkoKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gaXNPYmplY3RcblxuZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gXCJvYmplY3RcIiAmJiB4ICE9PSBudWxsXG59XG4iLCJ2YXIgaXNPYmplY3QgPSByZXF1aXJlKFwiaXMtb2JqZWN0XCIpXG52YXIgaXNIb29rID0gcmVxdWlyZShcInZ0cmVlL2lzLXZob29rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gYXBwbHlQcm9wZXJ0aWVzXG5cbmZ1bmN0aW9uIGFwcGx5UHJvcGVydGllcyhub2RlLCBwcm9wcywgcHJldmlvdXMpIHtcbiAgICBmb3IgKHZhciBwcm9wTmFtZSBpbiBwcm9wcykge1xuICAgICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdXG5cbiAgICAgICAgaWYgKHByb3BWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZW1vdmVQcm9wZXJ0eShub2RlLCBwcm9wcywgcHJldmlvdXMsIHByb3BOYW1lKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0hvb2socHJvcFZhbHVlKSkge1xuICAgICAgICAgICAgcHJvcFZhbHVlLmhvb2sobm9kZSxcbiAgICAgICAgICAgICAgICBwcm9wTmFtZSxcbiAgICAgICAgICAgICAgICBwcmV2aW91cyA/IHByZXZpb3VzW3Byb3BOYW1lXSA6IHVuZGVmaW5lZClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc09iamVjdChwcm9wVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcGF0Y2hPYmplY3Qobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSwgcHJvcFZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHByb3BWYWx1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVQcm9wZXJ0eShub2RlLCBwcm9wcywgcHJldmlvdXMsIHByb3BOYW1lKSB7XG4gICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgIHZhciBwcmV2aW91c1ZhbHVlID0gcHJldmlvdXNbcHJvcE5hbWVdXG5cbiAgICAgICAgaWYgKCFpc0hvb2socHJldmlvdXNWYWx1ZSkpIHtcbiAgICAgICAgICAgIGlmIChwcm9wTmFtZSA9PT0gXCJhdHRyaWJ1dGVzXCIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhdHRyTmFtZSBpbiBwcmV2aW91c1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcE5hbWUgPT09IFwic3R5bGVcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcHJldmlvdXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnN0eWxlW2ldID0gXCJcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByZXZpb3VzVmFsdWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBub2RlW3Byb3BOYW1lXSA9IFwiXCJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHBhdGNoT2JqZWN0KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUsIHByb3BWYWx1ZSkge1xuICAgIHZhciBwcmV2aW91c1ZhbHVlID0gcHJldmlvdXMgPyBwcmV2aW91c1twcm9wTmFtZV0gOiB1bmRlZmluZWRcblxuICAgIC8vIFNldCBhdHRyaWJ1dGVzXG4gICAgaWYgKHByb3BOYW1lID09PSBcImF0dHJpYnV0ZXNcIikge1xuICAgICAgICBmb3IgKHZhciBhdHRyTmFtZSBpbiBwcm9wVmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBhdHRyVmFsdWUgPSBwcm9wVmFsdWVbYXR0ck5hbWVdXG5cbiAgICAgICAgICAgIGlmIChhdHRyVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgYXR0clZhbHVlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYocHJldmlvdXNWYWx1ZSAmJiBpc09iamVjdChwcmV2aW91c1ZhbHVlKSAmJlxuICAgICAgICBnZXRQcm90b3R5cGUocHJldmlvdXNWYWx1ZSkgIT09IGdldFByb3RvdHlwZShwcm9wVmFsdWUpKSB7XG4gICAgICAgIG5vZGVbcHJvcE5hbWVdID0gcHJvcFZhbHVlXG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICghaXNPYmplY3Qobm9kZVtwcm9wTmFtZV0pKSB7XG4gICAgICAgIG5vZGVbcHJvcE5hbWVdID0ge31cbiAgICB9XG5cbiAgICB2YXIgcmVwbGFjZXIgPSBwcm9wTmFtZSA9PT0gXCJzdHlsZVwiID8gXCJcIiA6IHVuZGVmaW5lZFxuXG4gICAgZm9yICh2YXIgayBpbiBwcm9wVmFsdWUpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcHJvcFZhbHVlW2tdXG4gICAgICAgIG5vZGVbcHJvcE5hbWVdW2tdID0gKHZhbHVlID09PSB1bmRlZmluZWQpID8gcmVwbGFjZXIgOiB2YWx1ZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJvdG90eXBlKHZhbHVlKSB7XG4gICAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKVxuICAgIH0gZWxzZSBpZiAodmFsdWUuX19wcm90b19fKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5fX3Byb3RvX19cbiAgICB9IGVsc2UgaWYgKHZhbHVlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGVcbiAgICB9XG59XG4iLCJ2YXIgZG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG5cbnZhciBhcHBseVByb3BlcnRpZXMgPSByZXF1aXJlKFwiLi9hcHBseS1wcm9wZXJ0aWVzXCIpXG5cbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcInZ0cmVlL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcInZ0cmVlL2lzLXdpZGdldFwiKVxudmFyIGhhbmRsZVRodW5rID0gcmVxdWlyZShcInZ0cmVlL2hhbmRsZS10aHVua1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUVsZW1lbnRcblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh2bm9kZSwgb3B0cykge1xuICAgIHZhciBkb2MgPSBvcHRzID8gb3B0cy5kb2N1bWVudCB8fCBkb2N1bWVudCA6IGRvY3VtZW50XG4gICAgdmFyIHdhcm4gPSBvcHRzID8gb3B0cy53YXJuIDogbnVsbFxuXG4gICAgdm5vZGUgPSBoYW5kbGVUaHVuayh2bm9kZSkuYVxuXG4gICAgaWYgKGlzV2lkZ2V0KHZub2RlKSkge1xuICAgICAgICByZXR1cm4gdm5vZGUuaW5pdCgpXG4gICAgfSBlbHNlIGlmIChpc1ZUZXh0KHZub2RlKSkge1xuICAgICAgICByZXR1cm4gZG9jLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpXG4gICAgfSBlbHNlIGlmICghaXNWTm9kZSh2bm9kZSkpIHtcbiAgICAgICAgaWYgKHdhcm4pIHtcbiAgICAgICAgICAgIHdhcm4oXCJJdGVtIGlzIG5vdCBhIHZhbGlkIHZpcnR1YWwgZG9tIG5vZGVcIiwgdm5vZGUpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9ICh2bm9kZS5uYW1lc3BhY2UgPT09IG51bGwpID9cbiAgICAgICAgZG9jLmNyZWF0ZUVsZW1lbnQodm5vZGUudGFnTmFtZSkgOlxuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudE5TKHZub2RlLm5hbWVzcGFjZSwgdm5vZGUudGFnTmFtZSlcblxuICAgIHZhciBwcm9wcyA9IHZub2RlLnByb3BlcnRpZXNcbiAgICBhcHBseVByb3BlcnRpZXMobm9kZSwgcHJvcHMpXG5cbiAgICB2YXIgY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGROb2RlID0gY3JlYXRlRWxlbWVudChjaGlsZHJlbltpXSwgb3B0cylcbiAgICAgICAgaWYgKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZE5vZGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZVxufVxuIiwiLy8gTWFwcyBhIHZpcnR1YWwgRE9NIHRyZWUgb250byBhIHJlYWwgRE9NIHRyZWUgaW4gYW4gZWZmaWNpZW50IG1hbm5lci5cbi8vIFdlIGRvbid0IHdhbnQgdG8gcmVhZCBhbGwgb2YgdGhlIERPTSBub2RlcyBpbiB0aGUgdHJlZSBzbyB3ZSB1c2Vcbi8vIHRoZSBpbi1vcmRlciB0cmVlIGluZGV4aW5nIHRvIGVsaW1pbmF0ZSByZWN1cnNpb24gZG93biBjZXJ0YWluIGJyYW5jaGVzLlxuLy8gV2Ugb25seSByZWN1cnNlIGludG8gYSBET00gbm9kZSBpZiB3ZSBrbm93IHRoYXQgaXQgY29udGFpbnMgYSBjaGlsZCBvZlxuLy8gaW50ZXJlc3QuXG5cbnZhciBub0NoaWxkID0ge31cblxubW9kdWxlLmV4cG9ydHMgPSBkb21JbmRleFxuXG5mdW5jdGlvbiBkb21JbmRleChyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMpIHtcbiAgICBpZiAoIWluZGljZXMgfHwgaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHt9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaW5kaWNlcy5zb3J0KGFzY2VuZGluZylcbiAgICAgICAgcmV0dXJuIHJlY3Vyc2Uocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzLCAwKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVjdXJzZShyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMsIHJvb3RJbmRleCkge1xuICAgIG5vZGVzID0gbm9kZXMgfHwge31cblxuXG4gICAgaWYgKHJvb3ROb2RlKSB7XG4gICAgICAgIGlmIChpbmRleEluUmFuZ2UoaW5kaWNlcywgcm9vdEluZGV4LCByb290SW5kZXgpKSB7XG4gICAgICAgICAgICBub2Rlc1tyb290SW5kZXhdID0gcm9vdE5vZGVcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2Q2hpbGRyZW4gPSB0cmVlLmNoaWxkcmVuXG5cbiAgICAgICAgaWYgKHZDaGlsZHJlbikge1xuXG4gICAgICAgICAgICB2YXIgY2hpbGROb2RlcyA9IHJvb3ROb2RlLmNoaWxkTm9kZXNcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmVlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcm9vdEluZGV4ICs9IDFcblxuICAgICAgICAgICAgICAgIHZhciB2Q2hpbGQgPSB2Q2hpbGRyZW5baV0gfHwgbm9DaGlsZFxuICAgICAgICAgICAgICAgIHZhciBuZXh0SW5kZXggPSByb290SW5kZXggKyAodkNoaWxkLmNvdW50IHx8IDApXG5cbiAgICAgICAgICAgICAgICAvLyBza2lwIHJlY3Vyc2lvbiBkb3duIHRoZSB0cmVlIGlmIHRoZXJlIGFyZSBubyBub2RlcyBkb3duIGhlcmVcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXhJblJhbmdlKGluZGljZXMsIHJvb3RJbmRleCwgbmV4dEluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICByZWN1cnNlKGNoaWxkTm9kZXNbaV0sIHZDaGlsZCwgaW5kaWNlcywgbm9kZXMsIHJvb3RJbmRleClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByb290SW5kZXggPSBuZXh0SW5kZXhcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2Rlc1xufVxuXG4vLyBCaW5hcnkgc2VhcmNoIGZvciBhbiBpbmRleCBpbiB0aGUgaW50ZXJ2YWwgW2xlZnQsIHJpZ2h0XVxuZnVuY3Rpb24gaW5kZXhJblJhbmdlKGluZGljZXMsIGxlZnQsIHJpZ2h0KSB7XG4gICAgaWYgKGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHZhciBtaW5JbmRleCA9IDBcbiAgICB2YXIgbWF4SW5kZXggPSBpbmRpY2VzLmxlbmd0aCAtIDFcbiAgICB2YXIgY3VycmVudEluZGV4XG4gICAgdmFyIGN1cnJlbnRJdGVtXG5cbiAgICB3aGlsZSAobWluSW5kZXggPD0gbWF4SW5kZXgpIHtcbiAgICAgICAgY3VycmVudEluZGV4ID0gKChtYXhJbmRleCArIG1pbkluZGV4KSAvIDIpID4+IDBcbiAgICAgICAgY3VycmVudEl0ZW0gPSBpbmRpY2VzW2N1cnJlbnRJbmRleF1cblxuICAgICAgICBpZiAobWluSW5kZXggPT09IG1heEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudEl0ZW0gPj0gbGVmdCAmJiBjdXJyZW50SXRlbSA8PSByaWdodFxuICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRJdGVtIDwgbGVmdCkge1xuICAgICAgICAgICAgbWluSW5kZXggPSBjdXJyZW50SW5kZXggKyAxXG4gICAgICAgIH0gZWxzZSAgaWYgKGN1cnJlbnRJdGVtID4gcmlnaHQpIHtcbiAgICAgICAgICAgIG1heEluZGV4ID0gY3VycmVudEluZGV4IC0gMVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gYXNjZW5kaW5nKGEsIGIpIHtcbiAgICByZXR1cm4gYSA+IGIgPyAxIDogLTFcbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciB0b3BMZXZlbCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDpcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9XG52YXIgbWluRG9jID0gcmVxdWlyZSgnbWluLWRvY3VtZW50Jyk7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2N1bWVudDtcbn0gZWxzZSB7XG4gICAgdmFyIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXTtcblxuICAgIGlmICghZG9jY3kpIHtcbiAgICAgICAgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddID0gbWluRG9jO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jY3k7XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsInZhciBhcHBseVByb3BlcnRpZXMgPSByZXF1aXJlKFwiLi9hcHBseS1wcm9wZXJ0aWVzXCIpXG5cbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy13aWRnZXRcIilcbnZhciBWUGF0Y2ggPSByZXF1aXJlKFwidnRyZWUvdnBhdGNoXCIpXG5cbnZhciByZW5kZXIgPSByZXF1aXJlKFwiLi9jcmVhdGUtZWxlbWVudFwiKVxudmFyIHVwZGF0ZVdpZGdldCA9IHJlcXVpcmUoXCIuL3VwZGF0ZS13aWRnZXRcIilcblxubW9kdWxlLmV4cG9ydHMgPSBhcHBseVBhdGNoXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2godnBhdGNoLCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIHR5cGUgPSB2cGF0Y2gudHlwZVxuICAgIHZhciB2Tm9kZSA9IHZwYXRjaC52Tm9kZVxuICAgIHZhciBwYXRjaCA9IHZwYXRjaC5wYXRjaFxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgVlBhdGNoLlJFTU9WRTpcbiAgICAgICAgICAgIHJldHVybiByZW1vdmVOb2RlKGRvbU5vZGUsIHZOb2RlKVxuICAgICAgICBjYXNlIFZQYXRjaC5JTlNFUlQ6XG4gICAgICAgICAgICByZXR1cm4gaW5zZXJ0Tm9kZShkb21Ob2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guVlRFWFQ6XG4gICAgICAgICAgICByZXR1cm4gc3RyaW5nUGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5XSURHRVQ6XG4gICAgICAgICAgICByZXR1cm4gd2lkZ2V0UGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5WTk9ERTpcbiAgICAgICAgICAgIHJldHVybiB2Tm9kZVBhdGNoKGRvbU5vZGUsIHZOb2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guT1JERVI6XG4gICAgICAgICAgICByZW9yZGVyQ2hpbGRyZW4oZG9tTm9kZSwgcGF0Y2gpXG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgICAgICBjYXNlIFZQYXRjaC5QUk9QUzpcbiAgICAgICAgICAgIGFwcGx5UHJvcGVydGllcyhkb21Ob2RlLCBwYXRjaCwgdk5vZGUucHJvcGVydGllcylcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgICAgIGNhc2UgVlBhdGNoLlRIVU5LOlxuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2VSb290KGRvbU5vZGUsXG4gICAgICAgICAgICAgICAgcmVuZGVyT3B0aW9ucy5wYXRjaChkb21Ob2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucykpXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlTm9kZShkb21Ob2RlLCB2Tm9kZSkge1xuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKGRvbU5vZGUpXG4gICAgfVxuXG4gICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCB2Tm9kZSk7XG5cbiAgICByZXR1cm4gbnVsbFxufVxuXG5mdW5jdGlvbiBpbnNlcnROb2RlKHBhcmVudE5vZGUsIHZOb2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIG5ld05vZGUgPSByZW5kZXIodk5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLmFwcGVuZENoaWxkKG5ld05vZGUpXG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmVudE5vZGVcbn1cblxuZnVuY3Rpb24gc3RyaW5nUGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB2VGV4dCwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBuZXdOb2RlXG5cbiAgICBpZiAoZG9tTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBkb21Ob2RlLnJlcGxhY2VEYXRhKDAsIGRvbU5vZGUubGVuZ3RoLCB2VGV4dC50ZXh0KVxuICAgICAgICBuZXdOb2RlID0gZG9tTm9kZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG4gICAgICAgIG5ld05vZGUgPSByZW5kZXIodlRleHQsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIGRvbU5vZGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIGxlZnRWTm9kZSlcblxuICAgIHJldHVybiBuZXdOb2RlXG59XG5cbmZ1bmN0aW9uIHdpZGdldFBhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgd2lkZ2V0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgaWYgKHVwZGF0ZVdpZGdldChsZWZ0Vk5vZGUsIHdpZGdldCkpIHtcbiAgICAgICAgcmV0dXJuIHdpZGdldC51cGRhdGUobGVmdFZOb2RlLCBkb21Ob2RlKSB8fCBkb21Ob2RlXG4gICAgfVxuXG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcbiAgICB2YXIgbmV3V2lkZ2V0ID0gcmVuZGVyKHdpZGdldCwgcmVuZGVyT3B0aW9ucylcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld1dpZGdldCwgZG9tTm9kZSlcbiAgICB9XG5cbiAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIGxlZnRWTm9kZSlcblxuICAgIHJldHVybiBuZXdXaWRnZXRcbn1cblxuZnVuY3Rpb24gdk5vZGVQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHZOb2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcbiAgICB2YXIgbmV3Tm9kZSA9IHJlbmRlcih2Tm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIGRvbU5vZGUpXG4gICAgfVxuXG4gICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCBsZWZ0Vk5vZGUpXG5cbiAgICByZXR1cm4gbmV3Tm9kZVxufVxuXG5mdW5jdGlvbiBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIHcpIHtcbiAgICBpZiAodHlwZW9mIHcuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiICYmIGlzV2lkZ2V0KHcpKSB7XG4gICAgICAgIHcuZGVzdHJveShkb21Ob2RlKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVvcmRlckNoaWxkcmVuKGRvbU5vZGUsIGJJbmRleCkge1xuICAgIHZhciBjaGlsZHJlbiA9IFtdXG4gICAgdmFyIGNoaWxkTm9kZXMgPSBkb21Ob2RlLmNoaWxkTm9kZXNcbiAgICB2YXIgbGVuID0gY2hpbGROb2Rlcy5sZW5ndGhcbiAgICB2YXIgaVxuICAgIHZhciByZXZlcnNlSW5kZXggPSBiSW5kZXgucmV2ZXJzZVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNoaWxkcmVuLnB1c2goZG9tTm9kZS5jaGlsZE5vZGVzW2ldKVxuICAgIH1cblxuICAgIHZhciBpbnNlcnRPZmZzZXQgPSAwXG4gICAgdmFyIG1vdmVcbiAgICB2YXIgbm9kZVxuICAgIHZhciBpbnNlcnROb2RlXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIG1vdmUgPSBiSW5kZXhbaV1cbiAgICAgICAgaWYgKG1vdmUgIT09IHVuZGVmaW5lZCAmJiBtb3ZlICE9PSBpKSB7XG4gICAgICAgICAgICAvLyB0aGUgZWxlbWVudCBjdXJyZW50bHkgYXQgdGhpcyBpbmRleCB3aWxsIGJlIG1vdmVkIGxhdGVyIHNvIGluY3JlYXNlIHRoZSBpbnNlcnQgb2Zmc2V0XG4gICAgICAgICAgICBpZiAocmV2ZXJzZUluZGV4W2ldID4gaSkge1xuICAgICAgICAgICAgICAgIGluc2VydE9mZnNldCsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5vZGUgPSBjaGlsZHJlblttb3ZlXVxuICAgICAgICAgICAgaW5zZXJ0Tm9kZSA9IGNoaWxkTm9kZXNbaSArIGluc2VydE9mZnNldF0gfHwgbnVsbFxuICAgICAgICAgICAgaWYgKG5vZGUgIT09IGluc2VydE5vZGUpIHtcbiAgICAgICAgICAgICAgICBkb21Ob2RlLmluc2VydEJlZm9yZShub2RlLCBpbnNlcnROb2RlKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB0aGUgbW92ZWQgZWxlbWVudCBjYW1lIGZyb20gdGhlIGZyb250IG9mIHRoZSBhcnJheSBzbyByZWR1Y2UgdGhlIGluc2VydCBvZmZzZXRcbiAgICAgICAgICAgIGlmIChtb3ZlIDwgaSkge1xuICAgICAgICAgICAgICAgIGluc2VydE9mZnNldC0tXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBlbGVtZW50IGF0IHRoaXMgaW5kZXggaXMgc2NoZWR1bGVkIHRvIGJlIHJlbW92ZWQgc28gaW5jcmVhc2UgaW5zZXJ0IG9mZnNldFxuICAgICAgICBpZiAoaSBpbiBiSW5kZXgucmVtb3Zlcykge1xuICAgICAgICAgICAgaW5zZXJ0T2Zmc2V0KytcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVwbGFjZVJvb3Qob2xkUm9vdCwgbmV3Um9vdCkge1xuICAgIGlmIChvbGRSb290ICYmIG5ld1Jvb3QgJiYgb2xkUm9vdCAhPT0gbmV3Um9vdCAmJiBvbGRSb290LnBhcmVudE5vZGUpIHtcbiAgICAgICAgY29uc29sZS5sb2cob2xkUm9vdClcbiAgICAgICAgb2xkUm9vdC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdSb290LCBvbGRSb290KVxuICAgIH1cblxuICAgIHJldHVybiBuZXdSb290O1xufVxuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxuXG52YXIgZG9tSW5kZXggPSByZXF1aXJlKFwiLi9kb20taW5kZXhcIilcbnZhciBwYXRjaE9wID0gcmVxdWlyZShcIi4vcGF0Y2gtb3BcIilcbm1vZHVsZS5leHBvcnRzID0gcGF0Y2hcblxuZnVuY3Rpb24gcGF0Y2gocm9vdE5vZGUsIHBhdGNoZXMpIHtcbiAgICByZXR1cm4gcGF0Y2hSZWN1cnNpdmUocm9vdE5vZGUsIHBhdGNoZXMpXG59XG5cbmZ1bmN0aW9uIHBhdGNoUmVjdXJzaXZlKHJvb3ROb2RlLCBwYXRjaGVzLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIGluZGljZXMgPSBwYXRjaEluZGljZXMocGF0Y2hlcylcblxuICAgIGlmIChpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcm9vdE5vZGVcbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBkb21JbmRleChyb290Tm9kZSwgcGF0Y2hlcy5hLCBpbmRpY2VzKVxuICAgIHZhciBvd25lckRvY3VtZW50ID0gcm9vdE5vZGUub3duZXJEb2N1bWVudFxuXG4gICAgaWYgKCFyZW5kZXJPcHRpb25zKSB7XG4gICAgICAgIHJlbmRlck9wdGlvbnMgPSB7IHBhdGNoOiBwYXRjaFJlY3Vyc2l2ZSB9XG4gICAgICAgIGlmIChvd25lckRvY3VtZW50ICE9PSBkb2N1bWVudCkge1xuICAgICAgICAgICAgcmVuZGVyT3B0aW9ucy5kb2N1bWVudCA9IG93bmVyRG9jdW1lbnRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5kaWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbm9kZUluZGV4ID0gaW5kaWNlc1tpXVxuICAgICAgICByb290Tm9kZSA9IGFwcGx5UGF0Y2gocm9vdE5vZGUsXG4gICAgICAgICAgICBpbmRleFtub2RlSW5kZXhdLFxuICAgICAgICAgICAgcGF0Y2hlc1tub2RlSW5kZXhdLFxuICAgICAgICAgICAgcmVuZGVyT3B0aW9ucylcbiAgICB9XG5cbiAgICByZXR1cm4gcm9vdE5vZGVcbn1cblxuZnVuY3Rpb24gYXBwbHlQYXRjaChyb290Tm9kZSwgZG9tTm9kZSwgcGF0Y2hMaXN0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgaWYgKCFkb21Ob2RlKSB7XG4gICAgICAgIHJldHVybiByb290Tm9kZVxuICAgIH1cblxuICAgIHZhciBuZXdOb2RlXG5cbiAgICBpZiAoaXNBcnJheShwYXRjaExpc3QpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0Y2hMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBuZXdOb2RlID0gcGF0Y2hPcChwYXRjaExpc3RbaV0sIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgICAgIGlmIChkb21Ob2RlID09PSByb290Tm9kZSkge1xuICAgICAgICAgICAgICAgIHJvb3ROb2RlID0gbmV3Tm9kZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmV3Tm9kZSA9IHBhdGNoT3AocGF0Y2hMaXN0LCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgIGlmIChkb21Ob2RlID09PSByb290Tm9kZSkge1xuICAgICAgICAgICAgcm9vdE5vZGUgPSBuZXdOb2RlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcm9vdE5vZGVcbn1cblxuZnVuY3Rpb24gcGF0Y2hJbmRpY2VzKHBhdGNoZXMpIHtcbiAgICB2YXIgaW5kaWNlcyA9IFtdXG5cbiAgICBmb3IgKHZhciBrZXkgaW4gcGF0Y2hlcykge1xuICAgICAgICBpZiAoa2V5ICE9PSBcImFcIikge1xuICAgICAgICAgICAgaW5kaWNlcy5wdXNoKE51bWJlcihrZXkpKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGluZGljZXNcbn1cbiIsInZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy13aWRnZXRcIilcblxubW9kdWxlLmV4cG9ydHMgPSB1cGRhdGVXaWRnZXRcblxuZnVuY3Rpb24gdXBkYXRlV2lkZ2V0KGEsIGIpIHtcbiAgICBpZiAoaXNXaWRnZXQoYSkgJiYgaXNXaWRnZXQoYikpIHtcbiAgICAgICAgaWYgKFwibmFtZVwiIGluIGEgJiYgXCJuYW1lXCIgaW4gYikge1xuICAgICAgICAgICAgcmV0dXJuIGEuaWQgPT09IGIuaWRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhLmluaXQgPT09IGIuaW5pdFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlXG59XG4iLCJ2YXIgaXNBcnJheSA9IHJlcXVpcmUoXCJ4LWlzLWFycmF5XCIpXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKFwiaXMtb2JqZWN0XCIpXG5cbnZhciBWUGF0Y2ggPSByZXF1aXJlKFwiLi92cGF0Y2hcIilcbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4vaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4vaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuL2lzLXdpZGdldFwiKVxudmFyIGlzVGh1bmsgPSByZXF1aXJlKFwiLi9pcy10aHVua1wiKVxudmFyIGhhbmRsZVRodW5rID0gcmVxdWlyZShcIi4vaGFuZGxlLXRodW5rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZGlmZlxuXG5mdW5jdGlvbiBkaWZmKGEsIGIpIHtcbiAgICB2YXIgcGF0Y2ggPSB7IGE6IGEgfVxuICAgIHdhbGsoYSwgYiwgcGF0Y2gsIDApXG4gICAgcmV0dXJuIHBhdGNoXG59XG5cbmZ1bmN0aW9uIHdhbGsoYSwgYiwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgaWYgKGlzVGh1bmsoYSkgfHwgaXNUaHVuayhiKSkge1xuICAgICAgICAgICAgdGh1bmtzKGEsIGIsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGhvb2tzKGIsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgYXBwbHkgPSBwYXRjaFtpbmRleF1cblxuICAgIGlmIChiID09IG51bGwpIHtcbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCBhLCBiKSlcbiAgICAgICAgZGVzdHJveVdpZGdldHMoYSwgcGF0Y2gsIGluZGV4KVxuICAgIH0gZWxzZSBpZiAoaXNUaHVuayhhKSB8fCBpc1RodW5rKGIpKSB7XG4gICAgICAgIHRodW5rcyhhLCBiLCBwYXRjaCwgaW5kZXgpXG4gICAgfSBlbHNlIGlmIChpc1ZOb2RlKGIpKSB7XG4gICAgICAgIGlmIChpc1ZOb2RlKGEpKSB7XG4gICAgICAgICAgICBpZiAoYS50YWdOYW1lID09PSBiLnRhZ05hbWUgJiZcbiAgICAgICAgICAgICAgICBhLm5hbWVzcGFjZSA9PT0gYi5uYW1lc3BhY2UgJiZcbiAgICAgICAgICAgICAgICBhLmtleSA9PT0gYi5rZXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvcHNQYXRjaCA9IGRpZmZQcm9wcyhhLnByb3BlcnRpZXMsIGIucHJvcGVydGllcywgYi5ob29rcylcbiAgICAgICAgICAgICAgICBpZiAocHJvcHNQYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFZQYXRjaChWUGF0Y2guUFJPUFMsIGEsIHByb3BzUGF0Y2gpKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVk5PREUsIGEsIGIpKVxuICAgICAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXBwbHkgPSBkaWZmQ2hpbGRyZW4oYSwgYiwgcGF0Y2gsIGFwcGx5LCBpbmRleClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZOT0RFLCBhLCBiKSlcbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWVGV4dChiKSkge1xuICAgICAgICBpZiAoIWlzVlRleHQoYSkpIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZURVhULCBhLCBiKSlcbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfSBlbHNlIGlmIChhLnRleHQgIT09IGIudGV4dCkge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVlRFWFQsIGEsIGIpKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1dpZGdldChiKSkge1xuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5XSURHRVQsIGEsIGIpKVxuXG4gICAgICAgIGlmICghaXNXaWRnZXQoYSkpIHtcbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChhcHBseSkge1xuICAgICAgICBwYXRjaFtpbmRleF0gPSBhcHBseVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZGlmZlByb3BzKGEsIGIsIGhvb2tzKSB7XG4gICAgdmFyIGRpZmZcblxuICAgIGZvciAodmFyIGFLZXkgaW4gYSkge1xuICAgICAgICBpZiAoIShhS2V5IGluIGIpKSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZlthS2V5XSA9IHVuZGVmaW5lZFxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFWYWx1ZSA9IGFbYUtleV1cbiAgICAgICAgdmFyIGJWYWx1ZSA9IGJbYUtleV1cblxuICAgICAgICBpZiAoaG9va3MgJiYgYUtleSBpbiBob29rcykge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc09iamVjdChhVmFsdWUpICYmIGlzT2JqZWN0KGJWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZ2V0UHJvdG90eXBlKGJWYWx1ZSkgIT09IGdldFByb3RvdHlwZShhVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2JqZWN0RGlmZiA9IGRpZmZQcm9wcyhhVmFsdWUsIGJWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9iamVjdERpZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gb2JqZWN0RGlmZlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhVmFsdWUgIT09IGJWYWx1ZSkge1xuICAgICAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgYktleSBpbiBiKSB7XG4gICAgICAgIGlmICghKGJLZXkgaW4gYSkpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2JLZXldID0gYltiS2V5XVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpZmZcbn1cblxuZnVuY3Rpb24gZ2V0UHJvdG90eXBlKHZhbHVlKSB7XG4gICAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKVxuICAgIH0gZWxzZSBpZiAodmFsdWUuX19wcm90b19fKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5fX3Byb3RvX19cbiAgICB9IGVsc2UgaWYgKHZhbHVlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRpZmZDaGlsZHJlbihhLCBiLCBwYXRjaCwgYXBwbHksIGluZGV4KSB7XG4gICAgdmFyIGFDaGlsZHJlbiA9IGEuY2hpbGRyZW5cbiAgICB2YXIgYkNoaWxkcmVuID0gcmVvcmRlcihhQ2hpbGRyZW4sIGIuY2hpbGRyZW4pXG5cbiAgICB2YXIgYUxlbiA9IGFDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgYkxlbiA9IGJDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgbGVuID0gYUxlbiA+IGJMZW4gPyBhTGVuIDogYkxlblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgbGVmdE5vZGUgPSBhQ2hpbGRyZW5baV1cbiAgICAgICAgdmFyIHJpZ2h0Tm9kZSA9IGJDaGlsZHJlbltpXVxuICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgaWYgKCFsZWZ0Tm9kZSkge1xuICAgICAgICAgICAgaWYgKHJpZ2h0Tm9kZSkge1xuICAgICAgICAgICAgICAgIC8vIEV4Y2VzcyBub2RlcyBpbiBiIG5lZWQgdG8gYmUgYWRkZWRcbiAgICAgICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LFxuICAgICAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFZQYXRjaC5JTlNFUlQsIG51bGwsIHJpZ2h0Tm9kZSkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXJpZ2h0Tm9kZSkge1xuICAgICAgICAgICAgaWYgKGxlZnROb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhjZXNzIG5vZGVzIGluIGEgbmVlZCB0byBiZSByZW1vdmVkXG4gICAgICAgICAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCBsZWZ0Tm9kZSwgbnVsbClcbiAgICAgICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhsZWZ0Tm9kZSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2FsayhsZWZ0Tm9kZSwgcmlnaHROb2RlLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNWTm9kZShsZWZ0Tm9kZSkgJiYgbGVmdE5vZGUuY291bnQpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IGxlZnROb2RlLmNvdW50XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYkNoaWxkcmVuLm1vdmVzKSB7XG4gICAgICAgIC8vIFJlb3JkZXIgbm9kZXMgbGFzdFxuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5PUkRFUiwgYSwgYkNoaWxkcmVuLm1vdmVzKSlcbiAgICB9XG5cbiAgICByZXR1cm4gYXBwbHlcbn1cblxuLy8gUGF0Y2ggcmVjb3JkcyBmb3IgYWxsIGRlc3Ryb3llZCB3aWRnZXRzIG11c3QgYmUgYWRkZWQgYmVjYXVzZSB3ZSBuZWVkXG4vLyBhIERPTSBub2RlIHJlZmVyZW5jZSBmb3IgdGhlIGRlc3Ryb3kgZnVuY3Rpb25cbmZ1bmN0aW9uIGRlc3Ryb3lXaWRnZXRzKHZOb2RlLCBwYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaXNXaWRnZXQodk5vZGUpKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygdk5vZGUuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBwYXRjaFtpbmRleF0gPSBuZXcgVlBhdGNoKFZQYXRjaC5SRU1PVkUsIHZOb2RlLCBudWxsKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1ZOb2RlKHZOb2RlKSAmJiB2Tm9kZS5oYXNXaWRnZXRzKSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IHZOb2RlLmNoaWxkcmVuXG4gICAgICAgIHZhciBsZW4gPSBjaGlsZHJlbi5sZW5ndGhcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoY2hpbGQsIHBhdGNoLCBpbmRleClcblxuICAgICAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpICYmIGNoaWxkLmNvdW50KSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gY2hpbGQuY291bnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gQ3JlYXRlIGEgc3ViLXBhdGNoIGZvciB0aHVua3NcbmZ1bmN0aW9uIHRodW5rcyhhLCBiLCBwYXRjaCwgaW5kZXgpIHtcbiAgICB2YXIgbm9kZXMgPSBoYW5kbGVUaHVuayhhLCBiKTtcbiAgICB2YXIgdGh1bmtQYXRjaCA9IGRpZmYobm9kZXMuYSwgbm9kZXMuYilcbiAgICBpZiAoaGFzUGF0Y2hlcyh0aHVua1BhdGNoKSkge1xuICAgICAgICBwYXRjaFtpbmRleF0gPSBuZXcgVlBhdGNoKFZQYXRjaC5USFVOSywgbnVsbCwgdGh1bmtQYXRjaClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1BhdGNoZXMocGF0Y2gpIHtcbiAgICBmb3IgKHZhciBpbmRleCBpbiBwYXRjaCkge1xuICAgICAgICBpZiAoaW5kZXggIT09IFwiYVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuLy8gRXhlY3V0ZSBob29rcyB3aGVuIHR3byBub2RlcyBhcmUgaWRlbnRpY2FsXG5mdW5jdGlvbiBob29rcyh2Tm9kZSwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGlzVk5vZGUodk5vZGUpKSB7XG4gICAgICAgIGlmICh2Tm9kZS5ob29rcykge1xuICAgICAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guUFJPUFMsIHZOb2RlLmhvb2tzLCB2Tm9kZS5ob29rcylcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2Tm9kZS5kZXNjZW5kYW50SG9va3MpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHZOb2RlLmNoaWxkcmVuXG4gICAgICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgICAgICAgICBob29rcyhjaGlsZCwgcGF0Y2gsIGluZGV4KVxuXG4gICAgICAgICAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpICYmIGNoaWxkLmNvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IGNoaWxkLmNvdW50XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBMaXN0IGRpZmYsIG5haXZlIGxlZnQgdG8gcmlnaHQgcmVvcmRlcmluZ1xuZnVuY3Rpb24gcmVvcmRlcihhQ2hpbGRyZW4sIGJDaGlsZHJlbikge1xuXG4gICAgdmFyIGJLZXlzID0ga2V5SW5kZXgoYkNoaWxkcmVuKVxuXG4gICAgaWYgKCFiS2V5cykge1xuICAgICAgICByZXR1cm4gYkNoaWxkcmVuXG4gICAgfVxuXG4gICAgdmFyIGFLZXlzID0ga2V5SW5kZXgoYUNoaWxkcmVuKVxuXG4gICAgaWYgKCFhS2V5cykge1xuICAgICAgICByZXR1cm4gYkNoaWxkcmVuXG4gICAgfVxuXG4gICAgdmFyIGJNYXRjaCA9IHt9LCBhTWF0Y2ggPSB7fVxuXG4gICAgZm9yICh2YXIga2V5IGluIGJLZXlzKSB7XG4gICAgICAgIGJNYXRjaFtiS2V5c1trZXldXSA9IGFLZXlzW2tleV1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gYUtleXMpIHtcbiAgICAgICAgYU1hdGNoW2FLZXlzW2tleV1dID0gYktleXNba2V5XVxuICAgIH1cblxuICAgIHZhciBhTGVuID0gYUNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBiTGVuID0gYkNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBsZW4gPSBhTGVuID4gYkxlbiA/IGFMZW4gOiBiTGVuXG4gICAgdmFyIHNodWZmbGUgPSBbXVxuICAgIHZhciBmcmVlSW5kZXggPSAwXG4gICAgdmFyIGkgPSAwXG4gICAgdmFyIG1vdmVJbmRleCA9IDBcbiAgICB2YXIgbW92ZXMgPSB7fVxuICAgIHZhciByZW1vdmVzID0gbW92ZXMucmVtb3ZlcyA9IHt9XG4gICAgdmFyIHJldmVyc2UgPSBtb3Zlcy5yZXZlcnNlID0ge31cbiAgICB2YXIgaGFzTW92ZXMgPSBmYWxzZVxuXG4gICAgd2hpbGUgKGZyZWVJbmRleCA8IGxlbikge1xuICAgICAgICB2YXIgbW92ZSA9IGFNYXRjaFtpXVxuICAgICAgICBpZiAobW92ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzaHVmZmxlW2ldID0gYkNoaWxkcmVuW21vdmVdXG4gICAgICAgICAgICBpZiAobW92ZSAhPT0gbW92ZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgbW92ZXNbbW92ZV0gPSBtb3ZlSW5kZXhcbiAgICAgICAgICAgICAgICByZXZlcnNlW21vdmVJbmRleF0gPSBtb3ZlXG4gICAgICAgICAgICAgICAgaGFzTW92ZXMgPSB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtb3ZlSW5kZXgrK1xuICAgICAgICB9IGVsc2UgaWYgKGkgaW4gYU1hdGNoKSB7XG4gICAgICAgICAgICBzaHVmZmxlW2ldID0gdW5kZWZpbmVkXG4gICAgICAgICAgICByZW1vdmVzW2ldID0gbW92ZUluZGV4KytcbiAgICAgICAgICAgIGhhc01vdmVzID0gdHJ1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hpbGUgKGJNYXRjaFtmcmVlSW5kZXhdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBmcmVlSW5kZXgrK1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZnJlZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZyZWVDaGlsZCA9IGJDaGlsZHJlbltmcmVlSW5kZXhdXG4gICAgICAgICAgICAgICAgaWYgKGZyZWVDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICBzaHVmZmxlW2ldID0gZnJlZUNoaWxkXG4gICAgICAgICAgICAgICAgICAgIGlmIChmcmVlSW5kZXggIT09IG1vdmVJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzTW92ZXMgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3Zlc1tmcmVlSW5kZXhdID0gbW92ZUluZGV4XG4gICAgICAgICAgICAgICAgICAgICAgICByZXZlcnNlW21vdmVJbmRleF0gPSBmcmVlSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBtb3ZlSW5kZXgrK1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmcmVlSW5kZXgrK1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGkrK1xuICAgIH1cblxuICAgIGlmIChoYXNNb3Zlcykge1xuICAgICAgICBzaHVmZmxlLm1vdmVzID0gbW92ZXNcbiAgICB9XG5cbiAgICByZXR1cm4gc2h1ZmZsZVxufVxuXG5mdW5jdGlvbiBrZXlJbmRleChjaGlsZHJlbikge1xuICAgIHZhciBpLCBrZXlzXG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cblxuICAgICAgICBpZiAoY2hpbGQua2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGtleXMgPSBrZXlzIHx8IHt9XG4gICAgICAgICAgICBrZXlzW2NoaWxkLmtleV0gPSBpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ga2V5c1xufVxuXG5mdW5jdGlvbiBhcHBlbmRQYXRjaChhcHBseSwgcGF0Y2gpIHtcbiAgICBpZiAoYXBwbHkpIHtcbiAgICAgICAgaWYgKGlzQXJyYXkoYXBwbHkpKSB7XG4gICAgICAgICAgICBhcHBseS5wdXNoKHBhdGNoKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXBwbHkgPSBbYXBwbHksIHBhdGNoXVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFwcGx5XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHBhdGNoXG4gICAgfVxufVxuIiwidmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwiLi9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4vaXMtd2lkZ2V0XCIpXG52YXIgaXNUaHVuayA9IHJlcXVpcmUoXCIuL2lzLXRodW5rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaGFuZGxlVGh1bmtcblxuZnVuY3Rpb24gaGFuZGxlVGh1bmsoYSwgYikge1xuICAgIHZhciByZW5kZXJlZEEgPSBhXG4gICAgdmFyIHJlbmRlcmVkQiA9IGJcblxuICAgIGlmIChpc1RodW5rKGIpKSB7XG4gICAgICAgIHJlbmRlcmVkQiA9IHJlbmRlclRodW5rKGIsIGEpXG4gICAgfVxuXG4gICAgaWYgKGlzVGh1bmsoYSkpIHtcbiAgICAgICAgcmVuZGVyZWRBID0gcmVuZGVyVGh1bmsoYSwgbnVsbClcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBhOiByZW5kZXJlZEEsXG4gICAgICAgIGI6IHJlbmRlcmVkQlxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVyVGh1bmsodGh1bmssIHByZXZpb3VzKSB7XG4gICAgdmFyIHJlbmRlcmVkVGh1bmsgPSB0aHVuay52bm9kZVxuXG4gICAgaWYgKCFyZW5kZXJlZFRodW5rKSB7XG4gICAgICAgIHJlbmRlcmVkVGh1bmsgPSB0aHVuay52bm9kZSA9IHRodW5rLnJlbmRlcihwcmV2aW91cylcbiAgICB9XG5cbiAgICBpZiAoIShpc1ZOb2RlKHJlbmRlcmVkVGh1bmspIHx8XG4gICAgICAgICAgICBpc1ZUZXh0KHJlbmRlcmVkVGh1bmspIHx8XG4gICAgICAgICAgICBpc1dpZGdldChyZW5kZXJlZFRodW5rKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidGh1bmsgZGlkIG5vdCByZXR1cm4gYSB2YWxpZCBub2RlXCIpO1xuICAgIH1cblxuICAgIHJldHVybiByZW5kZXJlZFRodW5rXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzVGh1bmtcclxuXHJcbmZ1bmN0aW9uIGlzVGh1bmsodCkge1xyXG4gICAgcmV0dXJuIHQgJiYgdC50eXBlID09PSBcIlRodW5rXCJcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzSG9va1xuXG5mdW5jdGlvbiBpc0hvb2soaG9vaykge1xuICAgIHJldHVybiBob29rICYmIHR5cGVvZiBob29rLmhvb2sgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAhaG9vay5oYXNPd25Qcm9wZXJ0eShcImhvb2tcIilcbn1cbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzVmlydHVhbE5vZGVcblxuZnVuY3Rpb24gaXNWaXJ0dWFsTm9kZSh4KSB7XG4gICAgcmV0dXJuIHggJiYgeC50eXBlID09PSBcIlZpcnR1YWxOb2RlXCIgJiYgeC52ZXJzaW9uID09PSB2ZXJzaW9uXG59XG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBpc1ZpcnR1YWxUZXh0XG5cbmZ1bmN0aW9uIGlzVmlydHVhbFRleHQoeCkge1xuICAgIHJldHVybiB4ICYmIHgudHlwZSA9PT0gXCJWaXJ0dWFsVGV4dFwiICYmIHgudmVyc2lvbiA9PT0gdmVyc2lvblxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc1dpZGdldFxuXG5mdW5jdGlvbiBpc1dpZGdldCh3KSB7XG4gICAgcmV0dXJuIHcgJiYgdy50eXBlID09PSBcIldpZGdldFwiXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiMVwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4vaXMtdm5vZGVcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuL2lzLXdpZGdldFwiKVxudmFyIGlzVkhvb2sgPSByZXF1aXJlKFwiLi9pcy12aG9va1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxOb2RlXG5cbnZhciBub1Byb3BlcnRpZXMgPSB7fVxudmFyIG5vQ2hpbGRyZW4gPSBbXVxuXG5mdW5jdGlvbiBWaXJ0dWFsTm9kZSh0YWdOYW1lLCBwcm9wZXJ0aWVzLCBjaGlsZHJlbiwga2V5LCBuYW1lc3BhY2UpIHtcbiAgICB0aGlzLnRhZ05hbWUgPSB0YWdOYW1lXG4gICAgdGhpcy5wcm9wZXJ0aWVzID0gcHJvcGVydGllcyB8fCBub1Byb3BlcnRpZXNcbiAgICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW4gfHwgbm9DaGlsZHJlblxuICAgIHRoaXMua2V5ID0ga2V5ICE9IG51bGwgPyBTdHJpbmcoa2V5KSA6IHVuZGVmaW5lZFxuICAgIHRoaXMubmFtZXNwYWNlID0gKHR5cGVvZiBuYW1lc3BhY2UgPT09IFwic3RyaW5nXCIpID8gbmFtZXNwYWNlIDogbnVsbFxuXG4gICAgdmFyIGNvdW50ID0gKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkgfHwgMFxuICAgIHZhciBkZXNjZW5kYW50cyA9IDBcbiAgICB2YXIgaGFzV2lkZ2V0cyA9IGZhbHNlXG4gICAgdmFyIGRlc2NlbmRhbnRIb29rcyA9IGZhbHNlXG4gICAgdmFyIGhvb2tzXG5cbiAgICBmb3IgKHZhciBwcm9wTmFtZSBpbiBwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmIChwcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KHByb3BOYW1lKSkge1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5ID0gcHJvcGVydGllc1twcm9wTmFtZV1cbiAgICAgICAgICAgIGlmIChpc1ZIb29rKHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIGlmICghaG9va3MpIHtcbiAgICAgICAgICAgICAgICAgICAgaG9va3MgPSB7fVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGhvb2tzW3Byb3BOYW1lXSA9IHByb3BlcnR5XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpKSB7XG4gICAgICAgICAgICBkZXNjZW5kYW50cyArPSBjaGlsZC5jb3VudCB8fCAwXG5cbiAgICAgICAgICAgIGlmICghaGFzV2lkZ2V0cyAmJiBjaGlsZC5oYXNXaWRnZXRzKSB7XG4gICAgICAgICAgICAgICAgaGFzV2lkZ2V0cyA9IHRydWVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFkZXNjZW5kYW50SG9va3MgJiYgKGNoaWxkLmhvb2tzIHx8IGNoaWxkLmRlc2NlbmRhbnRIb29rcykpIHtcbiAgICAgICAgICAgICAgICBkZXNjZW5kYW50SG9va3MgPSB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWhhc1dpZGdldHMgJiYgaXNXaWRnZXQoY2hpbGQpKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNoaWxkLmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIGhhc1dpZGdldHMgPSB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvdW50ID0gY291bnQgKyBkZXNjZW5kYW50c1xuICAgIHRoaXMuaGFzV2lkZ2V0cyA9IGhhc1dpZGdldHNcbiAgICB0aGlzLmhvb2tzID0gaG9va3NcbiAgICB0aGlzLmRlc2NlbmRhbnRIb29rcyA9IGRlc2NlbmRhbnRIb29rc1xufVxuXG5WaXJ0dWFsTm9kZS5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxOb2RlLnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsTm9kZVwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxuVmlydHVhbFBhdGNoLk5PTkUgPSAwXG5WaXJ0dWFsUGF0Y2guVlRFWFQgPSAxXG5WaXJ0dWFsUGF0Y2guVk5PREUgPSAyXG5WaXJ0dWFsUGF0Y2guV0lER0VUID0gM1xuVmlydHVhbFBhdGNoLlBST1BTID0gNFxuVmlydHVhbFBhdGNoLk9SREVSID0gNVxuVmlydHVhbFBhdGNoLklOU0VSVCA9IDZcblZpcnR1YWxQYXRjaC5SRU1PVkUgPSA3XG5WaXJ0dWFsUGF0Y2guVEhVTksgPSA4XG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFBhdGNoXG5cbmZ1bmN0aW9uIFZpcnR1YWxQYXRjaCh0eXBlLCB2Tm9kZSwgcGF0Y2gpIHtcbiAgICB0aGlzLnR5cGUgPSBOdW1iZXIodHlwZSlcbiAgICB0aGlzLnZOb2RlID0gdk5vZGVcbiAgICB0aGlzLnBhdGNoID0gcGF0Y2hcbn1cblxuVmlydHVhbFBhdGNoLnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbFBhdGNoLnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsUGF0Y2hcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFRleHRcblxuZnVuY3Rpb24gVmlydHVhbFRleHQodGV4dCkge1xuICAgIHRoaXMudGV4dCA9IFN0cmluZyh0ZXh0KVxufVxuXG5WaXJ0dWFsVGV4dC5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxUZXh0LnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsVGV4dFwiXG4iLCJ2YXIgbmF0aXZlSXNBcnJheSA9IEFycmF5LmlzQXJyYXlcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBuYXRpdmVJc0FycmF5IHx8IGlzQXJyYXlcblxuZnVuY3Rpb24gaXNBcnJheShvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCJcbn1cbiIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBpc1N0cmluZ1xuXG5mdW5jdGlvbiBpc1N0cmluZyhvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgU3RyaW5nXVwiXG59XG4iLCJ2YXIgcGF0Y2ggPSByZXF1aXJlKFwidmRvbS9wYXRjaFwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGNoXG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBDbGF5UmVnaXN0ZXIgICBmcm9tICcuL3JlZ2lzdGVyJztcbmltcG9ydCBoZWxwZXIgICAgICAgICBmcm9tICcuL2hlbHBlcic7XG5cbmltcG9ydCB0ZW1wbGF0ZSAgICAgICBmcm9tICcuL3RlbXBsYXRlJztcbmltcG9ydCB0ZW1wbGF0ZUhlbHBlciBmcm9tICcuL3RlbXBsYXRlLWhlbHBlcic7XG5pbXBvcnQgZWxlbWVudCAgICAgICAgZnJvbSAnLi9lbGVtZW50JztcblxuaW1wb3J0IG1vZHVsZVJlZ2lzdHJ5IGZyb20gJy4vbW9kdWxlJztcbmltcG9ydCBtb2RFdmVudCAgICAgICBmcm9tICcuL21vZHVsZXMvZXZlbnQnO1xuXG4vKipcbiAqIEBjbGFzcyBDbGF5bHVtcFxuICogQHR5cGUge09iamVjdH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBoZWxwZXIubWl4KENsYXlSZWdpc3Rlciwge1xuICBlbGVtZW50ICAgICAgICA6IGVsZW1lbnQsXG4gIGhlbHBlciAgICAgICAgIDogaGVscGVyLFxuICB0ZW1wbGF0ZSAgICAgICA6IHRlbXBsYXRlLFxuICB0ZW1wbGF0ZUhlbHBlciA6IHRlbXBsYXRlSGVscGVyLFxuICBtb2R1bGVzICAgICAgICA6IG1vZHVsZVJlZ2lzdHJ5XG59KTtcblxubW9kdWxlUmVnaXN0cnkucmVnaXN0ZXIoJ0RPTUV2ZW50RGVsZWdhdGUnLCBtb2RFdmVudCk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgaGVscGVyICAgZnJvbSAnLi9oZWxwZXInO1xuaW1wb3J0IHRlbXBsYXRlIGZyb20gJy4vdGVtcGxhdGUnO1xuaW1wb3J0IG1vZHVsZVJlZ2lzdHJ5IGZyb20gJy4vbW9kdWxlJztcblxudmFyIFJFR0lTVFJZX0NMQVlfUFJPVE9UWVBFUyA9IHt9O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIC8qKlxuICAgKiBAc3RhdGljXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwcm90b1xuICAgKiBAcmV0dXJucyB7Q2xheUVsZW1lbnR9XG4gICAqL1xuICBjcmVhdGU6IGZ1bmN0aW9uKG5hbWUsIHByb3RvKSB7XG5cbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAvKipcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAcHJvcGVydHkge0RvY3VtZW50fSBfZG9jXG4gICAgICAgKi9cbiAgICAgIF9kb2M6ICBkb2N1bWVudC5fY3VycmVudFNjcmlwdCA/IGRvY3VtZW50Ll9jdXJyZW50U2NyaXB0Lm93bmVyRG9jdW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGRvY3VtZW50LmN1cnJlbnRTY3JpcHQgPyBkb2N1bWVudC5jdXJyZW50U2NyaXB0Lm93bmVyRG9jdW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBkb2N1bWVudCxcbiAgICAgIC8qKlxuICAgICAgICogQHByaXZhdGVcbiAgICAgICAqIEBtZXRob2Qge0Z1bmN0aW9ufSBfY3JlYXRlZFxuICAgICAgICovXG4gICAgICBfY3JlYXRlZDogaGVscGVyLmlzRnVuY3Rpb24ocHJvdG8uY3JlYXRlZENhbGxiYWNrKSA/IHByb3RvLmNyZWF0ZWRDYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBoZWxwZXIubm9vcCxcbiAgICAgIC8qKlxuICAgICAgICogQHByaXZhdGVcbiAgICAgICAqIEBtZXRob2Qge0Z1bmN0aW9ufSBfYXR0YWNoZWRcbiAgICAgICAqL1xuICAgICAgX2F0dGFjaGVkOiBoZWxwZXIuaXNGdW5jdGlvbihwcm90by5hdHRhY2hlZENhbGxiYWNrKSA/IHByb3RvLmF0dGFjaGVkQ2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBoZWxwZXIubm9vcCxcbiAgICAgIC8qKlxuICAgICAgICogQHByaXZhdGVcbiAgICAgICAqIEBtZXRob2Qge0Z1bmN0aW9ufSBfZGV0YWNoZWRcbiAgICAgICAqL1xuICAgICAgX2RldGFjaGVkOiBoZWxwZXIuaXNGdW5jdGlvbihwcm90by5kZXRhY2hlZENhbGxiYWNrKSA/IHByb3RvLmRldGFjaGVkQ2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBoZWxwZXIubm9vcCxcbiAgICAgIC8qKlxuICAgICAgICogQHByaXZhdGVcbiAgICAgICAqIEBtZXRob2Qge0Z1bmN0aW9ufSBfYXR0ckNoYW5nZWRcbiAgICAgICAqL1xuICAgICAgX2F0dHJDaGFuZ2VkOiBoZWxwZXIuaXNGdW5jdGlvbihwcm90by5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2spID8gcHJvdG8uYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBoZWxwZXIubm9vcCxcbiAgICAgIC8qKlxuICAgICAgICogQHByaXZhdGVcbiAgICAgICAqIEBwcm9wZXJ0eSB7U3RyaW5nfSBfaHRtbFxuICAgICAgICovXG4gICAgICBfaHRtbDogJycsXG5cbiAgICAgIC8qKlxuICAgICAgICogQHByb3BlcnR5IHtFbGVtZW50fSByb290XG4gICAgICAgKi9cbiAgICAgIHJvb3Q6IG51bGwsXG5cbiAgICAgIC8qKlxuICAgICAgICogQHByb3BlcnR5IHtDbGF5VGVtcGxhdGV9IHRlbXBsYXRlXG4gICAgICAgKi9cbiAgICAgIHRlbXBsYXRlOiBudWxsLFxuXG4gICAgICAvKipcbiAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBzY29wZVxuICAgICAgICovXG4gICAgICBzY29wZSA6IHt9LFxuXG4gICAgICAvKipcbiAgICAgICAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsIGZ1bmN0aW9uPn0gdXNlXG4gICAgICAgKi9cbiAgICAgIHVzZToge31cbiAgICB9O1xuXG4gICAgLy8gZGVmYXVsdHNcbiAgICBoZWxwZXIubWl4KHByb3RvLCBkZWZhdWx0cyk7XG4gICAgaGVscGVyLm1peChwcm90by51c2UsIHtcbiAgICAgIGV2ZW50IDogJ0RPTUV2ZW50RGVsZWdhdGUnXG4gICAgfSk7XG5cbiAgICAvLyBkb20gcmVhZHkgcmVxdWlyZWRcbiAgICBoZWxwZXIucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdGVtcGxhdGUgPSBwcm90by5fZG9jLnF1ZXJ5U2VsZWN0b3IoJ1tjbC1lbGVtZW50PVwiJytuYW1lKydcIl0nKTtcbiAgICAgIHByb3RvLl9odG1sICA9IHRlbXBsYXRlID8gdGVtcGxhdGUuaW5uZXJIVE1MIDogJyc7XG4gICAgfSk7XG5cbiAgICAvLyBleHRlbmRzIGVsZW1lbnRcbiAgICB2YXIgZXh0ZW5kc1Byb3RvO1xuICAgIGlmIChwcm90by5leHRlbmRzKSB7XG4gICAgICAvLyBGSVhNRSBjYW5ub3QgdXNlIGBpcz1cIngtY2hpbGRcImAgaW4gYDx0ZW1wbGF0ZT5gXG5cbiAgICAgIGlmIChoZWxwZXIuaXNDdXN0b21FbGVtZW50TmFtZShwcm90by5leHRlbmRzKSAmJlxuICAgICAgICAgIChleHRlbmRzUHJvdG8gPSBnZXRFeHRlbmRlZShwcm90by5leHRlbmRzKSkpIHtcblxuICAgICAgICAvLyBleHRlbmRzIGN1c3RvbSBlbGVtZW50XG4gICAgICAgIC8vIEZJWE1FIGNyZWF0ZSBiYXNlRWxlbWVudHMgcHJvdG90eXBlIGJ5IGRlZXBseSBjbG9uZVxuICAgICAgICBoZWxwZXIubWl4KHByb3RvLnNjb3BlLCBleHRlbmRzUHJvdG8uc2NvcGUpO1xuICAgICAgICBoZWxwZXIubWl4KHByb3RvLnVzZSwgICBleHRlbmRzUHJvdG8udXNlKTtcbiAgICAgICAgaGVscGVyLm1peChwcm90byAgICAgICwgZXh0ZW5kc1Byb3RvKTtcbiAgICAgICAgcHJvdG8uX19zdXBlcl9fID0gZXh0ZW5kc1Byb3RvO1xuICAgICAgICBleHRlbmRzUHJvdG8gICAgPSBIVE1MRWxlbWVudC5wcm90b3R5cGU7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGV4dGVuZHNQcm90byA9IE9iamVjdC5jcmVhdGUocHJvdG8uX2RvYy5jcmVhdGVFbGVtZW50KHByb3RvLmV4dGVuZHMpLmNvbnN0cnVjdG9yKS5wcm90b3R5cGU7XG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbmV3IGN1c3RvbSBlbGVtZW50XG4gICAgICBleHRlbmRzUHJvdG8gPSBIVE1MRWxlbWVudC5wcm90b3R5cGU7XG4gICAgfVxuXG4gICAgLy8gcmVnaXN0ZXIgcHJvdG90eXBlIGZvciBleHRlbmRzXG4gICAgUkVHSVNUUllfQ0xBWV9QUk9UT1RZUEVTW25hbWVdID0gaGVscGVyLmNsb25lKHByb3RvKTtcblxuICAgIC8vIG1peCBjbGF5bHVtcCBpbXBsZW1lbnRhdGlvblxuICAgIGhlbHBlci5taXgocHJvdG8sIENsYXlFbGVtZW50SW1wbCwgdHJ1ZSk7XG5cbiAgICByZXR1cm4gaGVscGVyLm1peChPYmplY3QuY3JlYXRlKGV4dGVuZHNQcm90byksIHByb3RvKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZ2V0RXh0ZW5kZWUobmFtZSkge1xuICB2YXIgcHJvdG8gPSBSRUdJU1RSWV9DTEFZX1BST1RPVFlQRVNbbmFtZV07XG4gIGlmICghcHJvdG8pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBleHRlbmRzIGAnICsgbmFtZSArICdgLCBiZWNhdXNlIG5vdCByZWdpc3RlcmVkJyk7XG4gIH1cbiAgcmV0dXJuIHByb3RvO1xufVxuXG4vKipcbiAqIEBpbXBsZW1lbnRzIENsYXlFbGVtZW50XG4gKi9cbnZhciBDbGF5RWxlbWVudEltcGwgPSB7XG4gIC8qKlxuICAgKiBpbmplY3QgdXRpbGl0eSB3aXRoIGVsZW1lbnQgaW5zdGFuY2VcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbmplY3RVc2VPYmplY3Q6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMudXNlIHx8IHt9KSwgaSA9IDAsIGFsaWFzLCBmYWN0b3J5O1xuXG4gICAgd2hpbGUgKChhbGlhcyA9IGtleXNbaSsrXSkpIHtcbiAgICAgIGlmIChzZWxmW2FsaWFzXSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmZsaWN0IGFzc2lnbiBwcm9wZXJ0eSBgJyArIGFsaWFzICsgJ2AhJyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChoZWxwZXIuaXNTdHJpbmcodGhpcy51c2VbYWxpYXNdKSkge1xuICAgICAgICBmYWN0b3J5ID0gbW9kdWxlUmVnaXN0cnkubG9hZChbdGhpcy51c2VbYWxpYXNdXSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChoZWxwZXIuaXNGdW5jdGlvbih0aGlzLnVzZVthbGlhc10pKSB7XG4gICAgICAgIGZhY3RvcnkgPSB0aGlzLnVzZVthbGlhc107XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZGV0ZWN0IG1vZHVsZSBmYWN0b3J5Jyk7XG4gICAgICB9XG5cbiAgICAgIHNlbGZbYWxpYXNdID0gZmFjdG9yeSh0aGlzKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIHByb3RlY3Qgb2JqZWN0IHJlZmVyZW5jZSBpbiBwcm90b3R5cGUuc2NvcGVcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jbG9uZVNjb3BlT2JqZWN0czogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNjb3BlID0gdGhpcy5zY29wZSxcbiAgICAgICAga2V5cyA9IE9iamVjdC5rZXlzKHNjb3BlKSwgaSA9IDAsIGtleTtcblxuICAgIHdoaWxlICgoa2V5ID0ga2V5c1tpKytdKSkge1xuICAgICAgaWYgKHR5cGVvZiBzY29wZVtrZXldID09PSAnb2JqZWN0Jykge1xuICAgICAgICAvLyBGSVhNRSBjcmVhdGUgb3duIG9iamVjdHxhcnJheSBieSBkZWVwbHkgY2xvbmVcbiAgICAgICAgc2NvcGVba2V5XSA9IGhlbHBlci5jbG9uZShzY29wZVtrZXldKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIHNob3J0aGFuZCBvZiBgdGVtcGxhdGUuaW52YWxpZGF0ZSgpYFxuICAgKi9cbiAgaW52YWxpZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50ZW1wbGF0ZS5pbnZhbGlkYXRlKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIGNoaWxkcmVuIGZpbmRlclxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAgICogQHJldHVybnMgez9FbGVtZW50fEFycmF5fVxuICAgKi9cbiAgZmluZDogZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgICB2YXIgZm91bmQgPSBoZWxwZXIudG9BcnJheSh0aGlzLnJvb3QucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuXG4gICAgaWYgKGZvdW5kLmxlbmd0aCA8PSAxKSB7XG4gICAgICByZXR1cm4gZm91bmRbMF0gfHwgbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZvdW5kO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogY2xvc2VzdCBwYXJlbnQgaGVscGVyXG4gICAqXG4gICAqIEBwYXJhbSB7RWxlbWVudHxBcnJheX0gZWxcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yXG4gICAqIEByZXR1cm5zIHs/RWxlbWVudHxBcnJheX1cbiAgICovXG4gIGNsb3Nlc3RPZjogZnVuY3Rpb24oZWwsIHNlbGVjdG9yKSB7XG4gICAgaWYgKGhlbHBlci5pc0FycmF5KGVsKSkge1xuICAgICAgcmV0dXJuIGVsLm1hcChlID0+IHRoaXMuY2xvc2VzdE9mKGUsIHNlbGVjdG9yKSk7XG4gICAgfVxuXG4gICAgdmFyIGN1cnJlbnQgPSAvKiogQHR5cGUge0VsZW1lbnR9ICovIGVsLnBhcmVudE5vZGU7XG4gICAgZG8ge1xuICAgICAgaWYgKGN1cnJlbnQgPT09IHRoaXMucm9vdCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGlmIChoZWxwZXIubWF0Y2hFbGVtZW50KGN1cnJlbnQsIHNlbGVjdG9yKSkge1xuICAgICAgICByZXR1cm4gY3VycmVudDtcbiAgICAgIH1cbiAgICB9IHdoaWxlICgoY3VycmVudCA9IGN1cnJlbnQucGFyZW50Tm9kZSkpO1xuXG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIGFuIGluc3RhbmNlIG9mIHRoZSBlbGVtZW50IGlzIGNyZWF0ZWRcbiAgICogZXhlY3V0ZSBzZXZlcmFsIGluaXRpYWxpemUgcHJvY2Vzc2VzXG4gICAqL1xuICBjcmVhdGVkQ2FsbGJhY2sgOiBmdW5jdGlvbigpIHtcblxuICAgIC8vIGNyZWF0ZSB2aXJ0dWFsIHRlbXBsYXRlICYgYWN0dWFsIGRvbVxuICAgIHRoaXMuY3JlYXRlU2hhZG93Um9vdCgpO1xuICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZS5jcmVhdGUodGhpcy5faHRtbCwgdGhpcy5zY29wZSk7IC8vIFRPRE9cbiAgICB0aGlzLnJvb3QgICAgID0gdGhpcy50ZW1wbGF0ZS5jcmVhdGVFbGVtZW50KHRoaXMuX2RvYyk7XG4gICAgaWYgKCF0aGlzLnJvb3QpIHtcbiAgICAgIHRoaXMucm9vdCA9IHRoaXMuX2RvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB9XG5cbiAgICAvLyBzZXQgcm9vdCBlbGVtZW50XG4gICAgdGhpcy5zaGFkb3dSb290LmFwcGVuZENoaWxkKHRoaXMucm9vdCk7XG4gICAgdGhpcy50ZW1wbGF0ZS5kcmF3TG9vcCh0aGlzLnJvb3QpO1xuXG4gICAgLy8gcmVzb2x2ZSB1c2UgaW5qZWN0aW9uXG4gICAgdGhpcy5faW5qZWN0VXNlT2JqZWN0KCk7XG5cbiAgICAvLyBjbG9uZSBvYmplY3RzXG4gICAgdGhpcy5fY2xvbmVTY29wZU9iamVjdHMoKTtcblxuICAgIC8vIG9yaWdpbmFsXG4gICAgdGhpcy5fY3JlYXRlZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBhbiBpbnN0YW5jZSB3YXMgaW5zZXJ0ZWQgaW50byB0aGUgZG9jdW1lbnRcbiAgICogY2FsbCBvcmlnaW5hbCBhdHRhY2hlZCBjYWxsYmFja1xuICAgKi9cbiAgYXR0YWNoZWRDYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5kZWxlZ2F0ZU1vZHVsZUNhbGxiYWNrcygnYXR0YWNoZWRDYWxsYmFjaycpO1xuXG4gICAgLy8gb3JpZ2luYWxcbiAgICB0aGlzLl9hdHRhY2hlZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBhbiBpbnN0YW5jZSB3YXMgcmVtb3ZlZCBmcm9tIHRoZSBkb2N1bWVudFxuICAgKiBjYWxsIG9yaWdpbmFsIGRldGFjaGVkIGNhbGxiYWNrXG4gICAqL1xuICBkZXRhY2hlZENhbGxiYWNrIDogZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmRlbGVnYXRlTW9kdWxlQ2FsbGJhY2tzKCdkZXRhY2hlZENhbGxiYWNrJyk7XG5cbiAgICAvLyBvcmlnaW5hbFxuICAgIHRoaXMuX2RldGFjaGVkLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIGFuIGF0dHJpYnV0ZSB3YXMgYWRkZWQsIHJlbW92ZWQsIG9yIHVwZGF0ZWRcbiAgICogY2FsbCBvcmlnaW5hbCBhdHRyIGNoYW5nZWQgY2FsbGJhY2tcbiAgICovXG4gIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA6IGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gb3JpZ2luYWxcbiAgICB0aGlzLl9hdHRyQ2hhbmdlZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gY2FsbGJhY2tNZXRob2RcbiAgICovXG4gIGRlbGVnYXRlTW9kdWxlQ2FsbGJhY2tzIDogZnVuY3Rpb24oY2FsbGJhY2tNZXRob2QpIHtcbiAgICB2YXIgYWxpYXNlcyA9IE9iamVjdC5rZXlzKHRoaXMudXNlKSxcbiAgICAgICAgYWxpYXMsIG1vZHVsZSwgY2FsbGJhY2ssIGkgPSAwO1xuXG4gICAgd2hpbGUgKChhbGlhcyA9IGFsaWFzZXNbaSsrXSkpIHtcbiAgICAgIG1vZHVsZSA9IHRoaXNbYWxpYXNdO1xuICAgICAgY2FsbGJhY2sgPSBtb2R1bGVbY2FsbGJhY2tNZXRob2RdO1xuICAgICAgaWYgKGhlbHBlci5pc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBjYWxsYmFjay5hcHBseShtb2R1bGUsIFt0aGlzXSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBjYWxsIHN1cGVyIGVsZW1lbnQncyBtZXRob2RzXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2ROYW1lXG4gICAqIEBwYXJhbSB7Li4uKn0gYXJnc1xuICAgKi9cbiAgc3VwZXI6IGZ1bmN0aW9uKG1ldGhvZE5hbWUsIC4uLmFyZ3MpIHtcbiAgICBpZiAoIXRoaXMuX19zdXBlcl9fKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZWxlbWVudCBkb2VzIG5vdCBoYXZlIHRoZSBgX19zdXBlcl9fYCcpO1xuICAgIH1cblxuICAgIHZhciBzdXBlck1ldGhvZCA9IHRoaXMuX19zdXBlcl9fW21ldGhvZE5hbWVdO1xuXG4gICAgaWYgKGhlbHBlci5pc0Z1bmN0aW9uKHN1cGVyTWV0aG9kKSkge1xuICAgICAgcmV0dXJuIHN1cGVyTWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvZXMgbm90IGV4aXN0cyBtZXRob2QgaW4gc3VwZXIgZWxlbWVudCBzcGVjaWZpZWQ6ICcgKyBzdXBlck1ldGhvZCk7XG4gICAgfVxuICB9XG59OyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAcGFyYW0ge09iamVjdH0gdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBmcm9tXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvdmVyd3JpdGVdXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbmZ1bmN0aW9uIG1peCh0bywgZnJvbSwgb3ZlcndyaXRlKSB7XG4gIHZhciBpID0gMCwga2V5cyA9IE9iamVjdC5rZXlzKGZyb20pLCBwcm9wO1xuXG4gIHdoaWxlICgocHJvcCA9IGtleXNbaSsrXSkpIHtcbiAgICBpZiAob3ZlcndyaXRlIHx8ICF0b1twcm9wXSkge1xuICAgICAgdG9bcHJvcF0gPSBmcm9tW3Byb3BdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdG87XG59XG5cbi8qKlxuICogc2hhbGxvdyBmbGF0dGVuXG4gKiBAcGFyYW0ge0FycmF5fSBsaXN0XG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW4obGlzdCkge1xuICB2YXIgaSA9IDAsIGl0ZW0sIHJldCA9IFtdO1xuICB3aGlsZSAoKGl0ZW0gPSBsaXN0W2krK10pKSB7XG4gICAgaWYgKGlzQXJyYXkoaXRlbSkpIHtcbiAgICAgIHJldCA9IHJldC5jb25jYXQoaXRlbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldC5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG4vKipcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogbWl4KHt9LCBvYmopXG59XG5cbi8qKlxuICogQHBhcmFtIHtBcnJheX0gYXJyYXlcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gdW5pcShhcnJheSkge1xuICB2YXIgcmV0ID0gW10sIGkgPSAwLCBpdGVtO1xuXG4gIHdoaWxlICgoaXRlbSA9IGFycmF5W2krK10pKSB7XG4gICAgaWYgKHJldC5pbmRleE9mKGl0ZW0pID09PSAtMSkge1xuICAgICAgcmV0LnB1c2goaXRlbSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbi8qKlxuICogZ2V0IGNhY2hlZCBgbWF0Y2hlc1NlbGVjdG9yYCBtZXRob2QgbmFtZVxuICovXG52YXIgbWF0Y2hlck5hbWU7XG5mdW5jdGlvbiBnZXRNYXRjaGVyTmFtZSgpIHtcbiAgaWYgKG1hdGNoZXJOYW1lKSB7XG4gICAgcmV0dXJuIG1hdGNoZXJOYW1lO1xuICB9XG5cbiAgdmFyIGxpc3QgID0gWydtYXRjaGVzJywgJ3dlYmtpdE1hdGNoZXNTZWxlY3RvcicsICdtb3pNYXRjaGVzU2VsZWN0b3InLCAnbXNNYXRjaGVzU2VsZWN0b3InXSxcbiAgICAgIHByb3RvID0gSFRNTEVsZW1lbnQucHJvdG90eXBlLCBpID0gMCwgbmFtZTtcblxuICB3aGlsZSgobmFtZSA9IGxpc3RbaSsrXSkpIHtcbiAgICBpZiAocHJvdG9bbmFtZV0pIHtcbiAgICAgIG1hdGNoZXJOYW1lID0gbmFtZTtcbiAgICAgIHJldHVybiBtYXRjaGVyTmFtZTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBtYXRjaCBlbGVtZW50IHdpdGggc2VsZWN0b3JcbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvclxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIG1hdGNoRWxlbWVudChlbGVtZW50LCBzZWxlY3Rvcikge1xuICByZXR1cm4gZWxlbWVudFtnZXRNYXRjaGVyTmFtZSgpXShzZWxlY3Rvcik7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gdG9TdHJpbmcodmFsdWUpIHtcbiAgdmFyIG9ialN0ciA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIHJldHVybiBvYmpTdHIuc2xpY2Uob2JqU3RyLmluZGV4T2YoJyAnKSArIDEsIC0xKTtcbn1cblxuLyoqXG4gKiBmYWtlIGFycmF5IChsaWtlIE5vZGVMaXN0LCBBcmd1bWVudHMgZXRjKSBjb252ZXJ0IHRvIEFycmF5XG4gKiBAcGFyYW0geyp9IGZha2VBcnJheVxuICogQHJldHVybnMge0FycmF5fVxuICovXG5mdW5jdGlvbiB0b0FycmF5KGZha2VBcnJheSkge1xuICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZmFrZUFycmF5KTtcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm5zIHtCb29sZWFufVxuICovXG5mdW5jdGlvbiBpc1N0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJztcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNOdW1iZXIodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcic7XG59XG5cbi8qKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXkodmFsdWUpIHtcbiAgcmV0dXJuIHRvU3RyaW5nKHZhbHVlKSA9PT0gJ0FycmF5Jztcbn1cblxuLyoqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIHRvU3RyaW5nKHZhbHVlKSA9PT0gJ09iamVjdCc7XG59XG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IGxvY2FsTmFtZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQ3VzdG9tRWxlbWVudE5hbWUobG9jYWxOYW1lKSB7XG4gIHJldHVybiBsb2NhbE5hbWUuaW5kZXhPZignLScpICE9PSAtMTtcbn1cblxuLyoqXG4gKiBAc2VlIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTYwNjc5Ny91c2Utb2YtYXBwbHktd2l0aC1uZXctb3BlcmF0b3ItaXMtdGhpcy1wb3NzaWJsZS8xMzkzMTYyNyMxMzkzMTYyN1xuICogQHBhcmFtIHtGdW5jdGlvbn0gY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7QXJyYXl9IGFyZ3NcbiAqIEByZXR1cm5zIHtpbnZva2UuRn1cbiAqL1xuZnVuY3Rpb24gaW52b2tlKGNvbnN0cnVjdG9yLCBhcmdzKSB7XG4gIHZhciBmO1xuICBmdW5jdGlvbiBGKCkge1xuICAgIC8vIGNvbnN0cnVjdG9yIHJldHVybnMgKip0aGlzKipcbiAgICByZXR1cm4gY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJncyk7XG4gIH1cbiAgRi5wcm90b3R5cGUgPSBjb25zdHJ1Y3Rvci5wcm90b3R5cGU7XG4gIGYgPSBuZXcgRigpO1xuICBmLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7XG4gIHJldHVybiBmO1xufVxuXG4vKipcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGhhbmRsZXJcbiAqL1xuZnVuY3Rpb24gcmVhZHkoaGFuZGxlcikge1xuICBpZiAoRkxHX0RPTV9BTFJFQURZKSB7XG4gICAgaGFuZGxlcigpO1xuICB9IGVsc2Uge1xuICAgIFNUQUNLX1JFQURZX0hBTkRMRVJTLnB1c2goaGFuZGxlcik7XG4gIH1cbn1cblxudmFyIEZMR19ET01fQUxSRUFEWSAgICAgID0gZmFsc2UsXG4gICAgU1RBQ0tfUkVBRFlfSEFORExFUlMgPSBbXTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICBGTEdfRE9NX0FMUkVBRFkgPSB0cnVlO1xuICB2YXIgaSA9IDAsIHJlYWR5O1xuICB3aGlsZSAocmVhZHkgPSBTVEFDS19SRUFEWV9IQU5ETEVSU1tpKytdKSB7XG4gICAgcmVhZHkoKTtcbiAgfVxufSwgZmFsc2UpO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIG5vb3AgICAgICA6IGZ1bmN0aW9uIG5vb3AoKSB7fSxcbiAgbWl4ICAgICAgIDogbWl4LFxuICB1bmlxICAgICAgOiB1bmlxLFxuICBjbG9uZSAgICAgOiBjbG9uZSxcbiAgZmxhdHRlbiAgIDogZmxhdHRlbixcbiAgcmVhZHkgICAgIDogcmVhZHksXG4gIGludm9rZSAgICA6IGludm9rZSxcbiAgdG9BcnJheSAgIDogdG9BcnJheSxcbiAgdG9TdHJpbmcgIDogdG9TdHJpbmcsXG5cbiAgbWF0Y2hFbGVtZW50IDogbWF0Y2hFbGVtZW50LFxuXG4gIGlzU3RyaW5nICAgICAgICAgICAgOiBpc1N0cmluZyxcbiAgaXNOdW1iZXIgICAgICAgICAgICA6IGlzTnVtYmVyLFxuICBpc0FycmF5ICAgICAgICAgICAgIDogaXNBcnJheSxcbiAgaXNGdW5jdGlvbiAgICAgICAgICA6IGlzRnVuY3Rpb24sXG4gIGlzT2JqZWN0ICAgICAgICAgICAgOiBpc09iamVjdCxcbiAgaXNDdXN0b21FbGVtZW50TmFtZSA6IGlzQ3VzdG9tRWxlbWVudE5hbWVcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBoZWxwZXIgIGZyb20gJy4vaGVscGVyJztcblxuY2xhc3MgQ2xheU1vZHVsZSB7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5yZWdpc3RyeSA9IFtdO1xuICB9XG5cbiAgcmVnaXN0ZXIobmFtZSwgZmFjdG9yeSkge1xuICAgIHRoaXMucmVnaXN0cnlbbmFtZV0gPSBmYWN0b3J5O1xuICB9XG5cbiAgbG9hZChuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMucmVnaXN0cnlbbmFtZV1cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgQ2xheU1vZHVsZSgpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgaGVscGVyIGZyb20gJy4uL2hlbHBlcic7XG5cbnZhciBSRVhfRVZFTlRfU1BSSVRURVIgPSAvXFxzKy87XG5cbi8qKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtPYmplY3R9IGV2ZW50c1xuICogQHJldHVybnMge0NsYXlFdmVudH1cbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZmFjdG9yeShjb250ZXh0KSB7XG4gIHJldHVybiBuZXcgQ2xheUV2ZW50KGNvbnRleHQucm9vdCwgY29udGV4dC5ldmVudHMgfHwge30pO1xufTtcblxuLyoqXG4gKiBAY2xhc3MgQ2xheUV2ZW50XG4gKi9cbmNsYXNzIENsYXlFdmVudCB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudHNcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbCwgZXZlbnRzKSB7XG4gICAgdGhpcy5jdXJyZW50SGFuZGxlcnMgPSBbXTtcbiAgICB0aGlzLnNldEVsKGVsKTtcbiAgICB0aGlzLnNldEV2ZW50cyhldmVudHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIGV2ZW50IGhvc3QgZWxlbWVudFxuICAgKlxuICAgKiBAcHJvcGVydHkge0VsZW1lbnR9IGVsXG4gICAqL1xuXG4gIC8qKlxuICAgKiBiYWNrYm9uZS5qcyBzdHlsZSBgZXZlbnRzYCBvYmplY3RcbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogICBldmVudHMgPSB7XG4gICAqICAgICAnY2xpY2sgLmZvbyc6ICdvbkNsaWNrJyxcbiAgICogICAgICdjbGljayAuYmFyJzogZnVuY3Rpb24oZSkge1xuICAgKiAgICAgICAvLyBkbyBzb21ldGhpbmdcbiAgICogICAgIH1cbiAgICogICB9XG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsIChzdHJpbmd8ZnVuY3Rpb24pPn0gZXZlbnRzXG4gICAqL1xuXG4gIC8qKlxuICAgKiBAdHlwZWRlZiB7T2JqZWN0fSBEZWxlZ2F0ZUluZm9cbiAgICogQHByb3BlcnR5IHtTdHJpbmd9IGV2ZW50IC0gZXZlbnQgdHlwZSBuYW1lXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGhhbmRsZXIgLSBldmVudCBoYW5kbGVyIChib3VuZCAmIGRlbGVnYXRlZClcbiAgICovXG5cbiAgLyoqXG4gICAqIHN0b3JlIGN1cnJlbnQgZGVsZWdhdGUgaW5mbyBmb3IgdXNpbmcgYGRpc2FibGUoKWBcbiAgICpcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbi48RGVsZWdhdGVJbmZvPn0gY3VycmVudEhhbmRsZXJcbiAgICovXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAgICovXG4gIHNldEVsKGVsKSB7XG4gICAgdGhpcy5lbCA9IGVsO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudHNcbiAgICovXG4gIHNldEV2ZW50cyhldmVudHMpIHtcbiAgICB0aGlzLmV2ZW50cyA9IGV2ZW50cztcbiAgfVxuXG4gIC8qKlxuICAgKiBlbmFibGUgYWxsIGRlbGVnYXRlIGV2ZW50c1xuICAgKiBoYW5kbGVycyBwaWNrdXAgZnJvbSBnaXZlbiBjb250ZXh0IG9iamVjdFxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdXG4gICAqL1xuICBlbmFibGUoY29udGV4dCkge1xuICAgIHZhciBpID0gMCwga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuZXZlbnRzKSxcbiAgICAgICAgZXZlbnRBbmRTZWxlY3RvciwgbWV0aG9kT3JOYW1lLCBoYW5kbGVyO1xuXG4gICAgY29udGV4dCA9IGNvbnRleHQgfHwgdGhpcztcblxuICAgIHdoaWxlICgoZXZlbnRBbmRTZWxlY3RvciA9IGtleXNbaSsrXSkpIHtcbiAgICAgIG1ldGhvZE9yTmFtZSA9IHRoaXMuZXZlbnRzW2V2ZW50QW5kU2VsZWN0b3JdO1xuICAgICAgaGFuZGxlciA9IGhlbHBlci5pc0Z1bmN0aW9uKG1ldGhvZE9yTmFtZSkgPyBtZXRob2RPck5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogY29udGV4dFttZXRob2RPck5hbWVdO1xuICAgICAgZXZlbnRBbmRTZWxlY3RvciA9IGV2ZW50QW5kU2VsZWN0b3Iuc3BsaXQoUkVYX0VWRU5UX1NQUklUVEVSKTtcbiAgICAgIHRoaXMub24oZXZlbnRBbmRTZWxlY3RvclswXSwgZXZlbnRBbmRTZWxlY3RvclsxXSwgaGFuZGxlciwgY29udGV4dCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIGFzc2lnbiBldmVudCBkZWxlZ2F0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gaGFuZGxlclxuICAgKiBAcGFyYW0geyp9IGNvbnRleHRcbiAgICovXG4gIG9uKGV2ZW50LCBzZWxlY3RvciwgaGFuZGxlciwgY29udGV4dCkge1xuICAgIHZhciBkZWxlZ2F0ZWQgPSB0aGlzLmNyZWF0ZUhhbmRsZXIoc2VsZWN0b3IsIGhhbmRsZXIpLmJpbmQoY29udGV4dCk7XG4gICAgdGhpcy5jdXJyZW50SGFuZGxlcnMucHVzaCh7XG4gICAgICBldmVudCAgIDogZXZlbnQsXG4gICAgICBoYW5kbGVyIDogZGVsZWdhdGVkXG4gICAgfSk7XG4gICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBkZWxlZ2F0ZWQsIHRydWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIGNyZWF0ZSBkZWxlZ2F0ZWQgaGFuZGxlclxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3JcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gaGFuZGxlclxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAqL1xuICBjcmVhdGVIYW5kbGVyKHNlbGVjdG9yLCBoYW5kbGVyKSB7XG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtFdmVudH0gZXZ0XG4gICAgICovXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgdmFyIGhvc3QgICA9IGV2dC5jdXJyZW50VGFyZ2V0LFxuICAgICAgICAgIHRhcmdldCA9IGV2dC50YXJnZXQ7XG5cbiAgICAgIGRvIHtcbiAgICAgICAgaWYgKHRhcmdldCA9PT0gaG9zdCkge1xuICAgICAgICAgIC8vIG5vdCBkZWxlZ2F0ZVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWxwZXIubWF0Y2hFbGVtZW50KHRhcmdldCwgc2VsZWN0b3IpKSB7XG4gICAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9IHdoaWxlICgodGFyZ2V0ID0gdGFyZ2V0LnBhcmVudE5vZGUpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogZW1pdCBldmVudHMgdG8gc3BlY2lmaWVkIHRhcmdldCBlbGVtZW50XG4gICAqXG4gICAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvRXZlbnRzXG4gICAqIEBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL01vdXNlRXZlbnRcbiAgICogQHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvS2V5Ym9hcmRFdmVudFxuICAgKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9Gb2N1c0V2ZW50XG4gICAqXG4gICAqIEBwYXJhbSB7RWxlbWVudHxBcnJheX0gdGFyZ2V0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtCb29sZWFufSBbYnViYmxlPWZhbHNlXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtjYW5jZWw9dHJ1ZV1cbiAgICovXG4gIGVtaXQodGFyZ2V0LCB0eXBlLCBvcHRpb25zID0ge30sIGJ1YmJsZSA9IGZhbHNlLCBjYW5jZWwgPSB0cnVlKSB7XG4gICAgaWYgKGhlbHBlci5pc0FycmF5KHRhcmdldCkpIHtcbiAgICAgIGhlbHBlci50b0FycmF5KHRhcmdldClcbiAgICAgICAgICAgIC5mb3JFYWNoKGVsID0+IHRoaXMuZW1pdChlbCwgdHlwZSwgb3B0aW9ucywgYnViYmxlLCBjYW5jZWwpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZXZlbnQ7XG4gICAgaGVscGVyLm1peChvcHRpb25zLCB7XG4gICAgICBjYW5CdWJibGUgIDogYnViYmxlLFxuICAgICAgY2FuY2VsYWJsZSA6IGNhbmNlbCxcbiAgICAgIHZpZXcgICAgICAgOiB3aW5kb3dcbiAgICB9KTtcblxuICAgIHN3aXRjaCh0eXBlKSB7XG4gICAgICBjYXNlICdjbGljayc6XG4gICAgICBjYXNlICdkYmNsaWNrJzpcbiAgICAgIGNhc2UgJ21vdXNlb3Zlcic6XG4gICAgICBjYXNlICdtb3VzZW1vdmUnOlxuICAgICAgY2FzZSAnbW91c2VvdXQnOlxuICAgICAgY2FzZSAnbW91c2V1cCc6XG4gICAgICBjYXNlICdtb3VzZWRvd24nOlxuICAgICAgY2FzZSAnbW91c2VlbnRlcic6XG4gICAgICBjYXNlICdtb3VzZWxlYXZlJzpcbiAgICAgIGNhc2UgJ2NvbnRleHRtZW51JzpcbiAgICAgICAgZXZlbnQgPSBuZXcgTW91c2VFdmVudCh0eXBlLCBvcHRpb25zKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdmb2N1cyc6XG4gICAgICBjYXNlICdibHVyJzpcbiAgICAgIGNhc2UgJ2ZvY3VzaW4nOlxuICAgICAgY2FzZSAnZm9jdXNvdXQnOlxuICAgICAgICBldmVudCA9IG5ldyBGb2N1c0V2ZW50KHR5cGUsIG9wdGlvbnMpOyAvLyBUT0RPIGltcGxlbWVudGVkIGluIGFueSBlbnY/XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAna2V5dXAnOlxuICAgICAgY2FzZSAna2V5ZG93bic6XG4gICAgICBjYXNlICdrZXlwcmVzcyc6XG4gICAgICAgIGV2ZW50ID0gbmV3IEtleWJvYXJkRXZlbnQodHlwZSwgb3B0aW9ucyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgZXZlbnQgPSBuZXcgRXZlbnQodHlwZSwgb3B0aW9ucyk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHRhcmdldC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBkaXNhYmxlIGFsbCBkZWxlZ2F0ZWQgZXZlbnRzXG4gICAqL1xuICBkaXNhYmxlKCkge1xuICAgIHZhciBpID0gMCwgb2JqO1xuICAgIHdoaWxlICgob2JqID0gdGhpcy5jdXJyZW50SGFuZGxlcnNbaSsrXSkpIHtcbiAgICAgIHRoaXMuZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihvYmouZXZlbnQsIG9iai5oYW5kbGVyLCB0cnVlKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50SGFuZGxlcnMgPSBbXTtcbiAgfVxuXG4gIGF0dGFjaGVkQ2FsbGJhY2soY29udGV4dCkge1xuICAgIHRoaXMuZW5hYmxlKGNvbnRleHQpO1xuICB9XG5cbiAgZGV0YWNoZWRDYWxsYmFjayhjb250ZXh0KSB7XG4gICAgdGhpcy5kaXNhYmxlKGNvbnRleHQpO1xuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBlbGVtZW50IGZyb20gJy4vZWxlbWVudCc7XG5pbXBvcnQgaGVscGVyICBmcm9tICcuL2hlbHBlcic7XG5cbnZhciBSRUdJU1RSWV9DTEFZX0VMRU1FTlRTID0ge307XG5cbi8qKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbcHJvdG9dXG4gKi9cbmZ1bmN0aW9uIENsYXlSZWdpc3RlcihuYW1lLCBwcm90byA9IHt9KSB7XG5cbiAgaWYgKFJFR0lTVFJZX0NMQVlfRUxFTUVOVFNbbmFtZV0pIHtcbiAgICAvLyBhbHJlYWR5IHJlZ2lzdGVyZWRcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgb3B0aW9ucyA9IHtcbiAgICBwcm90b3R5cGU6IGVsZW1lbnQuY3JlYXRlKG5hbWUsIHByb3RvKVxuICB9O1xuXG4gIGlmIChwcm90by5leHRlbmRzICYmICFoZWxwZXIuaXNDdXN0b21FbGVtZW50TmFtZShwcm90by5leHRlbmRzKSkge1xuICAgIG9wdGlvbnMuZXh0ZW5kcyA9IHByb3RvLmV4dGVuZHM7XG4gIH1cblxuICBSRUdJU1RSWV9DTEFZX0VMRU1FTlRTW25hbWVdID0gZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KG5hbWUsIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBDbGF5UmVnaXN0ZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCBoZWxwZXIgZnJvbSBcIi4vaGVscGVyXCI7XG5cbi8qKlxuICpcbiAqL1xuZXhwb3J0IGRlZmF1bHQge1xuICByZWdpc3RlcjogZnVuY3Rpb24obmFtZSwgZnVuYykge1xuICAgIHRoaXNbbmFtZV0gPSBmdW5jO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5pbXBvcnQgKiBhcyBoICAgICAgIGZyb20gJ3ZpcnR1YWwtZG9tL2gnO1xuaW1wb3J0ICogYXMgZGlmZiAgICBmcm9tICd2aXJ0dWFsLWRvbS9kaWZmJztcbmltcG9ydCAqIGFzIHBhdGNoICAgZnJvbSAndmlydHVhbC1kb20vcGF0Y2gnO1xuaW1wb3J0ICogYXMgY3JlYXRlICBmcm9tICd2aXJ0dWFsLWRvbS9jcmVhdGUtZWxlbWVudCc7XG5cbmltcG9ydCBoZWxwZXIgICAgICAgZnJvbSBcIi4vaGVscGVyXCI7XG5pbXBvcnQgdG1wbEhlbHBlciAgIGZyb20gXCIuL3RlbXBsYXRlLWhlbHBlclwiO1xuXG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lICA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG52YXIgU1RSX0VWQUxfRlVOQ1RJT05fU1lNQk9MID0gJ19fRVZBTF9GVU5DVElPTl9fJztcblxuZXhwb3J0IGRlZmF1bHQge1xuICAvKipcbiAgICogQHN0YXRpY1xuICAgKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICAgKiBAcGFyYW0ge09iamVjdH0gW3Njb3BlXVxuICAgKiBAcmV0dXJucyB7Q2xheVRlbXBsYXRlfVxuICAgKi9cbiAgY3JlYXRlOiBmdW5jdGlvbihodG1sLCBzY29wZSkge1xuICAgIHJldHVybiBuZXcgQ2xheVRlbXBsYXRlKGh0bWwsIHNjb3BlKTtcbiAgfVxufTtcblxuLyoqXG4gKiBAY2xhc3MgQ2xheVRlbXBsYXRlXG4gKi9cbmNsYXNzIENsYXlUZW1wbGF0ZSB7XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBodG1sXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbc2NvcGVdXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgY29uc3RydWN0b3IoaHRtbCwgc2NvcGUgPSB7fSkge1xuICAgIHRoaXMuX2RpZmZRdWV1ZSAgID0gW107XG4gICAgdGhpcy5faW52YWxpZGF0ZWQgPSBmYWxzZTtcblxuICAgIHRoaXMuc2NvcGUgICAgPSBzY29wZTtcblxuICAgIHRyeSB7XG4gICAgICB0aGlzLmNvbXBpbGVkID0gSlNPTi5wYXJzZShodG1sLCBmdW5jdGlvbihrZXksIHZhbCkge1xuICAgICAgICBpZiAoKHZhbCB8fCB7fSlbU1RSX0VWQUxfRlVOQ1RJT05fU1lNQk9MXSkge1xuICAgICAgICAgIHJldHVybiBoZWxwZXIuaW52b2tlKEZ1bmN0aW9uLCB2YWwuYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgaWYgKCF3aW5kb3cuQ2xheVJ1bnRpbWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXF1aXJlIHJ1bnRpbWUgbGlicmFyeSBmb3IgdGVtcGxhdGUgY29tcGlsaW5nJyk7XG4gICAgICB9XG4gICAgICB2YXIgY29tcGlsZXIgPSB3aW5kb3cuQ2xheVJ1bnRpbWUuY29tcGlsZXIuY3JlYXRlKCk7XG4gICAgICB0aGlzLmNvbXBpbGVkID0gY29tcGlsZXIuY29tcGlsZUZyb21IdG1sKGh0bWwpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJvcGVydHkge09iamVjdH0gc2NvcGVcbiAgICovXG5cbiAgLyoqXG4gICAqIGNvbXBpbGVkIERPTSBzdHJ1Y3R1cmVcbiAgICogQHByb3BlcnR5IHtEb21TdHJ1Y3R1cmV9IGNvbXBpbGVkXG4gICAqL1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcHJvcGVydHkge1ZpcnR1YWxOb2RlfSBfY3VycmVudFZUcmVlXG4gICAqL1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcHJvcGVydHkge0FycmF5fSBfZGlmZlF1ZXVlXG4gICAqL1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59IF9pbnZhbGlkYXRlZFxuICAgKi9cblxuICAvKipcbiAgICogY3JlYXRlIFZpcnR1YWxOb2RlIGZyb20gY29tcGlsZWQgRG9tU3RydWN0dXJlICYgZ2l2ZW4gc2NvcGVcbiAgICpcbiAgICogQHJldHVybnMge1ZpcnR1YWxOb2RlfVxuICAgKi9cbiAgY3JlYXRlVlRyZWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRWVHJlZSA9IGNvbnZlcnRQYXJzZWREb21Ub1ZUcmVlKHRoaXMuY29tcGlsZWQsIHRoaXMuc2NvcGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIGNyZWF0ZSBFbGVtZW50IGZyb20gVmlydHVhbE5vZGVcbiAgICpcbiAgICogQHBhcmFtIHtEb2N1bWVudH0gW2RvY11cbiAgICogQHJldHVybnMgez9FbGVtZW50fVxuICAgKi9cbiAgY3JlYXRlRWxlbWVudChkb2MgPSBkb2N1bWVudCkge1xuICAgIHJldHVybiBjcmVhdGUodGhpcy5jcmVhdGVWVHJlZSgpLCB7XG4gICAgICBkb2N1bWVudDogZG9jXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogaW52YWxpZGF0ZSBzY29wZSBWaXJ0dWFsTm9kZSBuZWVkcyB1cGRhdGluZyBkaWZmXG4gICAqIE5vIG1hdHRlciBob3cgbWFueSB0aW1lcyBhcyB3YXMgY2FsbGVkXG4gICAqIGl0IGlzIGNhbGxlZCBvbmx5IG9uY2UgaW4gYnJvd3NlcidzIG5leHQgZXZlbnQgbG9vcFxuICAgKi9cbiAgaW52YWxpZGF0ZSgpIHtcbiAgICBpZiAodGhpcy5faW52YWxpZGF0ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5faW52YWxpZGF0ZWQgPSB0cnVlO1xuICAgIHNldFRpbWVvdXQodGhpcy5fdXBkYXRlLmJpbmQodGhpcyksIDQpO1xuICB9XG5cbiAgLyoqXG4gICAqIGNvbXB1dGUgVmlydHVhbE5vZGUgZGlmZlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3VwZGF0ZSgpIHtcbiAgICB2YXIgY3VycmVudCA9IHRoaXMuX2N1cnJlbnRWVHJlZSxcbiAgICAgICAgdXBkYXRlZCA9IGNvbnZlcnRQYXJzZWREb21Ub1ZUcmVlKHRoaXMuY29tcGlsZWQsIHRoaXMuc2NvcGUpO1xuXG4gICAgdGhpcy5fZGlmZlF1ZXVlID0gZGlmZihjdXJyZW50LCB1cGRhdGVkKTtcbiAgICB0aGlzLl9jdXJyZW50VlRyZWUgPSB1cGRhdGVkO1xuXG4gICAgdGhpcy5faW52YWxpZGF0ZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBkcmF3aW5nIHJlcXVlc3RBbmltYXRpb25GcmFtZSBsb29wXG4gICAqIGFwcGx5IHBhdGNoIGZvciBkb20gd2hlbiBkaWZmIGV4aXN0c1xuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFJvb3RcbiAgICovXG4gIGRyYXdMb29wKHRhcmdldFJvb3QpIHtcbiAgICB2YXIgcGF0Y2hET00gPSAoKT0+IHtcbiAgICAgIGlmICh0aGlzLl9kaWZmUXVldWUpIHtcbiAgICAgICAgcGF0Y2godGFyZ2V0Um9vdCwgdGhpcy5fZGlmZlF1ZXVlKTtcbiAgICAgICAgdGhpcy5fZGlmZlF1ZXVlID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUocGF0Y2hET00pO1xuICAgIH07XG5cbiAgICBwYXRjaERPTSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIGRlc3RydWN0IHByb3BlcnR5IHJlZmVyZW5jZXNcbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5zY29wZSA9IHRoaXMuY29tcGlsZWQgPSBudWxsO1xuICB9XG59XG5cbi8qKlxuICogY29udmVydCB0byBWaXJ0dWFsTm9kZSBmcm9tIERvbVN0cnVjdHVyZVxuICpcbiAqIEBwYXJhbSB7RG9tU3RydWN0dXJlfSBkb21cbiAqIEBwYXJhbSB7T2JqZWN0fSBzY29wZVxuICogQHBhcmFtIHtCb29sZWFufSBbaWdub3JlUmVwZWF0XVxuICogQHJldHVybnMge1ZpcnR1YWxOb2RlfVxuICovXG5mdW5jdGlvbiBjb252ZXJ0UGFyc2VkRG9tVG9WVHJlZShkb20sIHNjb3BlLCBpZ25vcmVSZXBlYXQpIHtcbiAgdmFyIHRhZyAgICAgID0gZG9tLm5hbWUsXG4gICAgICB0eXBlICAgICA9IGRvbS50eXBlLFxuICAgICAgZGF0YSAgICAgPSBkb20uZGF0YSxcbiAgICAgIG9yZ0F0dHJzID0gZG9tLmF0dHJpYnMgIHx8IHt9LFxuICAgICAgb3JnU3R5bGUgPSBkb20uc3R5bGUgICAgfHwgJycsXG4gICAgICBjaGlsZHJlbiA9IGRvbS5jaGlsZHJlbiB8fCBbXSxcbiAgICAgIGV2YWxzICAgID0gZG9tLmV2YWx1YXRvcnMsXG4gICAgICBhdHRycyAgICA9IHt9LFxuICAgICAgc3R5bGUgICAgPSB7fSxcbiAgICAgIGhvb2tzICAgID0ge30sXG4gICAgICBrZXlzLCBrZXksIGkgPSAwO1xuXG4gIHN3aXRjaCh0eXBlKSB7XG4gICAgY2FzZSAndGFnJzpcblxuICAgICAgLy8gaWYgZGV0ZWN0aW9uXG4gICAgICBpZiAoZXZhbHMuaWYgJiYgIWV2YWxzLmlmKHNjb3BlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgLy8gdW5sZXNzIGRldGVjdGlvblxuICAgICAgaWYgKGV2YWxzLnVubGVzcyAmJiBldmFscy51bmxlc3Moc2NvcGUpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICAvLyByZXBlYXQgZWxlbWVudHNcbiAgICAgIGlmIChldmFscy5yZXBlYXQgJiYgIWlnbm9yZVJlcGVhdCkge1xuICAgICAgICByZXR1cm4gZXZhbHMucmVwZWF0KHNjb3BlKS5tYXAoY2hpbGRTY29wZSA9PiBjb252ZXJ0UGFyc2VkRG9tVG9WVHJlZShkb20sIGNoaWxkU2NvcGUsIHRydWUpKTtcbiAgICAgIH1cblxuICAgICAgLy8gZXZhbCBzdHlsZXNcbiAgICAgIGlmIChvcmdTdHlsZSkge1xuICAgICAgICBzdHlsZSA9IGV2YWxzLnN0eWxlID8gZXZhbHMuc3R5bGUoc2NvcGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBvcmdTdHlsZTtcbiAgICAgICAgc3R5bGUgPSBjb252ZXJ0Q3NzU3RyaW5nVG9PYmplY3Qoc3R5bGUpO1xuICAgICAgfVxuXG4gICAgICAvLyBldmFsIGF0dHJpYnV0ZXNcbiAgICAgIGtleXMgPSBPYmplY3Qua2V5cyhvcmdBdHRycyk7XG4gICAgICB3aGlsZSAoKGtleSA9IGtleXNbaSsrXSkpIHtcbiAgICAgICAgYXR0cnNba2V5XSA9IGV2YWxzLmF0dHJzW2tleV0gPyBldmFscy5hdHRyc1trZXldKHNjb3BlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IG9yZ0F0dHJzW2tleV07XG4gICAgICAgIGlmICh0bXBsSGVscGVyW2tleV0pIHtcbiAgICAgICAgICBob29rc1trZXldID0gaG9vayh0bXBsSGVscGVyW2tleV0sIGF0dHJzW2tleV0pOyAvLyBUT0RPIGVuaGFuY2VtZW50XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gZmxhdHRlbiBjaGlsZHJlblxuICAgICAgY2hpbGRyZW4gPSBjaGlsZHJlbi5tYXAoY2hpbGQgPT4gY29udmVydFBhcnNlZERvbVRvVlRyZWUoY2hpbGQsIHNjb3BlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHYpIHsgcmV0dXJuICEhdjsgfSk7XG4gICAgICBjaGlsZHJlbiA9IGhlbHBlci5mbGF0dGVuKGNoaWxkcmVuKTtcblxuICAgICAgLy8gY3JlYXRlIFZUcmVlXG4gICAgICByZXR1cm4gaCh0YWcsIGhlbHBlci5taXgoe1xuICAgICAgICBhdHRyaWJ1dGVzIDogYXR0cnMsXG4gICAgICAgIHN0eWxlICAgICAgOiBzdHlsZVxuICAgICAgfSwgaG9va3MpLCBjaGlsZHJlbik7XG5cbiAgICBjYXNlICd0ZXh0JzpcbiAgICAgIC8vIGV2YWwgdGV4dFxuICAgICAgcmV0dXJuIFN0cmluZyhldmFscy5kYXRhID8gZXZhbHMuZGF0YShzY29wZSkgOiBkYXRhKTtcblxuICAgIGNhc2UgJ2NvbW1lbnQnOlxuICAgICAgLy8gaWdub3JlXG4gICAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIGNvbnZlcnQgdG8gb2JqZWN0IGZyb20gc3R5bGUgYXR0cmlidXRlIHZhbHVlXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNzc1N0clxuICogQHJldHVybnMge09iamVjdH1cbiAqL1xuZnVuY3Rpb24gY29udmVydENzc1N0cmluZ1RvT2JqZWN0KGNzc1N0cikge1xuICB2YXIgY3NzU3RyaW5ncyA9IGNzc1N0ci5yZXBsYWNlKC9cXHMvZywgJycpLnNwbGl0KCc7JyksXG4gICAgICByZXRTdHlsZSAgID0ge30sXG4gICAgICBpID0gMCwgcHJvcF92YWx1ZTtcblxuICB3aGlsZSAoKHByb3BfdmFsdWUgPSBjc3NTdHJpbmdzW2krK10pKSB7XG4gICAgcHJvcF92YWx1ZSA9IHByb3BfdmFsdWUuc3BsaXQoJzonKTtcbiAgICByZXRTdHlsZVtwcm9wX3ZhbHVlWzBdXSA9IHByb3BfdmFsdWVbMV07XG4gIH1cblxuICByZXR1cm4gcmV0U3R5bGU7XG59XG5cbi8qKlxuICogaG9vayBjbGFzc1xuICogQGNsYXNzIEhvb2tXcmFwcGVyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHBhcmFtIHsqfSB2YWxcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5jbGFzcyBIb29rV3JhcHBlciB7XG5cbiAgY29uc3RydWN0b3IoZm4sIHZhbCkge1xuICAgIHRoaXMuZm4gID0gZm47XG4gICAgdGhpcy52YWwgPSB2YWw7XG4gIH1cblxuICBob29rKCkge1xuICAgIHRoaXMuZm4uYXBwbHkodGhpcywgW3RoaXMudmFsXS5jb25jYXQoaGVscGVyLnRvQXJyYXkoYXJndW1lbnRzKSkpO1xuICB9XG59XG5cbi8qKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSB7Kn0gdmFsXG4gKiBAcmV0dXJucyB7SG9va1dyYXBwZXJ9XG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gaG9vayhmbiwgdmFsKSB7XG4gIHJldHVybiBuZXcgSG9va1dyYXBwZXIoZm4sIHZhbClcbn1cbiJdfQ==
