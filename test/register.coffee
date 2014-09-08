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

      assert testEl.scope.foo == 'bar'
      assert testEl.scope.bar == 'baz'
      assert testEl.hoge() == 'hoge'
      assert typeof testEl.createdCallback  == 'function'
      done()

  it 'extending native elements', (done)->

    (load 'test/fixture/register/extends_native.html').onload = ->
      testEl = document.createElement 'div', 'x-extends-native'

      assert testEl.scope.foo == 'bar'
      assert typeof testEl.createdCallback  == 'function'
      done()

  it 'extending custom elements', (done)->

    (load 'test/fixture/register/basic.html').onload = ->
      (load 'test/fixture/register/extends_custom.html').onload = ->
        testEl = document.createElement 'x-test-extends'

        assert testEl.scope.foo == 'baz'
        assert testEl.scope.bar == 'baz'
        assert testEl.scope.qux == 'bar'
        assert testEl.hoge() == 'fuga'
        assert testEl.hige() == 'piyo'
        assert testEl.super('hoge') == 'hoge'

        testEl = document.createElement 'x-test'
        assert testEl.scope.foo == 'bar'
        assert testEl.scope.bar == 'baz'
        assert testEl.hoge() == 'hoge'

        done()
