module.exports = {
  apps: [{
    name: 'easyballot',
    script: 'dist/index.js',
    cwd: '/opt/easyballot/server',
    env: {
      NODE_ENV: 'production',
      PORT: 3070
    }
  }]
};
