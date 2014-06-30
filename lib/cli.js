/* jshint esnext:true, node:true, expr:true */
/* global log, cwd, pkg */

'use strict';

var _ = require('lodash');
var co = require('co');
var spawn = require('co-child-process');
var program = require('commander');
var semver = require('semver');
var t = require('thunkify');
var glob = require('glob');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var cp = require('cp');
var fs = require('co-fs');
var path = require('path');

global.cwd = process.cwd();
global.pkg = require(path.resolve(process.cwd(), './package'));
global.log = require('npmlog');
log.heading = 'nex';

var nex = exports;
var actions = {

  globalDependencies: function *(dir, pkg) {
    let npm = yield t(require('npm').load)({ global: true, loglevel: 'error' });
    let dependencies = _.map(pkg.globalDependencies, function (version, name) {
      return name + (version ? ('@' + version) : '');
    });

    log.verbose('globalDependencies', '%j', dependencies);
    yield t(npm.commands.install)(dependencies);
  },

  clean: function *(dir, pkg) {
    let npm = yield t(require('npm').load)({ loglevel: 'error' });
    yield t(npm.commands.uninstall)();

    let linkName = path.resolve(cwd, 'node_modules', pkg.name);
    yield t(rimraf)(linkName);
    yield t(rimraf)(path.resolve(dir, 'node_modules'));
    log.info('uninstall', pkg.name, '<=>', dir);
  },

  install: function *(dir, pkg) {
    let npm = yield t(require('npm').load)({ loglevel: 'error' });
    yield t(npm.commands.install)();
    log.info('install', pkg.name, '<=>', './' + path.relative(cwd, dir));
  },

  link: function *(dir, pkg) {
    yield t(mkdirp)(path.resolve(cwd, 'node_modules'));
    yield t(mkdirp)(path.resolve(process.cwd(), 'node_modules'));

    let linkName = path.resolve(cwd, 'node_modules', pkg.name);
    yield t(rimraf)(linkName);
    yield fs.symlink(dir, linkName);
    log.info('link', pkg.name, '<=>', './' + path.relative(cwd, linkName));
  }
};

function doActions (actions, key) {
  _.each(actions, co(function *(action) {
    try {
      yield eachDependency(pkg, action, key);
    }
    catch (e) {
      log.error(action, e.message);
      log.verbose(action, e.stack.split('\n'));
    }
    finally {
      yield fs.writeFile('nex-debug.log', JSON.stringify(log.record, null, 2));
    }
  }));
}

function *onModule (action, key, _dir, name, stop) {
  let dir = path.resolve(cwd, _dir);
  let pkg = require(path.resolve(dir, './package'));

  if (!stop) yield eachDependency(pkg, 'install', key);

  process.chdir(dir);
  yield actions[action](dir, pkg);
}

function *eachDependency (pkg, action, key) {
  let deps = yield _.flatten(_.map(pkg[key], _.partial(onModule, action, key)));
}

nex.cli = function () {
  program._name = pkg.name;
  program
    .version(pkg.version)
    .option('--verbose', 'verbose logging level', function () { log.level = 'verbose'; });

  this.install = program
    .command('install')
    .option('-g, --globalDependencies', 'Install globalDependencies')
    .on('globalDependencies', function (value) {
      doActions([ 'install' ], 'globalDependencies');
    })
    .action(function () {
      doActions([ 'install', 'link' ], 'linkDependencies');
    });

  this.clean = program
    .command('clean')
    .action(function () {
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
      yield spawn('npm', process.argv.slice(slice), {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
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
