# SuiviSport

SuiviSport est une application web installable pour consigner ses séances sportives. Elle fonctionne sur téléphone et ordinateur, y compris hors ligne, sans compte, serveur, clé API ni abonnement développeur Apple.

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

Les séances restent dans le stockage du navigateur de l’appareil. Utiliser **Options → Exporter mes données** pour faire une sauvegarde ou transférer les données vers un autre appareil.

## Architecture

- HTML, CSS et JavaScript natifs, sans étape de compilation.
- `localStorage` pour les séances.
- Service worker pour le fonctionnement hors ligne.
- GitHub Actions pour le déploiement sur GitHub Pages.

L’ancien prototype Xcode est conservé dans les dossiers `SuiviSport*` à titre d’archive. Il n’est plus nécessaire pour utiliser ou publier l’application web.
# applisport
