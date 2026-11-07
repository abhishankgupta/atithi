package org.atithi.trip.api;

import java.util.UUID;

/** Who may talk in a match's message thread: the request's traveller and the matched agency. */
public record MatchParticipants(UUID matchId, UUID requestId, UUID travellerId, UUID agencyId, String status) {

    public boolean isClosed() {
        return "DECLINED".equals(status);
    }
}
