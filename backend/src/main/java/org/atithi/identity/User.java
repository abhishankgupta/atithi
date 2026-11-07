package org.atithi.identity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.atithi.shared.Ids;

@Entity
@Table(name = "users")
class User {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column
    private String country;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private Set<Role> roles = new HashSet<>();

    protected User() {
        // for JPA
    }

    User(String email, String passwordHash, String displayName, String country, Set<Role> roles) {
        Instant now = Instant.now();
        this.id = Ids.newId();
        this.email = email;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.country = country;
        this.status = UserStatus.ACTIVE;
        this.createdAt = now;
        this.updatedAt = now;
        this.roles.addAll(roles);
    }

    void updateProfile(String newDisplayName, String newCountry) {
        if (newDisplayName != null) {
            this.displayName = newDisplayName;
        }
        if (newCountry != null) {
            this.country = newCountry.isBlank() ? null : newCountry;
        }
        this.updatedAt = Instant.now();
    }

    void markEmailVerified() {
        if (emailVerifiedAt == null) {
            emailVerifiedAt = Instant.now();
            updatedAt = emailVerifiedAt;
        }
    }

    UUID getId() {
        return id;
    }

    String getEmail() {
        return email;
    }

    String getPasswordHash() {
        return passwordHash;
    }

    String getDisplayName() {
        return displayName;
    }

    String getCountry() {
        return country;
    }

    UserStatus getStatus() {
        return status;
    }

    boolean isEmailVerified() {
        return emailVerifiedAt != null;
    }

    Instant getCreatedAt() {
        return createdAt;
    }

    Set<Role> getRoles() {
        return roles.isEmpty() ? EnumSet.noneOf(Role.class) : EnumSet.copyOf(roles);
    }
}
