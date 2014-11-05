var gulp    = require('gulp');
var uglify  = require('gulp-uglify');
var rename  = require('gulp-rename');
var header  = require('gulp-header');
var package = require('./package.json');
var banner  = '/*! <%= name %> - v<%= version %> */'

function bufferedBrowserify(standaloneName) {
  var transform     = require('vinyl-transform');
  var browserify    = require('browserify');
  var to5browserify = require('6to5-browserify');

  return transform(function(filename) {
    return browserify(filename, {standalone: standaloneName, debug: true})
      .transform(to5browserify)
      .bundle();
  });
}

gulp.task('build-core', function() {
  var name = 'Claylump';

  return gulp.src('./src/_index.js')
    .pipe(bufferedBrowserify(name))
    .pipe(header(banner, {name: name, version: package.version}))
    .pipe(rename('claylump.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(uglify({
      preserveComments: 'some'
    }))
    .pipe(rename('claylump.min.js'))
    .pipe(gulp.dest('./dist'))
});

gulp.task('build-runtime', function() {
  var name = 'ClayRuntime';

  return gulp.src('./src/_runtime.js')
    .pipe(bufferedBrowserify(name))
    .pipe(header(banner, {name: name, version: package.version}))
    .pipe(rename('claylump.runtime.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(uglify({
      preserveComments: 'some'
    }))
    .pipe(rename('claylump.runtime.min.js'))
    .pipe(gulp.dest('./dist'))
});

gulp.task('pretest', function() {
  var espower = require('gulp-espower');

  gulp.src('./test/**/*.js')
    .pipe(espower())
    .pipe(gulp.dest('./temp'));
});

gulp.task('build', function() {
  gulp.start('build-core', 'build-runtime');
});
