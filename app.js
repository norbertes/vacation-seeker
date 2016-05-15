'use strict';

const bluebird = require('bluebird');
const cheerio = require('cheerio');
const Slackbot = require('slackbots');
const CronJob = require('cron').CronJob;
const mongodb = require('mongodb');
bluebird.promisifyAll(mongodb);

const utils = require('./utils');
const config = require('./config.js');

const pages = require('./services.js').pages;
const slackbot = new Slackbot({
  token: config.slackToken,
  name: 'lastminuter'
});

mongodb
.MongoClient
.connectAsync(config.mongoUrl)
.then( (db) => {
  console.log('mongodb: connected');

  const dbOffers = db.collection('offers');
  const reqOffers = [];

  new CronJob(
    '* */3 * * * *',
    () => fetch(),
    null,
    true
  );
})
.catch( (err) => {
  console.log('mongodb: connection err', err);
});


function fetch() {
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
    const md5Arr = reqOffers.map( (offer) => offer.md5 );

    dbOffers
    .find({"md5": {$in: md5Arr}})
    .toArray()
    .then( (dbOffers) => {
      console.log('arr');
      const newOffers = [];
      reqOffers.forEach( (offer) => {
        if (dbOffers.indexOf(offer.md5) !== -1) {
          newOffers.push(offer)
        }
      });

      // newOffers == should be pushed to slack
      newOffers.forEach( (offer) => {
        const msg = `${offer.title} (${offer.url})`;
        slackbot.send(config.slackChannel, msg);

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
  });
}
