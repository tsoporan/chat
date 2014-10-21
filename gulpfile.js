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
    rev        = require('gulp-rev'),
    replace    = require('gulp-replace'),
    fs         = require('fs');

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

gulp.task('concat-css', ['collect-libs', 'less'], function() {
  return gulp.src(['public/build/libs/*.css', 'public/stylesheets/*.css'])
  .pipe(concat('build.css'))
  .pipe(gulp.dest('public/build'))
});

gulp.task('build-css', ['concat-css'], function() {
  return gulp.src('public/build/build.css')
        .pipe(rename('build.min.css'))
        .pipe(minify())
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

gulp.task('concat-js', ['collect-libs', 'lint'], function() {

    return gulp.src(['public/build/libs/socket.io.js',
                     'public/build/libs/moment.js',
                     'public/build/libs/angular.js',
                     'public/javascripts/*.js' // App
    ])
    .pipe(concat('build.js'))
    .pipe(gulp.dest('public/build'));
});

gulp.task('build-js', ['concat-js'], function() {
  return gulp.src('public/build/build.js')
        .pipe(rename('build.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('public/build'));
});

gulp.task('rev', ['build-css', 'build-js'], function() {
  return gulp.src(['public/build/build.min.js', 'public/build/build.min.css'], {base: 'public/build'})
  .pipe(gulp.dest('public/build'))
  .pipe(rev())
  .pipe(gulp.dest('public/build'))
  .pipe(rev.manifest())
  .pipe(gulp.dest('public/build'));
});

gulp.task('clean-built', ['rev'], function() {
  return gulp.src(['public/build/build.min.js', 'public/build/build.min.css'])
        .pipe(rimraf());
});

gulp.task('template-replace', function() {

  var manifest  = JSON.parse(fs.readFileSync('public/build/rev-manifest.json')),
      assetPath = '/build/';

  var jsPath  = assetPath + manifest['build.min.js'],
      cssPath = assetPath + manifest['build.min.css'];

  return gulp.src('views/layout.jade.tpl')
        .pipe(replace('//builtjs', 'script(src="' + jsPath + '")'))
        .pipe(replace('//builtcss', 'link(rel="stylesheet", href="' + cssPath +'")'))
        .pipe(rename('layout.jade'))
        .pipe(gulp.dest('views'));
});

gulp.task('default', ['collect-libs', 'rev', 'clean-built', 'template-replace']);
