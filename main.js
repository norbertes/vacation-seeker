'use strict';

const request = require('request');
const cheerio = require('cheerio');
const crypto = require('crypto');

const pages = [{
    url: 'http://fly4free.pl',
    seekTag: '.entry__title a'
}];

const createMD5 = (str) => crypto.createHash('md5').update(str).digest('hex');

request(pages[0].url, (err, response, body) => {
  const $ = cheerio.load(body);

  $(pages[0].seekTag).each( (i, elem) => {
    console.log(
      createMD5($(elem).text()),
      $(elem).text(),
      $(elem).attr('href')
    );
  })
});
