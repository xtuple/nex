global.log = require('npmlog');
log.heading = 'nde';

var program = require('commander'),
  fs = require('fs'),
  path = require('path'),
  when = require('when'),
  ncp = require('ncp').ncp,
  rimraf = require("rimraf"),
  spawned = require('spawned'),
  _ = require('lodash');

var DESCRIPTOR_NAME = "workspace.json";

var self = module.exports = {};

self.cli = function() {
  program._name = 'nde';
  program
    .version(require("../package.json").version)
    .option('-c, --copy', 'Copy modules instead of linking')
    .option('-v, --verbose', 'Output verbose log')
    .option('-p, --production', 'Installs only dependencies (no devDependencies)');

  program
    .command('install')
    .description('Install the package using local dirs')
    .action(function(){
      self.install(process.cwd()).then(function() {
        log.info('install', 'Done.');
      }).catch(function(err) {
        log.error('install', err);
      });
    });
    
  program
    .command('clean')
    .description('Clean packages')
    .action(function(){
      self.clean(process.cwd()).then(function() {
        log.info('clean', 'Done.');
      }).catch(function(err) {
        log.error('clean', err);
      });
    });

  program
    .command('*')
    .action(function(env){
      program.help();
    });

  program.parse(process.argv);



  if (program.args.length === 0) {
    program.help();
  }
};


self.install = function(cwd, installed) {
  installed = installed || [];
  var wsDesc = self.getWorkspaceDescriptor(cwd, true, true);
  var ret = when.resolve();
  if(wsDesc) {
    ret = self.installWorkspace(cwd, installed);
  }
  var pkg = self.getPackageDescriptor(cwd, true);
  if(pkg) {
    ret = when(ret, function() {
      return self.installModule(cwd, wsDesc, pkg, installed);
    });
  }
  
  return ret;
};


self.installWorkspace = function(cwd, installed) {
  log.info('install', "Installing workspace" + path.relative(process.cwd(), cwd));
  installed = installed || [];
  
  var promise = when.resolve();
  var files = fs.readdirSync(cwd);
  _.each(files, function(file) {
    promise = promise.then(function() {
      var fullName = path.resolve(cwd, file);
      var stat = fs.statSync(fullName);
      if(stat.isDirectory()) {
        return self.install(fullName, installed);
      }
    });
  });
  return promise;
};


/**
 * Fully install a single module (by linking modules if necessary)
 */
self.installModule = function(cwd, workspaceDescriptor, packageDescriptor, installed) {
  var realDir = self.resolveLink(cwd);
  if(_.contains(installed, realDir)) {
    log.verbose('install', 'Module already processed ' + realDir);
    return when.resolve();
  } else {
    installed.push(realDir);
  }
  
  if(!workspaceDescriptor) {
    //get the UPPER descriptor, not the one directly in the dir
    workspaceDescriptor = self.getWorkspaceDescriptor(path.resolve(cwd, '../'));
  }
  if(!packageDescriptor) {
    packageDescriptor = self.getPackageDescriptor(cwd);
  }
  
  self.ensureNodeModules(cwd);
  var nodeModulesDir = path.resolve(cwd, 'node_modules');
  
  var allDeps = _.extend({}, packageDescriptor.dependencies);
  if(!program.production) {
    _.extend(allDeps, packageDescriptor.devDependencies);
  }

  log.verbose('install', "Installing direct dependencies " + JSON.stringify(_.keys(allDeps)) + " for " +
    packageDescriptor.name + "@" + packageDescriptor.version);
  
  return self.installWorkspaceDependencies(cwd, allDeps, workspaceDescriptor, true, installed)
  .then(function() {
    //For the links we have to be sure we manually process the peerDependencies (recursively)
    //since they are not processed by npm
    function processLinked(deps, processed) {
      if(_.isEmpty(deps)) {
        return;
      }
      if(!processed) {
        processed = _.clone(deps);
      }
      
      var newDeps = {};
      var promise = when.resolve();
      _.each(deps, function(version, link) {
        promise = promise.then(function() {
          var linkPackage = require(path.resolve(nodeModulesDir, link, 'package.json'));
          
          if(!_.isEmpty(linkPackage.peerDependencies)) {
            //Install OR link peer dependencies
            log.verbose('install', "Installing peer dependencies " +
              JSON.stringify(_.keys(linkPackage.peerDependencies)) + " from "
              + linkPackage.name + "@" + linkPackage.version + " into " + cwd);
          }
          
          return self.installWorkspaceDependencies(cwd, linkPackage.peerDependencies, workspaceDescriptor, false, installed)
          .then(function(newResults) {
            _.extend(newDeps, newResults.linked);
          });
        });
      });
      
      return promise.then(function() {
        var diff = _.omit(newDeps, _.keys(processed));
        //update the global list
        var newProcessed = _.extend({}, processed, diff);
        //process only new links
        return processLinked(diff, newProcessed);
      });
    }

    //check peer dependendies for linked modules only (others are installed with npm install)
    return processLinked(_.pick(allDeps, _.keys(workspaceDescriptor.links)));
  }).then(function() {
    log.info('install', packageDescriptor.name + "@" + packageDescriptor.version + " for " + path.relative(process.cwd(), cwd));
      
    var args = ['install'];
    if(program.production) {
      args.push('--production');
    }
    return self.npm(args, cwd);
  });
};

/**
 * Resolve a symbolic link if necessary
 */
self.resolveLink = function(dir) {
  if(fs.lstatSync(dir).isSymbolicLink()) {
    return fs.readlinkSync(dir);
  }
  return dir;
};


/**
 * Launch the npm executable
 */
self.npm = function(args, cwd) {
  var options = {
    cwd: cwd
  };
  
  return spawned('npm', args, options)
    .catch(function(proc) {
      log.error('install [npm]', proc.combined);
    });
};


/**
 * Ensure node_modules exists
 */
self.ensureNodeModules = function(cwd) {
  var dir = path.resolve(cwd, 'node_modules');
  if(!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};


/**
 * Install (of link),in a specific module, a set of dependencies
 */
self.installWorkspaceDependencies = function(cwd, dependencies, workspaceDescriptor, linkOnly, installed) {
  dependencies = dependencies || [];
  var results = {
    linked: {},
    installed: {}
  };
  var nodeModulesDir = path.resolve(cwd, 'node_modules');
  
  var promise = when.resolve();
  _.each(dependencies, function(version, name) {
    promise = promise.then(function() {
      log.verbose('install', "Processing module " + name + "@" + version + " for module " + path.resolve(cwd, cwd));
      var mapping = workspaceDescriptor.links[name];
      var dest = path.resolve(nodeModulesDir, name);
      if(mapping) {
        log.verbose('install', "Found mapping for module " + name + "@" + version);
        var promise = when.resolve();
        
        //don't override by default
        if(program.copy) {
          if(fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) {
            rimraf.sync(dest);
          }
          
          if(!fs.existsSync(dest)) {
            log.info('install', "Copying "+ dest +" from " + mapping);
            var deferred = when.defer();
            ncp(mapping, dest, function (err) {
              if (err) {
                return deferred.reject(err);
              }
              deferred.resolve();
            });
            promise = deferred.promise.then(function() {
              if(program.production) {
                rimraf.sync((path.join(dest, 'node_modules')));
              }
            });
          }
        } else if(!fs.existsSync(dest)) {
          log.info('link', path.relative(process.cwd(), dest) +" -> " + path.relative(process.cwd(), mapping));
          fs.symlinkSync(mapping, dest);
        }
          
        //now we make sure we fully install this linked module
        return promise.then(function() {
          return self.install(dest, installed);
        }).then(function() {
          results.linked[name] = version;
        });
        //remove if already exists
        //rimraf.sync(linkDest);
      } else if(!linkOnly) {
        //do not install if already there
        if(!fs.existsSync(dest)) {
          log.verbose('install', "single module "+ name+"@"+version);
          return self.npm(['install', name+"@"+version], cwd).then(function() {
            results.installed[name] = version;
          });
        }
      }
    });
  });

  return promise.then(function() {
    return results;
  });
};



self.isRoot = function(root) {
  return path.resolve('/') === path.resolve(root);
};


self.normalizeDescriptor = function(cwd, descriptor) {
  descriptor = _.cloneDeep(descriptor);

  //resolve dirs for the the "link" property
  var newLinks = {};
  _.each(descriptor.links, function(dir, modName) {
    newLinks[modName] = path.resolve(cwd, dir);
  });
  descriptor.links = newLinks;

  return descriptor;
};



self.getPackageDescriptor = function(cwd, nothrow) {
  var fileDesc = path.resolve(cwd, 'package.json');
  if(fs.existsSync(fileDesc)) {
    return require(fileDesc);
  }

  if(nothrow) {
    return null;
  } else {
    throw new Error('Cannot find package.json');
  }
  //don't go upper (for now)
};


self.getWorkspaceDescriptor = function(cwd, shallow, nothrow) {
  var fileDesc = path.resolve(cwd, DESCRIPTOR_NAME);
  if(fs.existsSync(fileDesc)) {
    return self.normalizeDescriptor(cwd, require(fileDesc));
  } else if(shallow || self.isRoot(cwd)) {
    if(nothrow) {
      return null;
    }
    throw new Error("Cannot find workspace.json");
  }

  return self.getWorkspaceDescriptor(path.resolve(cwd, '../'), shallow, nothrow);
};


self.clean = function(cwd) {
  var wsDesc = self.getWorkspaceDescriptor(cwd, true, true);
  var ret = when.resolve();
  if(wsDesc) {
    //we are in a workspace
    ret = when.resolve(self.cleanWorkspace(cwd));
  }
  
  var pkg = self.getPackageDescriptor(cwd, true);
  if(pkg) {
    //we are in a module dir
    ret = when(ret, function() {
      return self.cleanModule(cwd);
    });
  }
  
  return ret;
};

self.cleanWorkspace = function(cwd) {
  //let's be sure we are in a workspace
  var descriptor = self.getWorkspaceDescriptor(cwd, true, true);
  if (!descriptor) return;

  log.info('clean', "workspace " + cwd);

  _.each(descriptor.links, function (dir, module) {
    var modulePath = path.resolve(cwd, dir);
    if(fs.statSync(modulePath).isDirectory()) {
      self.cleanModule(modulePath);
    }
  });
};

self.cleanModule = function(cwd) {
  //let's be sure we are in a module
  if(!self.getPackageDescriptor(cwd, true)) {
    return;
  }
  log.info('clean', "module " + cwd);
  rimraf.sync(path.resolve(cwd, 'node_modules'));
};
