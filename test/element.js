'use strict';
describe('ClayElement', function () {
  var element, load;
  element = Claylump.element;
  load = function (path) {
    var head, link;
    link = document.createElement('link');
    link.rel = 'import';
    link.href = path;
    head = document.querySelector('head');
    head.appendChild(link);
    return link;
  };
  describe('initiation', function () {
    var plainProto;
    plainProto = element.create('x-plain', {
      foo: 'foo',
      scope: { baz: 'baz' }
    });
    document.registerElement('x-plain', { prototype: plainProto });
    it('prototype inheritance', function () {
      var extendedProto;
      extendedProto = element.create('x-extend', {
        'extends': 'x-plain',
        bar: 'bar',
        scope: { qux: 'qux' }
      });
      assert(extendedProto.foo === 'foo');
      assert(extendedProto.bar === 'bar');
      assert(extendedProto.scope.baz === 'baz');
      assert(extendedProto.scope.qux === 'qux');
    });
    it('prototype inheritance does not effect base element property', function () {
      var extendedProto;
      extendedProto = element.create('x-extend', {
        'extends': 'x-plain',
        foo: 'bar',
        scope: { baz: 'qux' }
      });
      assert(plainProto.foo === 'foo');
      assert(plainProto.scope.baz === 'baz');
      assert(extendedProto.foo === 'bar');
      assert(extendedProto.scope.baz === 'qux');
    });
    it('traversal <template> & parse html', function (done) {
      return load('/test/fixture/element/template_test.html').onload = function () {
        var el;
        el = Object.create(document.createElement('x-template-test').constructor);
        assert(el.prototype._html === '<h1>Hello World</h1>');
        done();
      };
    });
    it('attached set `root` & `template`', function (done) {
      return load('/test/fixture/element/template_test.html').onload = function () {
        var el;
        el = document.createElement('x-template-test');
        document.body.appendChild(el);
        assert(el.root.innerHTML === 'Hello World');
        assert(el.root.tagName === 'H1');
        assert(el.template.compiled.name === 'h1');
        assert(el.template.compiled.type === 'tag');
        document.body.removeChild(el);
        done();
      };
    });
    it('`use` & `events` properties are can inheritance & override');
  });
  describe('lifecycle callbacks', function () {
    var hostObj, spy;
    hostObj = null;
    spy = null;
    beforeEach(function () {
      hostObj = {
        callback: function () {
          return this.i++;
        }
      };
      spy = sinon.spy(hostObj, 'callback');
    });
    it('created', function () {
      var el, proto;
      proto = element.create('x-created', {
        i: 0,
        createdCallback: hostObj.callback
      });
      document.registerElement('x-created-test', { prototype: proto });
      assert(!spy.called);
      el = document.createElement('x-created-test');
      assert(spy.calledOnce);
      assert(el.i === 1);
    });
    it('attached', function () {
      var el, proto;
      proto = element.create('x-attached', {
        i: 0,
        attachedCallback: hostObj.callback
      });
      document.registerElement('x-attached-test', { prototype: proto });
      el = document.createElement('x-attached-test');
      assert(!spy.called);
      document.body.appendChild(el);
      assert(spy.calledOnce);
      assert(el.i === 1);
      document.body.removeChild(el);
    });
    it('detached', function () {
      var el, proto;
      proto = element.create('x-detached', {
        i: 0,
        detachedCallback: hostObj.callback
      });
      document.registerElement('x-detached-test', { prototype: proto });
      el = document.createElement('x-detached-test');
      document.body.appendChild(el);
      assert(!spy.called);
      document.body.removeChild(el);
      assert(spy.calledOnce);
      assert(el.i === 1);
    });
    it('attrChanged', function () {
      var el, proto;
      proto = element.create('x-attr-changed-test', {
        i: 0,
        attributeChangedCallback: hostObj.callback
      });
      document.registerElement('x-attr-changed-test', { prototype: proto });
      el = document.createElement('x-attr-changed-test');
      assert(!spy.called);
      el.setAttribute('foo', 'bar');
      assert(spy.calledOnce);
      assert(el.i === 1);
    });
  });
  describe('inject module', function () {
    document.registerElement('x-inject-test', {
      prototype: element.create('x-inject-test', {
        use: {
          test: function (ctx) {
            return {
              method: function () {
                return ctx;
              }
            };
          }
        }
      })
    });
    it('module assign specified alias', function () {
      var el;
      el = document.createElement('x-inject-test');
      assert(el.test !== null);
      assert(el.test.method() === el);
    });
  });
  describe('call base element super method', function () {
    document.registerElement('x-super-test', {
      prototype: element.create('x-super-test', {
        prop: 'super',
        test: function (a) {
          return 'this is super' + a;
        }
      })
    });
    document.registerElement('x-sub-test', {
      prototype: element.create('x-sub-test', {
        'extends': 'x-super-test',
        prop: 'sub',
        test: function (a) {
          return 'this is sub' + a;
        }
      })
    });
    it('call correctly', function () {
      var el;
      el = document.createElement('x-sub-test');
      assert(el.test('!') === 'this is sub!');
      assert(el['super']('test', '!') === 'this is super!');
    });
    it('can not call from inheritance root (does not have the super)', function () {
      var el;
      el = document.createElement('x-super-test');
      try {
        el['super']('test', '!');
      } catch (e$) {
        assert(true);
      }
    });
    it('can not specify a property that is not a function.', function () {
      var el;
      el = document.createElement('x-super-test');
      try {
        el['super']('prop');
      } catch (e$) {
        assert(true);
      }
    });
  });
  describe('element traversal helper', function () {
    it('`find` one return element', function (done) {
      load('/test/fixture/element/traversal_test.html').onload = function () {
        var el, found;
        el = document.createElement('x-traversal-test');
        document.body.appendChild(el);
        found = el.find('#ury');
        assert(found instanceof Element);
        document.body.removeChild(el);
        done();
      };
    });
    it('`find` some return array', function (done) {
      load('/test/fixture/element/traversal_test.html').onload = function () {
        var el, found;
        el = document.createElement('x-traversal-test');
        document.body.appendChild(el);
        found = el.find('li');
        assert(found instanceof Array);
        document.body.removeChild(el);
        done();
      };
    });
    it('`closestOf` traverse parent', function (done) {
      load('/test/fixture/element/traversal_test.html').onload = function () {
        var el, found;
        el = document.createElement('x-traversal-test');
        document.body.appendChild(el);
        found = el.closestOf(el.find('#ury'), '.uwu');
        assert(found instanceof Element);
        assert(found.tagName === 'UL');
        assert(found.className === 'uwu');
        found = el.closestOf(el.find('#ury'), 'li');
        assert(found instanceof Element);
        assert(found.tagName === 'LI');
        assert(found.id === 'fuga');
        found = el.closestOf(el.find('#fuga'), 'ul');
        assert(found instanceof Element);
        assert(found.tagName === 'UL');
        assert(found.className === 'hfhp');
        document.body.removeChild(el);
        done();
      };
    });
    it('`closestOf` traverse fail', function (done) {
      load('/test/fixture/element/traversal_test.html').onload = function () {
        var el, found;
        el = document.createElement('x-traversal-test');
        document.body.appendChild(el);
        found = el.closestOf(el.find('#ury'), 'section');
        assert(found === null);
        document.body.removeChild(el);
        done();
      };
    });
  });
});
