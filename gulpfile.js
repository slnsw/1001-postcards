var gulp = require('gulp'),
sass = require('gulp-ruby-sass'),
autoprefixer = require('gulp-autoprefixer'),
cssnano = require('gulp-cssnano'),
jshint = require('gulp-jshint'),
uglify = require('gulp-uglify'),
imagemin = require('gulp-imagemin'),
rename = require('gulp-rename'),
concat = require('gulp-concat'),
notify = require('gulp-notify'),
cache = require('gulp-cache'),
del = require('del'),
browsersync = require('browser-sync');

/**
 * A gulp task to autoprefix, minify the CSS and move it to distribution directory.
 */
gulp.task('styles', function(){
    return sass('src/styles/main.scss', { style: 'expanded' })
    .pipe(autoprefixer('last 2 version'))
    .pipe(gulp.dest('dist/styles'))
    .pipe(rename({suffix: '.min'}))
    .pipe(cssnano())
    .pipe(gulp.dest('dist/styles'))
    .pipe(notify({ message: 'Task - Styles' }));
});

/**
 * A gulp task to validate, minify the JS and move it to distribution directory.
 */
 gulp.task('scripts', function(){
  return gulp.src(['src/scripts/**/*.js', '!src/scripts/libs{,/**}'])
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    // .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest('dist/scripts'))
    .pipe(notify({ message: 'Task - Scripts' }));
});

/**
 * A gulp task to move JS libraries that do no require any form of pre-processing to the distribution directory.
 */
 gulp.task('scripts_libs', function(){
  return gulp.src(['src/scripts/libs/**'])
    .pipe(gulp.dest('dist/scripts/libs'))
    .pipe(notify({ message: 'Task - Script Libs' }));
});

/**
 * A gulp task to operate browser sync.
 */
 gulp.task('browser_sync', function(){
    browsersync.init(['dist/scripts/**/*', 'dist/styles/**/*', 'index.html'], {
        server: {
            baseDir: './',
        }
    });
 });

/**
 * A gulp task to watch for changes and implicity call supporting tasks.
 */
gulp.task('watch', ['browser_sync'], function(){
  gulp.watch('src/styles/main.scss', ['styles']);
  gulp.watch('src/scripts/**/*.js', ['scripts']);  
  gulp.watch('src/scripts/libs/**', ['scripts_libs']);
});