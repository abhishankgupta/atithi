package org.atithi.trip.api;

import java.util.UUID;

/** An agency sent (or updated) its proposal for a request. */
public record ProposalSent(UUID matchId, UUID requestId, UUID travellerId, UUID agencyId, boolean firstVersion) {
}
