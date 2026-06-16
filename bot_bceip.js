require('dotenv').config();
var fs = require('fs');
var path = require('path');
var database = require('./database_mongo');

var sessions = {};

function chargerBCEIP() {
  var fichier = path.join(__dirname, 'restaurants', 'bceip.json');
  return JSON.parse(fs.readFileSync(fichier, 'utf8'));
}

function afficherDivisions() {
  var data = chargerBCEIP();
  var texte = 'Bienvenue au Groupe BCEIP !\nPremier cabinet de recrutement guinéen depuis 1996.\n\n';
  texte += 'Choisissez un domaine :\n\n';
  data.divisions.forEach(function(d) {
    texte += d.id + '. ' + d.nom + '\n';
  });
  texte += '\nTapez le numero du domaine qui vous intéresse';
  return texte;
}

function trouverDivision(numero) {
  var data = chargerBCEIP();
  var id = parseInt(numero);
  return data.divisions.find(function(d) { return d.id === id; }) || null;
}

function afficherPostes(division) {
  var texte = division.nom + ' - Postes disponibles\n\n';
  division.postes.forEach(function(p) {
    texte += p.id + '. ' + p.titre + ' | ' + p.lieu + ' | ' + p.type + '\n';
  });
  texte += '\nTapez le numero du poste pour postuler\nTapez 00 pour revenir aux domaines';
  return texte;
}

function trouverPoste(division, numero) {
  var id = parseInt(numero);
  return division.postes.find(function(p) { return p.id === id; }) || null;
}

async function traiterMessage(telephone, message, mediaUrl) {
  var texte = message.trim().toLowerCase();
  var session = sessions[telephone] || { etape: 'debut' };

  if (session.etape === 'debut' || estSalutation(texte)) {
    sessions[telephone] = { etape: 'choix_division' };
    return afficherDivisions();
  }

  if (session.etape === 'choix_division' && estUnNombre(texte)) {
    var division = trouverDivision(texte);
    if (!division) {
      return 'Numero invalide. Tapez un numero entre 1 et 8.';
    }
    sessions[telephone] = { etape: 'choix_poste', division: division };
    return afficherPostes(division);
  }

  if (session.etape === 'choix_poste') {
    if (texte === '00') {
      sessions[telephone] = { etape: 'choix_division' };
      return afficherDivisions();
    }
    if (estUnNombre(texte)) {
      var poste = trouverPoste(session.division, texte);
      if (!poste) {
        return 'Numero invalide. Reessayez ou tapez 00 pour revenir.';
      }
      sessions[telephone] = { etape: 'attente_nom', division: session.division, poste: poste };
      return 'Vous postulez pour : ' + poste.titre + '\nDomaine : ' + session.division.nom + '\nLieu : ' + poste.lieu + '\nContrat : ' + poste.type + '\n\nVeuillez entrer votre NOM COMPLET :';
    }
  }

  if (session.etape === 'attente_nom') {
    if (message.trim().length < 3) {
      return 'Nom trop court. Entrez votre nom complet svp.';
    }
    sessions[telephone] = { etape: 'attente_email', division: session.division, poste: session.poste, nom: message.trim() };
    return 'Merci ' + message.trim() + '.\n\nEntrez votre ADRESSE EMAIL :';
  }

  if (session.etape === 'attente_email') {
    sessions[telephone] = { etape: 'attente_experience', division: session.division, poste: session.poste, nom: session.nom, email: message.trim() };
    return 'Email enregistré.\n\nCombien d\'ANNÉES D\'EXPÉRIENCE avez-vous dans ce domaine ?\n(Exemple : 3 ans)';
  }

  if (session.etape === 'attente_experience') {
    sessions[telephone] = { etape: 'attente_cv', division: session.division, poste: session.poste, nom: session.nom, email: session.email, experience: message.trim() };
    return 'Parfait !\n\nVeuillez maintenant ENVOYER VOTRE CV (photo ou PDF) directement dans cette conversation.';
  }

  if (session.etape === 'attente_cv') {
    if (!mediaUrl) {
      return 'Merci d\'envoyer votre CV en photo ou PDF pour finaliser votre candidature.';
    }

    var candidature = await database.sauvegarderCommande({
      telephone: telephone,
      nom: session.nom,
      platId: session.poste.id,
      platNom: 'Candidature : ' + session.poste.titre,
      platPrix: 0,
      adresse: 'Domaine: ' + session.division.nom + ' | Email: ' + session.email + ' | Experience: ' + session.experience + ' | CV: ' + mediaUrl
    });

    sessions[telephone] = { etape: 'debut' };

    if (!candidature) {
      return 'Erreur technique. Reessayez dans quelques instants.';
    }

    return 'Candidature enregistrée ! Référence : #' + candidature.id + '\n\nDomaine : ' + session.division.nom + '\nPoste : ' + session.poste.titre + '\nNom : ' + session.nom + '\nEmail : ' + session.email + '\nExpérience : ' + session.experience + '\nCV : reçu ✅\n\nNous vous contacterons sous 72h.\n\nMerci de votre confiance au Groupe BCEIP !';
  }

  if (texte === 'menu' || texte === '00') {
    sessions[telephone] = { etape: 'choix_division' };
    return afficherDivisions();
  }

  if (texte === 'annuler') {
    sessions[telephone] = { etape: 'debut' };
    return 'Candidature annulée. Tapez menu pour revenir au début.';
  }

  return 'Je nai pas compris. Tapez menu pour revenir aux domaines.';
}

function estSalutation(texte) {
  var salutations = ['bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'emploi', 'travail', 'job', 'postuler'];
  var mots = texte.toLowerCase().split(/\s+/);
  return salutations.some(function(s) { return mots.includes(s); });
}


function estUnNombre(texte) {
  return /^\d+$/.test(texte.trim());
}

module.exports = { traiterMessage: traiterMessage };