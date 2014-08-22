var gulp   = require('gulp'),
    clean  = require('gulp-clean'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
    gutil  = require('gulp-util');

gulp.task('clean', function() {
    return gulp.src('public/javascripts/build', {read: false})
    .pipe(clean());

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


gulp.task('default', ['clean', 'js']);
