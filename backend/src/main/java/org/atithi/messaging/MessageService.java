package org.atithi.messaging;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.atithi.agency.api.AgencyFacade;
import org.atithi.agency.api.AgencyView;
import org.atithi.identity.api.IdentityFacade;
import org.atithi.identity.api.UserSummary;
import org.atithi.messaging.api.MessagePosted;
import org.atithi.shared.Ids;
import org.atithi.shared.web.ApiException;
import org.atithi.shared.web.FieldException;
import org.atithi.shared.web.NotFoundException;
import org.atithi.trip.api.MatchParticipants;
import org.atithi.trip.api.TripFacade;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * One thread per match, between the traveller and the matched agency. Nobody else can read it.
 * Messages are rate-limited to stop agencies spamming travellers (and the reverse).
 */
@Service
class MessageService {

    static final int MAX_MESSAGES_PER_HOUR = 60;
    static final int MAX_LENGTH = 4000;

    private final JdbcClient jdbc;
    private final TripFacade trips;
    private final AgencyFacade agencies;
    private final IdentityFacade identity;
    private final ApplicationEventPublisher events;

    MessageService(JdbcClient jdbc, TripFacade trips, AgencyFacade agencies, IdentityFacade identity,
                   ApplicationEventPublisher events) {
        this.jdbc = jdbc;
        this.trips = trips;
        this.agencies = agencies;
        this.identity = identity;
        this.events = events;
    }

    /** {@code mine} is true for messages sent by the side that is reading (the traveller, or anyone at the agency). */
    record MessageView(UUID id, String senderName, String senderSide, boolean mine, String body, Instant createdAt) {
    }

    record Conversation(UUID matchId, String travellerName, String agencyName, boolean closed, List<MessageView> messages) {
    }

    @Transactional(readOnly = true)
    Conversation thread(UUID userId, UUID matchId) {
        MatchParticipants p = participants(matchId);
        String side = sideOf(userId, p);
        String travellerName = identity.findUser(p.travellerId()).map(UserSummary::displayName).orElse("Traveller");
        String agencyName = agencies.find(p.agencyId()).map(AgencyView::name).orElse("Agency");
        List<MessageView> messages = jdbc.sql("""
                SELECT id, sender_side, body, created_at FROM messages WHERE match_id = :m ORDER BY created_at LIMIT 500""")
                .param("m", matchId)
                .query((rs, n) -> {
                    String senderSide = rs.getString("sender_side");
                    Timestamp at = rs.getTimestamp("created_at");
                    return new MessageView(rs.getObject("id", UUID.class),
                            "TRAVELLER".equals(senderSide) ? travellerName : agencyName, senderSide,
                            senderSide.equals(side), rs.getString("body"), at == null ? null : at.toInstant());
                })
                .list();
        return new Conversation(matchId, travellerName, agencyName, p.isClosed(), messages);
    }

    @Transactional
    Conversation post(UUID userId, UUID matchId, String rawBody) {
        MatchParticipants p = participants(matchId);
        String side = sideOf(userId, p);
        if (p.isClosed()) {
            throw new ApiException(HttpStatus.CONFLICT, "THREAD_CLOSED", "This conversation is closed");
        }
        String body = rawBody == null ? "" : rawBody.strip();
        if (body.isEmpty() || body.length() > MAX_LENGTH) {
            throw new FieldException("body", "write a message of up to " + MAX_LENGTH + " characters");
        }
        Long recent = jdbc.sql("SELECT count(*) FROM messages WHERE sender_id = :u AND created_at > now() - interval '1 hour'")
                .param("u", userId).query(Long.class).single();
        if (recent != null && recent >= MAX_MESSAGES_PER_HOUR) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "MESSAGE_RATE_LIMITED",
                    "You've sent a lot of messages. Please wait a while.");
        }
        jdbc.sql("INSERT INTO messages (id, match_id, sender_id, sender_side, body) VALUES (:id, :m, :u, :side, :body)")
                .param("id", Ids.newId()).param("m", matchId).param("u", userId).param("side", side).param("body", body)
                .update();
        events.publishEvent(new MessagePosted(matchId, p.requestId(), p.travellerId(), p.agencyId(),
                "TRAVELLER".equals(side), body.length() > 200 ? body.substring(0, 200) + "…" : body));
        return thread(userId, matchId);
    }

    private MatchParticipants participants(UUID matchId) {
        return trips.participants(matchId).orElseThrow(MessageService::notFound);
    }

    /** "TRAVELLER" or "AGENCY"; anyone else gets a 404 so threads can't be probed. */
    private String sideOf(UUID userId, MatchParticipants p) {
        if (p.travellerId().equals(userId)) {
            return "TRAVELLER";
        }
        if (agencies.isMember(p.agencyId(), userId)) {
            return "AGENCY";
        }
        throw notFound();
    }

    private static NotFoundException notFound() {
        return new NotFoundException("THREAD_NOT_FOUND", "Conversation not found");
    }
}
