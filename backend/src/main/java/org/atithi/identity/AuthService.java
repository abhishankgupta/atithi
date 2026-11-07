package org.atithi.identity;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.atithi.identity.api.AuthResponse;
import org.atithi.identity.api.CurrentUserDto;
import org.atithi.notification.api.Email;
import org.atithi.notification.api.EmailSender;
import org.atithi.shared.AtithiProperties;
import org.atithi.shared.web.ApiException;
import org.atithi.shared.web.FieldException;
import org.atithi.shared.web.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Registration, email/password sign-in, profile changes and email verification. */
@Service
class AuthService {

    enum AccountType { TRAVELLER, AGENT }

    record CodeIssued(long expiresInSeconds, String testCode) {
    }

    private final UserRepository users;
    private final EmailCodeRepository emailCodes;
    private final TokenService tokens;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final AuthProperties authProperties;
    private final AtithiProperties atithiProperties;

    AuthService(UserRepository users, EmailCodeRepository emailCodes, TokenService tokens, PasswordEncoder passwordEncoder,
                EmailSender emailSender, AuthProperties authProperties, AtithiProperties atithiProperties) {
        this.users = users;
        this.emailCodes = emailCodes;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.authProperties = authProperties;
        this.atithiProperties = atithiProperties;
    }

    @Transactional
    AuthResponse register(String rawEmail, String password, String displayName, String country, String accountType) {
        String email = normalizeEmail(rawEmail);
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "An account with this email already exists");
        }
        Set<Role> roles = EnumSet.of(parseAccountType(accountType) == AccountType.AGENT ? Role.AGENT : Role.TRAVELLER);
        if (authProperties.isAdminEmail(email)) {
            roles.add(Role.ADMIN);
        }
        User user = users.save(new User(email, passwordEncoder.encode(password), displayName.trim(), blankToNull(country), roles));
        return tokens.issueForNewSession(user);
    }

    @Transactional
    AuthResponse login(String rawEmail, String password) {
        User user = users.findByEmail(normalizeEmail(rawEmail))
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                        "Email or password is incorrect"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED", "This account is suspended");
        }
        return tokens.issueForNewSession(user);
    }

    @Transactional(readOnly = true)
    CurrentUserDto me(UUID userId) {
        return TokenService.toDto(load(userId));
    }

    @Transactional
    CurrentUserDto updateProfile(UUID userId, String displayName, String country) {
        User user = load(userId);
        if (displayName != null && displayName.isBlank()) {
            throw new FieldException("displayName", "must not be blank");
        }
        user.updateProfile(displayName == null ? null : displayName.trim(), country == null ? null : country.trim());
        return TokenService.toDto(user);
    }

    /** Sends a 6-digit code to the user's email. Outside production the code is also returned, for testing. */
    @Transactional
    CodeIssued sendEmailCode(UUID userId) {
        User user = load(userId);
        if (user.isEmailVerified()) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_VERIFIED", "Your email is already verified");
        }
        boolean testMode = !emailSender.deliversEmail() && !atithiProperties.isProduction();
        if (!emailSender.deliversEmail() && !testMode) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_UNAVAILABLE",
                    "We can't send emails yet. Please try again later.");
        }
        AuthProperties.EmailCode settings = authProperties.emailCode();
        Instant now = Instant.now();
        if (emailCodes.countByUserIdAndCreatedAtAfter(userId, now.minus(settings.sendWindow())) >= settings.maxSendsPerWindow()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "CODE_RATE_LIMITED",
                    "Too many codes requested. Please wait a few minutes and try again.");
        }
        String code = Hashing.sixDigitCode();
        emailCodes.save(new EmailCode(userId, codeHash(userId, code), now.plus(settings.ttl())));
        emailSender.send(new Email(user.getEmail(), "Your Atithi verification code: " + code,
                "Hello " + user.getDisplayName() + ",\n\nYour Atithi verification code is " + code
                        + ". It expires in " + settings.ttl().toMinutes() + " minutes.\n\n"
                        + "If you didn't ask for this, you can ignore this email."));
        return new CodeIssued(settings.ttl().toSeconds(), testMode ? code : null);
    }

    /** Failed attempts are counted even though we throw. */
    @Transactional(noRollbackFor = ApiException.class)
    CurrentUserDto verifyEmail(UUID userId, String code) {
        User user = load(userId);
        if (user.isEmailVerified()) {
            return TokenService.toDto(user);
        }
        EmailCode emailCode = emailCodes.findFirstByUserIdOrderByCreatedAtDesc(userId)
                .filter(c -> c.isUsable(Instant.now()))
                .orElseThrow(AuthService::invalidCode);
        if (emailCode.getAttempts() >= authProperties.emailCode().maxAttempts()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "CODE_TOO_MANY_ATTEMPTS",
                    "Too many wrong codes. Please request a new one.");
        }
        if (!Hashing.constantTimeEquals(emailCode.getCodeHash(), codeHash(userId, code.trim()))) {
            emailCode.recordFailedAttempt();
            throw invalidCode();
        }
        emailCode.consume();
        user.markEmailVerified();
        return TokenService.toDto(user);
    }

    private User load(UUID userId) {
        return users.findById(userId).orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "Account not found"));
    }

    private static AccountType parseAccountType(String value) {
        if (value == null || value.isBlank()) {
            return AccountType.TRAVELLER;
        }
        try {
            return AccountType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new FieldException("accountType", "must be TRAVELLER or AGENT");
        }
    }

    private static String codeHash(UUID userId, String code) {
        return Hashing.sha256Hex(userId + ":" + code);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static ApiException invalidCode() {
        return new ApiException(HttpStatus.BAD_REQUEST, "CODE_INVALID", "That code is incorrect or has expired");
    }
}
