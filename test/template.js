'use strict';
describe('ClayTemplate', ()=> {
  var template, tplHelper;
  template = Claylump.template;
  tplHelper = Claylump.templateHelper;
  it('create element', ()=> {
    var el, tpl;
    tpl = template.create('<div><h1>Hello World!</h1></div>');
    el = tpl.createElement();
    assert(el instanceof HTMLElement);
    assert(el.tagName === 'DIV');
    assert(el.innerHTML === '<h1>Hello World!</h1>');
  });
  it('interpolate text node', ()=> {
    var el, tpl;
    tpl = template.create('<div><h1>{{foo}} {{bar}}!</h1><h1>{{foo}} {{bar}}!</h1></div>', {
      foo: 'Hello',
      bar: 'World'
    });
    el = tpl.createElement();
    assert(el.innerHTML === '<h1>Hello World!</h1><h1>Hello World!</h1>');
  });
  it('interpolate some attributes value', ()=> {
    var el, tpl;
    tpl = template.create('<div><h1 class="foo {{foo}}">Hello {{bar}}!</h1></div>', {
      foo: 'some-class',
      bar: 'World'
    });
    el = tpl.createElement();
    assert(el.innerHTML === '<h1 class="foo some-class">Hello World!</h1>');
  });
  it('interpolate style value', ()=> {
    var el, tpl;
    tpl = template.create('<div><h1 style="width: {{w}}px; height: {{h}}px;">Hello World!</h1></div>', {
      w: 320,
      h: 240
    });
    el = tpl.createElement();
    assert(el.innerHTML === '<h1 style="width: 320px; height: 240px;">Hello World!</h1>');
  });
  it('`cl-repeat` iterate item of array', ()=> {
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
  it('`cl-if` given data is truthy when show, otherwise hide', ()=> {
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
  it('`cl-unless` given data is falsy when show, otherwise hide', ()=> {
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
  it('ignore comment node', ()=> {
    var el, tpl;
    tpl = template.create('<div><!-- Hello --><h1>World!</h1></div>');
    el = tpl.createElement();
    assert(el.innerHTML === '<h1>World!</h1>');
  });
  it('call hook of template helper', ()=> {
    var spy, tpl;
    tplHelper.register('cl-test', (val, el)=> {
      assert(val === true);
      return assert(el instanceof HTMLElement);
    });
    spy = sinon.spy(tplHelper, 'cl-test');
    tpl = template.create('<div cl-test="{{flag}}"></div>', { flag: true });
    assert(!spy.called);
    tpl.createElement();
    assert(spy.calledOnce);
  });
  it('invalidate call repeatedly when update called once', (done)=> {
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
    setTimeout(()=> {
      assert(spy.calledOnce);
      assert(el.innerHTML === '<h1>Test Complete!</h1>');
      return done();
    }, 500);
  });
});
