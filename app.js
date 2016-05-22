'use strict';

const bluebird = require('bluebird');
const request = require('request');
const cheerio = require('cheerio');
const Slack = require('node-slack');
const CronJob = require('cron').CronJob;
const mongodb = require('mongodb');
bluebird.promisifyAll(mongodb);

const utils = require('./utils');
const config = require('./config.js') || {};
const pages = require('./services.js').pages;

const slack = new Slack(config.slackHookUrl || process.env.SLACKHOOKURL);


let dbOffers = []

mongodb
.MongoClient
.connectAsync(config.mongoUrl || process.env.MONGOURL)
.then( (db) => {
  console.log('mongodb: connected');

  dbOffers = db.collection('offers');

  fetch();

  new CronJob(
    '0 */3 * * * *',
    fetch,
    () => console.error('CRON CRASHED!'),
    true
  );
})
.catch( (err) => {
  console.error('mongodb: connection err', err);
});


function fetch() {
  let reqOffers = [];

  // FETCH PAGES AND OFFERS PART
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
          url: /^https?:\/\//.test($(elem).attr('href')) ?
               $(elem).attr('href') :
               page.baseUrl + $(elem).attr('href')
        });
      });
    })
    .catch( (err) => {
      console.log(`${page.url} got error ${err}`);
    })
  ))
  .finally( () => {
    // FINDING NEW OFFERS PART
    dbOffers
    .find({}, {"md5": 1, _id: 0})
    .toArray()
    .then( (collection) => {
      const dbMD5 = collection.map( (pos) => pos.md5 );
      // NOTE: newOffers are diff between db and results
      const newOffers = reqOffers.filter( (pos) => !dbMD5.includes(pos.md5) );
      console.log(`
        after db fetch.
        ReqOffers: ${reqOffers.length},
        NewOffers: ${newOffers.length}
      `);

      const Bulk = dbOffers.initializeUnorderedBulkOp();
      newOffers.forEach( (offer) => {
        const msg = `${offer.title} (${offer.url})`;
        slack.send({
            text: msg,
            channel: config.slackChannel || process.env.SLACKCHANNEL,
            username: 'Vacation Seeker',
            icon_emoji: 'airplane'
        });
        Bulk.insert({
          md5: offer.md5,
          title: offer.title,
          date: offer.date,
          url: offer.url
        })
      });

      Bulk.execute();
    });
  });
}
