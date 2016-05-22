const crypto = require('crypto');
const http = require('follow-redirects').http;

module.exports.createMD5 = (str) => {
  return crypto.createHash('md5').update(str).digest('hex')
};

module.exports.createRequest = (url) => {
  return new Promise( (resolve, reject) => {

    const request = http.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(response.statusCode);
       }

      const body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err));

    return request;
  });
};
