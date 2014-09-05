'use strict';

describe 'ClayRegister', ->

  load = null

  beforeEach ->
    load = (path) ->
      link = document.createElement 'link'
      link.rel = 'import'
      link.href = path
      head = document.querySelector 'head'
      head.appendChild link
      link

  it 'register Claylump element', (done)->

    (load 'test/fixture/register/basic.html').onload = ->
      testEl = document.createElement 'x-test'

      assert testEl.foo == 'bar'
      assert testEl.bar == 'baz'
      assert typeof testEl.createdCallback  == 'function'
      done()

  it 'extending native elements', (done)->

    (load 'test/fixture/register/extends_native.html').onload = ->
      testEl = document.createElement 'div', 'x-extends-native'

      assert testEl.foo == 'bar'
      assert typeof testEl.createdCallback  == 'function'
      done()

  it 'extending custom elements', (done)->

    (load 'test/fixture/register/basic.html').onload = ->
      (load 'test/fixture/register/extends_custom.html').onload = ->
        testEl = document.createElement 'x-test-extends'

        assert testEl.foo == 'baz'
        assert testEl.bar == 'baz'
        assert testEl.qux == 'bar'

        testEl = document.createElement 'x-test'
        assert testEl.foo == 'bar'
        assert testEl.bar == 'baz'
        done()
