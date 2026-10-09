module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.MATES_WEB_BASE_PATH || "" }
});
