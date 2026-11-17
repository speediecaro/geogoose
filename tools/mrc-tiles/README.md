# Donnees quebecoises : procedure reproductible par MRC

## Portee et etat actuel

Cette procedure prepare les adresses RQA et les empreintes du Referentiel
quebecois sur les batiments, avec la frontiere officielle SDA. Elle ne copie
pas le portail cadastral, le role d'evaluation, le zonage ou les orthophotos
de la MRC. Les trois sources sont sous licence CC BY 4.0; conserver leur
attribution et les dates. Publication recente ne signifie pas photographie
recente, couverture reelle exhaustive ou precision d'arpentage.

Le pilote valide est Antoine-Labelle, code `79`. L'exporteur accepte d'autres
codes de MRC et territoires equivalents issus du service SDA; aucune autre
MRC n'a encore ete extraite ni validee avec cette procedure. Ne pas annoncer
une couverture provinciale sur la seule base de ce pilote.

Les scripts et cette documentation sont dans le depot. Les donnees volumineuses,
Node portable et les tuiles intermediaires restent hors de la racine du site web.
Seule l'archive regionale finale et sa fiche de provenance sont livrees sous
`maps/`. L'archive mondiale et ses permissions CORS ne sont pas modifiees.

## Prerequis

- PowerShell 5.1 ou suivant pour l'extraction.
- Node.js 22 ou suivant et npm pour le tuilage et le serveur d'essai.
- Acces aux services publics listes dans les manifestes.
- Deux repertoires de sortie **nouveaux**, distincts et hors du site public.
- Espace disque suffisant : le pilote utilise environ 26 Mo d'export et
  18,2 Mo de tuiles non compressees, hors dependances et fichiers de controle.

Depuis ce repertoire :

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm test
powershell.exe -NoProfile -File ..\..\tests\Export-QuebecMrc.test.ps1
```

Le fichier de verrouillage npm doit rester avec le manifeste. Si la politique
PowerShell locale interdit les scripts et que leur execution est autorisee,
ajouter `-ExecutionPolicy Bypass` a **ce processus seulement**; ne pas modifier
la politique globale de la machine.

## 1. Choisir les codes officiels

Ne pas deduire les codes de MRC des codes postaux ni du nom d'une municipalite.
Le service des adresses emploie `CODE_MRC='79'`, pas `'790'`.

Inventaire SDA, sans donnees personnelles :

```powershell
$url = 'https://servicescarto.mrnf.gouv.qc.ca/pes/rest/services/Territoire/SDA_WMS/MapServer/1/query?f=json&where=1%3D1&outFields=MRS_CO_MRC,MRS_NM_MRC,MRS_CO_VER&returnGeometry=false'
$inventory = Invoke-RestMethod $url
if ($inventory.error -or $inventory.exceededTransferLimit) {
    throw 'Inventaire administratif en erreur ou tronque'
}
$inventory.features.attributes | Sort-Object MRS_CO_MRC
```

Pour une extension provinciale, prendre cet inventaire comme registre de travail,
traiter chaque code sequentiellement et conserver les echecs explicitement.
Valider d'abord une deuxieme MRC urbaine et une MRC eloignee. Les territoires
sans adresses ou batiments demandent un traitement explicite : l'exporteur
s'arrete actuellement sur un inventaire vide, sans le presenter comme un succes.
Il n'effectue pas encore un lot provincial automatique.

## 2. Extraire un instantane

Depuis ce repertoire (adapter les chemins) :

```powershell
powershell.exe -NoProfile -File ..\Export-QuebecMrc.ps1 `
    -MrcCode 79 -OutputDirectory C:\GeoGooseData\79-source-20261117
```

Fonctionnement :

- Frontiere SDA complete, sans la remplacer par une enveloppe rectangulaire.
- Inventaire de toutes les municipalites et TNO, y compris sans adresse.
- Adresses selectionnees par code de MRC. Les identifiants `ESRI_OID` du
  service et son ordre par decalage se sont reveles instables : ne pas revenir
  a une pagination `resultOffset`. Les requetes tronquees sont subdivisees
  par municipalite et prefixe d'identifiant d'adresse persistant.
- Le tri explicite `IDENTIFIANT_UNIQUE_ADRESSE` est necessaire sur ce service.
  Plusieurs autres combinaisons pourtant annoncees ont retourne HTTP/ArcGIS 400.
- Les logements au meme numero/suffixe, rue, municipalite et coordonnees
  deviennent un point. Toutes les qualites signalees sont conservees, ainsi que
  la modification la plus recente. Pas de noms d'occupants, proprietaires,
  numeros de logements ni identifiants d'evaluation dans les sorties.
- Batiments : WFS 2.0 POST, filtre `INTERSECTS` sur la frontiere exacte avec
  ses trous. Les empreintes traversant la frontiere restent entieres.
- CRS84 explicite, **longitude puis latitude**, pagination triee par
  `IDENTIFIANT`. Ne pas substituer EPSG:4326 sans verifier l'ordre des axes.
- Les totaux avant/apres, identifiants, coordonnees et geometries sont controles.
- Seul un succes ecrit `manifest.json` avec `complete=true`, versions, qualites,
  dates sources et SHA256. Un repertoire sans ce manifeste est incomplet.

Le service n'offre pas ici une transaction gelee. Meme des comptes identiques
avant/apres ne prouvent pas qu'aucune fiche n'a change pendant l'extraction.
Pour une publication reguliere a grande echelle, preferer evaluer les archives
provinciales GPKG/CSV versionnees afin d'eviter de nombreuses requetes WFS/RQA.
Ne pas telecharger en parallele toutes les MRC sans mesurer la charge.

## 3. Compiler et verifier les tuiles

```powershell
node build.mjs C:\GeoGooseData\79-source-20261117 C:\GeoGooseData\79-tiles-20261117
node validate.mjs C:\GeoGooseData\79-tiles-20261117
npm test
```

La compilation verifie d'abord tous les SHA256 sources. Elle produit des tuiles
vectorielles MVT **version 2**, extent 4096, tampon 128, sans simplification,
zooms 12 a 15; adresses a partir de 14. MapLibre surzoome au-dela de 15.
Le manifeste n'est ecrit qu'apres verification de la presence de tous les
identifiants au zoom maximal.

Le validateur relit les PBF sur disque : version, extent, geometries decodables,
coordonnees finies, comptes par zoom, octets et identifiants uniques. Ne pas
valider seulement les index GeoJSON avant encodage : les points MVT et les
lignes/polygones n'ont pas la meme profondeur de tableaux.
Le manifeste inventorie aussi les cles z/x/y : une tuile attendue manquante
est une erreur, pas une absence normale de couverture.

Resultat du pilote (17 novembre 2026 UTC, soir du 16 au Quebec) :

| Mesure | Resultat |
|---|---:|
| Adresses sources | 32 879 |
| Points apres regroupement des logements | 29 291 |
| Batiments | 41 202 |
| Tuiles z12 / z13 / z14 / z15 | 356 / 900 / 1 817 / 3 598 |
| Octets PBF totaux | 18 149 047 |
| Plus grosse tuile officielle | 238 059 octets |

Adresses : version 2026-11-01; batiments : BATI20260601; frontiere : V2026-10.
Ces tailles concernent la couche officielle, pas les tuiles fusionnees avec
le fond mondial. Aucun seuil de performance universel n'est garanti.

## 4. Ouvrir la comparaison locale

```powershell
node server.mjs C:\GeoGooseData\79-tiles-20261117
```

Ouvrir <http://127.0.0.1:18767/>. Le serveur ecoute uniquement sur loopback,
ne sert qu'une liste explicite de fichiers et des chemins de tuiles valides,
et refuse les autres noms d'hote. Il ne rend pas le repertoire source public.
Verifier <http://127.0.0.1:18767/health> apres le lancement.

Le serveur lit par plages HTTP **la meme archive mondiale** que la production,
puis rapproche les tuiles a la demande. Ce relais est reserve a l'essai local :
il ne modifie pas les droits CORS distants et ne prouve pas qu'un futur
hebergement de tuiles acceptera directement le navigateur. Une erreur de source
retourne 502 et s'affiche dans la page; pas de repli raster silencieux.

Rapprochement experimental, uniquement lorsque la couche quebecoise est active :

- Contour OSM `building` / `building_part` retire si le chevauchement avec un
  contour officiel atteint 35 % de la superficie du plus petit. Un simple
  contact de bordure ne suffit pas. Les OSM sans correspondance restent visibles.
- Numero OSM retire seulement si le numero/suffixe normalise correspond a un
  point officiel a 20 m ou moins. Les conflits eloignes restent visibles :
  aucune correction arbitraire du fond mondial.
- Points d'interet, commerces, noms de routes et autres couches conserves.
- La case de comparaison restaure les tuiles mondiales originales quand elle
  est desactivee; les deux sources ne sont jamais modifiees.
- Ces seuils sont des heuristiques, pas une preuve d'identite. Batiments contigus,
  complexes, numeros proches sur des rues differentes et limites de tuiles
  demandent une validation humaine avant publication.

Le cache local est limite a 128 tuiles; les rapprochements se recalculent si
necessaire. Les compteurs `/health` comptent des operations sur tuiles, **pas**
des batiments uniques dans tout le territoire.

## 5. Controle visuel et mobile avant toute publication

1. Verifier le vrai fond mondial, pas le repli raster de l'ancien petit apercu.
2. Visiter Mont-Laurier, Riviere-Rouge et Notre-Dame-du-Laus; zoomer
   pour lire les numeros, toucher les contours et consulter qualite/date.
3. Basculer la case : disparition de toute couche officielle, restauration
   des OSM correspondants, puis retour des donnees quebecoises.
4. Verifier aussi un lieu hors MRC : aucun masquage regional global des OSM.
5. Attendre la fin du placement des symboles; `map.loaded()` seul peut preceder
   l'affichage final des numeros.
6. Tester a 390 px de largeur : aucun debordement horizontal, commandes
   utilisables, fenetres lisibles. Ce test de viewport n'est pas une mesure
   de fluidite sur un telephone physique.
7. Simuler une tuile en erreur : message explicite, aucune fausse reussite.
8. Relever requetes, tailles et temps, a froid et a chaud. Les tuiles MapLibre
   sont chargees par des workers : les seules entrees Performance du document
   ne suffisent pas pour compter leurs requetes.

Le manque de sprite `townhall` existait deja dans le style mondial. Il reste
distinct des erreurs de donnees de ce pilote.

Controles effectues sur le pilote : compilation et relecture de toutes les
tuiles, tests automatises synthetiques, comparaison active/inactive,
affichage de numeros et batiments dans les trois centres municipaux,
absence de debordement a 390 px, popup de source, conservation des batiments
OSM a Montreal hors MRC, erreur HTTP 502 simulee signalee explicitement.
La fluidite sur un telephone physique reste a verifier.

Les verifications manuelles d'adresses particulieres restent locales : ne pas
archiver leurs adresses, coordonnees, boutons dedies, captures ou scenarios
dans GitHub. Les tests automatises doivent utiliser des donnees synthetiques.
Cela n'exclut aucune adresse ordinaire du jeu cartographique ouvert.

## 6. Archive et livraison publique du pilote

```powershell
node publish-archive.mjs C:\GeoGooseData\79-tiles-20261117 C:\GeoGooseData\79-public-20261117
pmtiles convert C:\GeoGooseData\79-public-20261117\regional.mbtiles ..\..\maps\antoine-labelle-20261117.pmtiles
pmtiles verify ..\..\maps\antoine-labelle-20261117.pmtiles
node validate-archive.mjs C:\GeoGooseData\79-tiles-20261117 ..\..\maps\antoine-labelle-20261117.pmtiles
Get-FileHash ..\..\maps\antoine-labelle-20261117.pmtiles -Algorithm SHA256
npm test
```

Le compilateur utilise `node:sqlite` fourni avec Node 22 (avertissement
experimental attendu), quatre lecteurs de plages HTTP et au plus quatre
tentatives explicites par lecture. Un echec definitif annule la transaction,
sans `build.json` complet : ne pas convertir cette sortie. Recommencer dans un
repertoire nouveau. Aucune dependance SQLite native supplementaire n'est requise.

Chaque tuile contient le fond mondial complet, rapproche avec les donnees
quebecoises, pas seulement une surcouche. Le validateur final relit les
6 671 tuiles de l'archive et compare tous les identifiants, proprietes et
geometries QC aux PBF verifies. Le pilote conserve 41 202 batiments et
29 291 points d'adresse. Archive finale : 23 362 662 octets; plus grande tuile
fusionnee decodee : 254 080 octets.

Publier aussi la fiche JSON voisine : SHA256, taille, versions, sources,
licences CC BY 4.0 et ODbL, compteurs, transformations et limites.
Ne pas publier SQLite, exports bruts, dependances ou exemples d'adresses
utilises pour des verifications manuelles.

`regional-map.js` selectionne l'archive regionale aux zooms 12 a 15,
et l'archive mondiale quand la tuile regionale est absente. Une panne de
l'archive n'est pas une absence normale : l'erreur se propage vers le
repli OpenStreetMap existant, signale dans le visualiseur; sa legende mondiale
est alors masquee. Les anciens liens et traces GPS ne changent pas.

Les couleurs violettes des couches `qc_buildings` et `qc_addresses` indiquent
la source, pas une qualite garantie. La legende et sa restriction a la MRC
sont traduites dans les dix langues. Aucune frontiere de diagnostic n'est
ajoutee a la carte publique.

Pour une mise a jour, choisir un nom d'archive immuable nouveau et mettre a jour
son URL dans `world-map.js`, sa fiche JSON et les versions CSS/JS dans
`t/index.html`. Avant publication, valider le visualiseur et `tests/map.html`.
Apres le deploiement GitHub Pages, verifier un vrai GET Range (reponse 206 et
Content-Range exact), la carte dans/hors MRC, les couleurs de legende, le
repli en cas d'erreur et l'absence de debordement mobile.
Le serveur Node local n'est jamais requis par la production.

Retour arriere : retablir ensemble les scripts/styles et `t/index.html` de
la revision precedente par un nouveau commit, sans reecrire l'historique.
L'archive mondiale reste disponible et inchangee. Garder les anciennes
archives regionales tant que des pages en cache peuvent encore les demander.

## 7. Extension a toutes les MRC : reste a faire

- Registre exhaustif depuis SDA, etat reussi/echoue par code et versions.
- Evaluer un import provincial unique depuis archives plutot que des milliers
  de requetes; definir une cadence realiste pour chaque source.
- Tester d'autres regions et les contours chevauchant deux MRC; utiliser le
  `sourceId` provincial pour eviter les doubles comptes entre exports.
- Evaluer la taille et la cadence des tuiles fusionnees precompilees pour
  l'ensemble du Quebec, sans charger l'archive entiere dans le navigateur.
- Pour un paquet public unique, dedupliquer les frontieres entre MRC,
  assembler les tuiles par cle z/x/y puis seulement creer l'archive PMTiles;
  ne pas ecraser les tuiles d'une MRC avec celles de sa voisine.
- Tester cache, plages HTTP, attribution, CORS/CSP, indisponibilite, consommation
  reseau, memoire et gestes sur de vrais telephones.
- Publier un nouveau jeu versionne, garder le precedent pour retour arriere,
  puis changer le visualiseur apres validation. Pas de remplacement direct
  de l'archive mondiale ni d'ecriture dans OpenStreetMap.

## Emplacements du pilote de cette session

Racine locale :
`C:\Users\speed\.copilot\session-state\60c0cdbe-2e01-4ed2-bf80-00c461501ef3\files`

- Sources : `antoine-labelle-20261117-verified`
- Tuiles validees MVT v2 avec inventaire : `antoine-labelle-tiles-20261117-final`
- Node portable : `node-v22.23.5-win-x64`

Si Node n'est pas dans PATH, utiliser le chemin complet de `node.exe` et,
pour npm, `node.exe CHEMIN\node_modules\npm\bin\npm-cli.js ci ...`.
Le serveur est attache a la session : ne pas supposer qu'il survivra a sa
fermeture; les sources, tuiles, scripts et cette procedure restent sur disque.
