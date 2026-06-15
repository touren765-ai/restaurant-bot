function calculerScore(candidature, info) {
  var score = 0;
  var details = [];

  // Expérience (jusqu'à 50 points)
  var experience = parseInt(info.experience) || 0;
  var pointsExp = Math.min(experience * 10, 50);
  score += pointsExp;
  if (experience >= 5) details.push('Expérience solide (' + experience + ' ans)');
  else if (experience >= 2) details.push('Expérience correcte (' + experience + ' ans)');
  else details.push('Expérience limitée (' + experience + ' an(s))');

  // Profil complet (30 points)
  var profilComplet = 0;
  if (candidature.client_nom && candidature.client_nom.length > 3) profilComplet += 10;
  if (info.email && info.email.includes('@')) profilComplet += 10;
  if (info.cv) profilComplet += 10;
  score += profilComplet;
  if (profilComplet === 30) details.push('Profil complet (nom, email, CV)');
  else details.push('Profil incomplet');

  // Email professionnel (10 points)
  if (info.email && !info.email.includes('gmail') && !info.email.includes('yahoo') && !info.email.includes('hotmail')) {
    score += 10;
    details.push('Email professionnel');
  } else if (info.email) {
    score += 5;
  }

  // CV fourni (10 points bonus)
  if (info.cv) {
    score += 10;
  }

  if (score > 100) score = 100;

  var niveau = 'À examiner';
  if (score >= 80) niveau = 'Excellent';
  else if (score >= 60) niveau = 'Bon';
  else if (score >= 40) niveau = 'Moyen';

  return { score: score, niveau: niveau, details: details };
}

module.exports = { calculerScore: calculerScore };