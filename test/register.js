'use strict';
describe('ClayRegister', ()=> {
  var load;
  load = function (path) {
    var head, link;
    link = document.createElement('link');
    link.rel = 'import';
    link.href = path;
    head = document.querySelector('head');
    head.appendChild(link);
    return link;
  };
  it('register Claylump element', (done)=> {
    return load('/test/fixture/register/basic.html').onload = ()=> {
      var testEl;
      testEl = document.createElement('x-test');
      assert(testEl.scope.foo === 'bar');
      assert(testEl.scope.bar === 'baz');
      assert(testEl.hoge() === 'hoge');
      assert(typeof testEl.createdCallback === 'function');
      done();
    };
  });
  it('extending native elements', (done)=> {
    return load('/test/fixture/register/extends_native.html').onload = ()=> {
      var testEl;
      testEl = document.createElement('div', 'x-extends-native');
      assert(testEl.scope.foo === 'bar');
      assert(typeof testEl.createdCallback === 'function');
      done();
    };
  });
  it('extending custom elements', (done)=> {
    load('/test/fixture/register/basic.html').onload = ()=> {
      load('/test/fixture/register/extends_custom.html').onload = ()=> {
        var testEl;
        testEl = document.createElement('x-test-extends');
        assert(testEl.scope.foo === 'baz');
        assert(testEl.scope.bar === 'baz');
        assert(testEl.scope.qux === 'bar');
        assert(testEl.hoge() === 'fuga');
        assert(testEl.hige() === 'piyo');
        assert(testEl['super']('hoge') === 'hoge');
        testEl = document.createElement('x-test');
        assert(testEl.scope.foo === 'bar');
        assert(testEl.scope.bar === 'baz');
        assert(testEl.hoge() === 'hoge');
        done();
      };
    };
  });
});
