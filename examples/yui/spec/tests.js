﻿YUI().add('example-tests', function(Y) {
  const dataTestCase = new Y.Test.Case({

    // name of the test case - if not provided, one is auto-generated
    name: 'Data Tests',

    // ---------------------------------------------------------------------
    // setUp and tearDown methods - optional
    // ---------------------------------------------------------------------

    /*
    * Sets up data that is needed by each test.
    */
    setUp: function() {
      this.data = {
        name: 'test',
        year: 2007,
        beta: true,
      };
    },

    /*
    * Cleans up everything that was created by setUp().
    */
    tearDown: function() {
      delete this.data;
    },

    // ---------------------------------------------------------------------
    // Test methods - names must begin with "test"
    // ---------------------------------------------------------------------

    testName: function() {
      const Assert = Y.Assert;

      Assert.isObject(this.data);
      Assert.isString(this.data.name);
      Assert.areEqual('test', this.data.name);
    },

    testYear: function() {
      const Assert = Y.Assert;

      Assert.isObject(this.data);
      Assert.isNumber(this.data.year);
      Assert.areEqual(2007, this.data.year);
    },

    testBeta: function() {
      const Assert = Y.Assert;

      Assert.isObject(this.data);
      Assert.isBoolean(this.data.beta);
      Assert.isTrue(this.data.beta);
    },

  });

  const arrayTestCase = new Y.Test.Case({

    // name of the test case - if not provided, one is auto-generated
    name: 'Array Tests',

    // ---------------------------------------------------------------------
    // setUp and tearDown methods - optional
    // ---------------------------------------------------------------------

    /*
    * Sets up data that is needed by each test.
    */
    setUp: function() {
      this.data = [0, 1, 2, 3, 4];
    },

    /*
    * Cleans up everything that was created by setUp().
    */
    tearDown: function() {
      delete this.data;
    },

    // ---------------------------------------------------------------------
    // Test methods - names must begin with "test"
    // ---------------------------------------------------------------------

    testPop: function() {
      const Assert = Y.Assert;

      const value = this.data.pop();

      Assert.areEqual(4, this.data.length);
      Assert.areEqual(4, value);
    },

    testPush: function() {
      const Assert = Y.Assert;

      this.data.push(5);

      Assert.areEqual(6, this.data.length);
      Assert.areEqual(5, this.data[5]);
    },

    testSplice: function() {
      const Assert = Y.Assert;

      this.data.splice(2, 1, 6, 7);

      Assert.areEqual(6, this.data.length);
      Assert.areEqual(6, this.data[2]);
      Assert.areEqual(7, this.data[3]);
    },

  });

  const exampleSuite = new Y.Test.Suite('Example Suite');
  exampleSuite.add(dataTestCase);
  exampleSuite.add(arrayTestCase);

  Y.Test.Runner.add(exampleSuite);
}, '0.0.1', {
  requires: ['test'],
});
