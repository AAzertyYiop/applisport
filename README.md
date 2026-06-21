# SuiviSport

SuiviSport est une application web installable qui reprend les fonctions principales de l’application Swift : programmes de musculation et de course, séances et exercices, calendrier, séance en direct, historique et suivi de progression. Elle fonctionne sur téléphone et ordinateur, y compris hors ligne, sans compte, serveur, clé API ni abonnement développeur Apple.

## Lancer localement

Un simple serveur statique suffit :

```sh
python3 -m http.server 8000
```

Ouvrir ensuite `http://localhost:8000`.

## Publier avec GitHub Pages

1. Pousser le projet sur un dépôt GitHub dont la branche principale est `main`.
2. Dans **Settings → Pages → Build and deployment**, choisir **GitHub Actions**.
3. Le workflow `Déployer SuiviSport sur GitHub Pages` publie automatiquement chaque modification de `main`.
4. Sur iPhone, ouvrir l’adresse dans Safari puis choisir **Partager → Sur l’écran d’accueil**.

Les données restent dans le stockage du navigateur de l’appareil. Utiliser **••• → Exporter toutes les données** pour faire une sauvegarde ou transférer les données vers un autre appareil.

## Architecture

- HTML, CSS et JavaScript natifs, sans étape de compilation.
- `localStorage` pour les programmes, la planification, les séances et les statistiques.
- Service worker pour le fonctionnement hors ligne.
- GitHub Actions pour le déploiement sur GitHub Pages.

Le projet Xcode reste indépendant. Il n’est pas nécessaire pour utiliser ou publier l’application web.
# applisport
