'use strict';

import helper from './helper';

var REX_EVENT_SPRITTER = /\s+/;

export default {
  /**
   * @param {Element} el
   * @param {Object} events
   * @returns {ClayEvent}
   */
  create: function(el, events) {
    return new ClayEvent(el, events);
  }
};

/**
 * @class ClayEvent
 */
class ClayEvent {
  /**
   * @param {Element} el
   * @param {Object} events
   * @constructor
   */
  constructor(el, events) {
    this.currentHandlers = [];
    this.setEl(el);
    this.setEvents(events);
  }

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
  setEl(el) {
    this.el = el;
  }

  /**
   * @param {Object} events
   */
  setEvents(events) {
    this.events = events;
  }

  /**
   * enable all delegate events
   * handlers pickup from given context object
   *
   * @param {Object} [context]
   */
  enable(context) {
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
  }

  /**
   * assign event delegation
   *
   * @param {String} event
   * @param {String} selector
   * @param {Function} handler
   * @param {*} context
   */
  on(event, selector, handler, context) {
    var delegated = this.createHandler(selector, handler).bind(context);
    this.currentHandlers.push({
      event   : event,
      handler : delegated
    });
    this.el.addEventListener(event, delegated, true);
  }

  /**
   * create delegated handler
   *
   * @param {String} selector
   * @param {Function} handler
   * @returns {Function}
   */
  createHandler(selector, handler) {
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
  }

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
  emit(target, type, options = {}, bubble = false, cancel = true) {
    if (helper.isArray(target)) {
      helper.toArray(target)
            .forEach(el => this.emit(el, type, options, bubble, cancel));
      return;
    }

    var event;
    helper.mix(options, {
      canBubble  : bubble,
      cancelable : cancel,
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
  }

  /**
   * disable all delegated events
   */
  disable() {
    var i = 0, obj;
    while ((obj = this.currentHandlers[i++])) {
      this.el.removeEventListener(obj.event, obj.handler, true);
    }
    this.currentHandlers = [];
  }
}
