"use strict";

function gruntBuild(grunt) {
    grunt.initConfig({
        copy: {
            build: {
                files: [
                    {
                        expand: true,
                        cwd: "./public",
                        src: ["**"],
                        dest: "./dist/public"
                    }
                ]
            }
        },
        ts: {
            default: {
                tsconfig: "./tsconfig.json",
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-ts");

    grunt.registerTask("default", [
        "copy",
        "ts"
    ]);
}

module.exports = gruntBuild;