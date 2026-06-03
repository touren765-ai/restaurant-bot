require('dotenv').config();
var fs = require('fs');
var path = require('path');
var database = require('./database');

var sessions = {};

function chargerBCEIP() {
  var fichier = path.join(__dirname, 'restaurants', 'bceip.json');
  return JSON.parse(fs.readFileSync(fichier, 'utf8'));
}

function afficherPostes() {
  var data = chargerBCEIP();
  var texte = 'Offres d\'emploi - Groupe BCEIP\n\n';
  texte += 'POSTES DISPONIBLES\n';
  data.postes.forEach(function(p) {
    texte += p.id + '. ' + p.titre + ' | ' + p.lieu + ' | ' + p.type + '\n';
  });
  texte += '\nTapez le numero du poste pour postuler\nTapez 0 pour toutes les offres';
  return texte;
}

function trouverPoste(numero) {
  var data = chargerBCEIP();
  var id = parseInt(numero);
  return data.postes.find(function(p) { return p.id === id; }) || null;
}

async function traiterMessage(telephone, message) {
  var texte = message.trim().toLowerCase();
  var session = sessions[telephone] || { etape: 'debut' };

  if (session.etape === 'debut' || estSalutation(texte)) {
    sessions[telephone] = { etape: 'menu_affiche' };
    return 'Bonjour ! Bienvenue au Groupe BCEIP.\nPremier cabinet de recrutement guinéen depuis 1996.\n\n' + afficherPostes();
  }

  if (session.etape === 'menu_affiche' && estUnNombre(texte) && texte !== '0') {
    var poste = trouverPoste(texte);
    if (!poste) {
      return 'Numero invalide. Tapez un numero entre 1 et 8.';
    }
    sessions[telephone] = { etape: 'attente_nom', poste: poste };
    return 'Vous postulez pour : ' + poste.titre + '\nLieu : ' + poste.lieu + '\nContrat : ' + poste.type + '\n\nVeuillez entrer votre NOM COMPLET :';
  }

  if (session.etape === 'attente_nom') {
    if (message.trim().length < 3) {
      return 'Nom trop court. Entrez votre nom complet svp.';
    }
    sessions[telephone] = { etape: 'attente_email', poste: session.poste, nom: message.trim() };
    return 'Merci ' + message.trim() + '.\n\nEntrez votre ADRESSE EMAIL :';
  }

  if (session.etape === 'attente_email') {
    sessions[telephone] = { etape: 'attente_experience', poste: session.poste, nom: session.nom, email: message.trim() };
    return 'Email enregistré.\n\nCombien d\'ANNÉES D\'EXPÉRIENCE avez-vous dans ce domaine ?\n(Exemple : 3 ans)';
  }

  if (session.etape === 'attente_experience') {
    var candidature = await database.sauvegarderCommande({
      telephone: telephone,
      nom: session.nom,
      platId: session.poste.id,
      platNom: 'Candidature : ' + session.poste.titre,
      platPrix: 0,
      adresse: 'Email: ' + session.email + ' | Experience: ' + message.trim()
    });

    sessions[telephone] = { etape: 'debut' };

    if (!candidature) {
      return 'Erreur technique. Reessayez dans quelques instants.';
    }

    return 'Candidature enregistrée ! Référence : #' + candidature.id + '\n\nPoste : ' + session.poste.titre + '\nNom : ' + session.nom + '\nEmail : ' + session.email + '\nExpérience : ' + message.trim() + '\n\nNous vous contacterons sous 72h.\n\nMerci de votre confiance au Groupe BCEIP !';
  }

  if (texte === 'offres' || texte === '0') {
    sessions[telephone] = { etape: 'menu_affiche' };
    return afficherPostes();
  }

  if (texte === 'annuler') {
    sessions[telephone] = { etape: 'debut' };
    return 'Candidature annulée. Tapez offres pour voir les postes disponibles.';
  }

  return 'Je nai pas compris. Tapez offres pour voir les postes disponibles.';
}

function estSalutation(texte) {
  var salutations = ['bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'allo', 'emploi', 'travail', 'job', 'postuler'];
  return salutations.some(function(s) { return texte.includes(s); });
}

function estUnNombre(texte) {
  return /^\d+$/.test(texte.trim());
}

module.exports = { traiterMessage: traiterMessage };