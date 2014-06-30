/* jshint esnext:true, node:true, expr:true */
/* global log, cwd, pkg */

'use strict';

var _ = require('lodash');
var co = require('co');
var n = require('n-api');
var spawn = require('co-child-process');
var proc = require('child_process');
var program = require('commander');
var semver = require('semver');
var t = require('thunkify');
var glob = require('glob');
var npm = require('npm');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var cp = require('cp');
var fs = require('co-fs');
var path = require('path');
var nodeVersion = proc.execSync('node -v').toString().trim();

global.cwd = process.cwd();
global.pkg = require(path.resolve(process.cwd(), './package'));
global.log = require('npmlog');
log.heading = 'nex';

process.on('SIGINT', function () {
  process.exit(1);
});
process.on('exit', function () {
  n(nodeVersion);
});

var nex = exports;
var types = {

  globalDependencies: function *(dir, pkg) {
    //let npm = yield t(require('npm').load)({ global: true, loglevel: 'error' });
    let dependencies = _.map(pkg.globalDependencies, fullPackageName);
    log.info('globalDependencies', dependencies);

    let child = proc.spawn('npm', [ 'install', '-g' ].concat(dependencies), {
      cwd: process.cwd(), stdio: 'inherit'
    });
    child.on('SIGINT', process.exit);
    //yield child;
    //yield t(npm.commands.install)(dependencies);
  }

};
var actions = {

  clean: function *(dir, pkg) {
    log.info('clean', pkg.name, '<=>', dir);

    yield t(rimraf)(path.resolve(dir, 'node_modules'));
  },

  install: function *(dir, pkg) {
    log.info('install', pkg.name);
    let child = proc.spawn('npm', [ 'install', fullPackageName(pkg.version, pkg.name) ], {
      cwd: process.cwd(), stdio: 'inherit'
    });
    child.on('SIGINT', process.exit);
    //yield child;
  },

  link: function *(dir, pkg) {
    let linkName = path.resolve(cwd, 'node_modules', pkg.name);
    log.info('link', pkg.name, '<=>', './' + path.relative(cwd, linkName));

    yield t(mkdirp)(path.resolve(cwd, 'node_modules'));
    yield t(rimraf)(linkName);
    yield fs.symlink(dir, linkName);
  }
};

function fullPackageName (version, name) {
  return name + (version ? ('@' + version) : '');
}

function doActions (list, key) {
  co(function *() {
    yield _.map(list, function (action) {
      try {
        return eachPackage(pkg, action, key);
      }
      catch (e) {
        log.error(action, e.message);
        log.verbose(action, e.stack.split('\n'));
        process.exit(1);
      }
      finally {
        fs.writeFile('nex-debug.log', JSON.stringify(log.record, null, 2));
      }
    });
  })();
}

function *onModule (action, key, _dir) {
  let dir = path.resolve(cwd, _dir);
  let pkg = require(path.resolve(dir, './package'));

  process.chdir(dir);

  // the type function, if present, will decide whether to call the action function
  if (_.isFunction(types[key])) {
    yield types[key](dir, pkg);
  }
  else {
    yield actions[action](dir, pkg);
  }
}

function *eachPackage (pkg, action, key) {
  yield _.map(pkg[key], _.partial(onModule, action, key));
}

nex.cli = function () {
  program._name = pkg.name;
  program
    .version(pkg.version)
    .option('--verbose', 'verbose logging level', function () { log.level = 'verbose'; });

  this.install = program
    .command('install [module]')
    .option('-g, --globalDependencies [boolean]', 'Install globalDependencies')
    .option('-n, --nodeVersion [version]', 'Set node version for the current operation')
    .on('globalDependencies', co(function *(value) {
      yield types.globalDependencies(cwd, pkg);
    }))
    .on('nodeVersion', function (version) {
      if (!semver.valid(version)) {
        log.warn('nodeVersion', version, 'does not appear valid');
      }
      n(version);
    })
    .action(function (mod) {
      if (!_.isEmpty(mod)) {
        log.info('install', mod);
        proc.spawnSync('npm', [ 'install', mod ], {
          cwd: cwd, stdio: 'inherit'
        });
        n(nodeVersion);
      }
      else {
        doActions([ 'install', 'link' ], 'linkDependencies');
      }
    });

  this.clean = program
    .command('clean')
    .action(function () {
      rimraf.sync(path.resolve(cwd, 'node_modules'));
      doActions([ 'clean' ], 'linkDependencies');
    });

  this.npm = program
    .command('*')
    .action(co(function *(cmd) {
      log.info('npm');
      if (!_.contains(require('npm').fullList, cmd)) {
        log.error('npm', cmd, 'is not an npm command.');
        process.exit(1);
      }
      let slice = 1 + (process.argv[0] !== 'nex');
      let child = proc.spawn('npm', process.argv.slice(slice), {
        cwd: cwd, stdio: 'inherit'
      });
      child.on('SIGINT', process.exit);
    }));

  this.help = program
    .command('help <command>')
    .action(function (command) {
      this[command].help();
    }.bind(this));

  program.parse(process.argv);
  if (!program.args.length) program.help();
};

nex.cli();
