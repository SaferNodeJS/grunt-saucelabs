// The global object is "self" in Web Workers.
global = (function() {
  return this;
})();

/**
 * Save timer references to avoid Sinon interfering (see GH-237).
 */

const Date = global.Date;
const setTimeout = global.setTimeout;
const setInterval = global.setInterval;
const clearTimeout = global.clearTimeout;
const clearInterval = global.clearInterval;

/**
 * Node shims.
 *
 * These are meant only to allow
 * mocha.js to run untouched, not
 * to allow running node code in
 * the browser.
 */

const process = {};
process.exit = function(status) {};
process.stdout = {};

const uncaughtExceptionHandlers = [];

/**
 * Remove uncaughtException listener.
 */

process.removeListener = function(e, fn) {
  if ('uncaughtException' == e) {
    global.onerror = function() {};
    const i = Mocha.utils.indexOf(uncaughtExceptionHandlers, fn);
    if (i != -1) {
      uncaughtExceptionHandlers.splice(i, 1);
    }
  }
};

/**
 * Implements uncaughtException listener.
 */

process.on = function(e, fn) {
  if ('uncaughtException' == e) {
    global.onerror = function(err, url, line) {
      fn(new Error(err + ' (' + url + ':' + line + ')'));
      return true;
    };
    uncaughtExceptionHandlers.push(fn);
  }
};

/**
 * Expose mocha.
 */

var Mocha = global.Mocha = require('mocha');
const mocha = global.mocha = new Mocha({reporter: 'html'});

// The BDD UI is registered by default, but no UI will be functional in the
// browser without an explicit call to the overridden `mocha.ui` (see below).
// Ensure that this default UI does not expose its methods to the global scope.
mocha.suite.removeAllListeners('pre-require');

const immediateQueue = []
  ; let immediateTimeout;

function timeslice() {
  const immediateStart = new Date().getTime();
  while (immediateQueue.length && (new Date().getTime() - immediateStart) < 100) {
    immediateQueue.shift()();
  }
  if (immediateQueue.length) {
    immediateTimeout = setTimeout(timeslice, 0);
  } else {
    immediateTimeout = null;
  }
}

/**
 * High-performance override of Runner.immediately.
 */

Mocha.Runner.immediately = function(callback) {
  immediateQueue.push(callback);
  if (!immediateTimeout) {
    immediateTimeout = setTimeout(timeslice, 0);
  }
};

/**
 * Function to allow assertion libraries to throw errors directly into mocha.
 * This is useful when running tests in a browser because window.onerror will
 * only receive the 'message' attribute of the Error.
 */
mocha.throwError = function(err) {
  Mocha.utils.forEach(uncaughtExceptionHandlers, function(fn) {
    fn(err);
  });
  throw err;
};

/**
 * Override ui to ensure that the ui functions are initialized.
 * Normally this would happen in Mocha.prototype.loadFiles.
 */

mocha.ui = function(ui) {
  Mocha.prototype.ui.call(this, ui);
  this.suite.emit('pre-require', global, null, this);
  return this;
};

/**
 * Setup mocha with the given setting options.
 */

mocha.setup = function(opts) {
  if ('string' == typeof opts) opts = {ui: opts};
  for (const opt in opts) this[opt](opts[opt]);
  return this;
};

/**
 * Run mocha, returning the Runner.
 */

mocha.run = function(fn) {
  const options = mocha.options;
  mocha.globals('location');

  const query = Mocha.utils.parseQuery(global.location.search || '');
  if (query.grep) mocha.grep(query.grep);
  if (query.invert) mocha.invert();

  return Mocha.prototype.run.call(mocha, function() {
    // The DOM Document is not available in Web Workers.
    if (global.document) {
      Mocha.utils.highlightTags('code');
    }
    if (fn) fn();
  });
};

/**
 * Expose the process shim.
 */

Mocha.process = process;
