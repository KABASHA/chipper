// Copyright 2002-2015, University of Colorado Boulder

/**
 * This grunt task does things after the requirejs:build step.
 * It is for internal use only, not intended to be called directly.
 */

// built-in node APIs
var assert = require( 'assert' );
var fs = require( 'fs' );
var child_process = require( 'child_process' );

/* jshint -W079 */
var _ = require( '../../../sherpa/lodash-2.4.1.min' ); // allow _ to be redefined, contrary to jshintOptions.js
/* jshint +W079 */

// Mipmap setup
var createMipmap = require( '../../../chipper/js/requirejs-plugins/createMipmap' );

// Loading files as data URIs
var loadFileAsDataURI = require( '../../../chipper/js/requirejs-plugins/loadFileAsDataURI' );

/**
 * @param grunt
 * @param {Object} pkg package.json
 * @param {string} fallbackLocale
 */
module.exports = function( grunt, pkg, fallbackLocale ) {
  'use strict';

  // required fields in package.json
  assert( pkg.name, 'name missing from package.json' );
  assert( pkg.version, 'version missing from package.json' );
  assert( pkg.license, 'license missing from package.json' );
  assert( pkg.simTitleStringKey, 'simTitleStringKey missing from package.json' );
  assert( pkg.phetLibs, 'phetLibs missing from package.json' );
  assert( pkg.preload, 'preload missing from package.json' );

  // globals that should be defined by this point
  assert( global.phet, 'missing global.phet' );
  assert( global.phet.licenseText, 'missing global.phet.licenseText' );
  assert( global.phet.strings, 'missing global.phet.strings' );
  assert( global.phet.localesToBuild, 'missing global.phet.localesToBuild' );
  assert( global.phet.mipmapsToBuild, 'missing global.phet.mipmapsToBuild' );

  function trimWhitespace( str ) {
    return str.replace( /^\s\s*/, '' ).replace( /\s\s*$/, '' );
  }

  function padString( str, n ) {
    while ( str.length < n ) {
      str += ' ';
    }
    return str;
  }

  function stringReplace( str, substring, replacement ) {
    var idx = str.indexOf( substring );
    if ( str.indexOf( substring ) !== -1 ) {
      return str.slice( 0, idx ) + replacement + str.slice( idx + substring.length );
    }
    else {
      return str;
    }
  }

  function getStringsWithFallbacks( locale, global_phet_strings ) {
    var fallbackStrings = global_phet_strings[ fallbackLocale ];
    var strings = global_phet_strings[ locale ];

    // Assuming the strings has all of the right keys, look up fallbacks where the locale did not translate a certain string
    var extended = {};
    for ( var key in strings ) {
      if ( strings.hasOwnProperty( key ) ) {
        extended[ key ] = strings[ key ] || fallbackStrings[ key ];
      }
    }
    return extended;
  }

  // TODO: chipper#101 eek, this is scary! we are importing from the repository dir. ideally we should just have uglify-js installed once in chipper?
  var uglify = require( '../../../' + pkg.name + '/node_modules/uglify-js' );

  var done = grunt.task.current.async();

  grunt.log.writeln( 'Minifying preload scripts' );
  var preloadBlocks = '';
  for ( var libIdx = 0; libIdx < pkg.preload.length; libIdx++ ) {
    var lib = pkg.preload[ libIdx ];
    var preloadResult = uglify.minify( [ lib ], {
      output: {
        inline_script: true // escape </script
      },
      compress: {
        global_defs: {}
      }
    } );
    preloadBlocks += '<script type="text/javascript" id="script-' + lib + '">\n' + preloadResult.code + '\n</script>\n';
  }

  grunt.log.writeln( 'Copying changes.txt' );
  if ( fs.existsSync( 'changes.txt' ) ) {
    grunt.file.copy( 'changes.txt', 'build/changes.txt' );
  }
  else {
    grunt.log.error( 'WARNING: no changes.txt' );
  }

  var dependencies = _.clone( pkg.phetLibs ); // clone because we'll be modifying this array
  var dependencyInfo = {
    comment: '# ' + pkg.name + ' ' + pkg.version + ' ' + (new Date().toString())
  };

  function postMipmapLoad( mipmapJavascript ) {
    var splashDataURI = loadFileAsDataURI( '../brand/images/splash.svg' );
    var mainInlineJavascript = grunt.file.read( 'build/' + pkg.name + '.min.js' );

    // Create the license header for this html and all the 3rd party dependencies
    var htmlHeader = pkg.name + '\n' +
                     'Copyright 2002-2013, University of Colorado Boulder\n' +
                     'PhET Interactive Simulations\n' +
                     'Licensed under ' + pkg.license + '\n' +
                     'http://phet.colorado.edu/en/about/licensing\n' +
                     '\n' +
                     'Libraries:\n' + global.phet.licenseText;

    // workaround for Uglify2's unicode unescaping. see https://github.com/phetsims/chipper/issues/70
    preloadBlocks = preloadBlocks.replace( '\x0B', '\\x0B' );
    mainInlineJavascript = mainInlineJavascript.replace( '\x0B', '\\x0B' );

    grunt.log.writeln( 'Constructing HTML from template' );
    var html = grunt.file.read( '../chipper/templates/sim.html' );
    html = stringReplace( html, 'HTML_HEADER', htmlHeader );
    html = stringReplace( html, 'PHET_MIPMAPS', mipmapJavascript );
    html = stringReplace( html, 'SPLASH_SCREEN_DATA_URI', splashDataURI );
    html = stringReplace( html, 'PRELOAD_INLINE_JAVASCRIPT', preloadBlocks );
    html = stringReplace( html, 'MAIN_INLINE_JAVASCRIPT', '<script type="text/javascript">' + mainInlineJavascript + '</script>' );

    grunt.log.writeln( 'Writing HTML' );

    // Create the translated versions
    var locales = global.phet.localesToBuild;

    // Write the stringless template in case we want to use it with the translation addition process.
    // Skip it if only building one HTML.
    if ( locales.length > 1 ) {
      grunt.file.write( 'build/' + pkg.name + '_STRING_TEMPLATE.html', html );
    }

    //TODO: Write a list of the string keys & values for translation utilities to use

    var strings, titleKey;
    for ( var i = 0; i < locales.length; i++ ) {
      var locale = locales[ i ];
      strings = getStringsWithFallbacks( locale, global.phet.strings );
      //TODO: window.phet and window.phet.chipper should be created elsewhere
      var phetStringsCode = 'window.phet = window.phet || {};' +
                            'window.phet.chipper = window.phet.chipper || {};' +
                            'window.phet.chipper.strings=' + JSON.stringify( strings, null, '' ) + ';';
      var localeHTML = stringReplace( html, 'PHET_STRINGS', phetStringsCode );

      //TODO: if this is for changing layout, we'll need these globals in requirejs mode
      //TODO: why are we combining pkg.name with pkg.version?
      //Make the locale accessible at runtime (e.g., for changing layout based on RTL languages), see #40
      localeHTML = stringReplace( localeHTML, 'PHET_INFO', 'window.phet.chipper.locale=\'' + locale + '\';' +
                                                           'window.phet.chipper.version=\'' + pkg.name + ' ' + pkg.version + '\';' );

      assert( pkg.simTitleStringKey, 'simTitleStringKey missing from package.json' ); // required for sims
      titleKey = pkg.simTitleStringKey;
      localeHTML = stringReplace( localeHTML, 'SIM_TITLE', strings[ titleKey ] + ' ' + pkg.version ); //TODO: i18n order
      grunt.file.write( 'build/' + pkg.name + '_' + locale + '.html', localeHTML );
    }

    // Create a file for testing iframe embedding.  English (en) is assumed as the locale.
    grunt.log.writeln( 'Constructing HTML for iframe testing from template' );
    var iframeTestHtml = grunt.file.read( '../chipper/templates/sim-iframe.html' );
    iframeTestHtml = stringReplace( iframeTestHtml, 'SIM_TITLE', strings[ titleKey ] + ' ' + pkg.version + ' iframe test' );
    iframeTestHtml = stringReplace( iframeTestHtml, 'SIM_URL', pkg.name + '_en.html' );

    // Write the iframe test file.  English (en) is assumed as the locale.
    grunt.log.writeln( 'Writing HTML for iframe testing' );
    grunt.file.write( 'build/' + pkg.name + '_en-iframe' + '.html', iframeTestHtml );

    // Write the string map, which may be used by translation utility for showing which strings are available for translation
    var stringMap = 'build/' + pkg.name + '_string-map.json';
    grunt.log.writeln( 'Writing string map to ', stringMap );
    grunt.file.write( stringMap, JSON.stringify( global.phet.strings, null, '\t' ) );

    grunt.log.writeln( 'Cleaning temporary files' );
    grunt.file.delete( 'build/' + pkg.name + '.min.js' );

    done();
  }

  // git --git-dir ../scenery/.git rev-parse HEAD                 -- sha
  // git --git-dir ../scenery/.git rev-parse --abbrev-ref HEAD    -- branch
  function nextDependency() {
    if ( dependencies.length ) {
      var dependency = dependencies.shift(); // remove first item
      assert( !dependencyInfo.dependency, 'there was already a dependency named ' + dependency );

      // get the SHA
      child_process.exec( 'git --git-dir ../' + dependency + '/.git rev-parse HEAD', function( error, stdout, stderr ) {
        assert( !error, error ? ( 'ERROR on git SHA attempt: code: ' + error.code + ', signal: ' + error.signal + ' with stderr:\n' + stderr ) : 'An error without an error? not good' );

        var sha = trimWhitespace( stdout );

        // get the branch
        child_process.exec( 'git --git-dir ../' + dependency + '/.git rev-parse --abbrev-ref HEAD', function( error, stdout, stderr ) {
          assert( !error, error ? ( 'ERROR on git branch attempt: code: ' + error.code + ', signal: ' + error.signal + ' with stderr:\n' + stderr ) : 'An error without an error? not good' );

          var branch = trimWhitespace( stdout );

          grunt.log.writeln( padString( dependency, 20 ) + branch + ' ' + sha );
          dependencyInfo[ dependency ] = { sha: sha, branch: branch };

          nextDependency();
        } );
      } );
    }
    else {
      // now continue on with the process! CALLBACK SOUP FOR YOU!

      grunt.log.writeln( 'Writing dependencies.json' );
      grunt.file.write( 'build/dependencies.json', JSON.stringify( dependencyInfo, null, 2 ) + '\n' );

      // need to load mipmaps here, since we can't do it synchronously during the require.js build step
      var mipmapsLoaded = 0; // counter that indicates we are done when incremented to the number of mipmaps
      var mipmapResult = {}; // result to be attached to window.phet.chipper.mipmaps in the sim
      if ( global.phet.mipmapsToBuild.length ) {
        global.phet.mipmapsToBuild.forEach( function( mipmapToBuild ) {
          var name = mipmapToBuild.name;
          var path = mipmapToBuild.path;
          var level = mipmapToBuild.level;
          var quality = mipmapToBuild.quality;

          createMipmap( path, level, quality, function( mipmaps ) {
            mipmapToBuild.mipmaps = mipmaps;
            mipmapResult[ name ] = mipmaps.map( function( mipmap ) {
              return {
                width: mipmap.width,
                height: mipmap.height,
                url: mipmap.url
              };
            } );
            mipmapsLoaded++;

            if ( mipmapsLoaded === global.phet.mipmapsToBuild.length ) {

              // we've now finished loading all of the mipmaps, and can proceed with the build
              var mipmapJavascript = 'window.phet.chipper.mipmaps = ' + JSON.stringify( mipmapResult ) + ';';
              postMipmapLoad( mipmapJavascript );
            }
          } );
        } );
      }
      else {
        postMipmapLoad( '' ); // no mipmaps loaded
      }
    }
  }

  grunt.log.writeln( 'Scanning dependencies from:\n' + dependencies.toString() );
  nextDependency();
};