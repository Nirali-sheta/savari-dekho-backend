require('dotenv').config();


// Imports
const express = require('express');
const { logToFile } = require('./services');
const { connectToDb } = require('./db');
const { APP_PORT } = require('./config');
var reconnect = null;


// ----------------------------------------- CONTROL PANEL -----------------------------------------

if (process.env.NODE_ENV === 'production') {
  logToFile();  // Logs to file instead of terminal in Production mode
}

connectServer();


// ----------------------------------------- SERVER LOGIC -----------------------------------------

function connectServer() {

  // Database connection
  connectToDb((err) => {
    if (err) {
      console.error(err.message, "Reconnecting in 5 seconds...");
      reconnect = setTimeout(() => {
        connectServer();
      }, 5000);
      return;
    }
    clearTimeout(reconnect);


    // Express App
    const app = express();
    require("./middlewares")(app);
    require("./routes")(app);
    

    // Start the Server
    app.listen(APP_PORT, () => console.log(`Server started on port ${APP_PORT}`));
  })

}
