var ObjectDescriptor = require("montage/core/meta/object-descriptor").ObjectDescriptor, 
    Promise = require("montage/core/promise").Promise;

/*
// TODO
const Sequelize = require('sequelize');
const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'mysql'|'sqlite'|'postgres'|'mssql',

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },

  // SQLite only
  storage: 'path/to/database.sqlite',

  // http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
  operatorsAliases: false
});

const User = sequelize.define('user', {
  username: Sequelize.STRING,
  birthday: Sequelize.DATE
});

sequelize.sync()
  .then(() => User.create({
    username: 'janedoe',
    birthday: new Date(1980, 6, 20)
  }))
  .then(jane => {
    console.log(jane.toJSON());
  });
/*

/**
 * Provides Message
 *
 * @class
 * @extends external:HttpService
 */
exports.SequelizeService = RawDataService.specialize(/** @lends MessageService.prototype */ {

    constructor: {
        value: function SequelizeService() {
          // TODO convert expression to SQL queries upon operations
        }
    }
});
