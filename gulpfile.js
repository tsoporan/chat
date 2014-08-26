var gulp   = require('gulp'),
    clean  = require('gulp-clean'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
    gutil  = require('gulp-util'),
    less   = require('gulp-less'),
    minify = require('gulp-minify-css'),
    hint   = require('gulp-jshint');

gulp.task('clean', function() {
    return gulp.src(['public/javascripts/build', 'public/stylesheets/build'], {read: false})
    .pipe(clean());

});

gulp.task('less', function() {
  return gulp.src('public/stylesheets/*.less')
  .pipe(less())
  .pipe(gulp.dest('public/stylesheets/'));
});

gulp.task('css', function() {
  return gulp.src(['public/stylesheets/vendor/**/*.css', 'public/stylesheets/*.css'])
  .pipe(minify())
  .pipe(concat('build.min.css'))
  .pipe(gulp.dest('public/stylesheets/build/'));
});

gulp.task('lint', function() {
  return gulp.src('public/javascripts/*.js')
  .pipe(hint())
  .pipe(hint.reporter('default'));
});

gulp.task('js', function() {
    return gulp.src(['public/javascripts/vendor/jquery.min.js',
                     'public/javascripts/vendor/jquery-ui.min.js',
                     'public/javascripts/vendor/fastclick.js',
                     'public/javascripts/vendor/modernizr.js',
                     'public/javascripts/vendor/foundation.min.js',
                     'public/javascripts/vendor/moment.js',
                     'public/javascripts/vendor/placeholder.js',
                     'public/javascripts/vendor/socket.io.js',
                     'public/javascripts/chat.js'
    ])
    .pipe(concat('build.js'))
    .pipe(uglify())
    .pipe(rename('build.min.js'))
    .pipe(gulp.dest('public/javascripts/build'))
    .on('error', gutil.log);
});


gulp.task('default', ['clean', 'less', 'css', 'js']);
