package org.atithi.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.atithi.shared.Ids;

/** A hashed one-time code sent to a user's email address to prove they own it. */
@Entity
@Table(name = "email_codes")
class EmailCode {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected EmailCode() {
        // for JPA
    }

    EmailCode(UUID userId, String codeHash, Instant expiresAt) {
        this.id = Ids.newId();
        this.userId = userId;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    boolean isUsable(Instant now) {
        return consumedAt == null && expiresAt.isAfter(now);
    }

    int getAttempts() {
        return attempts;
    }

    String getCodeHash() {
        return codeHash;
    }

    void recordFailedAttempt() {
        attempts++;
    }

    void consume() {
        consumedAt = Instant.now();
    }
}
