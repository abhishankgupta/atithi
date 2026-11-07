-- Step 2: accounts, roles, sessions, email verification codes and travel agencies.

-- identity module. Contact details (email) are never shown publicly or to agents before shortlisting.
CREATE TABLE users (
    id                 UUID PRIMARY KEY,
    email              VARCHAR(254) NOT NULL UNIQUE,
    password_hash      VARCHAR(100) NOT NULL,
    display_name       VARCHAR(80)  NOT NULL,
    country            VARCHAR(80),
    status             VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    email_verified_at  TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role        VARCHAR(32) NOT NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role)
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    family_id   UUID        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family_id);

-- Hashed, short-lived codes that prove a user owns their email address.
CREATE TABLE email_codes (
    id           UUID PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code_hash    VARCHAR(64) NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    attempts     INT         NOT NULL DEFAULT 0,
    consumed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX email_codes_user_idx ON email_codes (user_id, created_at DESC);

-- agency module. An agency only receives travellers' requests once an admin has verified it.
CREATE TABLE agencies (
    id               UUID PRIMARY KEY,
    name             VARCHAR(120) NOT NULL,
    city             VARCHAR(80)  NOT NULL,
    mot_approval_no  VARCHAR(80),
    website          VARCHAR(200),
    description      VARCHAR(1000),
    status           VARCHAR(16)  NOT NULL DEFAULT 'UNVERIFIED',
    verified_at      TIMESTAMPTZ,
    verified_by      UUID REFERENCES users (id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX agencies_status_idx ON agencies (status);

-- One agency per user for the MVP.
CREATE TABLE agency_members (
    agency_id   UUID        NOT NULL REFERENCES agencies (id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    role        VARCHAR(16) NOT NULL DEFAULT 'OWNER',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (agency_id, user_id)
);

-- audit module: append-only log of sensitive actions (verifications, matches, contact reveals).
CREATE TABLE audit_log (
    id           UUID PRIMARY KEY,
    actor_id     UUID REFERENCES users (id),
    action       VARCHAR(64) NOT NULL,
    target_type  VARCHAR(32) NOT NULL,
    target_id    UUID        NOT NULL,
    details      VARCHAR(500),
    at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_target_idx ON audit_log (target_type, target_id);
