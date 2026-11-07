package org.atithi.messaging;

import java.util.UUID;
import org.atithi.shared.web.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/threads/{matchId}/messages")
class MessageController {

    private final MessageService messages;

    MessageController(MessageService messages) {
        this.messages = messages;
    }

    record PostRequest(String body) {
    }

    @GetMapping
    MessageService.Conversation thread(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID matchId) {
        return messages.thread(CurrentUser.id(jwt), matchId);
    }

    @PostMapping
    MessageService.Conversation post(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID matchId, @RequestBody PostRequest body) {
        return messages.post(CurrentUser.id(jwt), matchId, body.body());
    }
}
