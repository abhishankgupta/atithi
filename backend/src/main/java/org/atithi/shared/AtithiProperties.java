package org.atithi.shared;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings that differ between local, test and production.
 *
 * @param environment   name shown by /api/v1/meta, e.g. "local", "test", "production"
 * @param version       build version (git commit) baked into the Docker image
 * @param corsOrigins   web origins allowed to call the API
 */
@ConfigurationProperties(prefix = "atithi")
public record AtithiProperties(String environment, String version, List<String> corsOrigins) {

    public static final String PRODUCTION = "production";

    public AtithiProperties {
        environment = environment == null || environment.isBlank() ? "local" : environment.trim();
        version = version == null || version.isBlank() ? "dev" : version.trim();
        corsOrigins = corsOrigins == null ? List.of() : List.copyOf(corsOrigins);
    }

    public boolean isProduction() {
        return PRODUCTION.equals(environment);
    }
}
