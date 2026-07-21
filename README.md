# SuiviSport

SuiviSport contient l'application iOS SwiftUI existante et une nouvelle application web React dans `web/`.

## Application web

La version web est une vraie application de suivi sportif utilisable sans backend. Les donnees sont conservees dans le navigateur avec `localStorage` et des donnees de demonstration sont chargees au premier lancement.

Fonctionnalites principales :

- tableau de bord du jour avec seances prevues, lancement rapide et historique recent ;
- programmes musculation et course avec creation, edition et suppression ;
- calendrier mensuel pour planifier musculation et course ;
- seance de musculation en direct avec series, poids, reps, RPE, notes et timer de repos ;
- suivi course avec sorties planifiees, sorties realisees, historique et statistiques 7/30 jours ;
- progression avec filtres, graphiques, records personnels et exercices les plus travailles ;
- export CSV des seances de musculation.

## Lancer en local

```bash
cd web
npm install
npm run dev
```

Vite affiche ensuite l'URL locale, generalement `http://127.0.0.1:5173/`.

## Builder

```bash
cd web
npm run build
```

Le build statique est genere dans `web/dist/`.

## Deploiement GitHub Pages

Le projet Vite est configure avec `base: "/applisport/"`, adapte a une publication GitHub Pages depuis le repository GitHub `AAzertyYiop/applisport`.

Le workflow `.github/workflows/deploy-web.yml` publie automatiquement l'application web a chaque push sur `main` qui modifie `web/**` ou le workflow.

Pour activer GitHub Pages :

1. Aller dans **Settings -> Pages** du repository GitHub.
2. Choisir **Source -> GitHub Actions**.
3. Pousser sur `main`.

L'URL publique sera :

```text
https://aazertyyiop.github.io/applisport/
```

## Donnees

Les donnees restent dans le stockage du navigateur de l'appareil. Le bouton de reinitialisation recharge les donnees de demonstration. L'export CSV permet de sauvegarder les seances de musculation.

## Architecture

- React, TypeScript et Vite.
- `localStorage` pour les programmes, la planification, les seances et les statistiques.
- `lucide-react` pour les icones.
- `recharts` pour les graphiques.
- GitHub Actions pour le deploiement sur GitHub Pages.

Le projet Xcode reste independant. Il n'est pas necessaire pour utiliser ou publier l'application web.
