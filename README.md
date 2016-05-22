1. `node -v >= 6.0.0`
1. `brew install mongodb`
1. `npm install`
1. `npm start`

services to crawl with selectors are inside `services.js`

`config.js` file:
```json
module.exports = {
  "mongoUrl": "mongodb://<dbuser>:<dbpassword>@<server>:<port>/<db_name>",
  "slackChannel": "SLACKCHANNEL", // with #
  "slackHookUrl": "SLACKHOOKURL" // full url
};
```
