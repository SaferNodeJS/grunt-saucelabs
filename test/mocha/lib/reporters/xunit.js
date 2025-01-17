
/**
 * Module dependencies.
 */

const Base = require('./base')
  ; const utils = require('../utils')
  ; const escape = utils.escape;

/**
 * Save timer references to avoid Sinon interfering (see GH-237).
 */

const Date = global.Date
  ; const setTimeout = global.setTimeout
  ; const setInterval = global.setInterval
  ; const clearTimeout = global.clearTimeout
  ; const clearInterval = global.clearInterval;

/**
 * Expose `XUnit`.
 */

exports = module.exports = XUnit;

/**
 * Initialize a new `XUnit` reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function XUnit(runner) {
  Base.call(this, runner);
  const stats = this.stats
    ; const tests = []
    ; const self = this;

  runner.on('pending', function(test) {
    tests.push(test);
  });

  runner.on('pass', function(test) {
    tests.push(test);
  });

  runner.on('fail', function(test) {
    tests.push(test);
  });

  runner.on('end', function() {
    console.log(tag('testsuite', {
      name: 'Mocha Tests',
      tests: stats.tests,
      failures: stats.failures,
      errors: stats.failures,
      skipped: stats.tests - stats.failures - stats.passes,
      timestamp: (new Date).toUTCString(),
      time: (stats.duration / 1000) || 0,
    }, false));

    tests.forEach(test);
    console.log('</testsuite>');
  });
}

/**
 * Inherit from `Base.prototype`.
 */

XUnit.prototype.__proto__ = Base.prototype;

/**
 * Output tag for the given `test.`
 */

function test(test) {
  const attrs = {
    classname: test.parent.fullTitle(),
    name: test.title,
    time: (test.duration / 1000) || 0,
  };

  if ('failed' == test.state) {
    const err = test.err;
    attrs.message = escape(err.message);
    console.log(tag('testcase', attrs, false, tag('failure', attrs, false, cdata(err.stack))));
  } else if (test.pending) {
    console.log(tag('testcase', attrs, false, tag('skipped', {}, true)));
  } else {
    console.log(tag('testcase', attrs, true) );
  }
}

/**
 * HTML tag helper.
 */

function tag(name, attrs, close, content) {
  const end = close ? '/>' : '>'
    ; const pairs = []
    ; let tag;

  for (const key in attrs) {
    pairs.push(key + '="' + escape(attrs[key]) + '"');
  }

  tag = '<' + name + (pairs.length ? ' ' + pairs.join(' ') : '') + end;
  if (content) tag += content + '</' + name + end;
  return tag;
}

/**
 * Return cdata escaped CDATA `str`.
 */

function cdata(str) {
  return '<![CDATA[' + escape(str) + ']]>';
}
