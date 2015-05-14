'use strict';
var verbose = require('verboser');
var assign = require('lodash/object/assign');
var pluck = require('lodash/collection/pluck');
var where = require('lodash/collection/where');
var Promise = require('../helpers/promise');
var findup = Promise.denodeify(require('findup'));
var path = require('path');
var fs = require('fs');

function closestPackageJSON(pathName) {
  var directory;
  return regeneratorRuntime.async(function closestPackageJSON$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        context$1$0.next = 2;
        return findup(pathName, 'package.json');

      case 2:
        directory = context$1$0.sent;
        return context$1$0.abrupt('return', {
          directory: directory,
          pkg: require(path.join(directory, 'package.json'))
        });

      case 4:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this);
}

/**
The Project 'class' is tied to your package.json. It is instiantiated
by giving Project.closest the path to your project.
@class Project
@constructor
@param {String} root Root directory for the project
@param {Object} pkg  Contents of package.json
*/
function Project(root, pkg) {
  verbose.log('init root: ' + root);
  this.root = root;
  this.pkg = pkg;
  this.addonPackages = undefined;
}

Project.prototype.dependencies = function (pkg, excludeDevDeps) {
  pkg = pkg || this.pkg || require('package.json') || {};

  var devDependencies = pkg.devDependencies;
  if (excludeDevDeps) {
    devDependencies = {};
  }

  return assign({}, devDependencies, pkg.dependencies);
};

/**
Returns a new project based on the first package.json that is found
in `pathName`.

@private
@static
@method closest
@param  {String} pathName Path to your project
@return {Promise}         Promise which resolves to a {Project}
*/
Project.closest = function callee$0$0(pathName) {
  var result;
  return regeneratorRuntime.async(function callee$0$0$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        pathName = pathName || process.cwd();
        this.root = pathName;
        context$1$0.next = 4;
        return closestPackageJSON(pathName);

      case 4:
        result = context$1$0.sent;

        verbose.log('closest ' + pathName + ' -> ' + result.directory);

        if (!(result.pkg && result.pkg.name === 'sane-cli')) {
          context$1$0.next = 8;
          break;
        }

        return context$1$0.abrupt('return', null);

      case 8:
        return context$1$0.abrupt('return', new Project(result.directory, result.pkg));

      case 9:
      case 'end':
        return context$1$0.stop();
    }
  }, null, this);
};

Project.prototype.discoverAddons = function (root, pkg, excludeDevDeps) {
  root = root || this.root;
  pkg = pkg || this.pkg;
  var addonPackages = [];
  Object.keys(this.dependencies(pkg, excludeDevDeps)).forEach(function (name) {
    if (name !== 'sane-cli') {
      var addonPath = path.join(root, 'node_modules', name);
      var addon = this.getIfAddon(addonPath);
      if (addon) {
        addonPackages.push(addon);
      }
    }
  }, this);
  if (addonPackages) {
    this.addonPackages = addonPackages;
    return addonPackages;
  }
  return [];
};

Project.prototype.getIfAddon = function (addonPath) {
  var pkgPath = path.join(addonPath, 'package.json');
  verbose.log('attemping to add: %s', addonPath);

  if (fs.existsSync(pkgPath)) {
    var addonPkg = require(pkgPath);
    var keywords = addonPkg.keywords || [];
    verbose.log(' - module found: ' + addonPkg.name);

    addonPkg['sane-addon'] = addonPkg['sane-addon'] || {};

    if (keywords.indexOf('sane-addon') > -1) {
      verbose.log(' - is addon, adding...');
      var addonInfo = {
        name: addonPkg.name,
        path: addonPath,
        pkg: addonPkg
      };
      return addonInfo;
    } else {
      verbose.log(' - no sane-addon keyword, not including.');
    }
  } else {
    verbose.log(' - no package.json (looked at ' + pkgPath + ').');
  }

  return null;
};

Project.prototype.getAddonBlueprints = function (addonPackages) {
  addonPackages = addonPackages || this.addonPackages || this.discoverAddons();
  // this.supportedBluePrints(pluck(addonPackages, 'name'));
  return pluck(addonPackages, 'name');
};

Project.prototype.getBlueprintPath = function (addonName, addonPackages) {
  addonPackages = addonPackages || this.addonPackages || this.discoverAddons();
  // this.supportedBluePrints(pluck(addonPackages, 'name'));
  return pluck(where(addonPackages, { name: addonName }), 'path')[0];
};

module.exports = Project;

// function getIfAddon(folderPath) {
//   var pkgPath = path.join(addonPath, 'package.json');
//   verbose.log('attemping to add: %s',  addonPath);
//
//   if (fs.existsSync(pkgPath)) {
//     var addonPkg = require(pkgPath);
//     var keywords = addonPkg.keywords || [];
//     verbose.log(' - module found: %s', addonPkg.name);
//
//     addonPkg['ember-addon'] = addonPkg['ember-addon'] || {};
//
//     if (keywords.indexOf('ember-addon') > -1) {
//       verbose.log(' - is addon, adding...');
//       this.discoverAddons(addonPath, addonPkg, true);
//       this.addonPackages[addonPkg.name] = {
//         path: addonPath,
//         pkg: addonPkg
//       };
//     } else {
//       verbose.log(' - no ember-addon keyword, not including.');
//     }
//   }
// }
// Project.prototype.addonBlueprintLookupPaths = function() {
//   var addonPaths = this.addons.map(function(addon) {
//     if (addon.blueprintsPath) {
//       return addon.blueprintsPath();
//     }
//   }, this);
//
//   return addonPaths.filter(Boolean).reverse();
// };
//
//
//
// Project.prototype.dependencies = function(pkg, excludeDevDeps) {
//   pkg = pkg || this.pkg || require('package.json') || {};
//
//   var devDependencies = pkg['devDependencies'];
//   if (excludeDevDeps) {
//     devDependencies = {};
//   }
//
//   return assign({}, devDependencies, pkg['dependencies']);
// };

// function handleFindupError(pathName, reason) {
//   // Would be nice if findup threw error subclasses
//   if (reason && /not found/i.test(reason.message)) {
//     throw new NotFoundError('No project found at or up from: `' + pathName + '`');
//   } else {
//     throw reason;
//   }
// }