require('dotenv').config();
var express = require('express');
var bot = require('./bot');
var bot_bceip = require('./bot_bceip');
var fs = require('fs');
var path = require('path');
var db = require('./database_mongo');
var scoring = require('./scoring');

var app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());app.post('/webhook', async function(req, res) {
  var telephone = req.body.From || '';
  var message = req.body.Body || '';
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

app.post('/webhook/bceip', async function(req, res) {
  var telephone = req.body.From || '';
  var message = req.body.Body || '';
  console.log('BCEIP - Message de ' + telephone + ': ' + message);
  if (!message) {
    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    return;
  }
  try {
    var mediaUrl = req.body.MediaUrl0 || null;
    var reponse = await bot_bceip.traiterMessage(telephone, message, mediaUrl);
    var twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Message>' + reponse + '</Message></Response>';
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Erreur BCEIP:', error);
    res.status(500).send('Erreur serveur');
  }
});app.get('/dashboard', function(req, res) {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/dashboard/bceip', function(req, res) {
  res.sendFile(path.join(__dirname, 'dashboard_bceip.html'));
});

app.get('/abonnement', function(req, res) {
  res.sendFile(path.join(__dirname, 'abonnement.html'));
});

app.get('/admin', function(req, res) {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.post('/abonnement', function(req, res) {
  var demande = {
    id: Date.now(),
    plan: req.body.plan,
    nom: req.body.nom,
    telephone: req.body.telephone,
    telephonePaiement: req.body.telephonePaiement,
    date: new Date(),
    statut: 'en_attente'
  };
  var fichier = path.join(__dirname, 'abonnements.json');
  var abonnements = [];
  try { abonnements = JSON.parse(fs.readFileSync(fichier, 'utf8')); } catch(e) {}
  abonnements.push(demande);
  fs.writeFileSync(fichier, JSON.stringify(abonnements, null, 2));
  console.log('Nouvelle demande:', demande.nom, '-', demande.plan);
  res.json({ ok: true });
});

app.get('/admin/demandes', function(req, res) {
  var fichier = path.join(__dirname, 'abonnements.json');
  var abonnements = [];
  try { abonnements = JSON.parse(fs.readFileSync(fichier, 'utf8')); } catch(e) {}
  res.json(abonnements);
});

app.post('/admin/demandes/:id', function(req, res) {
  var id = parseInt(req.params.id);
  var statut = req.body.statut;
  var fichier = path.join(__dirname, 'abonnements.json');
  var abonnements = [];
  try { abonnements = JSON.parse(fs.readFileSync(fichier, 'utf8')); } catch(e) {}
  abonnements = abonnements.map(function(a) {
    if (a.id === id) a.statut = statut;
    return a;
  });
  fs.writeFileSync(fichier, JSON.stringify(abonnements, null, 2));
  res.json({ ok: true });
});app.get('/commandes', function(req, res) {
  db.commandesDuJour().then(function(commandes) {
    res.json(commandes);
  });
});

app.post('/commandes/:id/statut', async function(req, res) {
  var id = req.params.id;
  var statut = req.body.statut;
  await db.changerStatut(id, statut);
  res.json({ ok: true });
});

app.get('/commandes/bceip', async function(req, res) {
  var commandes = await db.commandesDuJour();

  var candidatures = commandes.filter(function(c) {
    return c.plat_nom && c.plat_nom.indexOf('Candidature') !== -1;
  });

  candidatures.forEach(function(c) {
    var info = {};
    var parts = (c.adresse || '').split('|');
    parts.forEach(function(p) {
      p = p.trim();
      if (p.indexOf('Domaine:') === 0) info.domaine = p.replace('Domaine:', '').trim();
      if (p.indexOf('Email:') === 0) info.email = p.replace('Email:', '').trim();
      if (p.indexOf('Experience:') === 0) info.experience = p.replace('Experience:', '').trim();
      if (p.indexOf('CV:') === 0) info.cv = p.replace('CV:', '').trim();
    });
    var resultat = scoring.calculerScore(c, info);
    c.score = resultat.score;
    c.niveau = resultat.niveau;
    c.details = resultat.details;
  });

  candidatures.sort(function(a, b) { return b.score - a.score; });

  res.json(candidatures);
});

app.get('/cv/:id', async function(req, res) {
  var commandes = await db.commandesDuJour();
  var id = req.params.id;
  var candidature = commandes.find(function(c) { return String(c.id) === String(id); });
  if (!candidature) return res.status(404).send('Candidature non trouvee');

  var cvUrl = '';
  var parts = (candidature.adresse || '').split('|');
  parts.forEach(function(p) {
    p = p.trim();
    if (p.indexOf('CV:') === 0) cvUrl = p.replace('CV:', '').trim();
  });

  if (!cvUrl) return res.status(404).send('CV non trouve');

  var sid = process.env.TWILIO_ACCOUNT_SID;
  var token = process.env.TWILIO_AUTH_TOKEN;
  var auth = Buffer.from(sid + ':' + token).toString('base64');

  try {
    var response = await fetch(cvUrl, { headers: { 'Authorization': 'Basic ' + auth } });
    var contentType = response.headers.get('content-type');
    var buffer = await response.arrayBuffer();
    res.set('Content-Type', contentType);
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).send('Erreur recuperation CV');
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