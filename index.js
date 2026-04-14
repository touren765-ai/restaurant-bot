require('dotenv').config();
var express = require('express');
var bot = require('./bot');

var app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/webhook', async function(req, res) {
  var telephone = req.body.From || req.body.from || '';
  var message = req.body.Body || req.body.body || '';

  console.log('Body recu:', JSON.stringify(req.body));
  console.log('Nouveau message de ' + telephone + ': ' + message);

  if (!message) {
    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    return;
  }

  try {
    var reponse = await bot.traiterMessage(telephone, message);
    var twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Message>' + reponse + '</Message></Response>';
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).send('Erreur serveur');
  }
});

app.get('/', function(req, res) {
  res.send('Bot Restaurant Le Baobab - En ligne !');
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Serveur demarre sur le port ' + PORT);
  console.log('En attente des messages WhatsApp...');
});