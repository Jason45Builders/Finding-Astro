# API Reference

Base URL: `/api/v1`

## Auth

- `POST /auth/request-otp`
- `POST /auth/verify-otp`
- `GET /auth/me`

## Users

- `GET /users`
- `GET /users/:id`

## Animals

- `GET /animals`
- `GET /animals/:id`
- `POST /animals`
- `PATCH /animals/:id`
- `GET /animals/sightings`
- `POST /animals/sightings`

## Cases

- `GET /cases`
- `GET /cases/:id`
- `POST /cases`
- `PATCH /cases/:id`

## ABC

- `GET /abc/tracking`
- `POST /abc/requests`
- `POST /abc/events`

## AI

- `POST /ai/matches`
- `POST /ai/duplicates`

## Notifications

- `GET /notifications`
- `PATCH /notifications/:id/read`

## Conflicts

- `GET /conflicts`
- `POST /conflicts`

## Legal

- `GET /legal`
