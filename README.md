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

GeoGoose blue is the only map palette, including the route line and point
outlines. Older links with a `palette` query parameter also use blue.

## Browser checks

Serve this directory with a local static HTTP server, then open
`tests/map.html`. The result reports PASS or FAIL. Checks cover all languages,
English fallback, driving/walking URL parameters, ordered waypoint coverage,
the mobile waypoint limit, and the fixed blue palette.
