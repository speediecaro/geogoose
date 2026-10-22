# GeoGoose website

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
