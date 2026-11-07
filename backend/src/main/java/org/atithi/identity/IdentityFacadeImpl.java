package org.atithi.identity;

import java.util.Optional;
import java.util.UUID;
import org.atithi.identity.api.IdentityFacade;
import org.atithi.identity.api.UserSummary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class IdentityFacadeImpl implements IdentityFacade {

    private final UserRepository users;

    IdentityFacadeImpl(UserRepository users) {
        this.users = users;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserSummary> findUser(UUID userId) {
        return users.findById(userId).map(u -> new UserSummary(u.getId(), u.getDisplayName(), u.getEmail(),
                u.getCountry(), u.getRoles().stream().map(Enum::name).sorted().toList(), u.isEmailVerified(),
                u.getCreatedAt()));
    }
}
