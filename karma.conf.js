module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha'],
    files: [
      {
       pattern: './bower_components/webcomponents.js/webcomponents.js',
       watched: false, included: true, served: false
      },
      {
       pattern: './bower_components/power-assert/build/power-assert.js',
       watched: false, included: true, served: true
      },
      {
       pattern: './dist/claylump.js',
       watched: true, included: true, served: true
      },
      {
       pattern: './test/*.coffee',
       watched: true, included: true, served: true
      },
      {
       pattern: './test/fixture/**/*.html',
       watched: true, included: false, served: true
      }
    ],
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