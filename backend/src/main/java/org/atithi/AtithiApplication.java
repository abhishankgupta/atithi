package org.atithi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AtithiApplication {

    public static void main(String[] args) {
        SpringApplication.run(AtithiApplication.class, args);
    }
}
