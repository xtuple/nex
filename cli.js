'use strict';

var path = require('path');
var proc = require('child_process');
var _ = require('lodash');
var nex = require('nex-api');
var program = require('commander');
var log = require('npmlog');
var logfile = require('npmlog-file');
var colors = require('colors');

try {
  var pkg = require(path.resolve(process.cwd(), './package'));
}
catch (e) {
  log.error(process.cwd(), 'this is not a node module');
  process.exit(1);
}

log.heading = 'nex';
global.cwd = process.cwd();

function load (id) {
  try {
    return require(id);
  }
  catch (e) {
    log.info('loading module', id);
    process.chdir(__dirname);
    // install locally and globally
    proc.spawnSync('npm', [ 'install', '-f', id ], { cwd: __dirname });
    proc.spawnSync('npm', [ 'install', '-f', '--no-global', id ], { cwd: __dirname });
    var mod = require(id);
    process.chdir(global.cwd);
    return mod;
  }
  try {
    return require(id);
  }
  catch (e) {
    log.error('not found', 'module', id);
    process.exit(1);
  }
}

function run (action, field) {
  try {
    if (_.isString(field)) {
      log.info(action, field);
      let handler = load(nex.toNpm(field));
      handler[action](pkg);
    }
    else if (_.isArray(pkg.nex)) {
      _.each(pkg.nex, function (field) {
        log.info(action, field);
        let handler = load(nex.toNpm(field));
        handler[action](pkg);
      });
    }
  }
  catch (e) {
    log.error(action, field, e.message);
    log.verbose(action, field, e.stack.split('\n'));
    log.info('debug', 'See nex-debug.log for more info');
    logfile.write(log, path.resolve(global.cwd, 'nex-debug.log'));
  }
}

program._name = 'nex';
program
  .version(require('./package').version)
  .option('-v, --verbose');

program.command('do [field]')
  .action(function (field) {
    run('do', field);
  });

program.command('undo [field]')
  .action(function (field) {
    run('undo', field);
  });

program.command('*').action(function (action) {
  log.error('not recognized', 'nex cannot', action.magenta);
  log.info('not recognized', 'nex can', 'do'.green, 'and it can', 'undo'.green);
  process.exit(1);
});

program.parse(process.argv);

if (program.verbose) log.level = 'verbose';
if (!program.args.length) program.help();
