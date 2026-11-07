# ---- build ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies > /dev/null
COPY src src
RUN ./gradlew --no-daemon bootJar -x test \
 && cp build/libs/*.jar /src/app.jar \
 && java -Djarmode=tools -jar /src/app.jar extract --layers --launcher --destination /src/extracted

# ---- run ----
FROM eclipse-temurin:21-jre
LABEL org.opencontainers.image.source="https://github.com/abhishankgupta/atithi"
WORKDIR /app
RUN useradd --system --uid 1001 atithi
COPY --from=build /src/extracted/dependencies/ ./
COPY --from=build /src/extracted/spring-boot-loader/ ./
COPY --from=build /src/extracted/snapshot-dependencies/ ./
COPY --from=build /src/extracted/application/ ./
USER atithi

# The git commit is baked in so /api/v1/meta can prove which build is live.
ARG ATITHI_VERSION=dev
ENV ATITHI_VERSION=${ATITHI_VERSION}

# Tuned for Render's free instance (512 MB RAM, 0.1 CPU): small heap, serial GC,
# and C1-only JIT for a faster cold start after the service spins down.
ENV JAVA_TOOL_OPTIONS="-Djava.awt.headless=true -XX:MaxRAMPercentage=65 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
