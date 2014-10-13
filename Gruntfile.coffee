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

    uglify:
      dist:
        options:
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> */'
        files:
          'dist/claylump.min.js': 'dist/claylump.js'

    # Test
    coffee:
      test:
        expand : true
        cwd    : 'test/'
        src    : ['*.coffee']
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
