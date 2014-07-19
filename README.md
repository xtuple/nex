# nex

[![Build Status](https://travis-ci.org/tjwebb/nex.png)](https://travis-ci.org/tjwebb/nex)

Simplify management of local npm and node.js development resources and processes. Add stuff to your `package.json` and watch it work.

## Install
```sh
$ npm install -g nex
```

## Use

#### 1. Create a `nex` array to define the order of execution
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

#### 2. Intercept the phases you want `nex` to control
package.json:
```json
{
  "scripts": {
    "preinstall": "nex do",
    "pretest": "nex do engines"
  }
}
```

## `nex` plugins

#### [repository](https://www.npmjs.org/package/nex-repository)
Use this when you want to download and extract this module from the repository defined in the `repository` field. Useful for hosting Github-authenticated private modules publicly on npmjs.org. If the module is private, you'll be prompted for your Github credentials.

package.json:
```json
{
  "license": "Proprietary",
  "repository": {
    "type": "git",
    "org": "tjwebb",
    "repo": "super-nex",
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
```sh
$ nex do repository
```

#### [globalDependencies](https://www.npmjs.org/package/nex-global-dependencies)
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

```sh
$ nex do globalDependencies
```
  
#### [linkDependencies](https://www.npmjs.org/package/nex-link-dependencies)
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
```sh
$ nex do linkDependencies
```

## Extend `nex` yourself
Anyone can extend nex. Create a node module that exposes the methods `do` and `undo`, name it after the package.json field you want to operate on, and publish it to npmjs.org as `nex-<field>`.

## API

#### `do (package)`
  - `@param package {Object}  package.json object`
  - Do something

#### `undo (package)`
  - @param package {Object}  package.json object
  - Undo whatever do did

## Links
- npm package: <https://www.npmjs.org/package/nex>
- github page: <https://github.com/tjwebb/nex>
