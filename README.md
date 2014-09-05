#WIP

Javaの世界から帰ってきたのでリハビリ中

```html
<template cl-element="hello-world">
  <article id="post-3102" class="post-3102 post type-post status-publish format-standard hentry category-publication category-web-design-and-applications">
    <header class="entry-header">

      <h2 class="entry-title">
        <a href="http://www.w3.org/blog/news/archives/3102" rel="bookmark">Widget Updates Note, Introduction to {{acme_feature}} Draft Published</a>
      </h2>

      <div class="entry-meta">
        <p>
          <span class="date"><time class="entry-date" datetime="2013-06-06T08:50:42+00:00">6 June 2013</time></span>						</p>
      </div><!-- .entry-meta -->
    </header><!-- .entry-header -->

    <div class="entry-content">
      <p>The <a href="http://www.w3.org/2008/webapps/">Web Applications Working Group</a> has published two documents today:</p>
      <p>{{author.name}} / {{author.mail}}</p>
      <ul class="show_items">
        <li>A Group Note of <a href="http://www.w3.org/TR/2013/NOTE-widgets-updates-20130606/">Widget Updates</a>. This specification defines a process and a document format to allow a user agent to update an installed widget package with a different version of a widget package. A widget cannot automatically update itself; instead, a widget relies on the user agent to manage the update process. The working group reached consensus to stop work on this specification. It is published for archival reasons and no longer progresses along the W3C’s Recommendation Track.</li>
        <li>A Working Draft of <a href="http://www.w3.org/TR/2013/WD-components-intro-20130606/">Introduction to {{acme_feature}}</a>. This document is a non-normative reference, which provides an overview of {{acme_feature}}. It summarizes the normative information in the respective specifications in easy-to-digest prose with illustrations.</li>
      </ul>
      <p>Learn more about the <a href="http://www.w3.org/2006/rwc/">Rich Web Client Activity</a>.</p>
    </div><!-- .entry-content -->

    <footer class="entry-meta">
      <!-- original: http://www.w3.org/blog/news/archives/3102 -->
    </footer><!-- .entry-meta -->
  </article>
</template>

<script>
  Claylump('hello-world', {
    acme_feature: 'Web Components',
    author: {
      name: 'unknown',
      mail: 'unknown@example.com'
    },
    extend: 'div',
    use: {
    },
    mixin: [
    ],
    createdCallback: function() {
      console.log('created');
    },
    attachedCallback: function() {
      console.log('attached');
    },
    detachedCallback: function() {
      console.log('detached');
    },
    attributeChangedCallback: function() {
      console.log('attribute changed');
    }
  });
</script>

```

#TODO
- expression support
- event delegation
- es6promise?
- platform.js

#restrict
- cannot use inherit element like `is="x-child"` in `<template>`