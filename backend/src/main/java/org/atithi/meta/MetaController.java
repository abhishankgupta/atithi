package org.atithi.meta;

import org.atithi.shared.AtithiProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Reports which build is running where. The deploy pipeline polls this to confirm
 * that test or production is serving the exact commit it just deployed, and the web
 * app calls it to show "waking up the server" while a sleeping free instance starts.
 */
@RestController
@RequestMapping("/api/v1/meta")
class MetaController {

    private final AtithiProperties properties;

    MetaController(AtithiProperties properties) {
        this.properties = properties;
    }

    @GetMapping
    MetaResponse meta() {
        return new MetaResponse("Atithi API", properties.environment(), properties.version());
    }

    record MetaResponse(String name, String environment, String version) {}
}
