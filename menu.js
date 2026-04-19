var fs = require('fs');
var path = require('path');

function chargerRestaurant(id) {
  try {
    var fichier = path.join(__dirname, 'restaurants', id + '.json');
    var data = fs.readFileSync(fichier, 'utf8');
    return JSON.parse(data);
  } catch(e) {
    return null;
  }
}

function afficherMenu(restaurantId) {
  var restaurant = chargerRestaurant(restaurantId || 'baobab');
  if (!restaurant) return 'Restaurant non trouve.';
  
  var texte = 'Menu de ' + restaurant.nom + '\n\n';
  texte += 'PLATS\n';
  for (var i = 0; i < restaurant.plats.length; i++) {
    texte += restaurant.plats[i].id + '. ' + restaurant.plats[i].nom + ' - ' + restaurant.plats[i].prix + ' GNF\n';
  }
  texte += '\nBOISSONS\n';
  for (var j = 0; j < restaurant.boissons.length; j++) {
    texte += restaurant.boissons[j].id + '. ' + restaurant.boissons[j].nom + ' - ' + restaurant.boissons[j].prix + ' GNF\n';
  }
  texte += '\nTapez le numero du plat pour commander';
  return texte;
}

function trouverPlat(numero, restaurantId) {
  var restaurant = chargerRestaurant(restaurantId || 'baobab');
  if (!restaurant) return null;
  var id = parseInt(numero);
  var tous = restaurant.plats.concat(restaurant.boissons);
  for (var i = 0; i < tous.length; i++) {
    if (tous[i].id === id) return tous[i];
  }
  return null;
}

module.exports = { afficherMenu: afficherMenu, trouverPlat: trouverPlat, chargerRestaurant: chargerRestaurant };