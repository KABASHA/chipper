//  Copyright 2002-2014, University of Colorado Boulder

/**
 * This grunt task creates a simulation based on the simula-rasa template.
 * Run from any repository directory that is a sibling of simula-rasa.
 *
 * Example usage:
 * grunt create-sim --name=cannon-blaster --author="Sam Reid (PhET Interactive Simulations)"
 *
 * For development and debugging, add --clean to delete the repository directory.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

var fs = require( 'fs' );

/**
 * @param grunt the grunt instance
 * @param {string} repositoryName the repository name.  All lower case and hyphenated, like circuit-construction-kit
 * @param {string} author the new author for the project
 * @param {boolean} [clean] whether to delete the repository directory if it already exists, useful for development and debugging
 */
module.exports = function( grunt, repositoryName, author, clean ) {
  'use strict';

  // Check for required parameters
  if ( typeof( repositoryName ) === 'undefined' ) {
    throw new Error( 'repositoryName unspecified, use --name=...' );
  }
  if ( typeof( author ) === 'undefined' ) {
    throw new Error( 'Author unspecified, use --author=...' );
  }

  console.log( 'Greetings, ' + author + '!' );
  console.log( 'creating sim with repositoryName', repositoryName );

  var destinationPath = '../' + repositoryName;
  if ( clean && fs.existsSync( destinationPath ) ) {
    grunt.log.writeln( 'Cleaning ' + destinationPath );
    grunt.file.delete( destinationPath, { force: true } );
  }

  // Create the directory, if it didn't exist
  if ( fs.existsSync( destinationPath ) ) {
    throw new Error( destinationPath + ' already exists. Manually remove it if you want to do over.' );
  }
  grunt.file.mkdir( destinationPath );

  // Replace a single occurrence in a string (if any) with another.
  var replaceOneString = function( str, substring, replacement ) {
    var idx = str.indexOf( substring );
    if ( str.indexOf( substring ) !== -1 ) {
      return str.slice( 0, idx ) + replacement + str.slice( idx + substring.length );
    }
    else {
      return str;
    }
  };

  // Replace all occurrences of a string recursively
  var replaceAllString = function( str, substring, replacement ) {
    var replaced = replaceOneString( str, substring, replacement );
    if ( replaced === str ) {
      return replaced;
    }
    else {
      return replaceAllString( replaced, substring, replacement );
    }
  };

  // See http://stackoverflow.com/questions/10425287/convert-string-to-camelcase-with-regular-expression
  // Eg: 'simula-rasa' -> 'simulaRasa'
  function toCamelCase( input ) {
    return input.toLowerCase().replace( /-(.)/g, function( match, group1 ) {
      return group1.toUpperCase();
    } );
  }

  // Eg, 'simula-rasa' -> 'Simula Rasa'
  function toHumanReadable( input ) {
    var tmpString = input.replace( /-(.)/g, function( match, group1 ) {
      return ' ' + group1.toUpperCase();
    } );
    return tmpString.substring( 0, 1 ).toUpperCase() + tmpString.substring( 1 );
  }

  // Create variations of the repository name
  var configPath = replaceAllString( repositoryName.toUpperCase(), '-', '_' ); // eg, 'simula-rasa' -> 'SIMULA_RASA'
  var lowerCamelCase = toCamelCase( repositoryName ); // eg, 'simula-rasa' -> 'simulaRasa'
  var upperCamelCase = lowerCamelCase.substring( 0, 1 ).toUpperCase() + lowerCamelCase.substring( 1 ); // eg, 'simula-rasa' -> 'SimulaRasa'
  var humanReadable = toHumanReadable( repositoryName ); // eg, 'simula-rasa' -> 'Simula Rasa'

  // Iterate over the file system and copy files, changing filenames and contents as we go.
  grunt.file.recurse( '../simula-rasa', function( abspath, rootdir, subdir, filename ) {

      // skip these files
      if ( abspath.indexOf( '../simula-rasa/README.md' ) === 0 ||
           abspath.indexOf( '../simula-rasa/node_modules/' ) === 0 ||
           abspath.indexOf( '../simula-rasa/.git/' ) === 0 ||
           abspath.indexOf( '../simula-rasa/build/' ) === 0 ) {
      }
      else {
        var contents = grunt.file.read( abspath );

        // Replace variations of the repository name
        contents = replaceAllString( contents, 'simula-rasa', repositoryName );
        contents = replaceAllString( contents, 'SIMULA_RASA', configPath );
        contents = replaceAllString( contents, 'simulaRasa', lowerCamelCase );
        contents = replaceAllString( contents, 'SimulaRasa', upperCamelCase );
        contents = replaceAllString( contents, 'Simula Rasa', humanReadable );

        // Replace author
        contents = replaceAllString( contents, 'Your Name (Your Affiliation)', author );

        // Replace names in the destination path
        var destPath = subdir ? ( destinationPath + '/' + subdir + '/' + filename ) : ( destinationPath + '/' + filename );
        destPath = replaceOneString( destPath, 'simula-rasa', repositoryName );
        destPath = replaceOneString( destPath, 'SimulaRasa', upperCamelCase );

        // Write the file
        grunt.file.write( destPath, contents );
        console.log( 'wrote', destPath );
      }
    }
  );
};