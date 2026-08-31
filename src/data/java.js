export default {
  key: "java", label: "Java (8 → Latest)", icon: "☕", color: "#f89820",
  desc: "Java 8 through Java 26 (the latest release as of Aug 2026), organized the way interviewers actually ask about it: what shipped, why it mattered, and the gotchas that separate someone who used a feature from someone who understands it. Every item now has a full Deep Dive — explanation, runnable code example, diagram where useful, and interview tricks.",
  sections: [
    { name: "Java 8 (2014) — still the interview baseline", items: [
      { id: "j8-1", t: "Lambda Expressions & Functional Interfaces", d: "Medium",
        desc: "Passing behavior as data via single-abstract-method interfaces.",
        notes: {
          explain: [
            "A lambda is just an inline implementation of a functional interface — an interface with exactly one abstract method (default/static methods don't count). The compiler figures out which functional interface you mean from context (assignment target, parameter type, return type) — this is called target typing, and it's why the same lambda `x -> x * 2` can be a Function<Integer,Integer> in one place and an IntUnaryOperator in another.",
            "Lambdas are not syntactic sugar for anonymous inner classes. javac compiles the lambda body into a private method and emits an invokedynamic call site; the actual functional interface implementation is generated at runtime by LambdaMetafactory the first time that call site executes. This avoids generating a .class file per lambda and lets the JVM optimize more aggressively than it can with anonymous classes.",
            "Custom functional interfaces are common in real codebases — anything with exactly one abstract method qualifies, and @FunctionalInterface is an optional compiler-enforced annotation that catches accidental additions of a second abstract method."
          ],
          code: [{ lang: "java", caption: "Target typing: the same lambda literal, three different inferred types", src:
`// Built-in functional interfaces
Function<Integer, Integer> doubleIt = x -> x * 2;
Predicate<String> isBlank = s -> s.trim().isEmpty();
Supplier<List<String>> newList = ArrayList::new;
Consumer<String> print = System.out::println;

// A custom functional interface — nothing special about java.util.function
@FunctionalInterface
interface Validator<T> {
    boolean isValid(T input);
}
Validator<String> nonEmpty = s -> s != null && !s.isBlank();

// Anonymous class vs lambda: "this" means something different
class Handler {
    void run() {
        Runnable asLambda = () -> System.out.println(this);       // outer Handler instance
        Runnable asAnon = new Runnable() {
            public void run() { System.out.println(this); }        // the anonymous Runnable itself
        };
    }
}` }],
          tricks: [
            "Be ready to explain why a lambda shares `this` with its enclosing scope while an anonymous class gets its own `this` — this trips people up when a lambda is written inside a class expecting to reference an outer instance method.",
            "Know the 4 core interfaces from java.util.function cold: Function<T,R>, Predicate<T>, Supplier<T>, Consumer<T> — and their Bi- and primitive-specialized variants (IntPredicate, ToIntFunction, etc.) which exist purely to avoid autoboxing overhead.",
            "Effectively final capture: a lambda can only close over local variables that are final or never reassigned after initialization. Interviewers ask 'why' — it's because the lambda may outlive the stack frame it was created in (e.g., passed to another thread), so Java captures by value, and mutation would create a correctness illusion.",
            "A lambda body can be a single expression or a block `{ }` with an explicit return — a common trick question is 'can a lambda contain multiple statements or throw a checked exception?' (yes to multiple statements; checked exceptions are only allowed if the functional interface's method declares them)."
          ]
        }},
      { id: "j8-2", t: "Stream API & Lazy Pipelines", d: "Hard",
        desc: "Declarative bulk data operations built on lazy, composable pipelines.",
        notes: {
          explain: [
            "A stream pipeline has three parts: a source (collection, array, generator), zero or more intermediate operations (filter, map, sorted...) which are lazy and only describe work, and exactly one terminal operation (collect, forEach, reduce...) which actually triggers execution. Nothing runs until the terminal operation is called — this is why you can build a pipeline of filters and maps with no performance cost until you actually consume it.",
            "Intermediate operations are either stateless (filter, map — process each element independently) or stateful (sorted, distinct — need to see the whole stream before producing output). This distinction matters for parallel streams: stateful operations often force a full barrier/merge step that limits parallelism gains."
          ],
          code: [{ lang: "java", caption: "A typical pipeline — filter, map, sort, collect", src:
`List<String> topSenderEmails = orders.stream()
    .filter(o -> o.getStatus() == Status.SHIPPED)
    .map(Order::getCustomerEmail)
    .distinct()
    .sorted()
    .limit(10)
    .collect(Collectors.toList());

// Grouping + downstream collector — very commonly asked
Map<Status, Long> countByStatus = orders.stream()
    .collect(Collectors.groupingBy(Order::getStatus, Collectors.counting()));

// A stream can only be consumed ONCE
Stream<String> s = names.stream();
s.forEach(System.out::println);
s.forEach(System.out::println); // throws IllegalStateException: stream has already been operated upon` }],
          diagram: { type: "flow", caption: "Nothing executes until collect() is called — filter/map just build a lazy pipeline description.",
            steps: [
              { label: "Source", note: "List/array/Stream.of" },
              { label: "filter()", note: "lazy, stateless", arrowLabel: "lazy" },
              { label: "map()", note: "lazy, stateless", arrowLabel: "lazy" },
              { label: "sorted()", note: "lazy, stateful", arrowLabel: "lazy" },
              { label: "collect()", note: "terminal — runs it all now", arrowLabel: "triggers" }
            ]},
          tricks: [
            "A stream can only be consumed once — calling a terminal operation twice on the same stream throws IllegalStateException. This is a favorite gotcha question.",
            "Short-circuiting: operations like findFirst, anyMatch, and limit can stop processing early even on an infinite stream (Stream.iterate) — know why `Stream.iterate(1, n -> n+1).filter(n -> n > 5).findFirst()` terminates.",
            "parallelStream() uses the common ForkJoinPool by default — sharing it with other parallel work (including CompletableFuture) is a classic production bug. Also: parallel streams with shared mutable state (e.g., writing to an ArrayList inside forEach) are a data-race trap interviewers love to probe.",
            "collect(Collectors.toMap(...)) throws IllegalStateException on duplicate keys unless you supply a merge function — a common runtime surprise."
          ]
        }},
      { id: "j8-3", t: "Optional<T>", d: "Medium",
        desc: "An explicit container type for 'value might be absent', replacing ad-hoc null checks.",
        notes: {
          explain: ["Optional exists to make 'this might not have a value' visible in a method's return type instead of buried in documentation. It's designed for return types — using it as a field type, constructor parameter, or method parameter is considered an anti-pattern by its own designers (Brian Goetz), because it adds an allocation and a null-check burden without the type-safety benefit."],
          code: [{ lang: "java", caption: "Idiomatic Optional — chained, not unwrapped-and-checked", src:
`// Anti-pattern: isPresent()+get() is just a null check with extra steps
Optional<User> maybe = repo.findById(id);
if (maybe.isPresent()) {
    return maybe.get().getEmail();
} else {
    throw new NotFoundException();
}

// Idiomatic: chain through map/orElseThrow
return repo.findById(id)
    .map(User::getEmail)
    .orElseThrow(() -> new NotFoundException("user " + id));

// orElse vs orElseGet — orElse ALWAYS evaluates its argument eagerly
String a = maybe.map(User::getName).orElse(expensiveDefault());     // expensiveDefault() always runs
String b = maybe.map(User::getName).orElseGet(() -> expensiveDefault()); // runs only if empty` }],
          tricks: [
            "orElse(x) always evaluates x eagerly (even if the Optional is present), while orElseGet(supplier) only evaluates the supplier when needed — a common performance/side-effect gotcha when x is an expensive call.",
            "isPresent() + get() is considered an anti-pattern equivalent to a null check; interviewers want to see map/filter/ifPresent/orElseThrow used instead.",
            "Optional.of(null) throws NPE immediately; Optional.ofNullable(null) returns Optional.empty() — mixing these up is a classic bug."
          ]
        }},
      { id: "j8-4", t: "Default & Static Methods in Interfaces", d: "Easy",
        desc: "Interfaces can now ship behavior, not just contracts — this is what let Collection retrofit stream() without breaking every implementer.",
        notes: {
          explain: ["Before Java 8, adding a method to an interface broke every existing implementation. Default methods solved this: an interface can provide a body, and implementers inherit it unless they override it. This is precisely the mechanism that let JDK 8 add stream(), forEach(), and removeIf() to the existing Collection interface without breaking the world."],
          code: [{ lang: "java", caption: "The diamond problem — must be resolved explicitly", src:
`interface Flyer { default String move() { return "flying"; } }
interface Swimmer { default String move() { return "swimming"; } }

// Compile error unless you override move() explicitly:
class Duck implements Flyer, Swimmer {
    @Override
    public String move() {
        return Flyer.super.move() + " or " + Swimmer.super.move();
    }
}` }],
          tricks: ["Diamond problem: if a class implements two interfaces with the same default method signature, it must override the method explicitly (or the compiler flags an error) — know the 'most specific interface wins' resolution rule and when it doesn't apply.", "A class always wins over an interface default — if a superclass defines a method with the same signature, the default method is never even considered."]
        }},
      { id: "j8-5", t: "java.time — the new Date/Time API", d: "Medium",
        desc: "Immutable, thread-safe replacement for the notoriously broken java.util.Date/Calendar.",
        notes: {
          explain: ["java.util.Date and Calendar were mutable, not thread-safe, and had a famously confusing API (months 0-indexed, years offset from 1900). java.time (JSR-310, heavily influenced by Joda-Time) replaced them with immutable value types: LocalDate/LocalTime/LocalDateTime for calendar-only concepts, Instant for a machine timestamp, and ZonedDateTime when timezone matters."],
          code: [{ lang: "java", caption: "Instant vs LocalDateTime vs ZonedDateTime — the classic interview trio", src:
`Instant now = Instant.now();                          // UTC timeline point, no timezone
LocalDateTime wall = LocalDateTime.now();              // "2026-08-22T14:30" — means nothing without a zone
ZonedDateTime zoned = ZonedDateTime.now(ZoneId.of("America/Vancouver"));

// BUG pattern seen in real systems: storing LocalDateTime for a distributed event timestamp
// — it silently means different real moments depending on which server's clock/zone wrote it.
public record OrderEvent(String orderId, Instant occurredAt) {} // correct: Instant for a fact-in-time

// Immutability: every "mutator" returns a NEW instance
LocalDate today = LocalDate.now();
today.plusDays(7);              // BUG: return value discarded, today is unchanged
LocalDate nextWeek = today.plusDays(7); // correct` }],
          tricks: ["Classic interview question: 'what's the difference between Instant, LocalDateTime, and ZonedDateTime?' — Instant is a point on the UTC timeline (no timezone), LocalDateTime is timezone-agnostic wall-clock time (no real-world meaning until you attach a zone), ZonedDateTime is both. Storing timestamps as LocalDateTime in a distributed system is a common production bug.", "All java.time types are immutable — every 'mutator' method (plusDays, withYear...) returns a new instance. Forgetting to capture the return value is a frequent bug for people used to mutable Calendar."]
        }},
      { id: "j8-6", t: "CompletableFuture & Async Composition", d: "Hard",
        desc: "Composable async pipelines — the foundation most reactive/async Java code still builds on.",
        notes: {
          explain: ["CompletableFuture lets you chain async computation stages instead of nesting callbacks. supplyAsync starts work on a thread pool (the common ForkJoinPool by default, or one you supply); thenApply/thenCompose/thenCombine chain further stages; exceptionally/handle deal with failures."],
          code: [{ lang: "java", caption: "thenApply vs thenCompose, and an explicit Executor to avoid the shared common pool", src:
`Executor ioPool = Executors.newFixedThreadPool(16);

CompletableFuture<UserProfile> pipeline = CompletableFuture
    .supplyAsync(() -> fetchUser(id), ioPool)
    .thenApply(User::getProfileId)                 // sync transform: T -> R
    .thenCompose(profileId -> fetchProfileAsync(profileId)) // T -> CompletableFuture<R>, avoids nesting
    .exceptionally(ex -> UserProfile.empty())
    .orTimeout(3, TimeUnit.SECONDS);

UserProfile result = pipeline.join(); // unchecked CompletionException on failure

// Fan-out / fan-in: run three calls in parallel, combine results
CompletableFuture<Price> a = CompletableFuture.supplyAsync(() -> priceServiceA.get(sku), ioPool);
CompletableFuture<Price> b = CompletableFuture.supplyAsync(() -> priceServiceB.get(sku), ioPool);
CompletableFuture<Price> cheapest = a.thenCombine(b, (p1, p2) -> p1.value() < p2.value() ? p1 : p2);` }],
          diagram: { type: "flow", caption: "thenApply transforms the value in place; thenCompose flattens a stage that itself returns a CompletableFuture (avoids CompletableFuture<CompletableFuture<T>>).",
            steps: [
              { label: "supplyAsync()", note: "runs on ForkJoinPool.commonPool() by default" },
              { label: "thenApply()", note: "sync transform, like map", arrowLabel: "→" },
              { label: "thenCompose()", note: "chain another async call, like flatMap", arrowLabel: "→" },
              { label: "join()/get()", note: "block for the result", arrowLabel: "→" }
            ]},
          tricks: [
            "thenApply vs thenCompose is the Stream map-vs-flatMap analogy: use thenCompose when your callback itself returns a CompletableFuture, or you'll end up with a nested future.",
            "Without specifying an Executor, callbacks run on the common ForkJoinPool, which is shared JVM-wide — a slow callback (e.g., blocking I/O) here can starve unrelated parallel streams elsewhere in the app. Production code should pass an explicit Executor.",
            "join() throws an unchecked CompletionException, get() throws checked ExecutionException — a subtle but real difference interviewers check for."
          ]
        }}
    ]},
    { name: "Java 9–10 (2017–2018) — modularity and cleanup", items: [
      { id: "j9-1", t: "Module System (Project Jigsaw)", d: "Hard",
        desc: "Strong encapsulation at the JAR level via module-info.java — the biggest structural change to the platform since generics.",
        notes: {
          explain: ["Before modules, every public class on the classpath was accessible to every other class — 'JAR hell' had no real encapsulation boundary. A module declares its name, what packages it exports (visible to others), and what modules it requires in a module-info.java file. Anything not explicitly exported is invisible outside the module, even if the class is public.",
            "This is also what enabled a much smaller JDK footprint via jlink — you can assemble a custom runtime image containing only the modules your application actually needs."],
          code: [{ lang: "java", caption: "A minimal module-info.java", src:
`module com.myapp.orders {
    requires java.sql;
    requires com.myapp.common;

    exports com.myapp.orders.api;       // visible to other modules
    // com.myapp.orders.internal is NOT exported — invisible outside this module
    // even though its classes are marked public.

    provides com.myapp.orders.api.OrderValidator
        with com.myapp.orders.internal.DefaultOrderValidator; // service provider
}` }],
          diagram: { type: "tree", root: "my.app (module)", caption: "requires = compile/runtime dependency; exports = what's visible to other modules.",
            children: [
              { label: "requires java.base (implicit, always)" },
              { label: "requires java.sql" },
              { label: "exports com.myapp.api  (public to consumers)" },
              { label: "com.myapp.internal — NOT exported, invisible outside module even if classes are public" }
            ]},
          tricks: ["The classic gotcha: a public class in a non-exported package is still inaccessible outside the module — 'public' stops meaning what it used to mean once modules are involved.", "Most real-world backend codebases still run on the classpath (unnamed module) rather than adopting the module system fully — know that Jigsaw's practical legacy is mostly the smaller JDK internals encapsulation (JEP 260) rather than widespread app-level adoption, which is itself a good interview talking point about real-world tech adoption vs. spec ambition."]
        }},
      { id: "j9-2", t: "JShell — the Java REPL", d: "Easy", desc: "Interactive shell for trying snippets without a full project — useful for quickly validating a language feature during an interview or design discussion.",
        notes: {
          code: [{ lang: "bash", caption: "No project, no build file — just try it", src:
`$ jshell
jshell> var nums = List.of(3, 1, 4, 1, 5);
nums ==> [3, 1, 4, 1, 5]

jshell> nums.stream().distinct().sorted().toList();
$2 ==> [1, 3, 4, 5]

jshell> /exit` }],
          tricks: ["JShell auto-imports common packages (java.util, java.io, etc.) and lets you redefine a variable without restarting — genuinely useful for quickly checking 'does this API do what I think it does' mid-interview."]
        }},
      { id: "j9-3", t: "Immutable Collection Factories: List.of/Set.of/Map.of", d: "Easy",
        desc: "Compact, genuinely immutable collection literals.",
        notes: {
          explain: ["List.of(...), Set.of(...), and Map.of(...) create truly immutable collections in one line, distinct from Collections.unmodifiableList(list), which just wraps a still-mutable backing list (so someone with a reference to the original can still mutate it out from under you)."],
          code: [{ lang: "java", caption: "Truly immutable vs merely wrapped", src:
`List<String> a = List.of("x", "y");
a.add("z"); // UnsupportedOperationException

List<String> backing = new ArrayList<>(List.of("x", "y"));
List<String> b = Collections.unmodifiableList(backing);
backing.add("z");        // legal!
System.out.println(b);   // [x, y, z] — the "unmodifiable" view just changed

List.of("a", null);      // throws NullPointerException — List.of rejects nulls
Map.of("k", 1, "k", 2);  // throws IllegalArgumentException — duplicate key rejected at creation` }],
          tricks: ["List.of() rejects null elements (throws NPE), unlike ArrayList which happily stores null — a common migration surprise.", "Set.of()/Map.of() throw IllegalArgumentException on duplicate elements/keys at creation time, rather than silently deduplicating."]
        }},
      { id: "j9-4", t: "Private Interface Methods", d: "Easy", desc: "Interfaces can share code between default methods without exposing it — completes the Java 8 default-method story.",
        notes: {
          code: [{ lang: "java", caption: "Shared helper logic between two default methods, hidden from implementers", src:
`interface Validator {
    default boolean isValidEmail(String s) { return commonCheck(s) && s.contains("@"); }
    default boolean isValidUsername(String s) { return commonCheck(s) && s.length() >= 3; }

    private boolean commonCheck(String s) { // not visible to implementers, not part of the API
        return s != null && !s.isBlank();
    }
}` }]
      }},
      { id: "j9-5", t: "var for Local Variables (Java 10)", d: "Easy",
        desc: "Local-variable type inference — not dynamic typing.",
        notes: {
          code: [{ lang: "java", caption: "var infers a fixed concrete type at compile time", src:
`var list = new ArrayList<String>();  // inferred as ArrayList<String>, not Object or dynamic
list.add("ok");
list.add(42); // compile error — list is still statically ArrayList<String>

var x;              // compile error — no initializer to infer from
var y = null;        // compile error — can't infer a type from null alone` }],
          tricks: ["var is resolved to a concrete type at compile time from the initializer — it is NOT dynamic typing, and the variable's type can never change. A favorite trick question: 'can you write `var x;` with no initializer?' — no, the compiler needs the initializer to infer the type.", "var cannot be used for fields, method parameters (until Java 11's lambda params), or return types — only local variables."]
        }}
    ]},
    { name: "Java 11 (2018 LTS)", items: [
      { id: "j11-1", t: "var in Lambda Parameters", d: "Easy", desc: "Lets you attach annotations to inferred-type lambda parameters, e.g. (@NonNull var x) -> ...",
        notes: {
          code: [{ lang: "java", caption: "Only useful when you need an annotation on the parameter", src:
`list.stream()
    .map((@NonNull var s) -> s.trim())
    .toList();

// Without an annotation, plain (s) -> s.trim() is simpler and preferred.` }]
        }},
      { id: "j11-2", t: "New HTTP Client (standardized)", d: "Medium",
        desc: "Built-in async-capable HTTP/2 client, replacing the ancient HttpURLConnection.",
        notes: {
          code: [{ lang: "java", caption: "Sync and async, in a few lines", src:
`HttpClient client = HttpClient.newHttpClient();

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/orders/123"))
    .timeout(Duration.ofSeconds(5))
    .GET()
    .build();

// Synchronous
HttpResponse<String> resp = client.send(request, HttpResponse.BodyHandlers.ofString());

// Asynchronous — composes naturally with CompletableFuture
client.sendAsync(request, HttpResponse.BodyHandlers.ofString())
    .thenApply(HttpResponse::body)
    .thenAccept(System.out::println);` }],
          diagram: { type: "compare", caption: "The old client is still there for compatibility — new code should always use java.net.http.HttpClient.",
            columns: [
              { title: "HttpURLConnection (pre-11)", points: ["HTTP/1.1 only", "Blocking only — no async API", "Verbose, low-level, easy to misuse (e.g. forgetting to close streams)"] },
              { title: "HttpClient (Java 11+)", points: ["HTTP/2 by default with HTTP/1.1 fallback", "Both sync (send) and async (sendAsync returning CompletableFuture) APIs", "Built-in WebSocket support"] }
            ]},
          tricks: ["sendAsync returns a CompletableFuture<HttpResponse<T>> — a natural interview bridge back to the CompletableFuture composition topic."]
        }},
      { id: "j11-3", t: "New String Methods: isBlank/strip/repeat/lines", d: "Easy",
        desc: "Small but frequently tested ergonomic additions.",
        notes: {
          code: [{ lang: "java", caption: "strip() is Unicode-aware; trim() is not", src:
`"  hi  ".strip();       // "hi" — Unicode-aware whitespace removal
"\\u00A0hi".trim();      // "\\u00A0hi" — trim() does NOT remove non-breaking space (U+00A0)
"\\u00A0hi".strip();     // "hi" — strip() does

"ok".isBlank();          // false
"   ".isBlank();         // true
"ab".repeat(3);           // "ababab"
"a\\nb\\nc".lines().count(); // 3` }],
          tricks: ["strip() vs trim(): strip() is Unicode-aware whitespace removal (uses Character.isWhitespace), trim() only removes characters ≤ U+0020 — strip() is the technically correct choice for non-ASCII input."]
        }},
      { id: "j11-4", t: "Files.readString/writeString + Single-File Source Execution", d: "Easy", desc: "`java Hello.java` runs a source file directly without a separate javac step — handy for scripts and quick demonstrations.",
        notes: {
          code: [{ lang: "java", caption: "One-liner file I/O, and a script you can run with `java Hello.java`", src:
`String content = Files.readString(Path.of("config.json"));
Files.writeString(Path.of("out.txt"), "done", StandardOpenOption.CREATE);

// Hello.java — no javac needed:
// $ java Hello.java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, " + args.length + " args");
    }
}` }]
      }},
      { id: "j11-5", t: "Removal of Java EE & CORBA Modules", d: "Easy", desc: "JAXB, JAX-WS, etc. were removed from the JDK — a classic 'why did my upgrade break' migration story worth knowing if asked about upgrade pain.",
        notes: {
          code: [{ lang: "bash", caption: "The typical Java 8 → 11 migration fix", src:
`# NoClassDefFoundError: javax/xml/bind/JAXBException after upgrading to 11
# Fix: add the dependency explicitly — it's no longer bundled with the JDK
# Maven:
#   <dependency>
#     <groupId>jakarta.xml.bind</groupId>
#     <artifactId>jakarta.xml.bind-api</artifactId>
#   </dependency>` }]
        }},
      { id: "j11-6", t: "Flight Recorder Open-Sourced", d: "Easy", desc: "JFR became free for production use in 11 — directly relevant to your Dynatrace/observability background; worth connecting to your own production monitoring stack in an interview.",
        notes: {
          code: [{ lang: "bash", caption: "Capture a low-overhead production profile with zero code changes", src:
`# Attach to a running JVM for 60 seconds, low overhead (~1%), safe for production
jcmd <pid> JFR.start duration=60s filename=recording.jfr

# Or enable at startup
java -XX:StartFlightRecording=duration=60s,filename=recording.jfr -jar app.jar` }]
        }}
    ]},
    { name: "Java 12–16 (2019–2021) — syntax modernization", items: [
      { id: "j12-1", t: "Switch Expressions (standardized in 14)", d: "Medium",
        desc: "switch as an expression that returns a value, with arrow syntax and no fall-through.",
        notes: {
          code: [{ lang: "java", caption: "yield for multi-statement branches; exhaustiveness on sealed/enum types", src:
`// Old: fall-through statement, easy to forget break
String size;
switch (day) {
    case MONDAY:
    case TUESDAY:
        size = "small"; break;
    default:
        size = "large"; break;
}

// New: expression, no fall-through, compiler-checked exhaustiveness for enums
String size2 = switch (day) {
    case MONDAY, TUESDAY -> "small";
    case WEDNESDAY -> {
        log.info("midweek");
        yield "medium";           // yield returns a value from a block branch
    }
    default -> "large";
};` }],
          diagram: { type: "compare", caption: "yield is used for multi-statement arrow branches; single expressions don't need it.",
            columns: [
              { title: "Old switch statement", points: ["Falls through by default — needs explicit break", "Cannot be used as an expression", "Easy to forget a break and silently fall into the next case"] },
              { title: "New switch expression (14+)", points: ["Arrow syntax: case X -> ...  no fall-through", "Can be assigned directly: var x = switch(...) { ... }", "Compiler enforces exhaustiveness for enums/sealed types"] }
            ]},
          tricks: ["yield is the keyword used to return a value from a multi-statement arrow branch (`case X -> { ...; yield val; }`) — a name people blank on in interviews.", "Exhaustiveness checking on sealed types/enums is what makes switch expressions genuinely safer than the old statement, not just shorter."]
        }},
      { id: "j12-2", t: "Text Blocks (standardized in 15)", d: "Easy", desc: "Multi-line string literals with \"\"\" delimiters — removes the need for manual \\n and string concatenation for JSON/SQL snippets.",
        notes: {
          code: [{ lang: "java", caption: "No more \\n and + concatenation for embedded JSON/SQL", src:
`String json = """
    {
      "name": "%s",
      "status": "%s"
    }
    """.formatted(name, status);

String sql = """
    SELECT o.id, o.status
    FROM orders o
    WHERE o.user_id = ?
      AND o.status = 'SHIPPED'
    """;
// Incidental whitespace (common leading indentation) is stripped automatically` }],
          tricks: ["The compiler strips the minimum common leading whitespace across all lines automatically — indenting the closing \"\"\" controls how much gets stripped, a detail worth knowing if asked to predict output."]
        }},
      { id: "j12-3", t: "Helpful NullPointerExceptions", d: "Easy", desc: "On by default since Java 15 — the JVM now tells you exactly which variable in a chained call (a.b().c.d) was null, instead of just 'NullPointerException'. Genuinely changes day-to-day debugging.",
        notes: {
          code: [{ lang: "java", caption: "Before vs after — same bug, radically different diagnostic", src:
`order.getCustomer().getAddress().getZipCode();

// Old message:
//   java.lang.NullPointerException
// New message (Java 15+, on by default):
//   Cannot invoke "Address.getZipCode()" because the return value of
//   "Customer.getAddress()" is null` }]
        }},
      { id: "j12-4", t: "Records (standardized in 16)", d: "Hard",
        desc: "Compact, immutable data carriers with auto-generated constructor, accessors, equals/hashCode/toString.",
        notes: {
          explain: ["A record declares its state once — `record Point(int x, int y) {}` — and the compiler generates a canonical constructor, accessor methods (x(), not getX()), and value-based equals/hashCode/toString. It's meant for the 'plain data carrier' role that used to require 40+ lines of Lombok or IDE-generated boilerplate.",
            "Records are implicitly final and cannot extend another class (they implicitly extend Record), but they can implement interfaces — this is a deliberate design constraint to keep them as pure data shapes."],
          code: [{ lang: "java", caption: "A compact constructor adds validation without restating field assignment", src:
`record Point(int x, int y) {
    // Compact constructor: validate/normalize, no need to write "this.x = x"
    public Point {
        if (x < 0 || y < 0) throw new IllegalArgumentException("negative coordinate");
    }

    // Extra methods are fine — extra INSTANCE FIELDS are not allowed
    double distanceFromOrigin() { return Math.sqrt(x * x + y * y); }

    static Point origin() { return new Point(0, 0); } // static members allowed too
}

Point p = new Point(3, 4);
p.x();                 // accessor is x(), NOT getX()
p.equals(new Point(3, 4)); // true — value-based equality, generated for you
System.out.println(p);     // Point[x=3, y=4] — generated toString()` }],
          diagram: { type: "compare",
            columns: [
              { title: "Traditional POJO", points: ["Private fields + manual getters", "Manual equals/hashCode/toString (or Lombok)", "Mutable unless you're disciplined", "~30-40 lines for a 2-field class"] },
              { title: "record Point(int x, int y) {}", points: ["1 line — fields, constructor, accessors, equals/hashCode/toString all generated", "Implicitly final and immutable", "Compact constructor lets you add validation without repeating the field list"] }
            ]},
          tricks: [
            "A compact constructor (`record Point(int x,int y){ public Point { if(x<0) throw ... } }`) lets you validate/normalize fields without restating the assignment — the field assignments happen implicitly after the compact constructor body runs.",
            "Records generate accessors named x()/y(), NOT getX()/getY() — a subtle break from JavaBean convention that trips up frameworks expecting getters (Jackson handles this fine since 2.12+, but older reflection-based code may not).",
            "You can add extra methods and static fields to a record body, but you cannot add extra instance fields beyond the record header — that's the whole point of the immutable 'shape' guarantee."
          ]
        }},
      { id: "j12-5", t: "Pattern Matching for instanceof (standardized in 16)", d: "Medium",
        desc: "Combines the type check and the cast into one expression.",
        notes: {
          code: [{ lang: "java", caption: "Scope follows flow analysis, not just the if-block", src:
`// Old
if (obj instanceof String) {
    String s = (String) obj;
    System.out.println(s.length());
}

// New — type check + cast + bind in one step
if (obj instanceof String s) {
    System.out.println(s.length());
}

// Flow-scoping: this compiles because the compiler can prove
// s is only reachable when the instanceof was true
if (!(obj instanceof String s)) {
    return;
}
System.out.println(s.length()); // s is in scope here` }],
          diagram: { type: "flow", steps: [
            { label: "if (obj instanceof String s)", note: "type check + cast + bind, one step" },
            { label: "use s directly", note: "no manual cast needed", arrowLabel: "in scope" }
          ]},
          tricks: ["The pattern variable's scope follows flow analysis, not just the if-block — `if (!(obj instanceof String s)) return; use(s);` is legal because the compiler can prove s is only reachable when the instanceof was true."]
        }}
    ]},
    { name: "Java 17 (2021 LTS)", items: [
      { id: "j17-1", t: "Sealed Classes & Interfaces (standardized)", d: "Hard",
        desc: "A type declares exactly which classes are allowed to extend/implement it — exhaustive, closed hierarchies.",
        notes: {
          explain: ["`sealed interface Shape permits Circle, Square, Triangle {}` restricts extension to a known, closed set of subtypes listed in `permits` (or in the same file/module, depending on layout). Combined with pattern matching for switch, the compiler can prove a switch over a sealed type handles every case — no default branch needed, and adding a new subtype becomes a compile error everywhere it isn't handled."],
          code: [{ lang: "java", caption: "Every permitted subtype must declare final, sealed, or non-sealed", src:
`sealed interface Shape permits Circle, Square, Triangle {}

final class Circle implements Shape { double radius; }
final class Square implements Shape { double side; }
non-sealed class Triangle implements Shape { double base, height; } // reopens the hierarchy

// Compiler catches this at COMPILE TIME if you add a 4th shape but forget a case:
double area(Shape s) {
    return switch (s) {
        case Circle c -> Math.PI * c.radius * c.radius;
        case Square sq -> sq.side * sq.side;
        case Triangle t -> 0.5 * t.base * t.height;
        // no default needed — compiler proved this is exhaustive
    };
}` }],
          diagram: { type: "tree", root: "sealed interface Shape", caption: "Every permitted subtype must be final, sealed, or non-sealed — no silent 4th implementer can sneak in.",
            children: [
              { label: "final class Circle implements Shape" },
              { label: "final class Square implements Shape" },
              { label: "non-sealed class Triangle implements Shape  (reopens the hierarchy — permits further extension)" }
            ]},
          tricks: [
            "This is the direct answer to 'why not just use an enum or a regular interface?' — enums can't hold heterogeneous per-case state well, and regular interfaces can be implemented by anyone, breaking exhaustiveness guarantees. Sealed types give you algebraic-data-type-style modeling in Java.",
            "Every permitted subclass must itself declare final, sealed, or non-sealed — this is mandatory and a common compile-error trap for people new to the feature.",
            "Pairs directly with switch pattern matching (Java 21) for exhaustive, default-free switches — a strong combo to mention together in interviews."
          ]
        }},
      { id: "j17-2", t: "Strong Encapsulation of JDK Internals by Default", d: "Medium", desc: "sun.misc.Unsafe-style reflective access to internal JDK classes is blocked by default (not just warned) — a real migration pain point for older libraries (some ORMs, some monitoring agents) relying on deep reflection.",
        notes: {
          code: [{ lang: "bash", caption: "The typical fix when an old library breaks on 17", src:
`# java.lang.reflect.InaccessibleObjectException: Unable to make field
# private final byte[] java.lang.String.value accessible
# Fix (workaround, not a long-term solution): explicitly open the module
java --add-opens java.base/java.lang=ALL-UNNAMED -jar legacy-app.jar` }]
        }},
      { id: "j17-3", t: "Pattern Matching for switch (Preview, standardized in 21)", d: "Medium", desc: "First preview of type-pattern switch cases — the feature that, combined with sealed classes, lets a switch be both concise and exhaustive. Fully covered under the Java 21 entry where it became standard." },
      { id: "j17-4", t: "Foreign Function & Memory API (Incubator)", d: "Medium",
        desc: "The long-term replacement for JNI — lets Java code call native libraries and manage off-heap memory safely, without writing C glue code. Finalized in Java 22.",
        notes: {
          code: [{ lang: "java", caption: "Calling a native C function without writing any JNI glue code", src:
`// Call the C standard library's strlen() directly from Java (finalized API, Java 22+)
Linker linker = Linker.nativeLinker();
SymbolLookup stdlib = linker.defaultLookup();
MethodHandle strlen = linker.downcallHandle(
    stdlib.find("strlen").get(),
    FunctionDescriptor.of(ValueLayout.JAVA_LONG, ValueLayout.ADDRESS));

try (Arena arena = Arena.ofConfined()) {
    MemorySegment cString = arena.allocateUtf8String("hello");
    long len = (long) strlen.invoke(cString); // 5, no JNI required
}` }]
        }}
    ]},
    { name: "Java 18–20 (2022–2023) — Loom and pattern matching mature", items: [
      { id: "j18-1", t: "UTF-8 by Default", d: "Easy", desc: "Java 18 made UTF-8 the default charset everywhere (previously it was platform-dependent) — fixes a whole class of 'works on my machine' encoding bugs.",
        notes: { code: [{ lang: "java", caption: "Before 18, this depended on the OS's default charset", src:
`// Pre-18: on a Windows box with a non-UTF-8 default locale, this could
// silently mangle non-ASCII characters. Java 18+: always UTF-8 unless overridden.
Files.readString(path);
new String(bytes);
new FileReader(file);` }] } },
      { id: "j18-2", t: "Simple Web Server (jwebserver)", d: "Easy", desc: "A one-command static file server built into the JDK — useful for quickly serving local docs/build output without spinning up nginx.",
        notes: { code: [{ lang: "bash", caption: "One command, no dependencies", src: `jwebserver -p 8000 -d ./dist` }] } },
      { id: "j18-3", t: "Virtual Threads (Preview)", d: "Hard", desc: "First previewed in Java 19/20 as part of Project Loom. Fully covered under the Java 21 entry where it became standard — that's where the interview-critical detail lives." },
      { id: "j18-4", t: "Record Patterns (Preview)", d: "Medium", desc: "Lets you destructure a record directly in a pattern (`case Point(int x, int y) -> ...`), previewed in 19/20, standardized in 21." },
      { id: "j18-5", t: "Structured Concurrency (Incubator)", d: "Hard", desc: "Treats a group of related async tasks as a single unit of work with one lifetime. Kept previewing through 21–25 and finally standardized in Java 26 — see that entry for the full picture." }
    ]},
    { name: "Java 21 (2023 LTS) — the big one", items: [
      { id: "j21-1", t: "Virtual Threads — Standardized", d: "Hard",
        desc: "Lightweight, JVM-managed threads that make blocking code cheap at massive scale — arguably the most consequential Java change since generics.",
        notes: {
          explain: ["A platform thread maps 1:1 to an OS thread — expensive to create (roughly 1MB of stack) and limited to a few thousand per JVM before you exhaust memory/scheduler capacity. A virtual thread is a lightweight thread scheduled by the JVM itself onto a small pool of platform 'carrier' threads. When a virtual thread blocks on I/O (a JDBC call, an HTTP call, anything using java.util.concurrent-aware blocking), the JVM unmounts it from its carrier thread and mounts another virtual thread — the carrier thread is never idle waiting.",
            "The practical upshot for a backend engineer: you can write plain old blocking, synchronous code (no reactive/WebFlux complexity) and still get massive concurrency — one virtual thread per request, millions of them, at a fraction of the memory cost of platform threads."],
          code: [{ lang: "java", caption: "One virtual thread per task — millions are fine", src:
`// Old way: bounded platform-thread pool, thousands is already pushing it
ExecutorService platformPool = Executors.newFixedThreadPool(200);

// New way: unbounded virtual-thread-per-task executor
try (ExecutorService vExec = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> results = new ArrayList<>();
    for (int i = 0; i < 100_000; i++) {
        int id = i;
        results.add(vExec.submit(() -> callDownstreamService(id))); // cheap, blocking is fine
    }
    for (var f : results) System.out.println(f.get());
} // executor auto-closes and joins all tasks

// Creating one directly
Thread vt = Thread.ofVirtual().start(() -> System.out.println("on a virtual thread"));
System.out.println(vt.isVirtual()); // true` }],
          diagram: { type: "compare", caption: "Virtual threads make the reactive-vs-blocking tradeoff mostly moot for I/O-bound workloads.",
            columns: [
              { title: "Platform Thread", points: ["1:1 with OS thread", "~1MB stack, expensive to create", "Practical ceiling: a few thousand concurrent threads", "Blocking a thread wastes an OS thread"] },
              { title: "Virtual Thread (Java 21+)", points: ["Many:few — millions map onto a small carrier pool", "Cheap to create (KBs, not MBs)", "Blocking unmounts it from the carrier — carrier stays free for other work", "Same Thread API — no new programming model to learn"] }
            ]},
          tricks: [
            "Virtual threads are NOT faster per-task — they don't speed up CPU-bound work at all. Their entire value is enabling massive concurrency for I/O-bound/blocking workloads. A classic interview trap is asking 'will virtual threads speed up my CPU-bound matrix multiplication?' — no.",
            "'Pinning': if a virtual thread blocks while holding a native/OS-level lock (historically `synchronized` blocks before JDK 24's fix, or during native method calls), it can't be unmounted from its carrier — it pins the carrier thread, defeating the scalability benefit. Know that JDK 24 (JEP 491) fixed most `synchronized`-caused pinning; before that, the standard advice was to replace synchronized with ReentrantLock in hot paths using virtual threads.",
            "Thread-local variables still work on virtual threads but are discouraged at scale (millions of threads × thread-locals = memory pressure) — this is exactly the problem Scoped Values (finalized in Java 25) were designed to solve.",
            "In Spring Boot 3.2+, enabling virtual threads for the embedded Tomcat/servlet container is a one-line property (`spring.threads.virtual.enabled=true`) — know this concretely since it's directly relevant to your own stack."
          ]
        }},
      { id: "j21-2", t: "Pattern Matching for switch — Standardized", d: "Hard",
        desc: "Type patterns, record patterns, and guards (`when`) in switch — combined with sealed types, this gives exhaustive, safe branching over a closed hierarchy.",
        notes: {
          code: [{ lang: "java", caption: "Type pattern + guard + nested record pattern, all in one switch", src:
`sealed interface Shape permits Circle, Rectangle {}
record Circle(double radius) implements Shape {}
record Rectangle(Point topLeft, Point bottomRight) implements Shape {}
record Point(double x, double y) {}

String describe(Shape s) {
    return switch (s) {
        case Circle c when c.radius() > 100 -> "huge circle";
        case Circle c -> "circle r=" + c.radius();
        // nested record pattern: destructure Rectangle -> two Points -> four doubles
        case Rectangle(Point(var x1, var y1), Point(var x2, var y2)) ->
            "rect area=" + Math.abs((x2 - x1) * (y2 - y1));
    };
}` }],
          diagram: { type: "flow", caption: "case Circle c when c.radius() > 100 -> ...  guards add a boolean condition on top of the type/record pattern.",
            steps: [
              { label: "switch (shape)", note: "shape: sealed Shape" },
              { label: "case Circle c", note: "type pattern", arrowLabel: "matches" },
              { label: "when c.radius()>100", note: "optional guard", arrowLabel: "AND" },
              { label: "-> ...", note: "exhaustive, no default needed for sealed types", arrowLabel: "runs" }
            ]},
          tricks: ["Combined with record patterns, you can destructure nested records in one case: `case Rectangle(Point(var x1,var y1), Point(var x2,var y2)) -> ...` — a favorite 'show me you actually used this' interview prompt."]
        }},
      { id: "j21-3", t: "Record Patterns — Standardized", d: "Medium", desc: "Destructure a record's components directly in a pattern instead of calling accessors manually — covered together with switch pattern matching above since they're almost always used in combination." },
      { id: "j21-4", t: "Sequenced Collections", d: "Easy",
        desc: "A new SequencedCollection interface giving every ordered collection getFirst/getLast/reversed() uniformly.",
        notes: {
          code: [{ lang: "java", caption: "reversed() is a live VIEW, not a copy", src:
`List<Integer> nums = new ArrayList<>(List.of(1, 2, 3));
nums.getFirst(); // 1 — uniform across List, Deque, LinkedHashSet now
nums.getLast();  // 3

List<Integer> rev = nums.reversed(); // [3, 2, 1] — a LIVE VIEW
nums.add(4);
System.out.println(rev); // [4, 3, 2, 1] — reflects the mutation, it's not a snapshot` }],
          diagram: { type: "compare",
            columns: [
              { title: "Before Java 21", points: ["list.get(0) / list.get(list.size()-1)", "No uniform 'first/last' concept across List, Deque, LinkedHashSet", "Reversing a view required different tricks per collection type"] },
              { title: "Java 21+ SequencedCollection", points: ["getFirst() / getLast() on any sequenced collection", "addFirst()/addLast() where mutation makes sense", "reversed() returns a live reversed view, not a copy"] }
            ]},
          tricks: ["reversed() is a VIEW, not a copy — mutating the reversed view mutates the original collection. A common gotcha if you assume it's a snapshot."]
        }},
      { id: "j21-5", t: "Structured Concurrency (Preview)", d: "Hard", desc: "Still in preview at 21 (through JDK 25's fifth preview) — standardized in Java 26. See the Java 26 entry for the full explanation and diagram." },
      { id: "j21-6", t: "Generational ZGC", d: "Medium",
        desc: "ZGC gained generational collection, dramatically improving throughput for the common case of mostly-short-lived objects.",
        notes: {
          explain: ["Garbage collectors historically had to choose between ultra-low pause times (original ZGC, Shenandoah) and high throughput (which benefits from generational collection, since most objects die young — the 'weak generational hypothesis'). Generational ZGC keeps ZGC's sub-millisecond pause promise while adding a young/old split, so short-lived objects are collected far more cheaply.",
            "Directly relevant to your own benchmarking/TPS-scaling work: GC choice and generational tuning are exactly the kind of lever that shows up when pushing a service from 50 to 3000 TPS."],
          code: [{ lang: "bash", caption: "Enabling it is a JVM flag, not a code change", src:
`# Java 21+, generational mode became default behavior in Java 23
java -XX:+UseZGC -XX:+ZGenerational -Xmx4g -jar app.jar

# Compare against G1 (still the JDK's overall default collector)
java -XX:+UseG1GC -Xmx4g -jar app.jar` }],
          tricks: ["Know when to reach for ZGC vs G1: G1 is still the default and a good general-purpose choice; ZGC (especially generational ZGC) is for latency-sensitive services where multi-millisecond pauses are unacceptable, at some cost in raw throughput/footprint versus G1."]
        }},
      { id: "j21-7", t: "String Templates — Previewed, then Withdrawn", d: "Easy",
        desc: "STR.\"Hello \\{name}\" previewed in 21 and 22, then pulled back to the design stage in Java 23 — a rare, honest example of a JEP not making it to standard on the usual track.",
        notes: {
          explain: [
            "String templates (`STR.\"Total: \\{price}\"`) were meant to replace error-prone string concatenation and String.format with an embedded-expression syntax that also gave library authors a hook to safely escape values (e.g., a SQL-safe template processor). After two preview rounds, the JDK team concluded the design needed more work — particularly around how templates should compose with the type system — and withdrew it in Java 23 rather than ship something they'd regret.",
            "Worth knowing as interview trivia: it shows the preview-feature process working as intended (catching design problems before they're locked in forever) rather than a failure. Contrast with structured concurrency, which took five preview rounds but did eventually standardize (Java 26)."
          ],
          tricks: ["If asked 'what's new in string handling in modern Java,' don't cite string templates as a shipped feature — they're withdrawn, not available in any current JDK. Text blocks (Java 15) are the feature that did ship."]
        }},
      { id: "j21-8", t: "Vector API — Still Incubating", d: "Medium",
        desc: "Explicit SIMD vectorization for numeric code, expressed in portable Java and compiled down to CPU vector instructions where available — still incubating after many rounds (7th as of Java 21).",
        notes: {
          explain: [
            "Normal Java code relies on the JIT to auto-vectorize loops opportunistically, which is unreliable and hard to predict. The Vector API lets you write explicitly vectorized numeric code (e.g., summing or multiplying arrays in SIMD lanes) that's portable across CPU architectures — the JVM picks the widest vector width the current hardware actually supports at runtime.",
            "It's aimed at exactly the kind of data-parallel numeric workloads that come up in ML preprocessing, image/signal processing, and similar performance-critical inner loops — a niche but real use case for backend engineers touching that territory."
          ],
          tricks: ["It's an incubator module (`jdk.incubator.vector`), not a standard API — worth knowing the distinction between incubating (API may still change, needs an explicit module flag) and preview (feature-complete, needs --enable-preview) since interviewers sometimes conflate them."]
        }}
    ]},
    { name: "Java 22–24 (2024–2025)", items: [
      { id: "j22-1", t: "Unnamed Variables & Patterns (`_`)", d: "Easy", desc: "Use `_` for a variable/pattern component you must declare but never read (e.g., a catch block or a record pattern component) — reduces 'unused variable' noise and makes intent explicit.",
        notes: { code: [{ lang: "java", caption: "Declared but intentionally unused, made explicit with _", src:
`try {
    risky();
} catch (IOException _) {          // we don't care about the exception details
    return Result.failure();
}

// In a record pattern, ignore components you don't need
if (shape instanceof Rectangle(Point p1, _)) {
    System.out.println("top-left corner: " + p1);
}` }] } },
      { id: "j22-2", t: "Stream Gatherers (Preview)", d: "Medium", desc: "A new Stream.gather() operation for custom intermediate operations that don't fit filter/map/reduce — lets you write reusable stateful transformations (windowing, deduplication with custom logic) as a first-class Stream step instead of dropping to a manual loop.",
        notes: { code: [{ lang: "java", caption: "A built-in gatherer: fixed-size sliding windows", src:
`List<List<Integer>> windows = Stream.of(1, 2, 3, 4, 5)
    .gather(Gatherers.windowSliding(2))
    .toList();
// [[1, 2], [2, 3], [3, 4], [4, 5]] — previously required a hand-rolled loop` }] } },
      { id: "j22-3", t: "Scoped Values (Preview → standardized in 25)", d: "Hard",
        desc: "An immutable, structured alternative to ThreadLocal, designed to work efficiently with millions of virtual threads.",
        notes: {
          explain: ["ThreadLocal has two problems at virtual-thread scale: it's mutable (any code with a reference can change it, making reasoning hard) and it doesn't automatically clean up, which is a real memory-leak risk when you might have millions of virtual threads instead of thousands of platform threads. ScopedValue is immutable for the duration of a well-defined dynamic scope (`ScopedValue.where(USER, user).run(() -> { ... })`) — it's automatically and safely 'unbound' the moment that scope exits, and it's cheap enough to use freely with virtual threads."],
          code: [{ lang: "java", caption: "Request-scoped context that can't leak between virtual threads", src:
`static final ScopedValue<String> TRACE_ID = ScopedValue.newInstance();

void handleRequest(HttpRequest req) {
    String traceId = req.header("X-Trace-Id");
    ScopedValue.where(TRACE_ID, traceId).run(() -> {
        processOrder(req);   // TRACE_ID.get() is valid anywhere in this call tree
    });
    // TRACE_ID is automatically, safely unbound here — no manual cleanup needed
}

void logSomewhereDeep() {
    log.info("trace={}", TRACE_ID.get()); // works even many calls deep, no parameter threading needed
}` }],
          diagram: { type: "compare",
            columns: [
              { title: "ThreadLocal", points: ["Mutable — set() can be called from anywhere", "Must remember to remove() or risk leaks", "Inherited to child threads only via the heavier InheritableThreadLocal", "Fine for thousands of platform threads, risky for millions of virtual threads"] },
              { title: "ScopedValue (standard in 25)", points: ["Immutable for the life of the bound scope", "Automatically unbound when the scope exits — no manual cleanup", "Cheap, designed for virtual-thread-per-request patterns", "Natural fit for request-scoped context (trace IDs, current user) in high-concurrency services"] }
            ]},
          tricks: ["Directly relevant to your OpenTelemetry/tracing work: ScopedValue is the natural mechanism for propagating a trace/span context through a virtual-thread-heavy call chain without the leak risk of ThreadLocal."]
        }},
      { id: "j22-4", t: "Foreign Function & Memory API — Finalized", d: "Medium", desc: "The JNI replacement (first previewed at 17) became a standard, stable feature in Java 22 — safe, non-reflective calls into native code and off-heap memory management. See the Java 17 entry for a code example." },
      { id: "j22-5", t: "Class-File API (standardized in 24)", d: "Medium", desc: "A standard, JDK-maintained API for parsing/generating .class files — previously every bytecode-manipulation library (ASM, ByteBuddy, cglib — which Spring itself uses internally for proxies) had to track JDK internals independently. Good trivia connecting straight back to how Spring AOP proxies work.",
        notes: { code: [{ lang: "java", caption: "Reading a class file's structure with the standard API", src:
`byte[] bytes = Files.readAllBytes(Path.of("Order.class"));
ClassModel model = ClassFile.of().parse(bytes);
model.methods().forEach(m -> System.out.println(m.methodName().stringValue()));` }] } },
      { id: "j22-6", t: "Ahead-of-Time Class Loading & Linking (24)", d: "Medium", desc: "Lets a training run record which classes get loaded/linked at startup and cache that work for future JVM starts — a direct answer to 'why does my Spring Boot app take 3+ seconds to start' and a precursor to the AOT cache improvements finalized in Java 26.",
        notes: { code: [{ lang: "bash", caption: "Two-step: record a training run, then reuse the cache", src:
`# 1. Training run — records what classes get loaded/linked
java -XX:AOTMode=record -XX:AOTConfiguration=app.aotconf -jar app.jar

# 2. Production runs use the cache to skip repeated class-loading/linking work
java -XX:AOTMode=create -XX:AOTConfiguration=app.aotconf -XX:AOTCache=app.aot -jar app.jar
java -XX:AOTCache=app.aot -jar app.jar   # noticeably faster startup` }] }
      }
    ]},
    { name: "Java 25 (2025 LTS) — current LTS", items: [
      { id: "j25-1", t: "Scoped Values — Standardized", d: "Hard", desc: "Finalized after previewing since 21 — see the full explanation, code example, and ThreadLocal-comparison diagram under the Java 22–24 entry above." },
      { id: "j25-2", t: "Module Import Declarations", d: "Easy", desc: "`import module java.base;` imports every exported package of a module in one line — removes a wall of individual imports for common cases, aimed squarely at simplifying scripts and teaching code.",
        notes: { code: [{ lang: "java", caption: "One line instead of a dozen java.util/java.io imports", src:
`import module java.base;

void main() {
    List<String> names = List.of("a", "b");   // java.util.List, no explicit import needed
    Path p = Path.of("data.txt");              // java.nio.file.Path, same
}` }] } },
      { id: "j25-3", t: "Compact Source Files & Instance Main Methods", d: "Easy",
        desc: "A 'hello world' no longer needs `public class`, `static void main(String[])`, or even an explicit class declaration for simple single-file programs.",
        notes: {
          code: [{ lang: "java", caption: "This is a complete, valid Java 25 program", src:
`void main() {
    System.out.println("Hello, world");
}
// No "public class Hello", no "static", no String[] args required for simple cases.
// javac still generates an implicit class behind the scenes — this is purely ergonomic.` }],
          tricks: ["This finalizes a feature that started as a preview in Java 21 aimed at lowering the barrier for teaching and quick scripting — good to know as an example of how long a JEP can take to go from preview to standard (21 → 25, 4 releases)."]
        }},
      { id: "j25-4", t: "PEM Encodings of Cryptographic Objects (Preview)", d: "Medium", desc: "Standard API for reading/writing PEM-encoded keys and certificates — previously every project rolled its own parsing or pulled in Bouncy Castle for something this basic.",
        notes: { code: [{ lang: "java", caption: "Standard PEM decoding, no third-party crypto library needed", src:
`PEMDecoder decoder = PEMDecoder.of();
PrivateKey key = decoder.decode(pemString, PrivateKey.class);` }] } },
      { id: "j25-5", t: "JFR CPU-Time Profiling (Experimental)", d: "Medium", desc: "Java Flight Recorder gains CPU-time-based (not just wall-clock) profiling samples — relevant to your existing JFR/observability background from the Java 11 entry." },
      { id: "j25-6", t: "Structured Concurrency — Fifth Preview", d: "Hard", desc: "Still not standardized at 25 (five preview rounds across 21–25) — finally became standard in Java 26. This unusually long preview run is itself good interview trivia about how carefully the JDK team iterates on concurrency APIs before locking them in." }
    ]},
    { name: "Java 26 (March 2026) — latest release", items: [
      { id: "j26-1", t: "Structured Concurrency — Standardized", d: "Hard",
        desc: "After five preview rounds since Java 21, structured concurrency is finally a standard feature: treat a group of forked subtasks as one unit with a single lifetime, cancellation, and error-propagation policy.",
        notes: {
          explain: ["Structured concurrency addresses a real problem with raw ExecutorService/Future usage: if you fork three parallel subtasks and one fails, nothing automatically cancels the other two, and error handling/timeout logic has to be hand-rolled every time. A StructuredTaskScope lets you fork child tasks that are guaranteed to complete (or be cancelled) before the scope itself exits — the concurrent tasks' lifetimes are structurally nested inside the parent's, mirroring how try/finally nests single-threaded control flow.",
            "Built-in join policies express common patterns directly: 'shut down on the first failure' (ShutdownOnFailure) or 'shut down on the first success' (ShutdownOnSuccess, useful for racing redundant calls to multiple replicas/regions)."],
          code: [{ lang: "java", caption: "Fan-out to two services; if either fails, both are cancelled automatically", src:
`Response handle(Request req) throws InterruptedException, ExecutionException {
    try (var scope = StructuredTaskScope.open(Joiner.awaitAllSuccessfulOrThrow())) {
        Subtask<User> user = scope.fork(() -> fetchUser(req.userId()));
        Subtask<Inventory> inv = scope.fork(() -> fetchInventory(req.sku()));

        scope.join(); // waits for both; if either throws, the other is cancelled automatically

        return new Response(user.get(), inv.get());
    } // scope guarantees no child task outlives this block
}

// Racing redundant calls — first success wins, the rest are cancelled
String fastestRegion(List<Supplier<String>> calls) throws Exception {
    try (var scope = StructuredTaskScope.open(Joiner.<String>anySuccessfulResultOrThrow())) {
        calls.forEach(scope::fork);
        return scope.join();
    }
}` }],
          diagram: { type: "tree", root: "try (var scope = StructuredTaskScope.open(...))", caption: "If subtask B fails under the failure-propagating joiner, A and C are cancelled automatically before the scope exits — no orphaned background work.",
            children: [
              { label: "scope.fork(() -> callServiceA())" },
              { label: "scope.fork(() -> callServiceB())" },
              { label: "scope.fork(() -> callServiceC())" },
              { label: "scope.join()  — blocks until all complete or the failure policy triggers cancellation" }
            ]},
          tricks: [
            "The core promise is 'no child task outlives its parent scope' — contrast this with a raw ExecutorService.submit() where a forgotten Future can keep running long after the calling method has returned, silently leaking work.",
            "Pairs directly with virtual threads: each forked subtask typically runs on its own (cheap) virtual thread, so structured concurrency is really 'fan-out/fan-in done safely' for the virtual-thread era.",
            "Good interview narrative: structured concurrency, scoped values, and virtual threads are three separate JEPs but form one coherent story (Project Loom) about making massively concurrent, blocking-style Java code both cheap and safe to reason about."
          ]
        }},
      { id: "j26-2", t: "Flexible Constructor Bodies — Standardized", d: "Medium",
        desc: "Constructors can now run statements — validation, logging, local variable setup — before calling super()/this(), as long as they don't touch the instance being constructed yet.",
        notes: {
          code: [{ lang: "java", caption: "Validation before super(), without the old super(validate(x)) workaround", src:
`class PositiveAmount extends Amount {
    PositiveAmount(long cents) {
        if (cents < 0) throw new IllegalArgumentException("negative amount"); // now legal before super()
        long normalized = Math.max(cents, 0);
        super(normalized);
    }
}` }],
          tricks: ["Before this, `super(validate(x))` style workarounds were common specifically to run validation logic before the superclass constructor — flexible constructor bodies let you write that validation as normal statements instead of cramming it into the super() call's argument expression."]
        }},
      { id: "j26-3", t: "HTTP/3 Support", d: "Medium", desc: "The built-in HttpClient (standardized back in Java 11) gains HTTP/3 support, built on QUIC — continues the client's evolution from HTTP/1.1-only to HTTP/2-by-default to now HTTP/3.",
        notes: { code: [{ lang: "java", caption: "Opting into HTTP/3 on the same client API you already use", src:
`HttpClient client = HttpClient.newBuilder()
    .version(HttpClient.Version.HTTP_3)
    .build();
// Falls back gracefully if the server doesn't support HTTP/3` }] } },
      { id: "j26-4", t: "AOT Cache Works with Any Garbage Collector, Including ZGC", d: "Medium", desc: "Extends Java 24's ahead-of-time class loading/linking cache so it's compatible with any GC — previously AOT caching and certain GC choices didn't mix, forcing a tradeoff between fast startup and your GC of choice." },
      { id: "j26-5", t: "Applet API Fully Removed", d: "Easy", desc: "The Applet API — deprecated for removal back in Java 9, functionally dead for a decade since browsers dropped plugin support — is finally gone from the JDK. A clean, low-stakes example of how long full deprecation cycles take in a platform this large." }
    ]}
  ]
};
