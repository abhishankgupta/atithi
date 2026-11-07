package org.atithi.agency.api;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The agency module's public API for other modules. */
public interface AgencyFacade {

    Optional<AgencyView> find(UUID agencyId);

    /** The agency this user works for, if any (one per user in the MVP). */
    Optional<AgencyView> agencyOfMember(UUID userId);

    boolean isMember(UUID agencyId, UUID userId);

    List<UUID> memberIds(UUID agencyId);
}
