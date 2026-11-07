-- Atithi's first migration. Feature tables arrive with their steps (accounts in step 2, and so on).
-- Never edit a migration once it has run anywhere: add a new V2__..., V3__... file instead.

-- Trigram search for destinations, posts and agencies (used from step 3).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
