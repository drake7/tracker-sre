export default {
  key: "company-prep", label: "Top 20 Companies", icon: "🎯", color: "var(--red)",
  desc: "DSA patterns, behavioral/leadership prep, and company-specific notes for a shortlist of 20 target companies. Interview formats change — verify current specifics before you interview (Glassdoor, levels.fyi, the company's own careers site).",
  sections: [
    { name: "DSA Patterns (practice on LeetCode/NeetCode in Java)", items: [
      { id: "dsa-1", t: "Arrays & Hashing", d: "Easy", desc: "", res: "NeetCode", url: "https://neetcode.io/" },
      { id: "dsa-2", t: "Two Pointers", d: "Easy", desc: "" },
      { id: "dsa-3", t: "Sliding Window", d: "Medium", desc: "" },
      { id: "dsa-4", t: "Stack", d: "Easy", desc: "" },
      { id: "dsa-5", t: "Binary Search", d: "Medium", desc: "" },
      { id: "dsa-6", t: "Linked List", d: "Easy", desc: "" },
      { id: "dsa-7", t: "Trees (BFS/DFS)", d: "Medium", desc: "" },
      { id: "dsa-8", t: "Tries", d: "Medium", desc: "" },
      { id: "dsa-9", t: "Heap / Priority Queue", d: "Medium", desc: "" },
      { id: "dsa-10", t: "Backtracking", d: "Medium", desc: "" },
      { id: "dsa-11", t: "Graphs (BFS/DFS/Union-Find)", d: "Hard", desc: "" },
      { id: "dsa-12", t: "Advanced Graphs (Dijkstra, MST)", d: "Hard", desc: "" },
      { id: "dsa-13", t: "Dynamic Programming (1D & 2D)", d: "Hard", desc: "" },
      { id: "dsa-14", t: "Greedy & Intervals", d: "Medium", desc: "" }
    ]},
    { name: "Behavioral & Leadership Prep", items: [
      { id: "behav-1", t: "Build STAR stories from your own projects (Decision Engine, OTel pipeline, AZ-aware Flink orchestration, IVR replacement, WhatsApp chatbot)", d: "Medium", desc: "You have unusually strong raw material here — most candidates don't have 8M+ events/day exactly-once systems to talk about.",
        notes: {
          explain: [
            "STAR is scored piece by piece, not as a vibe: Situation (10 seconds of context — enough to understand the stakes, not your whole org chart), Task (what was specifically YOUR responsibility, not the team's), Action (the bulk of the answer — the actual decisions you made and why, including alternatives you rejected), and Result (a real number or outcome, plus what you'd do differently). Interviewers score against a rubric with columns like 'ownership,' 'technical depth,' 'impact' — a story that's all Situation and Action with a vague Result scores low even when the engineering was impressive.",
            "To mine a project like the exactly-once Kafka/Flink pipeline or the AZ-aware orchestration for stories, don't start from the architecture — start from the decision points. Where did you have two viable options and had to pick one under a constraint (time, team skill, backward compatibility)? Where did something break in a way you didn't expect, and you were the one who diagnosed it? Where did you have to convince someone skeptical (a senior engineer, a PM cutting scope) that your approach was right? Each of those is a separate story, even from the same project.",
            "What makes a technical story land: you can name the specific alternative you didn't take and why (shows judgment, not just execution); you use 'I' for the decision and 'we' for the execution (claiming a team's work as solely yours reads as dishonest, but never saying 'I' reads as no ownership); and the Result has a number attached — latency dropped from X to Y, on-call pages dropped by N%, the migration ran with zero downtime across M brokers. A story that ends with 'and it worked well' instead of a number is the single most common way a strong project turns into a forgettable answer."
          ],
          diagram: {
            type: "compare",
            caption: "Same project, two tellings",
            columns: [
              { title: "Falls flat", points: [
                "\"We rebuilt the pipeline to be exactly-once\"",
                "Result: \"and it's been running great since\"",
                "Every teammate's contribution blurred into \"we\"",
                "No mention of what was rejected, or why"
              ]},
              { title: "Lands", points: [
                "\"I chose idempotent producers + transactional Flink sinks over a dedup table after profiling showed the dedup table added 40ms p99\"",
                "Result: \"zero duplicate charges across 8M events/day, verified over 3 months\"",
                "\"I owned the sink design; two engineers built the consumers off my interface\"",
                "Names the alternative (dedup table) and the reason it lost"
              ]}
            ]
          },
          tricks: [
            "Pre-compute the number before the interview, not during it — 'reduced incident MTTR by roughly 30%' said confidently beats a hedgy guess made up on the spot, and interviewers can tell the difference."
          ]
        }
      },
      { id: "behav-2", t: "Amazon-style Leadership Principles prep", d: "Medium", desc: "", res: "Amazon Leadership Principles", url: "https://www.amazon.jobs/content/en/our-workplace/leadership-principles",
        notes: {
          explain: [
            "At Amazon the Leadership Principles aren't a single 'behavioral round' bolted onto an otherwise technical loop — every interviewer, including the ones running your coding and system design rounds, is expected to probe 2-3 LPs and score you against them independently, and the Bar Raiser's entire job is to weigh LP evidence across the whole loop. This differs from a typical FAANG loop where behavioral is one round out of five. Walk in with only 'be authentic' as prep and you'll get asked 'tell me about a time you disagreed with your manager' in the middle of a system design round and be caught flat-footed.",
            "The concrete method that works: build a story bank of 8-10 real stories (not 16 — most candidates over-prepare breadth and under-prepare depth), then map each one against the 16 LPs in a grid. A strong story usually covers 2-3 principles at once — the AZ-aware orchestration failover story is simultaneously 'Ownership' (you drove it after the incident), 'Dive Deep' (you traced it to a specific AZ-isolation gap), and 'Bias for Action' (you shipped a mitigation before the full fix). Once the grid exists, check for gaps — LPs like 'Are Right, A Lot' or 'Earn Trust' are ones candidates with strong technical stories often forget to map explicitly, because the natural story angle is technical, not principle-first.",
            "In the room, tell the story the same way regardless of which LP the interviewer named — don't contort it live. If they ask for 'Customer Obsession' and your prepped story is really about ownership, either pick a different story from the bank or reframe the SAME actions through that lens (who was the ultimate customer of the IVR replacement, and what did you do specifically because of what they needed) rather than inventing a new story on the spot."
          ],
          tricks: [
            "Keep the story-to-LP grid as an actual spreadsheet, not a mental map — under interview pressure, retrieval by 'which story fits this LP' is much faster than recalling your whole list and ranking it live."
          ]
        }
      },
      { id: "behav-3", t: "\"Tell me about a conflict\" — prepare 2 distinct stories", d: "Easy", desc: "",
        notes: {
          explain: [
            "A weak conflict story picks a stake too small to be interesting ('I disagreed about a variable name') or, worse, positions the other person as simply wrong and you as the reasonable one throughout — interviewers read that as an inability to see the other side, the opposite of what the question tests. The real question is: can you disagree with someone whose position had genuine merit, stay professional, and reach a resolution that wasn't just you winning.",
            "A strong conflict story has a specific decision point where the disagreement could have gone either way on its merits — e.g. disagreeing with a senior engineer about whether the WhatsApp chatbot should own session state itself or delegate to an existing service, where their concern (avoiding a new stateful component) was legitimate and yours (avoiding tight coupling to a service with different SLAs) was also legitimate. Show the specific mechanism that resolved it — a prototype that settled the debate with data, a scoped trial, an agreement to revisit once a metric was in — not just 'we talked it through and agreed.'",
            "The trap to avoid: don't pick a story where you were simply right and they were simply wrong, and don't pick one where the resolution was your manager overruling the other person in your favor. Both versions dodge the actual skill being tested, which is influencing a peer without positional authority."
          ],
          tricks: [
            "If your honest answer to 'what was the other person's strongest argument' is 'they didn't really have one,' it's the wrong story — swap it for one where you can genuinely steelman their side in a single sentence."
          ]
        }
      },
      { id: "behav-4", t: "\"Tell me about a failure\" — prepare 2 distinct stories with genuine lessons", d: "Easy", desc: "",
        notes: {
          explain: [
            "A weak failure story is either not really a failure ('we were behind schedule but I fixed it') or is a failure that was someone else's fault dressed up as yours ('the requirements changed on me'). Both read as an unwillingness to own a real mistake, which is exactly what this question screens for at Staff/Senior level — the bar is higher than 'I learned to write more tests.'",
            "A strong failure story names a specific decision YOU made that was wrong given what you knew at the time — not a bad outcome from a reasonable decision, but a call that, in hindsight, you'd make differently even with the same information available then. Example: choosing to skip a canary rollout on an AZ-failover change because the team was under deadline pressure, which caused a partial outage — the failure is the decision to skip the safeguard, not the outage itself. Then show the concrete, lasting change: not 'I'm more careful now' but a specific process you introduced (a mandatory canary gate, a runbook check) that outlived the incident.",
            "The trap to avoid: don't let the story quietly turn into a conflict or blame story halfway through ('the real failure was a teammate not reviewing it carefully enough') — the moment ownership shifts off you, the interviewer stops scoring it as a failure story and starts scoring it as evasiveness."
          ],
          tricks: [
            "Pick a failure with real, visible consequences (an incident, a missed SLA, a rollback) — a failure story with no actual blast radius reads as manufactured, because interviewers know a genuine one always leaves a mark."
          ]
        }
      },
      { id: "behav-5", t: "Run at least 2 mock interviews (peer or recorded) before applying", d: "Medium", desc: "",
        notes: {
          explain: [
            "Solo prep — rehearsing a story in your head or even writing it out — can't catch what a mock interview catches: whether the story actually lands with a listener who has zero context on your systems and has to follow it in real time, whether your pacing buries the Result under five minutes of Situation, and verbal tics ('so basically', excessive hedging) that are invisible to you but obvious to a listener. You know your own systems so well that you'll unconsciously skip context a real interviewer needs — only an outside listener catches that gap.",
            "Structure it for maximum value: record it (audio is enough) so you can review pacing and filler words afterward without relying on memory; get feedback on content AND delivery separately — 'the story was strong but you spent 3 minutes on Situation and 30 seconds on Result' is a different fix than 'I didn't understand why the AZ-isolation mattered'; and do it with someone who will actually interrupt and push back with follow-ups ('why not the simpler option', 'what did the other engineer think') rather than someone who just nods along, since real interviewers probe.",
            "Two mock interviews is a minimum, not a target — the first surfaces which stories don't land and where your pacing is off; the second is where you find out if the fixes actually held up under the same pressure."
          ],
          tricks: [
            "Time-box your own STAR answers to 2 minutes during the mock and have your partner call it out the moment you cross it — Staff-level interviewers penalize rambling far more than they penalize a slightly-too-short answer."
          ]
        }
      }
    ]},
    { name: "Company Notes — Track Research Progress", items: [
      { id: "comp-google", t: "Google", d: "Hard", desc: "DSA rigor + scalable system design + \"Googleyness\"/leadership rounds. Multiple onsite loops." },
      { id: "comp-amazon", t: "Amazon", d: "Medium", desc: "Leadership Principles woven into every round including a dedicated Bar Raiser; DSA + system design." },
      { id: "comp-microsoft", t: "Microsoft", d: "Medium", desc: "DSA, system/technical design, growth-mindset culture fit." },
      { id: "comp-meta", t: "Meta", d: "Hard", desc: "Fast-paced DSA, system design, and a values/behavioral round." },
      { id: "comp-apple", t: "Apple", d: "Medium", desc: "Team-specific, less standardized; deep technical + domain design discussions." },
      { id: "comp-netflix", t: "Netflix", d: "Hard", desc: "\"Freedom & Responsibility\" culture; fewer but very deep, high-bar rounds — mainly senior/staff hiring." },
      { id: "comp-mastercard", t: "Mastercard", d: "Medium", desc: "Fintech/payments domain, security & compliance emphasis, high-throughput distributed systems — closely matches your current experience." },
      { id: "comp-visa", t: "Visa", d: "Medium", desc: "Payments domain, security/compliance, distributed systems at scale." },
      { id: "comp-paypal", t: "PayPal", d: "Medium", desc: "Fraud/risk systems, scalability, ownership-focused behavioral rounds." },
      { id: "comp-stripe", t: "Stripe", d: "Hard", desc: "High engineering bar, strong emphasis on API design and written communication." },
      { id: "comp-goldman", t: "Goldman Sachs", d: "Hard", desc: "Engineering rigor, some teams emphasize low-latency systems, strong culture-fit component." },
      { id: "comp-jpmorgan", t: "JPMorgan Chase", d: "Medium", desc: "Large-scale enterprise systems, compliance-heavy, broad technical rounds." },
      { id: "comp-morganstanley", t: "Morgan Stanley", d: "Medium", desc: "Enterprise fintech, risk/compliance emphasis, technical + behavioral." },
      { id: "comp-uber", t: "Uber", d: "Hard", desc: "DSA + marketplace-scale system design, values-based rounds." },
      { id: "comp-airbnb", t: "Airbnb", d: "Hard", desc: "DSA + system design + a strong values/culture interview (\"Core Values\")." },
      { id: "comp-linkedin", t: "LinkedIn", d: "Medium", desc: "DSA, system design, infra-heavy, STAR-style behavioral." },
      { id: "comp-salesforce", t: "Salesforce", d: "Medium", desc: "Enterprise SaaS systems, \"Ohana\" culture fit, DSA + design." },
      { id: "comp-oracle", t: "Oracle", d: "Medium", desc: "Enterprise/database-heavy systems — your Oracle/MySQL background is directly relevant." },
      { id: "comp-adobe", t: "Adobe", d: "Medium", desc: "Product-and-platform engineering, DSA + design, culture fit." },
      { id: "comp-atlassian", t: "Atlassian", d: "Medium", desc: "Values-based interview, DSA + system design, strong collaboration emphasis." }
    ]}
  ]
};
