package org.atithi.trip.api;

import java.util.UUID;

/** An admin matched a traveller's request to an agency. */
public record RequestMatched(UUID matchId, UUID requestId, UUID agencyId) {
}
