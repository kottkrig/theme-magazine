"use strict";

var gulp = require("gulp");
var inject = require("gulp-inject");
var sass = require("gulp-sass");
var importCss = require("gulp-import-css");
var autoprefixer = require("gulp-autoprefixer");
var sourcemaps = require("gulp-sourcemaps");
var concat = require("gulp-concat");
var cssmin = require("gulp-cssmin");
var watch = require("gulp-watch");
var swPrecache = require("sw-precache");
var uglify = require("gulp-uglify");
var replace = require("gulp-replace");

gulp.task("version", function() {
  var time = new Date().getTime();
  return gulp
    .src(["views/base.html.twig"])
    .pipe(replace(/version\s=\s\'\d*\'/g, "version = '" + time + "'"))
    .pipe(gulp.dest("views"));
});

// service worker generator
gulp.task("sw", function(callback) {
  var packageJson = require("./package.json");
  var bundleUrl = "/public/";

  swPrecache.write(
    "public/sw.js",
    {
      cacheId: packageJson.name,

      runtimeCaching: [
        {
          urlPattern: /(googleapis|gstatic)/,
          handler: "cacheFirst",
          options: {
            cache: {
              maxEntries: 200,
              name: "googleapis-cache"
            }
          }
        },
        {
          urlPattern: /(media)/,
          handler: "cacheFirst",
          options: {
            cache: {
              maxEntries: 50,
              name: "media-cache"
            }
          }
        }
      ],
      staticFileGlobs: [
        "public/dist/**/*.{js,html,css,png,jpg,gif,svg,eot,ttf,woff}",
        "public/img/**/*.{js,html,css,png,jpg,gif,svg,eot,ttf,woff}",
        "public/fonts/**/*.{svg,eot,ttf,woff}"
      ],
      stripPrefixMulti: {
        "public/": bundleUrl
      },
      importScripts: ["/public/sw-contentCaching.js"]
    },
    callback
  );
});

gulp.task("sass", function() {
  return gulp
    .src("public/dist/style.scss")
    .pipe(
      inject(
        gulp.src(["public/css/**/*.css", "public/css/**/*.+(sass|scss)"], {
          read: false
        }),
        {
          starttag: "/*injector*/",
          endtag: " /*endinjector*/",
          transform: function(filePath, file) {
            filePath = filePath.replace("/public/css/", "../css/");
            return "\n@import '" + filePath + "';";
          }
        }
      )
    )
    .pipe(sourcemaps.init())
    .pipe(sass.sync().on("error", sass.logError))
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("public/dist/"));
});

gulp.task("js", function() {
  return gulp
    .src(["public/js/vendor/**/*.js", "public/js/scripts/**/*.js"])
    .pipe(sourcemaps.init())
    .pipe(concat("all.js"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("public/dist"));
});

gulp.task("cssmin", ["sass"], function() {
  return gulp
    .src("public/dist/style.css")
    .pipe(importCss())
    .pipe(autoprefixer({ browsers: ["last 2 version"], cascade: false }))
    .pipe(cssmin())
    .pipe(gulp.dest("public/dist"));
});

gulp.task("jsmin", ["js"], function() {
  return gulp
    .src("public/dist/all.js")
    .pipe(uglify())
    .pipe(gulp.dest("public/dist"));
});

gulp.task("build", ["sass", "js", "cssmin", "jsmin", "version", "sw"]);

gulp.task("watch", function() {
  //empty service worker
  require("fs").writeFileSync("public/sw.js", "");
  //
  gulp.watch("public/css/**/*.+(css|sass|scss)", ["sass"]);
  gulp.watch("public/js/**/*.js", ["js"]);
});
