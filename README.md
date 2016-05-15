`node -v >= 6.0.0`
`brew install mongodb`


config.js file:
module.exports = {
  mongoUrl: 'mongodb://localhost:27017/DB_NAME',
  slackToken: 'TOKEN',
  slackChannel: 'CHANNEL'
};
