module.exports = function (grunt, config, tasks) {
  "use strict";
  // `config` vars set in `Gruntconfig.yml`
  var openBrowserAtStart;
  if (config.openBrowserAtStart) {
    openBrowserAtStart = "http://localhost:9005/" + config.serverPath;
  } else {
    openBrowserAtStart = false;
  }

  var assets = grunt.file.readYAML("pattern-lab-assets.yml");
  
  grunt.config.merge({

    shell: {
      plBuild: {
        command: "php " + config.plDir + "core/builder.php --generate --nocache"
      },
      copyPLstyleguide: {
        command: "mkdir -p " + config.plDir + "public/styleguide/ && cp -r " + config.plDir + "core/styleguide/ " + config.plDir + "public/styleguide/"
      },
      livereload: {
        command: "touch .change-to-reload.txt"
      }
    },

    jsonlint: {
      pl: {
        src: [
          config.plDir + "source/_patterns/**/*.json",
          config.plDir + "source/_data/*.json"
        ]
      }
    },

    watch: {
      pl: {
        files: config.plDir + "source/**/*.{mustache,json}",
        tasks: [
          "shell:plBuild",
          "shell:livereload",
          "newer:jsonlint:pl"
        ]
      },
      livereload: {
        options: {
          livereload: true
        },
        files: ".change-to-reload.txt"
      }
    },

    // local server
    connect: { // https://www.npmjs.org/package/grunt-contrib-connect
      pl: {
        options: {
          port: 9005,
          useAvailablePort: true,
          base: config.serverDir,
          keepalive: true,
          livereload: true,
          open: openBrowserAtStart,
          middleware: function (connect, options, middlewares) {

            middlewares.unshift(function (req, res, next) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Credentials', true);
              res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
              res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
              next();
            });

            return middlewares;
          }
        }
      }
    }

  });

  grunt.config.merge({
    
    wiredep: {
      pl: {
        src: config.plDir + 'source/_patterns/00-atoms/00-meta/_0{0-head,1-foot}.mustache',
        fileTypes: {
          mustache: {
            block: /(([ \t]*)<!--\s*bower:*(\S*)\s*-->)(\n|\r|.)*?(<!--\s*endbower\s*-->)/gi,
            detect: {
              js: /<script.*src=['"]([^'"]+)/gi,
              css: /<link.*href=['"]([^'"]+)/gi
            },
            replace: {
              // since we inject 5 levels deep to a partial that compiles to a place that is 4 levels deep, we need to remove 1 `../`
              js: function (filePath) {
                filePath = filePath.replace('../', '');
                return '<script src="' + filePath + '"></script>';
              },
              css: function (filePath) {
                filePath = filePath.replace('../', '');
                return '<link rel="stylesheet" href="' + filePath + '" />';
              } 
            }
          }
        }
      }
    },
    
    watch: {
      bower: {
        files: 'bower.json',
        tasks: 'wiredep:pl'
      },
      plAssets: {
        files: 'pattern-lab-assets.yml',
        tasks: [
          'injector:plCSS',
          'injector:plJS'
        ]
      }
    }
    
  });
  
  grunt.registerTask("plBuild", "Build Pattern Lab", function() {
    grunt.task.run([
      "wiredep:pl"
    ]);
    if (!grunt.file.exists(config.plDir + "public/styleguide/html/styleguide.html")) {
      // first run
      grunt.log.writeln("Looks like we have a first run; copying core/styleguide over to public folder now...");
      grunt.task.run("shell:copyPLstyleguide");
    }
    grunt.task.run("shell:plBuild");
  });

  tasks.compile.push("plBuild");
  tasks.validate.push("jsonlint:pl");

};