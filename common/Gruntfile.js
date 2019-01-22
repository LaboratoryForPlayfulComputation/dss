"use strict";

function gruntBuild(grunt) {
    require('load-grunt-tasks')(grunt);

    const sourceFiles = ['lib/**/*.ts', 'test/**/*.ts'];
    const babelFiles = ['lib/**/*.ts', 'test/**/*.ts', '!**/*.d.ts']

    grunt.initConfig({
        copy: {
            build: {
                files: [
                    {
                        expand: true,
                        src: ["lib/schema/*"],
                        dest: "./dist/"
                    }
                ]
            }
        },
        tslint: {
            options: {
                configuration: "tslint.json",
                force: true
            },
            files: {
                expand: true,
                src: sourceFiles
            }
        },
        ts: {
            default: {
                src: sourceFiles,
                options: {
                    rootDir: ".",
                    lib: [
                        "esnext"
                    ],
                    emitDeclarationOnly: true,
                    noImplicitAny: true,
                    noUnusedLocals: true,
                    noUnusedParameters: true,
                    alwaysStrict: true,
                    declaration: true,
                    declarationDir: "dist/",
                    additionalFlags: '--emitDeclarationOnly'
                }
            }
        },
        babel: {
            options: {
                sourceMap: true,
                presets: [
                    "@babel/preset-env",
                    "@babel/preset-typescript"
                ],
                plugins: [
                    ["import-graphql"]
                ]
            },
            dist: {
                files: [{
                    expand: true,
                    src: babelFiles,
                    dest: "dist/",
                    ext: ".js"
                }]
            }
        },
        clean: {
            default: ["dist/", ".tscache/"],
        }
    });

    grunt.loadNpmTasks("grunt-contrib-copy", "grunt-tslint", "grunt-ts", "grunt-babel", "grunt-contrib-clean");

    const defaultTask = [
        "copy",
        "tslint",
        "ts",
        "babel"
    ]

    grunt.registerTask("default", defaultTask);

    grunt.registerTask("rebuild", [
        "clean",
        "default",
    ])
}

module.exports = gruntBuild;