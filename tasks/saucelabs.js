'use strict';

module.exports = function(grunt) {
  const Q = require('q');
  const SauceTunnel = require('sauce-tunnel');
  const TestRunner = require('../src/TestRunner')(grunt);

  Q.longStackSupport = true;

  function unsupportedPort(url) {
    // Not all ports are proxied by Sauce Connect. List of supported ports is
    // available at https://saucelabs.com/docs/connect#localhost
    const portRegExp = /:(\d+)\//;
    const matches = portRegExp.exec(url);
    const port = matches ? parseInt(matches[1], 10) : null;
    const supportedPorts = [
      80, 443, 888, 2000, 2001, 2020, 2109, 2222, 2310, 3000, 3001, 3030,
      3210, 3333, 4000, 4001, 4040, 4321, 4502, 4503, 4567, 5000, 5001, 5050, 5555, 5432, 6000,
      6001, 6060, 6666, 6543, 7000, 7070, 7774, 7777, 8000, 8001, 8003, 8031, 8080, 8081, 8765,
      8888, 9000, 9001, 9080, 9090, 9876, 9877, 9999, 49221, 55001,
    ];

    if (port) {
      return supportedPorts.indexOf(port) === -1;
    }

    return false;
  }

  function reportProgress(notification) {
    switch (notification.type) {
      case 'tunnelOpen':
        grunt.log.writeln('=> Starting Tunnel to Sauce Labs'.inverse.bold);
        break;
      case 'tunnelOpened':
        grunt.log.ok('Connected to Saucelabs');
        break;
      case 'tunnelClose':
        grunt.log.writeln('=> Stopping Tunnel to Sauce Labs'.inverse.bold);
        break;
      case 'tunnelEvent':
        if (notification.verbose) {
          grunt.verbose[notification.method](notification.text);
        } else {
          grunt.log[notification.method](notification.text);
        }
        break;
      case 'jobStarted':
        grunt.log.writeln('\n', notification.startedJobs, '/', notification.numberOfJobs, 'tests started');
        break;
      case 'jobCompleted':
        grunt.log.subhead('\nTested %s', notification.url);
        grunt.log.writeln('Platform: %s', notification.platform);

        if (notification.tunnelId && unsupportedPort(notification.url)) {
          grunt.log.writeln('Warning: This url might use a port that is not proxied by Sauce Connect.'.yellow);
        }

        grunt.log.writeln('Passed: %s', notification.passed);
        grunt.log.writeln('Url %s', notification.jobUrl);
        break;
      case 'testCompleted':
        grunt.log[notification.passed ? 'ok' : 'error']('All tests completed with status %s', notification.passed);
        break;
      case 'retrying':
        grunt.log.writeln('Timed out, retrying URL %s on browser %s', notification.url, JSON.stringify(notification.browser));
        break;
      default:
        grunt.log.error('Unexpected notification type');
    }
  }

  function createTunnel(arg) {
    let tunnel;

    reportProgress({
      type: 'tunnelOpen',
    });

    tunnel = new SauceTunnel(arg.username, arg.key(), arg.identifier, true, ['-P', '0'].concat(arg.tunnelArgs));

    ['write', 'writeln', 'error', 'ok', 'debug'].forEach(function(method) {
      tunnel.on('log:' + method, function(text) {
        reportProgress({
          type: 'tunnelEvent',
          verbose: false,
          method: method,
          text: text,
        });
      });
      tunnel.on('verbose:' + method, function(text) {
        reportProgress({
          type: 'tunnelEvent',
          verbose: true,
          method: method,
          text: text,
        });
      });
    });

    return tunnel;
  }

  function runTask(arg, framework, callback) {
    let tunnel;

    Q
        .fcall(function() {
          let deferred;

          if (arg.tunneled) {
            deferred = Q.defer();

            tunnel = createTunnel(arg);
            tunnel.start(function(succeeded) {
              if (!succeeded) {
                deferred.reject('Could not create tunnel to Sauce Labs');
              } else {
                reportProgress({
                  type: 'tunnelOpened',
                });

                deferred.resolve();
              }
            });
            return deferred.promise;
          }
        })
        .then(function() {
          const testRunner = new TestRunner(arg, framework, reportProgress);
          return testRunner.runTests();
        })
        .fin(function() {
          let deferred;

          if (tunnel) {
            deferred = Q.defer();

            reportProgress({
              type: 'tunnelClose',
            });

            tunnel.stop(function() {
              deferred.resolve();
            });

            return deferred.promise;
          }
        })
        .then(
            function(passed) {
              callback(passed);
            },
            function(error) {
              grunt.log.error(error.stack || error.toString());
              callback(false);
            }
        )
        .done();
  }

  const defaults = {
    username: process.env.SAUCE_USERNAME,
    tunneled: true,
    identifier: Math.floor((new Date()).getTime() / 1000 - 1230768000).toString(),
    pollInterval: 1000 * 2,
    statusCheckAttempts: 90,
    testname: '',
    browsers: [{}],
    tunnelArgs: [],
    sauceConfig: {},
    maxRetries: 0,
  };

  // Grunt will print the options hash to console.log when run in verbose
  // mode. This can cause credential leaks per issue #203. This block will allow
  // assignments so it can integrate with Grunt's APIs, but it will always
  // return the getter as a function so that the 'toString' and 'toJSON' can be
  // overidden.
  let key = process.env.SAUCE_ACCESS_KEY;
  Object.defineProperty(defaults, 'key', {
    enumerable: true,
    configurable: false,
    writeable: true,
    set: function(newKey) {
      key = newKey;
    },
    get: function() {
      const get = function() {
        return key;
      };
      get.toString = function() {
        return key ? '[hidden]' : undefined;
      };
      get.toJSON = get.toString;
      return get;
    },
  });

  grunt.registerMultiTask('saucelabs-jasmine', 'Run Jasmine test cases using Sauce Labs browsers', function() {
    const done = this.async();
    const arg = this.options(defaults);

    runTask(arg, 'jasmine', done);
  });

  grunt.registerMultiTask('saucelabs-qunit', 'Run Qunit test cases using Sauce Labs browsers', function() {
    const done = this.async();
    const arg = this.options(defaults);

    runTask(arg, 'qunit', done);
  });

  grunt.registerMultiTask('saucelabs-yui', 'Run YUI test cases using Sauce Labs browsers', function() {
    const done = this.async();
    const arg = this.options(defaults);

    runTask(arg, 'YUI Test', done);
  });

  grunt.registerMultiTask('saucelabs-mocha', 'Run Mocha test cases using Sauce Labs browsers', function() {
    const done = this.async();
    const arg = this.options(defaults);

    runTask(arg, 'mocha', done);
  });

  grunt.registerMultiTask('saucelabs-custom', 'Run custom test cases using Sauce Labs browsers', function() {
    const done = this.async();
    const arg = this.options(defaults);

    runTask(arg, 'custom', done);
  });
};
