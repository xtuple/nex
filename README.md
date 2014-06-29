# nex

[![Build Status](https://travis-ci.org/tjwebb/nex.png)](https://travis-ci.org/tjwebb/nex)

## Purpose

Simplify management of local npm dependencies and links. Just add stuff to your `package.json` and watch it work.

### package.json
- globalDependencies

  ```json
    {
      "globalDependencies": {
        "jshint": "^2.5",
        "forever": "^0.11"
      }
    }
  ```

- linkDependencies

  ```json
    {
      "dependencies": {
        "sub-module1": "^1.0.0",
        "addon2": "^0.5.0"
      },
      "linkDependencies": {
        "sub-module1": "./lib/sub-module1",
        "addon-foo": "./addons/foo"
      }
    }
  ```

## Usage

### Install
```
  Usage: nex install [options]

  Options:

    -h, --help                output usage information
    -g, --globalDependencies  Install globalDependencies
    -v, --verbose             verbose logging level
```

### Clean

```
  Usage: nex clean [options]

  Options:

    -h, --help                output usage information
    -v, --verbose             verbose logging level
```


### npm 
**`nex`** passes through all other commands to `npm`. So you can run
- `nex update`
- `nex view nex`
- etc.

```
  Usage: nex [command] [options]

  Commands:

    All npm commands

  Options:
    
    All npm options

```

### Links
- npm package: <https://www.npmjs.org/package/nex>
- github page: <https://github.com/tjwebb/nex>
