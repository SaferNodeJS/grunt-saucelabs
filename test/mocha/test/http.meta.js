
const http = require('http');

const server = http.createServer(function(req, res) {
  const accept = req.headers.accept || ''
    ; const json = ~accept.indexOf('json');

  switch (req.url) {
    case '/':
      res.end('hello');
      break;
    case '/users':
      if (json) {
        res.end('["tobi","loki","jane"]');
      } else {
        res.end('tobi, loki, jane');
      }
      break;
  }
});

server.listen(8889);

function get(url, body, header) {
  return function(done) {
    http.get({path: url, port: 8889, headers: header}, function(res) {
      let buf = '';
      res.should.have.status(200);
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        buf += chunk;
      });
      res.on('end', function() {
        buf.should.equal(body);
        done();
      });
    });
  };
}

describe('http requests', function() {
  describe('GET /', function() {
    it('should respond with hello',
        get('/', 'hello'));
  });

  describe('GET /users', function() {
    it('should respond with users',
        get('/users', 'tobi, loki, jane'));

    it('should respond with users',
        get('/users', '["tobi","loki","jane"]', {Accept: 'application/json'}));
  });
});
