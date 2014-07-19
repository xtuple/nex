# nex

[![Build Status](https://travis-ci.org/tjwebb/nex.png)](https://travis-ci.org/tjwebb/nex)

## Purpose

Simplify management of local npm and node.js development. Just add stuff to your `package.json` and watch it work.

### package.json
Create a `nex` array to define the order of execution
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

#### [repository](https://www.npmjs.org/package/nex-repository)
Use this when you want to download and extract this module from the repository defined in the `repository` field. Useful for hosting Github-authenticated private modules publicly on npmjs.org. If the module is private, you'll be prompted for a password.

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
other-stuff/
```
```sh
$ nex do repository
```

#### [globalDependencies](https://www.npmjs.org/package/nex-global-dependencies)
Install depencies globally, i.e. `npm install -g <module>`
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

### Extend
Anyone can extend nex. Create a node module that exposes the methods `do` and `undo`, name it after the package.json field you want to operate on, and publish it to npmjs.org as `nex-<field>`.

### API

#### `do (package)`
  - `@param package {Object}  package.json object`
  - Do something

#### `undo (package)`
  - @param package {Object}  package.json object
  - Undo whatever do did

### Links
- npm package: <https://www.npmjs.org/package/nex>
- github page: <https://github.com/tjwebb/nex>
