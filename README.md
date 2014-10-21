# Claylump

Claylump is a Web Components wrapper with Virtual DOM.

## Getting Started

### Register element

```html
<template cl-element="x-test">
  <h1>Hello World</h1>
  <h2>{{foo}}</h2>
  <h3>{{baz}}</h3>
</template>

<script>
  Claylump('x-test', {
    scope: {
      foo : 'bar',
      baz : 'qux'
    }
  });
</script>
```

### Update DOM

```javascript
Claylump('x-test', {
  scope: {
    foo : 'bar',
    baz : 'qux'
  },
  attachedCallback: function() {
    setTimeout(function() {
      this.scope.foo = 'changed';
      this.invalidate(); // update (diff & patch) DOM!
    }.bind(this), 1000);
  }
});
```

### Event delegation

```javascript
Claylump('x-test', {
  events: {
    'dbclick .js-dbclick': function(evt) {
      alert('hi');
    },
    'click .js-click': 'onClick'
  },
  onClick: function() {
    console.log('click!');
  },
});
```

### Scope observer

wip...

## Dependencies

- [Matt-Esch/virtual-dom](https://github.com/Matt-Esch/virtual-dom)
- [tautologistics/node-htmlparser](https://github.com/tautologistics/node-htmlparser)
- [Polymer/platform](https://github.com/Polymer/platform)

## TODO

- [ ] add pub/sub event
- [ ] http module
- [ ] build platform.js
- [ ] scope observer
- [ ] expression support...?

## Current restriction

- Internet Explorer 10~ (using `Window#requestAnimationFrame`, `Element.matches`)
- Cannot use inherit element like `is="x-child"` in `<template>`.
