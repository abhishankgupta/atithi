package org.atithi.identity;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface EmailCodeRepository extends JpaRepository<EmailCode, UUID> {

    long countByUserIdAndCreatedAtAfter(UUID userId, Instant after);

    Optional<EmailCode> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);
}
