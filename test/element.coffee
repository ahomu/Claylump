'use strict';

describe 'ClayElement', ->

  element = Claylump.element

  load = (path) ->
    link = document.createElement 'link'
    link.rel = 'import'
    link.href = path
    head = document.querySelector 'head'
    head.appendChild link
    link

  describe 'initiation', ->

    plainProto    = element.create 'x-plain',
      foo: 'foo'
      scope:
        baz: 'baz'

    document.registerElement 'x-plain',
      prototype: plainProto

    it 'prototype inheritance', ->

      extendedProto = element.create 'x-extend',
        extends: 'x-plain'
        bar: 'bar'
        scope:
          qux: 'qux'

      assert extendedProto.foo == 'foo'
      assert extendedProto.bar == 'bar'
      assert extendedProto.scope.baz == 'baz'
      assert extendedProto.scope.qux == 'qux'

    it 'prototype inheritance does not effect base element property', ->

      extendedProto = element.create 'x-extend',
        extends: 'x-plain'
        foo: 'bar',
        scope:
          baz: 'qux'

      assert plainProto.foo == 'foo'
      assert plainProto.scope.baz == 'baz'
      assert extendedProto.foo == 'bar'
      assert extendedProto.scope.baz == 'qux'

    it 'traversal <template> & parse html', (done)->
      (load '/test/fixture/element/template_test.html').onload = ->
        el = Object.create document.createElement('x-template-test').constructor
        assert el.prototype._html == '<h1>Hello World</h1>'
        done()

    it 'attached set `root` & `template`', (done)->
      (load '/test/fixture/element/template_test.html').onload = ->
        el = document.createElement 'x-template-test'
        document.body.appendChild el

        assert el.root.innerHTML == 'Hello World'
        assert el.root.tagName == 'H1'
        assert el.template.compiled.name == 'h1'
        assert el.template.compiled.type == 'tag'

        document.body.removeChild el
        done()

    it '`use` & `events` properties are can inheritance & override'

  describe 'lifecycle callbacks', ->

    hostObj = null
    spy = null

    beforeEach ->
      hostObj =
        callback: ->
          @i++
      spy = sinon.spy hostObj, 'callback'

    it 'created', ->

      proto = element.create 'x-created',
        i: 0
        createdCallback: hostObj.callback

      document.registerElement 'x-created-test',
        prototype: proto

      assert !spy.called
      el = document.createElement 'x-created-test'
      assert spy.calledOnce
      assert el.i == 1

    it 'attached', ->
      proto = element.create 'x-attached',
        i: 0
        attachedCallback: hostObj.callback

      document.registerElement 'x-attached-test',
        prototype: proto

      el = document.createElement 'x-attached-test'
      assert !spy.called
      document.body.appendChild el
      assert spy.calledOnce
      assert el.i == 1
      document.body.removeChild el

    it 'detached', ->
      proto = element.create 'x-detached',
        i: 0
        detachedCallback: hostObj.callback

      document.registerElement 'x-detached-test',
        prototype: proto

      el = document.createElement 'x-detached-test'
      document.body.appendChild el
      assert !spy.called
      document.body.removeChild el
      assert spy.calledOnce
      assert el.i == 1

    it 'attrChanged', ->
      proto = element.create 'x-attr-changed-test',
        i: 0
        attributeChangedCallback: hostObj.callback

      document.registerElement 'x-attr-changed-test',
        prototype: proto

      el = document.createElement 'x-attr-changed-test'
      assert !spy.called
      el.setAttribute 'foo', 'bar'
      assert spy.calledOnce
      assert el.i == 1

  describe 'inject module', ->

    document.registerElement 'x-inject-test',
      prototype: element.create 'x-inject-test',
        use:
          test : (ctx)->
            return method: ->
              return ctx

#    it 'instance `use` property is null', ->
#      el = document.createElement 'x-inject-test'
#
#      assert el.use == null

    it 'module assign specified alias', ->
      el = document.createElement 'x-inject-test'

      assert el.test != null
      assert el.test.method() == el

  describe 'call base element super method', ->

    document.registerElement 'x-super-test',
      prototype: element.create 'x-super-test',
        prop : 'super'
        test : (a)->
          return 'this is super' + a

    document.registerElement 'x-sub-test',
      prototype: element.create 'x-sub-test',
        extends: 'x-super-test'
        prop : 'sub'
        test : (a)->
          return 'this is sub' + a

    it 'call correctly', ->
      el = document.createElement 'x-sub-test'
      assert el.test('!') == 'this is sub!'
      assert el.super('test', '!') == 'this is super!'

    it 'can not call from inheritance root (does not have the super)', ->
      el = document.createElement 'x-super-test'

      try
        el.super 'test', '!'
      catch
        assert true

    it 'can not specify a property that is not a function.', ->
      el = document.createElement 'x-super-test'

      try
        el.super 'prop'
      catch
        assert true

  describe 'element traversal helper', ->

    it '`find` one return element', (done)->
      (load '/test/fixture/element/traversal_test.html').onload = ->
        el = document.createElement 'x-traversal-test'
        document.body.appendChild el
        found = el.find '#ury'

        assert found instanceof Element

        document.body.removeChild el
        done()

    it '`find` some return array', (done)->
      (load '/test/fixture/element/traversal_test.html').onload = ->
        el = document.createElement 'x-traversal-test'
        document.body.appendChild el
        found = el.find 'li'

        assert found instanceof Array

        document.body.removeChild el
        done()

    it '`closestOf` traverse parent', (done)->
      (load '/test/fixture/element/traversal_test.html').onload = ->
        el = document.createElement 'x-traversal-test'
        document.body.appendChild el

        found = el.closestOf el.find('#ury'), '.uwu'
        assert found instanceof Element
        assert found.tagName == 'UL'
        assert found.className == 'uwu'

        found = el.closestOf el.find('#ury'), 'li'
        assert found instanceof Element
        assert found.tagName == 'LI'
        assert found.id == 'fuga'

        found = el.closestOf el.find('#fuga'), 'ul'
        assert found instanceof Element
        assert found.tagName == 'UL'
        assert found.className == 'hfhp'

        document.body.removeChild el
        done()

    it '`closestOf` traverse fail', (done)->
      (load '/test/fixture/element/traversal_test.html').onload = ->
        el = document.createElement 'x-traversal-test'
        document.body.appendChild el

        found = el.closestOf el.find('#ury'), 'section'
        assert found == null

        document.body.removeChild el
        done()
