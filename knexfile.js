module.exports = {
  /* development: {
    client: 'sqlite3',
    connection: {
      filename: './.data/db.sqlite3'
    },
    migrations: {
      tableName: 'migrations'
    },
    useNullAsDefault: true
  },

  production: { */
    client: 'mysql',
    connection: {
      host : process.env.DB_HOST || '127.0.0.1',
      database: process.env.DB_NAME || 'envato_elements',
      user:     process.env.DB_USER || 'root',
      password: process.env.DB_PASS
    },
    migrations: {
      tableName: 'migrations'
    }
  //}

};
