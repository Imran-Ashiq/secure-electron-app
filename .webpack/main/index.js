/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/dotenv/lib/main.js":
/*!*****************************************!*\
  !*** ./node_modules/dotenv/lib/main.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const fs = __webpack_require__(/*! fs */ "fs")
const path = __webpack_require__(/*! path */ "path")
const os = __webpack_require__(/*! os */ "os")
const crypto = __webpack_require__(/*! crypto */ "crypto")
const packageJson = __webpack_require__(/*! ../package.json */ "./node_modules/dotenv/package.json")

const version = packageJson.version

// Array of tips to display randomly
const TIPS = [
  '🔐 encrypt with Dotenvx: https://dotenvx.com',
  '🔐 prevent committing .env to code: https://dotenvx.com/precommit',
  '🔐 prevent building .env in docker: https://dotenvx.com/prebuild',
  '📡 observe env with Radar: https://dotenvx.com/radar',
  '📡 auto-backup env with Radar: https://dotenvx.com/radar',
  '📡 version env with Radar: https://dotenvx.com/radar',
  '🛠️  run anywhere with `dotenvx run -- yourcommand`',
  '⚙️  specify custom .env file path with { path: \'/custom/path/.env\' }',
  '⚙️  enable debug logging with { debug: true }',
  '⚙️  override existing env vars with { override: true }',
  '⚙️  suppress all logs with { quiet: true }',
  '⚙️  write to custom object with { processEnv: myObject }',
  '⚙️  load multiple .env files with { path: [\'.env.local\', \'.env\'] }'
]

// Get a random tip from the tips array
function _getRandomTip () {
  return TIPS[Math.floor(Math.random() * TIPS.length)]
}

function parseBoolean (value) {
  if (typeof value === 'string') {
    return !['false', '0', 'no', 'off', ''].includes(value.toLowerCase())
  }
  return Boolean(value)
}

function supportsAnsi () {
  return process.stdout.isTTY // && process.env.TERM !== 'dumb'
}

function dim (text) {
  return supportsAnsi() ? `\x1b[2m${text}\x1b[0m` : text
}

const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg

// Parse src into an Object
function parse (src) {
  const obj = {}

  // Convert buffer to string
  let lines = src.toString()

  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/mg, '\n')

  let match
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1]

    // Default undefined or null to empty string
    let value = (match[2] || '')

    // Remove whitespace
    value = value.trim()

    // Check if double quoted
    const maybeQuote = value[0]

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2')

    // Expand newlines if double quoted
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, '\n')
      value = value.replace(/\\r/g, '\r')
    }

    // Add to object
    obj[key] = value
  }

  return obj
}

function _parseVault (options) {
  options = options || {}

  const vaultPath = _vaultPath(options)
  options.path = vaultPath // parse .env.vault
  const result = DotenvModule.configDotenv(options)
  if (!result.parsed) {
    const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`)
    err.code = 'MISSING_DATA'
    throw err
  }

  // handle scenario for comma separated keys - for use with key rotation
  // example: DOTENV_KEY="dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=prod,dotenv://:key_7890@dotenvx.com/vault/.env.vault?environment=prod"
  const keys = _dotenvKey(options).split(',')
  const length = keys.length

  let decrypted
  for (let i = 0; i < length; i++) {
    try {
      // Get full key
      const key = keys[i].trim()

      // Get instructions for decrypt
      const attrs = _instructions(result, key)

      // Decrypt
      decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key)

      break
    } catch (error) {
      // last key
      if (i + 1 >= length) {
        throw error
      }
      // try next key
    }
  }

  // Parse decrypted .env string
  return DotenvModule.parse(decrypted)
}

function _warn (message) {
  console.error(`[dotenv@${version}][WARN] ${message}`)
}

function _debug (message) {
  console.log(`[dotenv@${version}][DEBUG] ${message}`)
}

function _log (message) {
  console.log(`[dotenv@${version}] ${message}`)
}

function _dotenvKey (options) {
  // prioritize developer directly setting options.DOTENV_KEY
  if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
    return options.DOTENV_KEY
  }

  // secondary infra already contains a DOTENV_KEY environment variable
  if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
    return process.env.DOTENV_KEY
  }

  // fallback to empty string
  return ''
}

function _instructions (result, dotenvKey) {
  // Parse DOTENV_KEY. Format is a URI
  let uri
  try {
    uri = new URL(dotenvKey)
  } catch (error) {
    if (error.code === 'ERR_INVALID_URL') {
      const err = new Error('INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development')
      err.code = 'INVALID_DOTENV_KEY'
      throw err
    }

    throw error
  }

  // Get decrypt key
  const key = uri.password
  if (!key) {
    const err = new Error('INVALID_DOTENV_KEY: Missing key part')
    err.code = 'INVALID_DOTENV_KEY'
    throw err
  }

  // Get environment
  const environment = uri.searchParams.get('environment')
  if (!environment) {
    const err = new Error('INVALID_DOTENV_KEY: Missing environment part')
    err.code = 'INVALID_DOTENV_KEY'
    throw err
  }

  // Get ciphertext payload
  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`
  const ciphertext = result.parsed[environmentKey] // DOTENV_VAULT_PRODUCTION
  if (!ciphertext) {
    const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`)
    err.code = 'NOT_FOUND_DOTENV_ENVIRONMENT'
    throw err
  }

  return { ciphertext, key }
}

function _vaultPath (options) {
  let possibleVaultPath = null

  if (options && options.path && options.path.length > 0) {
    if (Array.isArray(options.path)) {
      for (const filepath of options.path) {
        if (fs.existsSync(filepath)) {
          possibleVaultPath = filepath.endsWith('.vault') ? filepath : `${filepath}.vault`
        }
      }
    } else {
      possibleVaultPath = options.path.endsWith('.vault') ? options.path : `${options.path}.vault`
    }
  } else {
    possibleVaultPath = path.resolve(process.cwd(), '.env.vault')
  }

  if (fs.existsSync(possibleVaultPath)) {
    return possibleVaultPath
  }

  return null
}

function _resolveHome (envPath) {
  return envPath[0] === '~' ? path.join(os.homedir(), envPath.slice(1)) : envPath
}

function _configVault (options) {
  const debug = parseBoolean(process.env.DOTENV_CONFIG_DEBUG || (options && options.debug))
  const quiet = parseBoolean(process.env.DOTENV_CONFIG_QUIET || (options && options.quiet))

  if (debug || !quiet) {
    _log('Loading env from encrypted .env.vault')
  }

  const parsed = DotenvModule._parseVault(options)

  let processEnv = process.env
  if (options && options.processEnv != null) {
    processEnv = options.processEnv
  }

  DotenvModule.populate(processEnv, parsed, options)

  return { parsed }
}

function configDotenv (options) {
  const dotenvPath = path.resolve(process.cwd(), '.env')
  let encoding = 'utf8'
  let processEnv = process.env
  if (options && options.processEnv != null) {
    processEnv = options.processEnv
  }
  let debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || (options && options.debug))
  let quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || (options && options.quiet))

  if (options && options.encoding) {
    encoding = options.encoding
  } else {
    if (debug) {
      _debug('No encoding is specified. UTF-8 is used by default')
    }
  }

  let optionPaths = [dotenvPath] // default, look for .env
  if (options && options.path) {
    if (!Array.isArray(options.path)) {
      optionPaths = [_resolveHome(options.path)]
    } else {
      optionPaths = [] // reset default
      for (const filepath of options.path) {
        optionPaths.push(_resolveHome(filepath))
      }
    }
  }

  // Build the parsed data in a temporary object (because we need to return it).  Once we have the final
  // parsed data, we will combine it with process.env (or options.processEnv if provided).
  let lastError
  const parsedAll = {}
  for (const path of optionPaths) {
    try {
      // Specifying an encoding returns a string instead of a buffer
      const parsed = DotenvModule.parse(fs.readFileSync(path, { encoding }))

      DotenvModule.populate(parsedAll, parsed, options)
    } catch (e) {
      if (debug) {
        _debug(`Failed to load ${path} ${e.message}`)
      }
      lastError = e
    }
  }

  const populated = DotenvModule.populate(processEnv, parsedAll, options)

  // handle user settings DOTENV_CONFIG_ options inside .env file(s)
  debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || debug)
  quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || quiet)

  if (debug || !quiet) {
    const keysCount = Object.keys(populated).length
    const shortPaths = []
    for (const filePath of optionPaths) {
      try {
        const relative = path.relative(process.cwd(), filePath)
        shortPaths.push(relative)
      } catch (e) {
        if (debug) {
          _debug(`Failed to load ${filePath} ${e.message}`)
        }
        lastError = e
      }
    }

    _log(`injecting env (${keysCount}) from ${shortPaths.join(',')} ${dim(`-- tip: ${_getRandomTip()}`)}`)
  }

  if (lastError) {
    return { parsed: parsedAll, error: lastError }
  } else {
    return { parsed: parsedAll }
  }
}

// Populates process.env from .env file
function config (options) {
  // fallback to original dotenv if DOTENV_KEY is not set
  if (_dotenvKey(options).length === 0) {
    return DotenvModule.configDotenv(options)
  }

  const vaultPath = _vaultPath(options)

  // dotenvKey exists but .env.vault file does not exist
  if (!vaultPath) {
    _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`)

    return DotenvModule.configDotenv(options)
  }

  return DotenvModule._configVault(options)
}

function decrypt (encrypted, keyStr) {
  const key = Buffer.from(keyStr.slice(-64), 'hex')
  let ciphertext = Buffer.from(encrypted, 'base64')

  const nonce = ciphertext.subarray(0, 12)
  const authTag = ciphertext.subarray(-16)
  ciphertext = ciphertext.subarray(12, -16)

  try {
    const aesgcm = crypto.createDecipheriv('aes-256-gcm', key, nonce)
    aesgcm.setAuthTag(authTag)
    return `${aesgcm.update(ciphertext)}${aesgcm.final()}`
  } catch (error) {
    const isRange = error instanceof RangeError
    const invalidKeyLength = error.message === 'Invalid key length'
    const decryptionFailed = error.message === 'Unsupported state or unable to authenticate data'

    if (isRange || invalidKeyLength) {
      const err = new Error('INVALID_DOTENV_KEY: It must be 64 characters long (or more)')
      err.code = 'INVALID_DOTENV_KEY'
      throw err
    } else if (decryptionFailed) {
      const err = new Error('DECRYPTION_FAILED: Please check your DOTENV_KEY')
      err.code = 'DECRYPTION_FAILED'
      throw err
    } else {
      throw error
    }
  }
}

// Populate process.env with parsed values
function populate (processEnv, parsed, options = {}) {
  const debug = Boolean(options && options.debug)
  const override = Boolean(options && options.override)
  const populated = {}

  if (typeof parsed !== 'object') {
    const err = new Error('OBJECT_REQUIRED: Please check the processEnv argument being passed to populate')
    err.code = 'OBJECT_REQUIRED'
    throw err
  }

  // Set process.env
  for (const key of Object.keys(parsed)) {
    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
      if (override === true) {
        processEnv[key] = parsed[key]
        populated[key] = parsed[key]
      }

      if (debug) {
        if (override === true) {
          _debug(`"${key}" is already defined and WAS overwritten`)
        } else {
          _debug(`"${key}" is already defined and was NOT overwritten`)
        }
      }
    } else {
      processEnv[key] = parsed[key]
      populated[key] = parsed[key]
    }
  }

  return populated
}

const DotenvModule = {
  configDotenv,
  _configVault,
  _parseVault,
  config,
  decrypt,
  parse,
  populate
}

module.exports.configDotenv = DotenvModule.configDotenv
module.exports._configVault = DotenvModule._configVault
module.exports._parseVault = DotenvModule._parseVault
module.exports.config = DotenvModule.config
module.exports.decrypt = DotenvModule.decrypt
module.exports.parse = DotenvModule.parse
module.exports.populate = DotenvModule.populate

module.exports = DotenvModule


/***/ }),

/***/ "./node_modules/dotenv/package.json":
/*!******************************************!*\
  !*** ./node_modules/dotenv/package.json ***!
  \******************************************/
/***/ ((module) => {

"use strict";
module.exports = /*#__PURE__*/JSON.parse('{"name":"dotenv","version":"17.2.1","description":"Loads environment variables from .env file","main":"lib/main.js","types":"lib/main.d.ts","exports":{".":{"types":"./lib/main.d.ts","require":"./lib/main.js","default":"./lib/main.js"},"./config":"./config.js","./config.js":"./config.js","./lib/env-options":"./lib/env-options.js","./lib/env-options.js":"./lib/env-options.js","./lib/cli-options":"./lib/cli-options.js","./lib/cli-options.js":"./lib/cli-options.js","./package.json":"./package.json"},"scripts":{"dts-check":"tsc --project tests/types/tsconfig.json","lint":"standard","pretest":"npm run lint && npm run dts-check","test":"tap run --allow-empty-coverage --disable-coverage --timeout=60000","test:coverage":"tap run --show-full-coverage --timeout=60000 --coverage-report=text --coverage-report=lcov","prerelease":"npm test","release":"standard-version"},"repository":{"type":"git","url":"git://github.com/motdotla/dotenv.git"},"homepage":"https://github.com/motdotla/dotenv#readme","funding":"https://dotenvx.com","keywords":["dotenv","env",".env","environment","variables","config","settings"],"readmeFilename":"README.md","license":"BSD-2-Clause","devDependencies":{"@types/node":"^18.11.3","decache":"^4.6.2","sinon":"^14.0.1","standard":"^17.0.0","standard-version":"^9.5.0","tap":"^19.2.0","typescript":"^4.8.4"},"engines":{"node":">=12"},"browser":{"fs":false}}');

/***/ }),

/***/ "./node_modules/electron-squirrel-startup/index.js":
/*!*********************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/index.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var path = __webpack_require__(/*! path */ "path");
var spawn = (__webpack_require__(/*! child_process */ "child_process").spawn);
var debug = __webpack_require__(/*! debug */ "./node_modules/electron-squirrel-startup/node_modules/debug/src/index.js")('electron-squirrel-startup');
var app = (__webpack_require__(/*! electron */ "electron").app);

var run = function(args, done) {
  var updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  debug('Spawning `%s` with args `%s`', updateExe, args);
  spawn(updateExe, args, {
    detached: true
  }).on('close', done);
};

var check = function() {
  if (process.platform === 'win32') {
    var cmd = process.argv[1];
    debug('processing squirrel command `%s`', cmd);
    var target = path.basename(process.execPath);

    if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
      run(['--createShortcut=' + target + ''], app.quit);
      return true;
    }
    if (cmd === '--squirrel-uninstall') {
      run(['--removeShortcut=' + target + ''], app.quit);
      return true;
    }
    if (cmd === '--squirrel-obsolete') {
      app.quit();
      return true;
    }
  }
  return false;
};

module.exports = check();


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/node_modules/debug/src/browser.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/node_modules/debug/src/browser.js ***!
  \**********************************************************************************/
/***/ ((module, exports, __webpack_require__) => {

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = __webpack_require__(/*! ./debug */ "./node_modules/electron-squirrel-startup/node_modules/debug/src/debug.js");
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/node_modules/debug/src/debug.js":
/*!********************************************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/node_modules/debug/src/debug.js ***!
  \********************************************************************************/
/***/ ((module, exports, __webpack_require__) => {


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = __webpack_require__(/*! ms */ "./node_modules/electron-squirrel-startup/node_modules/ms/index.js");

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  return debug;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/node_modules/debug/src/index.js":
/*!********************************************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/node_modules/debug/src/index.js ***!
  \********************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Detect Electron renderer process, which is node, but we should
 * treat as a browser.
 */

if (typeof process !== 'undefined' && process.type === 'renderer') {
  module.exports = __webpack_require__(/*! ./browser.js */ "./node_modules/electron-squirrel-startup/node_modules/debug/src/browser.js");
} else {
  module.exports = __webpack_require__(/*! ./node.js */ "./node_modules/electron-squirrel-startup/node_modules/debug/src/node.js");
}


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/node_modules/debug/src/node.js":
/*!*******************************************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/node_modules/debug/src/node.js ***!
  \*******************************************************************************/
/***/ ((module, exports, __webpack_require__) => {

/**
 * Module dependencies.
 */

var tty = __webpack_require__(/*! tty */ "tty");
var util = __webpack_require__(/*! util */ "util");

/**
 * This is the Node.js implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = __webpack_require__(/*! ./debug */ "./node_modules/electron-squirrel-startup/node_modules/debug/src/debug.js");
exports.init = init;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Colors.
 */

exports.colors = [6, 2, 3, 4, 5, 1];

/**
 * Build up the default `inspectOpts` object from the environment variables.
 *
 *   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
 */

exports.inspectOpts = Object.keys(process.env).filter(function (key) {
  return /^debug_/i.test(key);
}).reduce(function (obj, key) {
  // camel-case
  var prop = key
    .substring(6)
    .toLowerCase()
    .replace(/_([a-z])/g, function (_, k) { return k.toUpperCase() });

  // coerce string value into JS value
  var val = process.env[key];
  if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
  else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
  else if (val === 'null') val = null;
  else val = Number(val);

  obj[prop] = val;
  return obj;
}, {});

/**
 * The file descriptor to write the `debug()` calls to.
 * Set the `DEBUG_FD` env variable to override with another value. i.e.:
 *
 *   $ DEBUG_FD=3 node script.js 3>debug.log
 */

var fd = parseInt(process.env.DEBUG_FD, 10) || 2;

if (1 !== fd && 2 !== fd) {
  util.deprecate(function(){}, 'except for stderr(2) and stdout(1), any other usage of DEBUG_FD is deprecated. Override debug.log if you want to use a different log function (https://git.io/debug_fd)')()
}

var stream = 1 === fd ? process.stdout :
             2 === fd ? process.stderr :
             createWritableStdioStream(fd);

/**
 * Is stdout a TTY? Colored output is enabled when `true`.
 */

function useColors() {
  return 'colors' in exports.inspectOpts
    ? Boolean(exports.inspectOpts.colors)
    : tty.isatty(fd);
}

/**
 * Map %o to `util.inspect()`, all on a single line.
 */

exports.formatters.o = function(v) {
  this.inspectOpts.colors = this.useColors;
  return util.inspect(v, this.inspectOpts)
    .split('\n').map(function(str) {
      return str.trim()
    }).join(' ');
};

/**
 * Map %o to `util.inspect()`, allowing multiple lines if needed.
 */

exports.formatters.O = function(v) {
  this.inspectOpts.colors = this.useColors;
  return util.inspect(v, this.inspectOpts);
};

/**
 * Adds ANSI color escape codes if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var name = this.namespace;
  var useColors = this.useColors;

  if (useColors) {
    var c = this.color;
    var prefix = '  \u001b[3' + c + ';1m' + name + ' ' + '\u001b[0m';

    args[0] = prefix + args[0].split('\n').join('\n' + prefix);
    args.push('\u001b[3' + c + 'm+' + exports.humanize(this.diff) + '\u001b[0m');
  } else {
    args[0] = new Date().toUTCString()
      + ' ' + name + ' ' + args[0];
  }
}

/**
 * Invokes `util.format()` with the specified arguments and writes to `stream`.
 */

function log() {
  return stream.write(util.format.apply(util, arguments) + '\n');
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  if (null == namespaces) {
    // If you set a process.env field to null or undefined, it gets cast to the
    // string 'null' or 'undefined'. Just delete instead.
    delete process.env.DEBUG;
  } else {
    process.env.DEBUG = namespaces;
  }
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  return process.env.DEBUG;
}

/**
 * Copied from `node/src/node.js`.
 *
 * XXX: It's lame that node doesn't expose this API out-of-the-box. It also
 * relies on the undocumented `tty_wrap.guessHandleType()` which is also lame.
 */

function createWritableStdioStream (fd) {
  var stream;
  var tty_wrap = process.binding('tty_wrap');

  // Note stream._type is used for test-module-load-list.js

  switch (tty_wrap.guessHandleType(fd)) {
    case 'TTY':
      stream = new tty.WriteStream(fd);
      stream._type = 'tty';

      // Hack to have stream not keep the event loop alive.
      // See https://github.com/joyent/node/issues/1726
      if (stream._handle && stream._handle.unref) {
        stream._handle.unref();
      }
      break;

    case 'FILE':
      var fs = __webpack_require__(/*! fs */ "fs");
      stream = new fs.SyncWriteStream(fd, { autoClose: false });
      stream._type = 'fs';
      break;

    case 'PIPE':
    case 'TCP':
      var net = __webpack_require__(/*! net */ "net");
      stream = new net.Socket({
        fd: fd,
        readable: false,
        writable: true
      });

      // FIXME Should probably have an option in net.Socket to create a
      // stream from an existing fd which is writable only. But for now
      // we'll just add this hack and set the `readable` member to false.
      // Test: ./node test/fixtures/echo.js < /etc/passwd
      stream.readable = false;
      stream.read = null;
      stream._type = 'pipe';

      // FIXME Hack to have stream not keep the event loop alive.
      // See https://github.com/joyent/node/issues/1726
      if (stream._handle && stream._handle.unref) {
        stream._handle.unref();
      }
      break;

    default:
      // Probably an error on in uv_guess_handle()
      throw new Error('Implement me. Unknown stream file type!');
  }

  // For supporting legacy API we put the FD here.
  stream.fd = fd;

  stream._isStdio = true;

  return stream;
}

/**
 * Init logic for `debug` instances.
 *
 * Create a new `inspectOpts` object in case `useColors` is set
 * differently for a particular `debug` instance.
 */

function init (debug) {
  debug.inspectOpts = {};

  var keys = Object.keys(exports.inspectOpts);
  for (var i = 0; i < keys.length; i++) {
    debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
  }
}

/**
 * Enable namespaces listed in `process.env.DEBUG` initially.
 */

exports.enable(load());


/***/ }),

/***/ "./node_modules/electron-squirrel-startup/node_modules/ms/index.js":
/*!*************************************************************************!*\
  !*** ./node_modules/electron-squirrel-startup/node_modules/ms/index.js ***!
  \*************************************************************************/
/***/ ((module) => {

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/jwe/compact/decrypt.js":
/*!**************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/jwe/compact/decrypt.js ***!
  \**************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   compactDecrypt: () => (/* binding */ compactDecrypt)
/* harmony export */ });
/* harmony import */ var _flattened_decrypt_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../flattened/decrypt.js */ "./node_modules/jose/dist/webapi/jwe/flattened/decrypt.js");
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");
/* harmony import */ var _lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../lib/buffer_utils.js */ "./node_modules/jose/dist/webapi/lib/buffer_utils.js");



async function compactDecrypt(jwe, key, options) {
    if (jwe instanceof Uint8Array) {
        jwe = _lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_2__.decoder.decode(jwe);
    }
    if (typeof jwe !== 'string') {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_1__.JWEInvalid('Compact JWE must be a string or Uint8Array');
    }
    const { 0: protectedHeader, 1: encryptedKey, 2: iv, 3: ciphertext, 4: tag, length, } = jwe.split('.');
    if (length !== 5) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_1__.JWEInvalid('Invalid Compact JWE');
    }
    const decrypted = await (0,_flattened_decrypt_js__WEBPACK_IMPORTED_MODULE_0__.flattenedDecrypt)({
        ciphertext,
        iv: iv || undefined,
        protected: protectedHeader,
        tag: tag || undefined,
        encrypted_key: encryptedKey || undefined,
    }, key, options);
    const result = { plaintext: decrypted.plaintext, protectedHeader: decrypted.protectedHeader };
    if (typeof key === 'function') {
        return { ...result, key: decrypted.key };
    }
    return result;
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/jwe/flattened/decrypt.js":
/*!****************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/jwe/flattened/decrypt.js ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   flattenedDecrypt: () => (/* binding */ flattenedDecrypt)
/* harmony export */ });
/* harmony import */ var _util_base64url_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../util/base64url.js */ "./node_modules/jose/dist/webapi/util/base64url.js");
/* harmony import */ var _lib_decrypt_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../lib/decrypt.js */ "./node_modules/jose/dist/webapi/lib/decrypt.js");
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");
/* harmony import */ var _lib_is_disjoint_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../lib/is_disjoint.js */ "./node_modules/jose/dist/webapi/lib/is_disjoint.js");
/* harmony import */ var _lib_is_object_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../lib/is_object.js */ "./node_modules/jose/dist/webapi/lib/is_object.js");
/* harmony import */ var _lib_decrypt_key_management_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../lib/decrypt_key_management.js */ "./node_modules/jose/dist/webapi/lib/decrypt_key_management.js");
/* harmony import */ var _lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../lib/buffer_utils.js */ "./node_modules/jose/dist/webapi/lib/buffer_utils.js");
/* harmony import */ var _lib_cek_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../lib/cek.js */ "./node_modules/jose/dist/webapi/lib/cek.js");
/* harmony import */ var _lib_validate_crit_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../../lib/validate_crit.js */ "./node_modules/jose/dist/webapi/lib/validate_crit.js");
/* harmony import */ var _lib_validate_algorithms_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../../lib/validate_algorithms.js */ "./node_modules/jose/dist/webapi/lib/validate_algorithms.js");
/* harmony import */ var _lib_normalize_key_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../../lib/normalize_key.js */ "./node_modules/jose/dist/webapi/lib/normalize_key.js");
/* harmony import */ var _lib_check_key_type_js__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../../lib/check_key_type.js */ "./node_modules/jose/dist/webapi/lib/check_key_type.js");












async function flattenedDecrypt(jwe, key, options) {
    if (!(0,_lib_is_object_js__WEBPACK_IMPORTED_MODULE_4__["default"])(jwe)) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('Flattened JWE must be an object');
    }
    if (jwe.protected === undefined && jwe.header === undefined && jwe.unprotected === undefined) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JOSE Header missing');
    }
    if (jwe.iv !== undefined && typeof jwe.iv !== 'string') {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JWE Initialization Vector incorrect type');
    }
    if (typeof jwe.ciphertext !== 'string') {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JWE Ciphertext missing or incorrect type');
    }
    if (jwe.tag !== undefined && typeof jwe.tag !== 'string') {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JWE Authentication Tag incorrect type');
    }
    if (jwe.protected !== undefined && typeof jwe.protected !== 'string') {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JWE Protected Header incorrect type');
    }
    if (jwe.encrypted_key !== undefined && typeof jwe.encrypted_key !== 'string') {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JWE Encrypted Key incorrect type');
    }
    if (jwe.aad !== undefined && typeof jwe.aad !== 'string') {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JWE AAD incorrect type');
    }
    if (jwe.header !== undefined && !(0,_lib_is_object_js__WEBPACK_IMPORTED_MODULE_4__["default"])(jwe.header)) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JWE Shared Unprotected Header incorrect type');
    }
    if (jwe.unprotected !== undefined && !(0,_lib_is_object_js__WEBPACK_IMPORTED_MODULE_4__["default"])(jwe.unprotected)) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JWE Per-Recipient Unprotected Header incorrect type');
    }
    let parsedProt;
    if (jwe.protected) {
        try {
            const protectedHeader = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_0__.decode)(jwe.protected);
            parsedProt = JSON.parse(_lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_6__.decoder.decode(protectedHeader));
        }
        catch {
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JWE Protected Header is invalid');
        }
    }
    if (!(0,_lib_is_disjoint_js__WEBPACK_IMPORTED_MODULE_3__["default"])(parsedProt, jwe.header, jwe.unprotected)) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('JWE Protected, JWE Unprotected Header, and JWE Per-Recipient Unprotected Header Parameter names must be disjoint');
    }
    const joseHeader = {
        ...parsedProt,
        ...jwe.header,
        ...jwe.unprotected,
    };
    (0,_lib_validate_crit_js__WEBPACK_IMPORTED_MODULE_8__["default"])(_util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid, new Map(), options?.crit, parsedProt, joseHeader);
    if (joseHeader.zip !== undefined) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JOSENotSupported('JWE "zip" (Compression Algorithm) Header Parameter is not supported.');
    }
    const { alg, enc } = joseHeader;
    if (typeof alg !== 'string' || !alg) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('missing JWE Algorithm (alg) in JWE Header');
    }
    if (typeof enc !== 'string' || !enc) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('missing JWE Encryption Algorithm (enc) in JWE Header');
    }
    const keyManagementAlgorithms = options && (0,_lib_validate_algorithms_js__WEBPACK_IMPORTED_MODULE_9__["default"])('keyManagementAlgorithms', options.keyManagementAlgorithms);
    const contentEncryptionAlgorithms = options &&
        (0,_lib_validate_algorithms_js__WEBPACK_IMPORTED_MODULE_9__["default"])('contentEncryptionAlgorithms', options.contentEncryptionAlgorithms);
    if ((keyManagementAlgorithms && !keyManagementAlgorithms.has(alg)) ||
        (!keyManagementAlgorithms && alg.startsWith('PBES2'))) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
    }
    if (contentEncryptionAlgorithms && !contentEncryptionAlgorithms.has(enc)) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JOSEAlgNotAllowed('"enc" (Encryption Algorithm) Header Parameter value not allowed');
    }
    let encryptedKey;
    if (jwe.encrypted_key !== undefined) {
        try {
            encryptedKey = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_0__.decode)(jwe.encrypted_key);
        }
        catch {
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('Failed to base64url decode the encrypted_key');
        }
    }
    let resolvedKey = false;
    if (typeof key === 'function') {
        key = await key(parsedProt, jwe);
        resolvedKey = true;
    }
    (0,_lib_check_key_type_js__WEBPACK_IMPORTED_MODULE_11__["default"])(alg === 'dir' ? enc : alg, key, 'decrypt');
    const k = await (0,_lib_normalize_key_js__WEBPACK_IMPORTED_MODULE_10__["default"])(key, alg);
    let cek;
    try {
        cek = await (0,_lib_decrypt_key_management_js__WEBPACK_IMPORTED_MODULE_5__["default"])(alg, k, encryptedKey, joseHeader, options);
    }
    catch (err) {
        if (err instanceof TypeError || err instanceof _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid || err instanceof _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JOSENotSupported) {
            throw err;
        }
        cek = (0,_lib_cek_js__WEBPACK_IMPORTED_MODULE_7__["default"])(enc);
    }
    let iv;
    let tag;
    if (jwe.iv !== undefined) {
        try {
            iv = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_0__.decode)(jwe.iv);
        }
        catch {
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('Failed to base64url decode the iv');
        }
    }
    if (jwe.tag !== undefined) {
        try {
            tag = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_0__.decode)(jwe.tag);
        }
        catch {
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('Failed to base64url decode the tag');
        }
    }
    const protectedHeader = _lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_6__.encoder.encode(jwe.protected ?? '');
    let additionalData;
    if (jwe.aad !== undefined) {
        additionalData = (0,_lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_6__.concat)(protectedHeader, _lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_6__.encoder.encode('.'), _lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_6__.encoder.encode(jwe.aad));
    }
    else {
        additionalData = protectedHeader;
    }
    let ciphertext;
    try {
        ciphertext = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_0__.decode)(jwe.ciphertext);
    }
    catch {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('Failed to base64url decode the ciphertext');
    }
    const plaintext = await (0,_lib_decrypt_js__WEBPACK_IMPORTED_MODULE_1__["default"])(enc, cek, ciphertext, iv, tag, additionalData);
    const result = { plaintext };
    if (jwe.protected !== undefined) {
        result.protectedHeader = parsedProt;
    }
    if (jwe.aad !== undefined) {
        try {
            result.additionalAuthenticatedData = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_0__.decode)(jwe.aad);
        }
        catch {
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JWEInvalid('Failed to base64url decode the aad');
        }
    }
    if (jwe.unprotected !== undefined) {
        result.sharedUnprotectedHeader = jwe.unprotected;
    }
    if (jwe.header !== undefined) {
        result.unprotectedHeader = jwe.header;
    }
    if (resolvedKey) {
        return { ...result, key: k };
    }
    return result;
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/key/import.js":
/*!*****************************************************!*\
  !*** ./node_modules/jose/dist/webapi/key/import.js ***!
  \*****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   importJWK: () => (/* binding */ importJWK),
/* harmony export */   importPKCS8: () => (/* binding */ importPKCS8),
/* harmony export */   importSPKI: () => (/* binding */ importSPKI),
/* harmony export */   importX509: () => (/* binding */ importX509)
/* harmony export */ });
/* harmony import */ var _util_base64url_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/base64url.js */ "./node_modules/jose/dist/webapi/util/base64url.js");
/* harmony import */ var _lib_asn1_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/asn1.js */ "./node_modules/jose/dist/webapi/lib/asn1.js");
/* harmony import */ var _lib_jwk_to_key_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../lib/jwk_to_key.js */ "./node_modules/jose/dist/webapi/lib/jwk_to_key.js");
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");
/* harmony import */ var _lib_is_object_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../lib/is_object.js */ "./node_modules/jose/dist/webapi/lib/is_object.js");





async function importSPKI(spki, alg, options) {
    if (typeof spki !== 'string' || spki.indexOf('-----BEGIN PUBLIC KEY-----') !== 0) {
        throw new TypeError('"spki" must be SPKI formatted string');
    }
    return (0,_lib_asn1_js__WEBPACK_IMPORTED_MODULE_1__.fromSPKI)(spki, alg, options);
}
async function importX509(x509, alg, options) {
    if (typeof x509 !== 'string' || x509.indexOf('-----BEGIN CERTIFICATE-----') !== 0) {
        throw new TypeError('"x509" must be X.509 formatted string');
    }
    return (0,_lib_asn1_js__WEBPACK_IMPORTED_MODULE_1__.fromX509)(x509, alg, options);
}
async function importPKCS8(pkcs8, alg, options) {
    if (typeof pkcs8 !== 'string' || pkcs8.indexOf('-----BEGIN PRIVATE KEY-----') !== 0) {
        throw new TypeError('"pkcs8" must be PKCS#8 formatted string');
    }
    return (0,_lib_asn1_js__WEBPACK_IMPORTED_MODULE_1__.fromPKCS8)(pkcs8, alg, options);
}
async function importJWK(jwk, alg, options) {
    if (!(0,_lib_is_object_js__WEBPACK_IMPORTED_MODULE_4__["default"])(jwk)) {
        throw new TypeError('JWK must be an object');
    }
    let ext;
    alg ??= jwk.alg;
    ext ??= options?.extractable ?? jwk.ext;
    switch (jwk.kty) {
        case 'oct':
            if (typeof jwk.k !== 'string' || !jwk.k) {
                throw new TypeError('missing "k" (Key Value) Parameter value');
            }
            return (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_0__.decode)(jwk.k);
        case 'RSA':
            if ('oth' in jwk && jwk.oth !== undefined) {
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_3__.JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
            }
        case 'EC':
        case 'OKP':
            return (0,_lib_jwk_to_key_js__WEBPACK_IMPORTED_MODULE_2__["default"])({ ...jwk, alg, ext });
        default:
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_3__.JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
    }
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/aesgcmkw.js":
/*!*******************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/aesgcmkw.js ***!
  \*******************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   unwrap: () => (/* binding */ unwrap),
/* harmony export */   wrap: () => (/* binding */ wrap)
/* harmony export */ });
/* harmony import */ var _encrypt_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./encrypt.js */ "./node_modules/jose/dist/webapi/lib/encrypt.js");
/* harmony import */ var _decrypt_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./decrypt.js */ "./node_modules/jose/dist/webapi/lib/decrypt.js");
/* harmony import */ var _util_base64url_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/base64url.js */ "./node_modules/jose/dist/webapi/util/base64url.js");



async function wrap(alg, key, cek, iv) {
    const jweAlgorithm = alg.slice(0, 7);
    const wrapped = await (0,_encrypt_js__WEBPACK_IMPORTED_MODULE_0__["default"])(jweAlgorithm, cek, key, iv, new Uint8Array(0));
    return {
        encryptedKey: wrapped.ciphertext,
        iv: (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_2__.encode)(wrapped.iv),
        tag: (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_2__.encode)(wrapped.tag),
    };
}
async function unwrap(alg, key, encryptedKey, iv, tag) {
    const jweAlgorithm = alg.slice(0, 7);
    return (0,_decrypt_js__WEBPACK_IMPORTED_MODULE_1__["default"])(jweAlgorithm, key, encryptedKey, iv, tag, new Uint8Array(0));
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/aeskw.js":
/*!****************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/aeskw.js ***!
  \****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   unwrap: () => (/* binding */ unwrap),
/* harmony export */   wrap: () => (/* binding */ wrap)
/* harmony export */ });
/* harmony import */ var _crypto_key_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./crypto_key.js */ "./node_modules/jose/dist/webapi/lib/crypto_key.js");

function checkKeySize(key, alg) {
    if (key.algorithm.length !== parseInt(alg.slice(1, 4), 10)) {
        throw new TypeError(`Invalid key size for alg: ${alg}`);
    }
}
function getCryptoKey(key, alg, usage) {
    if (key instanceof Uint8Array) {
        return crypto.subtle.importKey('raw', key, 'AES-KW', true, [usage]);
    }
    (0,_crypto_key_js__WEBPACK_IMPORTED_MODULE_0__.checkEncCryptoKey)(key, alg, usage);
    return key;
}
async function wrap(alg, key, cek) {
    const cryptoKey = await getCryptoKey(key, alg, 'wrapKey');
    checkKeySize(cryptoKey, alg);
    const cryptoKeyCek = await crypto.subtle.importKey('raw', cek, { hash: 'SHA-256', name: 'HMAC' }, true, ['sign']);
    return new Uint8Array(await crypto.subtle.wrapKey('raw', cryptoKeyCek, cryptoKey, 'AES-KW'));
}
async function unwrap(alg, key, encryptedKey) {
    const cryptoKey = await getCryptoKey(key, alg, 'unwrapKey');
    checkKeySize(cryptoKey, alg);
    const cryptoKeyCek = await crypto.subtle.unwrapKey('raw', encryptedKey, cryptoKey, 'AES-KW', { hash: 'SHA-256', name: 'HMAC' }, true, ['sign']);
    return new Uint8Array(await crypto.subtle.exportKey('raw', cryptoKeyCek));
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/asn1.js":
/*!***************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/asn1.js ***!
  \***************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   fromPKCS8: () => (/* binding */ fromPKCS8),
/* harmony export */   fromSPKI: () => (/* binding */ fromSPKI),
/* harmony export */   fromX509: () => (/* binding */ fromX509),
/* harmony export */   toPKCS8: () => (/* binding */ toPKCS8),
/* harmony export */   toSPKI: () => (/* binding */ toSPKI)
/* harmony export */ });
/* harmony import */ var _invalid_key_input_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./invalid_key_input.js */ "./node_modules/jose/dist/webapi/lib/invalid_key_input.js");
/* harmony import */ var _lib_base64_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/base64.js */ "./node_modules/jose/dist/webapi/lib/base64.js");
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");
/* harmony import */ var _is_key_like_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./is_key_like.js */ "./node_modules/jose/dist/webapi/lib/is_key_like.js");




const formatPEM = (b64, descriptor) => {
    const newlined = (b64.match(/.{1,64}/g) || []).join('\n');
    return `-----BEGIN ${descriptor}-----\n${newlined}\n-----END ${descriptor}-----`;
};
const genericExport = async (keyType, keyFormat, key) => {
    if ((0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_3__.isKeyObject)(key)) {
        if (key.type !== keyType) {
            throw new TypeError(`key is not a ${keyType} key`);
        }
        return key.export({ format: 'pem', type: keyFormat });
    }
    if (!(0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_3__.isCryptoKey)(key)) {
        throw new TypeError((0,_invalid_key_input_js__WEBPACK_IMPORTED_MODULE_0__["default"])(key, 'CryptoKey', 'KeyObject'));
    }
    if (!key.extractable) {
        throw new TypeError('CryptoKey is not extractable');
    }
    if (key.type !== keyType) {
        throw new TypeError(`key is not a ${keyType} key`);
    }
    return formatPEM((0,_lib_base64_js__WEBPACK_IMPORTED_MODULE_1__.encodeBase64)(new Uint8Array(await crypto.subtle.exportKey(keyFormat, key))), `${keyType.toUpperCase()} KEY`);
};
const toSPKI = (key) => {
    return genericExport('public', 'spki', key);
};
const toPKCS8 = (key) => {
    return genericExport('private', 'pkcs8', key);
};
const bytesEqual = (a, b) => {
    if (a.byteLength !== b.length)
        return false;
    for (let i = 0; i < a.byteLength; i++) {
        if (a[i] !== b[i])
            return false;
    }
    return true;
};
const createASN1State = (data) => ({ data, pos: 0 });
const parseLength = (state) => {
    const first = state.data[state.pos++];
    if (first & 0x80) {
        const lengthOfLen = first & 0x7f;
        let length = 0;
        for (let i = 0; i < lengthOfLen; i++) {
            length = (length << 8) | state.data[state.pos++];
        }
        return length;
    }
    return first;
};
const skipElement = (state, count = 1) => {
    if (count <= 0)
        return;
    state.pos++;
    const length = parseLength(state);
    state.pos += length;
    if (count > 1) {
        skipElement(state, count - 1);
    }
};
const expectTag = (state, expectedTag, errorMessage) => {
    if (state.data[state.pos++] !== expectedTag) {
        throw new Error(errorMessage);
    }
};
const getSubarray = (state, length) => {
    const result = state.data.subarray(state.pos, state.pos + length);
    state.pos += length;
    return result;
};
const parseAlgorithmOID = (state) => {
    expectTag(state, 0x06, 'Expected algorithm OID');
    const oidLen = parseLength(state);
    return getSubarray(state, oidLen);
};
function parsePKCS8Header(state) {
    expectTag(state, 0x30, 'Invalid PKCS#8 structure');
    parseLength(state);
    expectTag(state, 0x02, 'Expected version field');
    const verLen = parseLength(state);
    state.pos += verLen;
    expectTag(state, 0x30, 'Expected algorithm identifier');
    const algIdLen = parseLength(state);
    const algIdStart = state.pos;
    return { algIdStart, algIdLength: algIdLen };
}
function parseSPKIHeader(state) {
    expectTag(state, 0x30, 'Invalid SPKI structure');
    parseLength(state);
    expectTag(state, 0x30, 'Expected algorithm identifier');
    const algIdLen = parseLength(state);
    const algIdStart = state.pos;
    return { algIdStart, algIdLength: algIdLen };
}
const parseECAlgorithmIdentifier = (state) => {
    const algOid = parseAlgorithmOID(state);
    if (bytesEqual(algOid, [0x2b, 0x65, 0x6e])) {
        return 'X25519';
    }
    if (!bytesEqual(algOid, [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01])) {
        throw new Error('Unsupported key algorithm');
    }
    expectTag(state, 0x06, 'Expected curve OID');
    const curveOidLen = parseLength(state);
    const curveOid = getSubarray(state, curveOidLen);
    for (const { name, oid } of [
        { name: 'P-256', oid: [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07] },
        { name: 'P-384', oid: [0x2b, 0x81, 0x04, 0x00, 0x22] },
        { name: 'P-521', oid: [0x2b, 0x81, 0x04, 0x00, 0x23] },
    ]) {
        if (bytesEqual(curveOid, oid)) {
            return name;
        }
    }
    throw new Error('Unsupported named curve');
};
const genericImport = async (keyFormat, keyData, alg, options) => {
    let algorithm;
    let keyUsages;
    const isPublic = keyFormat === 'spki';
    const getSigUsages = () => (isPublic ? ['verify'] : ['sign']);
    const getEncUsages = () => isPublic ? ['encrypt', 'wrapKey'] : ['decrypt', 'unwrapKey'];
    switch (alg) {
        case 'PS256':
        case 'PS384':
        case 'PS512':
            algorithm = { name: 'RSA-PSS', hash: `SHA-${alg.slice(-3)}` };
            keyUsages = getSigUsages();
            break;
        case 'RS256':
        case 'RS384':
        case 'RS512':
            algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: `SHA-${alg.slice(-3)}` };
            keyUsages = getSigUsages();
            break;
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512':
            algorithm = {
                name: 'RSA-OAEP',
                hash: `SHA-${parseInt(alg.slice(-3), 10) || 1}`,
            };
            keyUsages = getEncUsages();
            break;
        case 'ES256':
        case 'ES384':
        case 'ES512': {
            const curveMap = { ES256: 'P-256', ES384: 'P-384', ES512: 'P-521' };
            algorithm = { name: 'ECDSA', namedCurve: curveMap[alg] };
            keyUsages = getSigUsages();
            break;
        }
        case 'ECDH-ES':
        case 'ECDH-ES+A128KW':
        case 'ECDH-ES+A192KW':
        case 'ECDH-ES+A256KW': {
            try {
                const namedCurve = options.getNamedCurve(keyData);
                algorithm = namedCurve === 'X25519' ? { name: 'X25519' } : { name: 'ECDH', namedCurve };
            }
            catch (cause) {
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JOSENotSupported('Invalid or unsupported key format');
            }
            keyUsages = isPublic ? [] : ['deriveBits'];
            break;
        }
        case 'Ed25519':
        case 'EdDSA':
            algorithm = { name: 'Ed25519' };
            keyUsages = getSigUsages();
            break;
        default:
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JOSENotSupported('Invalid or unsupported "alg" (Algorithm) value');
    }
    return crypto.subtle.importKey(keyFormat, keyData, algorithm, options?.extractable ?? (isPublic ? true : false), keyUsages);
};
const processPEMData = (pem, pattern) => {
    return (0,_lib_base64_js__WEBPACK_IMPORTED_MODULE_1__.decodeBase64)(pem.replace(pattern, ''));
};
const fromPKCS8 = (pem, alg, options) => {
    const keyData = processPEMData(pem, /(?:-----(?:BEGIN|END) PRIVATE KEY-----|\s)/g);
    let opts = options;
    if (alg?.startsWith?.('ECDH-ES')) {
        opts ||= {};
        opts.getNamedCurve = (keyData) => {
            const state = createASN1State(keyData);
            parsePKCS8Header(state);
            return parseECAlgorithmIdentifier(state);
        };
    }
    return genericImport('pkcs8', keyData, alg, opts);
};
const fromSPKI = (pem, alg, options) => {
    const keyData = processPEMData(pem, /(?:-----(?:BEGIN|END) PUBLIC KEY-----|\s)/g);
    let opts = options;
    if (alg?.startsWith?.('ECDH-ES')) {
        opts ||= {};
        opts.getNamedCurve = (keyData) => {
            const state = createASN1State(keyData);
            parseSPKIHeader(state);
            return parseECAlgorithmIdentifier(state);
        };
    }
    return genericImport('spki', keyData, alg, opts);
};
function spkiFromX509(buf) {
    const state = createASN1State(buf);
    expectTag(state, 0x30, 'Invalid certificate structure');
    parseLength(state);
    expectTag(state, 0x30, 'Invalid tbsCertificate structure');
    parseLength(state);
    if (buf[state.pos] === 0xa0) {
        skipElement(state, 6);
    }
    else {
        skipElement(state, 5);
    }
    const spkiStart = state.pos;
    expectTag(state, 0x30, 'Invalid SPKI structure');
    const spkiContentLen = parseLength(state);
    return buf.subarray(spkiStart, spkiStart + spkiContentLen + (state.pos - spkiStart));
}
function extractX509SPKI(x509) {
    const derBytes = processPEMData(x509, /(?:-----(?:BEGIN|END) CERTIFICATE-----|\s)/g);
    return spkiFromX509(derBytes);
}
const fromX509 = (pem, alg, options) => {
    let spki;
    try {
        spki = extractX509SPKI(pem);
    }
    catch (cause) {
        throw new TypeError('Failed to parse the X.509 certificate', { cause });
    }
    return fromSPKI(formatPEM((0,_lib_base64_js__WEBPACK_IMPORTED_MODULE_1__.encodeBase64)(spki), 'PUBLIC KEY'), alg, options);
};


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/base64.js":
/*!*****************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/base64.js ***!
  \*****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   decodeBase64: () => (/* binding */ decodeBase64),
/* harmony export */   encodeBase64: () => (/* binding */ encodeBase64)
/* harmony export */ });
function encodeBase64(input) {
    if (Uint8Array.prototype.toBase64) {
        return input.toBase64();
    }
    const CHUNK_SIZE = 0x8000;
    const arr = [];
    for (let i = 0; i < input.length; i += CHUNK_SIZE) {
        arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)));
    }
    return btoa(arr.join(''));
}
function decodeBase64(encoded) {
    if (Uint8Array.fromBase64) {
        return Uint8Array.fromBase64(encoded);
    }
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/buffer_utils.js":
/*!***********************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/buffer_utils.js ***!
  \***********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   concat: () => (/* binding */ concat),
/* harmony export */   decoder: () => (/* binding */ decoder),
/* harmony export */   encoder: () => (/* binding */ encoder),
/* harmony export */   uint32be: () => (/* binding */ uint32be),
/* harmony export */   uint64be: () => (/* binding */ uint64be)
/* harmony export */ });
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MAX_INT32 = 2 ** 32;
function concat(...buffers) {
    const size = buffers.reduce((acc, { length }) => acc + length, 0);
    const buf = new Uint8Array(size);
    let i = 0;
    for (const buffer of buffers) {
        buf.set(buffer, i);
        i += buffer.length;
    }
    return buf;
}
function writeUInt32BE(buf, value, offset) {
    if (value < 0 || value >= MAX_INT32) {
        throw new RangeError(`value must be >= 0 and <= ${MAX_INT32 - 1}. Received ${value}`);
    }
    buf.set([value >>> 24, value >>> 16, value >>> 8, value & 0xff], offset);
}
function uint64be(value) {
    const high = Math.floor(value / MAX_INT32);
    const low = value % MAX_INT32;
    const buf = new Uint8Array(8);
    writeUInt32BE(buf, high, 0);
    writeUInt32BE(buf, low, 4);
    return buf;
}
function uint32be(value) {
    const buf = new Uint8Array(4);
    writeUInt32BE(buf, value);
    return buf;
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/cek.js":
/*!**************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/cek.js ***!
  \**************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bitLength: () => (/* binding */ bitLength),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");

function bitLength(alg) {
    switch (alg) {
        case 'A128GCM':
            return 128;
        case 'A192GCM':
            return 192;
        case 'A256GCM':
        case 'A128CBC-HS256':
            return 256;
        case 'A192CBC-HS384':
            return 384;
        case 'A256CBC-HS512':
            return 512;
        default:
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_0__.JOSENotSupported(`Unsupported JWE Algorithm: ${alg}`);
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((alg) => crypto.getRandomValues(new Uint8Array(bitLength(alg) >> 3)));


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/check_cek_length.js":
/*!***************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/check_cek_length.js ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((cek, expected) => {
    const actual = cek.byteLength << 3;
    if (actual !== expected) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_0__.JWEInvalid(`Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`);
    }
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/check_iv_length.js":
/*!**************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/check_iv_length.js ***!
  \**************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");
/* harmony import */ var _iv_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./iv.js */ "./node_modules/jose/dist/webapi/lib/iv.js");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((enc, iv) => {
    if (iv.length << 3 !== (0,_iv_js__WEBPACK_IMPORTED_MODULE_1__.bitLength)(enc)) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_0__.JWEInvalid('Invalid Initialization Vector length');
    }
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/check_key_length.js":
/*!***************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/check_key_length.js ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((alg, key) => {
    if (alg.startsWith('RS') || alg.startsWith('PS')) {
        const { modulusLength } = key.algorithm;
        if (typeof modulusLength !== 'number' || modulusLength < 2048) {
            throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
        }
    }
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/check_key_type.js":
/*!*************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/check_key_type.js ***!
  \*************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _invalid_key_input_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./invalid_key_input.js */ "./node_modules/jose/dist/webapi/lib/invalid_key_input.js");
/* harmony import */ var _is_key_like_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./is_key_like.js */ "./node_modules/jose/dist/webapi/lib/is_key_like.js");
/* harmony import */ var _is_jwk_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./is_jwk.js */ "./node_modules/jose/dist/webapi/lib/is_jwk.js");



const tag = (key) => key?.[Symbol.toStringTag];
const jwkMatchesOp = (alg, key, usage) => {
    if (key.use !== undefined) {
        let expected;
        switch (usage) {
            case 'sign':
            case 'verify':
                expected = 'sig';
                break;
            case 'encrypt':
            case 'decrypt':
                expected = 'enc';
                break;
        }
        if (key.use !== expected) {
            throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
        }
    }
    if (key.alg !== undefined && key.alg !== alg) {
        throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
    }
    if (Array.isArray(key.key_ops)) {
        let expectedKeyOp;
        switch (true) {
            case usage === 'sign' || usage === 'verify':
            case alg === 'dir':
            case alg.includes('CBC-HS'):
                expectedKeyOp = usage;
                break;
            case alg.startsWith('PBES2'):
                expectedKeyOp = 'deriveBits';
                break;
            case /^A\d{3}(?:GCM)?(?:KW)?$/.test(alg):
                if (!alg.includes('GCM') && alg.endsWith('KW')) {
                    expectedKeyOp = usage === 'encrypt' ? 'wrapKey' : 'unwrapKey';
                }
                else {
                    expectedKeyOp = usage;
                }
                break;
            case usage === 'encrypt' && alg.startsWith('RSA'):
                expectedKeyOp = 'wrapKey';
                break;
            case usage === 'decrypt':
                expectedKeyOp = alg.startsWith('RSA') ? 'unwrapKey' : 'deriveBits';
                break;
        }
        if (expectedKeyOp && key.key_ops?.includes?.(expectedKeyOp) === false) {
            throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
        }
    }
    return true;
};
const symmetricTypeCheck = (alg, key, usage) => {
    if (key instanceof Uint8Array)
        return;
    if (_is_jwk_js__WEBPACK_IMPORTED_MODULE_2__.isJWK(key)) {
        if (_is_jwk_js__WEBPACK_IMPORTED_MODULE_2__.isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
            return;
        throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
    }
    if (!(0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_1__["default"])(key)) {
        throw new TypeError((0,_invalid_key_input_js__WEBPACK_IMPORTED_MODULE_0__.withAlg)(alg, key, 'CryptoKey', 'KeyObject', 'JSON Web Key', 'Uint8Array'));
    }
    if (key.type !== 'secret') {
        throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
    }
};
const asymmetricTypeCheck = (alg, key, usage) => {
    if (_is_jwk_js__WEBPACK_IMPORTED_MODULE_2__.isJWK(key)) {
        switch (usage) {
            case 'decrypt':
            case 'sign':
                if (_is_jwk_js__WEBPACK_IMPORTED_MODULE_2__.isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
                    return;
                throw new TypeError(`JSON Web Key for this operation be a private JWK`);
            case 'encrypt':
            case 'verify':
                if (_is_jwk_js__WEBPACK_IMPORTED_MODULE_2__.isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
                    return;
                throw new TypeError(`JSON Web Key for this operation be a public JWK`);
        }
    }
    if (!(0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_1__["default"])(key)) {
        throw new TypeError((0,_invalid_key_input_js__WEBPACK_IMPORTED_MODULE_0__.withAlg)(alg, key, 'CryptoKey', 'KeyObject', 'JSON Web Key'));
    }
    if (key.type === 'secret') {
        throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
    }
    if (key.type === 'public') {
        switch (usage) {
            case 'sign':
                throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
            case 'decrypt':
                throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
            default:
                break;
        }
    }
    if (key.type === 'private') {
        switch (usage) {
            case 'verify':
                throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
            case 'encrypt':
                throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
            default:
                break;
        }
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((alg, key, usage) => {
    const symmetric = alg.startsWith('HS') ||
        alg === 'dir' ||
        alg.startsWith('PBES2') ||
        /^A(?:128|192|256)(?:GCM)?(?:KW)?$/.test(alg) ||
        /^A(?:128|192|256)CBC-HS(?:256|384|512)$/.test(alg);
    if (symmetric) {
        symmetricTypeCheck(alg, key, usage);
    }
    else {
        asymmetricTypeCheck(alg, key, usage);
    }
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/crypto_key.js":
/*!*********************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/crypto_key.js ***!
  \*********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   checkEncCryptoKey: () => (/* binding */ checkEncCryptoKey),
/* harmony export */   checkSigCryptoKey: () => (/* binding */ checkSigCryptoKey)
/* harmony export */ });
function unusable(name, prop = 'algorithm.name') {
    return new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
}
function isAlgorithm(algorithm, name) {
    return algorithm.name === name;
}
function getHashLength(hash) {
    return parseInt(hash.name.slice(4), 10);
}
function getNamedCurve(alg) {
    switch (alg) {
        case 'ES256':
            return 'P-256';
        case 'ES384':
            return 'P-384';
        case 'ES512':
            return 'P-521';
        default:
            throw new Error('unreachable');
    }
}
function checkUsage(key, usage) {
    if (usage && !key.usages.includes(usage)) {
        throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
    }
}
function checkSigCryptoKey(key, alg, usage) {
    switch (alg) {
        case 'HS256':
        case 'HS384':
        case 'HS512': {
            if (!isAlgorithm(key.algorithm, 'HMAC'))
                throw unusable('HMAC');
            const expected = parseInt(alg.slice(2), 10);
            const actual = getHashLength(key.algorithm.hash);
            if (actual !== expected)
                throw unusable(`SHA-${expected}`, 'algorithm.hash');
            break;
        }
        case 'RS256':
        case 'RS384':
        case 'RS512': {
            if (!isAlgorithm(key.algorithm, 'RSASSA-PKCS1-v1_5'))
                throw unusable('RSASSA-PKCS1-v1_5');
            const expected = parseInt(alg.slice(2), 10);
            const actual = getHashLength(key.algorithm.hash);
            if (actual !== expected)
                throw unusable(`SHA-${expected}`, 'algorithm.hash');
            break;
        }
        case 'PS256':
        case 'PS384':
        case 'PS512': {
            if (!isAlgorithm(key.algorithm, 'RSA-PSS'))
                throw unusable('RSA-PSS');
            const expected = parseInt(alg.slice(2), 10);
            const actual = getHashLength(key.algorithm.hash);
            if (actual !== expected)
                throw unusable(`SHA-${expected}`, 'algorithm.hash');
            break;
        }
        case 'Ed25519':
        case 'EdDSA': {
            if (!isAlgorithm(key.algorithm, 'Ed25519'))
                throw unusable('Ed25519');
            break;
        }
        case 'ES256':
        case 'ES384':
        case 'ES512': {
            if (!isAlgorithm(key.algorithm, 'ECDSA'))
                throw unusable('ECDSA');
            const expected = getNamedCurve(alg);
            const actual = key.algorithm.namedCurve;
            if (actual !== expected)
                throw unusable(expected, 'algorithm.namedCurve');
            break;
        }
        default:
            throw new TypeError('CryptoKey does not support this operation');
    }
    checkUsage(key, usage);
}
function checkEncCryptoKey(key, alg, usage) {
    switch (alg) {
        case 'A128GCM':
        case 'A192GCM':
        case 'A256GCM': {
            if (!isAlgorithm(key.algorithm, 'AES-GCM'))
                throw unusable('AES-GCM');
            const expected = parseInt(alg.slice(1, 4), 10);
            const actual = key.algorithm.length;
            if (actual !== expected)
                throw unusable(expected, 'algorithm.length');
            break;
        }
        case 'A128KW':
        case 'A192KW':
        case 'A256KW': {
            if (!isAlgorithm(key.algorithm, 'AES-KW'))
                throw unusable('AES-KW');
            const expected = parseInt(alg.slice(1, 4), 10);
            const actual = key.algorithm.length;
            if (actual !== expected)
                throw unusable(expected, 'algorithm.length');
            break;
        }
        case 'ECDH': {
            switch (key.algorithm.name) {
                case 'ECDH':
                case 'X25519':
                    break;
                default:
                    throw unusable('ECDH or X25519');
            }
            break;
        }
        case 'PBES2-HS256+A128KW':
        case 'PBES2-HS384+A192KW':
        case 'PBES2-HS512+A256KW':
            if (!isAlgorithm(key.algorithm, 'PBKDF2'))
                throw unusable('PBKDF2');
            break;
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512': {
            if (!isAlgorithm(key.algorithm, 'RSA-OAEP'))
                throw unusable('RSA-OAEP');
            const expected = parseInt(alg.slice(9), 10) || 1;
            const actual = getHashLength(key.algorithm.hash);
            if (actual !== expected)
                throw unusable(`SHA-${expected}`, 'algorithm.hash');
            break;
        }
        default:
            throw new TypeError('CryptoKey does not support this operation');
    }
    checkUsage(key, usage);
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/decrypt.js":
/*!******************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/decrypt.js ***!
  \******************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./buffer_utils.js */ "./node_modules/jose/dist/webapi/lib/buffer_utils.js");
/* harmony import */ var _check_iv_length_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./check_iv_length.js */ "./node_modules/jose/dist/webapi/lib/check_iv_length.js");
/* harmony import */ var _check_cek_length_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./check_cek_length.js */ "./node_modules/jose/dist/webapi/lib/check_cek_length.js");
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");
/* harmony import */ var _crypto_key_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./crypto_key.js */ "./node_modules/jose/dist/webapi/lib/crypto_key.js");
/* harmony import */ var _invalid_key_input_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./invalid_key_input.js */ "./node_modules/jose/dist/webapi/lib/invalid_key_input.js");
/* harmony import */ var _is_key_like_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./is_key_like.js */ "./node_modules/jose/dist/webapi/lib/is_key_like.js");







async function timingSafeEqual(a, b) {
    if (!(a instanceof Uint8Array)) {
        throw new TypeError('First argument must be a buffer');
    }
    if (!(b instanceof Uint8Array)) {
        throw new TypeError('Second argument must be a buffer');
    }
    const algorithm = { name: 'HMAC', hash: 'SHA-256' };
    const key = (await crypto.subtle.generateKey(algorithm, false, ['sign']));
    const aHmac = new Uint8Array(await crypto.subtle.sign(algorithm, key, a));
    const bHmac = new Uint8Array(await crypto.subtle.sign(algorithm, key, b));
    let out = 0;
    let i = -1;
    while (++i < 32) {
        out |= aHmac[i] ^ bHmac[i];
    }
    return out === 0;
}
async function cbcDecrypt(enc, cek, ciphertext, iv, tag, aad) {
    if (!(cek instanceof Uint8Array)) {
        throw new TypeError((0,_invalid_key_input_js__WEBPACK_IMPORTED_MODULE_5__["default"])(cek, 'Uint8Array'));
    }
    const keySize = parseInt(enc.slice(1, 4), 10);
    const encKey = await crypto.subtle.importKey('raw', cek.subarray(keySize >> 3), 'AES-CBC', false, ['decrypt']);
    const macKey = await crypto.subtle.importKey('raw', cek.subarray(0, keySize >> 3), {
        hash: `SHA-${keySize << 1}`,
        name: 'HMAC',
    }, false, ['sign']);
    const macData = (0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.concat)(aad, iv, ciphertext, (0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.uint64be)(aad.length << 3));
    const expectedTag = new Uint8Array((await crypto.subtle.sign('HMAC', macKey, macData)).slice(0, keySize >> 3));
    let macCheckPassed;
    try {
        macCheckPassed = await timingSafeEqual(tag, expectedTag);
    }
    catch {
    }
    if (!macCheckPassed) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_3__.JWEDecryptionFailed();
    }
    let plaintext;
    try {
        plaintext = new Uint8Array(await crypto.subtle.decrypt({ iv, name: 'AES-CBC' }, encKey, ciphertext));
    }
    catch {
    }
    if (!plaintext) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_3__.JWEDecryptionFailed();
    }
    return plaintext;
}
async function gcmDecrypt(enc, cek, ciphertext, iv, tag, aad) {
    let encKey;
    if (cek instanceof Uint8Array) {
        encKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
    }
    else {
        (0,_crypto_key_js__WEBPACK_IMPORTED_MODULE_4__.checkEncCryptoKey)(cek, enc, 'decrypt');
        encKey = cek;
    }
    try {
        return new Uint8Array(await crypto.subtle.decrypt({
            additionalData: aad,
            iv,
            name: 'AES-GCM',
            tagLength: 128,
        }, encKey, (0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.concat)(ciphertext, tag)));
    }
    catch {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_3__.JWEDecryptionFailed();
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (async (enc, cek, ciphertext, iv, tag, aad) => {
    if (!(0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_6__.isCryptoKey)(cek) && !(cek instanceof Uint8Array)) {
        throw new TypeError((0,_invalid_key_input_js__WEBPACK_IMPORTED_MODULE_5__["default"])(cek, 'CryptoKey', 'KeyObject', 'Uint8Array', 'JSON Web Key'));
    }
    if (!iv) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_3__.JWEInvalid('JWE Initialization Vector missing');
    }
    if (!tag) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_3__.JWEInvalid('JWE Authentication Tag missing');
    }
    (0,_check_iv_length_js__WEBPACK_IMPORTED_MODULE_1__["default"])(enc, iv);
    switch (enc) {
        case 'A128CBC-HS256':
        case 'A192CBC-HS384':
        case 'A256CBC-HS512':
            if (cek instanceof Uint8Array)
                (0,_check_cek_length_js__WEBPACK_IMPORTED_MODULE_2__["default"])(cek, parseInt(enc.slice(-3), 10));
            return cbcDecrypt(enc, cek, ciphertext, iv, tag, aad);
        case 'A128GCM':
        case 'A192GCM':
        case 'A256GCM':
            if (cek instanceof Uint8Array)
                (0,_check_cek_length_js__WEBPACK_IMPORTED_MODULE_2__["default"])(cek, parseInt(enc.slice(1, 4), 10));
            return gcmDecrypt(enc, cek, ciphertext, iv, tag, aad);
        default:
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_3__.JOSENotSupported('Unsupported JWE Content Encryption Algorithm');
    }
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/decrypt_key_management.js":
/*!*********************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/decrypt_key_management.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _aeskw_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./aeskw.js */ "./node_modules/jose/dist/webapi/lib/aeskw.js");
/* harmony import */ var _ecdhes_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ecdhes.js */ "./node_modules/jose/dist/webapi/lib/ecdhes.js");
/* harmony import */ var _pbes2kw_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./pbes2kw.js */ "./node_modules/jose/dist/webapi/lib/pbes2kw.js");
/* harmony import */ var _rsaes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./rsaes.js */ "./node_modules/jose/dist/webapi/lib/rsaes.js");
/* harmony import */ var _util_base64url_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/base64url.js */ "./node_modules/jose/dist/webapi/util/base64url.js");
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");
/* harmony import */ var _lib_cek_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../lib/cek.js */ "./node_modules/jose/dist/webapi/lib/cek.js");
/* harmony import */ var _key_import_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../key/import.js */ "./node_modules/jose/dist/webapi/key/import.js");
/* harmony import */ var _is_object_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./is_object.js */ "./node_modules/jose/dist/webapi/lib/is_object.js");
/* harmony import */ var _aesgcmkw_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./aesgcmkw.js */ "./node_modules/jose/dist/webapi/lib/aesgcmkw.js");
/* harmony import */ var _is_key_like_js__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./is_key_like.js */ "./node_modules/jose/dist/webapi/lib/is_key_like.js");











/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (async (alg, key, encryptedKey, joseHeader, options) => {
    switch (alg) {
        case 'dir': {
            if (encryptedKey !== undefined)
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('Encountered unexpected JWE Encrypted Key');
            return key;
        }
        case 'ECDH-ES':
            if (encryptedKey !== undefined)
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('Encountered unexpected JWE Encrypted Key');
        case 'ECDH-ES+A128KW':
        case 'ECDH-ES+A192KW':
        case 'ECDH-ES+A256KW': {
            if (!(0,_is_object_js__WEBPACK_IMPORTED_MODULE_8__["default"])(joseHeader.epk))
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid(`JOSE Header "epk" (Ephemeral Public Key) missing or invalid`);
            (0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_10__.assertCryptoKey)(key);
            if (!_ecdhes_js__WEBPACK_IMPORTED_MODULE_1__.allowed(key))
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JOSENotSupported('ECDH with the provided key is not allowed or not supported by your javascript runtime');
            const epk = await (0,_key_import_js__WEBPACK_IMPORTED_MODULE_7__.importJWK)(joseHeader.epk, alg);
            (0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_10__.assertCryptoKey)(epk);
            let partyUInfo;
            let partyVInfo;
            if (joseHeader.apu !== undefined) {
                if (typeof joseHeader.apu !== 'string')
                    throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid(`JOSE Header "apu" (Agreement PartyUInfo) invalid`);
                try {
                    partyUInfo = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_4__.decode)(joseHeader.apu);
                }
                catch {
                    throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('Failed to base64url decode the apu');
                }
            }
            if (joseHeader.apv !== undefined) {
                if (typeof joseHeader.apv !== 'string')
                    throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid(`JOSE Header "apv" (Agreement PartyVInfo) invalid`);
                try {
                    partyVInfo = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_4__.decode)(joseHeader.apv);
                }
                catch {
                    throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('Failed to base64url decode the apv');
                }
            }
            const sharedSecret = await _ecdhes_js__WEBPACK_IMPORTED_MODULE_1__.deriveKey(epk, key, alg === 'ECDH-ES' ? joseHeader.enc : alg, alg === 'ECDH-ES' ? (0,_lib_cek_js__WEBPACK_IMPORTED_MODULE_6__.bitLength)(joseHeader.enc) : parseInt(alg.slice(-5, -2), 10), partyUInfo, partyVInfo);
            if (alg === 'ECDH-ES')
                return sharedSecret;
            if (encryptedKey === undefined)
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('JWE Encrypted Key missing');
            return _aeskw_js__WEBPACK_IMPORTED_MODULE_0__.unwrap(alg.slice(-6), sharedSecret, encryptedKey);
        }
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512': {
            if (encryptedKey === undefined)
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('JWE Encrypted Key missing');
            (0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_10__.assertCryptoKey)(key);
            return _rsaes_js__WEBPACK_IMPORTED_MODULE_3__.decrypt(alg, key, encryptedKey);
        }
        case 'PBES2-HS256+A128KW':
        case 'PBES2-HS384+A192KW':
        case 'PBES2-HS512+A256KW': {
            if (encryptedKey === undefined)
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('JWE Encrypted Key missing');
            if (typeof joseHeader.p2c !== 'number')
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid(`JOSE Header "p2c" (PBES2 Count) missing or invalid`);
            const p2cLimit = options?.maxPBES2Count || 10_000;
            if (joseHeader.p2c > p2cLimit)
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid(`JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds`);
            if (typeof joseHeader.p2s !== 'string')
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid(`JOSE Header "p2s" (PBES2 Salt) missing or invalid`);
            let p2s;
            try {
                p2s = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_4__.decode)(joseHeader.p2s);
            }
            catch {
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('Failed to base64url decode the p2s');
            }
            return _pbes2kw_js__WEBPACK_IMPORTED_MODULE_2__.unwrap(alg, key, encryptedKey, joseHeader.p2c, p2s);
        }
        case 'A128KW':
        case 'A192KW':
        case 'A256KW': {
            if (encryptedKey === undefined)
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('JWE Encrypted Key missing');
            return _aeskw_js__WEBPACK_IMPORTED_MODULE_0__.unwrap(alg, key, encryptedKey);
        }
        case 'A128GCMKW':
        case 'A192GCMKW':
        case 'A256GCMKW': {
            if (encryptedKey === undefined)
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('JWE Encrypted Key missing');
            if (typeof joseHeader.iv !== 'string')
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid(`JOSE Header "iv" (Initialization Vector) missing or invalid`);
            if (typeof joseHeader.tag !== 'string')
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid(`JOSE Header "tag" (Authentication Tag) missing or invalid`);
            let iv;
            try {
                iv = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_4__.decode)(joseHeader.iv);
            }
            catch {
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('Failed to base64url decode the iv');
            }
            let tag;
            try {
                tag = (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_4__.decode)(joseHeader.tag);
            }
            catch {
                throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JWEInvalid('Failed to base64url decode the tag');
            }
            return (0,_aesgcmkw_js__WEBPACK_IMPORTED_MODULE_9__.unwrap)(alg, key, encryptedKey, iv, tag);
        }
        default: {
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_5__.JOSENotSupported('Invalid or unsupported "alg" (JWE Algorithm) header value');
        }
    }
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/digest.js":
/*!*****************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/digest.js ***!
  \*****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (async (algorithm, data) => {
    const subtleDigest = `SHA-${algorithm.slice(-3)}`;
    return new Uint8Array(await crypto.subtle.digest(subtleDigest, data));
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/ecdhes.js":
/*!*****************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/ecdhes.js ***!
  \*****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   allowed: () => (/* binding */ allowed),
/* harmony export */   deriveKey: () => (/* binding */ deriveKey)
/* harmony export */ });
/* harmony import */ var _buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./buffer_utils.js */ "./node_modules/jose/dist/webapi/lib/buffer_utils.js");
/* harmony import */ var _crypto_key_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./crypto_key.js */ "./node_modules/jose/dist/webapi/lib/crypto_key.js");
/* harmony import */ var _digest_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./digest.js */ "./node_modules/jose/dist/webapi/lib/digest.js");



function lengthAndInput(input) {
    return (0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.concat)((0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.uint32be)(input.length), input);
}
async function concatKdf(Z, L, OtherInfo) {
    const dkLen = L >> 3;
    const hashLen = 32;
    const reps = Math.ceil(dkLen / hashLen);
    const dk = new Uint8Array(reps * hashLen);
    for (let i = 1; i <= reps; i++) {
        const hashInput = new Uint8Array(4 + Z.length + OtherInfo.length);
        hashInput.set((0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.uint32be)(i), 0);
        hashInput.set(Z, 4);
        hashInput.set(OtherInfo, 4 + Z.length);
        const hashResult = await (0,_digest_js__WEBPACK_IMPORTED_MODULE_2__["default"])('sha256', hashInput);
        dk.set(hashResult, (i - 1) * hashLen);
    }
    return dk.slice(0, dkLen);
}
async function deriveKey(publicKey, privateKey, algorithm, keyLength, apu = new Uint8Array(0), apv = new Uint8Array(0)) {
    (0,_crypto_key_js__WEBPACK_IMPORTED_MODULE_1__.checkEncCryptoKey)(publicKey, 'ECDH');
    (0,_crypto_key_js__WEBPACK_IMPORTED_MODULE_1__.checkEncCryptoKey)(privateKey, 'ECDH', 'deriveBits');
    const algorithmID = lengthAndInput(_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.encoder.encode(algorithm));
    const partyUInfo = lengthAndInput(apu);
    const partyVInfo = lengthAndInput(apv);
    const suppPubInfo = (0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.uint32be)(keyLength);
    const suppPrivInfo = new Uint8Array(0);
    const otherInfo = (0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.concat)(algorithmID, partyUInfo, partyVInfo, suppPubInfo, suppPrivInfo);
    const Z = new Uint8Array(await crypto.subtle.deriveBits({
        name: publicKey.algorithm.name,
        public: publicKey,
    }, privateKey, getEcdhBitLength(publicKey)));
    return concatKdf(Z, keyLength, otherInfo);
}
function getEcdhBitLength(publicKey) {
    if (publicKey.algorithm.name === 'X25519') {
        return 256;
    }
    return (Math.ceil(parseInt(publicKey.algorithm.namedCurve.slice(-3), 10) / 8) << 3);
}
function allowed(key) {
    switch (key.algorithm.namedCurve) {
        case 'P-256':
        case 'P-384':
        case 'P-521':
            return true;
        default:
            return key.algorithm.name === 'X25519';
    }
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/encrypt.js":
/*!******************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/encrypt.js ***!
  \******************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./buffer_utils.js */ "./node_modules/jose/dist/webapi/lib/buffer_utils.js");
/* harmony import */ var _check_iv_length_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./check_iv_length.js */ "./node_modules/jose/dist/webapi/lib/check_iv_length.js");
/* harmony import */ var _check_cek_length_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./check_cek_length.js */ "./node_modules/jose/dist/webapi/lib/check_cek_length.js");
/* harmony import */ var _crypto_key_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./crypto_key.js */ "./node_modules/jose/dist/webapi/lib/crypto_key.js");
/* harmony import */ var _invalid_key_input_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./invalid_key_input.js */ "./node_modules/jose/dist/webapi/lib/invalid_key_input.js");
/* harmony import */ var _iv_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./iv.js */ "./node_modules/jose/dist/webapi/lib/iv.js");
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");
/* harmony import */ var _is_key_like_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./is_key_like.js */ "./node_modules/jose/dist/webapi/lib/is_key_like.js");








async function cbcEncrypt(enc, plaintext, cek, iv, aad) {
    if (!(cek instanceof Uint8Array)) {
        throw new TypeError((0,_invalid_key_input_js__WEBPACK_IMPORTED_MODULE_4__["default"])(cek, 'Uint8Array'));
    }
    const keySize = parseInt(enc.slice(1, 4), 10);
    const encKey = await crypto.subtle.importKey('raw', cek.subarray(keySize >> 3), 'AES-CBC', false, ['encrypt']);
    const macKey = await crypto.subtle.importKey('raw', cek.subarray(0, keySize >> 3), {
        hash: `SHA-${keySize << 1}`,
        name: 'HMAC',
    }, false, ['sign']);
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({
        iv,
        name: 'AES-CBC',
    }, encKey, plaintext));
    const macData = (0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.concat)(aad, iv, ciphertext, (0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.uint64be)(aad.length << 3));
    const tag = new Uint8Array((await crypto.subtle.sign('HMAC', macKey, macData)).slice(0, keySize >> 3));
    return { ciphertext, tag, iv };
}
async function gcmEncrypt(enc, plaintext, cek, iv, aad) {
    let encKey;
    if (cek instanceof Uint8Array) {
        encKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
    }
    else {
        (0,_crypto_key_js__WEBPACK_IMPORTED_MODULE_3__.checkEncCryptoKey)(cek, enc, 'encrypt');
        encKey = cek;
    }
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({
        additionalData: aad,
        iv,
        name: 'AES-GCM',
        tagLength: 128,
    }, encKey, plaintext));
    const tag = encrypted.slice(-16);
    const ciphertext = encrypted.slice(0, -16);
    return { ciphertext, tag, iv };
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (async (enc, plaintext, cek, iv, aad) => {
    if (!(0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_7__.isCryptoKey)(cek) && !(cek instanceof Uint8Array)) {
        throw new TypeError((0,_invalid_key_input_js__WEBPACK_IMPORTED_MODULE_4__["default"])(cek, 'CryptoKey', 'KeyObject', 'Uint8Array', 'JSON Web Key'));
    }
    if (iv) {
        (0,_check_iv_length_js__WEBPACK_IMPORTED_MODULE_1__["default"])(enc, iv);
    }
    else {
        iv = (0,_iv_js__WEBPACK_IMPORTED_MODULE_5__["default"])(enc);
    }
    switch (enc) {
        case 'A128CBC-HS256':
        case 'A192CBC-HS384':
        case 'A256CBC-HS512':
            if (cek instanceof Uint8Array) {
                (0,_check_cek_length_js__WEBPACK_IMPORTED_MODULE_2__["default"])(cek, parseInt(enc.slice(-3), 10));
            }
            return cbcEncrypt(enc, plaintext, cek, iv, aad);
        case 'A128GCM':
        case 'A192GCM':
        case 'A256GCM':
            if (cek instanceof Uint8Array) {
                (0,_check_cek_length_js__WEBPACK_IMPORTED_MODULE_2__["default"])(cek, parseInt(enc.slice(1, 4), 10));
            }
            return gcmEncrypt(enc, plaintext, cek, iv, aad);
        default:
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_6__.JOSENotSupported('Unsupported JWE Content Encryption Algorithm');
    }
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/invalid_key_input.js":
/*!****************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/invalid_key_input.js ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   withAlg: () => (/* binding */ withAlg)
/* harmony export */ });
function message(msg, actual, ...types) {
    types = types.filter(Boolean);
    if (types.length > 2) {
        const last = types.pop();
        msg += `one of type ${types.join(', ')}, or ${last}.`;
    }
    else if (types.length === 2) {
        msg += `one of type ${types[0]} or ${types[1]}.`;
    }
    else {
        msg += `of type ${types[0]}.`;
    }
    if (actual == null) {
        msg += ` Received ${actual}`;
    }
    else if (typeof actual === 'function' && actual.name) {
        msg += ` Received function ${actual.name}`;
    }
    else if (typeof actual === 'object' && actual != null) {
        if (actual.constructor?.name) {
            msg += ` Received an instance of ${actual.constructor.name}`;
        }
    }
    return msg;
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((actual, ...types) => {
    return message('Key must be ', actual, ...types);
});
function withAlg(alg, actual, ...types) {
    return message(`Key for the ${alg} algorithm must be `, actual, ...types);
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/is_disjoint.js":
/*!**********************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/is_disjoint.js ***!
  \**********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((...headers) => {
    const sources = headers.filter(Boolean);
    if (sources.length === 0 || sources.length === 1) {
        return true;
    }
    let acc;
    for (const header of sources) {
        const parameters = Object.keys(header);
        if (!acc || acc.size === 0) {
            acc = new Set(parameters);
            continue;
        }
        for (const parameter of parameters) {
            if (acc.has(parameter)) {
                return false;
            }
            acc.add(parameter);
        }
    }
    return true;
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/is_jwk.js":
/*!*****************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/is_jwk.js ***!
  \*****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   isJWK: () => (/* binding */ isJWK),
/* harmony export */   isPrivateJWK: () => (/* binding */ isPrivateJWK),
/* harmony export */   isPublicJWK: () => (/* binding */ isPublicJWK),
/* harmony export */   isSecretJWK: () => (/* binding */ isSecretJWK)
/* harmony export */ });
/* harmony import */ var _is_object_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./is_object.js */ "./node_modules/jose/dist/webapi/lib/is_object.js");

function isJWK(key) {
    return (0,_is_object_js__WEBPACK_IMPORTED_MODULE_0__["default"])(key) && typeof key.kty === 'string';
}
function isPrivateJWK(key) {
    return key.kty !== 'oct' && typeof key.d === 'string';
}
function isPublicJWK(key) {
    return key.kty !== 'oct' && typeof key.d === 'undefined';
}
function isSecretJWK(key) {
    return key.kty === 'oct' && typeof key.k === 'string';
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/is_key_like.js":
/*!**********************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/is_key_like.js ***!
  \**********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   assertCryptoKey: () => (/* binding */ assertCryptoKey),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   isCryptoKey: () => (/* binding */ isCryptoKey),
/* harmony export */   isKeyObject: () => (/* binding */ isKeyObject)
/* harmony export */ });
function assertCryptoKey(key) {
    if (!isCryptoKey(key)) {
        throw new Error('CryptoKey instance expected');
    }
}
function isCryptoKey(key) {
    return key?.[Symbol.toStringTag] === 'CryptoKey';
}
function isKeyObject(key) {
    return key?.[Symbol.toStringTag] === 'KeyObject';
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((key) => {
    return isCryptoKey(key) || isKeyObject(key);
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/is_object.js":
/*!********************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/is_object.js ***!
  \********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
function isObjectLike(value) {
    return typeof value === 'object' && value !== null;
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((input) => {
    if (!isObjectLike(input) || Object.prototype.toString.call(input) !== '[object Object]') {
        return false;
    }
    if (Object.getPrototypeOf(input) === null) {
        return true;
    }
    let proto = input;
    while (Object.getPrototypeOf(proto) !== null) {
        proto = Object.getPrototypeOf(proto);
    }
    return Object.getPrototypeOf(input) === proto;
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/iv.js":
/*!*************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/iv.js ***!
  \*************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bitLength: () => (/* binding */ bitLength),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");

function bitLength(alg) {
    switch (alg) {
        case 'A128GCM':
        case 'A128GCMKW':
        case 'A192GCM':
        case 'A192GCMKW':
        case 'A256GCM':
        case 'A256GCMKW':
            return 96;
        case 'A128CBC-HS256':
        case 'A192CBC-HS384':
        case 'A256CBC-HS512':
            return 128;
        default:
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_0__.JOSENotSupported(`Unsupported JWE Algorithm: ${alg}`);
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((alg) => crypto.getRandomValues(new Uint8Array(bitLength(alg) >> 3)));


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/jwk_to_key.js":
/*!*********************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/jwk_to_key.js ***!
  \*********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");

function subtleMapping(jwk) {
    let algorithm;
    let keyUsages;
    switch (jwk.kty) {
        case 'RSA': {
            switch (jwk.alg) {
                case 'PS256':
                case 'PS384':
                case 'PS512':
                    algorithm = { name: 'RSA-PSS', hash: `SHA-${jwk.alg.slice(-3)}` };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'RS256':
                case 'RS384':
                case 'RS512':
                    algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: `SHA-${jwk.alg.slice(-3)}` };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'RSA-OAEP':
                case 'RSA-OAEP-256':
                case 'RSA-OAEP-384':
                case 'RSA-OAEP-512':
                    algorithm = {
                        name: 'RSA-OAEP',
                        hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`,
                    };
                    keyUsages = jwk.d ? ['decrypt', 'unwrapKey'] : ['encrypt', 'wrapKey'];
                    break;
                default:
                    throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_0__.JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
            }
            break;
        }
        case 'EC': {
            switch (jwk.alg) {
                case 'ES256':
                    algorithm = { name: 'ECDSA', namedCurve: 'P-256' };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'ES384':
                    algorithm = { name: 'ECDSA', namedCurve: 'P-384' };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'ES512':
                    algorithm = { name: 'ECDSA', namedCurve: 'P-521' };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'ECDH-ES':
                case 'ECDH-ES+A128KW':
                case 'ECDH-ES+A192KW':
                case 'ECDH-ES+A256KW':
                    algorithm = { name: 'ECDH', namedCurve: jwk.crv };
                    keyUsages = jwk.d ? ['deriveBits'] : [];
                    break;
                default:
                    throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_0__.JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
            }
            break;
        }
        case 'OKP': {
            switch (jwk.alg) {
                case 'Ed25519':
                case 'EdDSA':
                    algorithm = { name: 'Ed25519' };
                    keyUsages = jwk.d ? ['sign'] : ['verify'];
                    break;
                case 'ECDH-ES':
                case 'ECDH-ES+A128KW':
                case 'ECDH-ES+A192KW':
                case 'ECDH-ES+A256KW':
                    algorithm = { name: jwk.crv };
                    keyUsages = jwk.d ? ['deriveBits'] : [];
                    break;
                default:
                    throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_0__.JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
            }
            break;
        }
        default:
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_0__.JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
    }
    return { algorithm, keyUsages };
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (async (jwk) => {
    if (!jwk.alg) {
        throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
    }
    const { algorithm, keyUsages } = subtleMapping(jwk);
    const keyData = { ...jwk };
    delete keyData.alg;
    delete keyData.use;
    return crypto.subtle.importKey('jwk', keyData, algorithm, jwk.ext ?? (jwk.d ? false : true), jwk.key_ops ?? keyUsages);
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/normalize_key.js":
/*!************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/normalize_key.js ***!
  \************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _is_jwk_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./is_jwk.js */ "./node_modules/jose/dist/webapi/lib/is_jwk.js");
/* harmony import */ var _util_base64url_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/base64url.js */ "./node_modules/jose/dist/webapi/util/base64url.js");
/* harmony import */ var _jwk_to_key_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./jwk_to_key.js */ "./node_modules/jose/dist/webapi/lib/jwk_to_key.js");
/* harmony import */ var _is_key_like_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./is_key_like.js */ "./node_modules/jose/dist/webapi/lib/is_key_like.js");




let cache;
const handleJWK = async (key, jwk, alg, freeze = false) => {
    cache ||= new WeakMap();
    let cached = cache.get(key);
    if (cached?.[alg]) {
        return cached[alg];
    }
    const cryptoKey = await (0,_jwk_to_key_js__WEBPACK_IMPORTED_MODULE_2__["default"])({ ...jwk, alg });
    if (freeze)
        Object.freeze(key);
    if (!cached) {
        cache.set(key, { [alg]: cryptoKey });
    }
    else {
        cached[alg] = cryptoKey;
    }
    return cryptoKey;
};
const handleKeyObject = (keyObject, alg) => {
    cache ||= new WeakMap();
    let cached = cache.get(keyObject);
    if (cached?.[alg]) {
        return cached[alg];
    }
    const isPublic = keyObject.type === 'public';
    const extractable = isPublic ? true : false;
    let cryptoKey;
    if (keyObject.asymmetricKeyType === 'x25519') {
        switch (alg) {
            case 'ECDH-ES':
            case 'ECDH-ES+A128KW':
            case 'ECDH-ES+A192KW':
            case 'ECDH-ES+A256KW':
                break;
            default:
                throw new TypeError('given KeyObject instance cannot be used for this algorithm');
        }
        cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, isPublic ? [] : ['deriveBits']);
    }
    if (keyObject.asymmetricKeyType === 'ed25519') {
        if (alg !== 'EdDSA' && alg !== 'Ed25519') {
            throw new TypeError('given KeyObject instance cannot be used for this algorithm');
        }
        cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
            isPublic ? 'verify' : 'sign',
        ]);
    }
    if (keyObject.asymmetricKeyType === 'rsa') {
        let hash;
        switch (alg) {
            case 'RSA-OAEP':
                hash = 'SHA-1';
                break;
            case 'RS256':
            case 'PS256':
            case 'RSA-OAEP-256':
                hash = 'SHA-256';
                break;
            case 'RS384':
            case 'PS384':
            case 'RSA-OAEP-384':
                hash = 'SHA-384';
                break;
            case 'RS512':
            case 'PS512':
            case 'RSA-OAEP-512':
                hash = 'SHA-512';
                break;
            default:
                throw new TypeError('given KeyObject instance cannot be used for this algorithm');
        }
        if (alg.startsWith('RSA-OAEP')) {
            return keyObject.toCryptoKey({
                name: 'RSA-OAEP',
                hash,
            }, extractable, isPublic ? ['encrypt'] : ['decrypt']);
        }
        cryptoKey = keyObject.toCryptoKey({
            name: alg.startsWith('PS') ? 'RSA-PSS' : 'RSASSA-PKCS1-v1_5',
            hash,
        }, extractable, [isPublic ? 'verify' : 'sign']);
    }
    if (keyObject.asymmetricKeyType === 'ec') {
        const nist = new Map([
            ['prime256v1', 'P-256'],
            ['secp384r1', 'P-384'],
            ['secp521r1', 'P-521'],
        ]);
        const namedCurve = nist.get(keyObject.asymmetricKeyDetails?.namedCurve);
        if (!namedCurve) {
            throw new TypeError('given KeyObject instance cannot be used for this algorithm');
        }
        if (alg === 'ES256' && namedCurve === 'P-256') {
            cryptoKey = keyObject.toCryptoKey({
                name: 'ECDSA',
                namedCurve,
            }, extractable, [isPublic ? 'verify' : 'sign']);
        }
        if (alg === 'ES384' && namedCurve === 'P-384') {
            cryptoKey = keyObject.toCryptoKey({
                name: 'ECDSA',
                namedCurve,
            }, extractable, [isPublic ? 'verify' : 'sign']);
        }
        if (alg === 'ES512' && namedCurve === 'P-521') {
            cryptoKey = keyObject.toCryptoKey({
                name: 'ECDSA',
                namedCurve,
            }, extractable, [isPublic ? 'verify' : 'sign']);
        }
        if (alg.startsWith('ECDH-ES')) {
            cryptoKey = keyObject.toCryptoKey({
                name: 'ECDH',
                namedCurve,
            }, extractable, isPublic ? [] : ['deriveBits']);
        }
    }
    if (!cryptoKey) {
        throw new TypeError('given KeyObject instance cannot be used for this algorithm');
    }
    if (!cached) {
        cache.set(keyObject, { [alg]: cryptoKey });
    }
    else {
        cached[alg] = cryptoKey;
    }
    return cryptoKey;
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (async (key, alg) => {
    if (key instanceof Uint8Array) {
        return key;
    }
    if ((0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_3__.isCryptoKey)(key)) {
        return key;
    }
    if ((0,_is_key_like_js__WEBPACK_IMPORTED_MODULE_3__.isKeyObject)(key)) {
        if (key.type === 'secret') {
            return key.export();
        }
        if ('toCryptoKey' in key && typeof key.toCryptoKey === 'function') {
            try {
                return handleKeyObject(key, alg);
            }
            catch (err) {
                if (err instanceof TypeError) {
                    throw err;
                }
            }
        }
        let jwk = key.export({ format: 'jwk' });
        return handleJWK(key, jwk, alg);
    }
    if ((0,_is_jwk_js__WEBPACK_IMPORTED_MODULE_0__.isJWK)(key)) {
        if (key.k) {
            return (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_1__.decode)(key.k);
        }
        return handleJWK(key, key, alg, true);
    }
    throw new Error('unreachable');
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/pbes2kw.js":
/*!******************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/pbes2kw.js ***!
  \******************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   unwrap: () => (/* binding */ unwrap),
/* harmony export */   wrap: () => (/* binding */ wrap)
/* harmony export */ });
/* harmony import */ var _util_base64url_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/base64url.js */ "./node_modules/jose/dist/webapi/util/base64url.js");
/* harmony import */ var _aeskw_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./aeskw.js */ "./node_modules/jose/dist/webapi/lib/aeskw.js");
/* harmony import */ var _crypto_key_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./crypto_key.js */ "./node_modules/jose/dist/webapi/lib/crypto_key.js");
/* harmony import */ var _buffer_utils_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./buffer_utils.js */ "./node_modules/jose/dist/webapi/lib/buffer_utils.js");
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");





function getCryptoKey(key, alg) {
    if (key instanceof Uint8Array) {
        return crypto.subtle.importKey('raw', key, 'PBKDF2', false, ['deriveBits']);
    }
    (0,_crypto_key_js__WEBPACK_IMPORTED_MODULE_2__.checkEncCryptoKey)(key, alg, 'deriveBits');
    return key;
}
const concatSalt = (alg, p2sInput) => (0,_buffer_utils_js__WEBPACK_IMPORTED_MODULE_3__.concat)(_buffer_utils_js__WEBPACK_IMPORTED_MODULE_3__.encoder.encode(alg), new Uint8Array([0]), p2sInput);
async function deriveKey(p2s, alg, p2c, key) {
    if (!(p2s instanceof Uint8Array) || p2s.length < 8) {
        throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_4__.JWEInvalid('PBES2 Salt Input must be 8 or more octets');
    }
    const salt = concatSalt(alg, p2s);
    const keylen = parseInt(alg.slice(13, 16), 10);
    const subtleAlg = {
        hash: `SHA-${alg.slice(8, 11)}`,
        iterations: p2c,
        name: 'PBKDF2',
        salt,
    };
    const cryptoKey = await getCryptoKey(key, alg);
    return new Uint8Array(await crypto.subtle.deriveBits(subtleAlg, cryptoKey, keylen));
}
async function wrap(alg, key, cek, p2c = 2048, p2s = crypto.getRandomValues(new Uint8Array(16))) {
    const derived = await deriveKey(p2s, alg, p2c, key);
    const encryptedKey = await _aeskw_js__WEBPACK_IMPORTED_MODULE_1__.wrap(alg.slice(-6), derived, cek);
    return { encryptedKey, p2c, p2s: (0,_util_base64url_js__WEBPACK_IMPORTED_MODULE_0__.encode)(p2s) };
}
async function unwrap(alg, key, encryptedKey, p2c, p2s) {
    const derived = await deriveKey(p2s, alg, p2c, key);
    return _aeskw_js__WEBPACK_IMPORTED_MODULE_1__.unwrap(alg.slice(-6), derived, encryptedKey);
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/rsaes.js":
/*!****************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/rsaes.js ***!
  \****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   decrypt: () => (/* binding */ decrypt),
/* harmony export */   encrypt: () => (/* binding */ encrypt)
/* harmony export */ });
/* harmony import */ var _crypto_key_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./crypto_key.js */ "./node_modules/jose/dist/webapi/lib/crypto_key.js");
/* harmony import */ var _check_key_length_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./check_key_length.js */ "./node_modules/jose/dist/webapi/lib/check_key_length.js");
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");



const subtleAlgorithm = (alg) => {
    switch (alg) {
        case 'RSA-OAEP':
        case 'RSA-OAEP-256':
        case 'RSA-OAEP-384':
        case 'RSA-OAEP-512':
            return 'RSA-OAEP';
        default:
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_2__.JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
    }
};
async function encrypt(alg, key, cek) {
    (0,_crypto_key_js__WEBPACK_IMPORTED_MODULE_0__.checkEncCryptoKey)(key, alg, 'encrypt');
    (0,_check_key_length_js__WEBPACK_IMPORTED_MODULE_1__["default"])(alg, key);
    return new Uint8Array(await crypto.subtle.encrypt(subtleAlgorithm(alg), key, cek));
}
async function decrypt(alg, key, encryptedKey) {
    (0,_crypto_key_js__WEBPACK_IMPORTED_MODULE_0__.checkEncCryptoKey)(key, alg, 'decrypt');
    (0,_check_key_length_js__WEBPACK_IMPORTED_MODULE_1__["default"])(alg, key);
    return new Uint8Array(await crypto.subtle.decrypt(subtleAlgorithm(alg), key, encryptedKey));
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/validate_algorithms.js":
/*!******************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/validate_algorithms.js ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((option, algorithms) => {
    if (algorithms !== undefined &&
        (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== 'string'))) {
        throw new TypeError(`"${option}" option must be an array of strings`);
    }
    if (!algorithms) {
        return undefined;
    }
    return new Set(algorithms);
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/lib/validate_crit.js":
/*!************************************************************!*\
  !*** ./node_modules/jose/dist/webapi/lib/validate_crit.js ***!
  \************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _util_errors_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/errors.js */ "./node_modules/jose/dist/webapi/util/errors.js");

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) => {
    if (joseHeader.crit !== undefined && protectedHeader?.crit === undefined) {
        throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
    }
    if (!protectedHeader || protectedHeader.crit === undefined) {
        return new Set();
    }
    if (!Array.isArray(protectedHeader.crit) ||
        protectedHeader.crit.length === 0 ||
        protectedHeader.crit.some((input) => typeof input !== 'string' || input.length === 0)) {
        throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
    }
    let recognized;
    if (recognizedOption !== undefined) {
        recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
    }
    else {
        recognized = recognizedDefault;
    }
    for (const parameter of protectedHeader.crit) {
        if (!recognized.has(parameter)) {
            throw new _util_errors_js__WEBPACK_IMPORTED_MODULE_0__.JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
        }
        if (joseHeader[parameter] === undefined) {
            throw new Err(`Extension Header Parameter "${parameter}" is missing`);
        }
        if (recognized.get(parameter) && protectedHeader[parameter] === undefined) {
            throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
        }
    }
    return new Set(protectedHeader.crit);
});


/***/ }),

/***/ "./node_modules/jose/dist/webapi/util/base64url.js":
/*!*********************************************************!*\
  !*** ./node_modules/jose/dist/webapi/util/base64url.js ***!
  \*********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   decode: () => (/* binding */ decode),
/* harmony export */   encode: () => (/* binding */ encode)
/* harmony export */ });
/* harmony import */ var _lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../lib/buffer_utils.js */ "./node_modules/jose/dist/webapi/lib/buffer_utils.js");
/* harmony import */ var _lib_base64_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/base64.js */ "./node_modules/jose/dist/webapi/lib/base64.js");


function decode(input) {
    if (Uint8Array.fromBase64) {
        return Uint8Array.fromBase64(typeof input === 'string' ? input : _lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.decoder.decode(input), {
            alphabet: 'base64url',
        });
    }
    let encoded = input;
    if (encoded instanceof Uint8Array) {
        encoded = _lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.decoder.decode(encoded);
    }
    encoded = encoded.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    try {
        return (0,_lib_base64_js__WEBPACK_IMPORTED_MODULE_1__.decodeBase64)(encoded);
    }
    catch {
        throw new TypeError('The input to be decoded is not correctly encoded.');
    }
}
function encode(input) {
    let unencoded = input;
    if (typeof unencoded === 'string') {
        unencoded = _lib_buffer_utils_js__WEBPACK_IMPORTED_MODULE_0__.encoder.encode(unencoded);
    }
    if (Uint8Array.prototype.toBase64) {
        return unencoded.toBase64({ alphabet: 'base64url', omitPadding: true });
    }
    return (0,_lib_base64_js__WEBPACK_IMPORTED_MODULE_1__.encodeBase64)(unencoded).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}


/***/ }),

/***/ "./node_modules/jose/dist/webapi/util/errors.js":
/*!******************************************************!*\
  !*** ./node_modules/jose/dist/webapi/util/errors.js ***!
  \******************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   JOSEAlgNotAllowed: () => (/* binding */ JOSEAlgNotAllowed),
/* harmony export */   JOSEError: () => (/* binding */ JOSEError),
/* harmony export */   JOSENotSupported: () => (/* binding */ JOSENotSupported),
/* harmony export */   JWEDecryptionFailed: () => (/* binding */ JWEDecryptionFailed),
/* harmony export */   JWEInvalid: () => (/* binding */ JWEInvalid),
/* harmony export */   JWKInvalid: () => (/* binding */ JWKInvalid),
/* harmony export */   JWKSInvalid: () => (/* binding */ JWKSInvalid),
/* harmony export */   JWKSMultipleMatchingKeys: () => (/* binding */ JWKSMultipleMatchingKeys),
/* harmony export */   JWKSNoMatchingKey: () => (/* binding */ JWKSNoMatchingKey),
/* harmony export */   JWKSTimeout: () => (/* binding */ JWKSTimeout),
/* harmony export */   JWSInvalid: () => (/* binding */ JWSInvalid),
/* harmony export */   JWSSignatureVerificationFailed: () => (/* binding */ JWSSignatureVerificationFailed),
/* harmony export */   JWTClaimValidationFailed: () => (/* binding */ JWTClaimValidationFailed),
/* harmony export */   JWTExpired: () => (/* binding */ JWTExpired),
/* harmony export */   JWTInvalid: () => (/* binding */ JWTInvalid)
/* harmony export */ });
class JOSEError extends Error {
    static code = 'ERR_JOSE_GENERIC';
    code = 'ERR_JOSE_GENERIC';
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        Error.captureStackTrace?.(this, this.constructor);
    }
}
class JWTClaimValidationFailed extends JOSEError {
    static code = 'ERR_JWT_CLAIM_VALIDATION_FAILED';
    code = 'ERR_JWT_CLAIM_VALIDATION_FAILED';
    claim;
    reason;
    payload;
    constructor(message, payload, claim = 'unspecified', reason = 'unspecified') {
        super(message, { cause: { claim, reason, payload } });
        this.claim = claim;
        this.reason = reason;
        this.payload = payload;
    }
}
class JWTExpired extends JOSEError {
    static code = 'ERR_JWT_EXPIRED';
    code = 'ERR_JWT_EXPIRED';
    claim;
    reason;
    payload;
    constructor(message, payload, claim = 'unspecified', reason = 'unspecified') {
        super(message, { cause: { claim, reason, payload } });
        this.claim = claim;
        this.reason = reason;
        this.payload = payload;
    }
}
class JOSEAlgNotAllowed extends JOSEError {
    static code = 'ERR_JOSE_ALG_NOT_ALLOWED';
    code = 'ERR_JOSE_ALG_NOT_ALLOWED';
}
class JOSENotSupported extends JOSEError {
    static code = 'ERR_JOSE_NOT_SUPPORTED';
    code = 'ERR_JOSE_NOT_SUPPORTED';
}
class JWEDecryptionFailed extends JOSEError {
    static code = 'ERR_JWE_DECRYPTION_FAILED';
    code = 'ERR_JWE_DECRYPTION_FAILED';
    constructor(message = 'decryption operation failed', options) {
        super(message, options);
    }
}
class JWEInvalid extends JOSEError {
    static code = 'ERR_JWE_INVALID';
    code = 'ERR_JWE_INVALID';
}
class JWSInvalid extends JOSEError {
    static code = 'ERR_JWS_INVALID';
    code = 'ERR_JWS_INVALID';
}
class JWTInvalid extends JOSEError {
    static code = 'ERR_JWT_INVALID';
    code = 'ERR_JWT_INVALID';
}
class JWKInvalid extends JOSEError {
    static code = 'ERR_JWK_INVALID';
    code = 'ERR_JWK_INVALID';
}
class JWKSInvalid extends JOSEError {
    static code = 'ERR_JWKS_INVALID';
    code = 'ERR_JWKS_INVALID';
}
class JWKSNoMatchingKey extends JOSEError {
    static code = 'ERR_JWKS_NO_MATCHING_KEY';
    code = 'ERR_JWKS_NO_MATCHING_KEY';
    constructor(message = 'no applicable key found in the JSON Web Key Set', options) {
        super(message, options);
    }
}
class JWKSMultipleMatchingKeys extends JOSEError {
    [Symbol.asyncIterator];
    static code = 'ERR_JWKS_MULTIPLE_MATCHING_KEYS';
    code = 'ERR_JWKS_MULTIPLE_MATCHING_KEYS';
    constructor(message = 'multiple matching keys found in the JSON Web Key Set', options) {
        super(message, options);
    }
}
class JWKSTimeout extends JOSEError {
    static code = 'ERR_JWKS_TIMEOUT';
    code = 'ERR_JWKS_TIMEOUT';
    constructor(message = 'request timed out', options) {
        super(message, options);
    }
}
class JWSSignatureVerificationFailed extends JOSEError {
    static code = 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED';
    code = 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED';
    constructor(message = 'signature verification failed', options) {
        super(message, options);
    }
}


/***/ }),

/***/ "./node_modules/keytar/build/Release/keytar.node":
/*!*******************************************************!*\
  !*** ./node_modules/keytar/build/Release/keytar.node ***!
  \*******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = require(__webpack_require__.ab + "build/Release/keytar.node")

/***/ }),

/***/ "./node_modules/keytar/lib/keytar.js":
/*!*******************************************!*\
  !*** ./node_modules/keytar/lib/keytar.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var keytar = __webpack_require__(/*! ../build/Release/keytar.node */ "./node_modules/keytar/build/Release/keytar.node")

function checkRequired(val, name) {
  if (!val || val.length <= 0) {
    throw new Error(name + ' is required.');
  }
}

module.exports = {
  getPassword: function (service, account) {
    checkRequired(service, 'Service')
    checkRequired(account, 'Account')

    return keytar.getPassword(service, account)
  },

  setPassword: function (service, account, password) {
    checkRequired(service, 'Service')
    checkRequired(account, 'Account')
    checkRequired(password, 'Password')

    return keytar.setPassword(service, account, password)
  },

  deletePassword: function (service, account) {
    checkRequired(service, 'Service')
    checkRequired(account, 'Account')

    return keytar.deletePassword(service, account)
  },

  findPassword: function (service) {
    checkRequired(service, 'Service')

    return keytar.findPassword(service)
  },

  findCredentials: function (service) {
    checkRequired(service, 'Service')

    return keytar.findCredentials(service)
  }
}


/***/ }),

/***/ "./node_modules/oauth4webapi/build/index.js":
/*!**************************************************!*\
  !*** ./node_modules/oauth4webapi/build/index.js ***!
  \**************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AUTHORIZATION_RESPONSE_ERROR: () => (/* binding */ AUTHORIZATION_RESPONSE_ERROR),
/* harmony export */   AuthorizationResponseError: () => (/* binding */ AuthorizationResponseError),
/* harmony export */   ClientSecretBasic: () => (/* binding */ ClientSecretBasic),
/* harmony export */   ClientSecretJwt: () => (/* binding */ ClientSecretJwt),
/* harmony export */   ClientSecretPost: () => (/* binding */ ClientSecretPost),
/* harmony export */   DPoP: () => (/* binding */ DPoP),
/* harmony export */   HTTP_REQUEST_FORBIDDEN: () => (/* binding */ HTTP_REQUEST_FORBIDDEN),
/* harmony export */   INVALID_REQUEST: () => (/* binding */ INVALID_REQUEST),
/* harmony export */   INVALID_RESPONSE: () => (/* binding */ INVALID_RESPONSE),
/* harmony export */   INVALID_SERVER_METADATA: () => (/* binding */ INVALID_SERVER_METADATA),
/* harmony export */   JSON_ATTRIBUTE_COMPARISON: () => (/* binding */ JSON_ATTRIBUTE_COMPARISON),
/* harmony export */   JWT_CLAIM_COMPARISON: () => (/* binding */ JWT_CLAIM_COMPARISON),
/* harmony export */   JWT_TIMESTAMP_CHECK: () => (/* binding */ JWT_TIMESTAMP_CHECK),
/* harmony export */   JWT_USERINFO_EXPECTED: () => (/* binding */ JWT_USERINFO_EXPECTED),
/* harmony export */   KEY_SELECTION: () => (/* binding */ KEY_SELECTION),
/* harmony export */   MISSING_SERVER_METADATA: () => (/* binding */ MISSING_SERVER_METADATA),
/* harmony export */   None: () => (/* binding */ None),
/* harmony export */   OperationProcessingError: () => (/* binding */ OperationProcessingError),
/* harmony export */   PARSE_ERROR: () => (/* binding */ PARSE_ERROR),
/* harmony export */   PrivateKeyJwt: () => (/* binding */ PrivateKeyJwt),
/* harmony export */   REQUEST_PROTOCOL_FORBIDDEN: () => (/* binding */ REQUEST_PROTOCOL_FORBIDDEN),
/* harmony export */   RESPONSE_BODY_ERROR: () => (/* binding */ RESPONSE_BODY_ERROR),
/* harmony export */   RESPONSE_IS_NOT_CONFORM: () => (/* binding */ RESPONSE_IS_NOT_CONFORM),
/* harmony export */   RESPONSE_IS_NOT_JSON: () => (/* binding */ RESPONSE_IS_NOT_JSON),
/* harmony export */   ResponseBodyError: () => (/* binding */ ResponseBodyError),
/* harmony export */   TlsClientAuth: () => (/* binding */ TlsClientAuth),
/* harmony export */   UNSUPPORTED_OPERATION: () => (/* binding */ UNSUPPORTED_OPERATION),
/* harmony export */   UnsupportedOperationError: () => (/* binding */ UnsupportedOperationError),
/* harmony export */   WWWAuthenticateChallengeError: () => (/* binding */ WWWAuthenticateChallengeError),
/* harmony export */   WWW_AUTHENTICATE_CHALLENGE: () => (/* binding */ WWW_AUTHENTICATE_CHALLENGE),
/* harmony export */   _expectedIssuer: () => (/* binding */ _expectedIssuer),
/* harmony export */   _nodiscoverycheck: () => (/* binding */ _nodiscoverycheck),
/* harmony export */   _nopkce: () => (/* binding */ _nopkce),
/* harmony export */   allowInsecureRequests: () => (/* binding */ allowInsecureRequests),
/* harmony export */   authorizationCodeGrantRequest: () => (/* binding */ authorizationCodeGrantRequest),
/* harmony export */   backchannelAuthenticationGrantRequest: () => (/* binding */ backchannelAuthenticationGrantRequest),
/* harmony export */   backchannelAuthenticationRequest: () => (/* binding */ backchannelAuthenticationRequest),
/* harmony export */   calculatePKCECodeChallenge: () => (/* binding */ calculatePKCECodeChallenge),
/* harmony export */   checkProtocol: () => (/* binding */ checkProtocol),
/* harmony export */   clientCredentialsGrantRequest: () => (/* binding */ clientCredentialsGrantRequest),
/* harmony export */   clockSkew: () => (/* binding */ clockSkew),
/* harmony export */   clockTolerance: () => (/* binding */ clockTolerance),
/* harmony export */   customFetch: () => (/* binding */ customFetch),
/* harmony export */   deviceAuthorizationRequest: () => (/* binding */ deviceAuthorizationRequest),
/* harmony export */   deviceCodeGrantRequest: () => (/* binding */ deviceCodeGrantRequest),
/* harmony export */   discoveryRequest: () => (/* binding */ discoveryRequest),
/* harmony export */   dynamicClientRegistrationRequest: () => (/* binding */ dynamicClientRegistrationRequest),
/* harmony export */   expectNoNonce: () => (/* binding */ expectNoNonce),
/* harmony export */   expectNoState: () => (/* binding */ expectNoState),
/* harmony export */   formPostResponse: () => (/* binding */ formPostResponse),
/* harmony export */   generateKeyPair: () => (/* binding */ generateKeyPair),
/* harmony export */   generateRandomCodeVerifier: () => (/* binding */ generateRandomCodeVerifier),
/* harmony export */   generateRandomNonce: () => (/* binding */ generateRandomNonce),
/* harmony export */   generateRandomState: () => (/* binding */ generateRandomState),
/* harmony export */   genericTokenEndpointRequest: () => (/* binding */ genericTokenEndpointRequest),
/* harmony export */   getContentType: () => (/* binding */ getContentType),
/* harmony export */   getValidatedIdTokenClaims: () => (/* binding */ getValidatedIdTokenClaims),
/* harmony export */   introspectionRequest: () => (/* binding */ introspectionRequest),
/* harmony export */   isDPoPNonceError: () => (/* binding */ isDPoPNonceError),
/* harmony export */   issueRequestObject: () => (/* binding */ issueRequestObject),
/* harmony export */   jweDecrypt: () => (/* binding */ jweDecrypt),
/* harmony export */   jwksCache: () => (/* binding */ jwksCache),
/* harmony export */   modifyAssertion: () => (/* binding */ modifyAssertion),
/* harmony export */   nopkce: () => (/* binding */ nopkce),
/* harmony export */   processAuthorizationCodeResponse: () => (/* binding */ processAuthorizationCodeResponse),
/* harmony export */   processBackchannelAuthenticationGrantResponse: () => (/* binding */ processBackchannelAuthenticationGrantResponse),
/* harmony export */   processBackchannelAuthenticationResponse: () => (/* binding */ processBackchannelAuthenticationResponse),
/* harmony export */   processClientCredentialsResponse: () => (/* binding */ processClientCredentialsResponse),
/* harmony export */   processDeviceAuthorizationResponse: () => (/* binding */ processDeviceAuthorizationResponse),
/* harmony export */   processDeviceCodeResponse: () => (/* binding */ processDeviceCodeResponse),
/* harmony export */   processDiscoveryResponse: () => (/* binding */ processDiscoveryResponse),
/* harmony export */   processDynamicClientRegistrationResponse: () => (/* binding */ processDynamicClientRegistrationResponse),
/* harmony export */   processGenericTokenEndpointResponse: () => (/* binding */ processGenericTokenEndpointResponse),
/* harmony export */   processIntrospectionResponse: () => (/* binding */ processIntrospectionResponse),
/* harmony export */   processPushedAuthorizationResponse: () => (/* binding */ processPushedAuthorizationResponse),
/* harmony export */   processRefreshTokenResponse: () => (/* binding */ processRefreshTokenResponse),
/* harmony export */   processResourceDiscoveryResponse: () => (/* binding */ processResourceDiscoveryResponse),
/* harmony export */   processRevocationResponse: () => (/* binding */ processRevocationResponse),
/* harmony export */   processUserInfoResponse: () => (/* binding */ processUserInfoResponse),
/* harmony export */   protectedResourceRequest: () => (/* binding */ protectedResourceRequest),
/* harmony export */   pushedAuthorizationRequest: () => (/* binding */ pushedAuthorizationRequest),
/* harmony export */   refreshTokenGrantRequest: () => (/* binding */ refreshTokenGrantRequest),
/* harmony export */   resolveEndpoint: () => (/* binding */ resolveEndpoint),
/* harmony export */   resourceDiscoveryRequest: () => (/* binding */ resourceDiscoveryRequest),
/* harmony export */   revocationRequest: () => (/* binding */ revocationRequest),
/* harmony export */   skipAuthTimeCheck: () => (/* binding */ skipAuthTimeCheck),
/* harmony export */   skipStateCheck: () => (/* binding */ skipStateCheck),
/* harmony export */   skipSubjectCheck: () => (/* binding */ skipSubjectCheck),
/* harmony export */   userInfoRequest: () => (/* binding */ userInfoRequest),
/* harmony export */   validateApplicationLevelSignature: () => (/* binding */ validateApplicationLevelSignature),
/* harmony export */   validateAuthResponse: () => (/* binding */ validateAuthResponse),
/* harmony export */   validateCodeIdTokenResponse: () => (/* binding */ validateCodeIdTokenResponse),
/* harmony export */   validateDetachedSignatureResponse: () => (/* binding */ validateDetachedSignatureResponse),
/* harmony export */   validateJwtAccessToken: () => (/* binding */ validateJwtAccessToken),
/* harmony export */   validateJwtAuthResponse: () => (/* binding */ validateJwtAuthResponse)
/* harmony export */ });
let USER_AGENT;
if (typeof navigator === 'undefined' || !navigator.userAgent?.startsWith?.('Mozilla/5.0 ')) {
    const NAME = 'oauth4webapi';
    const VERSION = 'v3.7.0';
    USER_AGENT = `${NAME}/${VERSION}`;
}
function looseInstanceOf(input, expected) {
    if (input == null) {
        return false;
    }
    try {
        return (input instanceof expected ||
            Object.getPrototypeOf(input)[Symbol.toStringTag] === expected.prototype[Symbol.toStringTag]);
    }
    catch {
        return false;
    }
}
const ERR_INVALID_ARG_VALUE = 'ERR_INVALID_ARG_VALUE';
const ERR_INVALID_ARG_TYPE = 'ERR_INVALID_ARG_TYPE';
function CodedTypeError(message, code, cause) {
    const err = new TypeError(message, { cause });
    Object.assign(err, { code });
    return err;
}
const allowInsecureRequests = Symbol();
const clockSkew = Symbol();
const clockTolerance = Symbol();
const customFetch = Symbol();
const modifyAssertion = Symbol();
const jweDecrypt = Symbol();
const jwksCache = Symbol();
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function buf(input) {
    if (typeof input === 'string') {
        return encoder.encode(input);
    }
    return decoder.decode(input);
}
let encodeBase64Url;
if (Uint8Array.prototype.toBase64) {
    encodeBase64Url = (input) => {
        if (input instanceof ArrayBuffer) {
            input = new Uint8Array(input);
        }
        return input.toBase64({ alphabet: 'base64url', omitPadding: true });
    };
}
else {
    const CHUNK_SIZE = 0x8000;
    encodeBase64Url = (input) => {
        if (input instanceof ArrayBuffer) {
            input = new Uint8Array(input);
        }
        const arr = [];
        for (let i = 0; i < input.byteLength; i += CHUNK_SIZE) {
            arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)));
        }
        return btoa(arr.join('')).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };
}
let decodeBase64Url;
if (Uint8Array.fromBase64) {
    decodeBase64Url = (input) => {
        try {
            return Uint8Array.fromBase64(input, { alphabet: 'base64url' });
        }
        catch (cause) {
            throw CodedTypeError('The input to be decoded is not correctly encoded.', ERR_INVALID_ARG_VALUE, cause);
        }
    };
}
else {
    decodeBase64Url = (input) => {
        try {
            const binary = atob(input.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''));
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        }
        catch (cause) {
            throw CodedTypeError('The input to be decoded is not correctly encoded.', ERR_INVALID_ARG_VALUE, cause);
        }
    };
}
function b64u(input) {
    if (typeof input === 'string') {
        return decodeBase64Url(input);
    }
    return encodeBase64Url(input);
}
class UnsupportedOperationError extends Error {
    code;
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        this.code = UNSUPPORTED_OPERATION;
        Error.captureStackTrace?.(this, this.constructor);
    }
}
class OperationProcessingError extends Error {
    code;
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        if (options?.code) {
            this.code = options?.code;
        }
        Error.captureStackTrace?.(this, this.constructor);
    }
}
function OPE(message, code, cause) {
    return new OperationProcessingError(message, { code, cause });
}
function assertCryptoKey(key, it) {
    if (!(key instanceof CryptoKey)) {
        throw CodedTypeError(`${it} must be a CryptoKey`, ERR_INVALID_ARG_TYPE);
    }
}
function assertPrivateKey(key, it) {
    assertCryptoKey(key, it);
    if (key.type !== 'private') {
        throw CodedTypeError(`${it} must be a private CryptoKey`, ERR_INVALID_ARG_VALUE);
    }
}
function assertPublicKey(key, it) {
    assertCryptoKey(key, it);
    if (key.type !== 'public') {
        throw CodedTypeError(`${it} must be a public CryptoKey`, ERR_INVALID_ARG_VALUE);
    }
}
function normalizeTyp(value) {
    return value.toLowerCase().replace(/^application\//, '');
}
function isJsonObject(input) {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        return false;
    }
    return true;
}
function prepareHeaders(input) {
    if (looseInstanceOf(input, Headers)) {
        input = Object.fromEntries(input.entries());
    }
    const headers = new Headers(input ?? {});
    if (USER_AGENT && !headers.has('user-agent')) {
        headers.set('user-agent', USER_AGENT);
    }
    if (headers.has('authorization')) {
        throw CodedTypeError('"options.headers" must not include the "authorization" header name', ERR_INVALID_ARG_VALUE);
    }
    return headers;
}
function signal(url, value) {
    if (value !== undefined) {
        if (typeof value === 'function') {
            value = value(url.href);
        }
        if (!(value instanceof AbortSignal)) {
            throw CodedTypeError('"options.signal" must return or be an instance of AbortSignal', ERR_INVALID_ARG_TYPE);
        }
        return value;
    }
    return undefined;
}
function replaceDoubleSlash(pathname) {
    if (pathname.includes('//')) {
        return pathname.replace('//', '/');
    }
    return pathname;
}
function prependWellKnown(url, wellKnown, allowTerminatingSlash = false) {
    if (url.pathname === '/') {
        url.pathname = wellKnown;
    }
    else {
        url.pathname = replaceDoubleSlash(`${wellKnown}/${allowTerminatingSlash ? url.pathname : url.pathname.replace(/(\/)$/, '')}`);
    }
    return url;
}
function appendWellKnown(url, wellKnown) {
    url.pathname = replaceDoubleSlash(`${url.pathname}/${wellKnown}`);
    return url;
}
async function performDiscovery(input, urlName, transform, options) {
    if (!(input instanceof URL)) {
        throw CodedTypeError(`"${urlName}" must be an instance of URL`, ERR_INVALID_ARG_TYPE);
    }
    checkProtocol(input, options?.[allowInsecureRequests] !== true);
    const url = transform(new URL(input.href));
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    return (options?.[customFetch] || fetch)(url.href, {
        body: undefined,
        headers: Object.fromEntries(headers.entries()),
        method: 'GET',
        redirect: 'manual',
        signal: signal(url, options?.signal),
    });
}
async function discoveryRequest(issuerIdentifier, options) {
    return performDiscovery(issuerIdentifier, 'issuerIdentifier', (url) => {
        switch (options?.algorithm) {
            case undefined:
            case 'oidc':
                appendWellKnown(url, '.well-known/openid-configuration');
                break;
            case 'oauth2':
                prependWellKnown(url, '.well-known/oauth-authorization-server');
                break;
            default:
                throw CodedTypeError('"options.algorithm" must be "oidc" (default), or "oauth2"', ERR_INVALID_ARG_VALUE);
        }
        return url;
    }, options);
}
function assertNumber(input, allow0, it, code, cause) {
    try {
        if (typeof input !== 'number' || !Number.isFinite(input)) {
            throw CodedTypeError(`${it} must be a number`, ERR_INVALID_ARG_TYPE, cause);
        }
        if (input > 0)
            return;
        if (allow0) {
            if (input !== 0) {
                throw CodedTypeError(`${it} must be a non-negative number`, ERR_INVALID_ARG_VALUE, cause);
            }
            return;
        }
        throw CodedTypeError(`${it} must be a positive number`, ERR_INVALID_ARG_VALUE, cause);
    }
    catch (err) {
        if (code) {
            throw OPE(err.message, code, cause);
        }
        throw err;
    }
}
function assertString(input, it, code, cause) {
    try {
        if (typeof input !== 'string') {
            throw CodedTypeError(`${it} must be a string`, ERR_INVALID_ARG_TYPE, cause);
        }
        if (input.length === 0) {
            throw CodedTypeError(`${it} must not be empty`, ERR_INVALID_ARG_VALUE, cause);
        }
    }
    catch (err) {
        if (code) {
            throw OPE(err.message, code, cause);
        }
        throw err;
    }
}
async function processDiscoveryResponse(expectedIssuerIdentifier, response) {
    const expected = expectedIssuerIdentifier;
    if (!(expected instanceof URL) && expected !== _nodiscoverycheck) {
        throw CodedTypeError('"expectedIssuerIdentifier" must be an instance of URL', ERR_INVALID_ARG_TYPE);
    }
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    if (response.status !== 200) {
        throw OPE('"response" is not a conform Authorization Server Metadata response (unexpected HTTP status code)', RESPONSE_IS_NOT_CONFORM, response);
    }
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.issuer, '"response" body "issuer" property', INVALID_RESPONSE, { body: json });
    if (expected !== _nodiscoverycheck && new URL(json.issuer).href !== expected.href) {
        throw OPE('"response" body "issuer" property does not match the expected value', JSON_ATTRIBUTE_COMPARISON, { expected: expected.href, body: json, attribute: 'issuer' });
    }
    return json;
}
function assertApplicationJson(response) {
    assertContentType(response, 'application/json');
}
function notJson(response, ...types) {
    let msg = '"response" content-type must be ';
    if (types.length > 2) {
        const last = types.pop();
        msg += `${types.join(', ')}, or ${last}`;
    }
    else if (types.length === 2) {
        msg += `${types[0]} or ${types[1]}`;
    }
    else {
        msg += types[0];
    }
    return OPE(msg, RESPONSE_IS_NOT_JSON, response);
}
function assertContentTypes(response, ...types) {
    if (!types.includes(getContentType(response))) {
        throw notJson(response, ...types);
    }
}
function assertContentType(response, contentType) {
    if (getContentType(response) !== contentType) {
        throw notJson(response, contentType);
    }
}
function randomBytes() {
    return b64u(crypto.getRandomValues(new Uint8Array(32)));
}
function generateRandomCodeVerifier() {
    return randomBytes();
}
function generateRandomState() {
    return randomBytes();
}
function generateRandomNonce() {
    return randomBytes();
}
async function calculatePKCECodeChallenge(codeVerifier) {
    assertString(codeVerifier, 'codeVerifier');
    return b64u(await crypto.subtle.digest('SHA-256', buf(codeVerifier)));
}
function getKeyAndKid(input) {
    if (input instanceof CryptoKey) {
        return { key: input };
    }
    if (!(input?.key instanceof CryptoKey)) {
        return {};
    }
    if (input.kid !== undefined) {
        assertString(input.kid, '"kid"');
    }
    return {
        key: input.key,
        kid: input.kid,
    };
}
function psAlg(key) {
    switch (key.algorithm.hash.name) {
        case 'SHA-256':
            return 'PS256';
        case 'SHA-384':
            return 'PS384';
        case 'SHA-512':
            return 'PS512';
        default:
            throw new UnsupportedOperationError('unsupported RsaHashedKeyAlgorithm hash name', {
                cause: key,
            });
    }
}
function rsAlg(key) {
    switch (key.algorithm.hash.name) {
        case 'SHA-256':
            return 'RS256';
        case 'SHA-384':
            return 'RS384';
        case 'SHA-512':
            return 'RS512';
        default:
            throw new UnsupportedOperationError('unsupported RsaHashedKeyAlgorithm hash name', {
                cause: key,
            });
    }
}
function esAlg(key) {
    switch (key.algorithm.namedCurve) {
        case 'P-256':
            return 'ES256';
        case 'P-384':
            return 'ES384';
        case 'P-521':
            return 'ES512';
        default:
            throw new UnsupportedOperationError('unsupported EcKeyAlgorithm namedCurve', { cause: key });
    }
}
function keyToJws(key) {
    switch (key.algorithm.name) {
        case 'RSA-PSS':
            return psAlg(key);
        case 'RSASSA-PKCS1-v1_5':
            return rsAlg(key);
        case 'ECDSA':
            return esAlg(key);
        case 'Ed25519':
        case 'EdDSA':
            return 'Ed25519';
        default:
            throw new UnsupportedOperationError('unsupported CryptoKey algorithm name', { cause: key });
    }
}
function getClockSkew(client) {
    const skew = client?.[clockSkew];
    return typeof skew === 'number' && Number.isFinite(skew) ? skew : 0;
}
function getClockTolerance(client) {
    const tolerance = client?.[clockTolerance];
    return typeof tolerance === 'number' && Number.isFinite(tolerance) && Math.sign(tolerance) !== -1
        ? tolerance
        : 30;
}
function epochTime() {
    return Math.floor(Date.now() / 1000);
}
function assertAs(as) {
    if (typeof as !== 'object' || as === null) {
        throw CodedTypeError('"as" must be an object', ERR_INVALID_ARG_TYPE);
    }
    assertString(as.issuer, '"as.issuer"');
}
function assertClient(client) {
    if (typeof client !== 'object' || client === null) {
        throw CodedTypeError('"client" must be an object', ERR_INVALID_ARG_TYPE);
    }
    assertString(client.client_id, '"client.client_id"');
}
function formUrlEncode(token) {
    return encodeURIComponent(token).replace(/(?:[-_.!~*'()]|%20)/g, (substring) => {
        switch (substring) {
            case '-':
            case '_':
            case '.':
            case '!':
            case '~':
            case '*':
            case "'":
            case '(':
            case ')':
                return `%${substring.charCodeAt(0).toString(16).toUpperCase()}`;
            case '%20':
                return '+';
            default:
                throw new Error();
        }
    });
}
function ClientSecretPost(clientSecret) {
    assertString(clientSecret, '"clientSecret"');
    return (_as, client, body, _headers) => {
        body.set('client_id', client.client_id);
        body.set('client_secret', clientSecret);
    };
}
function ClientSecretBasic(clientSecret) {
    assertString(clientSecret, '"clientSecret"');
    return (_as, client, _body, headers) => {
        const username = formUrlEncode(client.client_id);
        const password = formUrlEncode(clientSecret);
        const credentials = btoa(`${username}:${password}`);
        headers.set('authorization', `Basic ${credentials}`);
    };
}
function clientAssertionPayload(as, client) {
    const now = epochTime() + getClockSkew(client);
    return {
        jti: randomBytes(),
        aud: as.issuer,
        exp: now + 60,
        iat: now,
        nbf: now,
        iss: client.client_id,
        sub: client.client_id,
    };
}
function PrivateKeyJwt(clientPrivateKey, options) {
    const { key, kid } = getKeyAndKid(clientPrivateKey);
    assertPrivateKey(key, '"clientPrivateKey.key"');
    return async (as, client, body, _headers) => {
        const header = { alg: keyToJws(key), kid };
        const payload = clientAssertionPayload(as, client);
        options?.[modifyAssertion]?.(header, payload);
        body.set('client_id', client.client_id);
        body.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
        body.set('client_assertion', await signJwt(header, payload, key));
    };
}
function ClientSecretJwt(clientSecret, options) {
    assertString(clientSecret, '"clientSecret"');
    const modify = options?.[modifyAssertion];
    let key;
    return async (as, client, body, _headers) => {
        key ||= await crypto.subtle.importKey('raw', buf(clientSecret), { hash: 'SHA-256', name: 'HMAC' }, false, ['sign']);
        const header = { alg: 'HS256' };
        const payload = clientAssertionPayload(as, client);
        modify?.(header, payload);
        const data = `${b64u(buf(JSON.stringify(header)))}.${b64u(buf(JSON.stringify(payload)))}`;
        const hmac = await crypto.subtle.sign(key.algorithm, key, buf(data));
        body.set('client_id', client.client_id);
        body.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
        body.set('client_assertion', `${data}.${b64u(new Uint8Array(hmac))}`);
    };
}
function None() {
    return (_as, client, body, _headers) => {
        body.set('client_id', client.client_id);
    };
}
function TlsClientAuth() {
    return None();
}
async function signJwt(header, payload, key) {
    if (!key.usages.includes('sign')) {
        throw CodedTypeError('CryptoKey instances used for signing assertions must include "sign" in their "usages"', ERR_INVALID_ARG_VALUE);
    }
    const input = `${b64u(buf(JSON.stringify(header)))}.${b64u(buf(JSON.stringify(payload)))}`;
    const signature = b64u(await crypto.subtle.sign(keyToSubtle(key), key, buf(input)));
    return `${input}.${signature}`;
}
async function issueRequestObject(as, client, parameters, privateKey, options) {
    assertAs(as);
    assertClient(client);
    parameters = new URLSearchParams(parameters);
    const { key, kid } = getKeyAndKid(privateKey);
    assertPrivateKey(key, '"privateKey.key"');
    parameters.set('client_id', client.client_id);
    const now = epochTime() + getClockSkew(client);
    const claims = {
        ...Object.fromEntries(parameters.entries()),
        jti: randomBytes(),
        aud: as.issuer,
        exp: now + 60,
        iat: now,
        nbf: now,
        iss: client.client_id,
    };
    let resource;
    if (parameters.has('resource') &&
        (resource = parameters.getAll('resource')) &&
        resource.length > 1) {
        claims.resource = resource;
    }
    {
        let value = parameters.get('max_age');
        if (value !== null) {
            claims.max_age = parseInt(value, 10);
            assertNumber(claims.max_age, true, '"max_age" parameter');
        }
    }
    {
        let value = parameters.get('claims');
        if (value !== null) {
            try {
                claims.claims = JSON.parse(value);
            }
            catch (cause) {
                throw OPE('failed to parse the "claims" parameter as JSON', PARSE_ERROR, cause);
            }
            if (!isJsonObject(claims.claims)) {
                throw CodedTypeError('"claims" parameter must be a JSON with a top level object', ERR_INVALID_ARG_VALUE);
            }
        }
    }
    {
        let value = parameters.get('authorization_details');
        if (value !== null) {
            try {
                claims.authorization_details = JSON.parse(value);
            }
            catch (cause) {
                throw OPE('failed to parse the "authorization_details" parameter as JSON', PARSE_ERROR, cause);
            }
            if (!Array.isArray(claims.authorization_details)) {
                throw CodedTypeError('"authorization_details" parameter must be a JSON with a top level array', ERR_INVALID_ARG_VALUE);
            }
        }
    }
    const header = {
        alg: keyToJws(key),
        typ: 'oauth-authz-req+jwt',
        kid,
    };
    options?.[modifyAssertion]?.(header, claims);
    return signJwt(header, claims, key);
}
let jwkCache;
async function getSetPublicJwkCache(key) {
    const { kty, e, n, x, y, crv } = await crypto.subtle.exportKey('jwk', key);
    const jwk = { kty, e, n, x, y, crv };
    jwkCache.set(key, jwk);
    return jwk;
}
async function publicJwk(key) {
    jwkCache ||= new WeakMap();
    return jwkCache.get(key) || getSetPublicJwkCache(key);
}
const URLParse = URL.parse
    ?
        (url, base) => URL.parse(url, base)
    : (url, base) => {
        try {
            return new URL(url, base);
        }
        catch {
            return null;
        }
    };
function checkProtocol(url, enforceHttps) {
    if (enforceHttps && url.protocol !== 'https:') {
        throw OPE('only requests to HTTPS are allowed', HTTP_REQUEST_FORBIDDEN, url);
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw OPE('only HTTP and HTTPS requests are allowed', REQUEST_PROTOCOL_FORBIDDEN, url);
    }
}
function validateEndpoint(value, endpoint, useMtlsAlias, enforceHttps) {
    let url;
    if (typeof value !== 'string' || !(url = URLParse(value))) {
        throw OPE(`authorization server metadata does not contain a valid ${useMtlsAlias ? `"as.mtls_endpoint_aliases.${endpoint}"` : `"as.${endpoint}"`}`, value === undefined ? MISSING_SERVER_METADATA : INVALID_SERVER_METADATA, { attribute: useMtlsAlias ? `mtls_endpoint_aliases.${endpoint}` : endpoint });
    }
    checkProtocol(url, enforceHttps);
    return url;
}
function resolveEndpoint(as, endpoint, useMtlsAlias, enforceHttps) {
    if (useMtlsAlias && as.mtls_endpoint_aliases && endpoint in as.mtls_endpoint_aliases) {
        return validateEndpoint(as.mtls_endpoint_aliases[endpoint], endpoint, useMtlsAlias, enforceHttps);
    }
    return validateEndpoint(as[endpoint], endpoint, useMtlsAlias, enforceHttps);
}
async function pushedAuthorizationRequest(as, client, clientAuthentication, parameters, options) {
    assertAs(as);
    assertClient(client);
    const url = resolveEndpoint(as, 'pushed_authorization_request_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const body = new URLSearchParams(parameters);
    body.set('client_id', client.client_id);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    if (options?.DPoP !== undefined) {
        assertDPoP(options.DPoP);
        await options.DPoP.addProof(url, headers, 'POST');
    }
    const response = await authenticatedRequest(as, client, clientAuthentication, url, body, headers, options);
    options?.DPoP?.cacheNonce(response);
    return response;
}
class DPoPHandler {
    #header;
    #privateKey;
    #publicKey;
    #clockSkew;
    #modifyAssertion;
    #map;
    #jkt;
    constructor(client, keyPair, options) {
        assertPrivateKey(keyPair?.privateKey, '"DPoP.privateKey"');
        assertPublicKey(keyPair?.publicKey, '"DPoP.publicKey"');
        if (!keyPair.publicKey.extractable) {
            throw CodedTypeError('"DPoP.publicKey.extractable" must be true', ERR_INVALID_ARG_VALUE);
        }
        this.#modifyAssertion = options?.[modifyAssertion];
        this.#clockSkew = getClockSkew(client);
        this.#privateKey = keyPair.privateKey;
        this.#publicKey = keyPair.publicKey;
        branded.add(this);
    }
    #get(key) {
        this.#map ||= new Map();
        let item = this.#map.get(key);
        if (item) {
            this.#map.delete(key);
            this.#map.set(key, item);
        }
        return item;
    }
    #set(key, val) {
        this.#map ||= new Map();
        this.#map.delete(key);
        if (this.#map.size === 100) {
            this.#map.delete(this.#map.keys().next().value);
        }
        this.#map.set(key, val);
    }
    async calculateThumbprint() {
        if (!this.#jkt) {
            const jwk = await crypto.subtle.exportKey('jwk', this.#publicKey);
            let components;
            switch (jwk.kty) {
                case 'EC':
                    components = { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y };
                    break;
                case 'OKP':
                    components = { crv: jwk.crv, kty: jwk.kty, x: jwk.x };
                    break;
                case 'RSA':
                    components = { e: jwk.e, kty: jwk.kty, n: jwk.n };
                    break;
                default:
                    throw new UnsupportedOperationError('unsupported JWK', { cause: { jwk } });
            }
            this.#jkt ||= b64u(await crypto.subtle.digest({ name: 'SHA-256' }, buf(JSON.stringify(components))));
        }
        return this.#jkt;
    }
    async addProof(url, headers, htm, accessToken) {
        this.#header ||= {
            alg: keyToJws(this.#privateKey),
            typ: 'dpop+jwt',
            jwk: await publicJwk(this.#publicKey),
        };
        const nonce = this.#get(url.origin);
        const now = epochTime() + this.#clockSkew;
        const payload = {
            iat: now,
            jti: randomBytes(),
            htm,
            nonce,
            htu: `${url.origin}${url.pathname}`,
            ath: accessToken ? b64u(await crypto.subtle.digest('SHA-256', buf(accessToken))) : undefined,
        };
        this.#modifyAssertion?.(this.#header, payload);
        headers.set('dpop', await signJwt(this.#header, payload, this.#privateKey));
    }
    cacheNonce(response) {
        try {
            const nonce = response.headers.get('dpop-nonce');
            if (nonce) {
                this.#set(new URL(response.url).origin, nonce);
            }
        }
        catch { }
    }
}
function isDPoPNonceError(err) {
    if (err instanceof WWWAuthenticateChallengeError) {
        const { 0: challenge, length } = err.cause;
        return (length === 1 && challenge.scheme === 'dpop' && challenge.parameters.error === 'use_dpop_nonce');
    }
    if (err instanceof ResponseBodyError) {
        return err.error === 'use_dpop_nonce';
    }
    return false;
}
function DPoP(client, keyPair, options) {
    return new DPoPHandler(client, keyPair, options);
}
class ResponseBodyError extends Error {
    cause;
    code;
    error;
    status;
    error_description;
    response;
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        this.code = RESPONSE_BODY_ERROR;
        this.cause = options.cause;
        this.error = options.cause.error;
        this.status = options.response.status;
        this.error_description = options.cause.error_description;
        Object.defineProperty(this, 'response', { enumerable: false, value: options.response });
        Error.captureStackTrace?.(this, this.constructor);
    }
}
class AuthorizationResponseError extends Error {
    cause;
    code;
    error;
    error_description;
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        this.code = AUTHORIZATION_RESPONSE_ERROR;
        this.cause = options.cause;
        this.error = options.cause.get('error');
        this.error_description = options.cause.get('error_description') ?? undefined;
        Error.captureStackTrace?.(this, this.constructor);
    }
}
class WWWAuthenticateChallengeError extends Error {
    cause;
    code;
    response;
    status;
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        this.code = WWW_AUTHENTICATE_CHALLENGE;
        this.cause = options.cause;
        this.status = options.response.status;
        this.response = options.response;
        Object.defineProperty(this, 'response', { enumerable: false });
        Error.captureStackTrace?.(this, this.constructor);
    }
}
const tokenMatch = "[a-zA-Z0-9!#$%&\\'\\*\\+\\-\\.\\^_`\\|~]+";
const token68Match = '[a-zA-Z0-9\\-\\._\\~\\+\\/]+[=]{0,2}';
const quotedMatch = '"((?:[^"\\\\]|\\\\.)*)"';
const quotedParamMatcher = '(' + tokenMatch + ')\\s*=\\s*' + quotedMatch;
const paramMatcher = '(' + tokenMatch + ')\\s*=\\s*(' + tokenMatch + ')';
const schemeRE = new RegExp('^[,\\s]*(' + tokenMatch + ')\\s(.*)');
const quotedParamRE = new RegExp('^[,\\s]*' + quotedParamMatcher + '[,\\s]*(.*)');
const unquotedParamRE = new RegExp('^[,\\s]*' + paramMatcher + '[,\\s]*(.*)');
const token68ParamRE = new RegExp('^(' + token68Match + ')(?:$|[,\\s])(.*)');
function parseWwwAuthenticateChallenges(response) {
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    const header = response.headers.get('www-authenticate');
    if (header === null) {
        return undefined;
    }
    const challenges = [];
    let rest = header;
    while (rest) {
        let match = rest.match(schemeRE);
        const scheme = match?.['1'].toLowerCase();
        rest = match?.['2'];
        if (!scheme) {
            return undefined;
        }
        const parameters = {};
        let token68;
        while (rest) {
            let key;
            let value;
            if ((match = rest.match(quotedParamRE))) {
                ;
                [, key, value, rest] = match;
                if (value.includes('\\')) {
                    try {
                        value = JSON.parse(`"${value}"`);
                    }
                    catch { }
                }
                parameters[key.toLowerCase()] = value;
                continue;
            }
            if ((match = rest.match(unquotedParamRE))) {
                ;
                [, key, value, rest] = match;
                parameters[key.toLowerCase()] = value;
                continue;
            }
            if ((match = rest.match(token68ParamRE))) {
                if (Object.keys(parameters).length) {
                    break;
                }
                ;
                [, token68, rest] = match;
                break;
            }
            return undefined;
        }
        const challenge = { scheme, parameters };
        if (token68) {
            challenge.token68 = token68;
        }
        challenges.push(challenge);
    }
    if (!challenges.length) {
        return undefined;
    }
    return challenges;
}
async function processPushedAuthorizationResponse(as, client, response) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 201, 'Pushed Authorization Request Endpoint');
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.request_uri, '"response" body "request_uri" property', INVALID_RESPONSE, {
        body: json,
    });
    let expiresIn = typeof json.expires_in !== 'number' ? parseFloat(json.expires_in) : json.expires_in;
    assertNumber(expiresIn, true, '"response" body "expires_in" property', INVALID_RESPONSE, {
        body: json,
    });
    json.expires_in = expiresIn;
    return json;
}
async function parseOAuthResponseErrorBody(response) {
    if (response.status > 399 && response.status < 500) {
        assertReadableResponse(response);
        assertApplicationJson(response);
        try {
            const json = await response.clone().json();
            if (isJsonObject(json) && typeof json.error === 'string' && json.error.length) {
                return json;
            }
        }
        catch { }
    }
    return undefined;
}
async function checkOAuthBodyError(response, expected, label) {
    if (response.status !== expected) {
        checkAuthenticationChallenges(response);
        let err;
        if ((err = await parseOAuthResponseErrorBody(response))) {
            await response.body?.cancel();
            throw new ResponseBodyError('server responded with an error in the response body', {
                cause: err,
                response,
            });
        }
        throw OPE(`"response" is not a conform ${label} response (unexpected HTTP status code)`, RESPONSE_IS_NOT_CONFORM, response);
    }
}
function assertDPoP(option) {
    if (!branded.has(option)) {
        throw CodedTypeError('"options.DPoP" is not a valid DPoPHandle', ERR_INVALID_ARG_VALUE);
    }
}
async function resourceRequest(accessToken, method, url, headers, body, options) {
    assertString(accessToken, '"accessToken"');
    if (!(url instanceof URL)) {
        throw CodedTypeError('"url" must be an instance of URL', ERR_INVALID_ARG_TYPE);
    }
    checkProtocol(url, options?.[allowInsecureRequests] !== true);
    headers = prepareHeaders(headers);
    if (options?.DPoP) {
        assertDPoP(options.DPoP);
        await options.DPoP.addProof(url, headers, method.toUpperCase(), accessToken);
    }
    headers.set('authorization', `${headers.has('dpop') ? 'DPoP' : 'Bearer'} ${accessToken}`);
    const response = await (options?.[customFetch] || fetch)(url.href, {
        body,
        headers: Object.fromEntries(headers.entries()),
        method,
        redirect: 'manual',
        signal: signal(url, options?.signal),
    });
    options?.DPoP?.cacheNonce(response);
    return response;
}
async function protectedResourceRequest(accessToken, method, url, headers, body, options) {
    const response = await resourceRequest(accessToken, method, url, headers, body, options);
    checkAuthenticationChallenges(response);
    return response;
}
async function userInfoRequest(as, client, accessToken, options) {
    assertAs(as);
    assertClient(client);
    const url = resolveEndpoint(as, 'userinfo_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const headers = prepareHeaders(options?.headers);
    if (client.userinfo_signed_response_alg) {
        headers.set('accept', 'application/jwt');
    }
    else {
        headers.set('accept', 'application/json');
        headers.append('accept', 'application/jwt');
    }
    return resourceRequest(accessToken, 'GET', url, headers, null, {
        ...options,
        [clockSkew]: getClockSkew(client),
    });
}
let jwksMap;
function setJwksCache(as, jwks, uat, cache) {
    jwksMap ||= new WeakMap();
    jwksMap.set(as, {
        jwks,
        uat,
        get age() {
            return epochTime() - this.uat;
        },
    });
    if (cache) {
        Object.assign(cache, { jwks: structuredClone(jwks), uat });
    }
}
function isFreshJwksCache(input) {
    if (typeof input !== 'object' || input === null) {
        return false;
    }
    if (!('uat' in input) || typeof input.uat !== 'number' || epochTime() - input.uat >= 300) {
        return false;
    }
    if (!('jwks' in input) ||
        !isJsonObject(input.jwks) ||
        !Array.isArray(input.jwks.keys) ||
        !Array.prototype.every.call(input.jwks.keys, isJsonObject)) {
        return false;
    }
    return true;
}
function clearJwksCache(as, cache) {
    jwksMap?.delete(as);
    delete cache?.jwks;
    delete cache?.uat;
}
async function getPublicSigKeyFromIssuerJwksUri(as, options, header) {
    const { alg, kid } = header;
    checkSupportedJwsAlg(header);
    if (!jwksMap?.has(as) && isFreshJwksCache(options?.[jwksCache])) {
        setJwksCache(as, options?.[jwksCache].jwks, options?.[jwksCache].uat);
    }
    let jwks;
    let age;
    if (jwksMap?.has(as)) {
        ;
        ({ jwks, age } = jwksMap.get(as));
        if (age >= 300) {
            clearJwksCache(as, options?.[jwksCache]);
            return getPublicSigKeyFromIssuerJwksUri(as, options, header);
        }
    }
    else {
        jwks = await jwksRequest(as, options).then(processJwksResponse);
        age = 0;
        setJwksCache(as, jwks, epochTime(), options?.[jwksCache]);
    }
    let kty;
    switch (alg.slice(0, 2)) {
        case 'RS':
        case 'PS':
            kty = 'RSA';
            break;
        case 'ES':
            kty = 'EC';
            break;
        case 'Ed':
            kty = 'OKP';
            break;
        default:
            throw new UnsupportedOperationError('unsupported JWS algorithm', { cause: { alg } });
    }
    const candidates = jwks.keys.filter((jwk) => {
        if (jwk.kty !== kty) {
            return false;
        }
        if (kid !== undefined && kid !== jwk.kid) {
            return false;
        }
        if (jwk.alg !== undefined && alg !== jwk.alg) {
            return false;
        }
        if (jwk.use !== undefined && jwk.use !== 'sig') {
            return false;
        }
        if (jwk.key_ops?.includes('verify') === false) {
            return false;
        }
        switch (true) {
            case alg === 'ES256' && jwk.crv !== 'P-256':
            case alg === 'ES384' && jwk.crv !== 'P-384':
            case alg === 'ES512' && jwk.crv !== 'P-521':
            case alg === 'Ed25519' && jwk.crv !== 'Ed25519':
            case alg === 'EdDSA' && jwk.crv !== 'Ed25519':
                return false;
        }
        return true;
    });
    const { 0: jwk, length } = candidates;
    if (!length) {
        if (age >= 60) {
            clearJwksCache(as, options?.[jwksCache]);
            return getPublicSigKeyFromIssuerJwksUri(as, options, header);
        }
        throw OPE('error when selecting a JWT verification key, no applicable keys found', KEY_SELECTION, { header, candidates, jwks_uri: new URL(as.jwks_uri) });
    }
    if (length !== 1) {
        throw OPE('error when selecting a JWT verification key, multiple applicable keys found, a "kid" JWT Header Parameter is required', KEY_SELECTION, { header, candidates, jwks_uri: new URL(as.jwks_uri) });
    }
    return importJwk(alg, jwk);
}
const skipSubjectCheck = Symbol();
function getContentType(input) {
    return input.headers.get('content-type')?.split(';')[0];
}
async function processUserInfoResponse(as, client, expectedSubject, response, options) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    checkAuthenticationChallenges(response);
    if (response.status !== 200) {
        throw OPE('"response" is not a conform UserInfo Endpoint response (unexpected HTTP status code)', RESPONSE_IS_NOT_CONFORM, response);
    }
    assertReadableResponse(response);
    let json;
    if (getContentType(response) === 'application/jwt') {
        const { claims, jwt } = await validateJwt(await response.text(), checkSigningAlgorithm.bind(undefined, client.userinfo_signed_response_alg, as.userinfo_signing_alg_values_supported, undefined), getClockSkew(client), getClockTolerance(client), options?.[jweDecrypt])
            .then(validateOptionalAudience.bind(undefined, client.client_id))
            .then(validateOptionalIssuer.bind(undefined, as));
        jwtRefs.set(response, jwt);
        json = claims;
    }
    else {
        if (client.userinfo_signed_response_alg) {
            throw OPE('JWT UserInfo Response expected', JWT_USERINFO_EXPECTED, response);
        }
        json = await getResponseJsonBody(response);
    }
    assertString(json.sub, '"response" body "sub" property', INVALID_RESPONSE, { body: json });
    switch (expectedSubject) {
        case skipSubjectCheck:
            break;
        default:
            assertString(expectedSubject, '"expectedSubject"');
            if (json.sub !== expectedSubject) {
                throw OPE('unexpected "response" body "sub" property value', JSON_ATTRIBUTE_COMPARISON, {
                    expected: expectedSubject,
                    body: json,
                    attribute: 'sub',
                });
            }
    }
    return json;
}
async function authenticatedRequest(as, client, clientAuthentication, url, body, headers, options) {
    await clientAuthentication(as, client, body, headers);
    headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
    return (options?.[customFetch] || fetch)(url.href, {
        body,
        headers: Object.fromEntries(headers.entries()),
        method: 'POST',
        redirect: 'manual',
        signal: signal(url, options?.signal),
    });
}
async function tokenEndpointRequest(as, client, clientAuthentication, grantType, parameters, options) {
    const url = resolveEndpoint(as, 'token_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    parameters.set('grant_type', grantType);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    if (options?.DPoP !== undefined) {
        assertDPoP(options.DPoP);
        await options.DPoP.addProof(url, headers, 'POST');
    }
    const response = await authenticatedRequest(as, client, clientAuthentication, url, parameters, headers, options);
    options?.DPoP?.cacheNonce(response);
    return response;
}
async function refreshTokenGrantRequest(as, client, clientAuthentication, refreshToken, options) {
    assertAs(as);
    assertClient(client);
    assertString(refreshToken, '"refreshToken"');
    const parameters = new URLSearchParams(options?.additionalParameters);
    parameters.set('refresh_token', refreshToken);
    return tokenEndpointRequest(as, client, clientAuthentication, 'refresh_token', parameters, options);
}
const idTokenClaims = new WeakMap();
const jwtRefs = new WeakMap();
function getValidatedIdTokenClaims(ref) {
    if (!ref.id_token) {
        return undefined;
    }
    const claims = idTokenClaims.get(ref);
    if (!claims) {
        throw CodedTypeError('"ref" was already garbage collected or did not resolve from the proper sources', ERR_INVALID_ARG_VALUE);
    }
    return claims;
}
async function validateApplicationLevelSignature(as, ref, options) {
    assertAs(as);
    if (!jwtRefs.has(ref)) {
        throw CodedTypeError('"ref" does not contain a processed JWT Response to verify the signature of', ERR_INVALID_ARG_VALUE);
    }
    const { 0: protectedHeader, 1: payload, 2: encodedSignature } = jwtRefs.get(ref).split('.');
    const header = JSON.parse(buf(b64u(protectedHeader)));
    if (header.alg.startsWith('HS')) {
        throw new UnsupportedOperationError('unsupported JWS algorithm', { cause: { alg: header.alg } });
    }
    let key;
    key = await getPublicSigKeyFromIssuerJwksUri(as, options, header);
    await validateJwsSignature(protectedHeader, payload, key, b64u(encodedSignature));
}
async function processGenericAccessTokenResponse(as, client, response, additionalRequiredIdTokenClaims, decryptFn, recognizedTokenTypes) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 200, 'Token Endpoint');
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.access_token, '"response" body "access_token" property', INVALID_RESPONSE, {
        body: json,
    });
    assertString(json.token_type, '"response" body "token_type" property', INVALID_RESPONSE, {
        body: json,
    });
    json.token_type = json.token_type.toLowerCase();
    if (json.expires_in !== undefined) {
        let expiresIn = typeof json.expires_in !== 'number' ? parseFloat(json.expires_in) : json.expires_in;
        assertNumber(expiresIn, true, '"response" body "expires_in" property', INVALID_RESPONSE, {
            body: json,
        });
        json.expires_in = expiresIn;
    }
    if (json.refresh_token !== undefined) {
        assertString(json.refresh_token, '"response" body "refresh_token" property', INVALID_RESPONSE, {
            body: json,
        });
    }
    if (json.scope !== undefined && typeof json.scope !== 'string') {
        throw OPE('"response" body "scope" property must be a string', INVALID_RESPONSE, { body: json });
    }
    if (json.id_token !== undefined) {
        assertString(json.id_token, '"response" body "id_token" property', INVALID_RESPONSE, {
            body: json,
        });
        const requiredClaims = ['aud', 'exp', 'iat', 'iss', 'sub'];
        if (client.require_auth_time === true) {
            requiredClaims.push('auth_time');
        }
        if (client.default_max_age !== undefined) {
            assertNumber(client.default_max_age, true, '"client.default_max_age"');
            requiredClaims.push('auth_time');
        }
        if (additionalRequiredIdTokenClaims?.length) {
            requiredClaims.push(...additionalRequiredIdTokenClaims);
        }
        const { claims, jwt } = await validateJwt(json.id_token, checkSigningAlgorithm.bind(undefined, client.id_token_signed_response_alg, as.id_token_signing_alg_values_supported, 'RS256'), getClockSkew(client), getClockTolerance(client), decryptFn)
            .then(validatePresence.bind(undefined, requiredClaims))
            .then(validateIssuer.bind(undefined, as))
            .then(validateAudience.bind(undefined, client.client_id));
        if (Array.isArray(claims.aud) && claims.aud.length !== 1) {
            if (claims.azp === undefined) {
                throw OPE('ID Token "aud" (audience) claim includes additional untrusted audiences', JWT_CLAIM_COMPARISON, { claims, claim: 'aud' });
            }
            if (claims.azp !== client.client_id) {
                throw OPE('unexpected ID Token "azp" (authorized party) claim value', JWT_CLAIM_COMPARISON, { expected: client.client_id, claims, claim: 'azp' });
            }
        }
        if (claims.auth_time !== undefined) {
            assertNumber(claims.auth_time, true, 'ID Token "auth_time" (authentication time)', INVALID_RESPONSE, { claims });
        }
        jwtRefs.set(response, jwt);
        idTokenClaims.set(json, claims);
    }
    if (recognizedTokenTypes?.[json.token_type] !== undefined) {
        recognizedTokenTypes[json.token_type](response, json);
    }
    else if (json.token_type !== 'dpop' && json.token_type !== 'bearer') {
        throw new UnsupportedOperationError('unsupported `token_type` value', { cause: { body: json } });
    }
    return json;
}
function checkAuthenticationChallenges(response) {
    let challenges;
    if ((challenges = parseWwwAuthenticateChallenges(response))) {
        throw new WWWAuthenticateChallengeError('server responded with a challenge in the WWW-Authenticate HTTP Header', { cause: challenges, response });
    }
}
async function processRefreshTokenResponse(as, client, response, options) {
    return processGenericAccessTokenResponse(as, client, response, undefined, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
function validateOptionalAudience(expected, result) {
    if (result.claims.aud !== undefined) {
        return validateAudience(expected, result);
    }
    return result;
}
function validateAudience(expected, result) {
    if (Array.isArray(result.claims.aud)) {
        if (!result.claims.aud.includes(expected)) {
            throw OPE('unexpected JWT "aud" (audience) claim value', JWT_CLAIM_COMPARISON, {
                expected,
                claims: result.claims,
                claim: 'aud',
            });
        }
    }
    else if (result.claims.aud !== expected) {
        throw OPE('unexpected JWT "aud" (audience) claim value', JWT_CLAIM_COMPARISON, {
            expected,
            claims: result.claims,
            claim: 'aud',
        });
    }
    return result;
}
function validateOptionalIssuer(as, result) {
    if (result.claims.iss !== undefined) {
        return validateIssuer(as, result);
    }
    return result;
}
function validateIssuer(as, result) {
    const expected = as[_expectedIssuer]?.(result) ?? as.issuer;
    if (result.claims.iss !== expected) {
        throw OPE('unexpected JWT "iss" (issuer) claim value', JWT_CLAIM_COMPARISON, {
            expected,
            claims: result.claims,
            claim: 'iss',
        });
    }
    return result;
}
const branded = new WeakSet();
function brand(searchParams) {
    branded.add(searchParams);
    return searchParams;
}
const nopkce = Symbol();
async function authorizationCodeGrantRequest(as, client, clientAuthentication, callbackParameters, redirectUri, codeVerifier, options) {
    assertAs(as);
    assertClient(client);
    if (!branded.has(callbackParameters)) {
        throw CodedTypeError('"callbackParameters" must be an instance of URLSearchParams obtained from "validateAuthResponse()", or "validateJwtAuthResponse()', ERR_INVALID_ARG_VALUE);
    }
    assertString(redirectUri, '"redirectUri"');
    const code = getURLSearchParameter(callbackParameters, 'code');
    if (!code) {
        throw OPE('no authorization code in "callbackParameters"', INVALID_RESPONSE);
    }
    const parameters = new URLSearchParams(options?.additionalParameters);
    parameters.set('redirect_uri', redirectUri);
    parameters.set('code', code);
    if (codeVerifier !== nopkce) {
        assertString(codeVerifier, '"codeVerifier"');
        parameters.set('code_verifier', codeVerifier);
    }
    return tokenEndpointRequest(as, client, clientAuthentication, 'authorization_code', parameters, options);
}
const jwtClaimNames = {
    aud: 'audience',
    c_hash: 'code hash',
    client_id: 'client id',
    exp: 'expiration time',
    iat: 'issued at',
    iss: 'issuer',
    jti: 'jwt id',
    nonce: 'nonce',
    s_hash: 'state hash',
    sub: 'subject',
    ath: 'access token hash',
    htm: 'http method',
    htu: 'http uri',
    cnf: 'confirmation',
    auth_time: 'authentication time',
};
function validatePresence(required, result) {
    for (const claim of required) {
        if (result.claims[claim] === undefined) {
            throw OPE(`JWT "${claim}" (${jwtClaimNames[claim]}) claim missing`, INVALID_RESPONSE, {
                claims: result.claims,
            });
        }
    }
    return result;
}
const expectNoNonce = Symbol();
const skipAuthTimeCheck = Symbol();
async function processAuthorizationCodeResponse(as, client, response, options) {
    if (typeof options?.expectedNonce === 'string' ||
        typeof options?.maxAge === 'number' ||
        options?.requireIdToken) {
        return processAuthorizationCodeOpenIDResponse(as, client, response, options.expectedNonce, options.maxAge, options[jweDecrypt], options.recognizedTokenTypes);
    }
    return processAuthorizationCodeOAuth2Response(as, client, response, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
async function processAuthorizationCodeOpenIDResponse(as, client, response, expectedNonce, maxAge, decryptFn, recognizedTokenTypes) {
    const additionalRequiredClaims = [];
    switch (expectedNonce) {
        case undefined:
            expectedNonce = expectNoNonce;
            break;
        case expectNoNonce:
            break;
        default:
            assertString(expectedNonce, '"expectedNonce" argument');
            additionalRequiredClaims.push('nonce');
    }
    maxAge ??= client.default_max_age;
    switch (maxAge) {
        case undefined:
            maxAge = skipAuthTimeCheck;
            break;
        case skipAuthTimeCheck:
            break;
        default:
            assertNumber(maxAge, true, '"maxAge" argument');
            additionalRequiredClaims.push('auth_time');
    }
    const result = await processGenericAccessTokenResponse(as, client, response, additionalRequiredClaims, decryptFn, recognizedTokenTypes);
    assertString(result.id_token, '"response" body "id_token" property', INVALID_RESPONSE, {
        body: result,
    });
    const claims = getValidatedIdTokenClaims(result);
    if (maxAge !== skipAuthTimeCheck) {
        const now = epochTime() + getClockSkew(client);
        const tolerance = getClockTolerance(client);
        if (claims.auth_time + maxAge < now - tolerance) {
            throw OPE('too much time has elapsed since the last End-User authentication', JWT_TIMESTAMP_CHECK, { claims, now, tolerance, claim: 'auth_time' });
        }
    }
    if (expectedNonce === expectNoNonce) {
        if (claims.nonce !== undefined) {
            throw OPE('unexpected ID Token "nonce" claim value', JWT_CLAIM_COMPARISON, {
                expected: undefined,
                claims,
                claim: 'nonce',
            });
        }
    }
    else if (claims.nonce !== expectedNonce) {
        throw OPE('unexpected ID Token "nonce" claim value', JWT_CLAIM_COMPARISON, {
            expected: expectedNonce,
            claims,
            claim: 'nonce',
        });
    }
    return result;
}
async function processAuthorizationCodeOAuth2Response(as, client, response, decryptFn, recognizedTokenTypes) {
    const result = await processGenericAccessTokenResponse(as, client, response, undefined, decryptFn, recognizedTokenTypes);
    const claims = getValidatedIdTokenClaims(result);
    if (claims) {
        if (client.default_max_age !== undefined) {
            assertNumber(client.default_max_age, true, '"client.default_max_age"');
            const now = epochTime() + getClockSkew(client);
            const tolerance = getClockTolerance(client);
            if (claims.auth_time + client.default_max_age < now - tolerance) {
                throw OPE('too much time has elapsed since the last End-User authentication', JWT_TIMESTAMP_CHECK, { claims, now, tolerance, claim: 'auth_time' });
            }
        }
        if (claims.nonce !== undefined) {
            throw OPE('unexpected ID Token "nonce" claim value', JWT_CLAIM_COMPARISON, {
                expected: undefined,
                claims,
                claim: 'nonce',
            });
        }
    }
    return result;
}
const WWW_AUTHENTICATE_CHALLENGE = 'OAUTH_WWW_AUTHENTICATE_CHALLENGE';
const RESPONSE_BODY_ERROR = 'OAUTH_RESPONSE_BODY_ERROR';
const UNSUPPORTED_OPERATION = 'OAUTH_UNSUPPORTED_OPERATION';
const AUTHORIZATION_RESPONSE_ERROR = 'OAUTH_AUTHORIZATION_RESPONSE_ERROR';
const JWT_USERINFO_EXPECTED = 'OAUTH_JWT_USERINFO_EXPECTED';
const PARSE_ERROR = 'OAUTH_PARSE_ERROR';
const INVALID_RESPONSE = 'OAUTH_INVALID_RESPONSE';
const INVALID_REQUEST = 'OAUTH_INVALID_REQUEST';
const RESPONSE_IS_NOT_JSON = 'OAUTH_RESPONSE_IS_NOT_JSON';
const RESPONSE_IS_NOT_CONFORM = 'OAUTH_RESPONSE_IS_NOT_CONFORM';
const HTTP_REQUEST_FORBIDDEN = 'OAUTH_HTTP_REQUEST_FORBIDDEN';
const REQUEST_PROTOCOL_FORBIDDEN = 'OAUTH_REQUEST_PROTOCOL_FORBIDDEN';
const JWT_TIMESTAMP_CHECK = 'OAUTH_JWT_TIMESTAMP_CHECK_FAILED';
const JWT_CLAIM_COMPARISON = 'OAUTH_JWT_CLAIM_COMPARISON_FAILED';
const JSON_ATTRIBUTE_COMPARISON = 'OAUTH_JSON_ATTRIBUTE_COMPARISON_FAILED';
const KEY_SELECTION = 'OAUTH_KEY_SELECTION_FAILED';
const MISSING_SERVER_METADATA = 'OAUTH_MISSING_SERVER_METADATA';
const INVALID_SERVER_METADATA = 'OAUTH_INVALID_SERVER_METADATA';
function checkJwtType(expected, result) {
    if (typeof result.header.typ !== 'string' || normalizeTyp(result.header.typ) !== expected) {
        throw OPE('unexpected JWT "typ" header parameter value', INVALID_RESPONSE, {
            header: result.header,
        });
    }
    return result;
}
async function clientCredentialsGrantRequest(as, client, clientAuthentication, parameters, options) {
    assertAs(as);
    assertClient(client);
    return tokenEndpointRequest(as, client, clientAuthentication, 'client_credentials', new URLSearchParams(parameters), options);
}
async function genericTokenEndpointRequest(as, client, clientAuthentication, grantType, parameters, options) {
    assertAs(as);
    assertClient(client);
    assertString(grantType, '"grantType"');
    return tokenEndpointRequest(as, client, clientAuthentication, grantType, new URLSearchParams(parameters), options);
}
async function processGenericTokenEndpointResponse(as, client, response, options) {
    return processGenericAccessTokenResponse(as, client, response, undefined, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
async function processClientCredentialsResponse(as, client, response, options) {
    return processGenericAccessTokenResponse(as, client, response, undefined, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
async function revocationRequest(as, client, clientAuthentication, token, options) {
    assertAs(as);
    assertClient(client);
    assertString(token, '"token"');
    const url = resolveEndpoint(as, 'revocation_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const body = new URLSearchParams(options?.additionalParameters);
    body.set('token', token);
    const headers = prepareHeaders(options?.headers);
    headers.delete('accept');
    return authenticatedRequest(as, client, clientAuthentication, url, body, headers, options);
}
async function processRevocationResponse(response) {
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 200, 'Revocation Endpoint');
    return undefined;
}
function assertReadableResponse(response) {
    if (response.bodyUsed) {
        throw CodedTypeError('"response" body has been used already', ERR_INVALID_ARG_VALUE);
    }
}
async function introspectionRequest(as, client, clientAuthentication, token, options) {
    assertAs(as);
    assertClient(client);
    assertString(token, '"token"');
    const url = resolveEndpoint(as, 'introspection_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const body = new URLSearchParams(options?.additionalParameters);
    body.set('token', token);
    const headers = prepareHeaders(options?.headers);
    if (options?.requestJwtResponse ?? client.introspection_signed_response_alg) {
        headers.set('accept', 'application/token-introspection+jwt');
    }
    else {
        headers.set('accept', 'application/json');
    }
    return authenticatedRequest(as, client, clientAuthentication, url, body, headers, options);
}
async function processIntrospectionResponse(as, client, response, options) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 200, 'Introspection Endpoint');
    let json;
    if (getContentType(response) === 'application/token-introspection+jwt') {
        assertReadableResponse(response);
        const { claims, jwt } = await validateJwt(await response.text(), checkSigningAlgorithm.bind(undefined, client.introspection_signed_response_alg, as.introspection_signing_alg_values_supported, 'RS256'), getClockSkew(client), getClockTolerance(client), options?.[jweDecrypt])
            .then(checkJwtType.bind(undefined, 'token-introspection+jwt'))
            .then(validatePresence.bind(undefined, ['aud', 'iat', 'iss']))
            .then(validateIssuer.bind(undefined, as))
            .then(validateAudience.bind(undefined, client.client_id));
        jwtRefs.set(response, jwt);
        if (!isJsonObject(claims.token_introspection)) {
            throw OPE('JWT "token_introspection" claim must be a JSON object', INVALID_RESPONSE, {
                claims,
            });
        }
        json = claims.token_introspection;
    }
    else {
        assertReadableResponse(response);
        json = await getResponseJsonBody(response);
    }
    if (typeof json.active !== 'boolean') {
        throw OPE('"response" body "active" property must be a boolean', INVALID_RESPONSE, {
            body: json,
        });
    }
    return json;
}
async function jwksRequest(as, options) {
    assertAs(as);
    const url = resolveEndpoint(as, 'jwks_uri', false, options?.[allowInsecureRequests] !== true);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    headers.append('accept', 'application/jwk-set+json');
    return (options?.[customFetch] || fetch)(url.href, {
        body: undefined,
        headers: Object.fromEntries(headers.entries()),
        method: 'GET',
        redirect: 'manual',
        signal: signal(url, options?.signal),
    });
}
async function processJwksResponse(response) {
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    if (response.status !== 200) {
        throw OPE('"response" is not a conform JSON Web Key Set response (unexpected HTTP status code)', RESPONSE_IS_NOT_CONFORM, response);
    }
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response, (response) => assertContentTypes(response, 'application/json', 'application/jwk-set+json'));
    if (!Array.isArray(json.keys)) {
        throw OPE('"response" body "keys" property must be an array', INVALID_RESPONSE, { body: json });
    }
    if (!Array.prototype.every.call(json.keys, isJsonObject)) {
        throw OPE('"response" body "keys" property members must be JWK formatted objects', INVALID_RESPONSE, { body: json });
    }
    return json;
}
function supported(alg) {
    switch (alg) {
        case 'PS256':
        case 'ES256':
        case 'RS256':
        case 'PS384':
        case 'ES384':
        case 'RS384':
        case 'PS512':
        case 'ES512':
        case 'RS512':
        case 'Ed25519':
        case 'EdDSA':
            return true;
        default:
            return false;
    }
}
function checkSupportedJwsAlg(header) {
    if (!supported(header.alg)) {
        throw new UnsupportedOperationError('unsupported JWS "alg" identifier', {
            cause: { alg: header.alg },
        });
    }
}
function checkRsaKeyAlgorithm(key) {
    const { algorithm } = key;
    if (typeof algorithm.modulusLength !== 'number' || algorithm.modulusLength < 2048) {
        throw new UnsupportedOperationError(`unsupported ${algorithm.name} modulusLength`, {
            cause: key,
        });
    }
}
function ecdsaHashName(key) {
    const { algorithm } = key;
    switch (algorithm.namedCurve) {
        case 'P-256':
            return 'SHA-256';
        case 'P-384':
            return 'SHA-384';
        case 'P-521':
            return 'SHA-512';
        default:
            throw new UnsupportedOperationError('unsupported ECDSA namedCurve', { cause: key });
    }
}
function keyToSubtle(key) {
    switch (key.algorithm.name) {
        case 'ECDSA':
            return {
                name: key.algorithm.name,
                hash: ecdsaHashName(key),
            };
        case 'RSA-PSS': {
            checkRsaKeyAlgorithm(key);
            switch (key.algorithm.hash.name) {
                case 'SHA-256':
                case 'SHA-384':
                case 'SHA-512':
                    return {
                        name: key.algorithm.name,
                        saltLength: parseInt(key.algorithm.hash.name.slice(-3), 10) >> 3,
                    };
                default:
                    throw new UnsupportedOperationError('unsupported RSA-PSS hash name', { cause: key });
            }
        }
        case 'RSASSA-PKCS1-v1_5':
            checkRsaKeyAlgorithm(key);
            return key.algorithm.name;
        case 'Ed25519':
            return key.algorithm.name;
    }
    throw new UnsupportedOperationError('unsupported CryptoKey algorithm name', { cause: key });
}
async function validateJwsSignature(protectedHeader, payload, key, signature) {
    const data = buf(`${protectedHeader}.${payload}`);
    const algorithm = keyToSubtle(key);
    const verified = await crypto.subtle.verify(algorithm, key, signature, data);
    if (!verified) {
        throw OPE('JWT signature verification failed', INVALID_RESPONSE, {
            key,
            data,
            signature,
            algorithm,
        });
    }
}
async function validateJwt(jws, checkAlg, clockSkew, clockTolerance, decryptJwt) {
    let { 0: protectedHeader, 1: payload, length } = jws.split('.');
    if (length === 5) {
        if (decryptJwt !== undefined) {
            jws = await decryptJwt(jws);
            ({ 0: protectedHeader, 1: payload, length } = jws.split('.'));
        }
        else {
            throw new UnsupportedOperationError('JWE decryption is not configured', { cause: jws });
        }
    }
    if (length !== 3) {
        throw OPE('Invalid JWT', INVALID_RESPONSE, jws);
    }
    let header;
    try {
        header = JSON.parse(buf(b64u(protectedHeader)));
    }
    catch (cause) {
        throw OPE('failed to parse JWT Header body as base64url encoded JSON', PARSE_ERROR, cause);
    }
    if (!isJsonObject(header)) {
        throw OPE('JWT Header must be a top level object', INVALID_RESPONSE, jws);
    }
    checkAlg(header);
    if (header.crit !== undefined) {
        throw new UnsupportedOperationError('no JWT "crit" header parameter extensions are supported', {
            cause: { header },
        });
    }
    let claims;
    try {
        claims = JSON.parse(buf(b64u(payload)));
    }
    catch (cause) {
        throw OPE('failed to parse JWT Payload body as base64url encoded JSON', PARSE_ERROR, cause);
    }
    if (!isJsonObject(claims)) {
        throw OPE('JWT Payload must be a top level object', INVALID_RESPONSE, jws);
    }
    const now = epochTime() + clockSkew;
    if (claims.exp !== undefined) {
        if (typeof claims.exp !== 'number') {
            throw OPE('unexpected JWT "exp" (expiration time) claim type', INVALID_RESPONSE, { claims });
        }
        if (claims.exp <= now - clockTolerance) {
            throw OPE('unexpected JWT "exp" (expiration time) claim value, expiration is past current timestamp', JWT_TIMESTAMP_CHECK, { claims, now, tolerance: clockTolerance, claim: 'exp' });
        }
    }
    if (claims.iat !== undefined) {
        if (typeof claims.iat !== 'number') {
            throw OPE('unexpected JWT "iat" (issued at) claim type', INVALID_RESPONSE, { claims });
        }
    }
    if (claims.iss !== undefined) {
        if (typeof claims.iss !== 'string') {
            throw OPE('unexpected JWT "iss" (issuer) claim type', INVALID_RESPONSE, { claims });
        }
    }
    if (claims.nbf !== undefined) {
        if (typeof claims.nbf !== 'number') {
            throw OPE('unexpected JWT "nbf" (not before) claim type', INVALID_RESPONSE, { claims });
        }
        if (claims.nbf > now + clockTolerance) {
            throw OPE('unexpected JWT "nbf" (not before) claim value', JWT_TIMESTAMP_CHECK, {
                claims,
                now,
                tolerance: clockTolerance,
                claim: 'nbf',
            });
        }
    }
    if (claims.aud !== undefined) {
        if (typeof claims.aud !== 'string' && !Array.isArray(claims.aud)) {
            throw OPE('unexpected JWT "aud" (audience) claim type', INVALID_RESPONSE, { claims });
        }
    }
    return { header, claims, jwt: jws };
}
async function validateJwtAuthResponse(as, client, parameters, expectedState, options) {
    assertAs(as);
    assertClient(client);
    if (parameters instanceof URL) {
        parameters = parameters.searchParams;
    }
    if (!(parameters instanceof URLSearchParams)) {
        throw CodedTypeError('"parameters" must be an instance of URLSearchParams, or URL', ERR_INVALID_ARG_TYPE);
    }
    const response = getURLSearchParameter(parameters, 'response');
    if (!response) {
        throw OPE('"parameters" does not contain a JARM response', INVALID_RESPONSE);
    }
    const { claims, header, jwt } = await validateJwt(response, checkSigningAlgorithm.bind(undefined, client.authorization_signed_response_alg, as.authorization_signing_alg_values_supported, 'RS256'), getClockSkew(client), getClockTolerance(client), options?.[jweDecrypt])
        .then(validatePresence.bind(undefined, ['aud', 'exp', 'iss']))
        .then(validateIssuer.bind(undefined, as))
        .then(validateAudience.bind(undefined, client.client_id));
    const { 0: protectedHeader, 1: payload, 2: encodedSignature } = jwt.split('.');
    const signature = b64u(encodedSignature);
    const key = await getPublicSigKeyFromIssuerJwksUri(as, options, header);
    await validateJwsSignature(protectedHeader, payload, key, signature);
    const result = new URLSearchParams();
    for (const [key, value] of Object.entries(claims)) {
        if (typeof value === 'string' && key !== 'aud') {
            result.set(key, value);
        }
    }
    return validateAuthResponse(as, client, result, expectedState);
}
async function idTokenHash(data, header, claimName) {
    let algorithm;
    switch (header.alg) {
        case 'RS256':
        case 'PS256':
        case 'ES256':
            algorithm = 'SHA-256';
            break;
        case 'RS384':
        case 'PS384':
        case 'ES384':
            algorithm = 'SHA-384';
            break;
        case 'RS512':
        case 'PS512':
        case 'ES512':
        case 'Ed25519':
        case 'EdDSA':
            algorithm = 'SHA-512';
            break;
        default:
            throw new UnsupportedOperationError(`unsupported JWS algorithm for ${claimName} calculation`, { cause: { alg: header.alg } });
    }
    const digest = await crypto.subtle.digest(algorithm, buf(data));
    return b64u(digest.slice(0, digest.byteLength / 2));
}
async function idTokenHashMatches(data, actual, header, claimName) {
    const expected = await idTokenHash(data, header, claimName);
    return actual === expected;
}
async function validateDetachedSignatureResponse(as, client, parameters, expectedNonce, expectedState, maxAge, options) {
    return validateHybridResponse(as, client, parameters, expectedNonce, expectedState, maxAge, options, true);
}
async function validateCodeIdTokenResponse(as, client, parameters, expectedNonce, expectedState, maxAge, options) {
    return validateHybridResponse(as, client, parameters, expectedNonce, expectedState, maxAge, options, false);
}
async function consumeStream(request) {
    if (request.bodyUsed) {
        throw CodedTypeError('form_post Request instances must contain a readable body', ERR_INVALID_ARG_VALUE, { cause: request });
    }
    return request.text();
}
async function formPostResponse(request) {
    if (request.method !== 'POST') {
        throw CodedTypeError('form_post responses are expected to use the POST method', ERR_INVALID_ARG_VALUE, { cause: request });
    }
    if (getContentType(request) !== 'application/x-www-form-urlencoded') {
        throw CodedTypeError('form_post responses are expected to use the application/x-www-form-urlencoded content-type', ERR_INVALID_ARG_VALUE, { cause: request });
    }
    return consumeStream(request);
}
async function validateHybridResponse(as, client, parameters, expectedNonce, expectedState, maxAge, options, fapi) {
    assertAs(as);
    assertClient(client);
    if (parameters instanceof URL) {
        if (!parameters.hash.length) {
            throw CodedTypeError('"parameters" as an instance of URL must contain a hash (fragment) with the Authorization Response parameters', ERR_INVALID_ARG_VALUE);
        }
        parameters = new URLSearchParams(parameters.hash.slice(1));
    }
    else if (looseInstanceOf(parameters, Request)) {
        parameters = new URLSearchParams(await formPostResponse(parameters));
    }
    else if (parameters instanceof URLSearchParams) {
        parameters = new URLSearchParams(parameters);
    }
    else {
        throw CodedTypeError('"parameters" must be an instance of URLSearchParams, URL, or Response', ERR_INVALID_ARG_TYPE);
    }
    const id_token = getURLSearchParameter(parameters, 'id_token');
    parameters.delete('id_token');
    switch (expectedState) {
        case undefined:
        case expectNoState:
            break;
        default:
            assertString(expectedState, '"expectedState" argument');
    }
    const result = validateAuthResponse({
        ...as,
        authorization_response_iss_parameter_supported: false,
    }, client, parameters, expectedState);
    if (!id_token) {
        throw OPE('"parameters" does not contain an ID Token', INVALID_RESPONSE);
    }
    const code = getURLSearchParameter(parameters, 'code');
    if (!code) {
        throw OPE('"parameters" does not contain an Authorization Code', INVALID_RESPONSE);
    }
    const requiredClaims = [
        'aud',
        'exp',
        'iat',
        'iss',
        'sub',
        'nonce',
        'c_hash',
    ];
    const state = parameters.get('state');
    if (fapi && (typeof expectedState === 'string' || state !== null)) {
        requiredClaims.push('s_hash');
    }
    if (maxAge !== undefined) {
        assertNumber(maxAge, true, '"maxAge" argument');
    }
    else if (client.default_max_age !== undefined) {
        assertNumber(client.default_max_age, true, '"client.default_max_age"');
    }
    maxAge ??= client.default_max_age ?? skipAuthTimeCheck;
    if (client.require_auth_time || maxAge !== skipAuthTimeCheck) {
        requiredClaims.push('auth_time');
    }
    const { claims, header, jwt } = await validateJwt(id_token, checkSigningAlgorithm.bind(undefined, client.id_token_signed_response_alg, as.id_token_signing_alg_values_supported, 'RS256'), getClockSkew(client), getClockTolerance(client), options?.[jweDecrypt])
        .then(validatePresence.bind(undefined, requiredClaims))
        .then(validateIssuer.bind(undefined, as))
        .then(validateAudience.bind(undefined, client.client_id));
    const clockSkew = getClockSkew(client);
    const now = epochTime() + clockSkew;
    if (claims.iat < now - 3600) {
        throw OPE('unexpected JWT "iat" (issued at) claim value, it is too far in the past', JWT_TIMESTAMP_CHECK, { now, claims, claim: 'iat' });
    }
    assertString(claims.c_hash, 'ID Token "c_hash" (code hash) claim value', INVALID_RESPONSE, {
        claims,
    });
    if (claims.auth_time !== undefined) {
        assertNumber(claims.auth_time, true, 'ID Token "auth_time" (authentication time)', INVALID_RESPONSE, { claims });
    }
    if (maxAge !== skipAuthTimeCheck) {
        const now = epochTime() + getClockSkew(client);
        const tolerance = getClockTolerance(client);
        if (claims.auth_time + maxAge < now - tolerance) {
            throw OPE('too much time has elapsed since the last End-User authentication', JWT_TIMESTAMP_CHECK, { claims, now, tolerance, claim: 'auth_time' });
        }
    }
    assertString(expectedNonce, '"expectedNonce" argument');
    if (claims.nonce !== expectedNonce) {
        throw OPE('unexpected ID Token "nonce" claim value', JWT_CLAIM_COMPARISON, {
            expected: expectedNonce,
            claims,
            claim: 'nonce',
        });
    }
    if (Array.isArray(claims.aud) && claims.aud.length !== 1) {
        if (claims.azp === undefined) {
            throw OPE('ID Token "aud" (audience) claim includes additional untrusted audiences', JWT_CLAIM_COMPARISON, { claims, claim: 'aud' });
        }
        if (claims.azp !== client.client_id) {
            throw OPE('unexpected ID Token "azp" (authorized party) claim value', JWT_CLAIM_COMPARISON, {
                expected: client.client_id,
                claims,
                claim: 'azp',
            });
        }
    }
    const { 0: protectedHeader, 1: payload, 2: encodedSignature } = jwt.split('.');
    const signature = b64u(encodedSignature);
    const key = await getPublicSigKeyFromIssuerJwksUri(as, options, header);
    await validateJwsSignature(protectedHeader, payload, key, signature);
    if ((await idTokenHashMatches(code, claims.c_hash, header, 'c_hash')) !== true) {
        throw OPE('invalid ID Token "c_hash" (code hash) claim value', JWT_CLAIM_COMPARISON, {
            code,
            alg: header.alg,
            claim: 'c_hash',
            claims,
        });
    }
    if ((fapi && state !== null) || claims.s_hash !== undefined) {
        assertString(claims.s_hash, 'ID Token "s_hash" (state hash) claim value', INVALID_RESPONSE, {
            claims,
        });
        assertString(state, '"state" response parameter', INVALID_RESPONSE, { parameters });
        if ((await idTokenHashMatches(state, claims.s_hash, header, 's_hash')) !== true) {
            throw OPE('invalid ID Token "s_hash" (state hash) claim value', JWT_CLAIM_COMPARISON, {
                state,
                alg: header.alg,
                claim: 's_hash',
                claims,
            });
        }
    }
    return result;
}
function checkSigningAlgorithm(client, issuer, fallback, header) {
    if (client !== undefined) {
        if (typeof client === 'string' ? header.alg !== client : !client.includes(header.alg)) {
            throw OPE('unexpected JWT "alg" header parameter', INVALID_RESPONSE, {
                header,
                expected: client,
                reason: 'client configuration',
            });
        }
        return;
    }
    if (Array.isArray(issuer)) {
        if (!issuer.includes(header.alg)) {
            throw OPE('unexpected JWT "alg" header parameter', INVALID_RESPONSE, {
                header,
                expected: issuer,
                reason: 'authorization server metadata',
            });
        }
        return;
    }
    if (fallback !== undefined) {
        if (typeof fallback === 'string'
            ? header.alg !== fallback
            : typeof fallback === 'function'
                ? !fallback(header.alg)
                : !fallback.includes(header.alg)) {
            throw OPE('unexpected JWT "alg" header parameter', INVALID_RESPONSE, {
                header,
                expected: fallback,
                reason: 'default value',
            });
        }
        return;
    }
    throw OPE('missing client or server configuration to verify used JWT "alg" header parameter', undefined, { client, issuer, fallback });
}
function getURLSearchParameter(parameters, name) {
    const { 0: value, length } = parameters.getAll(name);
    if (length > 1) {
        throw OPE(`"${name}" parameter must be provided only once`, INVALID_RESPONSE);
    }
    return value;
}
const skipStateCheck = Symbol();
const expectNoState = Symbol();
function validateAuthResponse(as, client, parameters, expectedState) {
    assertAs(as);
    assertClient(client);
    if (parameters instanceof URL) {
        parameters = parameters.searchParams;
    }
    if (!(parameters instanceof URLSearchParams)) {
        throw CodedTypeError('"parameters" must be an instance of URLSearchParams, or URL', ERR_INVALID_ARG_TYPE);
    }
    if (getURLSearchParameter(parameters, 'response')) {
        throw OPE('"parameters" contains a JARM response, use validateJwtAuthResponse() instead of validateAuthResponse()', INVALID_RESPONSE, { parameters });
    }
    const iss = getURLSearchParameter(parameters, 'iss');
    const state = getURLSearchParameter(parameters, 'state');
    if (!iss && as.authorization_response_iss_parameter_supported) {
        throw OPE('response parameter "iss" (issuer) missing', INVALID_RESPONSE, { parameters });
    }
    if (iss && iss !== as.issuer) {
        throw OPE('unexpected "iss" (issuer) response parameter value', INVALID_RESPONSE, {
            expected: as.issuer,
            parameters,
        });
    }
    switch (expectedState) {
        case undefined:
        case expectNoState:
            if (state !== undefined) {
                throw OPE('unexpected "state" response parameter encountered', INVALID_RESPONSE, {
                    expected: undefined,
                    parameters,
                });
            }
            break;
        case skipStateCheck:
            break;
        default:
            assertString(expectedState, '"expectedState" argument');
            if (state !== expectedState) {
                throw OPE(state === undefined
                    ? 'response parameter "state" missing'
                    : 'unexpected "state" response parameter value', INVALID_RESPONSE, { expected: expectedState, parameters });
            }
    }
    const error = getURLSearchParameter(parameters, 'error');
    if (error) {
        throw new AuthorizationResponseError('authorization response from the server is an error', {
            cause: parameters,
        });
    }
    const id_token = getURLSearchParameter(parameters, 'id_token');
    const token = getURLSearchParameter(parameters, 'token');
    if (id_token !== undefined || token !== undefined) {
        throw new UnsupportedOperationError('implicit and hybrid flows are not supported');
    }
    return brand(new URLSearchParams(parameters));
}
function algToSubtle(alg) {
    switch (alg) {
        case 'PS256':
        case 'PS384':
        case 'PS512':
            return { name: 'RSA-PSS', hash: `SHA-${alg.slice(-3)}` };
        case 'RS256':
        case 'RS384':
        case 'RS512':
            return { name: 'RSASSA-PKCS1-v1_5', hash: `SHA-${alg.slice(-3)}` };
        case 'ES256':
        case 'ES384':
            return { name: 'ECDSA', namedCurve: `P-${alg.slice(-3)}` };
        case 'ES512':
            return { name: 'ECDSA', namedCurve: 'P-521' };
        case 'Ed25519':
        case 'EdDSA':
            return 'Ed25519';
        default:
            throw new UnsupportedOperationError('unsupported JWS algorithm', { cause: { alg } });
    }
}
async function importJwk(alg, jwk) {
    const { ext, key_ops, use, ...key } = jwk;
    return crypto.subtle.importKey('jwk', key, algToSubtle(alg), true, ['verify']);
}
async function deviceAuthorizationRequest(as, client, clientAuthentication, parameters, options) {
    assertAs(as);
    assertClient(client);
    const url = resolveEndpoint(as, 'device_authorization_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const body = new URLSearchParams(parameters);
    body.set('client_id', client.client_id);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    return authenticatedRequest(as, client, clientAuthentication, url, body, headers, options);
}
async function processDeviceAuthorizationResponse(as, client, response) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 200, 'Device Authorization Endpoint');
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.device_code, '"response" body "device_code" property', INVALID_RESPONSE, {
        body: json,
    });
    assertString(json.user_code, '"response" body "user_code" property', INVALID_RESPONSE, {
        body: json,
    });
    assertString(json.verification_uri, '"response" body "verification_uri" property', INVALID_RESPONSE, { body: json });
    let expiresIn = typeof json.expires_in !== 'number' ? parseFloat(json.expires_in) : json.expires_in;
    assertNumber(expiresIn, true, '"response" body "expires_in" property', INVALID_RESPONSE, {
        body: json,
    });
    json.expires_in = expiresIn;
    if (json.verification_uri_complete !== undefined) {
        assertString(json.verification_uri_complete, '"response" body "verification_uri_complete" property', INVALID_RESPONSE, { body: json });
    }
    if (json.interval !== undefined) {
        assertNumber(json.interval, false, '"response" body "interval" property', INVALID_RESPONSE, {
            body: json,
        });
    }
    return json;
}
async function deviceCodeGrantRequest(as, client, clientAuthentication, deviceCode, options) {
    assertAs(as);
    assertClient(client);
    assertString(deviceCode, '"deviceCode"');
    const parameters = new URLSearchParams(options?.additionalParameters);
    parameters.set('device_code', deviceCode);
    return tokenEndpointRequest(as, client, clientAuthentication, 'urn:ietf:params:oauth:grant-type:device_code', parameters, options);
}
async function processDeviceCodeResponse(as, client, response, options) {
    return processGenericAccessTokenResponse(as, client, response, undefined, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
async function generateKeyPair(alg, options) {
    assertString(alg, '"alg"');
    const algorithm = algToSubtle(alg);
    if (alg.startsWith('PS') || alg.startsWith('RS')) {
        Object.assign(algorithm, {
            modulusLength: options?.modulusLength ?? 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        });
    }
    return crypto.subtle.generateKey(algorithm, options?.extractable ?? false, [
        'sign',
        'verify',
    ]);
}
function normalizeHtu(htu) {
    const url = new URL(htu);
    url.search = '';
    url.hash = '';
    return url.href;
}
async function validateDPoP(request, accessToken, accessTokenClaims, options) {
    const headerValue = request.headers.get('dpop');
    if (headerValue === null) {
        throw OPE('operation indicated DPoP use but the request has no DPoP HTTP Header', INVALID_REQUEST, { headers: request.headers });
    }
    if (request.headers.get('authorization')?.toLowerCase().startsWith('dpop ') === false) {
        throw OPE(`operation indicated DPoP use but the request's Authorization HTTP Header scheme is not DPoP`, INVALID_REQUEST, { headers: request.headers });
    }
    if (typeof accessTokenClaims.cnf?.jkt !== 'string') {
        throw OPE('operation indicated DPoP use but the JWT Access Token has no jkt confirmation claim', INVALID_REQUEST, { claims: accessTokenClaims });
    }
    const clockSkew = getClockSkew(options);
    const proof = await validateJwt(headerValue, checkSigningAlgorithm.bind(undefined, options?.signingAlgorithms, undefined, supported), clockSkew, getClockTolerance(options), undefined)
        .then(checkJwtType.bind(undefined, 'dpop+jwt'))
        .then(validatePresence.bind(undefined, ['iat', 'jti', 'ath', 'htm', 'htu']));
    const now = epochTime() + clockSkew;
    const diff = Math.abs(now - proof.claims.iat);
    if (diff > 300) {
        throw OPE('DPoP Proof iat is not recent enough', JWT_TIMESTAMP_CHECK, {
            now,
            claims: proof.claims,
            claim: 'iat',
        });
    }
    if (proof.claims.htm !== request.method) {
        throw OPE('DPoP Proof htm mismatch', JWT_CLAIM_COMPARISON, {
            expected: request.method,
            claims: proof.claims,
            claim: 'htm',
        });
    }
    if (typeof proof.claims.htu !== 'string' ||
        normalizeHtu(proof.claims.htu) !== normalizeHtu(request.url)) {
        throw OPE('DPoP Proof htu mismatch', JWT_CLAIM_COMPARISON, {
            expected: normalizeHtu(request.url),
            claims: proof.claims,
            claim: 'htu',
        });
    }
    {
        const expected = b64u(await crypto.subtle.digest('SHA-256', buf(accessToken)));
        if (proof.claims.ath !== expected) {
            throw OPE('DPoP Proof ath mismatch', JWT_CLAIM_COMPARISON, {
                expected,
                claims: proof.claims,
                claim: 'ath',
            });
        }
    }
    {
        let components;
        switch (proof.header.jwk.kty) {
            case 'EC':
                components = {
                    crv: proof.header.jwk.crv,
                    kty: proof.header.jwk.kty,
                    x: proof.header.jwk.x,
                    y: proof.header.jwk.y,
                };
                break;
            case 'OKP':
                components = {
                    crv: proof.header.jwk.crv,
                    kty: proof.header.jwk.kty,
                    x: proof.header.jwk.x,
                };
                break;
            case 'RSA':
                components = {
                    e: proof.header.jwk.e,
                    kty: proof.header.jwk.kty,
                    n: proof.header.jwk.n,
                };
                break;
            default:
                throw new UnsupportedOperationError('unsupported JWK key type', { cause: proof.header.jwk });
        }
        const expected = b64u(await crypto.subtle.digest('SHA-256', buf(JSON.stringify(components))));
        if (accessTokenClaims.cnf.jkt !== expected) {
            throw OPE('JWT Access Token confirmation mismatch', JWT_CLAIM_COMPARISON, {
                expected,
                claims: accessTokenClaims,
                claim: 'cnf.jkt',
            });
        }
    }
    const { 0: protectedHeader, 1: payload, 2: encodedSignature } = headerValue.split('.');
    const signature = b64u(encodedSignature);
    const { jwk, alg } = proof.header;
    if (!jwk) {
        throw OPE('DPoP Proof is missing the jwk header parameter', INVALID_REQUEST, {
            header: proof.header,
        });
    }
    const key = await importJwk(alg, jwk);
    if (key.type !== 'public') {
        throw OPE('DPoP Proof jwk header parameter must contain a public key', INVALID_REQUEST, {
            header: proof.header,
        });
    }
    await validateJwsSignature(protectedHeader, payload, key, signature);
}
async function validateJwtAccessToken(as, request, expectedAudience, options) {
    assertAs(as);
    if (!looseInstanceOf(request, Request)) {
        throw CodedTypeError('"request" must be an instance of Request', ERR_INVALID_ARG_TYPE);
    }
    assertString(expectedAudience, '"expectedAudience"');
    const authorization = request.headers.get('authorization');
    if (authorization === null) {
        throw OPE('"request" is missing an Authorization HTTP Header', INVALID_REQUEST, {
            headers: request.headers,
        });
    }
    let { 0: scheme, 1: accessToken, length } = authorization.split(' ');
    scheme = scheme.toLowerCase();
    switch (scheme) {
        case 'dpop':
        case 'bearer':
            break;
        default:
            throw new UnsupportedOperationError('unsupported Authorization HTTP Header scheme', {
                cause: { headers: request.headers },
            });
    }
    if (length !== 2) {
        throw OPE('invalid Authorization HTTP Header format', INVALID_REQUEST, {
            headers: request.headers,
        });
    }
    const requiredClaims = [
        'iss',
        'exp',
        'aud',
        'sub',
        'iat',
        'jti',
        'client_id',
    ];
    if (options?.requireDPoP || scheme === 'dpop' || request.headers.has('dpop')) {
        requiredClaims.push('cnf');
    }
    const { claims, header } = await validateJwt(accessToken, checkSigningAlgorithm.bind(undefined, options?.signingAlgorithms, undefined, supported), getClockSkew(options), getClockTolerance(options), undefined)
        .then(checkJwtType.bind(undefined, 'at+jwt'))
        .then(validatePresence.bind(undefined, requiredClaims))
        .then(validateIssuer.bind(undefined, as))
        .then(validateAudience.bind(undefined, expectedAudience))
        .catch(reassignRSCode);
    for (const claim of ['client_id', 'jti', 'sub']) {
        if (typeof claims[claim] !== 'string') {
            throw OPE(`unexpected JWT "${claim}" claim type`, INVALID_REQUEST, { claims });
        }
    }
    if ('cnf' in claims) {
        if (!isJsonObject(claims.cnf)) {
            throw OPE('unexpected JWT "cnf" (confirmation) claim value', INVALID_REQUEST, { claims });
        }
        const { 0: cnf, length } = Object.keys(claims.cnf);
        if (length) {
            if (length !== 1) {
                throw new UnsupportedOperationError('multiple confirmation claims are not supported', {
                    cause: { claims },
                });
            }
            if (cnf !== 'jkt') {
                throw new UnsupportedOperationError('unsupported JWT Confirmation method', {
                    cause: { claims },
                });
            }
        }
    }
    const { 0: protectedHeader, 1: payload, 2: encodedSignature } = accessToken.split('.');
    const signature = b64u(encodedSignature);
    const key = await getPublicSigKeyFromIssuerJwksUri(as, options, header);
    await validateJwsSignature(protectedHeader, payload, key, signature);
    if (options?.requireDPoP ||
        scheme === 'dpop' ||
        claims.cnf?.jkt !== undefined ||
        request.headers.has('dpop')) {
        await validateDPoP(request, accessToken, claims, options).catch(reassignRSCode);
    }
    return claims;
}
function reassignRSCode(err) {
    if (err instanceof OperationProcessingError && err?.code === INVALID_REQUEST) {
        err.code = INVALID_RESPONSE;
    }
    throw err;
}
async function backchannelAuthenticationRequest(as, client, clientAuthentication, parameters, options) {
    assertAs(as);
    assertClient(client);
    const url = resolveEndpoint(as, 'backchannel_authentication_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const body = new URLSearchParams(parameters);
    body.set('client_id', client.client_id);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    return authenticatedRequest(as, client, clientAuthentication, url, body, headers, options);
}
async function processBackchannelAuthenticationResponse(as, client, response) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 200, 'Backchannel Authentication Endpoint');
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.auth_req_id, '"response" body "auth_req_id" property', INVALID_RESPONSE, {
        body: json,
    });
    let expiresIn = typeof json.expires_in !== 'number' ? parseFloat(json.expires_in) : json.expires_in;
    assertNumber(expiresIn, true, '"response" body "expires_in" property', INVALID_RESPONSE, {
        body: json,
    });
    json.expires_in = expiresIn;
    if (json.interval !== undefined) {
        assertNumber(json.interval, false, '"response" body "interval" property', INVALID_RESPONSE, {
            body: json,
        });
    }
    return json;
}
async function backchannelAuthenticationGrantRequest(as, client, clientAuthentication, authReqId, options) {
    assertAs(as);
    assertClient(client);
    assertString(authReqId, '"authReqId"');
    const parameters = new URLSearchParams(options?.additionalParameters);
    parameters.set('auth_req_id', authReqId);
    return tokenEndpointRequest(as, client, clientAuthentication, 'urn:openid:params:grant-type:ciba', parameters, options);
}
async function processBackchannelAuthenticationGrantResponse(as, client, response, options) {
    return processGenericAccessTokenResponse(as, client, response, undefined, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
async function dynamicClientRegistrationRequest(as, metadata, options) {
    assertAs(as);
    const url = resolveEndpoint(as, 'registration_endpoint', metadata.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    headers.set('content-type', 'application/json');
    const method = 'POST';
    if (options?.DPoP) {
        assertDPoP(options.DPoP);
        await options.DPoP.addProof(url, headers, method, options.initialAccessToken);
    }
    if (options?.initialAccessToken) {
        headers.set('authorization', `${headers.has('dpop') ? 'DPoP' : 'Bearer'} ${options.initialAccessToken}`);
    }
    const response = await (options?.[customFetch] || fetch)(url.href, {
        body: JSON.stringify(metadata),
        headers: Object.fromEntries(headers.entries()),
        method,
        redirect: 'manual',
        signal: signal(url, options?.signal),
    });
    options?.DPoP?.cacheNonce(response);
    return response;
}
async function processDynamicClientRegistrationResponse(response) {
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 201, 'Dynamic Client Registration Endpoint');
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.client_id, '"response" body "client_id" property', INVALID_RESPONSE, {
        body: json,
    });
    if (json.client_secret !== undefined) {
        assertString(json.client_secret, '"response" body "client_secret" property', INVALID_RESPONSE, {
            body: json,
        });
    }
    if (json.client_secret) {
        assertNumber(json.client_secret_expires_at, true, '"response" body "client_secret_expires_at" property', INVALID_RESPONSE, {
            body: json,
        });
    }
    return json;
}
async function resourceDiscoveryRequest(resourceIdentifier, options) {
    return performDiscovery(resourceIdentifier, 'resourceIdentifier', (url) => {
        prependWellKnown(url, '.well-known/oauth-protected-resource', true);
        return url;
    }, options);
}
async function processResourceDiscoveryResponse(expectedResourceIdentifier, response) {
    const expected = expectedResourceIdentifier;
    if (!(expected instanceof URL) && expected !== _nodiscoverycheck) {
        throw CodedTypeError('"expectedResourceIdentifier" must be an instance of URL', ERR_INVALID_ARG_TYPE);
    }
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    if (response.status !== 200) {
        throw OPE('"response" is not a conform Resource Server Metadata response (unexpected HTTP status code)', RESPONSE_IS_NOT_CONFORM, response);
    }
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.resource, '"response" body "resource" property', INVALID_RESPONSE, {
        body: json,
    });
    if (expected !== _nodiscoverycheck && new URL(json.resource).href !== expected.href) {
        throw OPE('"response" body "resource" property does not match the expected value', JSON_ATTRIBUTE_COMPARISON, { expected: expected.href, body: json, attribute: 'resource' });
    }
    return json;
}
async function getResponseJsonBody(response, check = assertApplicationJson) {
    let json;
    try {
        json = await response.json();
    }
    catch (cause) {
        check(response);
        throw OPE('failed to parse "response" body as JSON', PARSE_ERROR, cause);
    }
    if (!isJsonObject(json)) {
        throw OPE('"response" body must be a top level object', INVALID_RESPONSE, { body: json });
    }
    return json;
}
const _nopkce = nopkce;
const _nodiscoverycheck = Symbol();
const _expectedIssuer = Symbol();
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/openid-client/build/index.js":
/*!***************************************************!*\
  !*** ./node_modules/openid-client/build/index.js ***!
  \***************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AuthorizationResponseError: () => (/* reexport safe */ oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.AuthorizationResponseError),
/* harmony export */   ClientError: () => (/* binding */ ClientError),
/* harmony export */   ClientSecretBasic: () => (/* binding */ ClientSecretBasic),
/* harmony export */   ClientSecretJwt: () => (/* binding */ ClientSecretJwt),
/* harmony export */   ClientSecretPost: () => (/* binding */ ClientSecretPost),
/* harmony export */   Configuration: () => (/* binding */ Configuration),
/* harmony export */   None: () => (/* binding */ None),
/* harmony export */   PrivateKeyJwt: () => (/* binding */ PrivateKeyJwt),
/* harmony export */   ResponseBodyError: () => (/* reexport safe */ oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.ResponseBodyError),
/* harmony export */   TlsClientAuth: () => (/* binding */ TlsClientAuth),
/* harmony export */   WWWAuthenticateChallengeError: () => (/* reexport safe */ oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.WWWAuthenticateChallengeError),
/* harmony export */   allowInsecureRequests: () => (/* binding */ allowInsecureRequests),
/* harmony export */   authorizationCodeGrant: () => (/* binding */ authorizationCodeGrant),
/* harmony export */   buildAuthorizationUrl: () => (/* binding */ buildAuthorizationUrl),
/* harmony export */   buildAuthorizationUrlWithJAR: () => (/* binding */ buildAuthorizationUrlWithJAR),
/* harmony export */   buildAuthorizationUrlWithPAR: () => (/* binding */ buildAuthorizationUrlWithPAR),
/* harmony export */   buildEndSessionUrl: () => (/* binding */ buildEndSessionUrl),
/* harmony export */   calculatePKCECodeChallenge: () => (/* binding */ calculatePKCECodeChallenge),
/* harmony export */   clientCredentialsGrant: () => (/* binding */ clientCredentialsGrant),
/* harmony export */   clockSkew: () => (/* binding */ clockSkew),
/* harmony export */   clockTolerance: () => (/* binding */ clockTolerance),
/* harmony export */   customFetch: () => (/* binding */ customFetch),
/* harmony export */   discovery: () => (/* binding */ discovery),
/* harmony export */   dynamicClientRegistration: () => (/* binding */ dynamicClientRegistration),
/* harmony export */   enableDecryptingResponses: () => (/* binding */ enableDecryptingResponses),
/* harmony export */   enableDetachedSignatureResponseChecks: () => (/* binding */ enableDetachedSignatureResponseChecks),
/* harmony export */   enableNonRepudiationChecks: () => (/* binding */ enableNonRepudiationChecks),
/* harmony export */   fetchProtectedResource: () => (/* binding */ fetchProtectedResource),
/* harmony export */   fetchUserInfo: () => (/* binding */ fetchUserInfo),
/* harmony export */   genericGrantRequest: () => (/* binding */ genericGrantRequest),
/* harmony export */   getDPoPHandle: () => (/* binding */ getDPoPHandle),
/* harmony export */   getJwksCache: () => (/* binding */ getJwksCache),
/* harmony export */   implicitAuthentication: () => (/* binding */ implicitAuthentication),
/* harmony export */   initiateBackchannelAuthentication: () => (/* binding */ initiateBackchannelAuthentication),
/* harmony export */   initiateDeviceAuthorization: () => (/* binding */ initiateDeviceAuthorization),
/* harmony export */   modifyAssertion: () => (/* binding */ modifyAssertion),
/* harmony export */   pollBackchannelAuthenticationGrant: () => (/* binding */ pollBackchannelAuthenticationGrant),
/* harmony export */   pollDeviceAuthorizationGrant: () => (/* binding */ pollDeviceAuthorizationGrant),
/* harmony export */   randomDPoPKeyPair: () => (/* binding */ randomDPoPKeyPair),
/* harmony export */   randomNonce: () => (/* binding */ randomNonce),
/* harmony export */   randomPKCECodeVerifier: () => (/* binding */ randomPKCECodeVerifier),
/* harmony export */   randomState: () => (/* binding */ randomState),
/* harmony export */   refreshTokenGrant: () => (/* binding */ refreshTokenGrant),
/* harmony export */   setJwksCache: () => (/* binding */ setJwksCache),
/* harmony export */   skipStateCheck: () => (/* binding */ skipStateCheck),
/* harmony export */   skipSubjectCheck: () => (/* binding */ skipSubjectCheck),
/* harmony export */   tokenIntrospection: () => (/* binding */ tokenIntrospection),
/* harmony export */   tokenRevocation: () => (/* binding */ tokenRevocation),
/* harmony export */   useCodeIdTokenResponseType: () => (/* binding */ useCodeIdTokenResponseType),
/* harmony export */   useIdTokenResponseType: () => (/* binding */ useIdTokenResponseType),
/* harmony export */   useJwtResponseMode: () => (/* binding */ useJwtResponseMode)
/* harmony export */ });
/* harmony import */ var oauth4webapi__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! oauth4webapi */ "./node_modules/oauth4webapi/build/index.js");
/* harmony import */ var jose_jwe_compact_decrypt__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! jose/jwe/compact/decrypt */ "./node_modules/jose/dist/webapi/jwe/compact/decrypt.js");
/* harmony import */ var jose_errors__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! jose/errors */ "./node_modules/jose/dist/webapi/util/errors.js");



let headers;
let USER_AGENT;
if (typeof navigator === 'undefined' || !navigator.userAgent?.startsWith?.('Mozilla/5.0 ')) {
    const NAME = 'openid-client';
    const VERSION = 'v6.6.4';
    USER_AGENT = `${NAME}/${VERSION}`;
    headers = { 'user-agent': USER_AGENT };
}
const int = (config) => {
    return props.get(config);
};
let props;

let tbi;
function ClientSecretPost(clientSecret) {
    if (clientSecret !== undefined) {
        return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.ClientSecretPost(clientSecret);
    }
    tbi ||= new WeakMap();
    return (as, client, body, headers) => {
        let auth;
        if (!(auth = tbi.get(client))) {
            assertString(client.client_secret, '"metadata.client_secret"');
            auth = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.ClientSecretPost(client.client_secret);
            tbi.set(client, auth);
        }
        return auth(as, client, body, headers);
    };
}
function assertString(input, it) {
    if (typeof input !== 'string') {
        throw CodedTypeError(`${it} must be a string`, ERR_INVALID_ARG_TYPE);
    }
    if (input.length === 0) {
        throw CodedTypeError(`${it} must not be empty`, ERR_INVALID_ARG_VALUE);
    }
}
function ClientSecretBasic(clientSecret) {
    if (clientSecret !== undefined) {
        return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.ClientSecretBasic(clientSecret);
    }
    tbi ||= new WeakMap();
    return (as, client, body, headers) => {
        let auth;
        if (!(auth = tbi.get(client))) {
            assertString(client.client_secret, '"metadata.client_secret"');
            auth = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.ClientSecretBasic(client.client_secret);
            tbi.set(client, auth);
        }
        return auth(as, client, body, headers);
    };
}
function ClientSecretJwt(clientSecret, options) {
    if (clientSecret !== undefined) {
        return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.ClientSecretJwt(clientSecret, options);
    }
    tbi ||= new WeakMap();
    return (as, client, body, headers) => {
        let auth;
        if (!(auth = tbi.get(client))) {
            assertString(client.client_secret, '"metadata.client_secret"');
            auth = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.ClientSecretJwt(client.client_secret, options);
            tbi.set(client, auth);
        }
        return auth(as, client, body, headers);
    };
}
function None() {
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.None();
}
function PrivateKeyJwt(clientPrivateKey, options) {
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.PrivateKeyJwt(clientPrivateKey, options);
}
function TlsClientAuth() {
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.TlsClientAuth();
}
const skipStateCheck = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.skipStateCheck;
const skipSubjectCheck = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.skipSubjectCheck;
const customFetch = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch;
const modifyAssertion = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.modifyAssertion;
const clockSkew = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clockSkew;
const clockTolerance = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clockTolerance;
const ERR_INVALID_ARG_VALUE = 'ERR_INVALID_ARG_VALUE';
const ERR_INVALID_ARG_TYPE = 'ERR_INVALID_ARG_TYPE';
function CodedTypeError(message, code, cause) {
    const err = new TypeError(message, { cause });
    Object.assign(err, { code });
    return err;
}
function calculatePKCECodeChallenge(codeVerifier) {
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.calculatePKCECodeChallenge(codeVerifier);
}
function randomPKCECodeVerifier() {
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.generateRandomCodeVerifier();
}
function randomNonce() {
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.generateRandomNonce();
}
function randomState() {
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.generateRandomState();
}
class ClientError extends Error {
    code;
    constructor(message, options) {
        super(message, options);
        this.name = this.constructor.name;
        this.code = options?.code;
        Error.captureStackTrace?.(this, this.constructor);
    }
}
const decoder = new TextDecoder();
function e(msg, cause, code) {
    return new ClientError(msg, { cause, code });
}
function errorHandler(err) {
    if (err instanceof TypeError ||
        err instanceof ClientError ||
        err instanceof oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.ResponseBodyError ||
        err instanceof oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.AuthorizationResponseError ||
        err instanceof oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.WWWAuthenticateChallengeError) {
        throw err;
    }
    if (err instanceof oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.OperationProcessingError) {
        switch (err.code) {
            case oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.HTTP_REQUEST_FORBIDDEN:
                throw e('only requests to HTTPS are allowed', err, err.code);
            case oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.REQUEST_PROTOCOL_FORBIDDEN:
                throw e('only requests to HTTP or HTTPS are allowed', err, err.code);
            case oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.RESPONSE_IS_NOT_CONFORM:
                throw e('unexpected HTTP response status code', err.cause, err.code);
            case oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.RESPONSE_IS_NOT_JSON:
                throw e('unexpected response content-type', err.cause, err.code);
            case oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.PARSE_ERROR:
                throw e('parsing error occured', err, err.code);
            case oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.INVALID_RESPONSE:
                throw e('invalid response encountered', err, err.code);
            case oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.JWT_CLAIM_COMPARISON:
                throw e('unexpected JWT claim value encountered', err, err.code);
            case oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.JSON_ATTRIBUTE_COMPARISON:
                throw e('unexpected JSON attribute value encountered', err, err.code);
            case oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.JWT_TIMESTAMP_CHECK:
                throw e('JWT timestamp claim value failed validation', err, err.code);
            default:
                throw e(err.message, err, err.code);
        }
    }
    if (err instanceof oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.UnsupportedOperationError) {
        throw e('unsupported operation', err, err.code);
    }
    if (err instanceof DOMException) {
        switch (err.name) {
            case 'OperationError':
                throw e('runtime operation error', err, oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.UNSUPPORTED_OPERATION);
            case 'NotSupportedError':
                throw e('runtime unsupported operation', err, oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.UNSUPPORTED_OPERATION);
            case 'TimeoutError':
                throw e('operation timed out', err, 'OAUTH_TIMEOUT');
            case 'AbortError':
                throw e('operation aborted', err, 'OAUTH_ABORT');
        }
    }
    throw new ClientError('something went wrong', { cause: err });
}
function randomDPoPKeyPair(alg, options) {
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.generateKeyPair(alg ?? 'ES256', {
        extractable: options?.extractable,
    })
        .catch(errorHandler);
}
function handleEntraId(server, as, options) {
    if (server.origin === 'https://login.microsoftonline.com' &&
        (!options?.algorithm || options.algorithm === 'oidc')) {
        as[kEntraId] = true;
        return true;
    }
    return false;
}
function handleB2Clogin(server, options) {
    if (server.hostname.endsWith('.b2clogin.com') &&
        (!options?.algorithm || options.algorithm === 'oidc')) {
        return true;
    }
    return false;
}
async function dynamicClientRegistration(server, metadata, clientAuthentication, options) {
    let as;
    if (options?.flag === retry) {
        as = options.as;
    }
    else {
        as = await performDiscovery(server, options);
    }
    const clockSkew = metadata[oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clockSkew] ?? 0;
    const clockTolerance = metadata[oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clockTolerance] ?? 30;
    metadata = structuredClone(metadata);
    const timeout = options?.timeout ?? 30;
    const signal = AbortSignal.timeout(timeout * 1000);
    let registered;
    try {
        registered = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.dynamicClientRegistrationRequest(as, metadata, {
            initialAccessToken: options?.initialAccessToken,
            DPoP: options?.DPoP,
            headers: new Headers(headers),
            [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: options?.[customFetch],
            [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: options?.execute?.includes(allowInsecureRequests),
            signal,
        })
            .then(oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processDynamicClientRegistrationResponse);
    }
    catch (err) {
        if (retryable(err, options)) {
            return dynamicClientRegistration(server, metadata, clientAuthentication, {
                ...options,
                flag: retry,
                as,
            });
        }
        errorHandler(err);
    }
    registered[oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clockSkew] = clockSkew;
    registered[oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clockTolerance] = clockTolerance;
    const instance = new Configuration(as, registered.client_id, registered, clientAuthentication);
    let internals = int(instance);
    if (options?.[customFetch]) {
        internals.fetch = options[customFetch];
    }
    if (options?.timeout) {
        internals.timeout = options.timeout;
    }
    if (options?.execute) {
        for (const extension of options.execute) {
            extension(instance);
        }
    }
    return instance;
}
async function discovery(server, clientId, metadata, clientAuthentication, options) {
    const as = await performDiscovery(server, options);
    const instance = new Configuration(as, clientId, metadata, clientAuthentication);
    let internals = int(instance);
    if (options?.[customFetch]) {
        internals.fetch = options[customFetch];
    }
    if (options?.timeout) {
        internals.timeout = options.timeout;
    }
    if (options?.execute) {
        for (const extension of options.execute) {
            extension(instance);
        }
    }
    return instance;
}
async function performDiscovery(server, options) {
    if (!(server instanceof URL)) {
        throw CodedTypeError('"server" must be an instance of URL', ERR_INVALID_ARG_TYPE);
    }
    const resolve = !server.href.includes('/.well-known/');
    const timeout = options?.timeout ?? 30;
    const signal = AbortSignal.timeout(timeout * 1000);
    const as = await (resolve
        ? oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.discoveryRequest(server, {
            algorithm: options?.algorithm,
            [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: options?.[customFetch],
            [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: options?.execute?.includes(allowInsecureRequests),
            signal,
            headers: new Headers(headers),
        })
        : (options?.[customFetch] || fetch)((() => {
            oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.checkProtocol(server, options?.execute?.includes(allowInsecureRequests) ? false : true);
            return server.href;
        })(), {
            headers: Object.fromEntries(new Headers({ accept: 'application/json', ...headers }).entries()),
            body: undefined,
            method: 'GET',
            redirect: 'manual',
            signal,
        }))
        .then((response) => oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processDiscoveryResponse(oauth4webapi__WEBPACK_IMPORTED_MODULE_0__._nodiscoverycheck, response))
        .catch(errorHandler);
    if (resolve && new URL(as.issuer).href !== server.href) {
        handleEntraId(server, as, options) ||
            handleB2Clogin(server, options) ||
            (() => {
                throw new ClientError('discovered metadata issuer does not match the expected issuer', {
                    code: oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.JSON_ATTRIBUTE_COMPARISON,
                    cause: {
                        expected: server.href,
                        body: as,
                        attribute: 'issuer',
                    },
                });
            })();
    }
    return as;
}
function isRsaOaep(input) {
    return input.name === 'RSA-OAEP';
}
function isEcdh(input) {
    return input.name === 'ECDH';
}
const ecdhEs = 'ECDH-ES';
const ecdhEsA128Kw = 'ECDH-ES+A128KW';
const ecdhEsA192Kw = 'ECDH-ES+A192KW';
const ecdhEsA256Kw = 'ECDH-ES+A256KW';
function checkEcdhAlg(algs, alg, pk) {
    switch (alg) {
        case undefined:
            algs.add(ecdhEs);
            algs.add(ecdhEsA128Kw);
            algs.add(ecdhEsA192Kw);
            algs.add(ecdhEsA256Kw);
            break;
        case ecdhEs:
        case ecdhEsA128Kw:
        case ecdhEsA192Kw:
        case ecdhEsA256Kw:
            algs.add(alg);
            break;
        default:
            throw CodedTypeError('invalid key alg', ERR_INVALID_ARG_VALUE, { pk });
    }
}
function enableDecryptingResponses(config, contentEncryptionAlgorithms = [
    'A128GCM',
    'A192GCM',
    'A256GCM',
    'A128CBC-HS256',
    'A192CBC-HS384',
    'A256CBC-HS512',
], ...keys) {
    if (int(config).decrypt !== undefined) {
        throw new TypeError('enableDecryptingResponses can only be called on a given Configuration instance once');
    }
    if (keys.length === 0) {
        throw CodedTypeError('no keys were provided', ERR_INVALID_ARG_VALUE);
    }
    const algs = new Set();
    const normalized = [];
    for (const pk of keys) {
        let key;
        if ('key' in pk) {
            key = { key: pk.key };
            if (typeof pk.alg === 'string')
                key.alg = pk.alg;
            if (typeof pk.kid === 'string')
                key.kid = pk.kid;
        }
        else {
            key = { key: pk };
        }
        if (key.key.type !== 'private') {
            throw CodedTypeError('only private keys must be provided', ERR_INVALID_ARG_VALUE);
        }
        if (isRsaOaep(key.key.algorithm)) {
            switch (key.key.algorithm.hash.name) {
                case 'SHA-1':
                case 'SHA-256':
                case 'SHA-384':
                case 'SHA-512': {
                    let alg = 'RSA-OAEP';
                    let sha;
                    if ((sha = parseInt(key.key.algorithm.hash.name.slice(-3), 10))) {
                        alg = `${alg}-${sha}`;
                    }
                    key.alg ||= alg;
                    if (alg !== key.alg)
                        throw CodedTypeError('invalid key alg', ERR_INVALID_ARG_VALUE, {
                            pk,
                        });
                    algs.add(key.alg);
                    break;
                }
                default:
                    throw CodedTypeError('only SHA-512, SHA-384, SHA-256, and SHA-1 RSA-OAEP keys are supported', ERR_INVALID_ARG_VALUE);
            }
        }
        else if (isEcdh(key.key.algorithm)) {
            if (key.key.algorithm.namedCurve !== 'P-256') {
                throw CodedTypeError('Only P-256 ECDH keys are supported', ERR_INVALID_ARG_VALUE);
            }
            checkEcdhAlg(algs, key.alg, pk);
        }
        else if (key.key.algorithm.name === 'X25519') {
            checkEcdhAlg(algs, key.alg, pk);
        }
        else {
            throw CodedTypeError('only RSA-OAEP, ECDH, or X25519 keys are supported', ERR_INVALID_ARG_VALUE);
        }
        normalized.push(key);
    }
    int(config).decrypt = async (jwe) => decrypt(normalized, jwe, contentEncryptionAlgorithms, [...algs]).catch(errorHandler);
}
function checkCryptoKey(key, alg, epk) {
    if (alg.startsWith('RSA-OAEP')) {
        return true;
    }
    if (alg.startsWith('ECDH-ES')) {
        if (key.algorithm.name !== 'ECDH' && key.algorithm.name !== 'X25519') {
            return false;
        }
        if (key.algorithm.name === 'ECDH') {
            return epk?.crv === key.algorithm.namedCurve;
        }
        if (key.algorithm.name === 'X25519') {
            return epk?.crv === 'X25519';
        }
    }
    return false;
}
function selectCryptoKeyForDecryption(keys, alg, kid, epk) {
    const { 0: key, length } = keys.filter((key) => {
        if (kid !== key.kid) {
            return false;
        }
        if (key.alg && alg !== key.alg) {
            return false;
        }
        return checkCryptoKey(key.key, alg, epk);
    });
    if (!key) {
        throw e('no applicable decryption key selected', undefined, 'OAUTH_DECRYPTION_FAILED');
    }
    if (length !== 1) {
        throw e('multiple applicable decryption keys selected', undefined, 'OAUTH_DECRYPTION_FAILED');
    }
    return key.key;
}
async function decrypt(keys, jwe, contentEncryptionAlgorithms, keyManagementAlgorithms) {
    return decoder.decode((await (0,jose_jwe_compact_decrypt__WEBPACK_IMPORTED_MODULE_1__.compactDecrypt)(jwe, (header) => {
        const { kid, alg, epk } = header;
        return selectCryptoKeyForDecryption(keys, alg, kid, epk);
    }, { keyManagementAlgorithms, contentEncryptionAlgorithms }).catch((err) => {
        if (err instanceof jose_errors__WEBPACK_IMPORTED_MODULE_2__.JOSEError) {
            throw e('decryption failed', err, 'OAUTH_DECRYPTION_FAILED');
        }
        errorHandler(err);
    })).plaintext);
}
function getServerHelpers(metadata) {
    return {
        supportsPKCE: {
            __proto__: null,
            value(method = 'S256') {
                return (metadata.code_challenge_methods_supported?.includes(method) === true);
            },
        },
    };
}
function addServerHelpers(metadata) {
    Object.defineProperties(metadata, getServerHelpers(metadata));
}
const kEntraId = Symbol();
class Configuration {
    constructor(server, clientId, metadata, clientAuthentication) {
        if (typeof clientId !== 'string' || !clientId.length) {
            throw CodedTypeError('"clientId" must be a non-empty string', ERR_INVALID_ARG_TYPE);
        }
        if (typeof metadata === 'string') {
            metadata = { client_secret: metadata };
        }
        if (metadata?.client_id !== undefined && clientId !== metadata.client_id) {
            throw CodedTypeError('"clientId" and "metadata.client_id" must be the same', ERR_INVALID_ARG_VALUE);
        }
        const client = {
            ...structuredClone(metadata),
            client_id: clientId,
        };
        client[oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clockSkew] = metadata?.[oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clockSkew] ?? 0;
        client[oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clockTolerance] = metadata?.[oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clockTolerance] ?? 30;
        let auth;
        if (clientAuthentication) {
            auth = clientAuthentication;
        }
        else {
            if (typeof client.client_secret === 'string' &&
                client.client_secret.length) {
                auth = ClientSecretPost(client.client_secret);
            }
            else {
                auth = None();
            }
        }
        let c = Object.freeze(client);
        const clone = structuredClone(server);
        if (kEntraId in server) {
            clone[oauth4webapi__WEBPACK_IMPORTED_MODULE_0__._expectedIssuer] = ({ claims: { tid } }) => server.issuer.replace('{tenantid}', tid);
        }
        let as = Object.freeze(clone);
        props ||= new WeakMap();
        props.set(this, {
            __proto__: null,
            as,
            c,
            auth,
            tlsOnly: true,
            jwksCache: {},
        });
    }
    serverMetadata() {
        const metadata = structuredClone(int(this).as);
        addServerHelpers(metadata);
        return metadata;
    }
    clientMetadata() {
        const metadata = structuredClone(int(this).c);
        return metadata;
    }
    get timeout() {
        return int(this).timeout;
    }
    set timeout(value) {
        int(this).timeout = value;
    }
    get [customFetch]() {
        return int(this).fetch;
    }
    set [customFetch](value) {
        int(this).fetch = value;
    }
}
Object.freeze(Configuration.prototype);
function getHelpers(response) {
    let exp = undefined;
    if (response.expires_in !== undefined) {
        const now = new Date();
        now.setSeconds(now.getSeconds() + response.expires_in);
        exp = now.getTime();
    }
    return {
        expiresIn: {
            __proto__: null,
            value() {
                if (exp) {
                    const now = Date.now();
                    if (exp > now) {
                        return Math.floor((exp - now) / 1000);
                    }
                    return 0;
                }
                return undefined;
            },
        },
        claims: {
            __proto__: null,
            value() {
                try {
                    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.getValidatedIdTokenClaims(this);
                }
                catch {
                    return undefined;
                }
            },
        },
    };
}
function addHelpers(response) {
    Object.defineProperties(response, getHelpers(response));
}
function getDPoPHandle(config, keyPair, options) {
    checkConfig(config);
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.DPoP(int(config).c, keyPair, options);
}
function wait(interval) {
    return new Promise((resolve) => {
        setTimeout(resolve, interval * 1000);
    });
}
async function pollDeviceAuthorizationGrant(config, deviceAuthorizationResponse, parameters, options) {
    checkConfig(config);
    parameters = new URLSearchParams(parameters);
    let interval = deviceAuthorizationResponse.interval ?? 5;
    const pollingSignal = options?.signal ??
        AbortSignal.timeout(deviceAuthorizationResponse.expires_in * 1000);
    try {
        pollingSignal.throwIfAborted();
    }
    catch (err) {
        errorHandler(err);
    }
    await wait(interval);
    const { as, c, auth, fetch, tlsOnly, nonRepudiation, timeout, decrypt } = int(config);
    const response = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.deviceCodeGrantRequest(as, c, auth, deviceAuthorizationResponse.device_code, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        additionalParameters: parameters,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: pollingSignal.aborted ? pollingSignal : signal(timeout),
    })
        .catch(errorHandler);
    const p = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processDeviceCodeResponse(as, c, response, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jweDecrypt]: decrypt,
    });
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return pollDeviceAuthorizationGrant(config, {
                ...deviceAuthorizationResponse,
                interval,
            }, parameters, {
                ...options,
                signal: pollingSignal,
                flag: retry,
            });
        }
        if (err instanceof oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.ResponseBodyError) {
            switch (err.error) {
                case 'slow_down':
                    interval += 5;
                case 'authorization_pending':
                    return pollDeviceAuthorizationGrant(config, {
                        ...deviceAuthorizationResponse,
                        interval,
                    }, parameters, {
                        ...options,
                        signal: pollingSignal,
                        flag: undefined,
                    });
            }
        }
        errorHandler(err);
    }
    result.id_token && (await nonRepudiation?.(response));
    addHelpers(result);
    return result;
}
async function initiateDeviceAuthorization(config, parameters) {
    checkConfig(config);
    const { as, c, auth, fetch, tlsOnly, timeout } = int(config);
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.deviceAuthorizationRequest(as, c, auth, parameters, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .then((response) => oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processDeviceAuthorizationResponse(as, c, response))
        .catch(errorHandler);
}
async function initiateBackchannelAuthentication(config, parameters) {
    checkConfig(config);
    const { as, c, auth, fetch, tlsOnly, timeout } = int(config);
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.backchannelAuthenticationRequest(as, c, auth, parameters, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .then((response) => oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processBackchannelAuthenticationResponse(as, c, response))
        .catch(errorHandler);
}
async function pollBackchannelAuthenticationGrant(config, backchannelAuthenticationResponse, parameters, options) {
    checkConfig(config);
    parameters = new URLSearchParams(parameters);
    let interval = backchannelAuthenticationResponse.interval ?? 5;
    const pollingSignal = options?.signal ??
        AbortSignal.timeout(backchannelAuthenticationResponse.expires_in * 1000);
    try {
        pollingSignal.throwIfAborted();
    }
    catch (err) {
        errorHandler(err);
    }
    await wait(interval);
    const { as, c, auth, fetch, tlsOnly, nonRepudiation, timeout, decrypt } = int(config);
    const response = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.backchannelAuthenticationGrantRequest(as, c, auth, backchannelAuthenticationResponse.auth_req_id, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        additionalParameters: parameters,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: pollingSignal.aborted ? pollingSignal : signal(timeout),
    })
        .catch(errorHandler);
    const p = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processBackchannelAuthenticationGrantResponse(as, c, response, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jweDecrypt]: decrypt,
    });
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return pollBackchannelAuthenticationGrant(config, {
                ...backchannelAuthenticationResponse,
                interval,
            }, parameters, {
                ...options,
                signal: pollingSignal,
                flag: retry,
            });
        }
        if (err instanceof oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.ResponseBodyError) {
            switch (err.error) {
                case 'slow_down':
                    interval += 5;
                case 'authorization_pending':
                    return pollBackchannelAuthenticationGrant(config, {
                        ...backchannelAuthenticationResponse,
                        interval,
                    }, parameters, {
                        ...options,
                        signal: pollingSignal,
                        flag: undefined,
                    });
            }
        }
        errorHandler(err);
    }
    result.id_token && (await nonRepudiation?.(response));
    addHelpers(result);
    return result;
}
function allowInsecureRequests(config) {
    int(config).tlsOnly = false;
}
function setJwksCache(config, jwksCache) {
    int(config).jwksCache = structuredClone(jwksCache);
}
function getJwksCache(config) {
    const cache = int(config).jwksCache;
    if (cache.uat) {
        return cache;
    }
    return undefined;
}
function enableNonRepudiationChecks(config) {
    checkConfig(config);
    int(config).nonRepudiation = (response) => {
        const { as, fetch, tlsOnly, timeout, jwksCache } = int(config);
        return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.validateApplicationLevelSignature(as, response, {
            [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
            [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
            headers: new Headers(headers),
            signal: signal(timeout),
            [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jwksCache]: jwksCache,
        })
            .catch(errorHandler);
    };
}
function useJwtResponseMode(config) {
    checkConfig(config);
    const { hybrid, implicit } = int(config);
    if (hybrid || implicit) {
        throw e('JARM cannot be combined with a hybrid or implicit response types', undefined, oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.UNSUPPORTED_OPERATION);
    }
    int(config).jarm = (authorizationResponse, expectedState) => validateJARMResponse(config, authorizationResponse, expectedState);
}
function enableDetachedSignatureResponseChecks(config) {
    if (!int(config).hybrid) {
        throw e('"code id_token" response type must be configured to be used first', undefined, oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.UNSUPPORTED_OPERATION);
    }
    int(config).hybrid = (authorizationResponse, expectedNonce, expectedState, maxAge) => validateCodeIdTokenResponse(config, authorizationResponse, expectedNonce, expectedState, maxAge, true);
}
async function implicitAuthentication(config, currentUrl, expectedNonce, checks) {
    checkConfig(config);
    if (!(currentUrl instanceof URL) &&
        !webInstanceOf(currentUrl, 'Request')) {
        throw CodedTypeError('"currentUrl" must be an instance of URL, or Request', ERR_INVALID_ARG_TYPE);
    }
    if (typeof expectedNonce !== 'string') {
        throw CodedTypeError('"expectedNonce" must be a string', ERR_INVALID_ARG_TYPE);
    }
    const { as, c, fetch, tlsOnly, timeout, decrypt, implicit, jwksCache } = int(config);
    if (!implicit) {
        throw new TypeError('implicitAuthentication() cannot be used by clients using flows other than response_type=id_token');
    }
    let params;
    if (!(currentUrl instanceof URL)) {
        const request = currentUrl;
        switch (request.method) {
            case 'GET':
                params = new URLSearchParams(new URL(request.url).hash.slice(1));
                break;
            case 'POST':
                params = new URLSearchParams(await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.formPostResponse(request));
                break;
            default:
                throw CodedTypeError('unexpected Request HTTP method', ERR_INVALID_ARG_VALUE);
        }
    }
    else {
        params = new URLSearchParams(currentUrl.hash.slice(1));
    }
    try {
        {
            const decoy = new URLSearchParams(params);
            decoy.delete('id_token');
            oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.validateAuthResponse({
                ...as,
                authorization_response_iss_parameter_supported: undefined,
            }, c, decoy, checks?.expectedState);
        }
        {
            const decoy = new Response(JSON.stringify({
                access_token: 'decoy',
                token_type: 'bearer',
                id_token: params.get('id_token'),
            }), {
                headers: new Headers({ 'content-type': 'application/json' }),
            });
            const ref = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processAuthorizationCodeResponse(as, c, decoy, {
                expectedNonce,
                maxAge: checks?.maxAge,
                [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jweDecrypt]: decrypt,
            });
            await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.validateApplicationLevelSignature(as, decoy, {
                [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
                [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
                headers: new Headers(headers),
                signal: signal(timeout),
                [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jwksCache]: jwksCache,
            });
            return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.getValidatedIdTokenClaims(ref);
        }
    }
    catch (err) {
        errorHandler(err);
    }
}
function useCodeIdTokenResponseType(config) {
    checkConfig(config);
    const { jarm, implicit } = int(config);
    if (jarm || implicit) {
        throw e('"code id_token" response type cannot be combined with JARM or implicit response type', undefined, oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.UNSUPPORTED_OPERATION);
    }
    int(config).hybrid = (authorizationResponse, expectedNonce, expectedState, maxAge) => validateCodeIdTokenResponse(config, authorizationResponse, expectedNonce, expectedState, maxAge, false);
}
function useIdTokenResponseType(config) {
    checkConfig(config);
    const { jarm, hybrid } = int(config);
    if (jarm || hybrid) {
        throw e('"id_token" response type cannot be combined with JARM or hybrid response type', undefined, oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.UNSUPPORTED_OPERATION);
    }
    int(config).implicit = true;
}
function stripParams(url) {
    url = new URL(url);
    url.search = '';
    url.hash = '';
    return url.href;
}
function webInstanceOf(input, toStringTag) {
    try {
        return Object.getPrototypeOf(input)[Symbol.toStringTag] === toStringTag;
    }
    catch {
        return false;
    }
}
async function authorizationCodeGrant(config, currentUrl, checks, tokenEndpointParameters, options) {
    checkConfig(config);
    if (options?.flag !== retry &&
        !(currentUrl instanceof URL) &&
        !webInstanceOf(currentUrl, 'Request')) {
        throw CodedTypeError('"currentUrl" must be an instance of URL, or Request', ERR_INVALID_ARG_TYPE);
    }
    let authResponse;
    let redirectUri;
    const { as, c, auth, fetch, tlsOnly, jarm, hybrid, nonRepudiation, timeout, decrypt, implicit } = int(config);
    if (options?.flag === retry) {
        authResponse = options.authResponse;
        redirectUri = options.redirectUri;
    }
    else {
        if (!(currentUrl instanceof URL)) {
            const request = currentUrl;
            currentUrl = new URL(currentUrl.url);
            switch (request.method) {
                case 'GET':
                    break;
                case 'POST':
                    const params = new URLSearchParams(await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.formPostResponse(request));
                    if (hybrid) {
                        currentUrl.hash = params.toString();
                    }
                    else {
                        for (const [k, v] of params.entries()) {
                            currentUrl.searchParams.append(k, v);
                        }
                    }
                    break;
                default:
                    throw CodedTypeError('unexpected Request HTTP method', ERR_INVALID_ARG_VALUE);
            }
        }
        redirectUri = stripParams(currentUrl);
        switch (true) {
            case !!jarm:
                authResponse = await jarm(currentUrl, checks?.expectedState);
                break;
            case !!hybrid:
                authResponse = await hybrid(currentUrl, checks?.expectedNonce, checks?.expectedState, checks?.maxAge);
                break;
            case !!implicit:
                throw new TypeError('authorizationCodeGrant() cannot be used by response_type=id_token clients');
            default:
                try {
                    authResponse = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.validateAuthResponse(as, c, currentUrl.searchParams, checks?.expectedState);
                }
                catch (err) {
                    errorHandler(err);
                }
        }
    }
    const response = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.authorizationCodeGrantRequest(as, c, auth, authResponse, redirectUri, checks?.pkceCodeVerifier || oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.nopkce, {
        additionalParameters: tokenEndpointParameters,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    if (typeof checks?.expectedNonce === 'string' ||
        typeof checks?.maxAge === 'number') {
        checks.idTokenExpected = true;
    }
    const p = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processAuthorizationCodeResponse(as, c, response, {
        expectedNonce: checks?.expectedNonce,
        maxAge: checks?.maxAge,
        requireIdToken: checks?.idTokenExpected,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jweDecrypt]: decrypt,
    });
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return authorizationCodeGrant(config, undefined, checks, tokenEndpointParameters, {
                ...options,
                flag: retry,
                authResponse: authResponse,
                redirectUri: redirectUri,
            });
        }
        errorHandler(err);
    }
    result.id_token && (await nonRepudiation?.(response));
    addHelpers(result);
    return result;
}
async function validateJARMResponse(config, authorizationResponse, expectedState) {
    const { as, c, fetch, tlsOnly, timeout, decrypt, jwksCache } = int(config);
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.validateJwtAuthResponse(as, c, authorizationResponse, expectedState, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        headers: new Headers(headers),
        signal: signal(timeout),
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jweDecrypt]: decrypt,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jwksCache]: jwksCache,
    })
        .catch(errorHandler);
}
async function validateCodeIdTokenResponse(config, authorizationResponse, expectedNonce, expectedState, maxAge, fapi) {
    if (typeof expectedNonce !== 'string') {
        throw CodedTypeError('"expectedNonce" must be a string', ERR_INVALID_ARG_TYPE);
    }
    if (expectedState !== undefined && typeof expectedState !== 'string') {
        throw CodedTypeError('"expectedState" must be a string', ERR_INVALID_ARG_TYPE);
    }
    const { as, c, fetch, tlsOnly, timeout, decrypt, jwksCache } = int(config);
    return (fapi
        ? oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.validateDetachedSignatureResponse
        : oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.validateCodeIdTokenResponse)(as, c, authorizationResponse, expectedNonce, expectedState, maxAge, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        headers: new Headers(headers),
        signal: signal(timeout),
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jweDecrypt]: decrypt,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jwksCache]: jwksCache,
    }).catch(errorHandler);
}
async function refreshTokenGrant(config, refreshToken, parameters, options) {
    checkConfig(config);
    parameters = new URLSearchParams(parameters);
    const { as, c, auth, fetch, tlsOnly, nonRepudiation, timeout, decrypt } = int(config);
    const response = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.refreshTokenGrantRequest(as, c, auth, refreshToken, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        additionalParameters: parameters,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    const p = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processRefreshTokenResponse(as, c, response, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jweDecrypt]: decrypt,
    });
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return refreshTokenGrant(config, refreshToken, parameters, {
                ...options,
                flag: retry,
            });
        }
        errorHandler(err);
    }
    result.id_token && (await nonRepudiation?.(response));
    addHelpers(result);
    return result;
}
async function clientCredentialsGrant(config, parameters, options) {
    checkConfig(config);
    parameters = new URLSearchParams(parameters);
    const { as, c, auth, fetch, tlsOnly, timeout } = int(config);
    const response = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.clientCredentialsGrantRequest(as, c, auth, parameters, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    const p = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processClientCredentialsResponse(as, c, response);
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return clientCredentialsGrant(config, parameters, {
                ...options,
                flag: retry,
            });
        }
        errorHandler(err);
    }
    addHelpers(result);
    return result;
}
function buildAuthorizationUrl(config, parameters) {
    checkConfig(config);
    const { as, c, tlsOnly, hybrid, jarm, implicit } = int(config);
    const authorizationEndpoint = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.resolveEndpoint(as, 'authorization_endpoint', false, tlsOnly);
    parameters = new URLSearchParams(parameters);
    if (!parameters.has('client_id')) {
        parameters.set('client_id', c.client_id);
    }
    if (!parameters.has('request_uri') && !parameters.has('request')) {
        if (!parameters.has('response_type')) {
            parameters.set('response_type', hybrid ? 'code id_token' : implicit ? 'id_token' : 'code');
        }
        if (implicit && !parameters.has('nonce')) {
            throw CodedTypeError('response_type=id_token clients must provide a nonce parameter in their authorization request parameters', ERR_INVALID_ARG_VALUE);
        }
        if (jarm) {
            parameters.set('response_mode', 'jwt');
        }
    }
    for (const [k, v] of parameters.entries()) {
        authorizationEndpoint.searchParams.append(k, v);
    }
    return authorizationEndpoint;
}
async function buildAuthorizationUrlWithJAR(config, parameters, signingKey, options) {
    checkConfig(config);
    const authorizationEndpoint = buildAuthorizationUrl(config, parameters);
    parameters = authorizationEndpoint.searchParams;
    if (!signingKey) {
        throw CodedTypeError('"signingKey" must be provided', ERR_INVALID_ARG_VALUE);
    }
    const { as, c } = int(config);
    const request = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.issueRequestObject(as, c, parameters, signingKey, options)
        .catch(errorHandler);
    return buildAuthorizationUrl(config, { request });
}
async function buildAuthorizationUrlWithPAR(config, parameters, options) {
    checkConfig(config);
    const authorizationEndpoint = buildAuthorizationUrl(config, parameters);
    const { as, c, auth, fetch, tlsOnly, timeout } = int(config);
    const response = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.pushedAuthorizationRequest(as, c, auth, authorizationEndpoint.searchParams, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    const p = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processPushedAuthorizationResponse(as, c, response);
    let result;
    try {
        result = await p;
    }
    catch (err) {
        if (retryable(err, options)) {
            return buildAuthorizationUrlWithPAR(config, parameters, {
                ...options,
                flag: retry,
            });
        }
        errorHandler(err);
    }
    return buildAuthorizationUrl(config, { request_uri: result.request_uri });
}
function buildEndSessionUrl(config, parameters) {
    checkConfig(config);
    const { as, c, tlsOnly } = int(config);
    const endSessionEndpoint = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.resolveEndpoint(as, 'end_session_endpoint', false, tlsOnly);
    parameters = new URLSearchParams(parameters);
    if (!parameters.has('client_id')) {
        parameters.set('client_id', c.client_id);
    }
    for (const [k, v] of parameters.entries()) {
        endSessionEndpoint.searchParams.append(k, v);
    }
    return endSessionEndpoint;
}
function checkConfig(input) {
    if (!(input instanceof Configuration)) {
        throw CodedTypeError('"config" must be an instance of Configuration', ERR_INVALID_ARG_TYPE);
    }
    if (Object.getPrototypeOf(input) !== Configuration.prototype) {
        throw CodedTypeError('subclassing Configuration is not allowed', ERR_INVALID_ARG_VALUE);
    }
}
function signal(timeout) {
    return timeout ? AbortSignal.timeout(timeout * 1000) : undefined;
}
async function fetchUserInfo(config, accessToken, expectedSubject, options) {
    checkConfig(config);
    const { as, c, fetch, tlsOnly, nonRepudiation, timeout, decrypt } = int(config);
    const response = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.userInfoRequest(as, c, accessToken, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    let exec = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processUserInfoResponse(as, c, expectedSubject, response, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jweDecrypt]: decrypt,
    });
    let result;
    try {
        result = await exec;
    }
    catch (err) {
        if (retryable(err, options)) {
            return fetchUserInfo(config, accessToken, expectedSubject, {
                ...options,
                flag: retry,
            });
        }
        errorHandler(err);
    }
    oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.getContentType(response) === 'application/jwt' &&
        (await nonRepudiation?.(response));
    return result;
}
function retryable(err, options) {
    if (options?.DPoP && options.flag !== retry) {
        return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.isDPoPNonceError(err);
    }
    return false;
}
async function tokenIntrospection(config, token, parameters) {
    checkConfig(config);
    const { as, c, auth, fetch, tlsOnly, nonRepudiation, timeout, decrypt } = int(config);
    const response = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.introspectionRequest(as, c, auth, token, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        additionalParameters: new URLSearchParams(parameters),
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .catch(errorHandler);
    const result = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processIntrospectionResponse(as, c, response, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jweDecrypt]: decrypt,
    })
        .catch(errorHandler);
    oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.getContentType(response) === 'application/token-introspection+jwt' &&
        (await nonRepudiation?.(response));
    return result;
}
const retry = Symbol();
async function genericGrantRequest(config, grantType, parameters, options) {
    checkConfig(config);
    const { as, c, auth, fetch, tlsOnly, timeout, decrypt } = int(config);
    const result = await oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.genericTokenEndpointRequest(as, c, auth, grantType, new URLSearchParams(parameters), {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .then((response) => {
        let recognizedTokenTypes;
        if (grantType === 'urn:ietf:params:oauth:grant-type:token-exchange') {
            recognizedTokenTypes = { n_a: () => { } };
        }
        return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processGenericTokenEndpointResponse(as, c, response, {
            [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.jweDecrypt]: decrypt,
            recognizedTokenTypes,
        });
    })
        .catch(errorHandler);
    addHelpers(result);
    return result;
}
async function tokenRevocation(config, token, parameters) {
    checkConfig(config);
    const { as, c, auth, fetch, tlsOnly, timeout } = int(config);
    return oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.revocationRequest(as, c, auth, token, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        additionalParameters: new URLSearchParams(parameters),
        headers: new Headers(headers),
        signal: signal(timeout),
    })
        .then(oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.processRevocationResponse)
        .catch(errorHandler);
}
async function fetchProtectedResource(config, accessToken, url, method, body, headers, options) {
    checkConfig(config);
    headers ||= new Headers();
    if (!headers.has('user-agent')) {
        headers.set('user-agent', USER_AGENT);
    }
    const { fetch, tlsOnly, timeout } = int(config);
    const exec = oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.protectedResourceRequest(accessToken, method, url, headers, body, {
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.customFetch]: fetch,
        [oauth4webapi__WEBPACK_IMPORTED_MODULE_0__.allowInsecureRequests]: !tlsOnly,
        DPoP: options?.DPoP,
        signal: signal(timeout),
    });
    let result;
    try {
        result = await exec;
    }
    catch (err) {
        if (retryable(err, options)) {
            return fetchProtectedResource(config, accessToken, url, method, body, headers, {
                ...options,
                flag: retry,
            });
        }
        errorHandler(err);
    }
    return result;
}
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const electron_1 = __webpack_require__(/*! electron */ "electron");
const keytar = __importStar(__webpack_require__(/*! keytar */ "./node_modules/keytar/lib/keytar.js"));
const openidClient = __importStar(__webpack_require__(/*! openid-client */ "./node_modules/openid-client/build/index.js"));
const path = __importStar(__webpack_require__(/*! path */ "path"));
const dotenv = __importStar(__webpack_require__(/*! dotenv */ "./node_modules/dotenv/lib/main.js"));
dotenv.config();
// --- Auth0 Configuration ---
const auth0Domain = process.env.AUTH0_DOMAIN || '';
const auth0ClientId = process.env.AUTH0_CLIENT_ID || '';
const redirectUri = 'myapp://auth/callback';
const keytarService = 'SecureElectronApp';
const keytarAccount = 'RefreshToken';
let codeVerifier = null; // To store the verifier
let mainWindow = null;
let authConfig = null; // To store OIDC config
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (__webpack_require__(/*! electron-squirrel-startup */ "./node_modules/electron-squirrel-startup/index.js")) {
    electron_1.app.quit();
}
const createWindow = () => {
    // Create the browser window.
    mainWindow = new electron_1.BrowserWindow({
        height: 600,
        width: 800,
        webPreferences: {
            preload: 'C:\\Users\\dell\\Downloads\\secure-electron-app\\.webpack\\renderer\\main_window\\preload.js',
        },
    });
    // Apply a Content Security Policy
    electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: Object.assign(Object.assign({}, details.responseHeaders), { 'Content-Security-Policy': [
                    "default-src 'self';",
                    "script-src 'self' " + (!electron_1.app.isPackaged ? "'unsafe-eval'" : ""),
                    "style-src 'self' 'unsafe-inline';",
                    "img-src 'self' data: https://s.gravatar.com https://cdn.auth0.com https://i1.wp.com https://lh3.googleusercontent.com;",
                    "connect-src 'self' " + (!electron_1.app.isPackaged ? "ws://localhost:* ws://127.0.0.1:* ws://0.0.0.0:*" : ""),
                ].join(' ') }),
        });
    });
    // and load the index.html of the app.
    mainWindow.loadURL('http://localhost:3000/main_window/index.html');
    // Open the DevTools only if not running tests
};
electron_1.ipcMain.on('auth:start-login', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Starting OIDC login flow...');
    try {
        // 1. Discover OIDC provider metadata and create config
        const config = yield openidClient.discovery(new URL(`https://${auth0Domain}`), auth0ClientId, { redirect_uris: [redirectUri], response_types: ['code'] }, openidClient.None());
        // 2. Generate a code verifier and challenge for PKCE
        codeVerifier = openidClient.randomPKCECodeVerifier();
        const codeChallenge = yield openidClient.calculatePKCECodeChallenge(codeVerifier);
        // 3. Store the OIDC config for later use
        authConfig = config;
        // 4. Construct the authorization URL
        const authUrl = openidClient.buildAuthorizationUrl(config, {
            scope: 'openid profile email offline_access',
            response_mode: 'query',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            redirect_uri: redirectUri,
        });
        console.log('Opening external browser for authentication...');
        yield electron_1.shell.openExternal(authUrl.toString());
    }
    catch (err) {
        console.error('Error during login flow:', err);
    }
}));
// This function will handle the authentication callback
function handleAuthCallback(url) {
    (() => __awaiter(this, void 0, void 0, function* () {
        if (!authConfig || !codeVerifier) {
            console.error('OIDC config or code verifier not available.');
            return;
        }
        try {
            const tokenSet = yield openidClient.authorizationCodeGrant(authConfig, new URL(url), {
                pkceCodeVerifier: codeVerifier,
            });
            // Check if a refresh token exists and store it securely
            if (tokenSet.refresh_token) {
                yield keytar.setPassword(keytarService, keytarAccount, tokenSet.refresh_token);
                console.log('Refresh token stored securely.');
            }
            // Fetch userinfo if available
            let userinfo = {};
            if (tokenSet.access_token) {
                userinfo = yield openidClient.fetchUserInfo(authConfig, tokenSet.access_token, openidClient.skipSubjectCheck);
            }
            console.log('Successfully retrieved tokens and user info!');
            mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.send('auth:success', userinfo);
            // Bring the app window to the front
            if (mainWindow) {
                if (mainWindow.isMinimized())
                    mainWindow.restore();
                mainWindow.focus();
            }
            // Logout IPC handler
            electron_1.ipcMain.on('auth:logout', () => __awaiter(this, void 0, void 0, function* () {
                console.log('Logging out and clearing tokens...');
                yield keytar.deletePassword(keytarService, keytarAccount);
                // Optionally, you can also redirect to the Auth0 logout endpoint.
                mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.send('auth:logged-out');
            }));
        }
        catch (err) {
            console.error('Error exchanging code for tokens:', err);
            // You could also send an 'auth:failure' event to the renderer here
        }
    }))();
}
// Protocol event handlers (outside createWindow)
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// This must be the first block of code in the file.
electron_1.app.on('ready', () => {
    if (false) // removed by dead control flow
{}
    // Register custom protocol handler before window creation
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            electron_1.app.setAsDefaultProtocolClient('myapp', process.execPath, [path.resolve(process.argv[1])]);
        }
    }
    else {
        electron_1.app.setAsDefaultProtocolClient('myapp');
    }
    createWindow();
    // Handle macOS 'open-url' event
    electron_1.app.on('open-url', (event, url) => {
        event.preventDefault();
        void handleAuthCallback(url);
    });
    // Handle Windows/Linux protocol launch
    const gotTheLock = electron_1.app.requestSingleInstanceLock();
    if (!gotTheLock) {
        electron_1.app.quit();
    }
    else {
        electron_1.app.on('second-instance', (event, commandLine) => {
            // Someone tried to run a second instance, we should focus our window.
            if (mainWindow) {
                if (mainWindow.isMinimized())
                    mainWindow.restore();
                mainWindow.focus();
            }
            // The commandLine contains the full URL, find it
            const url = commandLine.pop();
            if (url && url.startsWith('myapp://')) {
                void handleAuthCallback(url);
            }
        });
    }
});
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
// Forward 'auth:success' from renderer (for testing)
electron_1.ipcMain.on('auth:success', (_event, userProfile) => {
    mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.send('auth:success', userProfile);
});


/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("electron");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "net":
/*!**********************!*\
  !*** external "net" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "tty":
/*!**********************!*\
  !*** external "tty" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __webpack_require__ !== 'undefined') __webpack_require__.ab = __dirname + "/native_modules/";
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/index.ts");
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map