require('dotenv').config();
var menu = require('./menu');
var database = require('./database');

var sessions = {};

async function traiterMessage(telephone, message) {
  var texte = message.trim().toLowerCase();
  var session = sessions[telephone] || { etape: 'debut' };

  console.log('Message de ' + telephone + ': ' + message);

  if (session.etape === 'debut' || estSalutation(texte)) {
    sessions[telephone] = { etape: 'menu_affiche' };
    return 'Bonjour ! Bienvenue au Restaurant Le Baobab\n\n' + menu.afficherMenu();
  }

  if (session.etape === 'menu_affiche' && estUnNombre(texte)) {
    var plat = menu.trouverPlat(texte);
    if (!plat) {
      return 'Numero invalide. Tapez un numero entre 1 et 8.';
    }
    sessions[telephone] = { etape: 'attente_adresse', plat: plat };
    return plat.nom + ' selectionne - ' + plat.prix + ' GNF\n\nEnvoyez votre adresse de livraison';
  }

  if (session.etape === 'attente_adresse') {
    var adresse = message.trim();
    if (adresse.length < 10) {
      return 'Adresse trop courte. Precisez le quartier et un point de repere.';
    }
    var commande = await database.sauvegarderCommande({
      telephone: telephone,
      nom: 'Client',
      platId: session.plat.id,
      platNom: session.plat.nom,
      platPrix: session.plat.prix,
      adresse: adresse
    });
    sessions[telephone] = { etape: 'debut' };
    if (!commande) {
      return 'Erreur technique. Reessayez dans quelques instants.';
    }
    return 'Commande confirmee ! Reference : #' + commande.id + '\n' + commande.plat_nom + '\n' + commande.plat_prix + ' GNF\n' + commande.adresse + '\n\nLivraison : 30 a 45 minutes\n\nMerci !';
  }

  if (texte === 'menu') {
    sessions[telephone] = { etape: 'menu_affiche' };
    return menu.afficherMenu();
  }

  if (texte === 'annuler') {
    sessions[telephone] = { etape: 'debut' };
    return 'Commande annulee. Tapez menu pour recommencer.';
  }

  return 'Je nai pas compris. Tapez menu pour voir nos plats.';
}

function estSalutation(texte) {
  var salutations = ['bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'allo', 'commander'];
  return salutations.some(function(s) { return texte.includes(s); });
}

function estUnNombre(texte) {
  return /^\d+$/.test(texte.trim());
}

module.exports = { traiterMessage: traiterMessage };