'use strict';

module.exports = function(grunt) {
  const Q = require('q');
  const _ = require('lodash');
  const utils = require('./utils')(grunt);
  const reJobId = /^[a-z0-9]{32}$/;

  Q.longStackSupport = true;

  // these result parsers return true if the tests all passed
  const resultParsers = {
    'jasmine': function(result) {
      return result.passed;
    },
    'qunit': function(result) {
      return result.passed === result.total && result.total !== undefined;
    },
    'mocha': function(result) {
      return result.failures === 0;
    },
    'YUI Test': function(result) {
      return result.passed === result.total && result.total !== undefined;
    },
    'custom': function(result) {
      return result.failed === 0;
    },
  };

  /**
   * Represents a Sauce Labs job.
   *
   * @constructor
   * @param {Object} runner - TestRunner instance.
   * @param {String} url - The test runner page's URL.
   * @param {Object} browser - Object describing the platform to run the test on.
   */
  const Job = function(runner, url, browser) {
    this.id = null;
    this.taskId = null;
    this.user = runner.user;
    this.key = runner.key;
    this.framework = runner.framework;
    this.pollInterval = runner.pollInterval;
    this.statusCheckAttempts = runner.statusCheckAttempts;
    this.url = url;
    this.platform = _.isArray(browser) ? browser : [browser.platform || '', browser.browserName || '', browser.version || ''];
    this.build = runner.build;
    this.public = browser.public || runner.public || 'team';
    this.tags = browser.tags || runner.tags;
    this.testName = browser.name || runner.testName;
    this.sauceConfig = runner.sauceConfig;
    this.tunneled = runner.tunneled;
    this.tunnelId = runner.tunnelId;
  };

  /**
   * Starts the job.
   *
   * @return {Object} - A promise which will eventually be resolved after the job has been
   * started.
   */
  Job.prototype.start = function() {
    const me = this;
    const requestParams = {
      method: 'POST',
      url: ['https://saucelabs.com/rest/v1', this.user, 'js-tests'].join('/'),
      auth: {user: this.user, pass: this.key()},
      json: {
        platforms: [this.platform],
        url: this.url,
        framework: this.framework,
        build: this.build,
        public: this.public,
        tags: this.tags,
        name: this.testName,
      },
    };
    _.merge(requestParams.json, this.sauceConfig);

    if (this.tunneled) {
      requestParams.json['tunnel-identifier'] = this.tunnelId;
    }

    return utils
        .makeRequest(requestParams)
        .then(function(body) {
          const taskIds = body['js tests'];

          if (!taskIds || !taskIds.length) {
            throw new Error('Error starting tests through Sauce API.');
          }

          me.taskId = taskIds[0];
        }
        );
  };

  /**
   * Returns the job result.
   *
   * @return {Object} - A promise which will eventually be resolved with the job results.
   */
  Job.prototype.getResult = function() {
    const me = this;

    return this
        .complete()
        .then(function(result) {
          result.testPageUrl = me.url;
          if (result.status === 'test error') {
          // A detailed error message should be composed here after the Sauce Labs API is
          // modified to report errors better, see #102.
            throw new Error('Test Error');
          }

          return result;
        })
        .then(function(result) {
        // Sauce Labs sets the result property to null when it encounters an error.
        // (One way to trigger this is to set a big (~100KB) test result.)
          if (!result.result) {
            result.passed = false;
          } else {
            result.passed = resultParsers[me.framework](result.result);
          }
          return result;
        });
  };

  /**
   * Waits until the job is completed.
   *
   * @return {Object} - A promise which will be resolved with the job's result object.
   */
  Job.prototype.complete = function() {
    const me = this;

    function fetch(attempts) {
      return utils
          .makeRequest({
            method: 'POST',
            url: ['https://saucelabs.com/rest/v1', me.user, 'js-tests/status'].join('/'),
            auth: {user: me.user, pass: me.key()},
            json: {'js tests': [me.taskId]},
          })
          .then(function(body) {
            const result = body['js tests'] && body['js tests'][0];
            const jobId = result.job_id;

            if (!body.completed || !reJobId.test(jobId)) {
              const retries = attempts - 1;
              if (attempts === 0) {
                const errorMessage = 'After trying ' + me.statusCheckAttempts +
                                 ' times with a delay of ' + me.pollInterval +
                                 's, this job never reached \'complete\' status.';
                throw new Error(errorMessage);
              } else {
                return Q
                    .delay(me.pollInterval)
                    .then(fetch.bind(this, retries));
              }
            }

            me.id = jobId;

            return result;
          });
    }

    const initialAttempts = me.statusCheckAttempts || -1;
    return fetch(initialAttempts);
  };

  /**
   * Stops the job.
   *
   * @return {Object} - A promise which will eventually be resolved after the job has been
   *   stopped.
   */
  Job.prototype.stop = function() {
    return utils.makeRequest({
      method: 'PUT',
      url: ['https://saucelabs.com/rest/v1', this.user, 'jobs', this.id, 'stop'].join('/'),
      auth: {user: this.user, pass: this.key()},
    });
  };

  /**
   * Deletes the job.
   *
   * @return {Object} - A promise which will eventually be resolved after the job has been
   *   deleted.
   */
  Job.prototype.del = function() {
    return utils.makeRequest({
      method: 'DELETE',
      url: ['https://saucelabs.com/rest/v1', this.user, 'jobs', this.id].join('/'),
      auth: {user: this.user, pass: this.key()},
    });
  };

  return Job;
};
