module.exports = ({ config }) => ({
  ...config,
  extra: {
    // Inject REOWN_PROJECT_ID at build/runtime from the environment
    REOWN_PROJECT_ID: process.env.REOWN_PROJECT_ID,
  },
});
