'use strict';

const bluebird = require('bluebird');
const request = require('request');
const cheerio = require('cheerio');
const RtmClient = require('@slack/client').RtmClient;
const RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const CronJob = require('cron').CronJob;
const mongodb = require('mongodb');
bluebird.promisifyAll(mongodb);

const utils = require('./utils');
const config = require('./config.js');
const pages = require('./services.js').pages;

const rtm = new RtmClient(config.slackToken || '');
rtm.start();


rtm.on(
  CLIENT_EVENTS.RTM.AUTHENTICATED,
  (rtmStartData) => {
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
  }
);

rtm.on(
  RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED,
  () => rtm.sendMessage('bot is ON', config.slackChannel)
);

let dbOffers = []
const reqOffers = [];

mongodb
.MongoClient
.connectAsync(config.mongoUrl)
.then( (db) => {
  console.log('mongodb: connected');

  dbOffers = db.collection('offers');

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
  console.log(`${new Date().toISOString()} fetch started`);

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
    const reqArr = reqOffers.map( (offer) => offer.md5 );

    dbOffers
    .find({}, {"md5": 1, _id: 0})
    .toArray()
    .then( (collection) => {
      const dbArr = collection.map( (pos) => pos.md5 );
      const newOffers = reqArr.filter( (pos) => dbArr.includes(pos) );

      // NOTE: newOffers are diff between db and results
      if (newOffers.length) {
        console.log(`added ${newOffers.length} offers!`);
      }
      newOffers.forEach( (offer) => {
        const msg = `${offer.title} (${offer.url})`;

        rtm.on(
          RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED,
          () => {
            rtm.sendMessage(
              msg,
              config.slackChannel,
              () => console.log('sent to slack')
            );
        });

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
