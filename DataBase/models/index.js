/**
 * SmartBuy — Database Models (barrel export)
 *
 * Usage from Backend:
 *   const { User, Product, PriceHistory, Alert } = require('../../DataBase/models');
 */

module.exports = {
  User:         require('./User'),
  Product:      require('./Product'),
  PriceHistory: require('./PriceHistory'),
  Alert:        require('./Alert'),
};
