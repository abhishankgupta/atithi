package org.atithi.messaging.api;

import java.util.UUID;

/** A message was posted in a match's thread. {@code fromTraveller} says which side sent it. */
public record MessagePosted(UUID matchId, UUID requestId, UUID travellerId, UUID agencyId, boolean fromTraveller,
                            String excerpt) {
}
