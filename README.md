# GeoGoose website

## Quebec regional map data

The public viewer supplements the world map with Quebec open address and
building references for the entire Antoine-Labelle MRC (code 79).
Purple legend entries identify these sources in all ten viewer languages.
Coverage, dates, licenses and SHA256 are recorded in
[`maps/antoine-labelle-20261117.json`](maps/antoine-labelle-20261117.json).
Extraction, validation, publication and rollback instructions are in
[`tools/mrc-tiles/README.md`](tools/mrc-tiles/README.md).
Other Quebec MRCs have not yet been imported. Manual address-specific checks
are not permanent tests or examples in this repository.

## Administrative backup OAuth pages

`backups/index.html` and `backups/privacy/index.html` describe the private
GeoGoose Backups tool and its limited Google Drive `drive.file` authorization.
They are separate from the Android app privacy policy and contain no backup
files, credentials, or public sign-in flow. Use their HTTPS URLs in the Google
OAuth branding configuration; domain ownership verification remains a separate
Google Console step.

The route viewer is served from `t/index.html`. Coordinates stay in the URL
fragment until a visitor chooses a Google Maps link. OpenStreetMap supplies map
tiles; Google Maps links remain available when tiles or Leaflet cannot load.

The viewer supports the ten app languages. An explicitly requested unsupported
language falls back to English. Without a requested language, the browser
language is used if supported, otherwise English. HONK is never translated.

Google directions offer driving and walking. Each part includes its origin,
up to three intermediate waypoints and its destination for mobile browser
compatibility. Consecutive parts share an endpoint and retain every transmitted
point in order. Google recalculates a route; it is not the exact GPS trace.
The viewer cannot recover points omitted from the original link.

Google Maps route links and travel options are collapsed by default to leave
room for the map on phones. The last-position link stays visible in the header.
Open the Google Maps
disclosure to show them; closing it does not change the selected travel mode.
The map can fill the viewport using its expand button and return to the normal
layout using the same button or Escape. Leaflet resizes without resetting the
current route or zoom.

The viewer declares `color-scheme: only light` in CSS and an early HTML meta
tag to opt out of browser automatic darkening. The map uses a light palette,
so its HTML legend must retain matching colors even with a dark system theme.
Browser extensions or accessibility overrides may still alter rendering.

The collapsible legend beside the expand button explains the GPS trace and
position markers in all ten viewer languages. It remains accessible in expanded
view, scrolls independently and does not reduce the map height. World-map color
swatches describe the main mapped land-cover, building, path and boundary layers;
they are hidden when the viewer uses the OpenStreetMap fallback, whose palette
is different. A coverage note explains that detail depends on zoom and available
data: a missing building outline does not establish that no building exists.
World-map address numbers start at MapLibre zoom 14 (Leaflet zoom 15), use
upright, darker text with a white halo, and grow with zoom. Alternative label
anchors help avoid collisions without forcing overlapping numbers. They still
depend on address points present in the archive and do not imply a building
footprint is available.
The legend also illustrates forest, wetland, garden and cemetery motifs, plus
parking, toilets, camping, shopping, pharmacy, bank, worship and subway symbols.
Sand/beach and sports-pitch swatches describe existing style layers; no generic
desert category is implied. These are a key to supported symbols, not an
inventory of features currently visible in the viewport.

GeoGoose blue is the only map palette, including the route line and point
outlines. Older links with a `palette` query parameter also use blue.

## Compatibility with app build 28

Build 28 links use `/t/#p=<base64url-polyline>&lang=<locale>` with coordinate
precision 1e5. This format remains supported, including regional language tags
such as `fr-CA`. Updating the viewer does not require updating the installed
app or replacing previously sent links. Tests exercise the original fragment
format as well as query-language links, with 10- and 40-point traces.

## Browser checks

Serve this directory with a local static HTTP server, then open
`tests/map.html`. The result reports PASS or FAIL. Checks cover all languages,
English fallback, driving/walking URL parameters, ordered waypoint coverage,
the mobile waypoint limit, the fixed blue palette, collapsed Google links,
and mobile map expansion/restoration.

The dark presentation and privacy page use the app's navy backgrounds,
cyan accents and rounded controls. The policy was updated on October 22, 2026
for version 3.5.2, build 33: exact caller matching using the SIM or network
country, dialed numbers kept locally for 24 hours as allowed callbacks while
call blocking is enabled, and a 24-hour window allowing all calls after an
emergency call. Earlier updates cover local trip history, pauses, offline PDF/CSV exports,
selective trip/POI/photo sharing, deletion of independent copies, and per-feature
operator SMS charge consent including history-only tracking without SMS.
It also describes saved capture cadence, optional cumulative SMS duration,
background tracking limitations and battery use.
Open `tests/presentation.html` to check French/English navigation, mobile and
desktop overflow, and text contrast before approving publication.
