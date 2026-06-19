# Database Notes

The platform uses PostgreSQL with the PostGIS extension enabled.

## Tables

- `users`: citizen, NGO, government, and admin identities with OTP metadata
- `animals`: master animal records with geospatial location
- `animal_photos`: gallery rows linked to an animal
- `cases`: rescue, abuse, conflict, lost-pet, and ABC cases
- `sightings`: lost-and-found observations used for match suggestions
- `abc_events`: request, capture, surgery, and return timeline
- `notifications`: user-specific event feed

## Geospatial Columns

- `animals.location`
- `cases.location`
- `sightings.location`
- `abc_events.location`

Each uses `GEOGRAPHY(POINT, 4326)` and has a GIST index for radius search and proximity checks.
