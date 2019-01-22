"use strict";

function gruntBuild(grunt) {
    require('load-grunt-tasks')(grunt);
    grunt.initConfig({
        ts: {
            default: {
                tsconfig: "./tsconfig.json",
            }
        },
        clean: {
            default: ["dist/"]
        }
    });

    grunt.loadNpmTasks("grunt-ts", "grunt-contrib-clean");

    grunt.registerTask("default", [
        "ts"
    ]);
}

module.exports = gruntBuild;