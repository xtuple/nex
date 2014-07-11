'use strict';

var path = require('path');
var proc = require('child_process');
var _ = require('lodash');
var n = require('n-api');
var nex = require('nex-api');
var program = require('commander');
var pkg = require(path.resolve(process.cwd(), './package'));
var log = require('npmlog');
var logfile = require('npmlog-file');
var colors = require('colors');

log.heading = 'nex';
global.cwd = process.cwd();

function load (id) {
  try {
    return require(id);
  }
  catch (e) {
    log.info('loading module', id);
    process.chdir(__dirname);
    proc.spawnSync('npm', [ 'install', '-f', id ], { cwd: __dirname });
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

function prefix (action, field) {
  return action + ' ' + field;
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
    log.error(prefix(action, field), e.message);
    log.verbose(prefix(action, field), e.stack.split('\n'));
    log.info('debug', 'See nex-debug.log for more info');
    logfile.write(log, 'nex-debug.log');
  }
}

program._name = 'nex';
program.version(require('./package').version);

program.command('do [field]').action(function (field) {
  run('do', field);
});
program.command('undo [field]').action(function (field) {
  run('undo', field);
});
program.command('*').action(function (action) {
  log.error('not recognized', 'nex cannot', action.magenta);
  log.info('not recognized', 'nex can', 'do'.green, 'and it can', 'undo'.green);
  process.exit(1);
});

program.parse(process.argv);
if (!program.args.length) program.help();
