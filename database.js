var fs = require('fs');
var path = require('path');

var fichier = path.join(__dirname, 'commandes.json');

function lireCommandes() {
  try {
    if (!fs.existsSync(fichier)) return [];
    var data = fs.readFileSync(fichier, 'utf8');
    return JSON.parse(data);
  } catch(e) {
    return [];
  }
}

function sauvegarderCommandes(commandes) {
  fs.writeFileSync(fichier, JSON.stringify(commandes, null, 2));
}

async function sauvegarderCommande(commande) {
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
  console.log('Commande sauvegardee, ID:', nouvelleCommande.id);
  return nouvelleCommande;
}

async function commandesDuJour() {
  return lireCommandes();
}

module.exports = {
  sauvegarderCommande: sauvegarderCommande,
  commandesDuJour: commandesDuJour
};