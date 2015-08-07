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
 * As an important side-effect, each entry is added to global.phet.imageAndAudioLicenseInfo.
 * After all resources have been loaded, this global will contain a list of all resources
 * used by the sim.
 *
 * The classification is one of: missing-license.json, not-annotated, phet or third-party
 * isProblematic indicates whether the particular license is compatible with PhET's licensing
 * entry: the object that appears in the license.json file, see
 * https://github.com/phetsims/simula-rasa/blob/master/images/README.md
 *
 * In order to simplify compatibility with requirejs and node versions, the return value is a javascript object literal
 * rather than a separate file/constructor function such as LicenseInfo.js
 *
 * Each media file (image, audio, ...) must have an entry in a license.json file in the same directory which indicates the
 * origin of the file as well as its licensing.  The license.json file should contain one entry per media file, and each
 * should be annotated with the following:
 *
 * text - copyright statement or "Public Domain"
 * projectURL - the URL for the resource
 * license - the name of license, such as "Public Domain"
 * notes - additional helpful information about the resource, or ""
 * exception - [optional] description of why the file is being used despite the fact that it doesn't match PhET's licensing policy
 *
 * For an example, please see any of the license.json files in a PhET simulation's images directory.
 *
 * @author Sam Reid
 */
(function() {
  'use strict';

  /**
   * Returns a string indicating a problem with licensing for the image/audio file, or null if there is no problem found.
   * The license.json file is consulted.  This function has no side effects (compare to getLicenseEntry above)
   *
   * @param {string} abspath - the path for the file
   * @returns {*}
   *
   * @private
   */
  function getLicenseEntry( abspath ) {
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
      //return { classification: 'missing-license.json', isProblematic: true, entry: null };

      // File not found
      return null;
    }
    var json = JSON.parse( file );

    var entry = json[ assetFilename ];
    if ( !entry ) {

      // Not annotated in file
      return null;
    }
    return entry;
  }

  // browser require.js-compatible definition
  if ( typeof define !== 'undefined' ) {
    define( function() {
      return getLicenseEntry;
    } );
  }

  // Node.js-compatible definition
  if ( typeof module !== 'undefined' ) {
    module.exports = getLicenseEntry;
  }
})();