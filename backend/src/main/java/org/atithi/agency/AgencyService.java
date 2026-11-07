package org.atithi.agency;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.atithi.agency.api.AgencyFacade;
import org.atithi.agency.api.AgencyView;
import org.atithi.audit.api.AuditFacade;
import org.atithi.identity.api.IdentityFacade;
import org.atithi.identity.api.UserSummary;
import org.atithi.shared.Ids;
import org.atithi.shared.web.ApiException;
import org.atithi.shared.web.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Agencies and their members. Verification by an admin is what lets an agency receive requests. */
@Service
class AgencyService implements AgencyFacade {

    private static final String COLUMNS = "a.id, a.name, a.city, a.mot_approval_no, a.website, a.description, a.status, "
            + "a.verified_at, a.created_at";

    private final JdbcClient jdbc;
    private final IdentityFacade identity;
    private final AuditFacade audit;

    AgencyService(JdbcClient jdbc, IdentityFacade identity, AuditFacade audit) {
        this.jdbc = jdbc;
        this.identity = identity;
        this.audit = audit;
    }

    record AgencyInput(String name, String city, String motApprovalNo, String website, String description) {
    }

    /** What admins see: the agency plus who registered it (admins may see contact details). */
    record AdminAgencyView(AgencyView agency, String ownerName, String ownerEmail) {
    }

    @Transactional
    AgencyView create(UUID userId, AgencyInput input) {
        if (agencyOfMember(userId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "AGENCY_EXISTS", "Your account already has an agency");
        }
        UUID id = Ids.newId();
        jdbc.sql("""
                INSERT INTO agencies (id, name, city, mot_approval_no, website, description)
                VALUES (:id, :name, :city, :mot, :website, :description)""")
                .param("id", id)
                .param("name", input.name().trim())
                .param("city", input.city().trim())
                .param("mot", blankToNull(input.motApprovalNo()))
                .param("website", blankToNull(input.website()))
                .param("description", blankToNull(input.description()))
                .update();
        jdbc.sql("INSERT INTO agency_members (agency_id, user_id, role) VALUES (:a, :u, 'OWNER')")
                .param("a", id).param("u", userId).update();
        return find(id).orElseThrow();
    }

    @Transactional
    AgencyView update(UUID userId, AgencyInput input) {
        AgencyView agency = agencyOfMember(userId)
                .orElseThrow(() -> new NotFoundException("AGENCY_NOT_FOUND", "You haven't set up an agency yet"));
        jdbc.sql("""
                UPDATE agencies SET name = :name, city = :city, mot_approval_no = :mot, website = :website,
                       description = :description, updated_at = now()
                WHERE id = :id""")
                .param("id", agency.id())
                .param("name", input.name().trim())
                .param("city", input.city().trim())
                .param("mot", blankToNull(input.motApprovalNo()))
                .param("website", blankToNull(input.website()))
                .param("description", blankToNull(input.description()))
                .update();
        return find(agency.id()).orElseThrow();
    }

    @Transactional(readOnly = true)
    List<AdminAgencyView> listForAdmin(String status) {
        List<AgencyView> agencies = status == null || status.isBlank()
                ? jdbc.sql("SELECT " + COLUMNS + " FROM agencies a ORDER BY a.created_at DESC LIMIT 200")
                        .query(AgencyService::map).list()
                : jdbc.sql("SELECT " + COLUMNS + " FROM agencies a WHERE a.status = :s ORDER BY a.created_at DESC LIMIT 200")
                        .param("s", status.trim().toUpperCase(java.util.Locale.ROOT)).query(AgencyService::map).list();
        return agencies.stream().map(a -> {
            Optional<UserSummary> owner = memberIds(a.id()).stream().findFirst().flatMap(identity::findUser);
            return new AdminAgencyView(a, owner.map(UserSummary::displayName).orElse(null),
                    owner.map(UserSummary::email).orElse(null));
        }).toList();
    }

    @Transactional
    AgencyView verify(UUID agencyId, UUID adminId) {
        AgencyView agency = find(agencyId).orElseThrow(() -> new NotFoundException("AGENCY_NOT_FOUND", "Agency not found"));
        if (!agency.isVerified()) {
            jdbc.sql("UPDATE agencies SET status = 'VERIFIED', verified_at = now(), verified_by = :admin, updated_at = now() WHERE id = :id")
                    .param("admin", adminId).param("id", agencyId).update();
            audit.record(adminId, "AGENCY_VERIFIED", "agency", agencyId, agency.name());
        }
        return find(agencyId).orElseThrow();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AgencyView> find(UUID agencyId) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM agencies a WHERE a.id = :id")
                .param("id", agencyId).query(AgencyService::map).optional();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AgencyView> agencyOfMember(UUID userId) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM agencies a JOIN agency_members m ON m.agency_id = a.id WHERE m.user_id = :u")
                .param("u", userId).query(AgencyService::map).optional();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isMember(UUID agencyId, UUID userId) {
        Long n = jdbc.sql("SELECT count(*) FROM agency_members WHERE agency_id = :a AND user_id = :u")
                .param("a", agencyId).param("u", userId).query(Long.class).single();
        return n != null && n > 0;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UUID> memberIds(UUID agencyId) {
        return jdbc.sql("SELECT user_id FROM agency_members WHERE agency_id = :a ORDER BY created_at")
                .param("a", agencyId).query(UUID.class).list();
    }

    private static AgencyView map(ResultSet rs, int row) throws SQLException {
        return new AgencyView(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("city"),
                rs.getString("mot_approval_no"), rs.getString("website"), rs.getString("description"),
                rs.getString("status"), instant(rs.getTimestamp("verified_at")), instant(rs.getTimestamp("created_at")));
    }

    private static Instant instant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
