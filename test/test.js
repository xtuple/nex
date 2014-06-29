
var expect = require('chai').expect,
  npm_workspace = require('../lib/npm-workspace'),
  fs = require('fs'),
  rimraf = require("rimraf"),
  _ = require('lodash'),
  spawn = require("child_process").spawn,
  ncp = require("ncp"),
  path = require('path');

var NPM_WORKSPACE_EXE = path.resolve(__dirname, "../bin/npm-workspace");
var FIXTURES_DIR = path.resolve(__dirname, "fixtures");
var SANDBOX_DIR = path.resolve(__dirname, "tmp");


function checkPrj1Install(isLink) {
  var prjRoot = path.resolve(SANDBOX_DIR, "installAndLinkTest/prj1");
  //the main dep/linked
  expect(fs.lstatSync(prjRoot + "/node_modules/prj2").isSymbolicLink()).to.be[isLink];
  
  //is isntalled?
  expect(fs.existsSync(prjRoot + "/node_modules/prj2/node_modules/lodash")).to.be.true;
  expect(fs.lstatSync(prjRoot + "/node_modules/prj2/node_modules/prj3").isSymbolicLink()).to.be[isLink];
  
  //a peer dep
  expect(fs.existsSync(prjRoot + "/node_modules/graceful-fs")).to.be.true;
  expect(fs.lstatSync(prjRoot + "/node_modules/graceful-fs").isSymbolicLink()).to.be.false;
  
  //a recursive peer
  expect(fs.existsSync(prjRoot + "/node_modules/prj3")).to.be.true;
  expect(fs.lstatSync(prjRoot + "/node_modules/prj3").isSymbolicLink()).to.be[isLink];
  //is installed?
  expect(fs.existsSync(prjRoot + "/node_modules/prj3/node_modules/when")).to.be.true;
  
  //a 2 level recursive peer
  expect(fs.existsSync(prjRoot + "/node_modules/ncp")).to.be.true;
}

function checkPrj4Install() {
  var prjRoot = path.resolve(SANDBOX_DIR, "installAndLinkTest/prj4");
  //the main dep/linked
  expect(fs.existsSync(prjRoot + "/node_modules/when")).to.be.true;
}
  
  
describe('npm-workspace install', function() {
  beforeEach(function(done) {
    //clean and create new sandbox
    rimraf.sync(SANDBOX_DIR);
    ncp(FIXTURES_DIR, SANDBOX_DIR, done);
  });
  
  it('should install and link a module (programmatically)', function(done) {
    var prjRoot = path.resolve(SANDBOX_DIR, "installAndLinkTest/prj1");
    npm_workspace.install(prjRoot).then(function() {
      checkPrj1Install("true");
      done();
    }).catch(done);
  });
  
  it('should install and link a module (command line)', function(done) {
    var prjRoot = path.resolve(SANDBOX_DIR, "installAndLinkTest/prj1");
    var proc = spawn(NPM_WORKSPACE_EXE, ['install'], {cwd: prjRoot});
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    proc.on('close', function (code) {
      if(code !== 0) {
        done(new Error('Wrong code returned ' + code));
      } else {
        checkPrj1Install("true");
        done();
      }
    });
  });
  
  
  it('should install and link a workspace (programmatically)', function(done) {
    var wsRoot = path.resolve(SANDBOX_DIR, "installAndLinkTest");
    npm_workspace.install(wsRoot).then(function() {
      checkPrj1Install("true");
      //prj4 is disconnected from others
      checkPrj4Install();
      done();
    }).catch(done);
  });
  
  it('should install and link a workspace (command line)', function(done) {
    var wsRoot = path.resolve(SANDBOX_DIR, "installAndLinkTest");
    var proc = spawn(NPM_WORKSPACE_EXE, ['install'], {cwd: wsRoot});
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    proc.on('close', function (code) {
      if(code !== 0) {
        done(new Error('Wrong code returned ' + code));
      } else {
        checkPrj1Install("true");
        //prj4 is disconnected from others
        checkPrj4Install();
        done();
      }
    });
  });


  it('should install and copy modules from a workspace (command line)', function(done) {
    var wsRoot = path.resolve(SANDBOX_DIR, "installAndLinkTest");
    var proc = spawn(NPM_WORKSPACE_EXE, ['install', '-c'], {cwd: wsRoot});
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    proc.on('close', function (code) {
      if(code !== 0) {
        done(new Error('Wrong code returned ' + code));
      } else {
        checkPrj1Install("false");
        //prj4 is disconnected from others
        checkPrj4Install();
        done();
      }
    });
  });
});


describe('npm-workspace clean', function() {
  beforeEach(function(done) {
    //clean and create new sandbox
    rimraf.sync(SANDBOX_DIR);
    ncp(FIXTURES_DIR, SANDBOX_DIR, done);
  });
  
  it('should clean a module (programmatically)', function(done) {
    var prjRoot = path.resolve(SANDBOX_DIR, "installAndLinkTest/prj1");
    npm_workspace.install(prjRoot).then(function() {
      checkPrj1Install("true");
    }).then(function() {
      return npm_workspace.clean(prjRoot);
    }).then(function() {
      expect(fs.existsSync(prjRoot + "/node_modules")).to.be.false;
      done();
    }).catch(done);
  });
  
  
  it('should clean a module (command line)', function(done) {
    var prjRoot = path.resolve(SANDBOX_DIR, "installAndLinkTest/prj1");
    npm_workspace.install(prjRoot).then(function() {
      checkPrj1Install("true");
    }).then(function() {
      var proc = spawn(NPM_WORKSPACE_EXE, ['clean'], {cwd: prjRoot});
      proc.stdout.pipe(process.stdout);
      proc.stderr.pipe(process.stderr);
      proc.on('close', function (code) {
        if(code !== 0) {
          done(new Error('Wrong code returned ' + code));
        } else {
          expect(fs.existsSync(prjRoot + "/node_modules")).to.be.false;
          done();
        }
      });
    }).catch(done);
  });
  
  
  it('should clean a workspace (programmatically)', function(done) {
    var wsRoot = path.resolve(SANDBOX_DIR, "installAndLinkTest");
    npm_workspace.install(wsRoot).then(function() {
      checkPrj1Install("true");
      //prj4 is disconnected from others
      checkPrj4Install();
    }).then(function() {
      return npm_workspace.clean(wsRoot);
    }).then(function() {
      var nodeModulesDir = path.resolve(wsRoot + "/node_modules");
      var files = fs.readdir(wsRoot);
      _.each(files, function(file) {
        expect(fs.existsSync(path.resolve(wsRoot, file, 'node_modules'))).to.be.false;
      });
      
      done();
    }).catch(done);
  });
});
