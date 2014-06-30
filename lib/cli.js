/* jshint esnext:true, node:true, expr:true */
/* global log, cwd, main */

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
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var cp = require('cp');
var fs = require('co-fs');
var path = require('path');
var nodeVersion = proc.execSync('node -v').toString().trim();

global.cwd = process.cwd();
global.main = require(path.resolve(process.cwd(), './package'));
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
    let dependencies = _.map(pkg.globalDependencies, fullPackageName);
    log.info('globalDependencies', dependencies);
    yield spawn('npm', [ 'install', '-g' ].concat(dependencies), { cwd: dir, stdio: 'inherit' });
  }

};
var actions = {

  clean: function *(dir, pkg) {
    log.info('clean', pkg.name, '<=>', dir);

    yield t(rimraf)(path.resolve(dir, 'node_modules'));
  },

  install: function *(dir, pkg) {
    log.info('install', pkg.name, '<=>', dir);
    yield spawn('npm', [ 'install' ], { cwd: dir, stdio: 'inherit' });
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
    yield _.flatten(_.map(list, function *(action) {
      try {
        return yield _.map(main[key], function *(dir, mod) {
          return yield onModule(action, key, dir);
        });
      }
      catch (e) {
        log.error(action, e.message);
        log.verbose(action, e.stack.split('\n'));
        process.exit(1);
      }
      finally {
        fs.writeFile('nex-debug.log', JSON.stringify(log.record, null, 2));
      }
    }));
  })();
}

function *onModule (action, key, _dir) {
  let dir = path.resolve(cwd, _dir);
  if (!(yield fs.exists(path.resolve(dir, './package'))) && dir.indexOf('/usr/local/lib') !== -1) {
    log.verbose(action, 'no module at', dir, 'but I think that\'s ok');
    return yield true;
  }
  let pkg = require(path.resolve(dir, './package'));

  // the type function, if present, will decide whether to call the action function
  if (_.isFunction(types[key])) {
    yield types[key](dir, pkg);
  }
  else {
    yield actions[action](dir, pkg);
  }
}

nex.cli = function () {
  program._name = main.name;
  program
    .version(main.version)
    .option('--verbose', 'verbose logging level', function () { log.level = 'verbose'; });

  this.install = program
    .command('install [module]')
    .option('-g, --globalDependencies [boolean]', 'Install globalDependencies')
    .option('-n, --nodeVersion [version]', 'Set node version for the current operation')
    .on('globalDependencies', co(function *(value) {
      yield types.globalDependencies(cwd, main);
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
        proc.spawnSync('npm', [ 'install', mod ], { cwd: cwd, stdio: 'inherit' });
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
      log.info('install', main.name);
      yield spawn('npm', process.argv.slice(2), { cwd: cwd, stdio: 'inherit' });
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
