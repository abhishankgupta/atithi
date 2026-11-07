package org.atithi.identity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.atithi.identity.api.AuthResponse;
import org.atithi.identity.api.CurrentUserDto;
import org.atithi.shared.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Issues short-lived access JWTs and rotating, family-tracked refresh tokens. */
@Service
class TokenService {

    static final String ISSUER = "atithi";

    private final JwtEncoder jwtEncoder;
    private final RefreshTokenRepository refreshTokens;
    private final UserRepository users;
    private final AuthProperties properties;

    TokenService(JwtEncoder jwtEncoder, RefreshTokenRepository refreshTokens, UserRepository users,
                 AuthProperties properties) {
        this.jwtEncoder = jwtEncoder;
        this.refreshTokens = refreshTokens;
        this.users = users;
        this.properties = properties;
    }

    /** Starts a new token family, e.g. after login. */
    @Transactional
    AuthResponse issueForNewSession(User user) {
        return issue(user, UUID.randomUUID());
    }

    /**
     * Swaps a refresh token for a new pair. Reusing a token that was already rotated means it may
     * have been stolen, so the whole family is revoked and the user must sign in again.
     */
    @Transactional(noRollbackFor = ApiException.class)
    AuthResponse rotate(String presentedToken) {
        RefreshToken token = refreshTokens.findByTokenHash(Hashing.sha256Hex(presentedToken))
                .orElseThrow(TokenService::invalidRefresh);
        Instant now = Instant.now();
        if (token.isRevoked()) {
            refreshTokens.findByFamilyId(token.getFamilyId()).forEach(RefreshToken::revoke);
            throw invalidRefresh();
        }
        if (token.isExpired(now)) {
            throw invalidRefresh();
        }
        User user = users.findById(token.getUserId()).orElseThrow(TokenService::invalidRefresh);
        if (user.getStatus() != UserStatus.ACTIVE) {
            token.revoke();
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", "This account is suspended");
        }
        token.revoke();
        return issue(user, token.getFamilyId());
    }

    @Transactional
    void revoke(String presentedToken) {
        refreshTokens.findByTokenHash(Hashing.sha256Hex(presentedToken)).ifPresent(RefreshToken::revoke);
    }

    static CurrentUserDto toDto(User user) {
        return new CurrentUserDto(user.getId(), user.getDisplayName(), user.getEmail(), user.getCountry(),
                roleNames(user), user.isEmailVerified());
    }

    private static List<String> roleNames(User user) {
        return user.getRoles().stream().map(Enum::name).sorted().toList();
    }

    private AuthResponse issue(User user, UUID familyId) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(properties.accessTokenTtl()))
                .claim("name", user.getDisplayName())
                .claim("roles", roleNames(user))
                .build();
        String accessToken = jwtEncoder
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        String refreshToken = Hashing.randomToken();
        refreshTokens.save(new RefreshToken(user.getId(), Hashing.sha256Hex(refreshToken), familyId,
                now.plus(properties.refreshTokenTtl())));

        return new AuthResponse(accessToken, properties.accessTokenTtl().toSeconds(), refreshToken, toDto(user));
    }

    private static ApiException invalidRefresh() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN",
                "Your session has expired. Please sign in again.");
    }
}
