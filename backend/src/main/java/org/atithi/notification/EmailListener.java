package org.atithi.notification;

import java.util.List;
import java.util.UUID;
import org.atithi.agency.api.AgencyFacade;
import org.atithi.agency.api.AgencyView;
import org.atithi.identity.api.IdentityFacade;
import org.atithi.identity.api.UserSummary;
import org.atithi.messaging.api.MessagePosted;
import org.atithi.notification.api.Email;
import org.atithi.notification.api.EmailSender;
import org.atithi.trip.api.AgencyShortlisted;
import org.atithi.trip.api.ProposalSent;
import org.atithi.trip.api.RequestMatched;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Turns domain events into emails after the change has committed, so a failed email never undoes the
 * action. Emails link back to the site instead of repeating private details.
 */
@Component
class EmailListener {

    private static final Logger log = LoggerFactory.getLogger(EmailListener.class);

    private final EmailSender sender;
    private final IdentityFacade identity;
    private final AgencyFacade agencies;

    EmailListener(EmailSender sender, IdentityFacade identity, AgencyFacade agencies) {
        this.sender = sender;
        this.identity = identity;
        this.agencies = agencies;
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void on(RequestMatched e) {
        safely(() -> toAgency(e.agencyId(), "New trip request on Atithi",
                "A traveller's trip request has been matched to your agency.\n\n"
                        + "Open your Atithi agent desk to read it and send a proposal: /agent/leads/" + e.matchId()));
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void on(ProposalSent e) {
        String agency = agencies.find(e.agencyId()).map(AgencyView::name).orElse("An agency");
        safely(() -> toUser(e.travellerId(),
                e.firstVersion() ? "New proposal from " + agency : agency + " updated its proposal",
                agency + (e.firstVersion() ? " sent you a proposal" : " updated its proposal")
                        + " for your India trip.\n\nCompare it with other proposals on Atithi: /trips/" + e.requestId()));
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void on(AgencyShortlisted e) {
        safely(() -> toAgency(e.agencyId(), "A traveller shortlisted your proposal",
                "Good news: a traveller shortlisted your proposal and shared their contact details.\n\n"
                        + "See them in your Atithi agent desk: /agent/leads/" + e.matchId()));
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void on(MessagePosted e) {
        if (e.fromTraveller()) {
            safely(() -> toAgency(e.agencyId(), "New message from a traveller",
                    e.excerpt() + "\n\nReply on Atithi: /agent/leads/" + e.matchId()));
        } else {
            String agency = agencies.find(e.agencyId()).map(AgencyView::name).orElse("Your agent");
            safely(() -> toUser(e.travellerId(), "New message from " + agency,
                    e.excerpt() + "\n\nReply on Atithi: /trips/" + e.requestId()));
        }
    }

    private void toAgency(UUID agencyId, String subject, String body) {
        List<UUID> members = agencies.memberIds(agencyId);
        members.forEach(member -> toUser(member, subject, body));
    }

    private void toUser(UUID userId, String subject, String body) {
        identity.findUser(userId).map(UserSummary::email)
                .ifPresent(address -> sender.send(new Email(address, subject, body)));
    }

    private static void safely(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException ex) {
            log.warn("Email notification failed: {}", ex.getMessage());
        }
    }
}
