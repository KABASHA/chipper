// Copyright 2017, University of Colorado Boulder

/**
 * Combines all parts of a runnable's built file into one HTML file.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
/* eslint-env node */
'use strict';

// modules
const _ = require( 'lodash' ); // eslint-disable-line require-statement-match
const assert = require( 'assert' );
const ChipperConstants = require( '../common/ChipperConstants' );
const ChipperStringUtils = require( '../common/ChipperStringUtils' );
const getTitleStringKey = require( './getTitleStringKey' );
const grunt = require( 'grunt' );
const loadFileAsDataURI = require( '../common/loadFileAsDataURI' );
const nodeHTMLEncoder = require( 'node-html-encoder' ); // eslint-disable-line require-statement-match

/**
 * From a given set of options (including the JS and other required things), it creates an HTML file for a runnable.
 * @public
 *
 * @param {Object} options
 * @returns {string} - The HTML for the file.
 */
module.exports = function( options ) {
  const htmlTemplate = grunt.file.read( '../chipper/templates/sim.html' );
  let html = htmlTemplate;
  const encoder = new nodeHTMLEncoder.Encoder( 'entity' );

  const {
    brand, // {string}, e.g. 'phet', 'phet-io'
    repo, // {string}
    stringMap, // {Object}, map[ locale ][ stringKey ] => {string}
    version, // {string}
    mipmapsJavaScript, // {string}
    preloadScripts, // {Array.<string>}
    mainInlineJavascript, // {string}
    dependencies, // {Object} - From getDependencies
    timestamp, // {string}
    thirdPartyEntries, // {Object}
    locale, // {string}
    includeAllLocales, // {boolean}
    isDebugBuild // {boolean}
  } = options;
  assert( _.includes( ChipperConstants.BRANDS, brand ), `Unknown brand: ${brand}` );
  assert( stringMap, `Invalid stringMap: ${stringMap}` );

  const simTitleStringKey = getTitleStringKey( repo );

  // Get the title and version to display in the HTML header.
  // The HTML header is not internationalized, so order can just be hard coded here, see #156
  const englishTitle = stringMap[ ChipperConstants.FALLBACK_LOCALE ][ simTitleStringKey ];
  const localizedTitle = stringMap[ locale ][ simTitleStringKey ];
  assert( englishTitle, `missing entry for sim title, key = ${simTitleStringKey}` );

  let phetStrings = stringMap;
  if ( !includeAllLocales ) {
    phetStrings = {};
    phetStrings[ locale ] = stringMap[ locale ];
  }

  // Directory on the PhET website where the latest version of the sim lives
  const latestDir = `https://phet.colorado.edu/sims/html/${repo}/latest/`;

  // Select the HTML comment header based on the brand, see https://github.com/phetsims/chipper/issues/156
  let htmlHeader;
  if ( brand === 'phet-io' ) {

    // License text provided by @kathy-phet in https://github.com/phetsims/chipper/issues/148#issuecomment-112584773
    htmlHeader = englishTitle + ' ' + version + '\n' +
                 'Copyright 2002-' + grunt.template.today( 'yyyy' ) + ', Regents of the University of Colorado\n' +
                 'PhET Interactive Simulations, University of Colorado Boulder\n' +
                 '\n' +
                 'This Interoperable PhET Simulation file requires a license.\n' +
                 'USE WITHOUT A LICENSE AGREEMENT IS STRICTLY PROHIBITED.\n' +
                 'Contact phethelp@colorado.edu regarding licensing.\n' +
                 'https://phet.colorado.edu/en/licensing';
  }
  else {
    htmlHeader = englishTitle + ' ' + version + '\n' +
                 'Copyright 2002-' + grunt.template.today( 'yyyy' ) + ', Regents of the University of Colorado\n' +
                 'PhET Interactive Simulations, University of Colorado Boulder\n' +
                 '\n' +
                 'This file is licensed under Creative Commons Attribution 4.0\n' +
                 'For alternate source code licensing, see https://github.com/phetsims\n' +
                 'For licenses for third-party software used by this simulation, see below\n' +
                 'For more information, see https://phet.colorado.edu/en/licensing/html\n' +
                 '\n' +
                 'The PhET name and PhET logo are registered trademarks of The Regents of the\n' +
                 'University of Colorado. Permission is granted to use the PhET name and PhET logo\n' +
                 'only for attribution purposes. Use of the PhET name and/or PhET logo for promotional,\n' +
                 'marketing, or advertising purposes requires a separate license agreement from the\n' +
                 'University of Colorado. Contact phethelp@colorado.edu regarding licensing.';
  }

  // Strip out carriage returns (if building on Windows), then add in our own after the MOTW (Mark Of The Web).
  // See https://github.com/phetsims/joist/issues/164 and
  // https://msdn.microsoft.com/en-us/library/ms537628%28v=vs.85%29.aspx
  html = html.replace( /\r/g, '' );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_CARRIAGE_RETURN}}', '\r' );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_BRAND}}', brand );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_HTML_HEADER}}', htmlHeader );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_MIPMAPS_JAVASCRIPT}}', mipmapsJavaScript );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_SPLASH_DATA_URI}}', loadFileAsDataURI( `../brand/${brand}/images/splash.svg` ) );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_PRELOAD_JAVASCRIPT}}', preloadScripts.map( script => {
    return `<script>\n${script}\n</script>\n`;
  } ).join( '\n' ) );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_MAIN_JAVASCRIPT}}', mainInlineJavascript );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_START_THIRD_PARTY_LICENSE_ENTRIES}}', ChipperConstants.START_THIRD_PARTY_LICENSE_ENTRIES );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_END_THIRD_PARTY_LICENSE_ENTRIES}}', ChipperConstants.END_THIRD_PARTY_LICENSE_ENTRIES );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_DEPENDENCIES}}', JSON.stringify( dependencies, null, 2 ) );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_PROJECT}}', repo );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_VERSION}}', version );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_BUILD_TIMESTAMP}}', timestamp );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_THIRD_PARTY_LICENSE_ENTRIES}}', JSON.stringify( thirdPartyEntries, null, 2 ) );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_STRINGS}}', JSON.stringify( phetStrings, null, isDebugBuild ? 2 : '' ) );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_LOCALE}}', locale );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_SIM_TITLE}}', encoder.htmlEncode( localizedTitle ) );
  html = ChipperStringUtils.replaceFirst( html, '{{PHET_IS_DEBUG_BUILD}}', !!isDebugBuild );

  // metadata for Open Graph protocol, see phet-edmodo#2
  html = ChipperStringUtils.replaceFirst( html, '{{OG_TITLE}}', encoder.htmlEncode( localizedTitle ) );
  html = ChipperStringUtils.replaceFirst( html, '{{OG_URL}}', `${latestDir}${repo}_${locale}.html` );
  html = ChipperStringUtils.replaceFirst( html, '{{OG_IMAGE}}', `${latestDir}${repo}-600.png` );

  // Make sure all template-looking strings were replaced.
  // Match template strings that look like "{{I_AM-A.TEMPLATE}}".
  const templateHTMLTemplateStrings = htmlTemplate.match( /{{[A-z\-._ ]{1,100}}}/g );
  if ( templateHTMLTemplateStrings ) {
    templateHTMLTemplateStrings.forEach( function( templateString ) {
      if ( html.indexOf( templateString ) >= 0 ) {
        grunt.fail.warn( `Template string detected in built file: ${templateString}` );
      }
    } );
  }

  return html;
};
