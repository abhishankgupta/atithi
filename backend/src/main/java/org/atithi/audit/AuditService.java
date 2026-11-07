package org.atithi.audit;

import java.util.UUID;
import org.atithi.audit.api.AuditFacade;
import org.atithi.shared.Ids;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuditService implements AuditFacade {

    private final JdbcClient jdbc;

    AuditService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID actorId, String action, String targetType, UUID targetId, String details) {
        jdbc.sql("""
                INSERT INTO audit_log (id, actor_id, action, target_type, target_id, details)
                VALUES (:id, :actor, :action, :type, :target, :details)""")
                .param("id", Ids.newId())
                .param("actor", actorId)
                .param("action", action)
                .param("type", targetType)
                .param("target", targetId)
                .param("details", details == null ? null : details.length() > 500 ? details.substring(0, 500) : details)
                .update();
    }
}
