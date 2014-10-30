'use strict';

describe 'ClayEvent', ->

  event = Claylump.modules.event
  el    = null

  beforeEach ->
    el = document.createElement 'div'
    el.style.display = 'none'
    el.innerHTML = '<span class="foo">foo<span class="bar">bar<span class="baz">baz</span></span></span>'
    document.body.appendChild el

  afterEach ->
    document.body.removeChild el

  it 'delegate event with context and method name', ->

    context =
      handler : ->
        return 'foo!'
    spy = sinon.spy context, 'handler'

    evt = event el,
      'click .foo': 'handler'

    evt.enable context
    assert !spy.called
    evt.emit el.querySelector('.foo'), 'click'
    assert spy.calledOnce

  it 'delegate event with function literal', ->

    evt = event el,
      'click .bar': ->
        return 'bar!'
    spy = sinon.spy evt.events, 'click .bar'

    evt.enable()
    assert !spy.called
    evt.emit el.querySelector('.bar'), 'click'
    assert spy.calledOnce

  it 'delegate event with custom event', ->

    evt = event el,
      'custom-event .baz': ->
        return 'baz!'
    spy = sinon.spy evt.events, 'custom-event .baz'

    evt.enable()
    assert !spy.called
    evt.emit el.querySelector('.baz'), 'custom-event'
    assert spy.calledOnce

  it 'delegate events with multiple type & handler', ->
    evt = event el,
      'click .foo': ->
        return 'foo!'
      'mouseover .bar': ->
        return 'bar!'
      'custom-event .baz': ->
        return 'baz!'
    spy1 = sinon.spy evt.events, 'click .foo'
    spy2 = sinon.spy evt.events, 'mouseover .bar'
    spy3 = sinon.spy evt.events, 'custom-event .baz'

    evt.enable()
    assert !spy1.called
    assert !spy2.called
    assert !spy3.called
    evt.emit el.querySelector('.foo'), 'click'
    assert spy1.calledOnce
    evt.emit el.querySelector('.bar'), 'mouseover'
    assert spy2.calledOnce
    evt.emit el.querySelector('.baz'), 'custom-event'
    assert spy3.calledOnce

  it 'delegate nested elements', ->

    evt = event el,
      'custom-event .foo': ->
        return 'foo from baz!'
    spy = sinon.spy evt.events, 'custom-event .foo'

    evt.enable()
    assert !spy.called
    evt.emit el.querySelector('.baz'), 'custom-event'
    assert spy.calledOnce

  it 'disable delegate events', ->

    evt = event el,
      'click .foo': ->
        return 'foo!'
    spy = sinon.spy evt.events, 'click .foo'

    evt.enable()
    assert !spy.called
    evt.emit el.querySelector('.foo'), 'click'
    assert spy.calledOnce

    evt.disable()
    evt.emit el.querySelector('.foo'), 'click'
    assert spy.calledOnce
