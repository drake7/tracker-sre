export default {
  key: "databases", label: "Deep Database", icon: "🗄️", color: "var(--yellow)",
  desc: "Below-the-ORM database knowledge: internals, scaling mechanics, and engine-specific depth across the stores you've already used (Oracle, MySQL, MongoDB) plus what a Staff engineer is expected to reason about.",
  sections: [
    { name: "Internals", items: [
      { id: "db-1", t: "B-Tree vs LSM-Tree internals", d: "Hard", desc: "You already run RocksDB (LSM-based) in production — connect that experience to classic B-Tree indexing in Oracle/MySQL.",
        notes: {
          explain: [
            "A B-Tree index (InnoDB, Oracle) is a balanced, sorted tree of fixed-size pages. Every write finds the correct leaf page in-place and mutates it directly — insert the key, split the page if it's full, propagate the split up if the parent also fills. Reads are fast and predictable (O(log n) page fetches, and range scans just walk sibling leaf pages), but writes are expensive: a single logical write can trigger cascading page splits and random-I/O page rewrites scattered across the disk. This is why B-Trees are described as read-optimized — they trade write cost for read simplicity, which fits OLTP workloads where reads dominate and data fits mostly in buffer cache.",
            "An LSM-Tree (RocksDB, Cassandra, HBase) inverts that trade. Writes go to an in-memory memtable (backed by a WAL for crash safety) and are never mutated in place — once a memtable fills, it's flushed as an immutable, sorted SSTable file. Over time you accumulate many SSTables across levels, and a background compaction process merges and rewrites them to remove overwritten/deleted keys and keep read amplification bounded. Writes are now sequential appends (cheap, high throughput), but a read may have to check the memtable plus multiple SSTables across levels — mitigated with per-file bloom filters so you can skip files that definitely don't contain the key, and block-level indexes so you don't scan whole files.",
            "The practical framing for an interview: B-Tree vs LSM is really a write-amplification vs read-amplification vs space-amplification triangle — you can't minimize all three at once. B-Trees keep read and space amplification low at the cost of random-write I/O; LSM-Trees keep write amplification low (sequential I/O, batched) at the cost of read amplification (multiple file checks) and periodic compaction I/O spikes. RocksDB in production is a good talking point here — leveled compaction trades more write amplification for less space amplification and better read performance than size-tiered compaction, and tuning that tradeoff (level sizing, compaction style) is exactly the kind of operational knowledge this question is probing for."
          ],
          code: [{ lang: "properties", caption: "RocksDB compaction knobs — the write/read/space amplification tradeoff made explicit", src:
`# Leveled compaction (default): lower space amp, more write amp than size-tiered.
compaction_style=kCompactionStyleLevel
level0_file_num_compaction_trigger=4
max_bytes_for_level_base=268435456   # 256MB — L1 target size, each level ~10x larger
target_file_size_base=67108864       # 64MB SSTable target

# Bloom filters cut read amplification: skip SSTables that can't contain the key
# without opening the file.
bloom_bits_per_key=10` }],
          diagram: { type: "compare", caption: "Same problem (persist sorted key-value data durably), opposite optimization target.",
            columns: [
              { title: "B-Tree (InnoDB, Oracle)", points: ["In-place page updates, balanced tree", "Random I/O on write (page splits)", "Single lookup path — low read amplification", "Read-optimized; OLTP sweet spot"] },
              { title: "LSM-Tree (RocksDB, Cassandra)", points: ["Append-only memtable + immutable SSTables", "Sequential I/O on write, background compaction", "May check multiple files per read (bloom filters mitigate)", "Write-optimized; high-ingest workloads"] }
            ]},
          tricks: [
            "\"Write amplification\" means different things in each structure — for B-Trees it's page rewrites from splits/fragmentation; for LSM-Trees it's a key being rewritten repeatedly across compaction levels. Naming both correctly signals real understanding.",
            "A stalled/backed-up compaction queue in an LSM store causes write throttling or even write stalls — this is the operational failure mode to mention if asked 'what can go wrong with RocksDB under sustained high write load.'",
            "Interviewers often expect you to know InnoDB's clustered index specifically: the primary key IS the B-Tree leaf-level data (not a separate row store), so primary key choice directly affects insert locality and page-split frequency — a random UUID PK causes far more page splits than a monotonic one."
          ]
        }},
      { id: "db-2", t: "Reading query execution plans & optimizer internals", d: "Medium", desc: "The optimizer's cost estimates come from table statistics — when the plan looks wrong, the stats are usually the first suspect.", res: "use-the-index-luke.com", url: "https://use-the-index-luke.com/",
        notes: {
          explain: [
            "A query optimizer doesn't execute your SQL as written — it enumerates alternative physical execution strategies (which index to use, which join algorithm, which join order) and picks the one with the lowest estimated cost. That estimate is built from table/index statistics: row counts, distinct-value counts (cardinality), data distribution histograms, and index selectivity. Everything downstream — whether it picks an index scan vs a full table scan, a hash join vs a nested loop — is a consequence of those cardinality estimates. When a plan looks obviously wrong, the root cause is almost always stale or misleading statistics, not a 'dumb' optimizer.",
            "Reading a plan means reading it from the inside out (deepest/rightmost node first) and comparing estimated rows against actual rows at each step — that's precisely why EXPLAIN ANALYZE (which actually runs the query and reports real numbers) is more useful for debugging than plain EXPLAIN (which only estimates). A large estimated-vs-actual gap at any node is the signal: it means the optimizer's cardinality model was wrong there, and every decision built on top of that node (join algorithm choice, join order) is now suspect too, even if it looks locally correct."
          ],
          code: [{ lang: "bash", caption: "PostgreSQL — EXPLAIN vs EXPLAIN ANALYZE", src:
`EXPLAIN SELECT * FROM orders WHERE customer_id = 42;
-- Seq Scan on orders  (cost=0.00..18584.00 rows=12 width=97)
--   Filter: (customer_id = 42)

EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
-- Seq Scan on orders  (cost=0.00..18584.00 rows=12 width=97)
--                     (actual time=0.02..142.31 rows=48211 loops=1)
--   Filter: (customer_id = 42)
-- Planning Time: 0.11 ms
-- Execution Time: 143.02 ms
-- estimated 12 rows, actually 48211 — stats are stale, optimizer chose Seq Scan
-- instead of an available index because it thought the predicate was highly selective.

ANALYZE orders;  -- refresh planner statistics` }],
          tricks: [
            "EXPLAIN shows estimates only; EXPLAIN ANALYZE actually executes the query and shows real row counts and timings — mixing these up in an interview (claiming EXPLAIN alone proves a query is fast) is an immediate red flag.",
            "A huge estimated-vs-actual row mismatch is the single strongest 'stale statistics' signal — the fix is usually ANALYZE / gathering fresh statistics, not adding a hint.",
            "A plan can show an available index simply not being used at all — usually caused by a function or implicit type cast wrapping the indexed column (WHERE CAST(customer_id AS text) = '42'), which makes the predicate non-sargable and forces a full scan regardless of statistics."
          ]
        }},
      { id: "db-3", t: "Indexing strategies: composite, covering, partial indexes", d: "Medium", desc: "Column order in a composite index isn't cosmetic — it determines exactly which query shapes the index can serve.",
        notes: {
          explain: [
            "A composite (multi-column) index is physically one sorted structure over the concatenation of its columns, so the leftmost-prefix rule governs everything: an index on (a, b, c) can efficiently serve predicates on a alone, or a+b, or a+b+c, but not b alone or c alone, because the tree is sorted by a first. Column order should generally go equality predicates first, then a single range/sort column last — once the index hits a range condition, everything after it in the key is no longer sorted usefully for that query, so trailing columns after a range predicate don't help filtering (though they can still help as a covering column).",
            "A covering index is one that contains every column the query needs — the engine can answer the query from the index alone without a second lookup back into the table's heap/clustered data (called a bookmark lookup in SQL Server, or a heap fetch in Postgres). This is often the single biggest lever for read-heavy hot-path queries: it turns a 'find the row location, then fetch the row' two-step into a single index-only scan.",
            "A partial (filtered) index only indexes rows matching a WHERE clause — useful when a query always filters on a condition that's true for a small, well-defined subset of rows (e.g., status = 'PENDING' out of millions of 'COMPLETED' rows). It's smaller, faster to maintain, and cheaper to scan than a full index, at the cost of only being usable by queries whose predicate matches (or is provably a subset of) the index's condition."
          ],
          code: [{ lang: "bash", caption: "Composite, covering, and partial index examples (PostgreSQL syntax)", src:
`-- Composite: leftmost-prefix serves (status), (status, created_at),
-- NOT (created_at) alone.
CREATE INDEX idx_orders_status_created ON orders (status, created_at);

-- Covering: INCLUDE adds columns to the leaf level without making them
-- part of the sort key — query becomes index-only, no heap fetch.
CREATE INDEX idx_orders_covering ON orders (customer_id)
  INCLUDE (order_total, status);

-- Partial: only indexes the ~1% of rows still pending, cheap to maintain
-- and to scan; unusable for queries not filtering on status = 'PENDING'.
CREATE INDEX idx_orders_pending ON orders (created_at)
  WHERE status = 'PENDING';` }],
          tricks: [
            "The leftmost-prefix rule is the #1 thing candidates get wrong: an index on (a,b) does NOT help a query filtering only on b — know this cold and be ready to explain why (it's a sorted structure keyed by a first).",
            "Putting a high-cardinality range column before an equality column in a composite index quietly defeats the equality filter's selectivity — always order equality predicates before range predicates.",
            "A covering index avoiding a heap/bookmark lookup is often a bigger latency win than the index itself being 'better' — this is the detail that separates 'knows indexes exist' from 'has tuned a hot query in production.'"
          ]
        }},
      { id: "db-4", t: "Isolation levels & MVCC", d: "Medium", desc: "MVCC gives readers a consistent snapshot without blocking writers — the real question is which anomalies each isolation level still allows.",
        notes: {
          explain: [
            "The four ANSI isolation levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) are defined by which anomalies they permit: dirty reads (seeing another transaction's uncommitted writes), non-repeatable reads (re-reading a row and getting a different value because another transaction committed a change in between), and phantom reads (re-running a range query and seeing new rows that another transaction inserted and committed). Higher isolation prevents more anomalies but costs more concurrency — that tradeoff is the entire point of the hierarchy.",
            "MVCC (Multi-Version Concurrency Control) is how Postgres, Oracle, InnoDB, and most modern engines deliver these guarantees without readers blocking writers. Instead of a single mutable row, every UPDATE/DELETE creates a new version tagged with the transaction/timestamp that created it, and old versions are kept around until nothing could still need them. A read transaction gets a 'snapshot' — a view of the database as of a specific point in time — and simply ignores row versions created after that point. This means SELECT never has to wait for a writer's lock: a reader just looks past uncommitted or later versions and reads the version that was current at its snapshot time.",
            "The subtlety that trips people up: MVCC snapshot isolation (what Postgres actually calls REPEATABLE READ, and what Oracle calls SERIALIZABLE) prevents non-repeatable reads and phantoms by construction — but it does NOT prevent write skew, where two transactions each read overlapping data, each individually make a valid decision based on what they read, and both commit successfully even though the combination violates an invariant neither transaction alone violated. True SERIALIZABLE requires additional machinery (predicate locking, or Postgres's SSI — serializable snapshot isolation — which detects dangerous read/write dependency cycles and aborts one transaction) on top of plain MVCC snapshots."
          ],
          diagram: { type: "tree", root: "Isolation Levels (weakest → strongest)", caption: "Each level up prevents strictly more anomalies at the cost of more blocking/aborts.",
            children: [
              { label: "Read Uncommitted — allows dirty reads (rarely implemented in practice)" },
              { label: "Read Committed — blocks dirty reads; default in Oracle, PostgreSQL, SQL Server" },
              { label: "Repeatable Read — also blocks non-repeatable reads; MySQL InnoDB default (uses gap locks to also block most phantoms)" },
              { label: "Serializable — also blocks phantoms and write skew; enforced via predicate locking or conflict detection (e.g., Postgres SSI)" }
            ]},
          tricks: [
            "MySQL InnoDB's default is REPEATABLE READ, not READ COMMITTED — a common surprise since most other engines default lower. InnoDB also plugs the phantom-read gap at REPEATABLE READ using gap locks/next-key locking, which is not part of the ANSI spec's guarantee for that level.",
            "'MVCC means no locks' is a half-truth — readers don't block writers and writers don't block readers, but writer-vs-writer conflicts on the same row still require locking (or an abort-and-retry conflict check).",
            "Write skew is the interview trap: ask 'does snapshot isolation prevent all anomalies?' — the correct answer is no, and a concrete example (two doctors each independently going off-call, both checking 'is at least one other doctor on call', both seeing yes, both going off-call, leaving zero) demonstrates real understanding."
          ]
        }},
      { id: "db-5", t: "Locking & deadlock detection/resolution", d: "Medium", desc: "Deadlocks are found via a wait-for graph, not prevented by the engine — your job is to design access patterns that avoid them.",
        notes: {
          explain: [
            "Locks come in granularities (row, page, table) and modes (shared/read locks allow concurrent readers but block writers; exclusive/write locks block everyone). Most OLTP engines default to row-level locking for concurrency, but can escalate to table-level locks under memory pressure (too many row locks held) — lock escalation is a performance cliff worth knowing about, since a query that was fine at small scale can suddenly serialize the whole table once escalation kicks in.",
            "A deadlock happens when two or more transactions each hold a lock the other needs — transaction A holds a lock on row 1 and wants row 2, while transaction B holds row 2 and wants row 1. Neither can proceed and neither will voluntarily give up its lock. Databases don't prevent this proactively; they detect it. Internally the engine maintains a wait-for graph — an edge from transaction X to transaction Y whenever X is blocked waiting on a lock Y holds — and periodically checks for cycles. When a cycle is found, the engine picks a victim (usually the transaction that has done the least work / would be cheapest to roll back) and aborts it with a deadlock error, releasing its locks so the others can proceed.",
            "The practical fix is always on the application side: acquire locks (i.e., touch rows within a transaction) in a globally consistent order across all code paths. If every transaction that touches both row 1 and row 2 always locks row 1 first, the circular-wait condition can never form, and the deadlock detector never has anything to find."
          ],
          code: [{ lang: "bash", caption: "The classic two-transaction deadlock", src:
`-- Transaction A                    -- Transaction B
BEGIN;                              BEGIN;
UPDATE accounts SET balance =       UPDATE accounts SET balance =
  balance - 100 WHERE id = 1;         balance - 50 WHERE id = 2;
-- (holds lock on row 1)            -- (holds lock on row 2)

UPDATE accounts SET balance =       UPDATE accounts SET balance =
  balance + 100 WHERE id = 2;         balance + 50 WHERE id = 1;
-- blocks, waiting on B's lock      -- blocks, waiting on A's lock
-- ... deadlock detector fires, one transaction is aborted with a
-- deadlock error; the other proceeds and commits.

-- Fix: always touch accounts in a consistent order (e.g., by ascending id)
-- in every code path that updates more than one row.` }],
          tricks: [
            "A deadlock and a lock-wait timeout are different failure modes — a deadlock is detected quickly via cycle detection and one side is aborted immediately; a plain lock wait just blocks until the timeout fires, which can look identical from the app side but has a very different root cause.",
            "MySQL InnoDB's gap locks (used to implement REPEATABLE READ's phantom protection) can cause deadlocks in scenarios that look like they shouldn't conflict at all — two inserts into the same index gap can deadlock even though they're inserting different keys.",
            "'Just retry on deadlock' is a legitimate production pattern (deadlocks are expected and recoverable), but interviewers want to hear that you'd also fix the access-order issue causing it, not just paper over it with retries."
          ]
        }},
      { id: "db-6", t: "Write-ahead logging & durability guarantees", d: "Medium", desc: "The WAL is what lets a database ack a write durably without paying the cost of flushing data pages to disk on every transaction.",
        notes: {
          explain: [
            "The core problem WAL solves: flushing every modified data page to disk on every commit would be catastrophically slow, because data pages are scattered randomly across the file and a transaction might touch several of them. Instead, the engine writes a compact, sequential, append-only log record describing the change (write-ahead logging — the log record must hit durable storage before the change is considered committed) and only fsyncs that log, not the data pages. The actual data pages are updated in memory (the buffer pool/cache) and flushed to disk lazily, in the background, batched and reordered for efficiency — a process called checkpointing.",
            "This gives you durability without sacrificing write throughput: if the process crashes or the machine loses power right after commit, the data pages on disk may be stale, but the WAL has a durable record of every change up to the last fsync. On restart, crash recovery replays the WAL forward from the last checkpoint (redo) to bring data pages up to date, and optionally rolls back any transactions that were in-flight but never committed (undo — this is what Oracle's separate undo/rollback segments handle, versus a combined redo+undo log in some other engines). The WAL is also the mechanism that makes physical streaming replication possible — a replica can just receive and replay the same log stream the primary is writing.",
            "The durability/throughput knob most engines expose is how aggressively to fsync the WAL: fsync on every commit is fully durable but limits throughput to disk fsync latency; group commit batches multiple concurrent transactions' log records into a single fsync to amortize that cost; and disabling synchronous commit entirely (e.g., Postgres's synchronous_commit=off) trades a small window of potential data loss on crash for much higher throughput, because the client gets an ack before the fsync actually completes."
          ],
          diagram: { type: "flow", caption: "Commit is durable once the log record is fsynced — the data page write is deferred and batched.",
            steps: [
              { label: "Client issues COMMIT" },
              { label: "Log record appended to WAL buffer", arrowLabel: "→" },
              { label: "WAL fsynced to durable storage", note: "commit acked to client only after this", arrowLabel: "→" },
              { label: "Data pages updated in memory (buffer pool)", arrowLabel: "async" },
              { label: "Checkpoint flushes dirty pages to disk lazily, in batches", arrowLabel: "→" }
            ]},
          code: [{ lang: "properties", caption: "PostgreSQL — trading durability for throughput on the WAL fsync path", src:
`# Full durability (default): every commit waits for WAL fsync.
synchronous_commit = on

# Higher throughput, small crash-window data loss risk: client gets an ack
# before the WAL flush completes — a crash in that window loses the
# transaction even though the client believed it committed.
synchronous_commit = off

# wal_level controls how much detail is logged — 'replica' is required
# for streaming replication to have enough information to replay changes.
wal_level = replica` }],
          tricks: [
            "WAL provides durability, not replication, by itself — replication is a separate feature built ON TOP of the WAL by shipping and replaying the same log stream to another node; don't conflate the two.",
            "'The transaction committed' and 'the data page is on disk' are different events — mixing them up is a common misunderstanding. The data page can lag behind by minutes (until the next checkpoint) with zero durability risk, because the WAL is what's authoritative for recovery.",
            "Group commit is the detail that shows real depth: instead of one fsync per transaction, the engine batches concurrently-committing transactions' log records into a single fsync call, dramatically raising commit throughput under concurrent load — mention it when asked how a database achieves high commit rates despite fsync being slow."
          ]
        }}
    ]},
    { name: "Scaling", items: [
      { id: "db-7", t: "Sharding & partitioning strategies", d: "Medium", desc: "The shard key choice is the whole design — get it wrong and you either create a hot shard or make every query cross-shard.",
        notes: {
          explain: [
            "Sharding splits one logical dataset horizontally across multiple independent database instances, each holding a disjoint subset of rows, so that no single node has to hold or serve the entire dataset. The central design decision is the shard key (also called partition key) — the column(s) used to decide which shard a row lives on — and almost every downstream property of the system (hotspot risk, query patterns that stay single-shard vs. fan out, how painful resharding is) follows from that one choice.",
            "Range-based sharding (shard by contiguous key ranges, e.g., customer_id 1-1M on shard A, 1M-2M on shard B) keeps range queries and sorted scans efficient within a shard, but is prone to hotspots when writes cluster at one end of the range — e.g., sharding by timestamp puts all current writes on the newest shard. Hash-based sharding (hash the key, mod by shard count, or map onto a consistent-hash ring) spreads writes evenly and avoids hotspots, but destroys range-query locality — a range scan now has to fan out to every shard and merge results. A directory/lookup-based scheme adds an indirection layer (a mapping service) that can shard by more flexible, changeable criteria at the cost of an extra lookup hop and a new single point of failure/bottleneck to scale.",
            "Resharding — changing the number of shards or the assignment once the system is live — is the operational pain point interviewers probe for. Naive mod-based hashing means adding a shard reshuffles almost every key's assignment, requiring a massive data migration. Consistent hashing (mapping both shards and keys onto a hash ring, so each key belongs to the next shard clockwise from it) bounds the blast radius: adding or removing a shard only moves the keys between it and its immediate neighbor on the ring, not the whole dataset."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Range-based", points: ["Contiguous key ranges per shard", "Efficient range scans within a shard", "Prone to hotspots (e.g., time-ordered keys pile onto newest shard)"] },
              { title: "Hash-based (incl. consistent hashing)", points: ["Hash(key) determines shard — even write distribution", "Range queries must fan out across shards", "Consistent hashing bounds data movement when resharding"] }
            ]},
          tricks: [
            "Naming the hot-shard failure mode unprompted — e.g., sharding a chat app by conversation_id puts one viral group chat entirely on one shard — is a strong signal; most candidates only describe the happy path.",
            "Cross-shard joins and cross-shard transactions are the recurring cost of sharding — be ready to say how you'd avoid them (denormalization, choosing a shard key that keeps related data co-located, or accepting an application-level join).",
            "Consistent hashing is the answer whenever 'minimizing data movement on resharding' comes up — know roughly how it works (hash ring, virtual nodes for even distribution) well enough to sketch it."
          ]
        }},
      { id: "db-8", t: "Read replicas & replication lag handling", d: "Medium", desc: "Async replicas trade consistency for read scalability — the interview question is always what you do about the lag, not whether it exists.",
        notes: {
          explain: [
            "A read replica receives a continuous stream of changes from a primary (usually by shipping and replaying WAL/binlog records) and serves read traffic, letting you scale reads horizontally without adding write capacity. Replication is asynchronous by default in most setups: the primary acknowledges a write to the client as soon as it's durable locally, without waiting for any replica to apply it. That's what makes it fast, and it's also what creates replication lag — a window during which a replica's data is behind the primary's.",
            "The practical failure mode is read-your-own-writes: a user updates their profile, the write commits on the primary, the app immediately reads from a replica to render the confirmation page, and the replica hasn't caught up yet — the user sees their own change appear to have been lost. Common mitigations: route reads-after-writes to the primary for some short window (sticky session or 'read your own writes' routing), track a log sequence number/timestamp from the write and require the replica to be caught up to at least that point before serving the read (causal/session consistency), or simply accept eventual consistency for reads where staleness is tolerable (e.g., a public profile view for someone else).",
            "Semi-synchronous replication (primary waits for at least one replica to acknowledge receipt of the log record, though not necessarily full apply, before acking the client) narrows the durability gap — it protects against losing the most recent transaction if the primary dies right after commit — at the cost of added write latency and reduced availability if replicas are slow or unreachable. Fully synchronous replication removes the lag/data-loss risk entirely but couples write latency and availability to every synchronous replica's health, which is why most high-throughput systems don't run fully sync by default."
          ],
          diagram: { type: "flow", caption: "Async replication: the client is acked before the replica has necessarily applied the change — this window is the 'lag.'",
            steps: [
              { label: "Write commits on primary (WAL fsynced)" },
              { label: "Client acked", arrowLabel: "→" },
              { label: "Log record streamed to replica(s)", note: "async, unbounded delay under load", arrowLabel: "→ (lag window)" },
              { label: "Replica applies change, now consistent", arrowLabel: "→" }
            ]},
          tricks: [
            "'Eventual consistency' isn't a single guarantee — know the specific consistency models it can mean in this context (read-your-writes, monotonic reads, causal consistency) rather than treating it as one blurry concept.",
            "Failover with async replication has a data-loss edge case: if the primary dies before its most recent commits replicate out, promoting a replica loses those transactions — this is the concrete tradeoff behind 'async replication is faster but less safe,' and naming it explicitly is worth more than the generic statement.",
            "Monitoring replication lag (seconds_behind_master in MySQL, replay lag in Postgres) is an operational detail worth mentioning — a replica silently falling further and further behind under load is a common real-world incident, not just a textbook concern."
          ]
        }},
      { id: "db-9", t: "Connection pooling deep dive (sizing, leak detection)", d: "Easy", desc: "You've already done connection-pooling work at Amdocs — go deeper into sizing math.",
        notes: {
          explain: [
            "A connection pool exists because opening a new database connection is expensive (TCP handshake, auth, and on some engines a new backend process/thread) relative to the query it's about to run, so the pool keeps a set of connections open and hands them out to threads on demand, returning them to the pool when the thread is done. The counter-intuitive part most people get wrong is sizing: bigger is not better. Beyond a certain point, more concurrent connections just means more contention for the database's own finite resources (CPU cores, disk I/O, lock contention, and — for process-per-connection engines like PostgreSQL — real OS process/memory overhead per connection), so throughput plateaus and then degrades as the pool grows past that point.",
            "HikariCP's own sizing guidance formalizes this with a version of Little's Law: connections ≈ (core_count * 2) + effective_spindle_count as a starting point for a CPU-bound, low-wait workload, but the more general and useful formula is pool_size = threads * (1 + wait_time / compute_time) — if your average query spends most of its time waiting on I/O rather than the DB actively computing, you need more connections per core to keep throughput up; if queries are CPU-bound on the DB side, a small pool saturates the DB just as fast as a large one while adding less contention.",
            "Connection leaks — a thread checks out a connection and, due to a missing close() in an exception path or a forgotten try-with-resources, never returns it — are the most common real-world pool pathology. The symptom is a pool that slowly shrinks toward zero available connections under sustained load until every new request blocks waiting for a connection that will never come back, which looks like a total outage even though the database itself is healthy. Pools like HikariCP expose a leak-detection-threshold: log a warning with a stack trace if a connection is checked out longer than that threshold, which is usually the fastest way to actually find the offending code path in production."
          ],
          code: [{ lang: "yaml", caption: "Spring Boot / HikariCP — sizing and leak detection", src:
`spring:
  datasource:
    hikari:
      maximum-pool-size: 20        # not "bigger is better" — size for DB capacity, not thread count
      minimum-idle: 20              # keep it fixed; pool resizing adds latency spikes under load
      connection-timeout: 3000      # ms to wait for a connection before failing fast
      leak-detection-threshold: 60000  # ms — log a warning + stack trace for connections held too long
      idle-timeout: 600000
      max-lifetime: 1800000         # recycle connections periodically (avoids stale/half-dead sockets)` }],
          tricks: [
            "A thread-starvation deadlock is the classic pool bug: two operations each need two connections from the same pool to complete (e.g., a request handler that opens a connection, then calls another method that also needs one) — under load every connection is checked out by threads each waiting for a second connection that's held by another waiting thread. The fix is architectural (never need more than one connection per logical unit of work), not a bigger pool.",
            "PostgreSQL's default max_connections is often surprisingly low (100) relative to what an app tier's pools can request in aggregate across multiple instances — total connections across all app instances/pools must stay under the DB's real ceiling, which is why a pgbouncer/proxy layer is common at scale.",
            "leak-detection-threshold logs a warning, it doesn't fix the leak — the fix is always finding and closing the actual leaking code path; treat the log as a debugging tool, not a mitigation."
          ]
        }},
      { id: "db-10", t: "Database-per-service vs shared database tradeoffs", d: "Medium", desc: "A shared database is the fastest way to build a microservices architecture and the fastest way to make it stop being one.",
        notes: {
          explain: [
            "A shared database lets multiple services read and write the same schema directly — it's operationally simple and makes cross-entity joins trivial, which is exactly why it's the default people reach for first. The problem is that it silently recreates a monolith at the data layer: any service can depend on any other service's table structure, so a schema change requires coordinating every service that touches that table, and a slow or misbehaving query from one service can degrade the database for everyone else. It defeats the entire point of drawing service boundaries — the coupling just moved from the code to the schema.",
            "Database-per-service enforces the boundary: each service owns its schema exclusively, and every cross-service interaction goes through that service's API (or an async event) instead of a direct join. This buys independent deployability and failure isolation (one service's database problems don't cascade), but it means anything that used to be 'just a SQL join' becomes either an API call at read time, a denormalized/duplicated read model kept in sync via events, or a distributed transaction (Saga) if it needs to be atomic across services — all strictly more complex than a join.",
            "The realistic answer in an interview isn't 'always database-per-service' — it's that the shared-database approach is a reasonable, honest tradeoff for a small team or an early-stage system where the coordination cost of full service independence isn't justified yet, while database-per-service is the right call once services need to deploy, scale, and fail independently. Calling out that this is a maturity/scale tradeoff rather than a purity rule is itself a signal of seniority."
          ],
          diagram: { type: "compare",
            columns: [
              { title: "Shared database", points: ["Joins across entities are trivial SQL", "Schema changes require cross-team coordination", "One service's load/locking can degrade all services", "Fast to start, doesn't scale organizationally"] },
              { title: "Database-per-service", points: ["Independent deploys, independent scaling, failure isolation", "Cross-service reads need an API call, event-driven read model, or Saga", "More operational surface area (more databases to run)", "Right fit once teams/services need to move independently"] }
            ]},
          tricks: [
            "Don't present this as a purity rule — the strongest answer names the actual tradeoff (coordination cost vs. query simplicity) and states which one fits the described team/scale.",
            "'Database-per-service' doesn't require different database engines or even different physical instances — schema-level or logical separation with strict access boundaries (no service reads another's tables directly) already delivers most of the decoupling benefit at lower operational cost.",
            "This connects directly to the outbox pattern and Saga (db-11) — cross-service consistency is the recurring cost of this choice, and naming that connection unprompted is worth pointing out."
          ]
        }},
      { id: "db-11", t: "Distributed transactions: 2PC, Saga, outbox pattern", d: "Hard", desc: "2PC gives atomicity by blocking; Saga gives progress by giving up atomicity — know which failure mode you're trading for which.",
        notes: {
          explain: [
            "Two-Phase Commit (2PC) is the classic way to get atomicity across multiple independent databases/services: a coordinator asks every participant to 'prepare' (do all the work, acquire all locks, but don't commit yet) in phase one; only if every participant votes yes does the coordinator tell everyone to actually commit in phase two. This gives true atomicity, but at a real cost — every participant holds its locks for the entire round trip, and if the coordinator crashes after phase one but before sending the commit decision, participants are stuck holding locks indefinitely, unable to safely commit or abort on their own (the 'blocking problem'). This is why 2PC is rare in practice at internet scale — it trades availability for strong consistency in a way that doesn't hold up under network partitions or coordinator failure.",
            "The Saga pattern gives up atomicity in exchange for availability: instead of one all-or-nothing transaction, you break the workflow into a sequence of local transactions, each committing independently, with a defined compensating transaction for each step that can undo its effect if a later step fails. Choreography (each service publishes events and reacts to others' events, no central coordinator) keeps services decoupled but makes the overall workflow hard to see/reason about; orchestration (a central saga orchestrator explicitly calls each step and triggers compensations on failure) is easier to reason about and debug but reintroduces a central component. Critically, a Saga has no isolation — other transactions can observe intermediate, partially-completed state while the saga is still in flight, which is a real design constraint you have to account for (e.g., a 'PENDING' status visible to other reads until the saga either completes or compensates).",
            "The outbox pattern solves a narrower but extremely common problem: how do you atomically both write to your database AND publish an event/message about that write, when the database and the message broker are two separate systems that can't participate in one transaction together? The answer is to write the event into an 'outbox' table in the same local database transaction as the business data change — that's a single-database transaction, so it's trivially atomic — and have a separate background process (or a change-data-capture tool like Debezium reading the DB's WAL/binlog) asynchronously publish rows from the outbox table to the actual message broker, marking them sent. This guarantees the event is eventually published if and only if the business transaction committed, without needing a distributed transaction at all."
          ],
          diagram: { type: "flow", caption: "Outbox pattern — one local ACID transaction avoids the dual-write problem (DB commits but the broker publish fails, or vice versa).",
            steps: [
              { label: "BEGIN transaction" },
              { label: "Write business row (e.g., orders)", arrowLabel: "→" },
              { label: "Write event row to outbox table (same transaction)", arrowLabel: "→" },
              { label: "COMMIT", note: "atomic — both rows or neither" },
              { label: "Relay (poller or CDC/Debezium) publishes outbox rows to broker", arrowLabel: "async, at-least-once" }
            ]},
          code: [{ lang: "bash", caption: "Outbox table shape and the atomic write", src:
`CREATE TABLE outbox (
  id UUID PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  published BOOLEAN DEFAULT false
);

-- Single local transaction — atomic by ordinary ACID guarantees, no 2PC needed.
BEGIN;
  INSERT INTO orders (id, customer_id, status) VALUES ('o-1', 'c-42', 'CREATED');
  INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload)
    VALUES (gen_random_uuid(), 'Order', 'o-1', 'OrderCreated', '{"orderId":"o-1"}');
COMMIT;` }],
          tricks: [
            "A classic follow-up: 'what if the coordinator dies mid-2PC?' — the correct answer is participants are stuck blocking, holding their locks, unable to unilaterally decide; this is the specific failure mode that motivates avoiding 2PC across service boundaries.",
            "Sagas provide no isolation between steps — be ready to say what an intermediate/partial state looks like to another concurrent reader, and how you'd handle it (a visible PENDING status, or hiding partial state behind an API that only exposes terminal states).",
            "The outbox pattern is the direct answer to 'how do you avoid the dual-write problem' (DB write succeeds, message publish fails, or vice versa) — naming it by name, plus knowing CDC tools like Debezium are the common relay mechanism, is a strong signal."
          ]
        }},
      { id: "db-12", t: "CAP theorem applied to real systems you use (Kafka, Mongo, RDS)", d: "Medium", desc: "CAP only forces a choice during an actual network partition — the interesting part is what a real system does the rest of the time.",
        notes: {
          explain: [
            "CAP theorem states that a distributed system can't simultaneously guarantee Consistency (every read sees the latest write), Availability (every request gets a non-error response), and Partition tolerance (the system keeps working despite network partitions between nodes) — but the commonly misunderstood part is that partition tolerance isn't really an optional design choice you trade away; real networks partition, so any distributed system must handle that case somehow. CAP is really about what you do during a partition: you either refuse to serve some requests to preserve consistency (CP), or you keep serving requests and accept that some of them might return stale or divergent data (AP). Outside of an actual partition, most systems can and do offer both consistency and availability just fine — CAP is a statement about partition behavior, not a permanent 24/7 tradeoff.",
            "Applied to systems you'd actually run: MongoDB with a majority write concern and majority read concern behaves CP-leaning — a write isn't acknowledged until it's replicated to a majority of the replica set, and if a partition strands the primary in a minority, that primary steps down and stops accepting writes rather than risk divergence. Cassandra is a good AP example with a tunable knob — you choose consistency level per-request (ONE, QUORUM, ALL), trading off availability and latency against consistency on a per-query basis rather than a fixed system-wide choice. Kafka is CP-leaning for its own metadata/leader election (via the controller/Raft-based KRaft quorum) but its per-partition availability during a leader failure depends on acks/replication settings — acks=all with min.insync.replicas enforces durability at the cost of availability if too few replicas are in sync.",
            "PACELC is the extension worth bringing up unprompted: it observes that CAP only describes behavior during a Partition, but even absent a partition (Else) every system still makes a Latency vs Consistency tradeoff — do you wait for a quorum of replicas to acknowledge (higher consistency, higher latency) or return as soon as one node responds (lower latency, weaker consistency)? Bringing up PACELC signals you understand CAP's real scope and its limits, rather than reciting it as an absolute law."
          ],
          diagram: { type: "compare", caption: "What each system chooses to sacrifice specifically during a partition — not a permanent, everyday state.",
            columns: [
              { title: "CP-leaning", points: ["MongoDB (majority write/read concern): minority-side primary steps down, stops accepting writes", "Kafka controller/KRaft quorum: needs majority to elect a leader", "Refuses requests it can't answer consistently during a partition"] },
              { title: "AP-leaning", points: ["Cassandra with consistency level ONE/LOCAL_QUORUM: keeps serving on both sides of a partition", "May return stale or conflicting data, reconciled later (read repair, LWW, vector clocks)", "Prioritizes staying up over agreement during a partition"] }
            ]},
          tricks: [
            "The most common CAP mistake in interviews: treating it as 'pick 2 of 3 forever' — the correct framing is it only forces a choice during an actual partition; state that explicitly and you'll stand out.",
            "Bring up PACELC unprompted when discussing any of these systems — it shows you know CAP is incomplete on its own (it says nothing about the latency/consistency tradeoff in normal operation).",
            "Know that consistency level is often tunable per-request in real systems (Cassandra, DynamoDB) rather than a fixed global property of 'the database' — this nuance is frequently what separates a textbook answer from a production one."
          ]
        }}
    ]},
    { name: "Engine-Specific Depth", items: [
      { id: "db-13", t: "MySQL/Oracle performance tuning (explain plans, statistics, hints)", d: "Medium", desc: "Most 'the optimizer chose a bad plan' incidents are actually 'the statistics were stale' incidents.",
        notes: {
          explain: [
            "Tuning starts with the same execution-plan reading covered in db-2, but engine-specific tuning is about knowing what triggers a bad plan in this particular optimizer and how to fix the root cause rather than fighting the symptom. The most common real cause is stale statistics after bulk loads, large deletes, or heavy update churn — the optimizer's row-count and cardinality estimates no longer reflect reality, so it picks a plan that was optimal for the old data distribution. The fix is refreshing statistics (ANALYZE TABLE in MySQL, DBMS_STATS.GATHER_TABLE_STATS in Oracle), not reaching for a hint.",
            "Hints (FORCE INDEX / USE INDEX in MySQL, optimizer hints like /*+ INDEX(...) */ in Oracle) force the optimizer's hand and should be treated as a last resort, because they're brittle — a hint tuned for today's data distribution and index set can become actively harmful as data grows or indexes change, since it overrides the optimizer's ability to adapt. The stronger answer, when the optimizer is consistently wrong on a specific query shape, is usually to fix the underlying statistics quality (histogram granularity on skewed columns), rewrite the query to be more sargable, or add a more targeted index — hints are for when you've exhausted those and need an immediate, known-to-be-temporary fix.",
            "Oracle-specific depth worth having: bind variable peeking, where the optimizer builds a plan based on the specific literal values seen the first time a parameterized query is parsed and then reuses that plan for all future executions with different bind values — great when the data distribution is uniform, disastrous when it's skewed (a plan optimized for a rare value gets reused for a common one, or vice versa). Adaptive cursor sharing was Oracle's answer — letting the same SQL text have multiple cached plans selected based on bind value ranges."
          ],
          code: [{ lang: "bash", caption: "MySQL — refreshing stats and forcing an index as a last resort", src:
`ANALYZE TABLE orders;
SHOW INDEX FROM orders;

-- Last resort: force an index the optimizer is refusing to use despite
-- fresh statistics (e.g., a genuinely low-selectivity case the optimizer
-- under/overestimates).
SELECT /*+ INDEX(orders idx_orders_status_created) */ *
FROM orders FORCE INDEX (idx_orders_status_created)
WHERE status = 'PENDING' ORDER BY created_at DESC LIMIT 50;` }],
          tricks: [
            "Bulk loads and large batch deletes are the classic trigger for 'the query was fast yesterday, slow today' incidents — always ask 'when were statistics last gathered' before assuming the optimizer is simply wrong.",
            "Hints should be framed as a temporary, monitored fix, not a permanent one — a strong answer mentions revisiting/removing the hint once the underlying cause (stats, index, query shape) is actually fixed.",
            "Oracle's bind variable peeking is a genuinely tricky, senior-level gotcha — a query that's fast for 99% of executions and catastrophically slow for the other 1% (skewed parameter values reusing a cached plan built for a different value) is a strong real-world story if you have one."
          ]
        }},
      { id: "db-14", t: "MongoDB advanced: aggregation pipeline, sharding, index strategy", d: "Medium", desc: "The aggregation pipeline is only as fast as the index the early stages can use — $match and $sort placement matters as much as the index itself.",
        notes: {
          explain: [
            "The aggregation pipeline processes documents through an ordered sequence of stages ($match, $group, $sort, $project, $lookup, etc.), and — like a SQL query plan — the order of stages has real performance consequences. $match and $sort stages placed early in the pipeline can use an index the same way a WHERE/ORDER BY would in SQL; the same stages placed after a $group or $unwind can't, because by then the pipeline is operating on newly-shaped, non-indexed intermediate documents. The single biggest aggregation performance lever is pushing $match as early as possible to filter the working set down before any expensive stage touches it.",
            "$lookup (MongoDB's join-equivalent) deserves specific caution: it's not a real relational join with an optimizer choosing hash/merge/nested-loop strategies — it's closer to a per-document (or per-batch) lookup into the foreign collection, and it gets expensive fast at scale. The idiomatic MongoDB answer to 'avoid an expensive $lookup' is usually denormalization — embedding the data you'd otherwise join, accepting write-side duplication for read-side speed — which is a deliberate, document-model-specific tradeoff worth naming explicitly rather than reflexively normalizing the way you would in a relational schema.",
            "Compound index strategy in MongoDB follows the ESR rule: order index fields as Equality predicates first, then Sort fields, then Range predicates last — mirroring the same leftmost-prefix logic as a relational composite index (db-3), but MongoDB's documentation names it explicitly as ESR, which is worth citing by name. Sharding in MongoDB distributes chunks of a collection across shards by a shard key's hashed or ranged value; poor shard key choice (e.g., a monotonically increasing key like an auto-incrementing counter or timestamp) concentrates all new writes on one shard — the same hot-shard problem covered generally in db-7, but MongoDB's chunk-splitting/balancer is the concrete mechanism that (eventually, not instantly) redistributes data across shards as chunks grow."
          ],
          code: [{ lang: "bash", caption: "Aggregation — $match early, ESR-ordered index behind it", src:
`db.orders.aggregate([
  { $match: { status: "PENDING", createdAt: { $gte: ISODate("2026-08-01") } } }, // uses index, runs first
  { $sort: { createdAt: -1 } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $project: { _id: 0, customerId: "$_id", total: 1 } }
]);

// ESR rule: Equality (status) -> Sort (createdAt) -> Range (none here, but
// a range predicate would go last).
db.orders.createIndex({ status: 1, createdAt: -1 });` }],
          tricks: [
            "$lookup is the thing to flag proactively — know that it doesn't have the query-planner sophistication of a relational join, and that the MongoDB-idiomatic fix is often embedding/denormalizing rather than optimizing the join itself.",
            "ESR (Equality, Sort, Range) is the name to use — citing it by name for compound index design is a stronger answer than vaguely gesturing at 'put the filtered field first.'",
            "A monotonically increasing shard key (timestamp, auto-increment ID) is the MongoDB-specific version of the hot-shard trap from db-7 — all new writes land on the highest-range chunk/shard until the balancer catches up."
          ]
        }},
      { id: "db-15", t: "PostgreSQL advanced features (if targeting companies that run it)", d: "Medium", desc: "VACUUM isn't cleanup — it's what makes Postgres's MVCC model work at all, and falling behind on it degrades everything.",
        notes: {
          explain: [
            "Postgres's MVCC implementation never overwrites a row in place — an UPDATE creates a whole new row version and marks the old one as dead (a DELETE just marks it dead), which is what lets concurrent readers see a consistent snapshot without blocking on writers. The cost is that dead row versions accumulate as table 'bloat' and are never automatically reclaimed by the write path itself — that's VACUUM's job: it scans for dead tuples no longer visible to any active transaction and marks that space reusable. Autovacuum runs this automatically in the background, but under sustained heavy write/update load it can fall behind, and a table with excessive bloat gets measurably slower to scan even though its logical row count hasn't grown — this is one of the most common real-world Postgres performance incidents and a good one to know cold.",
            "JSONB is worth knowing beyond 'Postgres has a JSON type' — unlike plain JSON (stored as text, re-parsed on every access), JSONB is stored in a decomposed binary format that's directly indexable (via GIN indexes) and supports containment queries (@>) efficiently. This gives you a genuine hybrid: relational columns for your fixed schema plus a JSONB column for variable/sparse attributes, queryable with real index support instead of falling back to full scans — useful when a schema has a long tail of optional, rarely-queried fields that don't justify dedicated columns.",
            "Window functions (OVER (PARTITION BY ... ORDER BY ...)) let you compute aggregates (running totals, rankings, moving averages) alongside the individual rows they're computed over, without collapsing rows the way GROUP BY does — genuinely useful for things like 'each order's amount alongside that customer's running total' in one query instead of a self-join or app-side loop. CTEs (WITH clauses), especially recursive CTEs, are Postgres's answer for hierarchical/graph-shaped queries (org charts, category trees) that would otherwise need multiple round trips or app-side recursion."
          ],
          code: [{ lang: "bash", caption: "JSONB with a GIN index, and a window function for a running total", src:
`-- JSONB: binary-stored, indexable, containment-queryable
CREATE TABLE events (id BIGSERIAL PRIMARY KEY, payload JSONB);
CREATE INDEX idx_events_payload ON events USING GIN (payload);
SELECT * FROM events WHERE payload @> '{"type": "signup"}';

-- Window function: per-row running total without collapsing rows
SELECT customer_id, order_id, amount,
       SUM(amount) OVER (PARTITION BY customer_id ORDER BY created_at) AS running_total
FROM orders;

-- Check for bloat / vacuum health
SELECT relname, n_dead_tup, n_live_tup, last_autovacuum
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;` }],
          tricks: [
            "'Why does this table need VACUUM if I never delete anything' is a great question to be ready for — UPDATEs create dead tuples too, since Postgres MVCC never updates in place.",
            "JSONB vs JSON: JSONB is binary and indexable but slightly slower to write (decomposition cost) and doesn't preserve exact input formatting/key order/duplicate keys; JSON is just stored as text with none of that indexing capability. Know why JSONB is almost always the right default despite the write cost.",
            "A bloated table with a high n_dead_tup relative to n_live_tup, or an autovacuum that's clearly falling behind, is a strong 'you've actually operated Postgres' talking point — most candidates only know VACUUM exists, not how to recognize it's failing."
          ]
        }},
      { id: "db-16", t: "Time-series & analytical stores (ClickHouse/TimescaleDB) for metrics workloads", d: "Medium", desc: "Relevant given your Prometheus/observability background — the same cardinality traps you've hit operationally show up as the core design constraint here.",
        notes: {
          explain: [
            "Time-series and analytical workloads have a fundamentally different access pattern than OLTP: writes are almost always new, time-ordered, append-only data (rarely updates), and reads are usually aggregations over a time range and a set of dimensions (avg CPU per host over the last hour) rather than point lookups of a single row. This shifts the right storage layout from row-oriented (good for fetching one whole row at a time) to column-oriented (good for scanning one column across millions of rows while ignoring the others) — ClickHouse's MergeTree engine and similar analytical stores store each column contiguously on disk, so an aggregation query only has to read the columns it actually needs, and columnar data compresses far better than row data because adjacent values in a single column tend to be similar (delta encoding, dictionary encoding).",
            "TimescaleDB takes a different approach: it's Postgres with automatic time-based partitioning under the hood (hypertables transparently split into chunks by time range), so you keep full SQL/Postgres compatibility while gaining the operational benefits of partitioning — old chunks can be compressed or dropped cheaply (drop a whole chunk instead of a slow row-by-row DELETE), and queries that filter by time range only touch the relevant chunks instead of scanning the whole table. This is the practical tradeoff to articulate: ClickHouse trades ecosystem compatibility for maximum raw analytical throughput and compression; TimescaleDB trades some of that ceiling for staying inside the Postgres ecosystem (existing tooling, joins, extensions) most teams already know.",
            "The specific trap that connects directly to Prometheus operational experience is cardinality: a time-series database's practical scaling limit is usually not the number of data points, it's the number of distinct label/tag combinations (a metric with a user_id label instead of a bounded enum can generate millions of distinct series), because each unique combination of labels is tracked as its own independent series with its own index entry and memory overhead. This is exactly the 'high cardinality label blew up memory usage' incident class that's common in real Prometheus deployments, and it's the single most important design constraint to mention when discussing any time-series system, not just Prometheus specifically."
          ],
          code: [{ lang: "bash", caption: "ClickHouse — columnar MergeTree with time-based partitioning", src:
`CREATE TABLE metrics (
  ts DateTime,
  host String,
  metric_name String,
  value Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)      -- old months can be dropped/archived cheaply
ORDER BY (metric_name, host, ts); -- sort key = the columns queries filter/aggregate by

-- Scans only the value column + relevant partitions, not whole rows
SELECT host, avg(value) FROM metrics
WHERE metric_name = 'cpu_usage' AND ts >= now() - INTERVAL 1 HOUR
GROUP BY host;` }],
          tricks: [
            "Cardinality explosion is the trap to raise proactively — a label with unbounded distinct values (request IDs, user IDs) turns a bounded number of time series into an unbounded one, and it's the most common real production incident in this space, not a hypothetical.",
            "Know the columnar-vs-row-store reasoning cold: column stores win specifically because analytical queries touch few columns across many rows, and because same-column data compresses much better than mixed-type row data — this is the 'why', not just the 'what'.",
            "TimescaleDB vs ClickHouse is a legitimate tradeoff to articulate unprompted: Postgres-compatibility-and-joins vs. maximum ingest/compression/query throughput — naming which one you'd pick and why for a given scenario is stronger than describing either in isolation."
          ]
        }},
      { id: "db-17", t: "Vector databases for search/AI workloads", d: "Easy", desc: "Overlaps with the Generative AI track — exact nearest-neighbor search doesn't scale, so every vector database is really an approximate-search index with a recall/latency dial.",
        notes: {
          explain: [
            "A vector database stores high-dimensional embeddings (numeric vectors produced by an ML model that place semantically similar items close together in vector space) and answers 'find the k most similar vectors to this query vector' — nearest-neighbor search. Computing exact nearest neighbors means comparing the query against every stored vector, which is linear in dataset size and becomes impractically slow at real-world scale (millions to billions of vectors); every production vector database is therefore built around Approximate Nearest Neighbor (ANN) search, deliberately trading a small amount of recall (chance of finding the true best match) for orders-of-magnitude faster lookups.",
            "HNSW (Hierarchical Navigable Small World) is the ANN algorithm most widely used in practice (pgvector, Pinecone, Weaviate, Milvus): it builds a multi-layer graph where each vector is a node connected to its approximate neighbors, with sparser layers on top for fast coarse navigation and denser layers below for fine-grained search — a query starts at the top layer, greedily walks toward the closest node, and descends layer by layer, converging on a good answer in roughly logarithmic time instead of linear. The alternative family, IVF (Inverted File Index), clusters vectors into buckets ahead of time and only searches the buckets nearest the query vector, trading some more recall for lower memory overhead than HNSW's graph structure — a tradeoff worth naming if asked to compare index types.",
            "Similarity metric choice matters and is a common oversight: cosine similarity (angle between vectors, ignores magnitude) is the standard choice for text embeddings where only direction/meaning matters, dot product is faster to compute and equivalent to cosine similarity if vectors are pre-normalized to unit length, and Euclidean/L2 distance is more common for embeddings where absolute magnitude carries information (e.g., some image embeddings). In practice, most production systems also run hybrid search — combining vector similarity with traditional keyword/BM25 search and re-ranking — because pure vector search alone tends to miss exact-match cases (product SKUs, proper nouns) that keyword search handles trivially."
          ],
          tricks: [
            "The first thing to say when asked about vector DBs at scale: exact KNN doesn't work past a certain size, so the real conversation is about the ANN algorithm and its recall/latency/memory tradeoff, not about vector storage itself.",
            "HNSW's memory cost is significant (the graph structure itself, on top of the vectors) and index build time grows with the dataset — know this as the concrete cost side of HNSW's speed advantage over brute-force or IVF.",
            "Hybrid search (vector similarity + traditional keyword search, then re-ranked) is the answer to 'what does pure vector search miss' — exact terms like SKUs, IDs, or rare proper nouns are exactly where embeddings underperform simple keyword matching."
          ]
        }}
    ]},
    { name: "Practice", items: [
      { id: "db-18", t: "Diagnose a slow query from a real execution plan", d: "Medium", desc: "The framework is: find the estimate-vs-actual gap first, then work outward to the fix — not 'add an index and hope.'",
        notes: {
          explain: [
            "What an interviewer wants to see here is a repeatable diagnostic process, not a lucky guess. Start by getting the actual plan, not the estimated one — EXPLAIN ANALYZE (or the engine's equivalent), because estimated costs alone can't tell you where reality diverged from the optimizer's assumptions. Read the plan from the innermost/rightmost node outward, and at each node compare estimated rows to actual rows — the node where that gap first appears (and is large) is almost always your root cause, because every decision built on top of it (join algorithm, join order, whether an index was even considered worth using) inherited a bad assumption from that point on.",
            "From there, narrow to a category of cause and state it explicitly before proposing a fix: stale statistics (recently bulk-loaded or heavily churned table — fix: refresh stats), a missing or wrong index (a full scan where a selective predicate exists — fix: add a targeted index, check column order against the query's predicates), a non-sargable predicate (a function or implicit cast wrapping the indexed column preventing index use — fix: rewrite the predicate), or a genuinely expensive necessary operation (a large sort or hash join that's actually required by the query's semantics — fix: reduce the working set earlier, e.g. filter before joining, or accept the cost and add a covering index to speed the necessary work).",
            "Close the loop: after applying a fix, re-run EXPLAIN ANALYZE and confirm the actual behavior changed as predicted (plan shape switched, actual time dropped, estimate/actual gap closed) — stating that you'd verify rather than assume the fix worked is exactly the kind of rigor this exercise is testing for, and it's the detail most candidates skip under interview pressure."
          ],
          code: [{ lang: "bash", caption: "A worked diagnostic pass", src:
`EXPLAIN ANALYZE
SELECT o.id, o.amount FROM orders o
WHERE o.status = 'PENDING' AND o.created_at > now() - interval '1 day';

-- Seq Scan on orders (cost=0.00..52341.00 rows=8 width=24)
--   (actual time=0.03..289.10 rows=41022 loops=1)
--   Filter: (status = 'PENDING' AND created_at > ...)
-- estimated 8 rows, actual 41022 -> stats badly stale, likely after a
-- bulk status update; optimizer picked Seq Scan believing the filter
-- was highly selective.

ANALYZE orders;
CREATE INDEX CONCURRENTLY idx_orders_status_created
  ON orders (status, created_at);   -- equality col first, range col second

-- Re-run EXPLAIN ANALYZE to confirm: Index Scan replaces Seq Scan,
-- actual time drops, estimate/actual gap closes.` }],
          tricks: [
            "Say the process out loud, in order — get the real plan, find the estimate/actual gap, categorize the cause, fix the specific cause, verify — interviewers are scoring the method as much as the final answer.",
            "Never propose 'just add an index' as the first move without first identifying why the current plan is bad — sometimes the index already exists and isn't being used (non-sargable predicate, stale stats), and blindly adding another index doesn't fix that.",
            "CREATE INDEX CONCURRENTLY (Postgres) or an online DDL equivalent is worth mentioning if the table is large and live — a plain CREATE INDEX takes a lock that blocks writes for the duration of the build."
          ]
        }},
      { id: "db-19", t: "Design a schema for a high-write fintech ledger (append-only, auditability)", d: "Hard", desc: "Ledgers are never updated, only appended to — every 'correction' is a new offsetting entry, not an edit.",
        notes: {
          explain: [
            "The foundational design decision an interviewer is listening for: a financial ledger table is append-only. You never UPDATE or DELETE a financial record — every change, including corrections and reversals, is a new row that references what it's correcting. This isn't just a style preference; it's what makes the ledger auditable (a complete, tamper-evident history of every state the account was ever in) and it maps directly onto double-entry bookkeeping — every transaction writes at least two balanced rows (a debit and a credit) that net to zero, so the ledger is self-verifying: at any point you can sum all entries and the books must balance, and if they don't, you've detected corruption or a bug, not just recorded one.",
            "Idempotency is the second pillar to raise unprompted: financial writes will be retried (client timeouts, network failures, at-least-once message delivery), and a ledger must guarantee a retried write doesn't double-apply. The standard mechanism is a client-supplied idempotency key (unique per logical operation) with a uniqueness constraint on it — the write becomes 'insert this ledger entry with this idempotency key' where a duplicate key on retry is safely rejected/ignored rather than creating a second, phantom transaction. This is table stakes for any payment/ledger system and worth naming even if not asked directly.",
            "Concretely: an accounts table (current balance is a derived/cached value, never the source of truth) and a ledger_entries table (append-only, immutable rows: account_id, amount, direction, transaction_id grouping the balanced set of entries, idempotency_key, created_at, and a reference to what it's correcting if it's a reversal). Balance queries should be able to reconstruct 'balance as of any point in time' by summing entries up to that point — which is also your audit trail for free. For consistency under concurrent writes to the same account, either serialize writes per-account (a queue or a row-level lock on the account's latest-balance pointer) or use a database-level constraint that the running balance never goes negative, enforced at write time within the same transaction that inserts the entries."
          ],
          code: [{ lang: "bash", caption: "Double-entry, append-only, idempotent ledger schema", src:
`CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  currency TEXT NOT NULL
  -- no balance column here: balance is derived from ledger_entries
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL,     -- groups the balanced set of entries for one operation
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount_cents BIGINT NOT NULL,     -- always positive; direction says which way
  direction TEXT NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  idempotency_key TEXT NOT NULL UNIQUE,  -- retries are safely rejected, not double-applied
  reverses_entry_id UUID REFERENCES ledger_entries(id), -- NULL unless this is a correction
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- rows are NEVER updated or deleted after insert.

-- Current balance is a query, not a stored field:
SELECT account_id,
       SUM(CASE WHEN direction = 'CREDIT' THEN amount_cents ELSE -amount_cents END) AS balance_cents
FROM ledger_entries WHERE account_id = 'a-1' GROUP BY account_id;` }],
          tricks: [
            "State 'append-only, no updates, no deletes' explicitly and early — it's the single detail interviewers are listening for most, and skipping straight to table columns without saying it loses points even if the schema implies it.",
            "Idempotency keys are the detail that separates 'has designed a toy schema' from 'has actually built payment infrastructure' — bring it up even if not directly asked, since retried writes are a guaranteed real-world occurrence in any distributed payment flow.",
            "A 'balance' column on the accounts table that gets directly UPDATEd is the anti-pattern to call out by name — it throws away the audit trail and reintroduces exactly the race conditions and inconsistency risk double-entry bookkeeping exists to prevent."
          ]
        }},
      { id: "db-20", t: "Design a zero-downtime schema migration plan for a live high-throughput table", d: "Hard", desc: "The expand-contract pattern is the whole answer — every safe migration is variations on 'add the new shape, dual-write, backfill, cut over, remove the old shape.'",
        notes: {
          explain: [
            "The framework an interviewer wants to see is expand-contract (also called parallel change): never make a breaking change in one step. Expand by adding the new schema element alongside the old one (a new nullable column, a new table, a new index) without touching or removing anything the running application still depends on — this step alone is always safe because nothing that currently reads or writes the table changes behavior. Only after the new shape is fully in place, populated, and verified do you migrate reads and writes over to it, and only after every consumer has cut over do you contract by removing the old element — and even that removal happens only once you're confident nothing still depends on it.",
            "Concretely, for something like renaming a column or changing its type: add the new column, deploy application code that dual-writes to both the old and new columns (every write updates both, so they never diverge), backfill the new column for existing rows with a throttled batch job (chunked by primary key range, with pacing/sleep between batches to avoid saturating I/O or replication lag on a live high-throughput table), verify the two columns agree via a reconciliation check, then deploy application code that reads from the new column only, and finally — as a separate, later deployment — stop dual-writing and drop the old column. Each of those is an independently deployable, independently revertible step, which is exactly what makes the overall migration zero-downtime and low-risk: any single step can be rolled back without the others.",
            "For a genuinely large or hot table, the backfill step itself needs care beyond just chunking: batch size should be small enough that each batch's lock duration and I/O footprint doesn't cause visible latency spikes for live traffic, batches should be paced (not fired back-to-back) to leave headroom for concurrent production load, and on engines with replication, you generally want the backfill rate low enough not to create meaningful replication lag on read replicas mid-migration. Adding an index on a live table specifically should use the engine's online/concurrent build (CREATE INDEX CONCURRENTLY in Postgres, ALGORITHM=INPLACE / online DDL in MySQL) rather than a plain blocking DDL statement, since a naive index build takes a lock that stalls writes for its full duration."
          ],
          diagram: { type: "flow", caption: "Expand-contract: every step is independently safe and independently revertible.",
            steps: [
              { label: "Expand", note: "add new column/table/index alongside the old, nothing removed yet" },
              { label: "Dual-write", note: "app writes both old and new shape", arrowLabel: "→" },
              { label: "Backfill", note: "throttled batch job fills history into the new shape", arrowLabel: "→" },
              { label: "Verify", note: "reconcile old vs new, confirm they agree", arrowLabel: "→" },
              { label: "Cut over reads", note: "app reads from new shape only", arrowLabel: "→" },
              { label: "Contract", note: "stop dual-write, drop old shape — separate, later deploy", arrowLabel: "→" }
            ]},
          code: [{ lang: "bash", caption: "Throttled backfill — chunked, paced, resumable", src:
`-- Backfill in small, bounded chunks by primary key range instead of one
-- giant UPDATE — a single unbounded UPDATE on a hot table holds locks
-- and generates a huge burst of WAL/replication traffic.
DO $$
DECLARE
  batch_size INT := 5000;
  max_id BIGINT;
  cur_id BIGINT := 0;
BEGIN
  SELECT max(id) INTO max_id FROM orders;
  WHILE cur_id < max_id LOOP
    UPDATE orders SET new_status = old_status
      WHERE id > cur_id AND id <= cur_id + batch_size AND new_status IS NULL;
    cur_id := cur_id + batch_size;
    PERFORM pg_sleep(0.1);  -- pacing: leave I/O headroom for live traffic
  END LOOP;
END $$;

-- Online index build — does not block concurrent writes (Postgres)
CREATE INDEX CONCURRENTLY idx_orders_new_status ON orders (new_status);` }],
          tricks: [
            "Name the pattern by name (\"expand-contract\" / \"parallel change\") — interviewers pattern-match on this immediately, and it signals you're applying a known, battle-tested framework rather than improvising.",
            "Every step must be independently revertible — if asked 'what if the backfill job needs to be rolled back halfway through,' the correct answer is that it's safe by design, because the old column/shape is still fully live and correct throughout dual-write, so you can simply stop and resume the backfill without any data loss.",
            "Never propose a single blocking migration ('just run ALTER TABLE') for a live high-throughput table — even 'fast' DDL operations can still take a brief exclusive lock (e.g., adding a column with a non-null default pre-Postgres-11, or any DDL that requires a table rewrite) that stalls every writer for its duration; always default to the online/concurrent variant and explain why."
          ]
        }}
    ]}
  ]
};
