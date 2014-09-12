'use strict';

describe 'ClayTemplate', ->

  template  = Claylump.Template
  tplHelper = Claylump.TemplateHelper

  it 'create element', ->
    tpl = template.create '<div><h1>Hello World!</h1></div>'
    el = tpl.createElement()

    assert el instanceof HTMLElement
    assert el.tagName == 'DIV'
    assert el.innerHTML == '<h1>Hello World!</h1>'

  it 'interpolate text node', ->
    tpl = template.create '<div><h1>{{foo}} {{bar}}!</h1><h1>{{foo}} {{bar}}!</h1></div>',
      foo: 'Hello'
      bar: 'World'
    el = tpl.createElement()

    assert el.innerHTML == '<h1>Hello World!</h1><h1>Hello World!</h1>'

  it 'interpolate some attributes value', ->
    tpl = template.create '<div><h1 class="foo {{foo}}">Hello {{bar}}!</h1></div>',
      foo: 'some-class'
      bar: 'World'
    el = tpl.createElement()

    assert el.innerHTML == '<h1 class="foo some-class">Hello World!</h1>'

  it 'interpolate style value', ->
    tpl = template.create '<div><h1 style="width: {{w}}px; height: {{h}}px;">Hello World!</h1></div>',
      w: 320
      h: 240
    el = tpl.createElement()

    assert el.innerHTML == '<h1 style="width: 320px; height: 240px;">Hello World!</h1>'

  it 'repeat array', ->
    tpl = template.create '<ul><li cl-repeat="{{item in items}}">{{item}}</li></ul>',
      items: ['foo', 'bar', 'baz']
    el = tpl.createElement()

    assert el.innerHTML == '<li>foo</li><li>bar</li><li>baz</li>'

  it 'ignore comment node', ->
    tpl = template.create '<div><!-- Hello --><h1>World!</h1></div>'
    el = tpl.createElement()

    assert el.innerHTML == '<h1>World!</h1>'

  it 'call hook of template helper', ->
    tplHelper.register 'cl-test', ()->

    spy = sinon.spy tplHelper, 'cl-test'

    tpl = template.create '<div cl-test></div>'

    assert !spy.called
    tpl.createElement()
    assert spy.calledOnce

  it 'invalidate call repeatedly when update called once', (done) ->
    scope =
      foo : 'Hello'
      bar : 'World'

    tpl = template.create '<div><h1>{{foo}} {{bar}}!</h1></div>', scope
    el = tpl.createElement()
    spy = sinon.spy tpl, '_update'
    tpl.drawLoop(el)

    assert el.innerHTML == '<h1>Hello World!</h1>'
    assert !spy.called

    scope.foo = 'Test'
    scope.bar = 'Complete'
    tpl.invalidate()
    tpl.invalidate()
    tpl.invalidate()
    tpl.invalidate()

    setTimeout ->
      assert spy.calledOnce
      assert el.innerHTML == '<h1>Test Complete!</h1>'
      done()
    , 500
