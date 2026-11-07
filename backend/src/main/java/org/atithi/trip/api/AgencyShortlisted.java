package org.atithi.trip.api;

import java.util.UUID;

/** A traveller shortlisted an agency; their contact details are now visible to that agency. */
public record AgencyShortlisted(UUID matchId, UUID requestId, UUID travellerId, UUID agencyId) {
}
