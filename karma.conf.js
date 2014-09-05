module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha'],
    files: [
      'http://cdnjs.cloudflare.com/ajax/libs/polymer/0.3.4/platform.js',
      './bower_components/power-assert/build/power-assert.js',
      './dist/claylump.js',
      './test/*.coffee'
    ],
    reporters: ['junit'],
    port: 9876,
    colors: false,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['Chrome'],
    preprocessors: {
      'test/*.coffee' : 'coffee',
      'src/*.js'      : 'coverage'
    },
    reporters: ['progress', 'coverage'],
    coverageReporter: {
      type: 'html',
      dir: 'coverage'
    },
    singleRun: true
  });
};