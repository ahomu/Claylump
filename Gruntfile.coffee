module.exports = (grunt) ->
  grunt.initConfig
    pkg: '<json:package.json>'
    browserify:
      dist:
        src  : 'index.js'
        dest : 'dist/claylump.js'
        options:
          browserifyOptions:
            debug : true

    watch:
      files: [
        'index.js'
        'src/**/*.js'
      ]
      tasks: ['build']

  grunt.loadNpmTasks 'grunt-browserify'
  grunt.loadNpmTasks 'grunt-contrib-watch'

  grunt.registerTask 'build', ['browserify']
  grunt.registerTask 'default', ['watch']