package org.atithi.trip.api;

import java.util.Optional;
import java.util.UUID;

/** The trip module's public API for other modules. */
public interface TripFacade {

    Optional<MatchParticipants> participants(UUID matchId);
}
