require('dotenv').config();
const express = require('express');
const massive = require('massive');
const bcryptjs = require('bcryptjs');
const session = require('express-session');

const app = express();

app.use(express.json());
app.use(
  session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SECRET,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

massive({
  connectionString: process.env.CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false,
  },
}).then((dbInstance) => {
  app.set('db', dbInstance);
  console.log('Database Connected!');
});

app.post('/api/register', (req, res) => {
  const { username, password, email, firstName } = req.body;
  const db = req.app.get('db');
  // check to make sure required values were passed
  if (username && password && email) {
    // check for duplicate usernames
    db.auth.check_for_username(username).then((count) => {
      const newCount = +count[0].count;
      if (newCount > 0) {
        res.status(500).json('Username Already Taken');
      } else {
        // const salt = bcryptjs.genSaltSync(10);
        // const hash = bcryptjs.hashSync(password, salt);

        // const hash = bcryptjs.hashSync(password, 10);

        const hash = bcryptjs.hashSync(password);

        // INSERT into the database
        db.auth
          .register_user({ username, password: hash, email, firstName })
          .then(() => {
            res.sendStatus(200);
          });
        // send back a response
      }
    });
  } else {
    res
      .status(400)
      .json(
        'Please make sure you provide a valid username, password and email'
      );
  }
});

app.post(`/api/login`, (req, res) => {
  const { username, password } = req.body;

  const db = req.app.get('db');

  db.auth.check_users(username).then((user) => {
    if (user[0]) {
      const { password: hash } = user[0];
      bcryptjs.compare(password, hash).then((areEqual) => {
        if (areEqual) {
          req.session.loggedIn = true;
          res.status(200).json(user);
        } else {
          res.status(500).json('nice try!');
        }
      });
    } else {
      res.status(418).json('You look like a teapot');
    }
  });
});

const mySecretData = ['Ths is the secret data'];

const checkIfLoggedIn = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.status(418).json('Go log in');
  }
};

app.get(`/api/secret`, checkIfLoggedIn, (req, res) => {
  res.status(200).json(mySecretData);
});

app.post(`/api/secret`, (req, res) => {
  mySecretData.push(req.body.data);
  res.status(200).json(mySecretData);
});

app.post(`/api/secret`, (req, res) => {
  mySecretData.pop();
  res.status(200).json(mySecretData);
});

app.listen(5050, () => console.log(`Listening on Port 5050`));
