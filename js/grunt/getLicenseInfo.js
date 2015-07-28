// Copyright 2002-2015, University of Colorado Boulder

/**
 * This file is used during string and audio plugin resolution in order to accomplish 2 goals:
 *
 * (a) determine that PhET Simulations are built using compatible resources.  Each resource (image or audio file) must
 * be annotated in a license.json file in the same directory.  Resource files without a compatible license will cause
 * the build to fail.  This file contains the rules for what PhET has deemed permissible 3rd party images, such as
 * Public Domain or images from NASA or other exceptions below.
 *
 * (b) provide information from the 3rd party resource files to the build system, so that a report can be included in the
 * build HTML file
 *
 * The return value from this function is a javascript object literal of the form:
 *   {classification: <string>, isProblematic: <boolean>, entry: <object> }
 *
 * The classification is one of: missing-license.json, not-annotated, phet or third-party
 * isProblematic indicates whether the particular license is compatible with PhET's licensing
 * entry: the object that appears in the license.json file, see
 * https://github.com/phetsims/simula-rasa/blob/master/images/README.txt
 *
 * In order to simplify compatibility with requirejs and node versions, the return value is a javascript object literal
 * rather than a separate file/constructor function such as LicenseInfo.js
 *
 * @author Sam Reid
 */
(function() {
  'use strict';

  // During a build, store the 3rd party data for reporting in the HTML file.
  if ( typeof global !== 'undefined' ) {
    global.imageAndAudioLicenseInfo = global.imageAndAudioLicenseInfo || {};
  }

  /**
   * Returns a string indicating a problem with licensing for the image/audio file, or null if there is no problem found.
   * The license.json file is consulted.  This function has no side effects (compare to getLicenseInfo above)
   *
   * @param {string} abspath - the path for the file
   * @returns {*}
   *
   * @private
   */
  function _getLicenseInfo( abspath ) {
    var lastSlash = abspath.lastIndexOf( '/' );
    var prefix = abspath.substring( 0, lastSlash );
    var licenseFilename = prefix + '/license.json';
    var assetFilename = abspath.substring( lastSlash + 1 );

    var file = null;
    // look in the license.json file to see if there is an entry for that file
    try {
      file = global.fs.readFileSync( licenseFilename, 'utf8' );
    }
    catch( err ) {
      return { classification: 'missing-license.json', isProblematic: true, entry: null };
    }
    var json = JSON.parse( file );

    var entry = json[ assetFilename ];

    if ( !entry ) {
      return { classification: 'not-annotated', isProblematic: true, entry: entry };
    }
    else if ( entry.projectURL === 'http://phet.colorado.edu' ) {
      return { classification: 'phet', isProblematic: false, entry: entry };
    }
    else if ( entry.license === 'Public Domain' ) {
      // public domain OK, but should still be annotated
      return { classification: 'third-party', isProblematic: false, entry: entry };
    }
    else if ( entry.license === 'NASA' ) {
      // NASA OK, but should still be annotated
      return { classification: 'third-party', isProblematic: false, entry: entry };
    }
    else if ( entry.projectURL === 'http://www.americancinematheque.com/ball/1997MPBTravolta.htm' ) {
      // We decided to allow images for John Travoltage even though we were unable to contact American Cinematheque for 
      // explicit permission
      return { classification: 'third-party', isProblematic: false, entry: entry };
    }
    else if ( entry.notes === 'from Snow Day Math' ) {
      // Permit Snow Day Match images to pass the build--they should be replaced in the near future
      // by PhET-created artwork, see https://github.com/phetsims/making-tens/issues/25
      return { classification: 'third-party', isProblematic: false, entry: entry };
    }
    else {
      return { classification: 'third-party', isProblematic: true, entry: entry };
    }
  }

  /**
   * Returns the classification from _getLicenseInfo but also has the side effect of adding it to a global variable
   * for providing licensing information for 3rd party resources in the built HTML file, looking for unused annotations,
   * etc.
   * @returns {Function}
   */
  var getLicenseInfo = function( name, abspath ) {
    var licenseInfo = _getLicenseInfo( abspath );

    // Make it available for adding a list of 3rd party resources to the HTML
    // and for checking whether there are unused images/audio
    global.imageAndAudioLicenseInfo[ name ] = licenseInfo;

    // Return it for further processing
    return licenseInfo;
  };

  // browser require.js-compatible definition
  if ( typeof define !== 'undefined' ) {
    define( function() {
      return getLicenseInfo;
    } );
  }

  // Node.js-compatible definition
  if ( typeof module !== 'undefined' ) {
    module.exports = getLicenseInfo;
  }
})();