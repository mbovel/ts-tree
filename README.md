# TS-Tree [![npm version](https://badge.fury.io/js/ts-tree.svg)](https://badge.fury.io/js/ts-tree) [![Build Status](https://travis-ci.org/mbovel/ts-tree.svg?branch=master)](https://travis-ci.org/mbovel/ts-tree)

TS-Tree is a tiny tree data structure written in Typescript.

## Installation

```
$ npm install --save ts-tree
```

## Usage

### Javascript

```javascript
const Tree = require('ts-tree').Tree;
```

### Typescript

```typescript
import { Tree } from 'ts-tree';
```

**Note:** for this to work, the tsc option `--moduleResolution` must be set to `Node` (see https://github.com/Microsoft/TypeScript/issues/7984 for more details).

## Similar work

- [undom](https://github.com/developit/undom)
- [easy-tree](https://github.com/nylen/easy-tree)