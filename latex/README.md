# Presentation LaTeX (Beamer) - Version longue

Ce dossier contient uniquement la version longue de la presentation Beamer.

## Fichier principal

- presentation_beamer.tex

## Compilation

Avec pdflatex (2 passes recommandees):

```bash
cd latex
pdflatex presentation_beamer.tex
pdflatex presentation_beamer.tex
```

Avec latexmk:

```bash
cd latex
latexmk -pdf presentation_beamer.tex
```
