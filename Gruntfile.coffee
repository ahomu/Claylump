module.exports = (grunt) ->
  grunt.initConfig

    pkg: grunt.file.readJSON 'package.json'

    # Build
    browserify:
      dist:
        src  : 'index.js'
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
        'index.js'
        'src/**/*.js'
      ]
      tasks: ['browserify']

  grunt.loadNpmTasks 'grunt-browserify'
  grunt.loadNpmTasks 'grunt-espower'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-uglify'

  grunt.registerTask 'build',   ['browserify', 'uglify']
  grunt.registerTask 'pretest', ['coffee', 'espower']
  grunt.registerTask 'default', ['watch']
