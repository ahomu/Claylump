var gulp    = require('gulp');
var uglify  = require('gulp-uglify');
var rename  = require('gulp-rename');
var header  = require('gulp-header');
var jshint  = require('gulp-jshint');
var plumber = require('gulp-plumber');
var bump    = require('gulp-bump');
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

gulp.task('jshint', function() {
  return gulp.src(['./index.js', './src/**/*.js'])
    .pipe(jshint('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('bump', function(){
  return gulp.src('./package.json')
    .pipe(bump({type:'patch'}))
    .pipe(gulp.dest('./'));
});

gulp.task('build', function() {
  gulp.start('build-core', 'build-runtime');
});

gulp.task('release', function() {
  gulp.start('jshint', 'build', 'bump');
});

gulp.task('pretest', function() {
  gulp.start('build-core', 'build-test');
});

gulp.task('watch', function() {
  gulp.watch('./src/**/*.js', function() {
    gulp.start('jshint', 'build-core');
  });
});

gulp.task('build-core', function() {
  var name = 'Claylump';

  return gulp.src('./src/_index.js')
    .pipe(plumber())
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

gulp.task('build-test', function() {
  var espower = require('gulp-espower');

  gulp.src('./test/runner.js')
    .pipe(bufferedBrowserify(null))
    .pipe(gulp.dest('./temp'));

  return gulp.src(['./test/**/*.js', '!./test/runner.js'])
    .pipe(bufferedBrowserify(null))
    .pipe(espower())
    .pipe(gulp.dest('./temp'));
});
