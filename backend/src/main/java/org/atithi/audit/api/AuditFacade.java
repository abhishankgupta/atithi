package org.atithi.audit.api;

import java.util.UUID;

/** Append-only record of sensitive actions (contact reveals, verifications, matches). */
public interface AuditFacade {

    /** Writes in the caller's transaction, so the action and its audit row commit together. */
    void record(UUID actorId, String action, String targetType, UUID targetId, String details);
}
