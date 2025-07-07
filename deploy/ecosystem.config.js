// PM2 Configuration for Nanode 1GB
export default {
  apps: [
    {
      name: 'geograph-websocket',
      script: 'build/server/index.js',
      interpreter: 'node',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        WS_PORT: 8080,
        DATABASE_PATH: '/var/lib/geograph/geograph.db'
      },
      max_memory_restart: '200M',
      error_file: '/var/log/geograph/ws-error.log',
      out_file: '/var/log/geograph/ws-out.log',
      log_file: '/var/log/geograph/ws-combined.log',
      time: true
    },
    {
      name: 'geograph-app',
      script: 'npm',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      },
      max_memory_restart: '300M',
      error_file: '/var/log/geograph/app-error.log',
      out_file: '/var/log/geograph/app-out.log',
      log_file: '/var/log/geograph/app-combined.log',
      time: true
    }
  ]
};