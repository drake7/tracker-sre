export default {
  key: "senior-swe", label: "Senior Software Engineer", icon: "🧭", color: "var(--teal)",
  desc: "Beyond writing code — the judgment, communication, and leadership skills that separate a senior engineer from a strong individual contributor: running great code reviews, driving technical decisions, mentoring others, and owning systems in production.",
  sections: [
    { name: "Code Reviews", items: [
      { id: "sr-1", t: "What code review is actually for", d: "Easy",
        desc: "Correctness, maintainability, knowledge-sharing, and mentorship — not gatekeeping or proving you're smart.",
        notes: {
          explain: [
            "A code review has four jobs, roughly in priority order: catch correctness bugs before they ship, keep the codebase maintainable for the next person, spread knowledge of the system across the team, and mentor the author. If a comment you're about to leave doesn't serve one of those four, it's probably not worth blocking on.",
            "Senior reviewers calibrate how hard to push on any given comment based on which of these four goals it serves — a security bug blocks the merge, a naming preference does not."
          ],
          tricks: ["When asked in an interview \"what do you look for in a review,\" answer with these four goals, not a laundry list of syntax nits — it signals judgment, not pedantry."]
        }
      },
      { id: "sr-2", t: "The reviewer's checklist, in the right order", d: "Medium",
        desc: "Correctness → tests → readability → security → performance. Reading in this order stops you from nitpicking a variable name before confirming the logic even works.",
        notes: {
          explain: [
            "Reviewers who start at line 1 and comment as they scroll tend to spend their attention budget on the first file (often the least risky one) and rubber-stamp the rest. Instead, read the PR description first, form a hypothesis about what could break, then verify that hypothesis against the diff before commenting on anything cosmetic."
          ],
          diagram: {
            type: "tree",
            root: "Review in this order",
            children: [
              { label: "1. Correctness — does it do what the PR claims?" },
              { label: "2. Tests — are the new/changed code paths actually covered?" },
              { label: "3. Readability — would a new hire understand this in 6 months?" },
              { label: "4. Security — input validation, authz checks, injection risk" },
              { label: "5. Performance — N+1 queries, unbounded loops, blocking calls on hot paths" }
            ],
            caption: "Style and naming nits come last, if at all — and often belong to a linter, not a human."
          }
        }
      },
      { id: "sr-3", t: "Giving feedback: blocking vs. non-blocking comments", d: "Medium",
        desc: "Prefix comments so the author can triage at a glance instead of guessing what's actually required to merge.",
        notes: {
          explain: [
            "Label every comment as blocking or not — explicitly (\"blocking:\", \"nit:\", \"question:\") or through your team's convention. An author who has to guess whether a comment is a hard requirement or a suggestion either over-corrects everything (slow) or ignores real issues (risky)."
          ],
          diagram: {
            type: "compare",
            columns: [
              { title: "Blocking — must fix before merge", points: [
                "Bug or data-loss risk",
                "Security hole",
                "Breaks a public API/contract",
                "Missing tests for a critical path"
              ]},
              { title: "Non-blocking — nit or follow-up", points: [
                "Naming preference",
                "Minor style disagreement",
                "\"Would be nicer as...\"",
                "Out-of-scope refactor idea"
              ]}
            ]
          }
        }
      },
      { id: "sr-4", t: "Sizing pull requests for reviewability", d: "Easy",
        desc: "A PR over ~400 lines gets rubber-stamped, not reviewed. Split by concern (schema change, then logic, then callers), not by file.",
        notes: {
          explain: [
            "Review quality falls off a cliff well before a PR hits 1000 lines — most reviewers' attention degrades after the first couple hundred, and past that they either approve without real scrutiny or bounce it back unread. The naive fix is splitting by file (all the backend changes in one PR, all the frontend in another), which just produces multiple PRs that still can't be understood in isolation. A senior engineer splits by concern instead: the schema migration lands and bakes first, then the logic that uses it, then the callers that depend on it — each one independently reviewable, independently revertible, and each one tells a complete, coherent story on its own.",
            "This also changes how you write code, not just how you package it: if you can't decompose a change into an ordered sequence of small, self-contained PRs, that's often a signal the change itself is too tangled and needs a design pass before it needs a review."
          ],
          diagram: {
            type: "tree",
            root: "Splitting a big change",
            children: [
              { label: "1. Schema / data model change", children: [{ label: "migration only, no behavior change yet" }] },
              { label: "2. Core logic that uses the new schema" },
              { label: "3. Callers / call sites migrated to the new logic" },
              { label: "4. Cleanup — remove the old path, dead flags" }
            ],
            caption: "Each step ships and is reviewable on its own — not four PRs that only make sense read together."
          },
          tricks: ["If you can't describe what a PR does in one sentence without the word \"and,\" it's two PRs — say the sentence out loud before you open it."]
        }
      },
      { id: "sr-5", t: "Reviewing a large or legacy diff without rubber-stamping", d: "Medium",
        desc: "Read the PR description for intent first, then trace the riskiest 20% of the change deeply instead of skimming every line equally.",
        notes: {
          explain: [
            "Faced with a 2000-line diff against unfamiliar legacy code, the naive move is to skim every file at the same shallow depth, which produces a review that feels thorough but catches nothing — you end up commenting on formatting because that's the only thing you had the context to actually judge. A senior reviewer instead spends the first few minutes with zero code open: read the PR description, form a hypothesis about what's actually risky (a new code path handling money, a change to a shared utility, a migration touching a hot table), and then spend the bulk of the review budget tracing that 20% deeply — following the data through, checking callers, running it mentally against edge cases.",
            "When the diff is genuinely too large or the legacy code too unfamiliar to review safely off the page, it's legitimate to say so: ask for a 10-minute walkthrough from the author instead of pretending you absorbed 2000 lines silently. A live walkthrough surfaces intent and hidden assumptions far faster than re-reading the diff a third time."
          ],
          tricks: ["A strong candidate says \"I asked the author to walk me through it\" for a diff that was too large or unfamiliar to safely review alone — pretending you can hold 2000 unfamiliar lines in your head is the actual red flag, not asking for help."]
        }
      },
      { id: "sr-6", t: "Design feedback vs. style nitpicks — knowing what to escalate", d: "Medium",
        desc: "\"This changes a public contract\" goes to a design doc or a synchronous conversation, not a 40-comment PR thread.",
        notes: {
          explain: [
            "PR comment threads are a bad medium for design disagreements — they're asynchronous, they lack shared context, and they tend to escalate into walls of text that nobody fully reads, least of all the next person who has to resolve the thread. The test a senior engineer applies is reversibility: if the comment is about something cheap to change later (a variable name, a log message), leave it in the thread. If it's about something expensive to reverse once merged — a public API shape, a data model, a cross-service contract — that's a signal to stop typing and either open a short design doc or grab 15 minutes synchronously.",
            "The failure mode to avoid is doing the design conversation in the PR anyway, one reply at a time, because it feels lower-friction than scheduling a call. It isn't — it just spreads the same conversation over three days and leaves the actual decision undocumented anywhere anyone will find it later."
          ],
          diagram: {
            type: "compare",
            columns: [
              { title: "Stays in the PR thread", points: [
                "Naming, formatting, local readability",
                "\"Could this be simpler\" on an isolated function",
                "A missing test for the change at hand",
                "Anything cheap to change after merge"
              ]},
              { title: "Escalate to a doc or a call", points: [
                "Changes a public API or wire contract",
                "Changes a data model or migration shape",
                "Affects another team's system",
                "You've replied twice and still disagree"
              ]}
            ]
          },
          tricks: ["If you've written more than two back-and-forth replies on the same comment thread without converging, that's the signal to escalate — not to write a third, more detailed reply."]
        }
      },
      { id: "sr-7", t: "Receiving feedback gracefully as the author", d: "Easy",
        desc: "Assume good intent, respond to every comment (even just \"done\" or a 👍), and don't take a requested rewrite personally.",
        notes: {
          explain: [
            "The naive reaction to a tough review comment is to treat it as a judgment on your competence — you get defensive, over-explain the reasoning behind the original approach, or quietly resent the reviewer. What actually reads as senior is treating review as free QA: someone spent their time trying to make your code better before it shipped, and the correct response to a valid catch is \"good catch, fixing\" rather than a justification for why it was fine as written.",
            "Respond to every comment, even the ones you're just implementing as-is — a silent thread left unresolved makes the reviewer re-read the whole diff to figure out what changed. And if you disagree, say so with a reason, not a re-assertion of the original code; the goal is to converge, not to win."
          ],
          tricks: ["In an interview, the strongest version of this story isn't \"I handled feedback well\" — it's describing a specific time a reviewer changed your mind about the actual design, not just the implementation."]
        }
      },
      { id: "sr-8", t: "Review turnaround time & unblocking teammates fast", d: "Easy",
        desc: "Treat \"review requested\" as a same-day SLA — a stalled PR blocks a whole person, not just a diff.",
        notes: {
          explain: [
            "A PR sitting unreviewed doesn't just delay one merge — it blocks the author from starting their next piece of work cleanly, often for a full day per round trip. Engineers who treat reviews as something to fit in \"whenever there's a gap\" end up with two- and three-day turnarounds without ever intending to be slow. Senior engineers protect review time on the calendar the same way they protect focus time — a couple of fixed checkpoints a day — specifically because review is easy to deprioritize in the moment and expensive to deprioritize in aggregate.",
            "When you genuinely can't get to a full review quickly, a fast partial pass beats silence: a comment saying \"skimmed, no blockers I can see, full review by end of day\" unblocks the author's confidence immediately even before the deep read happens."
          ],
          tricks: ["The concrete habit a strong candidate names is a fixed review checkpoint on the calendar (e.g. first thing after standup, and again after lunch) — not \"I try to get to it quickly,\" which is what everyone says and nobody does consistently."]
        }
      },
      { id: "sr-9", t: "Automate away nitpicks: linters, formatters, and CI gates", d: "Medium",
        desc: "If a human is typing \"add a semicolon\" or \"use camelCase\" in a review comment, that's a missing lint rule, not a review job.",
        notes: {
          explain: [
            "Every recurring style comment should get converted into an automated check within a sprint or two. This keeps human review attention on logic, architecture, and correctness — the things a linter fundamentally can't judge."
          ],
          code: [{ lang: "json", caption: "pre-commit gate that fails style issues before a human ever opens the diff", src:
`{
  "husky": { "hooks": { "pre-commit": "lint-staged" } },
  "lint-staged": {
    "*.java": ["checkstyle -c google_checks.xml"],
    "*.{js,jsx}": ["eslint --fix"]
  }
}`}]
        }
      },
      { id: "sr-10", t: "Red flags a senior reviewer should always catch", d: "Hard",
        desc: "The categories junior reviewers most often miss — this is where senior review adds real value.",
        notes: {
          explain: [
            "Anyone can catch a typo. What justifies a senior engineer's time on a review is catching the bug classes below, because they're easy to miss reading top-to-bottom and expensive once they're in production."
          ],
          tricks: [
            "Silent failure handling — an empty catch (Exception e) {} that swallows an error instead of logging or rethrowing it.",
            "N+1 queries hidden inside a loop that calls the DB or an external API per iteration.",
            "Mutable shared state read/written without synchronization in concurrent code.",
            "Missing input validation on any endpoint that takes external input.",
            "Tests that assert against a mock's behavior instead of the real code path (testing the mock, not the system).",
            "A schema migration with no rollback plan, or one that locks a large table."
          ]
        }
      },
      { id: "sr-11", t: "Mentoring through review — teaching, not gatekeeping", d: "Medium",
        desc: "Explain the 'why' behind a requested change, link to docs or a past incident, and occasionally approve-with-comment on a stylistic nit so the author learns without feeling stuck.",
        notes: {
          explain: [
            "\"Handle the null case here\" fixes one line. \"What happens if this comes back null — have you seen this API return that in practice?\" fixes the line and also teaches the author to ask that question themselves next time, on code you'll never review. The difference is a few extra words, and it's the difference between a review that produces one better PR and one that produces a better engineer.",
            "The other lever senior reviewers use deliberately is approve-with-comment: for a real but non-blocking nit, approve the PR and leave the comment rather than blocking on it. It signals the issue matters enough to raise but not enough to make someone re-request review over — and over time that calibration is itself part of what you're teaching."
          ],
          tricks: ["A comment phrased as a question (\"what happens when...\") that the author has to answer teaches the reasoning; a comment phrased as an instruction (\"add a null check\") only fixes that one line — reviewers who want to mentor default to the question form even when they already know the answer."]
        }
      }
    ]},
    { name: "Technical Leadership & Decisions", items: [
      { id: "sr-12", t: "Writing an RFC / design doc that actually gets read", d: "Medium",
        desc: "Lead with the recommendation, not a chronological narrative — most readers skim.",
        notes: {
          explain: [
            "A design doc that people actually engage with follows a predictable shape: problem statement, goals and explicit non-goals, alternatives considered (with why they were rejected), the chosen approach, and known risks/open questions. Put the recommendation near the top — readers who agree can stop there, and readers who disagree know immediately what they're pushing back on."
          ],
          tricks: ["Explicit non-goals prevent the most common failure mode of design review: someone derailing the doc by arguing for a goal you never intended to solve."]
        }
      },
      { id: "sr-13", t: "Driving a technical decision across 2+ teams", d: "Hard",
        desc: "Line up key stakeholders one-on-one before the doc goes wide — a room full of surprised reviewers turns into a bikeshed.",
        notes: {
          explain: [
            "The naive path is to write the best doc you can and send it to every stakeholder at once, trusting the writing to carry the room. It usually doesn't — someone with an unaddressed concern raises it publicly for the first time in the review meeting, other people pile on because it's the first they're hearing of it too, and a decision that should have taken a week takes a month of re-litigation. Senior engineers do the unglamorous work before the doc goes wide: a short 1:1 or async message with each team whose system or roadmap is affected, surfacing objections while they're still cheap to incorporate quietly.",
            "This isn't political maneuvering, it's information gathering — the goal is that by the time the doc is public, every major objection has either been addressed in the text or you already know it's coming and have an answer ready. If you're genuinely surprised by pushback in the wide review, that's a missed stakeholder conversation, not an unreasonable colleague."
          ],
          tricks: ["When asked to describe driving a cross-team decision, a strong answer names the specific people talked to 1:1 before the doc went wide and what changed in the doc because of those conversations — not just \"I wrote a doc and got alignment in the review meeting.\""]
        }
      },
      { id: "sr-14", t: "Technical debt: identifying, quantifying, and prioritizing it", d: "Medium",
        desc: "Frame debt by what it costs — incident frequency, on-call load, dev velocity — not \"this code is ugly.\"",
        notes: {
          explain: [
            "\"This code is a mess and we should refactor it\" loses every prioritization conversation against a feature with a clear business case, because it has no number attached and the feature does. The senior move is translating the debt into the same currency the roadmap is already prioritized in: this module has caused N incidents in the last quarter, this pattern adds a day to every feature that touches it, this on-call load is burning out the rotation. Once debt has a number, it can be ranked against features honestly instead of losing by default.",
            "Not all debt is worth paying down — some of it is genuinely fine to leave, because the code in question is stable and rarely touched. The quantification step is also a filter: it tells you which debt is actually costing you money versus which just offends your taste."
          ],
          tricks: ["If you can't attach a rough number to a piece of tech debt — incidents, hours per change, on-call pages — you don't yet have a case for prioritizing it, you have an aesthetic opinion; get the number before you bring it to planning."]
        }
      },
      { id: "sr-15", t: "Build vs. buy tradeoff analysis", d: "Medium",
        desc: "Total cost of ownership (on-call burden, upgrade treadmill, hiring for the skill) usually matters more than the sticker price of either option.",
        notes: {
          explain: [
            "The naive comparison is the two numbers on the invoices: the vendor's annual license versus a rough estimate of engineering-weeks to build it. That comparison almost always favors building, because it leaves out everything that happens after launch — the on-call burden of running it, the upgrade and security-patch treadmill, the cost of hiring or training for a niche skill, and the opportunity cost of the engineering time not going to the product's actual differentiator.",
            "The sharper question underneath the cost math is strategic: is this system something the company needs to be excellent at, or something it just needs to be adequate at? Auth, payments infrastructure, and observability are rarely where a company differentiates — buying (or using a mature open-source option) and putting the saved engineering time into what actually sets the product apart is usually right. Build only where doing it better than anyone else buyable is the actual business."
          ],
          diagram: {
            type: "compare",
            columns: [
              { title: "Lean toward buy", points: [
                "Commodity capability, not a differentiator",
                "Mature vendors already solve it well",
                "Small team, no appetite for 24/7 ownership",
                "Time-to-market matters more than customization"
              ]},
              { title: "Lean toward build", points: [
                "This *is* the product's differentiator",
                "Vendor lock-in risk is unacceptable",
                "Requirements are unusual enough that no vendor fits",
                "You already have the on-call and expertise to run it"
              ]}
            ]
          },
          tricks: ["The interview-ready framing: \"is this our core value-add, or is it plumbing?\" — plumbing gets bought, differentiators get built, and most build-vs-buy debates go wrong because nobody names which one they're looking at."]
        }
      },
      { id: "sr-16", t: "Saying no to a bad idea without shutting people down", d: "Medium",
        desc: "Ask questions that surface the tradeoff yourself (\"what happens at 10x traffic?\") so the proposer sees the problem instead of just being told they're wrong.",
        notes: {
          explain: [
            "A flat \"that won't work\" is technically efficient and organizationally expensive — it's correct in the moment and teaches the person nothing, and it makes them less likely to bring you the next idea before it's half-built. A senior engineer instead asks the question that makes the flaw visible to the proposer themselves: \"what happens at 10x current traffic?\", \"who else calls this today, and what breaks for them?\", \"what's the rollback if this is wrong?\" Letting someone find the hole in their own proposal lands very differently than being told it's there.",
            "Before pushing back at all, restate the proposal back better than they stated it — it proves you actually understood the idea rather than pattern-matching it to something you've rejected before, and it's often the moment you realize part of it is actually right and only needs a narrower fix, not a rejection."
          ],
          tricks: ["Steelman before you push back: restating the other person's idea more clearly than they did, out loud, before raising the concern — it's the single tell that separates \"I disagreed with someone senior\" stories that read as thoughtful from ones that read as territorial."]
        }
      },
      { id: "sr-17", t: "Running an architecture / design review meeting", d: "Easy",
        desc: "Circulate the doc at least 24h ahead, timebox discussion, and end with an explicit decision and owner — not \"let's take it offline\" every time.",
        notes: {
          explain: [
            "A design review where people read the doc for the first time during the meeting isn't a review, it's a table read — the first pass through any non-trivial doc is slow, literal, and produces surface-level comments, not the deep tradeoff discussion the meeting was supposed to be for. Circulating the doc at least a day ahead, with an explicit ask (\"comment inline by Thursday\"), moves that first pass to async time and turns the meeting into what it should be: resolving the disagreements that are left after everyone's already read it.",
            "The other thing that separates a review that produces a decision from one that produces another meeting is ending with an explicit call: approved, approved with changes (name them), or blocked pending a specific follow-up with a named owner and date. \"Let's take it offline\" is sometimes the right answer, but if it's the answer every time, the meeting isn't doing its job."
          ],
          tricks: ["If more than half the room is visibly reading the doc for the first time when the meeting starts, the strongest move is canceling it on the spot and rescheduling — running it anyway guarantees a shallow discussion and a second meeting later."]
        }
      }
    ]},
    { name: "Mentoring & Growing Others", items: [
      { id: "sr-18", t: "Structuring effective 1:1s as a mentor", d: "Easy",
        desc: "Their agenda, not yours — status updates belong in standup; 1:1 time is for what they can't say anywhere else.",
        notes: {
          explain: [
            "The default failure mode is the mentor running the meeting: going down a list of project statuses, which is redundant with standup and trains the other person to show up passive. A 1:1 that's actually useful starts with \"what's on your mind\" and then goes quiet — the things worth that time are the ones people don't bring up unprompted in a group setting: a frustration with a teammate, uncertainty about their own growth, a decision they're stuck on, feedback they're nervous to give you.",
            "Keeping a running shared doc across sessions matters more than it sounds — it's what turns a string of disconnected weekly chats into an actual arc you can point back to at promo time (\"three months ago you said X was blocking you, here's what changed\"), and it's what stops the same open item from quietly going nowhere for months."
          ],
          tricks: ["A rough gut-check that works well in practice: if you're talking more than about a third of the time in a 1:1 with someone you manage or mentor, the meeting has drifted into your agenda, not theirs."]
        }
      },
      { id: "sr-19", t: "Pairing effectively without taking over the keyboard", d: "Easy",
        desc: "Narrate your thinking, let them drive, and resist the urge to grab the keyboard the moment they're stuck.",
        notes: {
          explain: [
            "The instinct when watching someone struggle is to grab the keyboard the moment you see the fix — it's faster in the next thirty seconds and it costs them the learning in every future thirty seconds like it. The better default is to stay hands-off and narrate your own reasoning out loud instead of the answer: \"I'd check what that function returns on the empty case first\" gets them to the fix themselves and leaves them able to do it alone next time.",
            "Struggle for a couple of minutes on a problem that's genuinely within reach is where the learning happens — it's uncomfortable to watch and it's supposed to be. The judgment call is knowing when productive struggle has turned into pure frustration with no path forward; that's the point to step in, not the first sign of hesitation."
          ],
          tricks: ["Literally count to sixty in your head before intervening when someone's stuck — most mentors' instinct to \"help\" fires far earlier than the point where the struggle stops being useful, and the habit of a mentor who's good at this is a deliberately delayed reaction, not a fast one."]
        }
      },
      { id: "sr-20", t: "Delegating with real autonomy, not just task assignment", d: "Medium",
        desc: "Hand off the problem and the constraints, not a pre-decided implementation — otherwise you've just delegated typing.",
        notes: {
          explain: [
            "Task assignment looks like delegation but isn't: \"build a cache with these five fields, using this library, deployed this way\" hands someone a spec you already fully designed, and all that's left for them to contribute is typing it in. Real delegation hands off the problem and the constraints — the goal, the deadline, the systems it must not break — and lets the person choose the approach, including making mistakes in that approach that they then have to notice and fix themselves.",
            "This requires tolerating a slower or different-looking path than the one you'd have taken, and checking in at milestones rather than steps. The payoff is that the person actually grows a decision-making muscle instead of an implementation muscle — and it's the only version of delegation that reduces your own load over time, since task-assignment delegation still requires you to have done all the design thinking up front."
          ],
          diagram: {
            type: "compare",
            columns: [
              { title: "Task assignment", points: [
                "You've already decided the approach",
                "Check-ins are about progress on your plan",
                "Mistakes are yours — you specified it",
                "They get faster at executing your designs"
              ]},
              { title: "Real delegation", points: [
                "You hand off the problem and constraints",
                "Check-ins are about their reasoning",
                "Mistakes are theirs to notice and fix",
                "They get better at making decisions"
              ]}
            ]
          },
          tricks: ["If you find yourself explaining exactly how to build something rather than what \"done\" looks like and why it matters, you've delegated the typing, not the thinking — catch yourself mid-sentence and hand the how back."]
        }
      },
      { id: "sr-21", t: "Giving hard career feedback kindly and directly", d: "Medium",
        desc: "Specific, timely, and tied to observable behavior beats vague or delayed — \"in yesterday's review you...\" not \"you sometimes...\".",
        notes: {
          explain: [
            "Vague, delayed feedback is the default because it's the path of least discomfort in the moment — \"you could work on communication\" said a month after the incident it was actually about. It's also nearly useless: the person can't map it to a specific action to change, and by the time it's delivered they may not even remember the moment you're referring to. Specific, timely, behavior-based feedback is harder to say and far more actionable: \"in yesterday's design review, you cut off two people mid-sentence\" gives them something concrete to recognize and change, close enough to the event that they still remember the context.",
            "The structure that keeps feedback from drifting into either vague praise-sandwich mush or a personal attack is situation-behavior-impact: what was the situation, what specifically did they do, what was the actual impact of it. It keeps the conversation about observable behavior and its consequences rather than about character, which is what actually makes hard feedback landable instead of just uncomfortable for both people."
          ],
          tricks: ["The structure a strong candidate names unprompted is situation-behavior-impact (\"in X, when you did Y, the effect was Z\") — candidates who instead describe softening hard feedback with a compliment sandwich are usually describing feedback that didn't actually land."]
        }
      },
      { id: "sr-22", t: "Mentorship vs. sponsorship — and why senior engineers need to do both", d: "Medium",
        desc: "Mentorship is advice given in private; sponsorship is advocating for someone when they're not in the room.",
        notes: {
          explain: [
            "Mentoring someone well and never sponsoring them is a common trap: they get better at their job but nobody outside your 1:1s ever hears about it. Sponsorship means naming them for the high-visibility project, or naming them in a promotion or headcount discussion — the advocacy that happens when they can't advocate for themselves."
          ]
        }
      }
    ]},
    { name: "Ownership & Incident Response", items: [
      { id: "sr-23", t: "What \"ownership\" means in practice for a senior engineer", d: "Easy",
        desc: "You notice and fix the problem in your area even when no one assigned it to you, and you own outcomes, not just the tickets in your queue.",
        notes: {
          explain: [
            "The junior version of responsibility is bounded by the ticket: if it's not assigned to you, it's not your problem, and if the on-call rotation isn't yours this week, an alert in your service isn't your job to look at. Ownership is the same situation with the boundary redrawn around the system instead of the queue — you notice the flaky test in a file you don't normally touch and fix it instead of skipping past it, you see a metric drifting the wrong way and dig in before it pages anyone, because it's in your area and no one else is going to.",
            "The other half of ownership is staying with a problem through outcomes, not through hand-offs: filing a ticket and moving on is not the same as making sure the thing actually gets fixed. Owners follow up, escalate if it stalls, and check the fix actually worked in production — they treat \"I raised it\" as the start of the job, not the end of it."
          ],
          tricks: ["The tell in an interview: ownership stories describe fixing something nobody assigned — a stalled ticket, a flaky test in someone else's file, a metric nobody was watching. A story about diligently completing everything on an assigned list, however well, is describing reliability, not ownership."]
        }
      },
      { id: "sr-24", t: "Running a blameless postmortem", d: "Medium",
        desc: "The goal is a system that fails safer next time, not a name attached to the root cause.",
        notes: {
          diagram: {
            type: "flow",
            steps: [
              { label: "Detect", note: "alert or report" },
              { label: "Mitigate", note: "stop the bleeding", arrowLabel: "→" },
              { label: "Root-cause", note: "the real 'why', 5-whys deep", arrowLabel: "→" },
              { label: "Write-up", note: "timeline + blameless language", arrowLabel: "→" },
              { label: "Follow-through", note: "action items get ticketed & owned" }
            ],
            caption: "A postmortem without tracked follow-through is just a story — the value is in the last step."
          }
        }
      },
      { id: "sr-25", t: "Escalation judgment: when to page someone vs. handle it yourself", d: "Medium",
        desc: "Weigh blast radius and your own confidence — paging too early erodes trust in alerts, too late turns a small issue into a big one.",
        notes: {
          explain: [
            "Both failure directions are real: page for everything and people learn to ignore your pages, which is how the one that mattered gets missed; sit on something you're not confident about and a contained problem grows for the hours you spent trying to solve it alone. The judgment isn't a fixed rule, it's a running estimate of two things — blast radius (how many users or systems are affected, and is it growing) and your own confidence in diagnosing and fixing it solo within a reasonable window.",
            "The asymmetry senior engineers lean on when genuinely unsure: the cost of an unnecessary page is a few minutes of someone else's attention; the cost of a missed escalation is hours of one person alone on something that needed more hands, or a small incident that became a large one while they tried to prove they could handle it. When the estimate is close, that asymmetry should push toward paging."
          ],
          tricks: ["The specific mistake that signals someone hasn't actually carried a pager: describing an incident where they \"didn't want to bother anyone\" and spent an hour alone on something that got worse in that hour — the instinct to protect other people's time at the expense of blast radius is the exact failure mode senior on-call judgment is supposed to avoid."]
        }
      },
      { id: "sr-26", t: "Assessing risk before shipping (rollout strategy, feature flags, blast radius)", d: "Medium",
        desc: "Ask \"what's the smallest population I can expose this to first, and how fast can I turn it off?\" before every risky change.",
        notes: {
          explain: [
            "The naive rollout is binary: deploy, and now it's live for everyone. If it's wrong, the fix is another deploy, which under real incident pressure can take longer than the outage should have lasted. A senior engineer treats every non-trivial change as needing two answers before it ships, not one: how do I expose this to the smallest population first (an internal cohort, 1% of traffic, a single region), and separately — critically — how do I turn it off, and how fast. If the answer to \"how do I turn it off\" is \"redeploy,\" that's not a safe rollout, that's a slow one wearing a rollout's clothes.",
            "Feature flags are what make the second question fast: a flag flip is seconds, a revert-and-redeploy is many minutes to an hour depending on the pipeline, and that gap is exactly the difference between a blip nobody notices and a incident with a timeline. The discipline of building the off-switch before the change ships, not after something breaks, is what separates this from being reactive."
          ],
          diagram: {
            type: "flow",
            steps: [
              { label: "Internal / dogfood", note: "smallest possible blast radius" },
              { label: "1% canary", note: "watch error rate & latency", arrowLabel: "→" },
              { label: "Staged rollout", note: "10% → 50% → 100%, gated on metrics", arrowLabel: "→" },
              { label: "Full rollout", note: "flag stays in place after", arrowLabel: "→" }
            ],
            caption: "The flag isn't just for the rollout — it's the fast \"off\" switch if something looks wrong at any stage."
          },
          tricks: ["The question a strong candidate asks before \"how do I ship this\" is \"how do I turn this off\" — and if the honest answer involves a redeploy rather than a flag flip, that's the gap to close before shipping, not after the incident that finds it."]
        }
      },
      { id: "sr-27", t: "Operational excellence: the metrics a senior engineer actually watches", d: "Easy",
        desc: "Error rate, p99 latency, saturation, and change-failure rate say more about system health than uptime alone.",
        notes: {
          explain: [
            "Uptime is a lagging indicator — by the time it's dropped, you're already inside the incident, and all uptime tells you is how bad it got, not that it was coming. Senior engineers watch the metrics that move before the outage does: error rate trending up before it crosses an alert threshold, p99 latency creeping (the tail is where users feel pain long before the average does), and saturation on CPU, memory, connection pools, or queue depth — resources approaching their limit are the leading indicator that something is about to fall over.",
            "Change-failure rate — what fraction of deploys cause a rollback or an incident — belongs in the same set because it's a process health signal, not just a system one: a rising change-failure rate says the deploy pipeline or the testing bar has quietly degraded, which is exactly the kind of thing that's invisible in uptime until it isn't."
          ],
          diagram: {
            type: "tree",
            root: "What to actually watch",
            children: [
              { label: "Error rate", children: [{ label: "trending up before it crosses an alert threshold" }] },
              { label: "p99 latency", children: [{ label: "the tail, not the average — where users actually feel it" }] },
              { label: "Saturation", children: [{ label: "CPU, memory, connection pools, queue depth" }] },
              { label: "Change-failure rate", children: [{ label: "% of deploys causing rollback or incident" }] }
            ],
            caption: "Uptime tells you an incident already happened. These tell you one is coming."
          },
          tricks: ["If someone's answer to \"what do you watch\" stops at uptime or an on-call dashboard's green/red status, that's the tell they've been paged into incidents rather than having built the habit of watching leading indicators before the page fires."]
        }
      }
    ]}
  ]
};
