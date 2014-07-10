'use strict';

var _ = require('lodash');
var n = require('n-api');
var proc = require('child_process');
var program = require('commander');
var path = require('path');
var logfile = require('npmlog-file');
var nex = require('nex-api');
var pkg = require(path.resolve(process.cwd(), './package'));
var log = require('npmlog');

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
  log.info(action, field);
  if (!_.contains([ 'do', 'undo' ], action)) {
    throw new Error('action not recognized: '+ action);
  }
  try {
    var handler = load(nex.toNpm(field));
    handler[action](pkg);
  }
  catch (e) {
    log.error(prefix(action, field), e.message);
    log.verbose(prefix(action, field), e.stack.split('\n'));
    log.info('debug', 'See nex-debug.log for more info');
    logfile.write(log, 'nex-debug.log');
  }
  finally {
    process.exit(1);
  }
}

program._name = 'nex';
program.version(require('./package').version);

program.command('do [field]').action(function (field) {
  if (_.isString(field)) {
    run('do', field);
  }
  else if (_.isArray(pkg.nex)) {
    _.each(pkg.nex, function (field) {
      run('do', field);
    });
  }
});
program.command('undo [field]').action(function (field) {
  if (_.isString(field)) {
    run('undo', field);
  }
  else if (_.isArray(pkg.nex)) {
    _.each(pkg.nex, function (field) {
      run('undo', field);
    });
  }
});

program.parse(process.argv);
if (!program.args.length) program.help();
