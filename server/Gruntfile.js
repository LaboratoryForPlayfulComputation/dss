"use strict";

function gruntBuild(grunt) {
    grunt.initConfig({
        copy: {
            build: {
                files: [
                    {
                        expand: true,
                        src: ["public/**"],
                        dest: "./dist/public/"
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