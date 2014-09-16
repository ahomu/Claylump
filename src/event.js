'use strict';

var helper = require('./helper');

var REX_EVENT_SPRITTER = /\s+/;

/**
 * @class ClayEvent
 */
module.exports = {
  /**
   * @static
   * @param {Element} el
   * @param {Object} events
   * @returns {ClayEvent}
   */
  create: function(el, events) {
    return new ClayEvent(el, events);
  }
};

/**
 * @param {Element} el
 * @param {Object} events
 * @constructor
 */
function ClayEvent(el, events) {
  this.el     = el;
  this.events = events;
}

helper.mix(ClayEvent.prototype, {
  /**
   * event host element
   *
   * @property {Element} el
   */
  el: null,

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
  events: {},

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
  currentHandlers: [],

  /**
   * enable all delegate events
   * handlers pickup from given context object
   *
   * @param {Object} [context]
   */
  enable: function(context) {
    var i = 0, keys = Object.keys(this.events),
        eventAndSelector, methodOrName, handler;

    context = context || this;

    while ((eventAndSelector = keys[i++])) {
      methodOrName = this.events[eventAndSelector];
      handler = helper.isFunction(methodOrName) ? methodOrName
                                                : context[methodOrName];
      eventAndSelector = eventAndSelector.split(REX_EVENT_SPRITTER);
      this.on(eventAndSelector[0], eventAndSelector[1], handler, context);
    }
  },

  /**
   * assign event delegation
   *
   * @param {String} event
   * @param {String} selector
   * @param {Function} handler
   * @param {*} context
   */
  on: function(event, selector, handler, context) {
    var delegated = this.createHandler(selector, handler).bind(context);
    this.currentHandlers.push({
      event   : event,
      handler : delegated
    });
    this.el.addEventListener(event, delegated, true);
  },

  /**
   * create delegated handler
   *
   * @param {String} selector
   * @param {Function} handler
   * @returns {Function}
   */
  createHandler: function(selector, handler) {
    /**
     * @param {Event} evt
     */
    return function(evt) {
      var host   = evt.currentTarget,
          target = evt.target;

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
    }
  },

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
  emit: function(target, type, options, bubble, cancel) {
    if (helper.isArray(target)) {
      helper.toArray(target).forEach(function(el) {
        this.emit(el, type, options, bubble, cancel);
      }.bind(this));
      return;
    }

    var event;
    options = helper.mix(options || {}, {
      canBubble  : bubble || false,
      cancelable : cancel || true,
      view       : window
    });

    switch(type) {
      case 'click':
      case 'dbclick':
      case 'mouseover':
      case 'mousemove':
      case 'mouseout':
      case 'mouseup':
      case 'mousedown':
      case 'mouseenter':
      case 'mouseleave':
      case 'contextmenu':
        event = new MouseEvent(type, options);
        break;
      case 'focus':
      case 'blur':
      case 'focusin':
      case 'focusout':
        event = new FocusEvent(type, options); // TODO implemented in any env?
        break;
      case 'keyup':
      case 'keydown':
      case 'keypress':
        event = new KeyboardEvent(type, options);
        break;
      default:
        event = new Event(type, options);
        break;
    }

    target.dispatchEvent(event);
  },

  /**
   * disable all delegated events
   */
  disable: function() {
    var i = 0, obj;
    while ((obj = this.currentHandlers[i++])) {
      this.el.removeEventListener(obj.event, obj.handler, true);
    }
    this.currentHandlers = [];
  }
});
