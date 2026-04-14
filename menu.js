var MENU = {
  plats: [
    { id: 1, nom: "Riz sauce arachide", prix: 15000 },
    { id: 2, nom: "Thieboudiene", prix: 18000 },
    { id: 3, nom: "Poulet yassa", prix: 20000 },
    { id: 4, nom: "Brochettes de boeuf", prix: 12000 },
    { id: 5, nom: "Attieke poisson", prix: 16000 }
  ],
  boissons: [
    { id: 6, nom: "Jus bissap", prix: 3000 },
    { id: 7, nom: "Jus gingembre", prix: 3000 },
    { id: 8, nom: "Eau minerale", prix: 2000 }
  ]
};

function afficherMenu() {
  var texte = "Menu du Restaurant Le Baobab\n\n";
  texte += "PLATS\n";
  for (var i = 0; i < MENU.plats.length; i++) {
    texte += MENU.plats[i].id + ". " + MENU.plats[i].nom + " - " + MENU.plats[i].prix + " GNF\n";
  }
  texte += "\nBOISSONS\n";
  for (var j = 0; j < MENU.boissons.length; j++) {
    texte += MENU.boissons[j].id + ". " + MENU.boissons[j].nom + " - " + MENU.boissons[j].prix + " GNF\n";
  }
  texte += "\nTapez le numero du plat pour commander";
  return texte;
}

function trouverPlat(numero) {
  var id = parseInt(numero);
  var tous = MENU.plats.concat(MENU.boissons);
  for (var i = 0; i < tous.length; i++) {
    if (tous[i].id === id) return tous[i];
  }
  return null;
}

module.exports = { MENU: MENU, afficherMenu: afficherMenu, trouverPlat: trouverPlat };