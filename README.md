# nex

[![Build Status](https://travis-ci.org/tjwebb/nex.png)](https://travis-ci.org/tjwebb/nex)

Simplify management of local [npm](npmjs.org) and [node.js](nodejs.org) development resources and processes. Add stuff to your `package.json` and watch it work. It's like [grunt](http://gruntjs.com) or [gulp](http://gulpjs.com), but with 100x less code and a flatter learning curve. It is a pure essentialization of the "task-runner", and is designed to be magical, but not mysterious. `nex` is un-opinionated, npm-integrated, and fully-discombobulated.

## Install
```sh
$ npm install -g nex
```

## Use

#### 1. Create a `nex` array to define the general order of execution
`nex do` will do all the things in this array.

package.json:
```json
{
  "nex": [
    "repository",
    "engines",
    "globalDependencies",
    "linkDependencies"
  ]
}
```

#### 2. Intercept the `npm` phases you want `nex` to control
package.json:
```json
{
  "scripts": {
    "preinstall": "nex do",
    "pretest": "nex do engines"
  }
}
```
`nex` operates by declarative fiat. There's no special build file to contstruct, environment to define, or configs to set. Your existing package.json declares which `nex` routines run during each `npm` phase.

## `nex` routines

#### `repository` ([npm](https://www.npmjs.org/package/nex-repository))
```sh
$ nex do repository
```
Use this when you want to download and extract this module from the repository defined in the `repository` field. Useful for hosting Github-authenticated private modules publicly on npmjs.org. If the module is private, you'll be prompted for your Github credentials.

package.json:
```json
{
  "license": "Proprietary",
  "repository": {
    "type": "git",
    "url": "git://github.com/tjwebb/super-nex.git",
    "private": true
  }
}

```
.npmignore
```
index.js
lib/
private-stuff/
```
<br/>

#### `globalDependencies` ([npm](https://www.npmjs.org/package/nex-global-dependencies))
```sh
$ nex do globalDependencies
```
Install dependencies globally, automatically as part of npm's normal installation process.

package.json
```json
{
  "globalDependencies": {
    "<module>": "<version>",
    "jshint": "^2.5"
  }
}
```
<br/>

#### `linkDependencies` ([npm](https://www.npmjs.org/package/nex-link-dependencies))
```sh
$ nex do linkDependencies
```
Create symlinks from `node_modules/<module>` to `<path>`

package.json
```json
{
  "linkDependencies": {
    "<module>": "<path>",
    "module1": "./lib/module1"
  }
}
```
<br/>

#### `symlinks` ([npm](https://www.npmjs.org/package/symlinks))
```sh
$ nex do symlinks
```
Create arbitrary `<link>` to any `<target>`

package.json
```json
{
  "symlinks": {
    "<target>": "<link">,
    "./lib/shared.js": "/usr/share/superlib/shared.js"
  }
}
```
<br/>

#### `engines` ([npm](https://www.npmjs.org/package/engines))
```sh
$ nex do engines
```
Ensure that all npm commands are invoked with the correct version of node as defined in the standard `engines` field

package.json
```json
{
  "engines": {
    "node": "^0.11.13"
  }
}
```

## Extend `nex` yourself
Anyone can extend nex. Create a node module that exposes the methods `do` and `undo`, name it after the package.json field you want to operate on, and publish it to npmjs.org as `nex-<field>`.

## API

#### `do (package)`
  - `@param package {Object}  package.json object`
  - Do something

#### `undo (package)`
  - `@param package {Object}  package.json object`
  - Undo whatever do did

## Links
- npm package: <https://www.npmjs.org/package/nex>
- github page: <https://github.com/tjwebb/nex>
