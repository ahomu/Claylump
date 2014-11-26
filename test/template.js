'use strict';
describe('ClayTemplate', function () {
  var template, tplHelper;
  template = Claylump.template;
  tplHelper = Claylump.templateHelper;
  it('create element', function () {
    var el, tpl;
    tpl = template.create('<div><h1>Hello World!</h1></div>');
    el = tpl.createElement();
    assert(el instanceof HTMLElement);
    assert(el.tagName === 'DIV');
    assert(el.innerHTML === '<h1>Hello World!</h1>');
  });
  it('interpolate text node', function () {
    var el, tpl;
    tpl = template.create('<div><h1>{{foo}} {{bar}}!</h1><h1>{{foo}} {{bar}}!</h1></div>', {
      foo: 'Hello',
      bar: 'World'
    });
    el = tpl.createElement();
    assert(el.innerHTML === '<h1>Hello World!</h1><h1>Hello World!</h1>');
  });
  it('interpolate some attributes value', function () {
    var el, tpl;
    tpl = template.create('<div><h1 class="foo {{foo}}">Hello {{bar}}!</h1></div>', {
      foo: 'some-class',
      bar: 'World'
    });
    el = tpl.createElement();
    assert(el.innerHTML === '<h1 class="foo some-class">Hello World!</h1>');
  });
  it('interpolate style value', function () {
    var el, tpl;
    tpl = template.create('<div><h1 style="width: {{w}}px; height: {{h}}px;">Hello World!</h1></div>', {
      w: 320,
      h: 240
    });
    el = tpl.createElement();
    assert(el.innerHTML === '<h1 style="width: 320px; height: 240px;">Hello World!</h1>');
  });
  it('`cl-repeat` iterate item of array', function () {
    var el, tpl;
    tpl = template.create('<ul><li cl-repeat="{{item in items}}">{{item}}</li></ul>', {
      items: [
        'foo',
        'bar',
        'baz'
      ]
    });
    el = tpl.createElement();
    assert(el.innerHTML === '<li>foo</li><li>bar</li><li>baz</li>');
  });
  it('`cl-if` given data is truthy when show, otherwise hide', function () {
    var el, tpl;
    tpl = template.create('<div><div cl-if="{{show}}">Hello World</div><div cl-if="{{hide}}">Goodbye World</div></div>', {
      show: true,
      hide: false
    });
    el = tpl.createElement();
    assert(el.innerHTML === '<div>Hello World</div>');
    tpl = template.create('<div cl-if="{{flag}}">Hello World</div>', { flag: false });
    el = tpl.createElement();
    assert(el === null);
  });
  it('`cl-unless` given data is falsy when show, otherwise hide', function () {
    var el, tpl;
    tpl = template.create('<div><div cl-unless="{{show}}">Hello World</div><div cl-unless="{{hide}}">Goodbye World</div></div>', {
      show: false,
      hide: true
    });
    el = tpl.createElement();
    assert(el.innerHTML === '<div>Hello World</div>');
    tpl = template.create('<div cl-unless="{{flag}}">Hello World</div>', { flag: true });
    el = tpl.createElement();
    assert(el === null);
  });
  it('ignore comment node', function () {
    var el, tpl;
    tpl = template.create('<div><!-- Hello --><h1>World!</h1></div>');
    el = tpl.createElement();
    assert(el.innerHTML === '<h1>World!</h1>');
  });
  it('call hook of template helper', function () {
    var spy, tpl;
    tplHelper.register('cl-test', function (val, el) {
      assert(val === true);
      return assert(el instanceof HTMLElement);
    });
    spy = sinon.spy(tplHelper, 'cl-test');
    tpl = template.create('<div cl-test="{{flag}}"></div>', { flag: true });
    assert(!spy.called);
    tpl.createElement();
    assert(spy.calledOnce);
  });
  it('invalidate call repeatedly when update called once', function (done) {
    var el, scope, spy, tpl;
    scope = {
      foo: 'Hello',
      bar: 'World'
    };
    tpl = template.create('<div><h1>{{foo}} {{bar}}!</h1></div>', scope);
    el = tpl.createElement();
    spy = sinon.spy(tpl, '_update');
    tpl.drawLoop(el);
    assert(el.innerHTML === '<h1>Hello World!</h1>');
    assert(!spy.called);
    scope.foo = 'Test';
    scope.bar = 'Complete';
    tpl.invalidate();
    tpl.invalidate();
    tpl.invalidate();
    tpl.invalidate();
    setTimeout(function () {
      assert(spy.calledOnce);
      assert(el.innerHTML === '<h1>Test Complete!</h1>');
      return done();
    }, 500);
  });
});
