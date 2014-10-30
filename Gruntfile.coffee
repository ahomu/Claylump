module.exports = (grunt) ->

  require('load-grunt-tasks')(grunt)

  grunt.initConfig

    pkg: grunt.file.readJSON 'package.json'

    # Build
    '6to5':
      options:
        sourceMap: false
      dist:
        files: [{
          expand : true
          cwd    : './src'
          src    : ['**/*.js']
          dest   : 'dist/temp/'
        }]

    browserify:
      dist:
        src  : 'dist/temp/_index.js'
        dest : 'dist/claylump.js'
        options:
          browserifyOptions:
            debug : true
      runtime:
        src  : 'dist/temp/_runtime.js'
        dest : 'dist/claylump.runtime.js'
        options:
          browserifyOptions:
            debug : true
      polyfill:
        src  : 'dist/temp/_polyfill.js'
        dest : 'dist/claylump.polyfill.js'
        options:
          transform:
            ['debowerify']
          browserifyOptions:
            debug : true

    uglify:
      dist:
        options:
          preserveComments: 'some'
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> */'
        files:
          'dist/claylump.min.js': 'dist/claylump.js'
          'dist/claylump.runtime.min.js': 'dist/claylump.runtime.js'
          'dist/claylump.polyfill.min.js': 'dist/claylump.polyfill.js'

    # Test
    coffee:
      test:
        expand : true
        cwd    : 'test/'
        src    : ['**/*.coffee']
        dest   : 'test/temp'
        ext    : '.js'

    espower:
      test:
        files: [
          expand : true
          cwd    : 'test/temp'
          src    : ['*.js']
          dest   : 'test/temp'
          ext    : '.js'
        ]

    watch:
      files: [
        'src/**/*.js'
      ]
      tasks: ['6to5', 'browserify']

  grunt.registerTask 'build',   ['6to5', 'browserify', 'uglify']
  grunt.registerTask 'pretest', ['coffee', 'espower']
  grunt.registerTask 'default', ['watch']
