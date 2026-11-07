-- Steps 4 and 5: travellers' trip requests, the agencies matched to them, and their proposals.

CREATE TABLE trip_requests (
    id                   UUID PRIMARY KEY,
    traveller_id         UUID         NOT NULL REFERENCES users (id),
    base_itinerary       VARCHAR(80),
    destinations         VARCHAR(300),
    start_date           DATE         NOT NULL,
    days                 INT          NOT NULL CHECK (days BETWEEN 1 AND 60),
    adults               INT          NOT NULL CHECK (adults BETWEEN 1 AND 20),
    children             INT          NOT NULL DEFAULT 0 CHECK (children BETWEEN 0 AND 20),
    budget               VARCHAR(32)  NOT NULL,
    hotel_style          VARCHAR(32)  NOT NULL,
    interests            VARCHAR(500),
    notes                VARCHAR(2000),
    consent_at           TIMESTAMPTZ  NOT NULL,
    status               VARCHAR(16)  NOT NULL DEFAULT 'SUBMITTED',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX trip_requests_traveller_idx ON trip_requests (traveller_id, created_at DESC);
CREATE INDEX trip_requests_status_idx ON trip_requests (status, created_at);

-- At most 5 agencies per request (enforced in the service); one row per agency.
CREATE TABLE request_matches (
    id                   UUID PRIMARY KEY,
    request_id           UUID        NOT NULL REFERENCES trip_requests (id) ON DELETE CASCADE,
    agency_id            UUID        NOT NULL REFERENCES agencies (id),
    status               VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    matched_by           UUID        REFERENCES users (id),
    contact_revealed_at  TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (request_id, agency_id)
);
CREATE INDEX request_matches_agency_idx ON request_matches (agency_id, created_at DESC);

-- One proposal per match, in a standard format so travellers can compare like for like.
CREATE TABLE proposals (
    id                UUID PRIMARY KEY,
    match_id          UUID          NOT NULL UNIQUE REFERENCES request_matches (id) ON DELETE CASCADE,
    price_per_person  NUMERIC(12,2) NOT NULL CHECK (price_per_person > 0),
    currency          VARCHAR(3)    NOT NULL,
    inclusions        VARCHAR(3000),
    hotels            VARCHAR(2000),
    day_plan          VARCHAR(8000) NOT NULL,
    valid_until       DATE          NOT NULL,
    created_by        UUID          NOT NULL REFERENCES users (id),
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- messaging module: one thread per match, between the traveller and the agency.
CREATE TABLE messages (
    id           UUID PRIMARY KEY,
    match_id     UUID          NOT NULL REFERENCES request_matches (id) ON DELETE CASCADE,
    sender_id    UUID          NOT NULL REFERENCES users (id),
    sender_side  VARCHAR(16)   NOT NULL,
    body         VARCHAR(4000) NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX messages_match_idx ON messages (match_id, created_at);
CREATE INDEX messages_sender_idx ON messages (sender_id, created_at);
