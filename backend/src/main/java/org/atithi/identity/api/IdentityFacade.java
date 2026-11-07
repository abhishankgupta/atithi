package org.atithi.identity.api;

import java.util.Optional;
import java.util.UUID;

/** The identity module's public API for other modules. */
public interface IdentityFacade {

    Optional<UserSummary> findUser(UUID userId);
}
