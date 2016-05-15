'use strict';

const bluebird = require('bluebird');
const cheerio = require('cheerio');
const MongoClient = bluebird.promisifyAll(
  require('mongodb').MongoClient
);

const utils = require('./utils');
const config = require('./config.js');

const pages = require('./services.js').pages;

MongoClient
.connectAsync(config.mongoUrl)
.then( (db) => {
  console.log('mongodb: connected');

  const dbOffers = db.collection('offers');
  const reqOffers = [];

  bluebird
  .each(pages, (page) => (
    utils
    .createRequest(page.url)
    .then( (body) => {
      const $ = cheerio.load(body);
      $(page.seekTag).each( (i, elem) => {
        reqOffers.push({
          date: new Date(),
          md5: utils.createMD5($(elem).text()),
          title: $(elem).text(),
          url: $(elem).attr('href')
        });
      });
    })
  ))
  .finally( () => {
    reqOffers.forEach( (offer) => {
      dbOffers.update(
        { md5: offer.md5 },
        {
          title: offer.title,
          date: offer.date,
          md5: offer.md5,
          url: offer.url
        },
        {
          upsert: true
        }
      )
    });
  });

})
.catch( (err) => {
  console.log('mongodb: connection err', err);
});
