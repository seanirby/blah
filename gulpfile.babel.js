//gulp module
import gulp from 'gulp';
//postcss plugin to parse CSS and add vendor prefixes
import autoprefixer from 'autoprefixer';
//lets you require modules
import browserify from 'browserify';
//lets you watch files system for changes
import watchify from 'watchify';
//lets you get text of a source
import source from 'vinyl-source-stream';
//text buffers
import buffer from 'vinyl-buffer';
//lint files
import eslint from 'gulp-eslint';
//lets you do the babel browserify thing
import babelify from 'babelify';
//file minification
import uglify from 'gulp-uglify';
//rm -rf for nodejs
import rimraf from 'rimraf';
//native os notifications
import notify from 'gulp-notify';
//will reload browser
import browserSync, { reload } from 'browser-sync';
//adds sourcemaps
import sourcemaps from 'gulp-sourcemaps';
//transform styles with js plugins
import postcss from 'gulp-postcss';
//rename files easily
import rename from 'gulp-rename';
//can unwrap nested sass-like rules
import nested from 'postcss-nested';
//blah sass
import vars from 'postcss-simple-vars';
//blah sass
import extend from 'postcss-simple-extend';
//minifies css
import cssnano from 'cssnano';
//replaces 'build-blocks' in html, say if you wanted to use a minified version when running your production build
import htmlReplace from 'gulp-html-replace';
//minifies images
import imagemin from 'gulp-imagemin';
//minifies images
import pngquant from 'imagemin-pngquant';
//run a sereis of gulp tasks in a specified order
import runSequence from 'run-sequence';
//gulp plugin to publish contents to gh-pages
import ghPages from 'gulp-gh-pages';

const paths = {
//final js location
  bundle: 'app.js',
//entry point for source js file
  entry: 'src/Index.js',
  //where css is located
  srcCss: 'src/**/*.scss',
  //where images are located
  srcImg: 'src/images/**',
  //where js linting needs to be done
  srcLint: ['src/**/*.js', 'test/**/*.js'],
  //the distribution folder (final build)
  dist: 'dist',
  distJs: 'dist/js',
  distImg: 'dist/images',
  distDeploy: './dist/**/*'
};

//in debug mode by default
const customOpts = {
  entries: [paths.entry],
  debug: true,
  cache: {},
  packageCache: {}
};

//creates main options
const opts = Object.assign({}, watchify.args, customOpts);

gulp.task('clean', cb => {
  rimraf('dist', cb);
});

gulp.task('browserSync', () => {
  browserSync({
    server: {
      baseDir: './'
    }
  });
});

gulp.task('watchify', () => {
  const bundler = watchify(browserify(opts));

  function rebundle() {
    return bundler.bundle()
      .on('error', notify.onError())
      .pipe(source(paths.bundle))
      .pipe(buffer())
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(paths.distJs))
      .pipe(reload({ stream: true }));
  }

  bundler.transform(babelify)
  .on('update', rebundle);
  return rebundle();
});

gulp.task('browserify', () => {
  browserify(paths.entry, { debug: true })
  .transform(babelify)
  .bundle()
  .pipe(source(paths.bundle))
  .pipe(buffer())
  .pipe(sourcemaps.init({ loadMaps: true }))
  .pipe(uglify())
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(paths.distJs));
});

gulp.task('styles', () => {
  gulp.src(paths.srcCss)
  .pipe(rename({ extname: '.css' }))
  .pipe(sourcemaps.init())
  .pipe(postcss([vars, extend, nested, autoprefixer, cssnano]))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(paths.dist))
  .pipe(reload({ stream: true }));
});

gulp.task('htmlReplace', () => {
  gulp.src('index.html')
  .pipe(htmlReplace({ css: 'styles/main.css', js: 'js/app.js' }))
  .pipe(gulp.dest(paths.dist));
});

gulp.task('images', () => {
  gulp.src(paths.srcImg)
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{ removeViewBox: false }],
      use: [pngquant()]
    }))
    .pipe(gulp.dest(paths.distImg));
});

gulp.task('lint', () => {
  gulp.src(paths.srcLint)
  .pipe(eslint())
  .pipe(eslint.format());
});

gulp.task('watchTask', () => {
  gulp.watch(paths.srcCss, ['styles']);
  gulp.watch(paths.srcLint, ['lint']);
});

gulp.task('deploy', () => {
  gulp.src(paths.distDeploy)
    .pipe(ghPages());
});

gulp.task('watch', cb => {
  runSequence('clean', ['browserSync', 'watchTask', 'watchify', 'styles', 'lint', 'images'], cb);
});

gulp.task('build', cb => {
  process.env.NODE_ENV = 'production';
  runSequence('clean', ['browserify', 'styles', 'htmlReplace', 'images'], cb);
});
