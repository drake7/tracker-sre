export default {
  key: "spring-boot", label: "Spring Boot Advanced", icon: "🍃", color: "var(--green)",
  desc: "Beyond CRUD Spring Boot — the features and patterns that show up in Staff-level backend/platform work. 📘 items have a full Deep Dive.",
  sections: [
    { name: "Core Advanced", items: [
      { id: "spring-1", t: "Spring Bean Lifecycle & Container Internals", d: "Medium",
        desc: "What actually happens between @Component being scanned and your bean being ready to use.",
        notes: {
          explain: [
            "The ApplicationContext drives every bean through the same pipeline: instantiate (constructor call) → populate properties (@Autowired field/setter injection) → BeanPostProcessor 'before' hooks → InitializingBean.afterPropertiesSet()/@PostConstruct → BeanPostProcessor 'after' hooks (this is where proxies get wrapped — AOP, @Transactional, @Async all hook in here) → bean is live → on shutdown, DisposableBean.destroy()/@PreDestroy.",
            "Knowing this order explains real bugs: why a @Transactional method called from within the same class doesn't get intercepted (the proxy wraps the bean AFTER construction, and self-invocation bypasses the proxy entirely — a top-tier interview gotcha), and why constructor injection guarantees a fully-formed object while field injection can leave a bean partially null during early lifecycle callbacks."
          ],
          code: [{ lang: "java", caption: "Self-invocation bypasses the @Transactional proxy — a classic bug", src:
`@Service
public class OrderService {

    public void placeOrder(Order o) {
        // BUG: calling save() on "this" calls the raw bean method directly,
        // completely skipping the transactional proxy Spring wrapped around this class.
        save(o);
    }

    @Transactional
    public void save(Order o) {
        repo.save(o);
    }
}

// Fix: inject a self-reference, or move save() into a separate bean
// that the proxy can actually intercept when called from outside.` }],
          diagram: { type: "flow", caption: "AOP proxies (for @Transactional, @Async, etc.) are applied during the 'after' BeanPostProcessor step — which is why calling a @Transactional method from inside the same class silently skips the proxy.",
            steps: [
              { label: "Instantiate", note: "constructor runs" },
              { label: "Populate", note: "@Autowired fields/setters", arrowLabel: "→" },
              { label: "PostProcess (before)", note: "", arrowLabel: "→" },
              { label: "@PostConstruct", note: "afterPropertiesSet()", arrowLabel: "→" },
              { label: "PostProcess (after)", note: "proxies wrapped here", arrowLabel: "→" },
              { label: "Bean ready", note: "in use", arrowLabel: "→" },
              { label: "@PreDestroy", note: "on shutdown", arrowLabel: "shutdown" }
            ]},
          tricks: [
            "Self-invocation breaks @Transactional/@Async/@Cacheable — this is probably the single most common Spring interview 'gotcha' question, and it follows directly from the proxy being applied outside the bean, not inside it.",
            "Constructor injection is preferred over field injection specifically because it makes required dependencies impossible to represent as null and plays well with immutability — know this as more than a style preference."
          ]
        }},
      { id: "spring-2", t: "Virtual Threads in Spring Boot — When They Help vs Reactive", d: "Hard",
        desc: "spring.threads.virtual.enabled=true — one flag, but know exactly what it changes and what it doesn't.",
        notes: {
          explain: ["Spring Boot 3.2+ can run the embedded Tomcat/Jetty request-handling thread pool on virtual threads instead of a fixed platform-thread pool. Each incoming request gets its own cheap virtual thread; when your controller/service makes a blocking call (JDBC, RestTemplate, blocking Kafka call), the virtual thread unmounts instead of tying up a scarce platform thread. You keep writing plain synchronous Spring MVC code — no Mono/Flux, no reactive repositories."],
          code: [{ lang: "java", caption: "The entire migration is one property — no code changes required", src:
`# application.properties
spring.threads.virtual.enabled=true

# That's it. Your existing blocking @RestController /
# @Service / Spring Data JPA code now runs one virtual
# thread per request instead of sharing a fixed Tomcat pool.` }],
          diagram: { type: "compare", caption: "Virtual threads don't replace WebFlux for every case — WebFlux's non-blocking I/O drivers still matter for extreme low-level efficiency; virtual threads mainly remove the need to rewrite your app reactively just to get high concurrency.",
            columns: [
              { title: "Spring WebFlux (reactive)", points: ["Non-blocking I/O end-to-end (R2DBC, WebClient)", "Steep learning curve — Mono/Flux, operator chains, no familiar stack traces", "Best raw efficiency for extreme-scale, I/O-heavy services"] },
              { title: "Spring MVC + Virtual Threads", points: ["Plain blocking code — JDBC, RestTemplate, familiar stack traces", "One config flag, no rewrite", "Great default for most CRUD/backend services — you get I/O-bound concurrency without reactive complexity"] }
            ]},
          tricks: [
            "Virtual threads don't help CPU-bound request handling — if your bottleneck is computation, not blocking I/O, expect no improvement.",
            "A blocking JDBC driver that internally uses `synchronized` in older JDBC drivers could historically pin the carrier thread pre-JDK 24; know that JDK 24's fix (JEP 491) removed most of this risk — connect this straight back to the Java 21/24 virtual-thread entries."
          ]
        }},
      { id: "spring-3", t: "Spring WebFlux & Reactive Programming (Mono/Flux, Backpressure)", d: "Hard",
        desc: "Non-blocking, backpressure-aware reactive streams built on Project Reactor.",
        notes: {
          explain: ["Mono<T> represents 0-or-1 async result, Flux<T> represents 0-to-N. Nothing happens until something subscribes — like Java Streams, reactive pipelines are lazy declarations of work. Backpressure is the key idea that separates this from a plain callback/CompletableFuture chain: a slow subscriber can tell the publisher to slow down (`request(n)`), instead of being flooded with data it can't process fast enough."],
          code: [{ lang: "java", caption: "A typical WebFlux endpoint — declarative, non-blocking, composed with operators", src:
`@GetMapping("/orders/{userId}")
public Flux<OrderDto> ordersForUser(@PathVariable String userId) {
    return orderRepository.findByUserId(userId)      // R2DBC, non-blocking
        .filter(o -> o.getStatus() != Status.CANCELLED)
        .map(OrderMapper::toDto)
        .doOnError(e -> log.error("order stream failed", e))
        .timeout(Duration.ofSeconds(5));
    // Nothing runs until Spring's Netty runtime subscribes to write the response.
}` }],
          diagram: { type: "flow", caption: "The Subscriber pulls data at its own pace via request(n) — the Publisher never overwhelms a slow consumer.",
            steps: [
              { label: "Publisher", note: "e.g. R2DBC query" },
              { label: "onSubscribe()", note: "handshake", arrowLabel: "→" },
              { label: "request(n)", note: "subscriber pulls n items", arrowLabel: "→" },
              { label: "onNext() × n", note: "data flows", arrowLabel: "→" },
              { label: "onComplete/onError", note: "terminal signal", arrowLabel: "→" }
            ]},
          tricks: [
            "Blocking inside a reactive chain (e.g., calling a blocking JDBC driver inside a Flux.map) silently defeats the entire non-blocking model and can starve the small Netty event-loop thread pool — a classic production incident in reactive Spring apps.",
            "'Cold' vs 'hot' publishers: a cold Flux re-runs its source for every subscriber (e.g., a fresh DB query each time); a hot Flux (e.g., Sinks) shares one ongoing stream across subscribers — mixing these up causes duplicate side effects or missed events."
          ]
        }},
      { id: "spring-4", t: "Spring Data JPA Advanced: N+1, Batching, Projections, Entity Graphs", d: "Medium",
        desc: "The gap between 'it works in a demo' and 'it survives production load' for JPA.",
        notes: {
          explain: ["The N+1 problem: fetching a list of N parent entities, then lazily fetching a related collection for each one individually triggers 1 + N queries instead of 1 or 2. It's invisible in a demo with 3 rows and catastrophic with 10,000."],
          code: [{ lang: "java", caption: "The fix: JOIN FETCH collapses N+1 queries into one", src:
`// N+1: 1 query for orders, then N lazy queries for items
List<Order> orders = orderRepo.findAll();
orders.forEach(o -> o.getItems().size()); // triggers N queries

// Fixed with JOIN FETCH — a single query
@Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.items WHERE o.userId = :uid")
List<Order> findWithItems(@Param("uid") String userId);

// Or declaratively with an entity graph
@EntityGraph(attributePaths = {"items"})
List<Order> findByUserId(String userId);` }],
          diagram: { type: "flow", caption: "Fix with a JOIN FETCH, an @EntityGraph, or batch fetching (hibernate.default_batch_fetch_size) — all collapse the N extra round-trips into far fewer queries.",
            steps: [
              { label: "SELECT * FROM order", note: "1 query, N rows" },
              { label: "for each order:", note: "N iterations", arrowLabel: "then" },
              { label: "SELECT * FROM item WHERE order_id=?", note: "lazy fetch, 1 query EACH", arrowLabel: "×N" },
              { label: "Total: 1+N queries", note: "the bug", arrowLabel: "=" }
            ]},
          tricks: [
            "JOIN FETCH in JPQL avoids N+1 but can produce a Cartesian-product row explosion if you fetch two collections at once — a common follow-up trap question ('what if I JOIN FETCH two @OneToMany relations?').",
            "Projections (DTO interfaces or constructor expressions) let you select only the columns you need instead of hydrating full entities — a direct lever for reducing memory/network overhead at scale, worth mentioning alongside your TPS-scaling work."
          ]
        }},
      { id: "spring-5", t: "Transaction Management Deep Dive: Propagation, Isolation, @Transactional Pitfalls", d: "Medium",
        desc: "REQUIRED vs REQUIRES_NEW vs NESTED — and why self-invocation silently breaks all of it.",
        notes: {
          code: [{ lang: "java", caption: "REQUIRES_NEW: the audit log survives even if the outer transaction rolls back", src:
`@Transactional
public void chargeCustomer(Order o) {
    paymentGateway.charge(o);       // may throw
    auditLogger.log(o);             // must persist regardless
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void log(Order o) {
    auditRepo.save(new AuditEntry(o)); // independent transaction — commits on its own
}` }],
          diagram: { type: "compare",
            columns: [
              { title: "REQUIRED (default)", points: ["Joins an existing transaction if one is active", "Starts a new one if none exists", "A rollback anywhere marks the WHOLE transaction rollback-only, including the caller"] },
              { title: "REQUIRES_NEW", points: ["Always suspends any existing transaction and starts a fresh one", "Independent commit/rollback — a failure here does NOT roll back the caller's transaction", "Common use: writing an audit log that must persist even if the outer business operation later fails"] }
            ]},
          tricks: [
            "Same self-invocation gotcha as spring-1: calling a @Transactional method on `this` from within the same class bypasses the proxy entirely — no transaction is started, silently.",
            "Catching an exception inside a @Transactional method without rethrowing prevents the rollback Spring would otherwise trigger — Spring only rolls back on unchecked exceptions by default (checked exceptions need explicit rollbackFor)."
          ]
        }},
      { id: "spring-6", t: "Spring Security Advanced: OAuth2, JWT, Resource Servers, Method-Level Security", d: "Medium",
        desc: "@PreAuthorize/@PostAuthorize with SpEL, OAuth2 resource-server JWT validation, and the SecurityFilterChain bean-based configuration that replaced WebSecurityConfigurerAdapter in Spring Security 5.7+/Boot 3.",
        notes: {
          explain: [
            "Spring Security 5.7 deprecated WebSecurityConfigurerAdapter in favor of registering a SecurityFilterChain bean directly — configuration composes via a lambda DSL instead of subclassing and overriding configure(HttpSecurity). As a resource server, Spring Security validates incoming Bearer JWTs by fetching the issuer's JWK Set (public keys), verifying the token's signature, expiry (exp), and issuer (iss) claims, then exposing the claims as an Authentication principal your controllers can inspect via @AuthenticationPrincipal Jwt or SecurityContextHolder.",
            "Method-level security (@PreAuthorize, @PostAuthorize) is implemented as another AOP proxy, layered exactly like @Transactional — meaning it inherits the same self-invocation gotcha: calling an @PreAuthorize-annotated method on `this` from within the same class skips the check entirely. @PreAuthorize evaluates its SpEL expression BEFORE the method runs (it can reference method arguments, e.g. #userId == authentication.name); @PostAuthorize evaluates AFTER, which lets it inspect the return value (e.g., 'only return this Order if it belongs to the caller') but means the method body already executed, which matters if it has side effects."
          ],
          code: [{ lang: "java", caption: "SecurityFilterChain bean + SpEL-based method security", src:
`@Bean
SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/actuator/health").permitAll()
            .anyRequest().authenticated())
        .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
    return http.build();
}

@PreAuthorize("#userId == authentication.name")
public Order getOrder(String userId, String orderId) { ... }

@PostAuthorize("returnObject.ownerId == authentication.name")
public Order getOrderById(String orderId) { ... }` }],
          diagram: { type: "flow", caption: "Signature/expiry/issuer validation happens before the request ever reaches your code — method-level checks run once more, right before the method body.",
            steps: [
              { label: "Bearer token arrives", note: "Authorization header" },
              { label: "Filter extracts token", note: "BearerTokenAuthenticationFilter", arrowLabel: "→" },
              { label: "JWT verified", note: "signature, exp, iss checked against JWK Set", arrowLabel: "→" },
              { label: "Authentication set", note: "SecurityContextHolder", arrowLabel: "→" },
              { label: "@PreAuthorize evaluated", note: "SpEL, before method body", arrowLabel: "→" },
              { label: "Method runs", arrowLabel: "→" }
            ]},
          tricks: [
            "@PreAuthorize/@PostAuthorize are proxy-based, just like @Transactional — self-invocation from within the same class silently skips the authorization check, the same root cause as the spring-1 gotcha, and interviewers like candidates who make that connection unprompted.",
            "Signature/expiry validation alone doesn't handle revocation — a stolen-but-not-yet-expired token stays valid until it expires; short-lived access tokens plus refresh tokens (or a token introspection endpoint per RFC 7662) are the standard mitigations, worth naming if asked 'how do you revoke a JWT'."
          ]
        }}
    ]},
    { name: "Microservices & Messaging", items: [
      { id: "spring-7", t: "Spring Cloud Fundamentals: Config Server, Service Discovery", d: "Medium",
        desc: "Externalized, centrally-managed config (Config Server) and dynamic service registry/lookup (Eureka/Consul) — the pre-Kubernetes way of solving problems k8s ConfigMaps/Services now solve natively; know both, since plenty of fintech shops still run Spring Cloud Netflix stacks.",
        notes: {
          explain: [
            "Config Server centralizes externalized configuration in a Git repo (or Vault/filesystem backend) that every service pulls from at startup via spring-cloud-config-client — instead of each service shipping its own application.yml baked into the jar, you change a value in the config repo and every instance picks it up on next restart (or immediately, with Spring Cloud Bus wiring a refresh event out to all instances). Service discovery (Eureka, or Consul) solves the companion problem: instead of hardcoding 'order-service lives at 10.0.4.12:8080', each service registers itself under a logical name in the registry and looks up other services by that name, with a client-side load balancer picking a healthy instance."
          ],
          code: [{ lang: "yaml", caption: "A service registering with Eureka and pulling its config from Config Server on startup", src:
`spring:
  application:
    name: order-service
  config:
    import: "configserver:http://config-server:8888"

eureka:
  client:
    service-url:
      defaultZone: http://eureka-server:8761/eureka` }],
          diagram: { type: "compare", caption: "Both stacks solve the same two problems — Spring Cloud Netflix predates Kubernetes and was built to run on plain VMs.",
            columns: [
              { title: "Spring Cloud Netflix stack", points: ["Config Server: centralized config in a Git repo", "Eureka/Consul: services register themselves, look each other up by name", "Client-side load balancing picks a healthy instance"] },
              { title: "Kubernetes-native equivalent", points: ["ConfigMaps/Secrets: centralized config, mounted or injected as env vars", "Service objects + built-in DNS: automatic name-based discovery", "kube-proxy handles load balancing across pod replicas"] }
            ]},
          tricks: [
            "Interviewers like you naming the direct k8s equivalents unprompted: Config Server → ConfigMaps/Secrets, Eureka/Consul → Kubernetes Service objects + DNS-based discovery + kube-proxy's built-in load balancing. Knowing both stacks signals you understand WHY Spring Cloud existed, not just how to configure it.",
            "Eureka is AP (favors availability over consistency) in CAP terms — during a network partition it keeps serving a possibly-stale registry rather than refusing to answer, since Netflix judged routing to a slightly-stale instance list better than discovery itself becoming a single point of failure."
          ]
        }},
      { id: "spring-8", t: "Resilience4j: Circuit Breaker, Bulkhead, Retry, Rate Limiter", d: "Medium",
        desc: "A lightweight, functional-style resilience library — the modern replacement for Netflix Hystrix.",
        notes: {
          explain: ["A circuit breaker wraps a call to a potentially-failing dependency and tracks its failure rate. Below the failure threshold it stays CLOSED (calls pass through normally). Once failures exceed the threshold, it trips OPEN and fails fast without even attempting the call — protecting your service from wasting resources on a downstream that's already struggling and preventing cascading failure. After a wait duration it moves to HALF_OPEN and lets a limited number of trial calls through to test recovery."],
          code: [{ lang: "java", caption: "Declarative circuit breaker + fallback with the annotation-based API", src:
`@CircuitBreaker(name = "paymentService", fallbackMethod = "fallback")
@Retry(name = "paymentService")
public PaymentResult charge(ChargeRequest req) {
    return paymentClient.charge(req);
}

private PaymentResult fallback(ChargeRequest req, Throwable t) {
    log.warn("payment service unavailable, queuing for retry", t);
    return PaymentResult.queued(req);
}` }],
          diagram: { type: "flow", caption: "Cyclic in practice: HALF_OPEN loops back to CLOSED on success or back to OPEN on failure.",
            steps: [
              { label: "CLOSED", note: "calls pass through normally" },
              { label: "OPEN", note: "failure threshold exceeded — fails fast, no call attempted", arrowLabel: "trips" },
              { label: "HALF_OPEN", note: "after wait duration — limited trial calls allowed", arrowLabel: "cooldown elapses" },
              { label: "CLOSED or OPEN", note: "success → closed again; failure → open again", arrowLabel: "trial result" }
            ]},
          tricks: [
            "Bulkhead limits concurrent calls to a dependency (named after ship bulkheads — isolating a failure to one compartment) so one slow downstream can't exhaust your entire thread pool and take down unrelated calls too.",
            "Order of decorators matters when combining Retry + CircuitBreaker: retrying inside a circuit breaker that's already OPEN just fails fast N times instead of actually retrying — Resilience4j's default composition order (Retry around CircuitBreaker) is a real configuration detail worth knowing, not just trivia."
          ]
        }},
      { id: "spring-9", t: "Spring Kafka Advanced: Error Handling, Dead-Letter Topics, Exactly-Once Config", d: "Hard",
        desc: "Compare directly against your raw Kafka Streams/RocksDB implementation experience — this is Spring's abstraction over the same guarantees you've already built by hand.",
        notes: {
          explain: ["Spring Kafka's DefaultErrorHandler with a DeadLetterPublishingRecoverer gives you declarative retry-then-DLT behavior: a failed message is retried N times with backoff, and if still failing, published to a `<topic>.DLT` topic instead of blocking the partition forever. For exactly-once, Spring Kafka wires the producer's transactional.id and `read_committed` isolation level together with @Transactional-style semantics via KafkaTransactionManager — conceptually the same exactly-once guarantee you implemented directly with Kafka Streams, just configured declaratively instead of coded by hand."],
          code: [{ lang: "java", caption: "Retry with backoff, then dead-letter — configured, not hand-coded", src:
`@Bean
public DefaultErrorHandler errorHandler(KafkaTemplate<Object, Object> template) {
    var recoverer = new DeadLetterPublishingRecoverer(template);
    var backoff = new ExponentialBackOff(1000L, 2.0);
    backoff.setMaxElapsedTime(30000L);
    return new DefaultErrorHandler(recoverer, backoff);
}

// application.properties — exactly-once producer + read_committed consumer
spring.kafka.producer.transaction-id-prefix=order-svc-tx-
spring.kafka.consumer.isolation-level=read_committed` }],
          tricks: [
            "A poison-pill message (one that will NEVER succeed, e.g., malformed JSON) without a DLT configured will block that partition's consumption indefinitely on naive retry-forever logic — know this failure mode cold since you've likely hit its equivalent in raw Kafka Streams.",
            "Exactly-once in Spring Kafka requires BOTH producer idempotence/transactions AND consumer isolation.level=read_committed — missing either half silently degrades you back to at-least-once, a sharp interview distinguishing question."
          ]
        }},
      { id: "spring-10", t: "Spring Cloud Stream Abstractions over Kafka/Solace", d: "Medium",
        desc: "A binder abstraction (function-based: Supplier/Function/Consumer beans) that lets the same business logic run against Kafka, RabbitMQ, or Solace by swapping the binder dependency — useful to mention given your direct Solace/JMS production experience alongside Kafka.",
        notes: {
          explain: [
            "Spring Cloud Stream lets you write business logic as plain java.util.function.Function/Supplier/Consumer beans, then bind them to a message broker purely through configuration — a 'binder' dependency (spring-cloud-stream-binder-kafka, or a Solace binder) does the broker-specific wiring (topics/queues, serialization, offsets/acks) behind the scenes. The same Function<OrderEvent, ShippingEvent> bean can run against Kafka in one environment and Solace in another without touching business logic — you swap the binder dependency and update binding properties, not code.",
            "The abstraction has a real cost given your background with both brokers directly: broker-specific power features (Kafka's partition-key routing and exactly-once semantics from spring-9, Solace's guaranteed-messaging topic hierarchies) aren't fully represented in the generic binder API, which is why teams doing serious Kafka work often reach past Spring Cloud Stream into spring-kafka directly for that control."
          ],
          code: [{ lang: "java", caption: "One Function bean, wired to a broker entirely through properties", src:
`@Bean
public Function<OrderEvent, ShippingEvent> processOrder() {
    return order -> new ShippingEvent(order.orderId(), "QUEUED");
}

// application.properties — broker-specific details live entirely here
// spring.cloud.function.definition=processOrder
// spring.cloud.stream.bindings.processOrder-in-0.destination=orders
// spring.cloud.stream.bindings.processOrder-out-0.destination=shipping-events
// spring.cloud.stream.bindings.processOrder-in-0.group=shipping-service` }],
          tricks: [
            "The function's bean name drives the binding names by convention (`<beanName>-in-0`/`<beanName>-out-0`) — a frequent 'why isn't my consumer receiving anything' bug is a mismatch between the bean name and the spring.cloud.function.definition property.",
            "Volunteer the leaky-abstraction nuance unprompted: Spring Cloud Stream is great for simple pipeline logic that genuinely needs to be broker-agnostic, but a service leaning on Kafka-specific guarantees is usually better served talking to spring-kafka directly."
          ]
        }},
      { id: "spring-11", t: "API Gateway Patterns with Spring Cloud Gateway", d: "Medium",
        desc: "A reactive, non-blocking gateway for routing, rate limiting, and auth at the edge.",
        notes: {
          code: [{ lang: "java", caption: "Route + rate-limit + circuit-break, all declarative", src:
`@Bean
public RouteLocator routes(RouteLocatorBuilder builder) {
    return builder.routes()
        .route("orders", r -> r.path("/api/orders/**")
            .filters(f -> f
                .requestRateLimiter(c -> c.setRateLimiter(redisRateLimiter()))
                .circuitBreaker(c -> c.setName("ordersCB").setFallbackUri("/fallback/orders")))
            .uri("lb://order-service"))
        .build();
}` }],
          diagram: { type: "flow", steps: [
            { label: "Client request" },
            { label: "Predicate match", note: "path/header/method routing rule", arrowLabel: "→" },
            { label: "Filter chain", note: "auth, rate limit, header rewrite, circuit breaker", arrowLabel: "→" },
            { label: "Route to service", note: "load-balanced via service discovery", arrowLabel: "→" }
          ]},
          tricks: ["Spring Cloud Gateway is built on WebFlux/Netty (non-blocking) — unlike the older Zuul 1 (blocking, servlet-based) — know this as a concrete example of why the reactive stack matters for infrastructure-layer components that must handle massive fan-out with minimal thread overhead."]
        }},
      { id: "spring-12", t: "Micrometer + OpenTelemetry Integration in Spring Boot", d: "Easy",
        desc: "You already run this stack in production — formalize it for interviews: Micrometer is the metrics facade (like SLF4J but for metrics), Micrometer Tracing bridges to OpenTelemetry for distributed traces, and Actuator exposes it all via /actuator/prometheus.",
        notes: {
          explain: [
            "Micrometer is a vendor-neutral metrics facade — the same role SLF4J plays for logging. You instrument code once against Micrometer's API (Counter, Timer, Gauge, DistributionSummary) and a registry implementation ships the data to whatever backend you've wired up (Prometheus, Datadog, CloudWatch) without changing instrumentation code. Micrometer Tracing (formerly Spring Cloud Sleuth) does the same job for distributed tracing: it generates and propagates trace/span IDs across service boundaries and bridges them to OpenTelemetry's OTLP exporter, so traces show up in Jaeger/Tempo/Datadog APM alongside your metrics.",
            "Actuator is the delivery mechanism, not the instrumentation itself — /actuator/prometheus exposes the Micrometer registry in Prometheus's scrape text format, and /actuator/metrics lets you inspect any individual metric ad hoc (with optional tag filters) without standing up a full dashboard."
          ],
          code: [{ lang: "java", caption: "Common tags, a declarative timer, and manual instrumentation", src:
`@Bean
MeterRegistryCustomizer<MeterRegistry> commonTags() {
    return registry -> registry.config().commonTags("service", "order-service");
}

@Timed(value = "order.process.time", description = "Time to process an order")
public void processOrder(Order o) { ... }

// Manual instrumentation
Counter.builder("orders.created")
    .tag("channel", "web")
    .register(meterRegistry)
    .increment();` }],
          tricks: [
            "Micrometer's dimensional tags (e.g. .tag('channel','web')) map directly onto Prometheus labels — but a high-cardinality tag (user ID, order ID) will blow up your Prometheus storage/cardinality limits; this is a real production footgun worth naming unprompted.",
            "Micrometer Tracing auto-injects the current traceId/spanId into the MDC, so a structured JSON log line (spring-26) and a distributed trace can be correlated just by grepping the same traceId across both systems — the 'three pillars of observability' actually tying together in practice, not just as a diagram."
          ]
        }}
    ]},
    { name: "Testing & Ops", items: [
      { id: "spring-13", t: "Testcontainers for Real Integration Tests (Kafka, Postgres, etc.)", d: "Medium",
        desc: "Spins up real Docker containers (actual Kafka broker, actual Postgres) for integration tests instead of mocks or in-memory fakes (H2) that silently diverge from production behavior — the modern default for any test claiming to verify real persistence/messaging behavior.",
        notes: { code: [{ lang: "java", caption: "A real Kafka broker in a JUnit test, no mocking", src:
`@Testcontainers
class OrderConsumerIT {
    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));

    @DynamicPropertySource
    static void kafkaProps(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Test
    void consumesRealOrderEvent() {
        producer.send("orders", new OrderCreated("123"));
        await().atMost(Duration.ofSeconds(5))
            .until(() -> orderRepo.existsById("123"));
    }
}` }] } },
      { id: "spring-14", t: "Contract Testing with Spring Cloud Contract", d: "Medium",
        desc: "Producer-driven contract tests: the producer publishes a contract, generates a stub, and consumer teams test against that stub instead of a live integration environment — catches breaking API changes at build time instead of in a shared staging environment.",
        notes: {
          explain: [
            "Spring Cloud Contract flips the usual integration-testing direction: the producer team writes contracts (Groovy DSL or YAML) describing the requests/responses their API guarantees, and a Maven/Gradle plugin generates two things from each contract — a WireMock stub JAR that consumer teams run locally instead of hitting a live environment, and a producer-side test that fails the producer's build if its actual API response no longer matches the contract it promised."
          ],
          code: [{ lang: "java", caption: "A contract, and the consumer-side test that runs against its generated stub", src:
`// src/test/resources/contracts/shouldReturnOrder.groovy
Contract.make {
    request {
        method GET()
        url '/orders/123'
    }
    response {
        status 200
        body(id: 123, status: "SHIPPED")
        headers { contentType(applicationJson()) }
    }
}

// Consumer side — runs against a WireMock stub generated from the contract above
@AutoConfigureStubRunner(ids = "com.example:order-service:+:stubs:8080")
class ShippingClientContractTest { ... }` }],
          tricks: [
            "The producer's build literally fails if the real response drifts from the contract — that's what makes it 'producer-driven': breaking changes are caught in CI on the producer's own repo, before anything ships, instead of being discovered by a consumer team weeks later against a shared staging environment.",
            "Don't confuse this with Testcontainers-based integration tests (spring-13) — contract tests verify the SHAPE of an API interaction (does the JSON match, are headers right), not real business logic or persistence; a healthy test pyramid needs both layers, not one instead of the other."
          ]
        }},
      { id: "spring-15", t: "Spring Boot Actuator: Custom Health Indicators & Metrics", d: "Easy",
        desc: "Implementing HealthIndicator for a custom dependency check (e.g., 'can I reach the Kafka broker/Solace queue') and registering custom Micrometer meters — the building blocks behind the health/metrics endpoints your existing observability pipeline consumes.",
        notes: {
          explain: [
            "Implementing HealthIndicator lets you plug a custom dependency check into Spring Boot's built-in /actuator/health aggregation — Boot already ships indicators for DataSource, Kafka, disk space, etc., and composes them into one overall UP/DOWN status; a custom indicator (e.g., 'can I reach the Solace queue manager') slots into that same aggregation and shows up under the response's components. Custom Micrometer meters (see spring-12) plug into the same registry as the framework's own metrics, so a business-level counter like orders.created shows up in Prometheus/Grafana right alongside JVM and HTTP metrics."
          ],
          code: [{ lang: "java", caption: "A custom HealthIndicator for a dependency Actuator doesn't know about out of the box", src:
`@Component
public class SolaceHealthIndicator implements HealthIndicator {
    private final SolaceConnectionManager connectionManager;

    @Override
    public Health health() {
        if (connectionManager.isConnected()) {
            return Health.up()
                .withDetail("queueManager", connectionManager.getHost())
                .build();
        }
        return Health.down()
            .withDetail("reason", "not connected to Solace broker")
            .build();
    }
}` }],
          tricks: [
            "Health groups (management.endpoint.health.group.readiness.include=db,solace) are exactly how Spring Boot maps onto Kubernetes' separate liveness vs readiness probes — liveness answers 'should k8s restart this pod', readiness answers 'should k8s send it traffic', and conflating the two (a slow downstream getting the pod killed instead of just pulled from rotation) is a real production incident pattern worth naming.",
            "A DOWN status from any single indicator drags the aggregate /actuator/health status to DOWN by default — one flaky non-critical dependency check can take a healthy pod out of rotation unless you deliberately scope it out of the readiness group."
          ]
        }},
      { id: "spring-16", t: "GraalVM Native Image Builds for Spring Boot", d: "Hard",
        desc: "Ahead-of-time compiles a Spring Boot app to a native executable — startup in milliseconds instead of seconds, far lower memory footprint, at the cost of a more constrained runtime (no arbitrary reflection without configuration, longer build times). Spring's AOT engine (spring-boot:process-aot) exists specifically to make this work smoothly.",
        notes: {
          explain: [
            "GraalVM's native-image tool ahead-of-time compiles a Spring Boot app — bytecode plus every dependency — into a standalone native executable instead of JIT-compiling on every JVM startup. The payoff is startup measured in tens of milliseconds instead of seconds and RSS memory a fraction of a normal JVM process, which matters enormously for scale-to-zero and high-density container workloads. The cost is a fundamentally more restrictive runtime: native-image does static reachability analysis at build time, so it can't support unrestricted runtime reflection, dynamic proxies, or classpath scanning unless it's told about them ahead of time via reflect-config.json.",
            "Spring's AOT engine exists specifically to absorb that cost: it runs the ApplicationContext at build time, records every bean definition, proxy, and reflective access Spring itself needs, and emits the GraalVM hint files automatically — so you don't hand-write reflect-config.json for framework internals. You may still need to add hints yourself for your own reflective code (e.g., a hand-rolled JSON mapper doing reflection)."
          ],
          code: [{ lang: "bash", caption: "Building and running a native image via Spring Boot's Buildpacks integration — no local GraalVM install needed", src:
`./mvnw -Pnative spring-boot:build-image

docker run --rm -p 8080:8080 order-service:latest
# starts in tens of milliseconds instead of seconds` }],
          diagram: { type: "compare",
            columns: [
              { title: "Traditional JVM (JIT)", points: ["Startup: ~1-3s typical for a Spring Boot app", "Peak throughput can exceed native once JIT warms up", "Full runtime reflection/dynamic class loading supported"] },
              { title: "GraalVM Native Image (AOT)", points: ["Startup: tens of milliseconds", "Lower baseline memory, no warm-up needed", "Reflection/proxies/classpath scanning must be known at build time via AOT hints"] }
            ]},
          tricks: [
            "Longer build times (minutes, not seconds) and a much slower iteration loop are the real hidden cost — native image builds are typically reserved for CI/CD producing the final deployable artifact, not for local dev-loop iteration.",
            "Dynamic proxies are exactly how @Transactional/@PreAuthorize/AOP work — without Spring's AOT hint generation, half the proxy-based framework features documented elsewhere in this track would silently break under native-image, which is why the AOT engine isn't optional glue, it's load-bearing."
          ]
        }},
      { id: "spring-17", t: "JVM/GC Performance Tuning for Spring Boot Services Under Load", d: "Hard",
        desc: "Directly extends your TPS scaling/benchmarking work — heap sizing, GC algorithm choice (G1 vs generational ZGC, see the Java 21 entry), and thread pool tuning (Tomcat's max-threads vs virtual threads) are the concrete levers behind a 50→3000 TPS story.",
        notes: {
          explain: [
            "The concrete levers for taking a Spring Boot service from 'works in staging' to 'holds steady at production load' cluster into three buckets: heap sizing (Xms=Xmx to avoid runtime resizing pauses, sized against actual live-object retention measured from GC logs rather than guessed), GC algorithm choice (G1 is the default and a solid general-purpose choice; ZGC/generational ZGC trades some throughput for near-zero pause times once you're latency-sensitive at large heap sizes — see the Java 21 entry), and thread pool tuning (Tomcat's server.tomcat.threads.max controls how many concurrent blocking requests you can serve before requests queue, which is the exact platform-thread-pool problem virtual threads from spring-2 attack directly).",
            "GC pause time shows up as p99 latency spikes even when average throughput looks fine — profiling tools (GC logs via -Xlog:gc*, async-profiler for flame graphs, and load tests with gradually increasing concurrency) are how you find the actual bottleneck instead of guessing at a config flag."
          ],
          code: [{ lang: "bash", caption: "A concrete, defensible starting point — fixed heap, G1 with a pause target, GC logging on", src:
`java -Xms4g -Xmx4g \\
     -XX:+UseG1GC -XX:MaxGCPauseMillis=200 \\
     -Xlog:gc*:file=gc.log:time,uptime:filecount=5,filesize=50M \\
     -jar order-service.jar` }],
          tricks: [
            "An undersized heap doesn't just cause OutOfMemoryError — it causes constant minor-GC churn that shows up as elevated p99 latency and CPU spent collecting instead of doing business logic, long before you ever hit an OOM; that's the difference between 'the service is slow' and 'the service is crashing' as symptoms of the same root cause.",
            "Xms != Xmx lets the heap resize at runtime, and every resize is itself a stop-the-world-adjacent pause — for a latency-sensitive production service, setting Xms=Xmx up front is a small, well-known, easy-to-forget win worth stating explicitly."
          ]
        }}
    ]},
    { name: "Architecture Patterns", items: [
      { id: "spring-18", t: "Hexagonal / Clean Architecture in a Spring Codebase", d: "Medium",
        desc: "Isolating domain logic behind ports (interfaces) with Spring beans as adapters (@Repository, @RestController) implementing them — keeps business logic testable and framework-agnostic instead of entangled with @Autowired everywhere.",
        notes: {
          explain: [
            "Hexagonal (ports & adapters) architecture puts your domain/business logic at the center with zero dependency on Spring, and defines 'ports' as plain Java interfaces the domain needs (e.g., OrderRepository, PaymentGateway) without knowing or caring what implements them. Spring beans then become 'adapters' plugged into those ports from the outside: a @Repository implementing OrderRepository against JPA, a @Component implementing PaymentGateway against a REST client, a @RestController translating HTTP requests into calls on the domain's application service. The domain module can be unit tested with zero Spring context startup and no @Autowired mocking gymnastics — you just `new` the domain object with a hand-written test double for the port.",
            "The dependency inversion is the actual mechanism, not just a diagram convention: infrastructure code (JPA, REST clients) depends on interfaces the domain defines, never the other way around, which is what keeps business logic swappable — you can replace JPA with a different persistence technology without touching a single domain class."
          ],
          code: [{ lang: "java", caption: "The domain defines the port; infrastructure supplies the adapter", src:
`// Domain layer — no Spring imports at all
public interface OrderRepository {
    Optional<Order> findById(String id);
    void save(Order order);
}

public class PlaceOrderService {
    private final OrderRepository orders;   // depends on the PORT, not JPA
    private final PaymentGateway payments;

    public Order placeOrder(OrderRequest req) {
        // pure domain logic — testable with a fake OrderRepository, no Spring context
    }
}

// Infrastructure layer — the adapter, Spring-aware
@Repository
class JpaOrderRepository implements OrderRepository {
    private final SpringDataOrderJpaRepo jpaRepo;
    public Optional<Order> findById(String id) { return jpaRepo.findById(id).map(this::toDomain); }
    public void save(Order order) { jpaRepo.save(toEntity(order)); }
}` }],
          diagram: { type: "tree", caption: "The domain depends only on its own port interfaces; every concrete Spring bean is an adapter plugged in from the outside.",
            root: "Domain (framework-agnostic business logic)",
            children: [
              { label: "Port: OrderRepository", children: [{ label: "Adapter: JpaOrderRepository (@Repository)" }] },
              { label: "Port: PaymentGateway", children: [{ label: "Adapter: StripePaymentGateway (@Component)" }] },
              { label: "Port: OrderUseCase (inbound)", children: [{ label: "Adapter: OrderController (@RestController)" }] }
            ]},
          tricks: [
            "The dependency ARROW is the whole point: infrastructure (JPA, REST, Kafka) depends on the domain's interfaces, never the reverse — if a domain class imports org.springframework.* or a JPA annotation, the architecture has already leaked. This is the concrete, checkable test an interviewer can ask you to apply.",
            "The honest pushback: isn't this over-engineering for a small CRUD service? Yes, for something trivial — the payoff (testability without Spring context startup, swappable infra, isolated business rules) shows up specifically as the domain's complexity and lifetime grow, not on day one."
          ]
        }},
      { id: "spring-19", t: "CQRS & Event Sourcing with Spring", d: "Hard",
        desc: "Separate write (command) and read (query) models — often paired with events as the source of truth.",
        notes: {
          diagram: { type: "compare", caption: "Event sourcing (storing the sequence of events, not just current state) often pairs with CQRS but is a separate decision — you can do CQRS with a normal database on both sides.",
            columns: [
              { title: "Command side (write)", points: ["Optimized for validated, consistent writes", "Publishes domain events on state change (e.g., to Kafka)", "Often normalized, transactional"] },
              { title: "Query side (read)", points: ["One or more denormalized read models, tailored per use case", "Built by consuming the command side's events asynchronously", "Optimized purely for fast reads — can be eventually consistent"] }
            ]},
          tricks: ["The main cost of CQRS is eventual consistency on the read side — a write may not be immediately visible in every read model. Interviewers want you to name this tradeoff unprompted, not just describe the pattern's benefits."]
        }},
      { id: "spring-20", t: "Saga Pattern Implementation in Spring (Orchestration vs Choreography)", d: "Hard",
        desc: "Managing a multi-service transaction without distributed 2PC, using a sequence of local transactions and compensating actions.",
        notes: {
          diagram: { type: "compare",
            columns: [
              { title: "Orchestration", points: ["A central orchestrator service explicitly calls each step and triggers compensations on failure", "Easier to understand/debug — the whole flow lives in one place", "The orchestrator itself becomes a critical, potentially coupled component"] },
              { title: "Choreography", points: ["Each service reacts to events from the previous step, no central coordinator", "More decoupled, no single point of control", "Harder to trace/debug the overall flow — 'what triggered what' is spread across services"] }
            ]},
          tricks: ["A saga guarantees eventual consistency, not atomicity — every step needs a corresponding compensating action (e.g., 'refund payment' to undo 'charge payment'), and compensations must be idempotent since they might be retried. This is a natural place to bring up the outbox pattern (System Design track) for reliably publishing the events that drive each step."]
        }},
      { id: "spring-21", t: "Multi-Tenancy Patterns in a Spring Boot Service", d: "Medium",
        desc: "Three standard approaches — separate database per tenant (strongest isolation, highest ops overhead), separate schema per tenant, or shared schema with a tenant-discriminator column (cheapest, requires disciplined query filtering, usually via Hibernate's multi-tenancy support or a request-scoped filter).",
        notes: {
          explain: [
            "The three isolation strategies trade off differently. Separate database per tenant gives the strongest isolation — a bug in tenant A's query literally cannot touch tenant B's data, and per-tenant backup/restore/compliance is trivial — but multiplies operational overhead, since connection pools, migrations, and monitoring all now run N times. Separate schema per tenant is a middle ground: cheaper to operate than separate databases, still gives real query-level isolation, but migrations still run N times. Shared schema with a tenant-discriminator column is cheapest to run (one schema, one pool, one migration) but pushes all the isolation risk onto disciplined application-level query filtering — forget a WHERE tenant_id = ? once and you have a cross-tenant data leak.",
            "In the shared-schema approach, the current tenant is typically resolved from a JWT claim or subdomain at the start of the request (a servlet filter storing it in a ThreadLocal-backed context), and Hibernate's own multi-tenancy support (a MultiTenantConnectionProvider for DB/schema-per-tenant, or a Hibernate @Filter for the discriminator-column approach) enforces the isolation at the ORM level instead of trusting every hand-written query."
          ],
          code: [{ lang: "java", caption: "Shared-schema isolation enforced structurally via a Hibernate filter, not by convention", src:
`@Component
public class TenantFilter extends OncePerRequestFilter {
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String tenantId = req.getHeader("X-Tenant-Id"); // or resolve from JWT claim
        TenantContext.setTenantId(tenantId);
        try {
            chain.doFilter(req, res);
        } finally {
            TenantContext.clear(); // never leak into the next request on a pooled thread
        }
    }
}

@FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "tenantId", type = String.class))
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
@Entity
class Order { ... }` }],
          diagram: { type: "compare",
            columns: [
              { title: "Isolated (DB or schema per tenant)", points: ["Strongest isolation — a query bug can't cross tenants", "N migrations, N connection pools to operate", "Best for regulated/compliance-heavy tenants"] },
              { title: "Shared schema + discriminator column", points: ["Cheapest to run — one schema, one pool, one migration", "Isolation is only as strong as your query filtering discipline", "Best for high tenant count, low per-tenant footprint"] }
            ]},
          tricks: [
            "The shared-schema approach's entire safety story rests on EVERY query being tenant-filtered — enforcing it at the Hibernate filter level (as above) instead of trusting every developer to remember WHERE tenant_id = ? is the difference between a policy and a guarantee; interviewers want to hear you'd enforce it structurally.",
            "TenantContext stored in a ThreadLocal must be cleared in a finally block — on a pooled or reused thread, a forgotten clear() leaks tenant A's ID into a request that's actually tenant B's, a subtle but real production bug class."
          ]
        }},
      { id: "spring-22", t: "Feature Flags & Progressive Rollout Patterns", d: "Easy",
        desc: "Decoupling deployment from release — toggle behavior at runtime (via a config service or a library like Togglz/LaunchDarkly) to support canary releases, percentage rollouts, and instant kill-switches without a redeploy.",
        notes: {
          explain: [
            "Feature flags decouple 'deploy' from 'release': the code for a new feature ships to production behind a flag that's off by default, so deploying it carries none of the risk of turning it on for users — you deploy on your own schedule and release on a completely separate one, per-user, per-percentage, or per-tenant. At runtime, a flag check is usually a call to a library (Togglz, LaunchDarkly's SDK) or a lightweight config service that evaluates rules (percentage rollout, allow-list, targeting by user attribute) and returns a boolean or variant — cheap enough to call on every request.",
            "The canary pattern combines flags with metrics: roll out to 1% of traffic, watch error rate/latency dashboards, then ramp to 100% — or roll back instantly by flipping the flag off. That kill-switch use case is the strongest reason to prefer flags over a plain redeploy/rollback during an active incident: a config change takes effect in seconds, while a rollback requires the whole CI/CD pipeline to run again."
          ],
          code: [{ lang: "java", caption: "A flag gating a risky new code path behind the old, proven one", src:
`@Service
public class PricingService {
    private final FeatureManager featureManager; // Togglz

    public Price calculate(Order order) {
        if (featureManager.isActive(Features.NEW_PRICING_ENGINE)) {
            return newPricingEngine.calculate(order);
        }
        return legacyPricingEngine.calculate(order);
    }
}` }],
          diagram: { type: "flow", caption: "The flag flip at the end is what makes this faster to recover from than a redeploy — no pipeline required.",
            steps: [
              { label: "Deploy, flag OFF", note: "code ships, feature inactive" },
              { label: "Enable for 1%", note: "canary cohort", arrowLabel: "→" },
              { label: "Watch metrics", note: "error rate, latency", arrowLabel: "→" },
              { label: "Ramp 10% → 100%", note: "on healthy metrics", arrowLabel: "→" },
              { label: "Instant rollback", note: "flip flag off, no redeploy", arrowLabel: "on regression" }
            ]},
          tricks: [
            "The kill-switch argument is the strongest answer to 'why not just roll back a bad deploy': a flag flip is a config change taking effect in seconds, while a rollback re-runs the whole deploy pipeline — in an active incident, that time difference matters enormously.",
            "Long-lived flags rot into permanent if/else branches and dead code nobody dares delete — a mature feature-flag practice includes retiring flags (removing the old code path) once a rollout completes at 100%, not just adding new ones forever."
          ]
        }}
    ]},
    { name: "Latest Releases — What Shipped Recently (3.2 → 4.x)", items: [
      { id: "spring-23", t: "RestClient — the synchronous successor to RestTemplate (3.2)", d: "Easy",
        desc: "A fluent, synchronous HTTP client built on the same infrastructure as WebClient — the modern default for blocking service-to-service calls, since RestTemplate is in maintenance mode.",
        notes: {
          explain: [
            "RestTemplate has been in maintenance mode for years with no new features planned, but WebClient always felt like overkill for teams that don't need reactive programming. RestClient closes that gap: same fluent, composable builder-style API as WebClient (uri/header/body chaining, ExchangeFilterFunction interceptors), but fully synchronous — no Mono/Flux to reason about."
          ],
          code: [{ lang: "java", caption: "Fluent and synchronous — no reactive types involved", src:
`RestClient client = RestClient.builder()
    .baseUrl("https://api.example.com")
    .build();

OrderDto order = client.get()
    .uri("/orders/{id}", orderId)
    .retrieve()
    .body(OrderDto.class);`}],
          tricks: ["A common interview question is simply 'RestTemplate vs WebClient vs RestClient — when do you use each?' RestTemplate: legacy, avoid in new code. WebClient: you're already reactive (WebFlux) or need non-blocking calls. RestClient: synchronous code (the common case) that wants WebClient's nicer API without going reactive."]
        }},
      { id: "spring-24", t: "Docker Compose Support Out of the Box (3.1/3.3)", d: "Easy",
        desc: "Drop a compose.yaml in the project root and Spring Boot starts/stops those containers automatically for local `bootRun`/tests — no more manually running `docker compose up` before every dev session.",
        notes: {
          code: [{ lang: "yaml", caption: "compose.yaml — detected and managed automatically via spring-boot-docker-compose", src:
`services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: orders
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"`}],
          tricks: ["Pairs naturally with @ServiceConnection (see below) to auto-wire the datasource/connection properties from the running container — the combination removes almost all manual `application-local.properties` boilerplate for local dev."]
        }},
      { id: "spring-25", t: "@ServiceConnection for Testcontainers (3.1+)", d: "Medium",
        desc: "One annotation replaces the @DynamicPropertySource boilerplate for wiring a Testcontainers container's connection details into the Spring context.",
        notes: {
          code: [{ lang: "java", caption: "Before: manual @DynamicPropertySource. After: one annotation.", src:
`@Testcontainers
class OrderRepositoryIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    // No @DynamicPropertySource block needed — Spring Boot auto-detects
    // the container type and wires spring.datasource.* itself.
}`}],
          tricks: ["@ServiceConnection recognizes common container types out of the box (Postgres, MySQL, Kafka, Redis, MongoDB, RabbitMQ...) — for anything it doesn't recognize, you can still fall back to @DynamicPropertySource."]
        }},
      { id: "spring-26", t: "Structured (JSON) Application Logging, Built In (3.4)", d: "Medium",
        desc: "A logging.structured.format property switches console/file logs to a structured JSON format (ECS, GELF, or Logstash-compatible) with zero custom Logback/Log4j2 XML config.",
        notes: {
          explain: [
            "Previously, getting JSON-formatted logs into an ELK/Datadog-style pipeline meant hand-writing a custom Logback encoder or pulling in a third-party library. Spring Boot 3.4 made this a first-class, one-property feature with a few well-known output formats baked in, while still allowing a fully custom structured format if you need one."
          ],
          code: [{ lang: "properties", caption: "One property — no logback-spring.xml required for the common case", src:
`logging.structured.format.console=ecs
logging.structured.format.file=logstash`}]
        }},
      { id: "spring-27", t: "Problem Details (RFC 7807) as the Default Error Response", d: "Medium",
        desc: "Spring MVC/WebFlux error responses are standardized on RFC 7807's application/problem+json shape by default, instead of every team hand-rolling its own error JSON schema.",
        notes: {
          code: [{ lang: "json", caption: "The default shape — type/title/status/detail/instance, plus your own extension fields", src:
`{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Account balance is $12.50, charge requires $50.00",
  "instance": "/orders/789/charge"
}`}],
          tricks: ["Interviewers care that you know WHY this matters: a standardized error shape means every downstream client/gateway can parse errors the same way across every microservice, instead of each team inventing its own {error, message, code} JSON ad hoc."]
        }},
      { id: "spring-28", t: "SBOM (Software Bill of Materials) Actuator Endpoint (3.3)", d: "Easy",
        desc: "/actuator/sboms exposes a CycloneDX-format bill of materials for the running app — a direct answer to increasing supply-chain security/compliance requirements (knowing exactly what's in your deployed artifact).",
        notes: {
          explain: [
            "/actuator/sboms exposes a CycloneDX-format Software Bill of Materials for the running application — a machine-readable manifest listing every dependency (and transitive dependency) baked into the deployed artifact, including version numbers. This answers a question that's become a hard compliance requirement in a lot of industries: 'is this specific vulnerable library version running in production, right now, in this service' — without an SBOM, answering that means grepping build files across every repo and hoping your inventory is accurate.",
            "The SBOM itself is generated at build time by the CycloneDX Maven/Gradle plugin — Boot just exposes what was already baked in. The real value shows up when it's fed into supply-chain tooling (a vulnerability scanner like Grype/Trivy, or a Dependency-Track server) that can automatically flag when a newly-disclosed CVE affects something you have running."
          ],
          code: [{ lang: "bash", caption: "The endpoint returns a full CycloneDX document — every dependency, version, and license in the running artifact", src:
`curl http://localhost:8080/actuator/sboms
# {"ids":["application"]}

curl http://localhost:8080/actuator/sboms/application
# Full CycloneDX JSON manifest` }],
          tricks: [
            "The direct interview hook is Log4Shell (CVE-2021-44228): the industry-wide pain of 'we don't actually know which of our hundred services have the vulnerable log4j-core version' is exactly the problem SBOMs solve — naming that incident as the motivating case is a strong, concrete answer.",
            "The SBOM only reflects what was baked in at BUILD time — it doesn't itself detect new CVEs disclosed later; you still need a separate step (a CI job, a scheduled scan) feeding the SBOM into a vulnerability database for ongoing alerts, not just a point-in-time inventory."
          ]
        }},
      { id: "spring-29", t: "Spring Boot 4.0 / Spring Framework 7 Baseline Changes (Nov 2025)", d: "Medium",
        desc: "A major version bump: Java 17 as the new minimum baseline, Jakarta EE 10/11, and Jackson 3 as the default JSON engine — the kind of baseline-raising release worth knowing exists even if you haven't migrated to it yet.",
        notes: {
          explain: [
            "Major Spring Boot versions periodically raise the minimum supported Java version to drop support burden for old runtimes and take advantage of newer language features across the framework's own codebase. Boot 4 also moves Jackson 2 → Jackson 3 as the default JSON library, which is a real migration consideration for any app with custom Jackson modules or mixins.",
            "The practical interview angle: know that 'what Java version does Spring Boot require' is a moving target tied to the framework's own major-version releases, not a fixed number — and that upgrading a framework's major version is itself a project (dependency compatibility, deprecated API removal) worth planning for, not just clicking a version bump."
          ],
          tricks: ["A live interview follow-up is often 'how would you plan a Spring Boot major-version upgrade for a production service' — talk about running the old and new versions' test suites side by side, checking the migration guide's removed/deprecated API list, and upgrading in a lower environment first, not just bumping the pom.xml version and hoping."]
        }},
      { id: "spring-30", t: "Null-Safety Annotations via JSpecify (4.0)", d: "Medium",
        desc: "Spring's codebase (and your own, if you opt in) can now be annotated with the industry-standard JSpecify @Nullable/@NonNull annotations, checkable by static analysis tools and IDEs — replacing Spring's older, framework-specific null-safety annotations.",
        notes: {
          tricks: ["This is squarely aimed at catching NullPointerException-shaped bugs at build/review time via static analysis (IDE warnings, NullAway, error-prone) instead of at runtime — a good one-line talking point if asked how a team can reduce NPEs without switching languages."]
        }},
      { id: "spring-31", t: "Declarative HTTP Interface Clients Matured (@HttpExchange)", d: "Medium",
        desc: "Define an HTTP client as a plain Java interface with @HttpExchange methods — Spring generates the implementation, backed by RestClient, WebClient, or a raw HttpClient of your choice.",
        notes: {
          code: [{ lang: "java", caption: "An interface IS the client — no manual implementation to write or maintain", src:
`interface OrderServiceClient {
    @GetExchange("/orders/{id}")
    OrderDto getOrder(@PathVariable String id);

    @PostExchange("/orders")
    OrderDto createOrder(@RequestBody CreateOrderRequest req);
}

// Wiring: point the generated proxy at a concrete RestClient/WebClient
OrderServiceClient client = HttpServiceProxyFactory
    .builderFor(RestClientAdapter.create(restClient))
    .build()
    .createClient(OrderServiceClient.class);`}],
          tricks: ["Directly comparable to Spring Data JPA repositories (an interface, no implementation written by hand) or to Feign clients from the Spring Cloud Netflix era — good to draw that parallel explicitly since interviewers often ask 'how is this different from Feign?' (answer: it's now first-party, framework-native, no extra dependency)."]
        }},
      { id: "spring-32", t: "API Versioning Support for REST Controllers (4.0)", d: "Easy",
        desc: "First-class support for versioning endpoints (via header, path segment, or media type) instead of every team rolling its own convention and routing logic by hand.",
        notes: {
          explain: [
            "Spring Framework 7/Boot 4 adds first-class support for expressing an endpoint's API version and routing requests to the right handler by it — via a custom header, a URL path segment, a query parameter, or content negotiation via the Accept media type — instead of every team inventing its own convention (a path-prefix here, a header there) and wiring the routing logic by hand in each service.",
            "@RequestMapping-family annotations gained a version attribute, and a WebMvcConfigurer callback configures how the version is resolved from the incoming request and what the default is when none is specified. This is purely a routing mechanism, not a substitute for actually designing backward-compatible DTOs or a deprecation strategy — it decides which handler method receives a request, not how you keep old clients working."
          ],
          code: [{ lang: "java", caption: "Configuring how the version is resolved, then routing by it on individual handlers", src:
`@Configuration
class ApiVersionConfig implements WebMvcConfigurer {
    @Override
    public void configureApiVersioning(ApiVersionConfigurer configurer) {
        configurer.useRequestHeader("X-API-Version")
            .setDefaultVersion("1");
    }
}

@RestController
@RequestMapping("/orders")
class OrderController {

    @GetMapping(value = "/{id}", version = "1")
    OrderDtoV1 getOrderV1(@PathVariable String id) { ... }

    @GetMapping(value = "/{id}", version = "2")
    OrderDtoV2 getOrderV2(@PathVariable String id) { ... }
}` }],
          tricks: [
            "This is purely a ROUTING mechanism — it solves 'which handler method receives this request,' not the harder problem of designing backward-compatible DTOs, deprecation timelines, or sunset headers; don't let the framework feature substitute for an actual API evolution strategy in your answer.",
            "A reasonable follow-up is 'would you version at the gateway or in the service itself' — the honest answer is it depends on whether the version needs to route to entirely different service deployments (an API gateway, spring-11) versus different handler methods within one deployment (this feature)."
          ]
        }}
    ]}
  ]
};
