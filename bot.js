require('dotenv').config();
var menu = require('./menu');
var database = require('./database');

var sessions = {};

async function traiterMessage(telephone, message) {
  var texte = message.trim().toLowerCase();
  var session = sessions[telephone] || { etape: 'debut', panier: [] };

  console.log('Message de ' + telephone + ': ' + message);

  if (session.etape === 'debut' || estSalutation(texte)) {
    sessions[telephone] = { etape: 'menu_affiche', panier: [] };
    return 'Bonjour ! Bienvenue au Restaurant Le Baobab\n\n' + menu.afficherMenu() + '\n\nTapez *0* pour valider votre panier';
  }

  if (session.etape === 'menu_affiche' || session.etape === 'ajout_panier') {
    if (texte === '0') {
      if (session.panier.length === 0) {
        return 'Votre panier est vide ! Tapez un numero de plat pour commander.';
      }
      var recap = 'Votre panier :\n';
      var total = 0;
      session.panier.forEach(function(p) {
        recap += '- ' + p.nom + ' : ' + p.prix + ' GNF\n';
        total += p.prix;
      });
      recap += '\nTotal : ' + total + ' GNF\n\nEnvoyez votre adresse de livraison';
      sessions[telephone] = { etape: 'attente_adresse', panier: session.panier };
      return recap;
    }

    if (estUnNombre(texte)) {
      var plat = menu.trouverPlat(texte);
      if (!plat) {
        return 'Numero invalide. Tapez un numero entre 1 et 8.';
      }
      session.panier.push(plat);
      sessions[telephone] = { etape: 'ajout_panier', panier: session.panier };
      var panierTexte = 'Ajoute : ' + plat.nom + ' (' + plat.prix + ' GNF)\n\n';
      panierTexte += 'Panier (' + session.panier.length + ' article(s)) :\n';
      session.panier.forEach(function(p) {
        panierTexte += '- ' + p.nom + '\n';
      });
      panierTexte += '\nTapez un autre numero pour ajouter\nTapez *0* pour valider';
      return panierTexte;
    }
  }

  if (session.etape === 'attente_adresse') {
    var adresse = message.trim();
    if (adresse.length < 10) {
      return 'Adresse trop courte. Precisez le quartier et un point de repere.';
    }

    var total2 = 0;
    session.panier.forEach(function(p) { total2 += p.prix; });
    var nomsPlats = session.panier.map(function(p) { return p.nom; }).join(', ');

    var commande = await database.sauvegarderCommande({
      telephone: telephone,
      nom: 'Client',
      platId: session.panier[0].id,
      platNom: nomsPlats,
      platPrix: total2,
      adresse: adresse
    });

    sessions[telephone] = { etape: 'debut', panier: [] };

    if (!commande) {
      return 'Erreur technique. Reessayez dans quelques instants.';
    }

    return 'Commande confirmee ! Reference : #' + commande.id + '\n' + nomsPlats + '\nTotal : ' + total2 + ' GNF\n' + commande.adresse + '\n\nLivraison : 30 a 45 minutes\n\nMerci !';
  }

  if (texte === 'menu') {
    sessions[telephone] = { etape: 'menu_affiche', panier: [] };
    return menu.afficherMenu();
  }

  if (texte === 'annuler') {
    sessions[telephone] = { etape: 'debut', panier: [] };
    return 'Commande annulee. Tapez menu pour recommencer.';
  }

  return 'Je nai pas compris. Tapez menu pour voir nos plats ou 0 pour valider votre panier.';
}

function estSalutation(texte) {
  var salutations = ['bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'allo', 'commander'];
  return salutations.some(function(s) { return texte.includes(s); });
}

function estUnNombre(texte) {
  return /^\d+$/.test(texte.trim());
}

module.exports = { traiterMessage: traiterMessage };