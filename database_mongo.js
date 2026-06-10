var fs = require('fs');
var path = require('path');

var fichierLocal = path.join(__dirname, 'commandes.json');
var mongoose = null;
var Commande = null;
var mongoConnecte = false;

if (process.env.MONGODB_URI) {
  try {
    mongoose = require('mongoose');
    mongoose.connect(process.env.MONGODB_URI)
      .then(function() {
        console.log('✅ MongoDB connecté !');
        mongoConnecte = true;
      })
      .catch(function(err) {
        console.log('⚠️ MongoDB non disponible, utilisation JSON');
        mongoConnecte = false;
      });

    var commandeSchema = new mongoose.Schema({
      telephone: String,
      client_nom: String,
      plat_id: Number,
      plat_nom: String,
      plat_prix: Number,
      adresse: String,
      statut: { type: String, default: 'nouveau' },
      created_at: { type: Date, default: Date.now }
    });

    Commande = mongoose.model('Commande', commandeSchema);
  } catch(e) {
    console.log('⚠️ Mongoose non disponible');
  }
}

function lireCommandes() {
  try {
    if (!fs.existsSync(fichierLocal)) return [];
    return JSON.parse(fs.readFileSync(fichierLocal, 'utf8'));
  } catch(e) { return []; }
}

function sauvegarderCommandes(commandes) {
  fs.writeFileSync(fichierLocal, JSON.stringify(commandes, null, 2));
}

async function sauvegarderCommande(commande) {
  if (mongoConnecte && Commande) {
    try {
      var doc = new Commande({
        telephone: commande.telephone,
        client_nom: commande.nom,
        plat_id: commande.platId,
        plat_nom: commande.platNom,
        plat_prix: commande.platPrix,
        adresse: commande.adresse
      });
      var saved = await doc.save();
      console.log('✅ Sauvegardé MongoDB, ID:', saved._id);
      return { id: saved._id, plat_nom: saved.plat_nom, plat_prix: saved.plat_prix, adresse: saved.adresse };
    } catch(e) {
      console.error('❌ Erreur MongoDB:', e);
    }
  }

  var commandes = lireCommandes();
  var nouvelleCommande = {
    id: commandes.length + 1,
    telephone: commande.telephone,
    client_nom: commande.nom,
    plat_id: commande.platId,
    plat_nom: commande.platNom,
    plat_prix: commande.platPrix,
    adresse: commande.adresse,
    statut: 'nouveau',
    created_at: new Date()
  };
  commandes.push(nouvelleCommande);
  sauvegarderCommandes(commandes);
  console.log('✅ Sauvegardé JSON, ID:', nouvelleCommande.id);
  return nouvelleCommande;
}

async function commandesDuJour() {
  if (mongoConnecte && Commande) {
    try {
      var commandes = await Commande.find().sort({ created_at: -1 });
      return commandes.map(function(c) {
        return {
          id: c._id,
          telephone: c.telephone,
          client_nom: c.client_nom,
          plat_id: c.plat_id,
          plat_nom: c.plat_nom,
          plat_prix: c.plat_prix,
          adresse: c.adresse,
          statut: c.statut,
          created_at: c.created_at
        };
      });
    } catch(e) {
      console.error('❌ Erreur MongoDB:', e);
    }
  }
  return lireCommandes();
}

async function changerStatut(id, statut) {
  if (mongoConnecte && Commande) {
    try {
      await Commande.findByIdAndUpdate(id, { statut: statut });
      return true;
    } catch(e) {
      console.error('❌ Erreur MongoDB:', e);
    }
  }
  var commandes = lireCommandes();
  commandes = commandes.map(function(c) {
    if (String(c.id) === String(id)) c.statut = statut;
    return c;
  });
  sauvegarderCommandes(commandes);
  return true;
}

module.exports = { sauvegarderCommande, commandesDuJour, changerStatut };