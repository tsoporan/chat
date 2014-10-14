// Building with Gulp.

var gulp       = require('gulp'),
    rimraf     = require('gulp-rimraf'),
    bowerFiles = require('main-bower-files'),
    uglify     = require('gulp-uglify'),
    concat     = require('gulp-concat'),
    rename     = require('gulp-rename'),
    less       = require('gulp-less'),
    minify     = require('gulp-minify-css'),
    hint       = require('gulp-jshint'),
    rev        = require('gulp-rev');

gulp.task('clean', function() {
    return gulp.src('public/build/*', { read: false })
          .pipe(rimraf({ force: true }));
});

gulp.task('collect-libs', ['clean', 'copy-socketio'], function() {
  return gulp.src(bowerFiles())
         .pipe(gulp.dest('public/build/libs'));
});

gulp.task('less', function() {
  return gulp.src('public/stylesheets/*.less')
  .pipe(less())
  .pipe(gulp.dest('public/stylesheets/'));
});

gulp.task('build-css', ['collect-libs', 'less'], function() {
  return gulp.src(['public/build/libs/*.css', 'public/stylesheets/*.css'])
  .pipe(minify())
  .pipe(concat('build.min.css'))
  .pipe(gulp.dest('public/build'));
});

gulp.task('lint', function() {
  return gulp.src(['*.js', 'public/javascripts/*.js'])
  .pipe(hint())
  .pipe(hint.reporter('default'));
});

gulp.task('copy-socketio', ['clean'], function() {
  return gulp.src('bower_components/socket.io-client/socket.io.js')
         .pipe(gulp.dest('public/build/libs'));
});

gulp.task('build-js', ['collect-libs', 'lint'], function() {

    return gulp.src(['public/build/libs/socket.io.js',
                     'public/build/libs/moment.js',
                     'public/build/libs/angular.js',
                     'public/javascripts/*.js' // App
    ])
    .pipe(concat('build.js'))
    //.pipe(uglify())
    .pipe(rename('build.min.js'))
    .pipe(gulp.dest('public/build'));
});

gulp.task('rev', ['build-css', 'build-js'], function() {
  return gulp.src(['public/build/*.js', 'public/build/*.css'], {base: 'public/build'})
  .pipe(gulp.dest('public/build'))
  .pipe(rev())
  .pipe(gulp.dest('public/build'))
  .pipe(rev.manifest())
  .pipe(gulp.dest('public/build'));
});

gulp.task('default', ['collect-libs', 'rev']);
