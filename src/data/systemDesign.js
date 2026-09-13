export default {
  key: "system-design", label: "System Design", icon: "🏗️", color: "var(--blue)",
  desc: "Staff-level distributed systems: the foundations, the building blocks, streaming internals that extend what you already run in production (Kafka/Flink), and design case studies you should be able to whiteboard cold.",
  sections: [
    { name: "Foundations", items: [
      { id: "sd-1", t: "Scalability fundamentals: vertical vs horizontal, stateless vs stateful services", d: "Easy",
        desc: "Know when scaling out beats scaling up, and what statelessness buys you operationally.",
        res: "Martin Fowler — martinfowler.com", url: "https://martinfowler.com/",
        notes: {
          explain: [
            "Vertical scaling (a bigger box: more CPU/RAM/disk) is the fastest lever but hits a hard ceiling — the biggest instance type, a single point of failure, and downtime to resize — with cost growing worse-than-linearly at the high end. Horizontal scaling (more boxes behind a load balancer) scales near-linearly and gives fault tolerance for free (lose one node, the rest carry on), but it only works if any node can handle any request, which is where statelessness comes in.",
            "A stateless service keeps no request-scoped or session-scoped data in local memory/disk between requests — anything that must survive is pushed to an external store (Redis, a DB, a shared cache) that every node can reach. That's what lets a load balancer route round-robin instead of 'sticky' to one node, what makes autoscaling and rolling deploys safe (killing a node loses nothing), and what makes AZ failover trivial. Stateful services (databases, Kafka brokers, Flink task managers holding local RocksDB state) can still scale horizontally, but need explicit partitioning/replication schemes to do it — they can't just sit behind a dumb load balancer."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Vertical scaling", points: ["Bigger single machine — more CPU/RAM/disk", "Simple: no distribution logic needed", "Hard ceiling (largest instance type)", "Single point of failure, downtime to resize"] },
              { title: "Horizontal scaling", points: ["More machines behind a load balancer", "Near-linear scaling, fault tolerant by default", "Requires statelessness (or explicit partitioning)", "Enables rolling deploys, autoscaling, AZ failover"] }
            ]},
          tricks: [
            "Sticky sessions are the tell that a service isn't really stateless — if you need session affinity to work correctly, state has been smuggled into node-local memory, which defeats even load distribution and complicates failover.",
            "Don't say 'stateless = no state anywhere' — the service can be extremely state-heavy (a Flink task manager, say), the requirement is only that no single node is the irreplaceable source of truth for state that must outlive a request or restart."
          ]
        }},
      { id: "sd-2", t: "CAP theorem & PACELC in practice", d: "Easy",
        desc: "Not just the triangle — be able to say where Kafka, DynamoDB, and Postgres each sit and why.",
        notes: {
          explain: [
            "CAP says that under a network partition (P), you must choose consistency (C) or availability (A) — nodes that can't talk to each other can't both stay available and agree on the latest value. In practice, actual partitions are rare; PACELC is the more useful extension: even Else (no partition), you still trade Latency against Consistency, because waiting for a quorum or a replica ack costs time. Classifying a real system means placing it on both axes, not reciting the triangle.",
            "Concretely: DynamoDB's default mode is PA/EL — available and low-latency during a partition, eventually consistent otherwise. A single-writer Postgres instance is effectively PC/EC — it refuses to serve stale/conflicting data (favors consistency) and pays replication latency for it. Kafka is tunable by you: `acks=all` with `min.insync.replicas>1` pushes it toward PC/EC (rejects writes rather than under-replicate, and write latency is bound by the slowest in-sync replica); `acks=1` pushes it toward PA/EL."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "AP / EL", points: ["Stays available during a partition", "Low latency in normal operation", "Eventually consistent — reads can be stale", "e.g. DynamoDB (default), Cassandra, Kafka acks=1"] },
              { title: "CP / EC", points: ["Refuses to serve during a partition rather than risk inconsistency", "Higher write latency — waits for quorum/replica ack", "Strongly consistent reads", "e.g. single-writer Postgres, Kafka acks=all + min.insync.replicas>1"] }
            ]},
          tricks: ["Interviewers want you to place a specific system on this, not define the theorem — 'Kafka is CP or AP depending on acks and min.insync.replicas, here's why' beats a textbook recitation every time."]
        }},
      { id: "sd-3", t: "Consistency models: strong, eventual, causal, read-your-writes", d: "Medium",
        desc: "Map each model to a real system you've used (RocksDB local state, Kafka consumer offsets, etc.).",
        notes: {
          explain: [
            "Strong consistency (linearizability) means every read sees the latest committed write, as if there were only one copy of the data — it requires real coordination (a quorum or a single writer) and is the most expensive guarantee to provide. Eventual consistency drops the ordering guarantee entirely: replicas converge to the same value *eventually*, with no promise about what a read sees in the meantime. Causal consistency is the useful middle ground — operations that are causally related (a reply to a comment) are seen in that order by everyone, but unrelated concurrent operations can be seen in different orders by different readers, which is enough for most product needs without paying for full linearizability.",
            "Read-your-writes is a narrower, session-scoped guarantee (a subset of causal): a user is guaranteed to see their own writes on their next read, even if the system as a whole is only eventually consistent — this is usually what UX actually needs (post a comment, refresh, see it), and it's far cheaper to implement (route a session's reads to the replica that took its write, or a short read-after-write pinning window) than global strong consistency."
          ],
          diagram: { type: "tree", root: "Consistency spectrum (strongest → weakest)",
            children: [
              { label: "Strong (linearizable)", children: [{ label: "Every read sees latest write; needs quorum/single-writer coordination" }] },
              { label: "Causal", children: [{ label: "Causally related ops seen in order; concurrent unrelated ops can reorder" }] },
              { label: "Read-your-writes", children: [{ label: "Session-scoped: you always see your own writes" }] },
              { label: "Eventual", children: [{ label: "Replicas converge eventually; no ordering promise in between" }] }
            ]},
          tricks: ["Read-your-writes is often what the product actually needs, not full strong consistency — naming it as the cheaper, sufficient guarantee (instead of reaching for linearizability by default) is the sharper answer."]
        }},
      { id: "sd-4", t: "Back-of-envelope capacity estimation", d: "Easy",
        desc: "QPS, storage, bandwidth math you can do live in an interview or a design doc.",
        notes: {
          explain: [
            "The method is the same every time: start from a user count (DAU/MAU), derive an action rate (opens/posts/reads per user per day) to get average QPS, then apply a peak multiplier (2-10x average is typical for diurnal consumer traffic, higher for spiky/event-driven load) to get the number that actually determines your capacity needs. Storage follows the same shape: bytes per record × records per day × retention period. Bandwidth is QPS × average payload size. Round aggressively to powers of ten as you go — the interviewer is checking that you can reason about orders of magnitude live, not that you can multiply precisely."
          ],
          tricks: [
            "State your assumptions out loud before calculating ('assuming 100M DAU, each opens the app 5x/day') — you're being graded on reasoning under uncertainty, not arithmetic accuracy.",
            "Don't forget the peak multiplier — average QPS is not the number you design for; a design that only handles average load falls over at the first traffic spike, and forgetting this step is a common and noticeable gap."
          ]
        }},
      { id: "sd-5", t: "Networking basics for system design: DNS, load balancers, CDNs, TLS termination", d: "Easy",
        desc: "How a request actually gets from a browser to your service: DNS resolution, LB layer, CDN edge caching, and where TLS gets terminated.",
        notes: {
          explain: [
            "DNS resolves a hostname to an IP — often the IP of a CDN edge or load balancer, not the origin directly, and GeoDNS/anycast routing can send different users to different regions right at this step, before a single packet reaches your infrastructure. Load balancers then sit in front of your fleet at L4 (TCP-level, dumb but fast) or L7 (HTTP-aware — can route by path/header, terminate TLS, do sticky sessions); most production setups need L7 for content-based routing and centralized certificate management.",
            "TLS termination usually happens at the edge (LB or CDN), not on application servers — this centralizes certificate management and offloads the handshake's CPU cost from app instances, with traffic re-encrypted or sent plaintext over a trusted internal network from there. CDNs cache static/semi-static content at edge points-of-presence close to users, so only cache misses travel back to origin — this is why read-heavy, cacheable workloads get most of their latency win from CDN placement, not origin performance."
          ],
          diagram: { type: "flow", caption: "A request's path from client to origin — TLS is typically terminated at the edge, and only cache misses reach the backend.",
            steps: [
              { label: "DNS", note: "resolves to nearest edge/LB (GeoDNS)" },
              { label: "CDN edge", note: "TLS terminated here; cache hit returns immediately", arrowLabel: "cache miss →" },
              { label: "Load balancer", note: "L7 routing to backend fleet", arrowLabel: "→" },
              { label: "App servers", note: "internal traffic, often plaintext", arrowLabel: "→" }
            ]},
          tricks: [
            "State explicitly where TLS terminates (edge/LB, common) versus end-to-end/mutual TLS to origin (zero-trust orgs, regulated data) — it changes your internal network trust model and is worth a sentence even when not asked.",
            "GeoDNS/anycast is a form of load balancing that happens before any packet reaches your data center — mentioning it shows you're thinking beyond a single-region design."
          ]
        }},
      { id: "sd-6", t: "Latency vs throughput tradeoffs, tail latency (p99) thinking", d: "Medium",
        desc: "Directly relevant — you already improved p99-style metrics via your 50→3000 TPS benchmarking work.",
        notes: {
          explain: [
            "Throughput (requests processed per unit time) and latency (time per individual request) aren't simply inversely related — you can raise throughput via batching, pipelining, or added parallelism while making median latency *worse*, because batching amortizes fixed per-request overhead (network RTT, serialization) at the cost of the first item in a batch waiting for the batch to fill. This is exactly the tradeoff behind Kafka producer batching (`linger.ms`/`batch.size`) and Flink's buffer timeout — both are trading a small amount of per-record latency for a large gain in throughput.",
            "p50 hides the real user experience; p99/p999 is what determines whether your slowest 1% of users have a bad time, and at real scale (millions of requests/day) p99 outliers happen constantly to *someone*. Tail latency also compounds under fan-out: if a single user request depends on N backend calls and each has some p99 probability of being slow, the probability that *at least one* of them is slow grows with N — a request fanning out to 20 downstream services will have a noticeably worse aggregate p99 than any individual call, even if every call is individually well-behaved."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Optimize for throughput", points: ["Batch requests, amortize fixed overhead", "Higher pipeline parallelism", "Median/first-item latency often gets worse", "Right for background/bulk pipelines"] },
              { title: "Optimize for latency", points: ["Process immediately, no batching delay", "Lower per-request efficiency", "Better p99 for user-facing requests", "Right for synchronous request/response paths"] }
            ]},
          tricks: [
            "Name tail latency amplification unprompted for any fan-out/microservices design — the aggregate p99 across N dependent calls is worse than any single call's p99, and it gets worse as N grows.",
            "Know the standard mitigation: hedged/backup requests — fire a duplicate request to a second replica if the first hasn't responded past some threshold — trading extra load for reduced tail latency."
          ]
        }}
    ]},
    { name: "Core Building Blocks", items: [
      { id: "sd-7", t: "Load balancing algorithms (round robin, least-conn, consistent hashing)", d: "Medium",
        desc: "Pick the algorithm based on what you're balancing — even request count isn't the same as even load, and cache-affinity workloads need consistent hashing, not round robin.",
        notes: {
          explain: [
            "Round robin cycles through backends in order — simple, and fine when requests are roughly uniform cost and backends are homogeneous. It breaks down when request cost varies wildly (one request 100ms, another 5s): a backend can get unlucky and pile up several slow requests while others sit idle. Least-connections fixes that by routing to whichever backend currently has the fewest in-flight requests, which approximates 'least loaded' far better than round robin for variable-cost workloads — at the price of needing the LB to track live connection counts per backend.",
            "Consistent hashing solves a different problem entirely: routing the *same key* (a user ID, a cache key, a partition key) to the *same backend* every time, so caches stay warm and stateful shards don't need to hold every key. Both backends and keys are hashed onto a ring; a key routes to the next backend clockwise from it. The property that makes this valuable is that adding or removing one backend only reshuffles keys near it on the ring (roughly 1/N of keys), not the whole keyspace — unlike naive `hash(key) % N`, which remaps almost every key on every resize."
          ],
          code: [{ lang: "java", caption: "Simplified consistent-hash ring lookup (virtual nodes for even distribution)", src: `TreeMap<Long, String> ring = new TreeMap<>();

// build the ring: several virtual nodes per physical backend
for (String backend : backends) {
    for (int v = 0; v < VIRTUAL_NODES_PER_BACKEND; v++) {
        long hash = hash(backend + "#" + v);
        ring.put(hash, backend);
    }
}

// route a key to its backend
String backendFor(String key) {
    long hash = hash(key);
    Map.Entry<Long, String> entry = ring.ceilingEntry(hash);
    if (entry == null) entry = ring.firstEntry(); // wrap around the ring
    return entry.getValue();
}` }],
          tricks: [
            "`hash(key) % N` is the wrong answer the moment N changes — it remaps almost every key when a node is added or removed. Naming consistent hashing (and ideally virtual nodes, to fix uneven key distribution across a small number of physical nodes) unprompted is the signal.",
            "Least-connections requires shared connection-count state across LB instances if you run more than one LB — easy within a single LB process, but needs coordination (or approximation) once you scale the LB layer itself."
          ]
        }},
      { id: "sd-8", t: "Caching strategies & cache invalidation (write-through, write-behind, cache-aside, TTL storms)", d: "Medium",
        desc: "The four caching patterns trade off consistency, write latency, and cache-miss behavior differently — and invalidation, not lookup, is where caching designs actually fail.",
        notes: {
          explain: [
            "Cache-aside (lazy loading) is the most common pattern: the app checks the cache, and on a miss reads the DB and populates the cache. Simplest to reason about, but every miss (including cold start) pays full DB latency, and there's a window where cache and DB can briefly disagree. Write-through writes to the cache (and DB) synchronously on every write, so the cache is always fresh, at the cost of write latency being bound by the slower of the two. Write-behind (write-back) writes to the cache and flushes to the DB asynchronously — fastest writes, but risks data loss if the cache node dies before the flush, and needs careful ordering/dedup logic on the flush.",
            "Invalidation is the harder half of the problem. TTL-based expiry is simple but creates a 'thundering herd' / TTL storm: many popular keys written in the same batch expire around the same moment, and a flood of concurrent requests all miss cache simultaneously and hammer the DB at once. Standard mitigations: jittered TTLs (randomize expiry so keys don't die together), a single-flight lock per key so only one request repopulates while others wait for that result, and stale-while-revalidate (serve the expired value briefly while refreshing in the background)."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Write-through", points: ["Cache updated synchronously with every write", "Cache is always fresh", "Write latency bound by the slower of cache/DB", "No data-loss window on cache failure"] },
              { title: "Write-behind", points: ["Cache updated immediately; DB flushed async", "Fastest writes", "Data-loss risk if cache dies before flush", "Needs ordering/dedup on the async flush"] }
            ]},
          tricks: [
            "Naming the thundering-herd/TTL-storm failure mode unprompted — not just 'we use a TTL' — is what separates a strong answer, especially paired with jittered expiry or single-flight repopulation as the fix.",
            "Invalidation across multiple cache nodes/regions is harder than lookup — mutating data means invalidating (or updating) every node holding that key, which is why many systems prefer short TTLs over explicit invalidation once a cache isn't trivially single-node."
          ]
        }},
      { id: "sd-9", t: "Message queues & pub/sub patterns beyond Kafka (SQS, RabbitMQ, Solace — you know Solace already)", d: "Easy",
        desc: "Compare Solace/JMS patterns you've used against Kafka's log-based model.",
        notes: {
          explain: [
            "Kafka is a log: messages are retained for a configurable period and consumers track their own offset, so multiple independent consumer groups can each replay/re-read the same stream at their own pace — this is what makes Kafka good for both messaging and event-sourcing/replay use cases. Traditional brokers like RabbitMQ (AMQP) or Solace/JMS are queue- and topic-based with broker-side delivery tracking: the broker pushes (or the consumer pulls) a message, marks it in-flight, and deletes it once acked — there's no replay once consumed, but you get broker-native features (message priority, complex content-based routing, per-message TTL) more naturally than Kafka offers.",
            "SQS is the managed-queue version of the same idea: at-least-once delivery, visibility timeouts instead of long-lived consumer connections, and no ordering guarantee unless you use FIFO queues — which cap throughput per message-group-id, exactly the same sharding tradeoff a Kafka partition key makes."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Kafka (log)", points: ["Durable, replayable log; consumers own their offset", "Multiple consumer groups replay independently", "No broker-side delete-on-ack", "Ordering per partition"] },
              { title: "Traditional broker (RabbitMQ/SQS/Solace)", points: ["Broker tracks delivery, deletes on ack", "No replay once consumed", "Richer routing/priority/TTL features", "Ordering per queue or message-group"] }
            ]},
          tricks: ["Pick Kafka when multiple independent consumers need to replay the same stream; pick a traditional broker when you want the broker itself to guarantee delivery/track in-flight state and don't need replay — that one-line framing is what interviewers are listening for."]
        }},
      { id: "sd-10", t: "API Gateway patterns & rate limiting algorithms (token bucket, sliding window)", d: "Medium",
        desc: "The gateway is where cross-cutting concerns (auth, rate limiting, routing) live so individual services don't reimplement them — and the rate-limiting algorithm you pick changes what 'burst' means.",
        notes: {
          explain: [
            "An API gateway centralizes cross-cutting concerns — authn/authz, TLS termination, routing to the right backend service, request/response transformation, and rate limiting — so individual services don't each reimplement them, and it's the natural place to enforce coarse-grained limits per API key/tenant before traffic even reaches your fleet.",
            "Rate limiting algorithms differ in how they treat bursts. Fixed window (count requests per fixed bucket, e.g. per second) is simple but allows up to 2x the intended rate right at a window boundary (max requests at the end of one window plus max at the start of the next). Sliding window smooths this by tracking a rolling interval instead of a hard reset. Token bucket — tokens refill at a fixed rate, each request consumes one, requests fail or queue once the bucket is empty — is the common production choice because it naturally allows a controlled burst (up to bucket capacity) while still enforcing a steady-state average rate, the same mechanism used in network traffic shaping."
          ],
          code: [{ lang: "java", caption: "Token bucket: capacity controls burst size, refill rate controls sustained throughput", src: `class TokenBucket {
    private final long capacity;
    private final double refillPerMs;
    private double tokens;
    private long lastRefillMs;

    synchronized boolean tryAcquire() {
        refill();
        if (tokens >= 1) {
            tokens -= 1;
            return true;
        }
        return false; // reject or queue
    }

    private void refill() {
        long now = System.currentTimeMillis();
        double elapsed = now - lastRefillMs;
        tokens = Math.min(capacity, tokens + elapsed * refillPerMs);
        lastRefillMs = now;
    }
}` }],
          diagram: { type: "tree", root: "Rate limiting algorithms",
            children: [
              { label: "Fixed window", children: [{ label: "Simple counter per interval; allows up to 2x burst at window boundary" }] },
              { label: "Sliding window", children: [{ label: "Rolling interval instead of hard reset; smooths the boundary problem" }] },
              { label: "Token bucket", children: [{ label: "Refills at a steady rate; capacity controls burst, refill rate controls sustained throughput" }] }
            ]},
          tricks: [
            "Fixed window's boundary-burst problem (2x traffic right at the window edge) is the standard gotcha to name — it's why sliding window or token bucket is usually the real answer, not fixed window.",
            "Token bucket capacity and refill rate are independent knobs: capacity controls allowed burst, refill rate controls sustained throughput — collapsing them into a single 'limit' number is a common mistake to avoid."
          ]
        }},
      { id: "sd-11", t: "Database replication & partitioning strategies", d: "Medium",
        desc: "Replication buys availability and read scale; partitioning (sharding) buys write scale — most large systems need both, and the partition key choice is the decision that's hardest to walk back.",
        notes: {
          explain: [
            "Replication copies the same data onto multiple nodes. Synchronous replication (wait for a replica ack before confirming the write) gives strong durability/consistency at the cost of write latency — and availability, if the acking policy requires a replica that's currently down; this is exactly the `acks=all`/`min.insync.replicas` knob in Kafka. Asynchronous replication confirms the write once the leader has it and replicates in the background — lower latency, but a leader failure before replication completes can lose the tail of writes. Leader-follower (single-writer) is the common pattern for strong consistency; multi-leader or leaderless (Dynamo-style, quorum reads/writes) trades some consistency guarantees for write availability across regions.",
            "Partitioning (sharding) splits data across nodes by a partition key, so reads and writes for a subset scale independently. The key choice determines your access patterns for the life of the system — pick a key with high cardinality and even distribution (avoid hot keys) aligned with your most common query pattern, because cross-partition queries (joins, range scans across shards) become expensive scatter-gather operations. Resharding a live system is one of the hardest operational problems in distributed systems, which is exactly why consistent hashing (sd-7) exists — to avoid a full data reshuffle when the partition count changes."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Synchronous replication", points: ["Replica acks before write is confirmed", "Strong durability guarantee", "Higher write latency", "Can block/reject writes if replicas are down"] },
              { title: "Asynchronous replication", points: ["Write confirmed once leader has it", "Lower write latency", "Can lose the tail of writes on leader failure", "Replicas may briefly lag"] }
            ]},
          tricks: [
            "A hot partition (a celebrity user, a viral item) is the standard partitioning failure mode to name — mitigations are salting the key (append a random suffix, fan the writes, merge on read) or a dedicated cache/secondary index for the hot key.",
            "Replication factor and consistency level are different knobs that get conflated: replication factor is how many copies exist; consistency level (quorum, acks=all) is how many of those copies must confirm before an operation is considered done."
          ]
        }},
      { id: "sd-12", t: "CDN design & edge caching", d: "Easy",
        desc: "Push content geographically close to users so most requests never reach origin — the design questions are what to cache, for how long, and how to invalidate it.",
        notes: {
          explain: [
            "A CDN is a network of edge points-of-presence distributed geographically, each caching a copy of origin content close to users so requests are served from a location with much lower RTT than the origin data center. On a cache miss, the request goes to the origin (or a regional mid-tier cache), the response is cached at that edge node, and subsequent nearby requests hit the cache. Static/immutable content (images, video chunks, versioned JS bundles) is the easy case — cache aggressively with long TTLs, since content-hashed URLs make explicit invalidation unnecessary (a new version is just a new URL). Dynamic/personalized content is harder: either bypass to origin, cache fragments and assemble at the edge, or use short TTLs with stale-while-revalidate."
          ],
          diagram: { type: "flow", caption: "Origin shield absorbs the fan-in from many edge nodes missing on the same object at once.",
            steps: [
              { label: "Client request", note: "nearest edge PoP" },
              { label: "Edge cache", note: "hit → return immediately", arrowLabel: "miss →" },
              { label: "Origin shield", note: "mid-tier cache, absorbs duplicate misses", arrowLabel: "miss →" },
              { label: "Origin", note: "source of truth" }
            ]},
          tricks: [
            "Content-hashed/fingerprinted URLs (`main.a1b2c3.js`) sidestep the entire cache-invalidation problem for static assets — a new deploy is a new URL, so TTL can be set to 'forever' and never needs invalidating. This is the standard answer to 'how do you invalidate a CDN cache' for static assets.",
            "Origin shield is worth naming for high-miss scenarios — without it, a viral cache-miss event can have thousands of edge nodes all requesting the same uncached object from origin simultaneously, the thundering-herd problem from sd-8 at CDN scale."
          ]
        }},
      { id: "sd-13", t: "Idempotency & retry design at scale (dedup keys, exactly-once at the edge)", d: "Medium",
        desc: "You've implemented exactly-once in Kafka Streams — generalize the pattern to HTTP/API layers.",
        notes: {
          explain: [
            "Any client that retries on timeout — and every real client must, since 'no response' is indistinguishable from 'request lost' vs 'response lost' — risks executing the same operation twice unless the server can recognize a duplicate. The fix is an idempotency key: the client generates a unique key per logical operation (not per HTTP attempt) and sends it with the request; the server checks a dedup store keyed by that ID before processing — if it's seen before, it returns the original result instead of reprocessing. This is the same mechanism, generalized to HTTP/API layers, as Kafka's idempotent producer (producer ID + sequence number per partition) and the transactional exactly-once semantics already implemented in Kafka Streams.",
            "The dedup store itself needs a TTL and needs to be checked-and-set atomically (a conditional write / compare-and-swap) — otherwise two concurrent retries can both pass the 'have I seen this?' check before either writes the result, a classic TOCTOU race. For operations with side effects on external systems (charging a card, decrementing inventory), idempotency has to be enforced at that external system's boundary too, not just your own API layer, or a retry can double-charge even when your own service behaved perfectly."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Request + idempotency key", note: "client-generated, per logical operation" },
              { label: "Dedup store check", note: "atomic conditional write", arrowLabel: "seen before →" },
              { label: "Return cached result", note: "no reprocessing", arrowLabel: "(hit)" },
              { label: "Process + store result", note: "keyed by idempotency key", arrowLabel: "(miss)" }
            ]},
          tricks: [
            "'Exactly-once' end-to-end doesn't really exist without idempotency — what you're actually building is at-least-once delivery + idempotent processing, which nets out to effectively-once. Say this distinction explicitly; it mirrors the sd-19 discussion.",
            "The dedup check-and-store must be atomic (conditional put / unique constraint), not a separate read-then-write — otherwise two concurrent retries race each other, both pass the check before either commits, and the duplicate gets processed anyway."
          ]
        }},
      { id: "sd-51", t: "Authentication & authorization at scale (OAuth2/OIDC, JWT vs opaque tokens)", d: "Medium",
        desc: "Where identity gets checked shapes your whole trust model — and JWT vs opaque tokens trades revocability for a network hop on every request.",
        notes: {
          explain: [
            "OAuth2 is a delegated-authorization framework ('let this app act on my behalf, with this scope') — OIDC is an identity layer built on top of it that actually proves who the user is. Interviewers listen for the distinction: authentication (who are you — happens once, at login, producing a token) is different from authorization (what can you do — checked on every request), and centralizing authz at a gateway (sd-10) is what keeps individual services from each reimplementing it.",
            "JWT vs opaque token is the concrete design decision. A JWT is self-contained and signed — a gateway verifies it locally via signature check, zero network call, which scales horizontally with no shared state — but revoking one compromised JWT before its natural expiry is hard: either maintain a deny-list (which defeats the whole no-lookup benefit) or accept the exposure window and keep expiry short. An opaque token is a random string looked up in a shared store (Redis) on every request — trivially revocable (delete the row), no client-visible claims — at the cost of a network round-trip and a shared dependency on every authenticated request, the same tradeoff shape as stateful vs stateless services (sd-1)."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "JWT (self-contained)", points: ["Verified locally via signature — no network call", "Scales horizontally, no shared state", "Hard to revoke before expiry", "Claims are visible to the holder (base64, not encrypted)"] },
              { title: "Opaque token", points: ["Random string, looked up in a shared store per request", "Instantly revocable — delete the row", "Adds a network hop + shared dependency to every request", "No client-visible claims"] }
            ]},
          tricks: [
            "Short-lived JWT access token + longer-lived opaque refresh token is the standard hybrid — fast local verification for most requests, with real revocation happening at refresh time and the exposure window bounded to the access token's short TTL.",
            "Do coarse-grained authz (is this token valid, does this role allow this route) at the gateway; push fine-grained/resource-level authz (can THIS user edit THIS document) down to the owning service — the gateway usually lacks the domain context to make that call correctly."
          ]
        }},
      { id: "sd-52", t: "Probabilistic data structures at scale (HyperLogLog, Count-Min Sketch, Bloom filters as a toolkit)", d: "Medium",
        desc: "Three different 'exact tracking is too expensive' problems — membership, cardinality, frequency — and a different structure answers each one.",
        notes: {
          explain: [
            "All three trade a small, tunable error rate for massive memory savings over an exact structure, and all three matter the moment a question moves from 'at a thousand' to 'at a billion events a day.' A Bloom filter answers 'have I seen this exact item before' (sd-36's crawler dedup) — a bit array plus k hash functions that can false-positive but never false-negatives, safe whenever a wrongly-skipped item is the only downside.",
            "HyperLogLog answers a different question entirely — not 'have I seen this item' but 'how many DISTINCT items have I seen' (unique visitors today, distinct IPs hitting an endpoint) — estimating cardinality in a fixed ~12KB regardless of whether the true count is a thousand or a billion, and critically, HLLs are mergeable: union two shards' HLLs into one without re-scanning raw data, which is why Redis exposes PFADD/PFCOUNT/PFMERGE natively. Count-Min Sketch answers a third question — 'approximately how many times has this occurred' (trending hashtags, per-API-key request counts) — a small counter grid updated via multiple hash functions per event, never under-counting at the cost of a small, bounded over-count bias."
          ],
          diagram: { type: "tree", root: "Probabilistic toolkit — pick by the question being asked",
            children: [
              { label: "Bloom filter", children: [{ label: "Have I seen this exact item? False positives possible, never false negatives" }] },
              { label: "HyperLogLog", children: [{ label: "How many DISTINCT items? Mergeable cardinality estimate in ~KBs" }] },
              { label: "Count-Min Sketch", children: [{ label: "Approximately how many times has X occurred? Never under-counts" }] }
            ]},
          tricks: [
            "Naming HyperLogLog specifically (not 'we'd sample it') is the strong answer to any 'count unique X at scale' question — PFADD/PFCOUNT/PFMERGE is a concrete, citable implementation, and mergeability is what shows you understand why it fits a sharded pipeline.",
            "Don't reach for a probabilistic structure when the real cardinality fits in memory as an exact set — naming that boundary explicitly, instead of defaulting to 'use a Bloom filter' for everything, is what shows judgment rather than pattern-matching."
          ]
        }},
      { id: "sd-53", t: "Distributed ID generation (Snowflake-style)", d: "Medium",
        desc: "Every sharded system eventually needs globally unique, roughly time-sortable IDs minted with zero coordination on the hot path.",
        notes: {
          explain: [
            "A single auto-incrementing DB counter doesn't survive sharding — there's no longer one database holding the canonical next value, and routing every mint through one coordinator reintroduces the exact bottleneck partitioning was meant to remove. The requirement is usually: unique across the whole fleet, roughly sortable by creation time (useful for pagination/range queries without a separate timestamp column), and mintable locally with zero coordination on the request path.",
            "Snowflake's answer packs a 64-bit ID as [41 bits timestamp][10 bits worker ID][12 bits per-machine sequence number, reset each millisecond]. Timestamp-first makes IDs k-sortable even though no machine ever talks to another while minting. The worker ID is assigned once at startup (config, or a short-lived coordination step against ZooKeeper/etcd — the only coordination in the whole scheme, amortized over the machine's entire lifetime, not per-ID); the sequence number absorbs multiple IDs minted in the same millisecond on the same machine."
          ],
          diagram: { type: "flow", caption: "Each field is sized so no two machines can ever collide without ever talking to each other.",
            steps: [
              { label: "Timestamp (41 bits)", note: "ms since custom epoch — makes IDs k-sortable" },
              { label: "Worker ID (10 bits)", note: "assigned once at startup, not per-ID", arrowLabel: "→" },
              { label: "Sequence (12 bits)", note: "resets every ms, absorbs same-ms bursts", arrowLabel: "→" }
            ]},
          tricks: [
            "The insight worth stating: the only coordination in the whole scheme is assigning a worker ID once at process startup — after that every machine mints IDs independently forever, a mathematical uniqueness guarantee rather than a runtime check.",
            "Clock skew is the real production gotcha — if a machine's clock jumps backward (NTP correction), it can mint a timestamp it already used. The standard mitigation is detecting backward jumps and refusing to mint until the clock catches back up.",
            "UUID v4 needs no coordination and no worker ID, but isn't sortable and is 128 bits — pick Snowflake-style IDs specifically when index locality or range-scan-by-recency matters, not as a default over UUIDs."
          ]
        }}
    ]},
    { name: "Distributed Data & Streaming (deepen your existing edge)", items: [
      { id: "sd-14", t: "Kafka internals deep dive: partitions, ISR, replication, controller election", d: "Hard",
        desc: "Go one level below Kafka Streams into the broker internals.", res: "Kafka docs", url: "https://kafka.apache.org/documentation/",
        notes: {
          explain: [
            "A topic is split into partitions, each an append-only log; each partition has one leader broker (handles all reads/writes for that partition) and N-1 followers replicating it. The ISR (in-sync replica set) is the subset of followers caught up within a configurable lag threshold — only ISR members are eligible to become leader on failover, which is what prevents silently promoting a stale replica and losing committed data. `acks=all` means the leader waits for all *current ISR members* (not all replicas) to ack before confirming the write — combined with `min.insync.replicas`, this is the real durability/availability knob: if the ISR shrinks below that minimum, the partition rejects writes rather than accepting them under-replicated.",
            "Historically a single controller broker (elected via ZooKeeper) tracked partition leadership and pushed metadata to all brokers; modern Kafka (KRaft mode) replaced ZooKeeper with a Raft-based quorum of controller nodes managing this metadata directly, removing the external dependency and speeding up controller failover and partition-count scaling. Either way, the mechanism to be able to explain is: on broker failure, the controller detects it via missed heartbeats, and for every partition where that broker was leader, picks a new leader from the ISR and propagates the updated leader/ISR metadata to all brokers."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "acks=1", points: ["Leader acks after its own write", "Lowest write latency", "Data loss possible if leader fails before replication", "No min.insync.replicas enforcement needed"] },
              { title: "acks=all + min.insync.replicas", points: ["Waits for all current ISR members to ack", "Rejects writes if ISR shrinks below the minimum", "Higher write latency, bound by slowest ISR member", "Real durability guarantee, not just a setting name"] }
            ]},
          tricks: [
            "Say ISR, not just 'replicas' — a replica that's fallen too far behind is removed from the ISR and is no longer eligible for leader election, even though it still physically holds a stale copy of the data.",
            "`acks=all` alone isn't sufficient for strong durability if `min.insync.replicas=1` — with replication factor 3 but min.insync.replicas=1, a single in-sync replica (even just the leader) satisfies acks=all, so you can still lose data if that node dies before followers catch up. Pair the two settings when durability is the question."
          ]
        }},
      { id: "sd-15", t: "Flink state management & checkpointing at scale (RocksDB state backend, incremental checkpoints)", d: "Hard",
        desc: "Direct extension of your AZ-aware Flink orchestration work.", res: "Flink docs", url: "https://nightlies.apache.org/flink/flink-docs-stable/",
        notes: {
          explain: [
            "Flink keeps operator state (aggregations, windows, joins) local to each task, backed by either an in-memory/heap state backend (fast, but bounded by JVM heap and lost if the process dies before a checkpoint) or RocksDB — state spills to local disk as an LSM-tree, so state size can exceed available RAM, the same tradeoff already navigated running RocksDB in production. Checkpointing periodically snapshots this distributed state to durable storage (S3/HDFS) using an asynchronous barrier-based snapshot algorithm: the JobManager injects a 'checkpoint barrier' marker into the source streams, and as each operator receives the barrier on all its input channels it snapshots its own state and forwards the barrier downstream — letting checkpointing happen without pausing the whole pipeline.",
            "Incremental checkpointing (RocksDB backend only) uploads just the changed SST files since the last checkpoint instead of the full state, which is what makes checkpointing large keyed state (many GB/TB) affordable at scale — full snapshots of large state would make checkpoint intervals impractically slow. On recovery, Flink restores the latest complete checkpoint to all task managers and replays source input from the recorded offsets (e.g. Kafka consumer offsets) since that checkpoint — this combination (periodic state snapshot + replayable source) is what delivers exactly-once processing guarantees even across task manager failures, and is the direct extension of the AZ-aware orchestration work already done."
          ],
          diagram: { type: "flow", caption: "Asynchronous barrier snapshot — the pipeline keeps flowing while state is snapshotted operator by operator.",
            steps: [
              { label: "Source", note: "injects checkpoint barrier into the stream" },
              { label: "Operator A", note: "snapshots state on barrier receipt", arrowLabel: "barrier →" },
              { label: "Operator B", note: "snapshots state on barrier receipt", arrowLabel: "barrier →" },
              { label: "Sink / checkpoint complete", note: "durable snapshot in S3/HDFS", arrowLabel: "→" }
            ]},
          tricks: [
            "Incremental checkpoints reduce checkpoint upload/IO cost, not necessarily worst-case restore time — restoring from a chain of incrementals can still mean reading a lot of SST files; interviewers sometimes probe this distinction.",
            "State TTL and RocksDB compaction interact — without configured state TTL, RocksDB-backed keyed state grows unbounded and compaction gets progressively more expensive, a very real production gotcha worth naming from direct experience."
          ]
        }},
      { id: "sd-16", t: "Distributed consensus: Raft, Paxos, ZAB — know one deeply enough to explain leader election", d: "Hard",
        desc: "You don't need to reimplement Raft in an interview — explain how a leader gets elected, how a value gets committed with quorum safety, and why that guarantees no split-brain.", res: "raft.github.io", url: "https://raft.github.io/",
        notes: {
          explain: [
            "All three protocols solve the same problem: get a cluster to agree on a sequence of values even when nodes crash or messages are delayed, without ever agreeing on two different values for the same slot (safety), while still making progress as long as a majority of nodes are up (liveness). Raft is the one worth knowing deeply — it's explicitly designed for understandability. Nodes are Follower, Candidate, or Leader; a Candidate that doesn't hear from a leader within a randomized election timeout increments a term number and requests votes; whichever candidate gets votes from a majority becomes leader for that term. The randomized timeout is what avoids repeated split votes — different followers time out at different moments, so one candidate usually gets ahead of the others.",
            "Once elected, the leader is the only node accepting writes; it appends each entry to its local log and replicates it to followers, considering an entry 'committed' only once a majority have persisted it — at that point it's safe to apply and acknowledge, because any future leader election also requires a majority vote, and that majority is guaranteed to overlap with at least one node holding the committed entry. That overlap is exactly why split-brain can't produce a durable inconsistency: a stale leader partitioned from the majority can't win re-election or commit new entries. ZAB and Paxos solve the same problem with different mechanics — you don't need the wire-level differences, just that they exist and Raft is generally preferred for new systems for clarity of implementation."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Follower", note: "election timeout elapses (randomized)" },
              { label: "Candidate", note: "increments term, requests votes", arrowLabel: "→" },
              { label: "Leader", note: "wins majority vote", arrowLabel: "→" },
              { label: "Replicate + commit", note: "entry committed once majority persists it", arrowLabel: "→" }
            ]},
          tricks: [
            "The safety property to state precisely: a value is committed once a majority has it, and any future leader must also win a majority vote — so any two majorities always overlap by at least one node, which is what prevents two different values ever being committed for the same slot. This one sentence is usually what's being fished for.",
            "Consensus (Raft/Paxos) elects a leader and commits a replicated log; it's not the same thing as eventual consistency, nor the same as Kafka's ISR-based replication (leader-based replication with an external controller doing leader election) — don't conflate the two when asked to compare."
          ]
        }},
      { id: "sd-17", t: "Two-phase commit vs Saga pattern vs outbox pattern", d: "Medium",
        desc: "Three different answers to 'how do I get atomicity across services that don't share a database' — with very different availability and complexity costs.",
        notes: {
          explain: [
            "Two-phase commit (2PC) is the classic distributed-transaction answer: a coordinator asks every participant to 'prepare' (lock resources, promise they can commit) in phase one, and only if all participants say yes does it tell everyone to 'commit' in phase two. It gives real atomicity, but every participant holds locks for the whole round-trip, hurting throughput, and if the coordinator crashes between phases, participants can be left blocked holding locks indefinitely — why 2PC is rare across independently-owned services today, even though it's fine inside a single DB engine's internal transaction manager.",
            "The Saga pattern avoids cross-service locking entirely: model the operation as a sequence of local transactions, each in its own service, each with a compensating action (e.g. 'reserve inventory' ↔ 'release inventory') that undoes it if a later step fails. No global lock, no blocking coordinator — but atomicity is traded for eventual consistency, and every step has to be designed to be safely compensable and idempotent, since compensations can themselves be retried.",
            "The outbox pattern solves a narrower, very common problem: how to atomically 'update my database AND publish an event' when the DB and the message broker are two different systems that can't share a transaction. Write the event into an outbox table in the same local DB transaction as the business data change — atomic by definition, same DB, same transaction — then a separate relay process (or CDC, tying directly to sd-18) tails that table and publishes to the broker asynchronously. This guarantees the event is published if and only if the DB write committed, without needing 2PC between the DB and the broker."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Two-phase commit", points: ["Real cross-service atomicity", "Coordinator + participant locking for the whole round-trip", "Coordinator crash can leave locks held indefinitely", "Rare across independently-owned services"] },
              { title: "Saga (+ outbox)", points: ["No cross-service locks — local transactions + compensations", "Eventual consistency, not atomicity", "Every step must be compensable and idempotent", "Outbox solves the saga's own dual-write problem"] }
            ]},
          tricks: [
            "The outbox pattern is the practical building block that makes sagas reliable — without it, 'update DB' and 'publish next saga step's event' is itself a dual-write problem. Naming outbox as the fix to a saga's own dual-write problem is a strong, connective answer.",
            "2PC's real failure mode is availability, not correctness — a coordinator crash mid-protocol can leave participants blocked holding locks with no way to know whether to commit or abort until the coordinator recovers. That's the concrete reason it's avoided at scale, not just 'it doesn't scale.'"
          ]
        }},
      { id: "sd-18", t: "Change Data Capture (CDC) pipelines (Debezium-style)", d: "Medium",
        desc: "Stream every row-level insert/update/delete out of a database's transaction log, without touching application code or adding dual-write risk.",
        notes: {
          explain: [
            "CDC tools like Debezium tail a database's write-ahead log or binlog (Postgres logical replication slots, MySQL binlog) — the same durable, ordered record the database itself uses for its own replication — and turn each committed change into an event published to a stream, typically Kafka. Because it reads the transaction log rather than polling tables or requiring the application to explicitly publish events, it captures every committed change exactly as the database sees it (with before/after row images), with low latency and no dual-write risk — the same risk the outbox pattern (sd-17) solves for a narrower case. CDC is the general infrastructure-level version of that idea: instead of every service implementing its own outbox, CDC gets the events for free from the database's own commit log.",
            "This is the backbone of common architectures: keeping a search index or cache in sync with a system-of-record database, feeding a data lake/warehouse incrementally instead of via nightly batch dumps, and driving event-driven workflows off changes made by a legacy system that doesn't natively publish events at all."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "DB write", note: "committed transaction" },
              { label: "WAL / binlog", note: "durable, ordered change log", arrowLabel: "tailed by →" },
              { label: "CDC connector", note: "Debezium reads the log", arrowLabel: "→" },
              { label: "Kafka topic", note: "downstream consumers: search index, cache, warehouse", arrowLabel: "→" }
            ]},
          tricks: [
            "CDC vs outbox is a frequent follow-up: outbox requires the app to write an explicit event row in its own transaction (more control over event shape, works everywhere); CDC captures raw row changes with zero app changes but ties you to the DB's internal change format and can leak implementation details (a column rename becomes a schema-change event) unless a transformation layer is added.",
            "Log-based CDC sees deletes; polling-based 'diff the table' approaches don't — a row deleted between two polls is invisible to a query against current table state. Naming this asymmetry is the concrete reason log-based CDC is preferred over polling/trigger-based approaches."
          ]
        }},
      { id: "sd-19", t: "Exactly-once vs at-least-once tradeoffs across the pipeline, not just in one hop", d: "Hard",
        desc: "You've done this in Kafka Streams — extend the reasoning end-to-end across producer→broker→consumer→sink.",
        notes: {
          explain: [
            "At-least-once means delivery is guaranteed but duplicates are possible (any retry after a lost ack, or reprocessing after a crash before an offset commit); at-most-once means messages might be dropped but never duplicated (fire-and-forget, offset committed before processing); exactly-once means each message affects the end state exactly as if processed once. True end-to-end exactly-once *delivery* is essentially impossible over an unreliable network — what real systems build instead is at-least-once delivery plus idempotent/transactional processing at each hop, which nets out to exactly-once *effects*.",
            "Doing this end-to-end (not just within Kafka Streams, which handles it internally via transactional producers, read_committed consumers, and offset commits tied to output writes) means reasoning about every hop separately: producer→broker needs an idempotent producer (producer ID + sequence number dedupes retried sends); broker→consumer needs offset commits to be atomic with whatever side effect that message caused; consumer→sink needs the sink write to be idempotent (a dedup key, the sd-13 pattern) or transactional. Any hop that's at-least-once and *not* idempotent reintroduces duplicates into the end-to-end guarantee no matter how strong the other hops are — the guarantee is only as strong as its weakest hop."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Producer", note: "idempotent producer: ID + sequence number" },
              { label: "Broker", note: "durable, ordered log", arrowLabel: "→" },
              { label: "Consumer", note: "offset commit atomic with side effect", arrowLabel: "→" },
              { label: "Sink", note: "idempotent or transactional write", arrowLabel: "→" }
            ]},
          tricks: [
            "State the framing explicitly: 'exactly-once' almost always really means 'at-least-once delivery + idempotent processing,' not that duplicates never occur on the wire. Interviewers specifically probe for this because the term gets thrown around loosely.",
            "End-to-end exactly-once is only as strong as its weakest hop — idempotent producers and transactional stream processing don't help if the final sink write isn't idempotent or transactional. Walk the entire pipeline, not just the part that's most familiar."
          ]
        }}
    ]},
    { name: "RabbitMQ Deep Dive", items: [
      { id: "sd-39", t: "RabbitMQ's core model: Producer → Exchange → Binding → Queue → Consumer", d: "Medium",
        desc: "The one fact that trips up everyone coming from Kafka/SQS: a producer never publishes directly to a queue — it always publishes to an exchange.",
        notes: {
          explain: [
            "RabbitMQ implements AMQP, and AMQP's whole design centers on decoupling 'where a message is sent' from 'where it ends up.' A producer publishes a message to an EXCHANGE with a routing key attached. The exchange doesn't store anything — its only job is to look at its bindings (rules) and decide which queue(s), if any, the message should be copied into. A queue is the only thing that actually stores messages, and a consumer only ever reads from a queue, never from an exchange directly.",
            "This is the single biggest conceptual difference from Kafka (producer writes straight into a partition) or SQS (producer writes straight into a queue): RabbitMQ inserts a routing layer between publish and storage, which is what makes fanout, pattern-based routing, and content-based routing possible without the producer knowing anything about consumers."
          ],
          diagram: {
            type: "flow",
            caption: "Even publishing 'directly to a queue' in client libraries is really publishing to the nameless default exchange with the queue name as the routing key.",
            steps: [
              { label: "Producer", note: "publishes with a routing key" },
              { label: "Connection + Channel", note: "TCP + lightweight virtual conn", arrowLabel: "→" },
              { label: "Exchange", note: "routing logic only, stores nothing", arrowLabel: "→" },
              { label: "Bindings", note: "rules: which queues match", arrowLabel: "→" },
              { label: "Queue", note: "actual message storage", arrowLabel: "→" },
              { label: "Consumer", note: "reads + acks", arrowLabel: "→" }
            ]
          },
          tricks: [
            "'Publish to a queue' is a common but technically imprecise phrase — even the simplest client call publishes to the built-in nameless default exchange, which has an implicit binding to every queue using the queue's name as the routing key. Knowing this distinction is a strong, cheap signal in an interview.",
            "If a message doesn't match any binding, it's silently dropped by default — the exchange doesn't error, doesn't queue it anywhere, it just vanishes. Setting the `mandatory` flag on publish is what makes RabbitMQ return it to the publisher instead."
          ]
        }
      },
      { id: "sd-40", t: "Connections vs. Channels", d: "Medium",
        desc: "A Connection is a real TCP socket; a Channel is a cheap, lightweight virtual connection multiplexed inside it — this is why you open one connection per app and many channels inside it, not the reverse.",
        notes: {
          explain: [
            "Opening and tearing down a TCP connection (plus the AMQP handshake/auth on top of it) is comparatively expensive. If every publish or consume operation needed its own connection, a busy service would spend more time negotiating sockets than doing useful work. A Channel solves this: it's a lightweight, independent logical stream multiplexed over a single shared TCP connection — you can have dozens of channels doing unrelated publishing/consuming/queue-management work over one connection, each with its own AMQP method IDs so RabbitMQ can tell their frames apart."
          ],
          diagram: {
            type: "compare",
            columns: [
              { title: "Connection", points: ["A real TCP socket to the broker", "Established via the AMQP protocol (e.g. amqp://host:5672)", "Expensive to open/close", "One per application/service instance is typical"] },
              { title: "Channel", points: ["A virtual connection multiplexed inside one TCP connection", "Cheap to open — many per connection is normal", "Used for publishing, consuming, and queue/exchange management", "NOT thread-safe — don't share one channel across threads"] }
            ]
          },
          tricks: [
            "A channel is not thread-safe — sharing a single channel across multiple threads for concurrent publishing is a classic production bug (interleaved frames corrupt the channel's state). The standard fix is one channel per thread, or a channel pool.",
            "If you're opening a new Connection per request/message instead of reusing one long-lived connection with per-operation channels, that's a strong signal of a design mistake — say so unprompted if asked to review such code."
          ]
        }
      },
      { id: "sd-41", t: "Virtual Hosts (vHosts) — logical isolation", d: "Easy",
        desc: "Think of a vHost the way you'd think of a database inside a single DBMS instance — its own exchanges, queues, and permissions, isolated from every other vHost on the same broker.",
        notes: {
          explain: [
            "A single RabbitMQ broker can host multiple vHosts, each with a completely separate namespace of exchanges, queues, bindings, and user permissions. The default vHost is `/`. This is the standard mechanism for multi-tenancy (one broker, many isolated tenants) or environment separation (`/dev`, `/staging`, `/prod` all on one cluster) without running separate broker clusters for each."
          ],
          tricks: ["A vHost is an authorization/namespace boundary, not a performance-isolation one — all vHosts on a broker still share the same underlying hardware/Erlang VM resources, so noisy-neighbor problems across vHosts are still possible even though the namespaces are fully separate."]
        }
      },
      { id: "sd-42", t: "Exchange types: Direct, Topic, Fanout, Headers", d: "Hard",
        desc: "The exchange type is what determines the routing algorithm — this is the single most-asked RabbitMQ interview topic, and each type answers a different question about how to match a message to queues.",
        notes: {
          explain: [
            "Direct exchange: routes a message to a queue only if the message's routing key EXACTLY matches the queue's binding key — a message with key 'error' goes only to a queue bound with 'error'. Topic exchange: relaxes that to wildcard pattern matching on dot-separated routing keys — `*` matches exactly one word, `#` matches zero or more words, so a binding of `order.*.created` matches `order.us.created` but not `order.created` or `order.us.eu.created`. Fanout exchange: ignores the routing key entirely and broadcasts the message to every queue bound to it — the standard choice for pub/sub-style 'notify everyone' patterns. Headers exchange: ignores the routing key completely and matches on message header key/value pairs instead, using an `x-match` argument of `all` (every header must match) or `any` (at least one must match) — useful when routing decisions depend on more than one attribute at once."
          ],
          code: [{ lang: "java", caption: "The routing-key/binding-key relationship for direct vs topic — the part people get wrong under pressure", src:
`// Direct exchange — exact match only
channel.bindQueue("errorQueue", "logs_direct", "error");
// A message published with routing key "error" -> delivered.
// A message published with routing key "error.db" -> NOT delivered (not exact).

// Topic exchange — wildcard matching on dot-separated segments
channel.bindQueue("usOrdersQueue", "orders_topic", "order.us.*");
// "order.us.created"  -> matches (* = exactly one word)
// "order.us.eu.created" -> does NOT match *, but WOULD match "order.us.#"
// "order.created"      -> does NOT match (missing the "us" segment)`}],
          diagram: {
            type: "compare",
            columns: [
              { title: "Direct", points: ["Exact routing-key match", "Simple point-to-point-style routing", "e.g. route by log level: 'error', 'info'"] },
              { title: "Topic", points: ["Wildcard match: * = one word, # = zero-or-more", "Pattern-based routing on structured keys", "e.g. 'order.us.*' , 'order.#'"] }
            ]
          },
          tricks: [
            "Fanout ignores the routing key completely — binding a fanout exchange with a specific routing key is a no-op that confuses people reading the code later; don't pass a meaningful key to a fanout binding.",
            "Headers exchanges are rarely used in practice compared to the other three, but interviewers ask about them specifically to see if you know `x-match: all` vs `x-match: any` — all headers must match vs at least one, respectively.",
            "A strong answer to 'which exchange type would you use for X' always ties the choice back to the actual routing requirement: one-to-one or you-know-the-exact-key → direct; hierarchical/pattern-based → topic; broadcast-to-everyone → fanout; multi-attribute routing → headers."
          ]
        }
      },
      { id: "sd-43", t: "Bindings — the rule connecting exchange to queue", d: "Medium",
        desc: "A binding is what actually makes an exchange able to route anything — without at least one binding, an exchange just drops every message it receives.",
        notes: {
          explain: [
            "A binding is a rule, created explicitly by the application (or an admin), that connects a specific exchange to a specific queue, optionally with a binding key (for direct/topic) or header-match arguments (for headers exchanges). One exchange can have bindings to many queues (fanning a message out to several places), and one queue can be bound to many exchanges (collecting messages from several sources into one place) — bindings form a many-to-many graph, not a strict tree."
          ],
          code: [{ lang: "java", caption: "One exchange, two bindings with different routing keys — a common fan-out-by-key pattern", src:
`channel.bindQueue("inventoryQueue", "order_events", "order.created");
channel.bindQueue("emailQueue", "order_events", "order.created");
// A single publish to "order_events" with routing key "order.created"
// is delivered to BOTH queues — bindings are not mutually exclusive.`}],
          tricks: ["The single most common RabbitMQ debugging trap: 'I published a message and it just disappeared.' Nine times out of ten, the cause is a missing or misconfigured binding — always check bindings first, before suspecting the consumer or the network."]
        }
      },
      { id: "sd-44", t: "Message anatomy: payload + properties", d: "Easy",
        desc: "A message is a payload (opaque bytes to RabbitMQ) plus properties — contentType, deliveryMode, and custom headers — that both your application and RabbitMQ itself can act on.",
        notes: {
          code: [{ lang: "json", caption: "deliveryMode 2 = persistent (survives a broker restart, if the queue is ALSO durable); 1 = transient", src:
`{
  "body": "{ \\"orderId\\": 123 }",
  "properties": {
    "contentType": "application/json",
    "deliveryMode": 2,
    "headers": { "region": "india" }
  }
}`}],
          tricks: ["`deliveryMode: 2` alone does NOT guarantee a message survives a broker restart — the queue it lands in must also be declared `durable: true`. Durability requires both halves; either one alone is not enough, and this exact gap is a favorite interview trap.", "Custom headers (like `region` above) are exactly what a Headers exchange (sd-42) matches on — they're not just for application-level metadata."]
        }
      },
      { id: "sd-45", t: "Queue properties: durable, exclusive, auto-delete, TTL, DLX, lazy mode", d: "Medium",
        desc: "Every queue is declared with a small set of properties that control its durability, ownership, and memory behavior — knowing this table cold is table stakes for a RabbitMQ interview.",
        notes: {
          code: [{ lang: "java", caption: "A queue declaration touching most of the properties at once", src:
`await channel.assertQueue("orderQueue", {
    durable: true,      // survives broker restart (paired with persistent messages)
    exclusive: false,   // false = usable by more than one connection
    autoDelete: false,  // false = queue survives even with zero consumers
    arguments: {
        "x-message-ttl": 30000,               // messages expire after 30s if unconsumed
        "x-dead-letter-exchange": "dlx",       // expired/rejected messages go here
    }
});`}],
          diagram: {
            type: "tree",
            root: "Queue properties",
            children: [
              { label: "durable — survives broker restart (needs persistent messages too)" },
              { label: "exclusive — usable by only the declaring connection; auto-deletes when it closes" },
              { label: "auto-delete — deleted once its last consumer disconnects" },
              { label: "TTL (x-message-ttl) — messages expire after N ms" },
              { label: "DLX (x-dead-letter-exchange) — where rejected/expired messages get routed" },
              { label: "lazy mode (x-queue-mode) — stores messages on disk immediately to save RAM" }
            ]
          },
          tricks: ["`exclusive: true` is easy to confuse with `durable` — exclusive is about connection ownership (only the declaring connection can use it, and it's deleted when that connection closes), completely unrelated to surviving a restart."]
        }
      },
      { id: "sd-46", t: "Queue behavior types: Priority, DLQ, Lazy, TTL, Single Active Consumer, Stream", d: "Hard",
        desc: "RabbitMQ doesn't have named queue 'types' the way it has named exchange types — special behavior comes entirely from the arguments you pass when declaring the queue.",
        notes: {
          explain: [
            "This is a subtle but important distinction from exchanges: a Direct/Topic/Fanout/Headers exchange really is a different type, chosen at creation time. A queue, by contrast, is always just 'a queue' — what looks like a 'priority queue' or 'TTL queue' is actually a completely standard queue declared with a specific argument (`x-max-priority`, `x-message-ttl`, etc.) that changes its behavior. Recognizing this saves you from a wrong answer if asked 'what are the queue types in RabbitMQ.'"
          ],
          diagram: {
            type: "tree",
            root: "Special queue behaviors (all just arguments on assertQueue)",
            children: [
              { label: "Priority Queue — x-max-priority: N, higher-priority messages jump the line" },
              { label: "Dead Letter Queue — x-dead-letter-exchange routes failed/expired/rejected messages here" },
              { label: "Lazy Queue — x-queue-mode: 'lazy', stores to disk immediately to save RAM, slightly slower" },
              { label: "TTL Queue — x-message-ttl: N, messages auto-expire after N ms" },
              { label: "Single Active Consumer — x-single-active-consumer: true, only one consumer processes at a time (order-preserving); a backup takes over if it disconnects" },
              { label: "Stream Queue — append-only log with offset-based replay, RabbitMQ's answer to Kafka-style semantics" }
            ]
          },
          code: [{ lang: "java", caption: "Priority queue setup + a high-priority publish", src:
`await channel.assertQueue("priorityQueue", { arguments: { "x-max-priority": 10 } });
channel.sendToQueue("priorityQueue", Buffer.from("Urgent task"), { priority: 8 });
// Delivered ahead of already-queued lower-priority messages, even though it arrived later.`}],
          tricks: [
            "Single Active Consumer is the direct answer to 'how do you get strict in-order processing with RabbitMQ while still having a hot standby for failover' — most people only know about competing consumers (parallel, unordered) or a single consumer with no failover.",
            "The Stream Queue type is the newest of these and worth naming specifically if a comparison to Kafka comes up — it's RabbitMQ's own attempt at a replayable, offset-addressable log, closing the exact gap sd-9's Kafka-vs-broker comparison describes."
          ]
        }
      },
      { id: "sd-47", t: "Consumer acknowledgements: ack, nack, and requeue semantics", d: "Medium",
        desc: "Manual acknowledgement (recommended) vs. auto-ack (less reliable) is the whole game for not silently losing messages when a consumer crashes mid-processing.",
        notes: {
          explain: [
            "With auto-ack, RabbitMQ considers a message successfully delivered — and removes it — the instant it hands the message to the consumer's TCP socket, before the consumer has done any actual work. If the consumer then crashes while processing, that message is gone forever with no way to know it was ever lost. With manual acknowledgement, RabbitMQ keeps the message in an 'unacked' state tied to the consumer's channel until the consumer explicitly acks it after successfully finishing the work; if the consumer's connection/channel closes before that ack arrives, RabbitMQ automatically requeues the message for delivery to another consumer."
          ],
          code: [{ lang: "java", caption: "Manual ack after successful processing — the safe default", src:
`channel.consume("orderQueue", (msg) => {
    const order = JSON.parse(msg.content.toString());
    console.log("Processing order:", order.orderId);
    // ... do the actual work ...
    channel.ack(msg);   // only now does RabbitMQ consider it safely delivered
});`}],
          diagram: {
            type: "flow",
            caption: "If the consumer crashes anywhere before the ack, RabbitMQ detects the closed channel and automatically requeues the message — no message is lost, though it may be processed twice (at-least-once, not exactly-once).",
            steps: [
              { label: "RabbitMQ delivers", note: "message sent to consumer" },
              { label: "Consumer processes", note: "the actual work happens here", arrowLabel: "→" },
              { label: "channel.ack(msg)", note: "explicit success signal", arrowLabel: "→" },
              { label: "RabbitMQ removes", note: "message permanently deleted", arrowLabel: "→" }
            ]
          },
          tricks: [
            "`channel.nack(msg, false, true)` requeues the message; `channel.nack(msg, false, false)` drops it (or routes it to a DLQ if one is configured) — the third argument is the one people mix up under pressure.",
            "`reject()` is the single-message-only sibling of `nack()` — `nack` additionally supports a `multiple` flag to negatively-acknowledge a whole batch of unacked messages at once, which `reject` cannot do.",
            "Manual ack guarantees at-least-once delivery, not exactly-once — a consumer can still process a message successfully and crash right before sending the ack, causing a harmless-looking duplicate redelivery. Idempotent consumers are still the caller's responsibility, exactly as with Kafka."
          ]
        }
      },
      { id: "sd-48", t: "Publisher confirms — the producer-side half of reliability", d: "Medium",
        desc: "Consumer ack (sd-47) only protects the delivery-to-consumer half of the journey — publisher confirms are what tell the PRODUCER that RabbitMQ actually received and persisted the message in the first place.",
        notes: {
          explain: [
            "Without publisher confirms, a producer calls publish() and moves on with no idea whether the message actually reached the broker, or was lost to a network blip or a broker restart mid-flight. Putting a channel into confirm mode makes RabbitMQ send an explicit ack back to the producer once the message is safely queued (and written to disk, if the queue is durable and the message persistent) — giving the producer a real signal to retry on, instead of just hoping the publish succeeded."
          ],
          tricks: ["A complete reliability story needs BOTH halves: publisher confirms (did the broker actually get it?) and consumer acks (did the consumer actually finish processing it?). An answer that only mentions one side is the classic tell of someone who's used RabbitMQ but hasn't had to reason about failure modes in production."]
        }
      },
      { id: "sd-49", t: "RabbitMQ vs. Kafka — the deeper interview framing", d: "Medium",
        desc: "Beyond sd-9's durability/replay framing, the sharper way to contrast them is 'smart broker, dumb consumer' (RabbitMQ) vs. 'dumb broker, smart consumer' (Kafka).",
        notes: {
          explain: [
            "RabbitMQ pushes routing intelligence into the broker itself — exchanges, binding patterns, priority, per-message TTL, all evaluated broker-side before a consumer ever sees a message, which is powerful but adds per-message CPU work on the broker and caps how far a single broker scales. Kafka pushes that intelligence out to the edges: the broker is a dumb, extremely fast append-only log with almost no per-message routing logic, and all the smarts (which partition, what offset, how to interpret the stream) live in the producer/consumer client libraries — which is exactly why Kafka comfortably handles orders of magnitude more raw throughput than RabbitMQ, at the cost of RabbitMQ's much richer built-in routing."
          ],
          tricks: ["When asked to choose between them, lead with the workload shape, not a feature checklist: complex routing/priority/low-latency task distribution at moderate volume → RabbitMQ; massive-throughput event streaming with multiple independent replayable consumers → Kafka. Naming the 'smart broker vs. smart client' framing explicitly is a strong signal you understand WHY the throughput difference exists, not just that it exists."]
        }
      },
      { id: "sd-50", t: "Rapid-fire RabbitMQ interview questions", d: "Medium",
        desc: "The questions that come up often enough to be worth having crisp, one-breath answers ready for.",
        notes: {
          explain: ["These are phrased exactly as they tend to get asked — practice saying the answers out loud, not just recognizing them as true."],
          tricks: [
            "Q: What happens if you publish a message that matches no binding? A: It's silently dropped by default — set the `mandatory` flag on publish to have it returned to the producer instead.",
            "Q: Why use channels instead of just opening more connections? A: TCP connections are expensive to open/close; channels are cheap virtual streams multiplexed over one shared connection.",
            "Q: Direct vs. Topic exchange, in one sentence? A: Direct requires an exact routing-key match; Topic allows wildcard patterns (`*` = one word, `#` = zero-or-more words) in the binding key.",
            "Q: How do you guarantee a message survives a broker restart? A: The queue must be `durable: true` AND the message must be published with `deliveryMode: 2` (persistent) — either alone is not sufficient.",
            "Q: What's the difference between `nack` and `reject`? A: `reject` only ever affects one message; `nack` can also act on a whole batch of unacked messages at once via its `multiple` flag.",
            "Q: What happens if a consumer crashes before acking a message? A: RabbitMQ detects the closed channel/connection and automatically requeues the unacked message for another consumer — at-least-once, not exactly-once.",
            "Q: What is a Dead Letter Exchange for? A: Capturing messages that are rejected, expire via TTL, or exceed a queue length/size limit, routing them somewhere inspectable instead of losing them silently.",
            "Q: Does RabbitMQ have a 'priority queue' type? A: No — it's a standard queue declared with the `x-max-priority` argument; RabbitMQ has exchange types, not queue types."
          ]
        }
      }
    ]},
    { name: "Design Case Studies (practice out loud)", items: [
      { id: "sd-20", t: "Design a distributed rate limiter", d: "Medium",
        desc: "The single-node algorithm (sd-10) is easy — the hard part is making the counter correct and fast when many gateway instances share one limit.",
        notes: {
          explain: [
            "The design tension: rate limiting needs a shared, consistent counter so the limit is enforced across every gateway/service instance, not per-instance — but that shared counter is a potential bottleneck and single point of failure sitting on the hot path of every request.",
            "The standard approach is a centralized fast store (Redis) holding the counter/token-bucket state, with the check-and-increment implemented as a single atomic Lua script or `INCR`+`EXPIRE` so concurrent requests can't race the counter. For very high throughput, name the alternative: local (per-node) rate limiting, where each node enforces a fraction of the global limit — no network hop, no shared dependency, but coordination is approximate, since nodes can drift and the aggregate limit becomes a soft ceiling rather than exact.",
            "The tradeoff to name explicitly: centralized Redis gives an exact, globally-enforced limit but adds a network round-trip and a shared dependency to every request; local/sharded counters are fast and available even if the coordination store is down, at the cost of exactness — a burst can slightly exceed the intended aggregate limit if traffic isn't evenly spread across nodes."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Centralized (Redis)", points: ["Exact, globally-enforced limit", "Atomic Lua script or INCR+EXPIRE", "Adds network round-trip to every request", "Shared dependency / potential bottleneck"] },
              { title: "Local / sharded", points: ["Each node enforces a fraction of the global limit", "No network hop, no shared dependency", "Aggregate limit is approximate, can drift", "Survives the coordination store being down"] }
            ]},
          tricks: [
            "Say explicitly that the counter increment must be atomic (a single Redis Lua script, not a separate GET then SET) — a naive read-then-write from multiple gateway instances races and lets more requests through than the limit allows.",
            "Naming the local-approximate-limit alternative unprompted when asked about extreme scale shows judgment — global exactness isn't always worth the added latency and dependency, and many real cloud API gateways use it."
          ]
        }},
      { id: "sd-21", t: "Design a real-time payment processing / decision engine", d: "Hard",
        desc: "You've built a version of this in production — practice presenting it as a from-scratch design exercise.",
        notes: {
          explain: [
            "The design tension: a payment/decision engine must make a synchronous, low-latency accept/decline call (users are waiting) while being provably correct about money — no double-processing, no lost transactions, and a full audit trail, even under partial failures like a downstream fraud check timing out or a DB write succeeding while its response is lost.",
            "The standard approach: idempotency keys on every incoming request (sd-13) so client retries are safe; a synchronous fast path — cheap, millisecond-scale signals like cached risk scores and simple rule evaluation — gates the immediate accept/decline decision, while heavier analysis (ML fraud scoring, sd-22) runs asynchronously and can flag a transaction for reversal/hold after the fact rather than blocking the response. State transitions (pending → authorized → captured → settled) are modeled explicitly and durably, often via the outbox/saga pattern (sd-17), so a crash mid-flow can always be resumed or compensated rather than left ambiguous.",
            "The tradeoff to name: the latency requirement forces the synchronous decision to be made with incomplete information, since you can't wait for a slow fraud model — the design deliberately accepts that some fraud slips through the fast path and gets caught/reversed asynchronously. That's a business tradeoff (false-negative rate vs latency), not an oversight, and saying so explicitly is what interviewers are checking for."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Request + idempotency key", note: "client retry-safe" },
              { label: "Synchronous fast path", note: "cheap rules, cached risk score", arrowLabel: "→" },
              { label: "Accept / decline response", note: "milliseconds", arrowLabel: "→" },
              { label: "Async deep scoring", note: "ML fraud model; flag for reversal/hold if needed", arrowLabel: "in parallel" }
            ]},
          tricks: [
            "Say the state machine (pending/authorized/captured/settled or similar) out loud, and that every transition is durably recorded before external effects are considered final — this is what lets a crash mid-transaction be safely resumed instead of leaving money in an ambiguous state.",
            "Naming the synchronous-fast-path vs asynchronous-deep-analysis split as a deliberate tradeoff, not a limitation, is the strongest signal here — and pairs directly with real production experience running this kind of system."
          ]
        }},
      { id: "sd-22", t: "Design a real-time fraud/anomaly detection pipeline", d: "Hard",
        desc: "A streaming aggregation-and-scoring problem — the design center is maintaining low-latency, per-entity state (spend velocity, location, device fingerprint) across a high-volume event stream.",
        notes: {
          explain: [
            "The design tension: fraud signals depend on recent history per entity — how many transactions has this card made in the last 10 minutes, from how many distinct locations — which is inherently stateful, windowed aggregation over a high-throughput stream, and it has to run in real time (score before a payment is approved, or within seconds for async flagging), not as a nightly batch job.",
            "The standard approach is the exact streaming architecture already run in production: ingest events into Kafka, use a stream processor (Flink) with keyed state (partitioned by card/user/device ID) to maintain rolling windows — velocity counts, running aggregates — backed by RocksDB so state survives restarts via checkpointing (sd-15). A scoring step combines these streaming features with static/historical features from a feature store — rule-based thresholds for the cheap/fast signals, plus a call to an ML model for the more expensive score — to produce a risk score that either blocks synchronously or emits an async alert.",
            "The tradeoff to name: real-time features (this transaction, in the context of the entity's last N minutes of activity) catch things offline/batch features can't, like a burst of activity across geographies in 5 minutes — but keeping that state fresh and correctly partitioned at scale is the expensive part of the system. The ML model itself is often the easy part; stream state management is the hard part, and saying that explicitly is a useful reframing since it runs counter to what people assume going in."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Event stream", note: "Kafka" },
              { label: "Keyed windowed aggregation", note: "Flink, RocksDB state, checkpointed", arrowLabel: "→" },
              { label: "Feature join", note: "streaming features + feature store", arrowLabel: "→" },
              { label: "Scoring", note: "rules + ML model", arrowLabel: "→" },
              { label: "Block / alert", note: "sync or async", arrowLabel: "→" }
            ]},
          tricks: [
            "Say explicitly that the hard engineering problem is maintaining correct, low-latency per-entity state at scale — partitioning, windowing, checkpointing — not the ML model, which is often treated as a black-box scoring function in the interview. This reframing, from direct Flink+RocksDB production experience, is a strong differentiator.",
            "Distinguish synchronous blocking (score must complete before the payment is approved, tight latency budget, forces cheap/fast features only) from asynchronous flagging (computed after the fact, can use expensive features/models, result is a hold or a case for review) — conflating the two into one 'run the fraud model' step is a common gap."
          ]
        }},
      { id: "sd-23", t: "Design a notification system (multi-channel, at-least-once delivery)", d: "Medium",
        desc: "Fan-out across heterogeneous channels (push, SMS, email, in-app) each with different latency/reliability/rate-limit characteristics, with per-user preferences and dedup governing what actually gets sent.",
        notes: {
          explain: [
            "The design tension: a single logical event ('your order shipped') needs to become a decision — which channels, for which users, with what content — subject to per-user preferences, rate limits, and dedup (don't send the same notification twice if the triggering event is retried), before it fans out to several very different downstream providers (APNs/FCM for push, an SMS gateway, an email provider), each with its own latency, reliability, and throughput characteristics.",
            "The standard approach: an event enters a queue (Kafka), a notification service resolves it against preferences and templates, then fans out to per-channel worker queues so a slow or rate-limited channel — SMS providers are often the bottleneck — doesn't back up the others. Each channel worker retries at-least-once against the provider's API, deduped by an idempotency key derived from the original event, and tracks delivery status coming back from providers that support callbacks (push, email).",
            "The tradeoff to name: at-least-once is the only realistic guarantee, since you can't know a push notification truly reached a device without a receipt and providers themselves are at-least-once — so the system's correctness rests on idempotent send keys and dedup, not on achieving delivery exactly-once at the transport level."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Event", note: "e.g. order shipped" },
              { label: "Preferences + template resolution", note: "per-user opt-outs, content", arrowLabel: "→" },
              { label: "Per-channel queues", note: "push / SMS / email, isolated", arrowLabel: "→" },
              { label: "Provider APIs", note: "at-least-once, deduped by idempotency key", arrowLabel: "→" }
            ]},
          tricks: [
            "Per-channel queues, not one shared fan-out queue, is the detail that shows production thinking — SMS/carrier throughput is typically the slowest and most rate-limited channel, and without isolation a backlog there head-of-line-blocks push and email notifications that could otherwise go out immediately.",
            "The idempotency key must derive from the source event, not be generated fresh per send attempt — that's what prevents a retried event from producing a duplicate notification, the sd-13 pattern applied to a fan-out system."
          ]
        }},
      { id: "sd-24", t: "Design a URL shortener (classic warm-up — don't skip it)", d: "Easy",
        desc: "Deceptively simple until you're asked how you generate unique short codes at scale without a global counter becoming a bottleneck.",
        notes: {
          explain: [
            "The design tension: two operations with wildly different read:write ratios (write once on shorten, read/redirect many times), and the one interesting decision — how to generate a unique, short code for each long URL without a centralized counter serializing every write.",
            "Standard approaches: base62-encode an auto-incrementing ID — simple, guarantees uniqueness, but a single global counter is a write bottleneck and single point of failure unless you range-partition ID blocks across app servers (each server reserves a range, e.g. 1-1000, upfront, then mints codes locally without per-request coordination); or hash the long URL (e.g. first 7 chars of a base62-encoded hash) and handle the rare collision with a disambiguating suffix or salted retry. The read path is a simple key lookup that should be cached aggressively (sd-8/sd-12), since redirects vastly outnumber creations — and the 301-vs-302 redirect choice is worth a sentence: 302 keeps every click routed through your service (full analytics, more load), 301 lets browsers cache the redirect and skip your service on repeat visits (less load, but lost click analytics on cached hits)."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Counter-based (range-partitioned)", points: ["Base62-encode an auto-incrementing ID", "Guarantees uniqueness, no collisions", "Global counter is a bottleneck unless ranges are pre-allocated per server", "Predictable, short codes"] },
              { title: "Hash-based", points: ["Hash the long URL, take a prefix", "No coordination needed to generate", "Rare collisions need a suffix/salted retry", "Same URL always maps to same code (idempotent shortening)"] }
            ]},
          tricks: [
            "The pre-allocated ID-range trick — each app server reserves a block of IDs upfront (via a small counter service or a DB row with optimistic locking), then mints codes locally afterward — is the concrete answer to 'how do you avoid a single global counter becoming a bottleneck'; naming it unprompted separates this from a toy answer.",
            "301 vs 302 redirect is a real decision, not a footnote — 301 lets browsers cache and skip your service on repeat visits (less load, no analytics on cached hits); 302 keeps every click hitting your service (full analytics, more load)."
          ]
        }},
      { id: "sd-25", t: "Design a distributed cache / rate-limited API layer for a high-throughput service", d: "Medium",
        desc: "Combines two of the building blocks (sd-8 caching, sd-10 rate limiting) into one question about protecting a backend from both cold-cache stampedes and abusive/bursty clients.",
        notes: {
          explain: [
            "The design tension: a high-throughput API layer has to serve most requests from cache — the backend/DB can't take full read load — while also protecting itself from any single client overwhelming it, or a stampede after a cache miss. These are two separate mechanisms that have to compose correctly, not one.",
            "The standard approach: a distributed cache, sharded via consistent hashing (sd-7) so adding nodes doesn't invalidate the whole cache, sits in front of the backend with cache-aside reads and a TTL/invalidation strategy (sd-8) tuned to staleness tolerance. A token-bucket or sliding-window rate limiter (sd-10), backed by a fast shared store, gates requests per client/API-key before they reach the cache layer at all; separately, a single-flight lock per key prevents a cache-miss stampede — many concurrent requests for the same freshly-expired key all triggering redundant backend reads simultaneously.",
            "The tradeoff to name: rate limiting protects against *volume abuse* from a known client identity, while stampede protection guards against *legitimate* traffic overwhelming the backend on a miss — conflating the two, assuming rate limiting alone prevents backend overload, misses that a single popular key expiring can generate a huge burst of backend load even from well-behaved, rate-limit-compliant clients."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Client request", note: "per-key/API-key identity" },
              { label: "Rate limiter", note: "token bucket, gates volume", arrowLabel: "→" },
              { label: "Cache layer", note: "hit → return; miss → continue", arrowLabel: "miss →" },
              { label: "Single-flight lock", note: "one request repopulates, others wait", arrowLabel: "→" },
              { label: "Backend", note: "protected from both abuse and stampede", arrowLabel: "→" }
            ]},
          tricks: [
            "Distinguishing rate limiting (protects against a bad/abusive client) from stampede protection (protects against a popular key expiring, even with entirely well-behaved clients) unprompted shows these solve different failure modes, not the same one twice.",
            "Say where the rate limiter sits and why — at the edge/gateway (cheapest, protects everything downstream including the cache) versus at the cache/backend boundary (can rate-limit by more specific criteria, like which keys are being requested)."
          ]
        }}
    ]},
    { name: "Staff-Level Practices", items: [
      { id: "sd-26", t: "Write an RFC/design doc for a real system and get it reviewed", d: "Hard",
        desc: "Ties directly to the career plan's 3-month action.",
        notes: {
          explain: [
            "The doc that actually gets built is different in kind from an interview answer: it needs real numbers (current and projected QPS/storage/cost, pulled from actual metrics or a defensible estimate, not an invented back-of-envelope), a section on alternatives seriously considered and why they lost — not strawmen — and a rollout/migration plan for getting from today's state to the new one without a flag-day cutover. Picking a real system already operated (not a toy) forces confronting details a hypothetical glosses over: existing data volume, SLAs that can't regress, and teams that don't report to you but depend on the thing being changed.",
            "Getting it reviewed for real, not rubber-stamped, means sending it to at least one person likely to disagree with the approach and explicitly asking them to attack the alternatives-considered section — that's usually where a design's real weaknesses hide, because it's the section authors write most defensively and reviewers skim past fastest."
          ],
          tricks: ["The strongest artifact for this action item is a doc with a visible trail of disagreement and resolution — comments that pushed back, and a section that changed because of them — not one that sailed through with only typo-fixes as feedback; zero substantive pushback usually means it wasn't read closely, not that the design was flawless."]
        }},
      { id: "sd-27", t: "Run or co-run a design review meeting", d: "Medium",
        desc: "Structuring the meeting matters as much as the design itself — a review that reads the doc live, drifts into implementation details, or ends without a decision wastes everyone's time twice.",
        notes: {
          explain: [
            "Send the doc out ahead with a specific ask ('read sections 2-4, come with objections to the chosen approach specifically') rather than a generic 'thoughts welcome' — vague asks get vague, scattered feedback, and specific ones get the deep tradeoff pushback the meeting actually needs. In the room, the co-runner's job is protecting the agenda: redirecting implementation-detail rabbit holes ('let's take the exact retry backoff constants to a comment thread') back to the open design questions the meeting was convened to resolve, and watching the clock so the loudest disagreement doesn't eat the whole slot at the expense of quieter unresolved concerns.",
            "End with an explicit decision recorded in the doc itself — approved, approved-with-named-changes, or blocked pending a specific follow-up with an owner and date — because a review that ends with 'let's sync offline' and no owner or date reliably turns into no decision at all."
          ],
          tricks: ["If co-running rather than authoring, the specific job is timeboxing and redirecting rabbit-holes, not re-litigating the design personally — a good co-runner is judged on whether the meeting reached a decision, not on how many of their own opinions made it into the doc."]
        }},
      { id: "sd-28", t: "Practice explaining a tradeoff decision to a non-technical stakeholder in 2 minutes", d: "Medium",
        desc: "Translate the engineering tradeoff into business terms (cost, risk, time-to-ship) stakeholders actually decide on — not a shorter version of the technical explanation.",
        notes: {
          explain: [
            "The instinct is to compress the technical explanation — same content, fewer words. That still loses the room, because a non-technical stakeholder doesn't have a slot to put 'eventual consistency' or 'p99 latency' into; what they can act on is cost, risk, timeline, and customer impact. The two-minute version leads with the decision and its business consequence ('we're choosing to show slightly stale data for up to 30 seconds after a purchase, in exchange for the page loading instantly instead of sometimes timing out during a sale'), not the mechanism, and only reaches for a technical term if a follow-up question actually needs it.",
            "A good test of whether it worked: the stakeholder can restate the tradeoff in their own words and say what they'd want to know if the assumption behind it changed (traffic 10x's, the stale window needs to shrink) — if they can only nod along, the explanation demonstrated fluency, not their understanding."
          ],
          tricks: ["The concrete habit: write the one-sentence business-consequence version before writing the technical version, and practice starting with it — most engineers draft the technical explanation first and try to translate down, which is why the 'translated' version still sounds like an engineer talking."]
        }}
    ]},
    { name: "MAANG Interview Case Studies", items: [
      { id: "sd-29", t: "Design a News Feed (Meta/Instagram-style)", d: "Hard",
        desc: "The canonical Meta system design question — fan-out on write vs. fan-out on read is the whole game.",
        notes: {
          explain: [
            "The core tension: when a user posts, do you push it into every follower's feed immediately (fan-out on write), or store it once and compute each viewer's feed at read time (fan-out on read)? Fan-out on write makes reads cheap (feed is precomputed) but breaks down for celebrity accounts with millions of followers — one post triggers millions of writes. The standard answer is a hybrid: fan-out on write for normal users, fan-out on read (merge celebrity posts in at request time) for high-follower accounts.",
            "Ranking is the second half of the question interviewers expect: a real feed isn't chronological — it's scored by a model considering recency, affinity, and engagement prediction, computed by a separate ranking service the feed-assembly layer calls."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Fan-out on write", points: ["Precompute each follower's feed on every post", "Reads are cheap — just read your own feed cache", "Breaks down for celebrity accounts (millions of fan-out writes per post)"] },
              { title: "Fan-out on read", points: ["Store the post once; assemble the feed at read time from who you follow", "Writes are cheap and uniform regardless of follower count", "Reads are more expensive — must merge/rank across all followed accounts live"] }
            ]},
          tricks: ["Naming the hybrid approach unprompted (fan-out on write for most users, fan-out on read merged in for celebrities) is the single strongest signal in this question — most candidates only describe one side."]
        }},
      { id: "sd-30", t: "Design a Chat/Messaging System (WhatsApp/Messenger-style)", d: "Hard",
        desc: "Long-lived connections (WebSocket), message ordering per conversation, delivery/read receipts, and offline delivery.",
        notes: {
          explain: [
            "Each client holds a persistent WebSocket connection to a gateway server; a connection-routing layer (often backed by Redis or a consistent-hash ring) tracks which gateway node each user is currently connected to, so a message from A to B gets routed to whichever gateway node B is attached to right now. Messages are persisted (for offline delivery and history) before being pushed, and delivery/read receipts are just status updates on that persisted message flowing back to the sender."
          ],
          tricks: [
            "Ordering only needs to be guaranteed within a single conversation, not globally — this relaxation is what makes the problem tractable at scale, and stating it explicitly earns credit.",
            "Offline delivery: messages queue (per-recipient, often in a database or a per-user queue) until the recipient's client reconnects and acks — don't just say 'push it,' explain what happens when the recipient is offline."
          ]
        }},
      { id: "sd-31", t: "Design an E-commerce Checkout & Inventory System (Amazon-style)", d: "Hard",
        desc: "The hard part isn't the happy path — it's not overselling inventory under concurrent checkouts and handling payment/inventory failure combinations correctly.",
        notes: {
          explain: [
            "Two competing goals: never oversell (two customers can't both successfully buy the last unit) and don't hold inventory hostage on an abandoned cart forever. The standard pattern is a short-lived reservation (decrement available stock, hold for N minutes) created at 'add to cart'/'begin checkout', confirmed on successful payment, and released back on timeout or payment failure — essentially a saga with a compensating action.",
            "This connects directly to the Saga pattern and outbox pattern covered elsewhere in this track and in the Spring Boot Architecture Patterns section — a strong opportunity to tie tracks together in an actual interview."
          ],
          tricks: ["A classic follow-up: 'what if the payment succeeds but the inventory-decrement write fails (or vice versa)?' — answer with the outbox pattern / saga compensating transaction, not 'that won't happen.'"]
        }},
      { id: "sd-32", t: "Design a Video Streaming Service (Netflix/YouTube-style)", d: "Hard",
        desc: "Upload/transcode pipeline, adaptive bitrate streaming, and a CDN-heavy read path — the read:write ratio here is extreme.",
        notes: {
          diagram: { type: "flow", caption: "Transcoding into multiple bitrates/resolutions up front is what makes adaptive bitrate streaming possible — the client switches streams mid-playback as bandwidth changes.",
            steps: [
              { label: "Upload", note: "raw video to blob storage" },
              { label: "Transcode", note: "multiple bitrates/resolutions, chunked (HLS/DASH)", arrowLabel: "async pipeline" },
              { label: "CDN distribution", note: "chunks cached at edge", arrowLabel: "→" },
              { label: "Adaptive playback", note: "client switches bitrate based on measured bandwidth", arrowLabel: "→" }
            ]},
          tricks: ["State the read:write asymmetry explicitly — millions of reads (views) per upload — and that this is exactly why the CDN, not your origin servers, serves the overwhelming majority of traffic. Your origin only needs to handle upload/transcode volume, orders of magnitude smaller."]
        }},
      { id: "sd-33", t: "Design a Search Autocomplete / Typeahead (Google-style)", d: "Medium",
        desc: "Low-latency prefix matching at massive query volume — a trie (or a precomputed top-K-per-prefix index) is the expected data structure, with an offline aggregation job feeding it from real query logs.",
        notes: {
          tricks: ["Latency budget matters more than most system design questions — this has to respond within milliseconds of every keystroke, which pushes you toward serving from an in-memory structure (trie or precomputed top-K per prefix) rather than a live database query, with popularity counts refreshed by an offline batch/streaming job rather than updated synchronously on every search."]
        }},
      { id: "sd-34", t: "Design a Ride-Sharing Dispatch System (Uber-style)", d: "Hard",
        desc: "Real-time geospatial matching of riders to nearby available drivers — geohashing/quadtrees for 'nearby' queries, plus a matching algorithm under tight latency constraints.",
        notes: {
          explain: [
            "The core tension: match riders to nearby available drivers within a tight latency budget, at a scale where 'nearby' is a continuously moving, continuously updating geospatial query rather than a static lookup. Driver locations stream in constantly (frequent GPS pings), and the matching engine has to query 'who's within X km of this rider and available' against a dataset that never stops changing.",
            "The standard approach indexes driver locations with a geospatial structure — geohashing (encode lat/lon into a string prefix so nearby locations share a prefix, enabling range queries) or a quadtree (recursively subdivide the map, denser cells split further so lookup cost adapts to driver density) — held in an in-memory store (Redis geospatial commands, or a custom index) that's cheap to update on every ping and cheap to query on every ride request. The matching step then runs a scoring function (distance, rating, ETA, surge state) over the small candidate set the geo query returns, rather than scanning the whole city.",
            "The tradeoff to name: geohash cells have a boundary problem — a driver just across a cell edge can be geographically closer than one in the same cell, so a naive single-cell lookup misses good matches; the fix is querying the cell plus its neighbors, or using a quadtree instead, which has no fixed grid boundaries. Also worth naming: location-ping ingestion is extremely high volume regardless of ride demand, so that write path is usually decoupled from the latency-sensitive matching read path."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Geohashing", points: ["Fixed grid, string-prefix encoding", "Simple range queries on shared prefixes", "Boundary problem: nearer driver in adjacent cell gets missed", "Fix: query neighboring cells too"] },
              { title: "Quadtree", points: ["Recursive subdivision, denser cells split further", "No fixed grid boundaries", "Adapts to uneven driver density", "More complex to implement and rebalance"] }
            ]},
          tricks: [
            "Naming the geohash boundary problem — a nearer driver just across a cell edge gets missed by a naive single-cell query — and the fix (query neighboring cells too) is the concrete signal that separates a real answer from 'use geospatial indexing.'",
            "Decoupling the high-volume location-ping ingestion path from the matching-query read path is worth stating explicitly — pings arrive continuously regardless of ride demand, and coupling that write load to the latency-sensitive match path would slow matching exactly when the system is busiest."
          ]
        }},
      { id: "sd-35", t: "Design a Collaborative Document Editor (Google Docs-style)", d: "Hard",
        desc: "Multiple users editing the same document concurrently without clobbering each other's changes — Operational Transformation (OT) or CRDTs are the two real answers, know the tradeoff between them at a high level.",
        notes: {
          explain: [
            "The core tension: multiple users edit the same document concurrently, each seeing their own edits applied instantly — no waiting for a round-trip to a server — but all clients must eventually converge on the same final document state, even though edits were made against momentarily-diverging views of it.",
            "Operational Transformation (OT) expresses each edit as an operation (insert/delete at a position); when the server receives concurrent operations, it transforms later operations against earlier ones so their positions still make sense once applied in sequence (an insert at position 5 needs adjusting if another insert already landed at position 3). OT needs a central server to sequence and transform operations correctly, and the transform functions are notoriously easy to get subtly wrong. CRDTs (Conflict-free Replicated Data Types) take a different approach: model the document as a structure where each element has a unique, immutable ID encoding its position relative to neighbors, so merges are mathematically guaranteed to converge regardless of order or timing — any two replicas that have seen the same operations converge automatically, with no central sequencer required.",
            "The tradeoff to name: OT is more mature (Google Docs' original implementation) and can be more bandwidth-efficient, but the transform logic is hard to get right and generally needs a central server as arbiter of order. CRDTs are peer-to-peer-friendly — a better fit for offline-first/local-first apps — and simpler to reason about for correctness, but historically carried higher per-character metadata overhead, an overhead modern implementations have significantly reduced."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Operational Transformation", points: ["Operations transformed against each other on the server", "Needs a central server to sequence order", "More bandwidth-efficient historically", "Transform functions are hard to get correct"] },
              { title: "CRDT", points: ["Unique IDs encode position; merges always converge", "No central sequencer required — peer-to-peer friendly", "Simpler correctness reasoning", "Historically higher per-element metadata overhead"] }
            ]},
          tricks: [
            "Say which one needs a central server and which doesn't, unprompted: OT's transform step depends on the server establishing canonical operation order, while CRDTs can merge peer-to-peer without one — usually the detail that shows understanding of the mechanism rather than memorized names.",
            "Mention presence/cursor sharing (showing collaborators' live cursor positions) as a separate, lighter-weight real-time channel from the actual document-merge logic — conflating 'seeing where others are typing' with 'merging concurrent edits' is a common simplification that misses these are different problems with different consistency requirements."
          ]
        }},
      { id: "sd-36", t: "Design a Web Crawler", d: "Medium",
        desc: "URL frontier management, politeness (rate-limiting per domain so you don't hammer any one site), dedup at scale (bloom filters for 'have I seen this URL'), and distributing crawl work across many workers.",
        notes: {
          explain: [
            "The core tension: crawl a huge, effectively unbounded graph of URLs without hammering any single site (politeness), without re-crawling the same URL endlessly (dedup), while distributing work across many machines that need to coordinate without becoming a bottleneck themselves.",
            "The standard approach partitions the URL frontier (the queue of URLs to crawl next) by domain, so politeness — a per-domain rate limit / delay between requests to the same host — can be enforced locally per partition instead of needing global coordination on every request; each worker pulls URLs for the domains it owns, fetches, extracts new links, and pushes newly discovered URLs back into the frontier after a dedup check. Dedup at web-scale (billions of URLs) uses a Bloom filter — a probabilistic set-membership structure — to cheaply answer 'have I seen this URL before' in a fixed, small memory footprint, accepting a small false-positive rate as the price for not storing every URL's exact hash in memory.",
            "The tradeoff to name: politeness and throughput are in direct tension — crawling one domain as fast as possible violates politeness — so partitioning work by domain, letting many workers stay busy on *different* domains simultaneously while each is individually rate-limited, is what keeps the system both polite and highly parallel. Bloom filters trade a small, tunable false-positive rate for a massive memory savings over an exact set, a tradeoff worth stating explicitly rather than presenting as free."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Seed URLs", note: "starting frontier" },
              { label: "Frontier (partitioned by domain)", note: "politeness enforced per partition", arrowLabel: "→" },
              { label: "Fetch workers", note: "rate-limited per domain", arrowLabel: "→" },
              { label: "Bloom filter dedup", note: "have I seen this URL?", arrowLabel: "new URLs →" },
              { label: "Back into frontier", note: "→" }
            ]},
          tricks: [
            "Partitioning the frontier by domain — so politeness rate-limiting is a local, per-partition concern rather than a global coordination problem — is the detail that resolves the throughput-vs-politeness tension; naming it unprompted is the strong-answer signal here.",
            "Bloom filters are probabilistic — state explicitly that they can false-positive (claim a URL was seen when it wasn't, causing a genuinely new page to be skipped) but never false-negative, and that this asymmetry is exactly why they're an acceptable tradeoff here: missing a rare new page is cheap, storing billions of exact URLs in memory is not."
          ]
        }},
      { id: "sd-37", t: "Design a Distributed Object Storage System (S3-style)", d: "Hard",
        desc: "Durability via replication/erasure coding across failure domains, a metadata service mapping keys to physical locations, and how a system like this achieves 'eleven nines' durability claims.",
        notes: {
          explain: [
            "The core tension: store an effectively unlimited number of large, immutable objects durably enough to survive multiple simultaneous hardware failures ('eleven nines' durability claims), while still serving reads/writes at low latency and keeping storage cost per byte low — durability, latency, and cost pull against each other.",
            "The standard approach splits into two systems working together: a metadata service maps object keys to physical locations (which nodes/disks, which version, access control) — a comparatively small, latency-sensitive lookup, often itself a distributed, replicated key-value store; and the data path stores object bytes durably via either replication (store N full copies across separate failure domains — AZs, racks, disks — simple, but N× storage cost) or erasure coding (split an object into k data chunks plus m parity chunks, spread across separate failure domains, recoverable from any k of the k+m chunks) — giving similar durability to full replication at a fraction of the storage overhead, at the cost of a decode/reconstruction step when a chunk is missing.",
            "The tradeoff to name: replication is simpler and faster to reconstruct from a single failure (just read another full copy) but expensive in storage; erasure coding is far more storage-efficient at the same durability target — this is how providers reach 'eleven nines' without literally storing 11 copies of everything — but adds CPU cost and latency on reads that need reconstruction, and is more complex to implement correctly under partial failures during a write. Object immutability itself is a simplifying design choice worth naming: because objects are never modified in place — an 'update' is really a new version — the system sidesteps the hard consistency problems of concurrent in-place mutation entirely."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Replication", points: ["N full copies across failure domains", "Simple reconstruction: read another copy", "N× storage cost", "Fast recovery from a single failure"] },
              { title: "Erasure coding", points: ["k data chunks + m parity chunks", "Recoverable from any k of k+m chunks", "Much lower storage overhead at same durability", "Decode/reconstruction cost on reads with a missing chunk"] }
            ]},
          tricks: [
            "'Eleven nines' durability is a per-object, per-year probability derived from the failure-domain-spread + redundancy scheme (replication factor or erasure coding parameters) — say it comes from the redundancy math, not from any single component being extremely reliable, since no single disk or node approaches that reliability alone.",
            "Naming erasure coding (not just replication) as the storage-efficient path to high durability signals real depth — many candidates only get as far as 'store multiple copies in different data centers,' which is correct but far more expensive than what large-scale object stores actually do, especially for cold/infrequently-accessed data."
          ]
        }},
      { id: "sd-54", t: "Design a full-text search engine (Google/Elasticsearch-style)", d: "Hard",
        desc: "Beyond autocomplete (sd-33): matching free text against billions of documents and ranking results — the inverted index is the one structure this whole field is built on.",
        notes: {
          explain: [
            "The core data structure is an inverted index: for every distinct term, a sorted postings list of every document ID containing it, plus enough metadata (term frequency, position) to score relevance later. A multi-term query becomes an intersection (AND) or union (OR) of postings lists — search stays fast over billions of documents because you're merging pre-sorted ID lists, never scanning document text at query time. Building the index is an offline/streaming pipeline (ingest → tokenize → normalize → write into postings lists), sharded by document range or hash so indexing and query fan-out both parallelize.",
            "Ranking is the second half. Classic relevance scoring (TF-IDF or BM25) weighs a term higher when it's frequent in this document but rare across the corpus, run over the candidate set the postings intersection returns; production systems layer a second-stage learned ranker (click-through data, freshness, authority) on top — the same 'cheap candidate generation, expensive precise scoring' shape as sd-22's fraud pipeline and sd-29's feed ranking. At query time a query is scatter-gathered to every shard, each returns its local top-K, and a merge step produces the global top-K — so a single slow shard determines the whole query's tail latency, sd-6's fan-out amplification applied directly to search."
          ],
          diagram: { type: "flow", caption: "Scatter-gather: each shard scores its own postings matches locally; a merge step combines shard-local top-K into one global ranked result.",
            steps: [
              { label: "Query", note: "tokenize + normalize" },
              { label: "Broadcast to shards", note: "each intersects local postings lists", arrowLabel: "→" },
              { label: "Shard-local top-K", note: "BM25 / TF-IDF scoring", arrowLabel: "→" },
              { label: "Merge", note: "global top-K", arrowLabel: "→" }
            ]},
          tricks: [
            "Say 'inverted index,' not 'database with a text column' — a LIKE '%term%' scan is exactly the linear scan an inverted index exists to avoid.",
            "Know BM25/TF-IDF well enough to explain the shape: raw term frequency alone over-favors long/repetitive documents, and inverse document frequency is what down-weights common words like 'the' — naming why the formula looks the way it does beats naming the formula.",
            "Name the scatter-gather tail-latency cost unprompted — query latency is bound by the slowest shard, the same fan-out amplification as sd-6; a timeout-and-return-partial-results strategy is the standard mitigation."
          ]
        }},
      { id: "sd-55", t: "Design a real-time analytics/counting pipeline (e.g. count ad clicks/impressions)", d: "Hard",
        desc: "Tests the same streaming-aggregation muscle as fraud detection (sd-22), but the design center is exact-vs-approximate counting under extreme write volume.",
        notes: {
          explain: [
            "The tension: a high-volume event stream (clicks, impressions) needs aggregation at multiple granularities (per ad, per campaign, per minute/hour/day) for both a near-real-time dashboard (seconds-to-minutes freshness, approximate is fine) and a billing-accurate report (must be exact, hours of latency is fine) — one system rarely serves both well, so the standard answer is two paths over the same ingested stream, not one.",
            "The streaming path (Kafka → Flink, direct extension of sd-14/sd-15) does windowed aggregation keyed by ad ID and writes rolling counts to a fast store (Redis, a time-series DB) for the dashboard, using approximate structures (sd-52's Count-Min Sketch, or plain pre-aggregated counters) where exactness isn't worth the cost. The batch path replays the same raw events, from durable Kafka retention or a data-lake landing, through an exact reconciliation job on a delay, producing the billing-of-record numbers. The design has to name explicitly why these are two pipelines: the dashboard is allowed to be off by a few percent for a few minutes, the billing number is never allowed to be wrong — one pipeline trying to satisfy both ends up either too slow for the dashboard or not trusted for money."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Real-time path", points: ["Kafka → Flink windowed aggregation", "Approximate OK (Count-Min Sketch / pre-agg counters)", "Freshness: seconds–minutes", "Serves live dashboards"] },
              { title: "Batch reconciliation path", points: ["Replay from durable log / data lake", "Exact counts required", "Freshness: hours, runs on a delay", "Serves billing / source-of-truth reports"] }
            ]},
          tricks: [
            "State why one pipeline can't serve both needs: fast+approximate and exact+delay-tolerant are in tension, and forcing one system to do both usually makes the exact path fight for speed or the fast path get distrusted for money.",
            "Idempotency and exactly-once (sd-19) matter more here than almost anywhere — a double-counted click either loses revenue or overcharges an advertiser, so dedup keys on ingestion are a hard requirement, not a nice-to-have.",
            "If asked about a late-arriving event (a mobile client buffering clicks offline for two hours), name watermarks — Flink's mechanism for deciding how long to wait for late data before closing a window — as the concrete answer, not 'we'd handle it.'"
          ]
        }},
      { id: "sd-38", t: "MAANG interview format & rubric — what evaluators actually score", d: "Easy",
        desc: "Requirements clarification, high-level design before deep-diving, explicit tradeoff articulation, and driving the conversation yourself instead of waiting to be asked — the process matters as much as the final diagram.",
        notes: {
          tricks: [
            "Spend the first few minutes on clarifying questions (scale, read:write ratio, consistency requirements, latency budget) before drawing anything — jumping straight to a diagram without scoping is the single most common way candidates lose points.",
            "Narrate tradeoffs out loud even when not asked ('I'm choosing eventual consistency here because...') — silent correct answers score worse than reasoned answers with minor imperfections, because the interviewer is evaluating your judgment, not just your final diagram."
          ]
        }}
    ]},
    { name: "More Classic MAANG Questions", items: [
      { id: "sd-56", t: "Design a Parking Garage/Lot System", d: "Medium",
        desc: "A classic OOD-meets-system-design question — the interesting parts are atomic spot allocation across concurrent gates and O(1) availability lookups, not the class diagram.",
        notes: {
          explain: [
            "The OOD half is usually assumed easy: Vehicle subtypes (car/motorcycle/bus) needing different spot sizes, a ParkingSpot with a size/status, a ParkingFloor grouping spots, and a Ticket recording entry time and spot assignment. The system-design half is where interviewers actually probe: with multiple entry gates operating concurrently, two cars arriving at the same instant must never be assigned the same spot — spot assignment has to be an atomic reservation (a conditional update or a per-spot lock), not a read-then-write, exactly the same race the URL shortener's ID-range allocation guards against.",
            "The other real design question is spot-finding at scale: for thousands of spots across many floors, scanning every spot for 'first available' doesn't scale — maintain a live count of free spots per size-class per floor (incremented/decremented atomically on entry/exit) so a gate display can show 'floor 3: 12 compact spots free' in O(1), and only search within a floor once a car is directed there. Pricing (flat, hourly, dynamic/surge when nearly full) is a smaller follow-up worth naming as a pluggable strategy rather than hardcoded logic."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Entry gate", note: "vehicle arrives" },
              { label: "Find spot", note: "by size, nearest available floor", arrowLabel: "→" },
              { label: "Atomic reserve", note: "+ issue ticket", arrowLabel: "→" },
              { label: "Exit: compute fee", note: "by duration/strategy", arrowLabel: "→" },
              { label: "Atomic release", note: "spot back to available", arrowLabel: "→" }
            ]},
          tricks: [
            "Say 'atomic reservation, not read-then-write' explicitly for spot assignment across concurrent gates — the same TOCTOU race as the URL shortener's ID range and a ticket-booking seat hold, and naming the pattern by name signals you see the recurring shape.",
            "A live per-floor, per-size free-spot counter (not scanning spots) is what makes the gate's 'spots available' display and routing decision O(1) instead of O(spots) — worth stating unprompted."
          ]
        }},
      { id: "sd-57", t: "Design GitHub (version control + code review at scale)", d: "Hard",
        desc: "Less about reinventing Git's internals and more about how a hosting service serves millions of repos' worth of Git objects, plus the review/CI workflow layered on top.",
        notes: {
          explain: [
            "Git itself is already a distributed, content-addressed object store (commits/trees/blobs keyed by SHA) — the design question is what a HOSTING service adds: authentication/authorization per repo, a web UI and API over the object store, and horizontal scaling of storage for millions of repositories with wildly uneven size and access frequency. Git operations (clone/push/pull) are served by a fleet of Git-protocol servers backed by a sharded/replicated storage layer (each repo lives on a shard chosen by consistent hashing, sd-7, so the service grows shards without a full reshuffle), while the web/API layer is a separate stateless tier reading the same underlying data.",
            "Pull requests, review comments, and CI status are a metadata layer distinct from the Git objects themselves — a relational/document store tracking PR state and review threads, with a webhook/event system (a queue, sd-9) notifying CI runners when a push happens. CI is its own big fan-out problem: a push can trigger dozens of downstream jobs, each needing an isolated, ephemeral compute environment — the design center there is job queuing and fair scheduling across many repos' concurrent CI demand, not the Git storage question at all."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Git storage layer", points: ["Content-addressed objects (commits/trees/blobs)", "Sharded by repo via consistent hashing", "Served by Git-protocol servers (clone/push/pull)", "Read-heavy for popular repos"] },
              { title: "Platform layer", points: ["PR/review state in a relational/doc store", "Webhooks/queue trigger CI on push", "CI runners are ephemeral, isolated per job", "Fair scheduling across many repos' concurrent demand"] }
            ]},
          tricks: [
            "Separate 'the Git object store' from 'the platform metadata' explicitly — conflating them is the wrong direction; they have completely different access patterns and consistency needs.",
            "CI fan-out is its own queueing/scheduling problem, not a storage problem — naming fair-scheduling-across-tenants (one repo's huge CI burst shouldn't starve everyone else's) shows you're not just describing Git."
          ]
        }},
      { id: "sd-58", t: "Design Jira (ticketing / workflow state machine)", d: "Medium",
        desc: "The core object is a ticket moving through a configurable workflow state machine — the interesting problem is configurable fields and workflows per project without a schema migration for every customization.",
        notes: {
          explain: [
            "A ticket has core fields (title, assignee, status) plus per-project-configurable custom fields and a workflow (an explicit state machine: allowed transitions like Open → In Progress → Done, which can differ per project/issue-type). Modeling this rigidly doesn't scale across thousands of differently-configured projects — the standard approach is an EAV side table or a JSON/document column for custom fields, trading some query performance and type safety for schema flexibility, plus a separate WorkflowDefinition that a ticket's current state is validated against on every transition attempt.",
            "Search/filtering (JQL-style queries across arbitrary custom fields) is the other hard part: a general relational query across a sparse EAV table is slow, so at scale this gets denormalized into a search index (sd-54) kept in sync via CDC (sd-18) from the primary store, which remains the source of truth for writes. Activity history (every field change, every comment) is an append-only event log per ticket — driving the audit trail and able to reconstruct ticket state, the same event-sourcing shape as a saga's compensating log (sd-17)."
          ],
          diagram: { type: "tree", root: "Ticket platform building blocks",
            children: [
              { label: "Core fields + EAV/JSON custom fields", children: [{ label: "Flexible schema without per-customer migrations" }] },
              { label: "Workflow state machine", children: [{ label: "Transitions validated against a per-project WorkflowDefinition" }] },
              { label: "Search index (via CDC)", children: [{ label: "Flexible filtering across sparse custom fields" }] },
              { label: "Append-only activity log", children: [{ label: "Audit trail; can reconstruct current state" }] }
            ]},
          tricks: [
            "Naming EAV/JSON-for-custom-fields as the answer to 'thousands of projects each want different fields' is the concrete signal — a fixed relational schema is the wrong instinct here.",
            "The workflow is data (a per-project state machine definition), not code — hardcoding transition logic per project doesn't scale to a self-serve configurable product."
          ]
        }},
      { id: "sd-59", t: "Design Dropbox/Google Drive (file sync & storage)", d: "Hard",
        desc: "Distinct from S3 (sd-37): the hard part here is sync and conflict resolution across multiple devices watching the same files, not just durable storage.",
        notes: {
          explain: [
            "Files are chunked into fixed-size, content-hashed blocks; only changed blocks need re-upload on an edit (the same content-addressing idea as Git), and the bytes live in a blob store much like sd-37's object storage. The harder half is the sync protocol: each client watches its local filesystem, and on detecting a change, diffs against the last-known-synced state to find changed blocks, uploads them, and updates a metadata service mapping file paths to block lists and version numbers.",
            "Conflict handling is the core design tension: two devices editing the same file while offline both produce edits against the same base version. The standard approach is optimistic concurrency via a version number (or vector clock) per file — a push with a stale base version is rejected, and the client keeps the losing version as a 'conflicted copy' file rather than attempting an automatic merge, which is only tractable for structured formats, not arbitrary binary files. Real-time notification of remote changes uses a long-lived push channel per client, not polling, so other devices sync quickly without hammering the metadata service."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Block sync", points: ["Files chunked into content-hashed blocks", "Only changed blocks re-uploaded", "Blob storage backend (S3-style, sd-37)", "Efficient for small edits to large files"] },
              { title: "Conflict handling", points: ["Version number/vector clock per file", "Stale-base push rejected, not silently overwritten", "Losing edit kept as a 'conflicted copy'", "No automatic merge for arbitrary binary files"] }
            ]},
          tricks: [
            "Say explicitly why automatic merging isn't attempted for arbitrary files (unlike sd-35's OT/CRDT for structured documents) — without semantic understanding of the format, a 'merge' can silently corrupt it.",
            "Chunking + content-hashing means renaming or moving a huge unchanged file costs almost nothing to re-sync (same blocks, new metadata) — a strong, concrete detail beyond 'we sync files.'"
          ]
        }},
      { id: "sd-60", t: "Design a Ticket-Booking System (Ticketmaster/BookMyShow)", d: "Hard",
        desc: "Extremely similar shape to e-commerce checkout (sd-31), but sharper: thousands of people can be looking at the exact same 200 seats for a popular show at the same moment.",
        notes: {
          explain: [
            "The core tension is identical to inventory oversell (sd-31) but concentrated: a popular on-sale event creates a thundering herd (sd-8) of concurrent requests for the same small pool of seats. The standard pattern is a short-lived seat hold — selecting seats moves them to a 'held' state (TTL, typically 5-10 minutes) visible to no one else, confirmed on successful payment or released back to available on timeout/payment failure — the same reserve-then-confirm-or-release shape as checkout's inventory hold, applied per-seat instead of per-SKU-count.",
            "Seat-level locking at high contention needs to be fast and atomic — a Redis-backed hold (a conditional set with a TTL per seat ID) is the common answer rather than a row-level DB lock, since DB locks held across a slow user checkout flow would serialize and stall everyone else looking at the same section. A virtual waiting room in front of checkout for the highest-demand on-sales (rate-limiting entry into the booking flow itself, sd-10) is worth naming as the practical mitigation real ticketing sites use, rather than trying to make the seat-hold step itself infinitely scalable."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Select seats", note: "" },
              { label: "Atomic hold", note: "Redis, short TTL", arrowLabel: "→" },
              { label: "Payment", note: "", arrowLabel: "→" },
              { label: "Confirm or release", note: "success → confirmed; timeout/fail → back to available", arrowLabel: "→" }
            ]},
          tricks: [
            "Redis-backed per-seat holds with a TTL, not a DB row lock held across the checkout flow, is the concrete answer for contention at this scale.",
            "A virtual waiting room ahead of checkout for the highest-demand on-sales is a real, citable mitigation — naming it shows awareness beyond the seat-hold mechanism alone."
          ]
        }},
      { id: "sd-61", t: "Design an Elevator System", d: "Medium",
        desc: "Primarily an OOD/state-machine question — the system-design angle is scheduling: which elevator answers which call, and how that changes across a bank of elevators.",
        notes: {
          explain: [
            "Each elevator is a state machine (idle, moving up, moving down, doors open) with a request queue; the OOD backbone is an Elevator (current floor, direction, target floors) and a Dispatcher receiving hall calls (floor + direction) and car calls (button pressed inside). The classic scheduling algorithm (SCAN/LOOK, the same shape as disk-arm scheduling) has each elevator continue in its current direction servicing all requests along the way before reversing, rather than serving requests in arrival order — this avoids starvation and minimizes total travel.",
            "For a bank of multiple elevators, the dispatcher's job is choosing which car answers a new hall call — the standard heuristic assigns the call to the nearest elevator already moving toward that floor in the matching direction, or the nearest idle elevator otherwise, minimizing wait time across the whole bank rather than optimizing any single car in isolation. At scale (a busy office tower at 9am) this becomes a real-time assignment optimization problem — a good answer treats it as minimizing aggregate wait time, not routing each request greedily to whichever car is momentarily closest."
          ],
          diagram: { type: "tree", root: "Elevator dispatch decision",
            children: [
              { label: "Hall call arrives (floor + direction)" },
              { label: "Elevator already moving toward it, same direction?", children: [{ label: "Assign it — minimal detour, in-pass" }] },
              { label: "Otherwise", children: [{ label: "Assign nearest idle elevator" }] },
              { label: "Bank-wide goal: minimize aggregate wait, not per-request greedy assignment" }
            ]},
          tricks: [
            "Name SCAN/LOOK explicitly (servicing all requests in the current direction before reversing) — the detail that separates a real answer from 'it goes to whichever floor is called.'",
            "Call out the failure mode of a naive 'send the closest elevator' rule that ignores current direction — sending one already moving away, only to reverse it, is worse than waiting for one already headed that way."
          ]
        }},
      { id: "sd-62", t: "Design a Vending Machine", d: "Easy",
        desc: "A small, self-contained state-machine question — asked to see if you model transitions and edge cases cleanly, not for its system-design depth.",
        notes: {
          explain: [
            "The machine is a state machine: Idle → (coin inserted) → HasBalance → (selection, sufficient balance) → Dispensing → (item + change out) → Idle, with explicit edge transitions for insufficient balance (stay in HasBalance, prompt for more), out-of-stock selection (reject, refund or prompt reselect), and exact-change-unavailable (refund the full amount rather than dispense without correct change). The value of this question is entirely in enumerating those edge cases explicitly and modeling them as real states/transitions rather than ad hoc if-statements bolted onto a happy path.",
            "Inventory and pricing are simple key-value lookups, not a distributed-systems problem at this scale — the one design-adjacent point worth making is that a single physical machine is inherently single-writer/single-reader, so none of the concurrency machinery from other case studies (locks, atomic reservations) is needed here, and saying so explicitly shows correct scoping rather than reflexively adding distributed-systems machinery everywhere."
          ],
          diagram: { type: "tree", root: "Vending machine state machine",
            children: [
              { label: "Idle", children: [{ label: "coin inserted → HasBalance" }] },
              { label: "HasBalance", children: [{ label: "selection + sufficient balance → Dispensing" }, { label: "insufficient balance → stays, prompts more" }] },
              { label: "Dispensing", children: [{ label: "item + change out → Idle" }, { label: "no exact change → full refund, Idle" }] }
            ]},
          tricks: [
            "Exact-change-unavailable refunding the FULL amount (not dispensing without change, not a partial refund) is the edge case interviewers specifically listen for.",
            "Explicitly noting this is single-writer/single-reader and needs none of the concurrency control from other design questions is itself a good answer — judgment about when NOT to reach for distributed-systems machinery."
          ]
        }},
      { id: "sd-63", t: "Design Google Maps / Real-Time Routing", d: "Hard",
        desc: "Distinct from ride-share dispatch (sd-34): the hard problem here is shortest-path routing over a continent-scale road graph with live traffic, not matching riders to drivers.",
        notes: {
          explain: [
            "The road network is a graph (intersections as nodes, road segments as weighted edges, weight = travel time). Naive Dijkstra is far too slow at continent scale — production routers precompute structure offline (contraction hierarchies: iteratively 'shortcut' less-important nodes, so a live query skips over most of the graph and only routes through a small set of important roads) to answer shortest-path queries in milliseconds. Map data (roads, turn restrictions, speed limits) is mostly static and updates on a slow cadence, so it's distributed to regional routing servers as periodic snapshot rebuilds rather than needing real-time consistency.",
            "Live traffic is the part that must be real-time: aggregating anonymized speed/position pings from phones into current speed estimates per road segment (a streaming aggregation pipeline, the same shape as sd-22's fraud pipeline but keyed by road segment instead of account), which adjusts edge weights for routing queries without re-running the expensive offline precomputation. ETA also has to account for the route's traffic changing during the trip, which is why apps recompute/re-rank routes periodically during navigation rather than committing to a single static ETA at request time."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Static (precomputed offline)", points: ["Road graph, turn restrictions, speed limits", "Contraction hierarchies precomputed for fast queries", "Rebuilt on a slow cadence", "Distributed to regional servers as snapshots"] },
              { title: "Live (streaming)", points: ["Anonymized speed/position pings from devices", "Streaming aggregation → current speed per segment", "Adjusts edge weights, not the precomputed structure", "Routes/ETA re-ranked periodically during a trip"] }
            ]},
          tricks: [
            "Naming contraction hierarchies (or at least 'offline-precomputed shortcuts') is what separates this from 'run Dijkstra' — naive shortest-path live over a continent-scale graph is the wrong answer.",
            "Separate the static graph-structure problem from the live traffic-weighting problem explicitly — they update on completely different cadences via completely different pipelines."
          ]
        }},
      { id: "sd-64", t: "Design Yelp / Nearby Places Search", d: "Medium",
        desc: "Read-heavy geospatial search over mostly-static data — shares the geospatial toolkit with ride-share dispatch (sd-34) but without the real-time matching/dispatch problem.",
        notes: {
          explain: [
            "The core query is 'businesses within X km, optionally filtered by category, sorted by rating/distance' — the same geospatial indexing choice as sd-34 (geohashing or a quadtree/R-tree) applies, but here the indexed data changes rarely compared to a driver's constantly-updating GPS position, so the index can be a slower-to-update, more heavily cached structure rather than one optimized for continuous high-frequency writes.",
            "Because reads dominate so heavily, the standard approach layers aggressive caching (sd-8) on top of the geo-index: cache 'popular area + category' query results directly, since the same popular queries repeat constantly and the underlying data barely changes minute to minute. Search relevance (blending distance, rating, and review count rather than pure distance) reuses the same candidate-generation-then-scoring shape as sd-54's search ranking — the geo-index narrows to a candidate set cheaply, then a ranking step scores that smaller set."
          ],
          diagram: { type: "tree", root: "Nearby search design",
            children: [
              { label: "Geo-index (geohash/quadtree/R-tree)", children: [{ label: "Narrows to a candidate set near the query point" }] },
              { label: "Ranking (distance + rating + reviews)", children: [{ label: "Scores the candidate set, same shape as sd-54" }] },
              { label: "Aggressive result caching", children: [{ label: "Popular area+category queries repeat; data changes slowly" }] }
            ]},
          tricks: [
            "Contrast explicitly with sd-34: same geospatial toolkit, but write frequency differs — a business location updates rarely, a driver's GPS updates every few seconds, which is why this index can be far more cacheable.",
            "Caching whole query results (not just individual business records) is the detail worth naming — 'coffee near downtown SF' as a cache key captures a repeating query pattern across many users."
          ]
        }},
      { id: "sd-65", t: "Design a Leaderboard System", d: "Medium",
        desc: "A narrow, well-defined problem — real-time ranked scores at scale — with one dominant right answer: a sorted-set structure, not a SQL ORDER BY.",
        notes: {
          explain: [
            "The query shape is always some mix of 'what's my rank,' 'show me the top N,' and 'show me the players around my rank' — running ORDER BY + LIMIT/OFFSET over SQL on every score update doesn't hold up at real-time-game scale: every read scans/sorts a large table, and every write invalidates any cached ranking. The standard answer is a sorted-set structure (Redis ZSET, score as sort key, player ID as member) — insert/update is O(log N), and 'top N,' 'rank of X,' and 'range around rank X' are all native O(log N) operations, no separate sort step needed.",
            "At massive scale (a global leaderboard, hundreds of millions of players), a single sorted set becomes a bottleneck, so the standard extension is sharding the leaderboard (by region/game-mode, usually a real product boundary) and, for a global top-N view across shards, periodically merging each shard's local top-K into a global leaderboard rather than maintaining one live global structure — trading a small staleness window for scalability, the same shape as sd-29's celebrity fan-out-on-read tradeoff."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "SQL ORDER BY", points: ["Score update = a row UPDATE", "Rank/top-N = ORDER BY + LIMIT scan", "Gets slower as the table grows", "No native 'rank of X' operation"] },
              { title: "Sorted set (Redis ZSET)", points: ["O(log N) insert/update", "Native O(log N) rank, top-N, range-around-rank", "Purpose-built for this exact query shape", "Shard by region/mode at extreme scale"] }
            ]},
          tricks: [
            "Say 'sorted set,' not 'sort the scores' — naming the structure and its O(log N) guarantee is the concrete signal that separates this from a naive SQL answer.",
            "For a sharded global leaderboard, merging shard-local top-K periodically (rather than one giant live structure) trades staleness for scalability — the same tradeoff shape as sd-29's celebrity fan-out."
          ]
        }},
      { id: "sd-66", t: "Design a Key-Value Store from Scratch (Dynamo-style)", d: "Hard",
        desc: "The building block itself, not a system built on top of one — reconstruct the Dynamo paper's core ideas: partitioning, replication, and conflict resolution without a single leader.",
        notes: {
          explain: [
            "Data is partitioned across nodes via consistent hashing (sd-7) — each key maps to a ring position and replicates to the N nodes clockwise from it (its 'preference list'), so adding/removing a node reshuffles only a fraction of keys. Reads and writes use quorum consistency: a write succeeds once W replicas ack, a read is valid once R replicas respond and versions are reconciled, and choosing R + W > N guarantees every read overlaps at least one node that saw the latest write — the same overlap-guarantee logic as Raft's majority quorum (sd-16), applied without a single leader.",
            "Without a single leader, concurrent writes to the same key can produce conflicting versions — resolved via vector clocks (each version tagged with which nodes contributed, so the system can detect genuinely concurrent versions vs. one superseding another) and either last-write-wins (simple, can silently drop an update) or returning both conflicting versions to the application to merge (Dynamo's original approach). This is a deliberate AP choice on the CAP spectrum (sd-2), not an oversight."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Client write", note: "" },
              { label: "Hash key onto ring", note: "sd-7", arrowLabel: "→" },
              { label: "Replicate to N nodes", note: "preference list", arrowLabel: "→" },
              { label: "W acks required", note: "", arrowLabel: "→" },
              { label: "Read: R replicas", note: "reconcile via vector clock", arrowLabel: "→" }
            ]},
          tricks: [
            "State R + W > N explicitly: it guarantees any read set and write set share at least one node, which is what makes reading the latest write probable without a leader coordinating anything.",
            "Vector clocks detect concurrent (not just outdated) versions — conflating 'stale' with 'concurrent' is the common mistake; a concurrent version genuinely needs reconciliation because neither causally preceded the other.",
            "Name this as a deliberate AP system (sd-2) — conflict resolution is pushed to vector clocks + application logic instead of a coordinator refusing writes."
          ]
        }},
      { id: "sd-67", t: "Design a Distributed Job Scheduler / Cron Service", d: "Medium",
        desc: "Running millions of scheduled jobs reliably across a fleet — the design center is avoiding both duplicate execution and missed execution as workers come and go.",
        notes: {
          explain: [
            "Jobs (cron-style or one-off run-at) are stored durably with their next-run timestamp; a scheduler layer periodically polls for jobs due now and hands each to a worker fleet. The core problem is the same shape as sd-13's idempotency at the scheduling layer: with multiple scheduler instances for availability, two schedulers must never both pick up and execute the same due job — the claim needs to be an atomic conditional update (claim the job, set a lease/lock with a timeout), exactly like the URL shortener's ID-range reservation.",
            "The lease needs a timeout because a worker can crash mid-execution — if it expires without the job marked complete, another worker must be able to pick it up and retry, which means jobs need to be idempotent wherever possible, with at-least-once execution accepted as the real guarantee rather than promised exactly-once (the same framing as sd-19). At scale, sharding due-job polling by a hash of job ID across scheduler instances avoids the polling step itself becoming the bottleneck."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Job due", note: "" },
              { label: "Atomic lease claim", note: "one scheduler wins", arrowLabel: "→" },
              { label: "Hand to worker", note: "", arrowLabel: "→" },
              { label: "Execute", note: "", arrowLabel: "→" },
              { label: "Complete (release) or lease expires → reclaimed", note: "", arrowLabel: "→" }
            ]},
          tricks: [
            "Say 'atomic conditional claim with a lease timeout,' not 'the scheduler picks it up' — the exact mechanism preventing two replicas from double-executing the same job, the same shape as sd-13.",
            "True exactly-once execution isn't achievable here any more than in sd-19's pipeline — frame the guarantee as at-least-once plus idempotent jobs, and say so explicitly."
          ]
        }},
      { id: "sd-68", t: "Design Gmail (large-scale email service)", d: "Hard",
        desc: "Storage at massive scale, full-text search over your own mail, and spam filtering are three fairly separate subsystems bolted together behind one inbox UI.",
        notes: {
          explain: [
            "Each user's mailbox is an append-mostly collection of messages, naturally partitioned by user ID (mail is only ever queried by its owner, which makes sharding trivial compared to something like a social graph) — messages are stored once and referenced by multiple folder/label associations (metadata, not copies), similar in spirit to sd-37's separation of metadata from bytes. Attachments are large blobs in object storage (sd-37), with the message record holding a reference, not the bytes inline.",
            "Search is a per-user full-text index (the inverted-index approach from sd-54, scoped to one mailbox), updated incrementally as mail arrives. Spam filtering sits in the write path as a scoring step before delivery — a streaming classification pipeline (rules plus an ML model, the same two-stage shape as sd-22's fraud detection) that must run within the mail-delivery latency budget, with borderline messages routed to a spam folder rather than blocked outright so false positives are recoverable."
          ],
          diagram: { type: "tree", root: "Gmail-scale subsystems (mostly independent)",
            children: [
              { label: "Mailbox storage", children: [{ label: "Partitioned by user ID; labels reference one message, not copies" }] },
              { label: "Attachments", children: [{ label: "Object storage (sd-37), referenced not inlined" }] },
              { label: "Per-user search index", children: [{ label: "Inverted index (sd-54) scoped to one mailbox" }] },
              { label: "Spam filtering", children: [{ label: "In the write path; two-stage scoring like sd-22" }] }
            ]},
          tricks: [
            "Labels/folders as metadata pointing at one stored message (not copies per label) avoids storage blowup for users who label everything — say this when asked how folders work.",
            "User-ID partitioning is easy here specifically because mail is never queried across users the way a social graph is queried across friends — name why sharding is simple for this data shape, not just that it's sharded by user ID."
          ]
        }},
      { id: "sd-69", t: "Design Instagram (photo/video sharing + feed)", d: "Hard",
        desc: "Distinct from a generic news feed (sd-29): the design center here is the media pipeline (upload, transcode, multi-resolution serving) as much as the feed fan-out itself.",
        notes: {
          explain: [
            "On upload, the original image/video goes to object storage (sd-37) and is asynchronously processed into multiple resolutions (thumbnail, feed-size, full-res) — similar to sd-32's video transcoding but for images too, so the app never serves an oversized asset to a small thumbnail. Metadata (caption, tags, owner) is stored separately from media bytes, and feed assembly is exactly sd-29's fan-out-on-write-for-most/fan-out-on-read-for-celebrities hybrid, since Instagram has the identical celebrity-follower-count skew.",
            "The detail generic feed design glosses over: serving the RIGHT resolution to the right client is a CDN-and-negotiation problem layered on top of ranking — the feed-assembly service returns media references, and a CDN (sd-12) serves the actual bytes, choosing resolution via signed URLs or client size hints, so feed-ranking never touches media bytes directly and stays fast. Stories (auto-expiring after 24h) are a straightforward TTL on the same storage, not a separate system."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Upload", note: "" },
              { label: "Object storage", note: "original", arrowLabel: "→" },
              { label: "Async transcode", note: "multiple resolutions", arrowLabel: "→" },
              { label: "Feed assembly", note: "fan-out hybrid, sd-29", arrowLabel: "→" },
              { label: "CDN serves bytes", note: "resolution-matched, sd-12", arrowLabel: "→" }
            ]},
          tricks: [
            "Separate 'which posts appear in the feed' (ranking/fan-out, sd-29) from 'which resolution of this post's image gets served' (CDN/transcode) — folding media serving into the ranking service adds latency to the wrong layer.",
            "Naming that Instagram has the exact same celebrity fan-out problem as sd-29 (rather than re-deriving it) is efficient and shows you recognize the recurring pattern."
          ]
        }},
      { id: "sd-70", t: "Design a Distributed Lock Service", d: "Hard",
        desc: "The building block behind 'only one worker should do this at a time' across a fleet — correctness hinges on a detail most candidates miss: a lock alone doesn't guarantee mutual exclusion without a fencing token.",
        notes: {
          explain: [
            "A distributed lock service (built on a consensus system like ZooKeeper/etcd, or Redis for a weaker guarantee) lets a client acquire a named lock, typically with a lease/TTL so a crashed holder doesn't hold it forever. The subtle failure: a client can acquire a lock, then hit a long GC pause or network partition past the lease's TTL — the lock service, hearing nothing, expires and reassigns the lock, but the first client resumes still believing it holds it, and both now act concurrently on the protected resource.",
            "The fix is a fencing token: every grant includes a monotonically increasing number, and the protected resource itself (not just the lock) must reject any operation carrying a token lower than the highest it has already seen. This pushes the actual safety check to the resource being protected — the only place that can truly enforce it — since the lock service can only ever provide a hint about who currently believes they hold the lock, not a guarantee."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Client A acquires", note: "gets fencing token 5" },
              { label: "Long pause", note: "past lease TTL", arrowLabel: "→" },
              { label: "Reassigned to B", note: "new token 6", arrowLabel: "→" },
              { label: "A resumes, writes", note: "stale token 5", arrowLabel: "→" },
              { label: "Resource rejects A", note: "accepts only token ≥ 6", arrowLabel: "→" }
            ]},
          tricks: [
            "Fencing tokens are the answer to 'what could go wrong with a distributed lock' — say this unprompted; a lock without one is a hint, not a guarantee, once a lease can expire out from under a paused client.",
            "The check has to happen at the PROTECTED RESOURCE, not by trusting whichever client currently thinks it holds the lock — the lock service alone cannot enforce mutual exclusion once a client can be arbitrarily delayed."
          ]
        }},
      { id: "sd-71", t: "Design a Metrics/Monitoring System (Datadog-style)", d: "Hard",
        desc: "A time-series ingestion-and-query problem at extreme write volume — the decisions are all about pre-aggregation and cardinality control, not the dashboard UI.",
        notes: {
          explain: [
            "Every host/service emits metrics continuously, so ingestion is enormous and mostly write-only — the standard approach batches and pre-aggregates at the source (a local agent rolls up raw samples into e.g. 10-second buckets before sending) rather than shipping every raw point, trading query-time granularity for a large reduction in network/storage volume, similar in spirit to Kafka producer batching (sd-6). Storage uses a time-series-optimized, delta-encoded columnar format, since time-series data compresses far better than general-purpose row storage.",
            "The dangerous failure mode at scale is cardinality explosion: a metric tagged by an unbounded dimension (e.g. user ID or request ID) creates a combinatorial number of distinct series, since each unique tag combination is its own series to store and index — this can silently 10-100x storage/query cost and is the most common real production incident in metrics systems. The mitigation is enforcing cardinality limits at ingestion rather than discovering the problem after costs spike. Alerting is a separate consumer reading the same ingested stream and evaluating rules continuously, not polling stored data on a schedule, so alerts fire within seconds of a breach."
          ],
          diagram: { type: "tree", root: "Metrics pipeline",
            children: [
              { label: "Agent pre-aggregation", children: [{ label: "Rolls up raw samples before sending; less volume, less granularity" }] },
              { label: "Time-series storage", children: [{ label: "Columnar, delta-encoded, compresses far better than row storage" }] },
              { label: "Cardinality control at ingestion", children: [{ label: "Unbounded tags explode storage/index cost combinatorially" }] },
              { label: "Streaming alerting", children: [{ label: "Evaluates rules on the ingest stream, not a scheduled poll" }] }
            ]},
          tricks: [
            "Name cardinality explosion unprompted as THE production risk — easy to cause accidentally (one high-cardinality tag) and expensive to notice late.",
            "Pre-aggregating at the agent, not the server, is what keeps ingestion tractable — shipping every raw sample just moves the same combinatorial cost to the network and ingestion tier."
          ]
        }},
      { id: "sd-72", t: "Design an Online Code Judge / Sandboxed Execution Service", d: "Hard",
        desc: "LeetCode/HackerRank-style: running untrusted user code safely, at scale, within a tight time budget — the design center is sandboxing and resource limiting, not the queueing itself.",
        notes: {
          explain: [
            "Submitted code is untrusted by definition, so it runs in an isolated sandbox with hard resource limits — a container or, for stronger isolation, a lightweight VM (gVisor/Firecracker-style microVMs) with strict CPU, memory, disk, and network limits (no network access at all is the common default, since a code judge has no legitimate reason to let submitted code make outbound calls). The submission flow is a job queue (sd-9): a submission is enqueued, a worker pool of ephemeral sandboxes pulls jobs, executes against the test cases with a wall-clock timeout, and reports pass/fail plus resource usage.",
            "Two things make this harder than a generic job queue: sandbox startup latency matters a lot for UX (waiting 10+ seconds to spin up an isolated environment feels broken for something users expect to feel interactive), which is why a pool of pre-warmed, reusable sandboxes (reset between jobs rather than created fresh) is the standard optimization; and cross-tenant isolation matters because one user's submission must never affect another's execution or see another's data, even running concurrently on shared hardware — a sandbox-escape bug here is a security incident, not just a performance bug."
          ],
          diagram: { type: "flow",
            steps: [
              { label: "Submission", note: "" },
              { label: "Enqueue", note: "sd-9", arrowLabel: "→" },
              { label: "Pre-warmed sandbox pool", note: "", arrowLabel: "→" },
              { label: "Execute, limits enforced", note: "CPU/mem/time/no network", arrowLabel: "→" },
              { label: "Report result", note: "pass/fail + resource usage", arrowLabel: "→" }
            ]},
          tricks: [
            "No network access from the sandbox by default is worth stating unprompted — a code judge has no legitimate reason to let submitted code reach the network, and it's a common gap given how much attention goes to CPU/memory limits instead.",
            "Pre-warmed, reusable sandbox pools directly address cold-start latency, the specific UX problem generic 'spin up a container per job' misses — name the latency reason, not just 'use a pool.'"
          ]
        }}
    ]}
  ]
};
