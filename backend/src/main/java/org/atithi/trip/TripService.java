package org.atithi.trip;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.atithi.agency.api.AgencyFacade;
import org.atithi.agency.api.AgencyView;
import org.atithi.audit.api.AuditFacade;
import org.atithi.identity.api.IdentityFacade;
import org.atithi.identity.api.UserSummary;
import org.atithi.shared.Ids;
import org.atithi.shared.web.ApiException;
import org.atithi.shared.web.FieldException;
import org.atithi.shared.web.NotFoundException;
import org.atithi.trip.TripViews.AdminRequestView;
import org.atithi.trip.TripViews.AgencyRef;
import org.atithi.trip.TripViews.LeadView;
import org.atithi.trip.TripViews.ProposalInput;
import org.atithi.trip.TripViews.ProposalView;
import org.atithi.trip.TripViews.RequestInput;
import org.atithi.trip.TripViews.RequestSummary;
import org.atithi.trip.TripViews.RequestView;
import org.atithi.trip.TripViews.TravellerMatchView;
import org.atithi.trip.api.AgencyShortlisted;
import org.atithi.trip.api.MatchParticipants;
import org.atithi.trip.api.ProposalSent;
import org.atithi.trip.api.RequestMatched;
import org.atithi.trip.api.TripFacade;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Trip requests, the agencies matched to them, proposals and shortlisting.
 *
 * <p>Privacy rules enforced here: a request reaches at most 5 verified agencies; an agency sees only
 * its own match and proposal; a traveller's email is revealed to an agency only after the traveller
 * shortlists it, and every reveal is written to the audit log.
 */
@Service
class TripService implements TripFacade {

    private static final Pattern SLUG = Pattern.compile("[a-z0-9-]{1,80}");
    private static final String REQUEST_COLUMNS = "r.id, r.traveller_id, r.base_itinerary, r.destinations, r.start_date, "
            + "r.days, r.adults, r.children, r.budget, r.hotel_style, r.interests, r.notes, r.status, r.created_at";
    private static final String PROPOSAL_COLUMNS = "p.id AS p_id, p.price_per_person, p.currency, p.inclusions, "
            + "p.hotels, p.day_plan, p.valid_until, p.updated_at AS p_updated_at";

    private final JdbcClient jdbc;
    private final IdentityFacade identity;
    private final AgencyFacade agencies;
    private final AuditFacade audit;
    private final ApplicationEventPublisher events;

    TripService(JdbcClient jdbc, IdentityFacade identity, AgencyFacade agencies, AuditFacade audit,
                ApplicationEventPublisher events) {
        this.jdbc = jdbc;
        this.identity = identity;
        this.agencies = agencies;
        this.audit = audit;
        this.events = events;
    }

    private record RequestRow(UUID id, UUID travellerId, String baseItinerary, String destinations, LocalDate startDate,
                              int days, int adults, int children, String budget, String hotelStyle, List<String> interests,
                              String notes, String status, Instant createdAt) {
    }

    private record MatchRow(UUID id, UUID requestId, UUID agencyId, String status, Instant contactRevealedAt,
                            Instant createdAt, ProposalView proposal) {
    }

    // ---- travellers ----

    @Transactional
    RequestView createRequest(UUID travellerId, RequestInput in) {
        UserSummary traveller = identity.findUser(travellerId)
                .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", "Account not found"));
        if (!traveller.hasRole("TRAVELLER")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "TRAVELLERS_ONLY", "Only traveller accounts can request trips");
        }
        if (!traveller.emailVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED",
                    "Please verify your email before sending a request to agents");
        }
        if (!Boolean.TRUE.equals(in.consent())) {
            throw new FieldException("consent", "Please agree to share your trip details with matched agents");
        }
        Long recent = jdbc.sql("SELECT count(*) FROM trip_requests WHERE traveller_id = :t AND created_at > now() - interval '1 day'")
                .param("t", travellerId).query(Long.class).single();
        if (recent != null && recent >= TripRules.MAX_REQUESTS_PER_DAY) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "REQUEST_RATE_LIMITED",
                    "You've sent several requests today. Please try again tomorrow.");
        }

        String base = blankToNull(in.baseItinerary());
        if (base != null && !SLUG.matcher(base).matches()) {
            throw new FieldException("baseItinerary", "is not a known itinerary");
        }
        if (in.startDate() == null || !in.startDate().isAfter(LocalDate.now(ZoneOffset.UTC))) {
            throw new FieldException("startDate", "must be a future date");
        }
        int days = range("days", in.days(), 1, 60, null);
        int adults = range("adults", in.adults(), 1, 20, null);
        int children = range("children", in.children(), 0, 20, 0);
        String budget = oneOf("budget", in.budget(), TripRules.BUDGETS);
        String hotelStyle = oneOf("hotelStyle", in.hotelStyle(), TripRules.HOTEL_STYLES);
        List<String> interests = TripRules.cleanList(in.interests(), 10, 40);
        if (interests == null) {
            throw new FieldException("interests", "choose up to 10 interests");
        }
        String destinations = blankToNull(in.destinations());
        if (destinations != null && destinations.length() > 300) {
            throw new FieldException("destinations", "must be at most 300 characters");
        }
        String notes = blankToNull(in.notes());
        if (notes != null && notes.length() > 2000) {
            throw new FieldException("notes", "must be at most 2000 characters");
        }

        UUID id = Ids.newId();
        jdbc.sql("""
                INSERT INTO trip_requests (id, traveller_id, base_itinerary, destinations, start_date, days, adults,
                                           children, budget, hotel_style, interests, notes, consent_at)
                VALUES (:id, :traveller, :base, :destinations, :start, :days, :adults, :children, :budget, :hotel,
                        :interests, :notes, now())""")
                .param("id", id).param("traveller", travellerId).param("base", base)
                .param("destinations", destinations).param("start", in.startDate()).param("days", days)
                .param("adults", adults).param("children", children).param("budget", budget)
                .param("hotel", hotelStyle).param("interests", TripRules.join(interests)).param("notes", notes)
                .update();
        return requestView(loadRequest(id));
    }

    @Transactional(readOnly = true)
    List<RequestSummary> myRequests(UUID travellerId) {
        return jdbc.sql("""
                SELECT r.id, r.base_itinerary, r.destinations, r.start_date, r.days, r.adults, r.children, r.status,
                       r.created_at,
                       (SELECT count(*) FROM request_matches m WHERE m.request_id = r.id) AS match_count,
                       (SELECT count(*) FROM request_matches m JOIN proposals p ON p.match_id = m.id
                         WHERE m.request_id = r.id AND m.status <> 'DECLINED') AS proposal_count
                FROM trip_requests r WHERE r.traveller_id = :t ORDER BY r.created_at DESC LIMIT 100""")
                .param("t", travellerId)
                .query((rs, n) -> new RequestSummary(uuid(rs, "id"), rs.getString("base_itinerary"),
                        rs.getString("destinations"), rs.getObject("start_date", LocalDate.class), rs.getInt("days"),
                        rs.getInt("adults"), rs.getInt("children"), rs.getString("status"),
                        instant(rs.getTimestamp("created_at")), rs.getLong("match_count"), rs.getLong("proposal_count")))
                .list();
    }

    @Transactional(readOnly = true)
    RequestView myRequest(UUID travellerId, UUID requestId) {
        return requestView(ownRequest(travellerId, requestId));
    }

    /** Shows the agency the traveller's contact details. Idempotent. */
    @Transactional
    RequestView shortlist(UUID travellerId, UUID requestId, UUID matchId) {
        RequestRow request = ownRequest(travellerId, requestId);
        MatchRow match = matchOfRequest(request, matchId);
        if ("SHORTLISTED".equals(match.status())) {
            return requestView(request);
        }
        if ("DECLINED".equals(match.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "MATCH_DECLINED", "You declined this agency's proposal");
        }
        if (match.proposal() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "NO_PROPOSAL", "This agency hasn't sent a proposal yet");
        }
        jdbc.sql("UPDATE request_matches SET status = 'SHORTLISTED', contact_revealed_at = now(), updated_at = now() WHERE id = :id")
                .param("id", matchId).update();
        audit.record(travellerId, "CONTACT_REVEALED", "match", matchId, "traveller contact shown to agency " + match.agencyId());
        events.publishEvent(new AgencyShortlisted(matchId, requestId, travellerId, match.agencyId()));
        return requestView(request);
    }

    /** Idempotent. A shortlisted agency can't be declined: it already has the traveller's contact. */
    @Transactional
    RequestView decline(UUID travellerId, UUID requestId, UUID matchId) {
        RequestRow request = ownRequest(travellerId, requestId);
        MatchRow match = matchOfRequest(request, matchId);
        if ("SHORTLISTED".equals(match.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "ALREADY_SHORTLISTED", "You've already shortlisted this agency");
        }
        if (!"DECLINED".equals(match.status())) {
            jdbc.sql("UPDATE request_matches SET status = 'DECLINED', updated_at = now() WHERE id = :id")
                    .param("id", matchId).update();
        }
        return requestView(request);
    }

    // ---- admins ----

    @Transactional(readOnly = true)
    List<AdminRequestView> adminRequests(String status) {
        String filter = status == null || status.isBlank() ? null : status.trim().toUpperCase(Locale.ROOT);
        List<RequestRow> rows = filter == null
                ? jdbc.sql("SELECT " + REQUEST_COLUMNS + " FROM trip_requests r ORDER BY r.created_at DESC LIMIT 200")
                        .query(TripService::mapRequest).list()
                : jdbc.sql("SELECT " + REQUEST_COLUMNS + " FROM trip_requests r WHERE r.status = :s ORDER BY r.created_at LIMIT 200")
                        .param("s", filter).query(TripService::mapRequest).list();
        return rows.stream().map(this::adminView).toList();
    }

    @Transactional
    AdminRequestView matchAgencies(UUID adminId, UUID requestId, List<UUID> agencyIds) {
        RequestRow request = loadRequest(requestId);
        if (!"SUBMITTED".equals(request.status()) && !"MATCHED".equals(request.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "REQUEST_CLOSED", "This request is closed");
        }
        Set<UUID> wanted = new LinkedHashSet<>(agencyIds == null ? List.of() : agencyIds);
        if (wanted.isEmpty()) {
            throw new FieldException("agencyIds", "choose at least one agency");
        }
        Set<UUID> existing = new LinkedHashSet<>(matchesOf(requestId).stream().map(MatchRow::agencyId).toList());
        wanted.removeAll(existing);
        if (existing.size() + wanted.size() > TripRules.MAX_AGENCIES_PER_REQUEST) {
            throw new FieldException("agencyIds", "a request can go to at most " + TripRules.MAX_AGENCIES_PER_REQUEST + " agencies");
        }
        List<RequestMatched> matched = new ArrayList<>();
        for (UUID agencyId : wanted) {
            AgencyView agency = agencies.find(agencyId)
                    .orElseThrow(() -> new FieldException("agencyIds", "unknown agency " + agencyId));
            if (!agency.isVerified()) {
                throw new FieldException("agencyIds", agency.name() + " isn't verified yet");
            }
            UUID matchId = Ids.newId();
            jdbc.sql("INSERT INTO request_matches (id, request_id, agency_id, matched_by) VALUES (:id, :r, :a, :admin)")
                    .param("id", matchId).param("r", requestId).param("a", agencyId).param("admin", adminId).update();
            audit.record(adminId, "REQUEST_MATCHED", "match", matchId, "request " + requestId + " to agency " + agencyId);
            matched.add(new RequestMatched(matchId, requestId, agencyId));
        }
        if (!matched.isEmpty() && "SUBMITTED".equals(request.status())) {
            jdbc.sql("UPDATE trip_requests SET status = 'MATCHED', updated_at = now() WHERE id = :id").param("id", requestId).update();
        }
        for (RequestMatched event : matched) {
            events.publishEvent(event);
        }
        return adminView(loadRequest(requestId));
    }

    // ---- agents ----

    @Transactional(readOnly = true)
    List<LeadView> leads(UUID agentId) {
        AgencyView agency = agencyOf(agentId);
        List<UUID> matchIds = jdbc.sql("SELECT id FROM request_matches WHERE agency_id = :a ORDER BY created_at DESC LIMIT 200")
                .param("a", agency.id()).query(UUID.class).list();
        return matchIds.stream().map(id -> leadView(loadMatch(id))).toList();
    }

    @Transactional(readOnly = true)
    LeadView lead(UUID agentId, UUID matchId) {
        return leadView(ownMatch(agentId, matchId));
    }

    @Transactional
    LeadView saveProposal(UUID agentId, UUID matchId, ProposalInput in) {
        MatchRow match = ownMatch(agentId, matchId);
        if ("DECLINED".equals(match.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "MATCH_DECLINED", "The traveller declined this proposal");
        }
        if (in.pricePerPerson() == null || in.pricePerPerson().signum() <= 0
                || in.pricePerPerson().compareTo(TripRules.MAX_PRICE) >= 0 || in.pricePerPerson().scale() > 2) {
            throw new FieldException("pricePerPerson", "enter a price per person, e.g. 1450 or 1450.50");
        }
        String currency = oneOf("currency", in.currency(), TripRules.CURRENCIES);
        List<String> inclusions = TripRules.cleanList(in.inclusions(), 30, 100);
        if (inclusions == null) {
            throw new FieldException("inclusions", "list up to 30 inclusions, each under 100 characters");
        }
        String dayPlan = blankToNull(in.dayPlan());
        if (dayPlan == null || dayPlan.length() > 8000) {
            throw new FieldException("dayPlan", "describe the day-by-day plan (up to 8000 characters)");
        }
        String hotels = blankToNull(in.hotels());
        if (hotels != null && hotels.length() > 2000) {
            throw new FieldException("hotels", "must be at most 2000 characters");
        }
        if (in.validUntil() == null || in.validUntil().isBefore(LocalDate.now(ZoneOffset.UTC))) {
            throw new FieldException("validUntil", "must be today or later");
        }
        boolean first = match.proposal() == null;
        jdbc.sql("""
                INSERT INTO proposals (id, match_id, price_per_person, currency, inclusions, hotels, day_plan, valid_until, created_by)
                VALUES (:id, :match, :price, :currency, :inclusions, :hotels, :plan, :valid, :agent)
                ON CONFLICT (match_id) DO UPDATE SET price_per_person = EXCLUDED.price_per_person,
                    currency = EXCLUDED.currency, inclusions = EXCLUDED.inclusions, hotels = EXCLUDED.hotels,
                    day_plan = EXCLUDED.day_plan, valid_until = EXCLUDED.valid_until, updated_at = now()""")
                .param("id", Ids.newId()).param("match", matchId).param("price", in.pricePerPerson())
                .param("currency", currency).param("inclusions", TripRules.join(inclusions)).param("hotels", hotels)
                .param("plan", dayPlan).param("valid", in.validUntil()).param("agent", agentId)
                .update();
        if ("OPEN".equals(match.status())) {
            jdbc.sql("UPDATE request_matches SET status = 'PROPOSED', updated_at = now() WHERE id = :id").param("id", matchId).update();
        }
        RequestRow request = loadRequest(match.requestId());
        events.publishEvent(new ProposalSent(matchId, request.id(), request.travellerId(), match.agencyId(), first));
        return leadView(loadMatch(matchId));
    }

    // ---- facade ----

    @Override
    @Transactional(readOnly = true)
    public Optional<MatchParticipants> participants(UUID matchId) {
        return jdbc.sql("""
                SELECT m.id, m.request_id, r.traveller_id, m.agency_id, m.status
                FROM request_matches m JOIN trip_requests r ON r.id = m.request_id WHERE m.id = :id""")
                .param("id", matchId)
                .query((rs, n) -> new MatchParticipants(uuid(rs, "id"), uuid(rs, "request_id"), uuid(rs, "traveller_id"),
                        uuid(rs, "agency_id"), rs.getString("status")))
                .optional();
    }

    // ---- helpers ----

    private AgencyView agencyOf(UUID agentId) {
        return agencies.agencyOfMember(agentId)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "NO_AGENCY", "Set up your agency first"));
    }

    private MatchRow ownMatch(UUID agentId, UUID matchId) {
        AgencyView agency = agencyOf(agentId);
        MatchRow match = loadMatch(matchId);
        if (!match.agencyId().equals(agency.id())) {
            throw new NotFoundException("LEAD_NOT_FOUND", "Lead not found");
        }
        return match;
    }

    private RequestRow ownRequest(UUID travellerId, UUID requestId) {
        RequestRow request = loadRequest(requestId);
        if (!request.travellerId().equals(travellerId)) {
            throw new NotFoundException("REQUEST_NOT_FOUND", "Request not found");
        }
        return request;
    }

    private MatchRow matchOfRequest(RequestRow request, UUID matchId) {
        MatchRow match = loadMatch(matchId);
        if (!match.requestId().equals(request.id())) {
            throw new NotFoundException("MATCH_NOT_FOUND", "Agency not found on this request");
        }
        return match;
    }

    private RequestRow loadRequest(UUID requestId) {
        return jdbc.sql("SELECT " + REQUEST_COLUMNS + " FROM trip_requests r WHERE r.id = :id")
                .param("id", requestId).query(TripService::mapRequest).optional()
                .orElseThrow(() -> new NotFoundException("REQUEST_NOT_FOUND", "Request not found"));
    }

    private MatchRow loadMatch(UUID matchId) {
        return jdbc.sql("SELECT m.id, m.request_id, m.agency_id, m.status, m.contact_revealed_at, m.created_at, "
                        + PROPOSAL_COLUMNS + " FROM request_matches m LEFT JOIN proposals p ON p.match_id = m.id WHERE m.id = :id")
                .param("id", matchId).query(TripService::mapMatch).optional()
                .orElseThrow(() -> new NotFoundException("LEAD_NOT_FOUND", "Lead not found"));
    }

    private List<MatchRow> matchesOf(UUID requestId) {
        return jdbc.sql("SELECT m.id, m.request_id, m.agency_id, m.status, m.contact_revealed_at, m.created_at, "
                        + PROPOSAL_COLUMNS + " FROM request_matches m LEFT JOIN proposals p ON p.match_id = m.id "
                        + "WHERE m.request_id = :r ORDER BY m.created_at")
                .param("r", requestId).query(TripService::mapMatch).list();
    }

    private RequestView requestView(RequestRow r) {
        List<TravellerMatchView> matches = matchesOf(r.id()).stream().map(m -> {
            AgencyRef agency = agencyRef(m.agencyId());
            String contact = null;
            if (m.contactRevealedAt() != null) {
                contact = agencies.memberIds(m.agencyId()).stream().findFirst()
                        .flatMap(identity::findUser).map(UserSummary::email).orElse(null);
            }
            return new TravellerMatchView(m.id(), agency, m.status(), m.proposal(), m.contactRevealedAt(), contact);
        }).toList();
        return new RequestView(r.id(), r.baseItinerary(), r.destinations(), r.startDate(), r.days(), r.adults(),
                r.children(), r.budget(), r.hotelStyle(), r.interests(), r.notes(), r.status(), r.createdAt(), matches);
    }

    private AdminRequestView adminView(RequestRow r) {
        Optional<UserSummary> traveller = identity.findUser(r.travellerId());
        List<AgencyRef> matched = matchesOf(r.id()).stream().map(m -> agencyRef(m.agencyId())).toList();
        return new AdminRequestView(r.id(), traveller.map(UserSummary::displayName).orElse(null),
                traveller.map(UserSummary::country).orElse(null), r.baseItinerary(), r.destinations(), r.startDate(),
                r.days(), r.adults(), r.children(), r.budget(), r.hotelStyle(), r.interests(), r.notes(), r.status(),
                r.createdAt(), matched);
    }

    private LeadView leadView(MatchRow m) {
        RequestRow r = loadRequest(m.requestId());
        Optional<UserSummary> traveller = identity.findUser(r.travellerId());
        String email = m.contactRevealedAt() == null ? null : traveller.map(UserSummary::email).orElse(null);
        return new LeadView(m.id(), r.id(), m.status(), traveller.map(UserSummary::displayName).orElse(null),
                traveller.map(UserSummary::country).orElse(null), email, r.baseItinerary(), r.destinations(),
                r.startDate(), r.days(), r.adults(), r.children(), r.budget(), r.hotelStyle(), r.interests(), r.notes(),
                m.createdAt(), m.proposal());
    }

    private AgencyRef agencyRef(UUID agencyId) {
        return agencies.find(agencyId).map(a -> new AgencyRef(a.id(), a.name(), a.city()))
                .orElse(new AgencyRef(agencyId, "Unknown agency", null));
    }

    private static RequestRow mapRequest(ResultSet rs, int row) throws SQLException {
        return new RequestRow(uuid(rs, "id"), uuid(rs, "traveller_id"), rs.getString("base_itinerary"),
                rs.getString("destinations"), rs.getObject("start_date", LocalDate.class), rs.getInt("days"),
                rs.getInt("adults"), rs.getInt("children"), rs.getString("budget"), rs.getString("hotel_style"),
                TripRules.split(rs.getString("interests")), rs.getString("notes"), rs.getString("status"),
                instant(rs.getTimestamp("created_at")));
    }

    private static MatchRow mapMatch(ResultSet rs, int row) throws SQLException {
        ProposalView proposal = null;
        UUID proposalId = rs.getObject("p_id", UUID.class);
        if (proposalId != null) {
            proposal = new ProposalView(proposalId, rs.getBigDecimal("price_per_person"), rs.getString("currency"),
                    TripRules.split(rs.getString("inclusions")), rs.getString("hotels"), rs.getString("day_plan"),
                    rs.getObject("valid_until", LocalDate.class), instant(rs.getTimestamp("p_updated_at")));
        }
        return new MatchRow(uuid(rs, "id"), uuid(rs, "request_id"), uuid(rs, "agency_id"), rs.getString("status"),
                instant(rs.getTimestamp("contact_revealed_at")), instant(rs.getTimestamp("created_at")), proposal);
    }

    private static UUID uuid(ResultSet rs, String column) throws SQLException {
        return rs.getObject(column, UUID.class);
    }

    private static Instant instant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    private static int range(String field, Integer value, int min, int max, Integer fallback) {
        int v = value == null ? (fallback == null ? Integer.MIN_VALUE : fallback) : value;
        if (v < min || v > max) {
            throw new FieldException(field, "must be between " + min + " and " + max);
        }
        return v;
    }

    private static String oneOf(String field, String value, Set<String> allowed) {
        String v = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(v)) {
            throw new FieldException(field, "must be one of " + String.join(", ", allowed.stream().sorted().toList()));
        }
        return v;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
