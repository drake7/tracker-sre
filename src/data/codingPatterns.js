export default {
  key: "coding-patterns", label: "Coding Patterns (LeetCode)", icon: "🧩", color: "var(--pink)",
  desc: "The ~20 reusable patterns that cover the overwhelming majority of LeetCode-style interview questions. Learning a pattern beats memorizing individual problems — once you recognize 'this is a sliding window problem,' the solution shape is already 80% decided.",
  sections: [
    { name: "Core Patterns", items: [
      { id: "cp-1", t: "Two Pointers", d: "Easy",
        desc: "Two indices moving through a sorted structure (toward each other, or both forward) to avoid an O(n²) nested loop.",
        notes: {
          explain: [
            "Two pointers works whenever the input is sorted (or can be sorted) and you're looking for a pair/triple satisfying some condition. Instead of checking every pair (O(n²)), you start pointers at both ends and move them based on how the current pair compares to the target — each move eliminates a whole set of impossible pairs at once."
          ],
          code: [{ lang: "java", caption: "Classic: two-sum on a sorted array, O(n) instead of O(n²)", src:
`int[] twoSumSorted(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo < hi) {
        int sum = nums[lo] + nums[hi];
        if (sum == target) return new int[]{lo, hi};
        if (sum < target) lo++;   // need a bigger sum — move the smaller pointer up
        else hi--;                // need a smaller sum — move the larger pointer down
    }
    return new int[]{-1, -1};
}`}],
          tricks: ["Recognize it fast: 'sorted array' + 'pair/triplet that sums to X' or 'palindrome check' is almost always two pointers.", "3Sum is two pointers nested inside a single loop — fix one element, two-pointer the rest — O(n²) instead of the naive O(n³)."]
        }},
      { id: "cp-2", t: "Sliding Window", d: "Medium",
        desc: "A contiguous window that expands and contracts over an array/string — turns many 'longest/shortest substring with property X' problems from O(n²) into O(n).",
        notes: {
          explain: [
            "Grow the window's right edge to include new elements; when the window violates some condition (too many distinct characters, sum too large), shrink from the left edge until it's valid again. Each element is added and removed from the window at most once, which is what makes it O(n) instead of re-scanning from scratch for every starting position."
          ],
          code: [{ lang: "java", caption: "Longest substring without repeating characters — the canonical sliding window problem", src:
`int lengthOfLongestSubstring(String s) {
    Set<Character> window = new HashSet<>();
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        while (window.contains(s.charAt(right))) {
            window.remove(s.charAt(left));
            left++;                     // shrink until the duplicate is gone
        }
        window.add(s.charAt(right));
        best = Math.max(best, right - left + 1);
    }
    return best;
}`}],
          diagram: { type: "flow", caption: "left only ever moves forward — total pointer movement across the whole run is O(n), not O(n) per starting position.",
            steps: [
              { label: "Expand right", note: "add s[right] to window" },
              { label: "Window invalid?", note: "check condition", arrowLabel: "→" },
              { label: "Shrink left", note: "remove s[left], left++", arrowLabel: "while invalid" },
              { label: "Record answer", note: "window is valid again", arrowLabel: "→" }
            ]},
          tricks: ["Fixed-size window (e.g., 'max sum of any k consecutive elements') is a simpler variant — no shrink-while-invalid loop needed, just add the new element and remove the one that falls off the left edge."]
        }},
      { id: "cp-3", t: "Fast & Slow Pointers (Cycle Detection)", d: "Medium",
        desc: "Two pointers moving at different speeds through a linked structure — detects cycles and finds midpoints without extra memory.",
        notes: {
          explain: [
            "If a linked list has a cycle, a pointer moving 2 steps at a time (fast) will eventually lap a pointer moving 1 step at a time (slow) and they'll meet inside the cycle — this is Floyd's Tortoise and Hare algorithm. If there's no cycle, fast simply reaches the end first. The same two-speed trick finds a list's midpoint in one pass: when fast reaches the end, slow is at the middle."
          ],
          code: [{ lang: "java", caption: "Cycle detection in O(1) extra space — no HashSet of visited nodes needed", src:
`boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;  // they met — there's a cycle
    }
    return false; // fast hit the end — no cycle
}`}],
          tricks: ["A common follow-up is 'find where the cycle starts, not just whether one exists' — after slow/fast meet, reset one pointer to head and advance both one step at a time; they meet again exactly at the cycle's start. Worth memorizing this second phase, it's the part people forget."]
        }},
      { id: "cp-4", t: "Merge Intervals", d: "Medium",
        desc: "Sort intervals by start time, then walk through merging any that overlap — the pattern behind calendar/scheduling-shaped problems.",
        notes: {
          explain: [
            "The core insight: once intervals are sorted by start time, any two intervals that overlap must be adjacent in that sorted order — you never need to compare an interval against anything more than one step away to know if it merges. Walk through once, keeping a 'current merged interval'; if the next interval's start is <= the current interval's end, absorb it (extend the end to the max of both); otherwise the current interval is finished, push it to the result and start a new one."
          ],
          code: [{ lang: "java", caption: "One pass after sorting — O(n log n) total, dominated entirely by the sort", src:
`int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[0] - b[0]); // sort by start
    List<int[]> result = new ArrayList<>();
    int[] current = intervals[0];
    for (int[] interval : intervals) {
        if (interval[0] <= current[1]) {           // overlaps — extend
            current[1] = Math.max(current[1], interval[1]);
        } else {                                     // gap — close out current, start new
            result.add(current);
            current = interval;
        }
    }
    result.add(current);
    return result.toArray(new int[0][]);
}`}],
          tricks: ["The O(n log n) sort dominates the runtime — the merge pass itself is O(n); if you're ever handed already-sorted input, point out the whole problem drops to O(n).", "Watch the boundary condition: [1,3] and [3,5] touching at exactly 3 counts as overlapping (merge to [1,5]) in most problem statements, but meeting-room-style 'can you attend both' variants treat touching endpoints as NOT conflicting — always confirm which one the interviewer means."]
        }},
      { id: "cp-5", t: "Cyclic Sort", d: "Easy",
        desc: "For arrays containing numbers in a known range [1..n], place each number at its 'correct' index in one pass — turns 'find the missing/duplicate number' problems into O(n) time, O(1) space.",
        notes: {
          explain: [
            "When an array is guaranteed to hold numbers from a known, dense range (usually 1..n or 0..n-1), you don't need extra memory or sorting to find what's missing or duplicated — each value already tells you exactly which index it belongs at (value v belongs at index v-1). Walk the array once; whenever nums[i] isn't at its correct home index, swap it there and recheck the same index (don't advance i) until it is. After one pass, any index i where nums[i] != i+1 reveals a missing or duplicate number directly."
          ],
          code: [{ lang: "java", caption: "After cyclic-sorting, any mismatched index reveals the missing number", src:
`int findMissingNumber(int[] nums) {
    int i = 0, n = nums.length;
    while (i < n) {
        int correctIdx = nums[i] - 1;
        if (nums[i] < n && nums[i] != nums[correctIdx]) {
            int tmp = nums[i]; nums[i] = nums[correctIdx]; nums[correctIdx] = tmp;
        } else {
            i++; // already correctly placed (or out of range) — move on
        }
    }
    for (i = 0; i < n; i++) {
        if (nums[i] != i + 1) return i + 1; // this index's "correct" value never arrived
    }
    return n; // 1..n all present — missing number is n itself (0..n-1 range case)
}`}],
          tricks: ["The `while` instead of unconditionally incrementing `i` after a swap is the whole trick — a swap only guarantees ONE more element lands correctly, so you must recheck the same index, or you'll skip validating the newly-swapped-in value.", "This only works because the value range is known and dense (1..n or 0..n-1) — recognize it from phrasing like 'contains numbers from 1 to n' combined with 'find missing/duplicate,' not from 'sort this array' in general."]
        }},
      { id: "cp-6", t: "In-Place Reversal of a Linked List", d: "Medium",
        desc: "Reverse a linked list (or a sub-range of one) by rewiring next pointers in a single pass, without extra memory — track prev/curr/next carefully since order of reassignment matters.",
        notes: {
          explain: [
            "Reversing a singly linked list in place means walking it once and flipping each node's next pointer to point backward instead of forward — the danger is that once you overwrite curr.next, you've lost your only reference to the rest of the original list. You must save next in a temp variable BEFORE reassigning curr.next, and carry three references (prev, curr, next) forward together at every step."
          ],
          code: [{ lang: "java", caption: "Save next before overwriting — the entire trick", src:
`ListNode reverseList(ListNode head) {
    ListNode prev = null, curr = head;
    while (curr != null) {
        ListNode next = curr.next;   // save before overwriting — the whole trick
        curr.next = prev;             // reverse the pointer
        prev = curr;
        curr = next;
    }
    return prev; // prev is the new head once curr runs off the end
}`}],
          tricks: ["Reversing a SUB-RANGE (e.g., 'reverse nodes between position m and n') is the real interview variant — you need a pointer to the node just BEFORE the sub-range so you can rewire it to the new sub-range head afterward; drawing the before/after pointers on a whiteboard is worth doing explicitly.", "Forgetting to save `next` before reassigning `curr.next = prev` permanently severs the rest of the list with no way to recover it — this produces a silently truncated list rather than a crash, which makes it sneaky to debug."]
        }},
      { id: "cp-7", t: "Tree BFS (Level-Order Traversal)", d: "Medium",
        desc: "Process a tree level by level using a queue — the pattern for any 'per-level' question (level averages, zigzag traversal, right-side view).",
        notes: {
          code: [{ lang: "java", caption: "Snapshot the queue's size at the start of each level to know exactly where one level ends and the next begins", src:
`List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    Queue<TreeNode> queue = new LinkedList<>();
    queue.add(root);
    while (!queue.isEmpty()) {
        int levelSize = queue.size();      // key trick: snapshot size before draining this level
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.add(node.left);
            if (node.right != null) queue.add(node.right);
        }
        result.add(level);
    }
    return result;
}`}],
          tricks: ["The `int levelSize = queue.size()` snapshot before the inner loop is the whole trick — without it you can't tell where one level ends and the next begins, since children get added to the same queue mid-loop."]
        }},
      { id: "cp-8", t: "Tree DFS (Preorder/Inorder/Postorder)", d: "Medium",
        desc: "Recursive (or explicit-stack iterative) depth-first traversal — inorder on a BST visits nodes in sorted order, a fact that unlocks a whole category of BST problems.",
        notes: {
          explain: [
            "Depth-first traversal visits a subtree fully before moving to a sibling, and the three orderings differ only in WHEN you visit the current node relative to its children: preorder visits node → left → right (useful for copying/serializing a tree, since a parent is seen before its children), inorder visits left → node → right (the special one — on a binary SEARCH tree specifically, this visits every node in sorted order, unlocking BST validation, finding the kth smallest element, or converting a BST to a sorted array with zero extra sorting), and postorder visits left → right → node (useful whenever you need both children's results before deciding about the parent, e.g., subtree heights/diameters, or safe bottom-up deletion)."
          ],
          code: [{ lang: "java", caption: "Recursive inorder, and the iterative version with an explicit stack", src:
`void inorder(TreeNode node, List<Integer> out) {
    if (node == null) return;
    inorder(node.left, out);
    out.add(node.val);              // visit AFTER left, BEFORE right
    inorder(node.right, out);
}

// Iterative — matters when recursion depth on a skewed tree is a concern
List<Integer> inorderIterative(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode curr = root;
    while (curr != null || !stack.isEmpty()) {
        while (curr != null) { stack.push(curr); curr = curr.left; } // push left spine
        curr = stack.pop();
        out.add(curr.val);
        curr = curr.right;
    }
    return out;
}`}],
          tricks: ["'Inorder traversal of a BST is sorted order' is the single fact that unlocks a whole category of BST problems (validate BST, kth smallest, closest value) — if a problem mentions a BST specifically, not just 'binary tree,' ask whether inorder traversal sidesteps the hard part entirely.", "The iterative version matters for one concrete reason: recursion depth is bounded by call-stack size, so a very unbalanced tree (effectively a linked list) can stack-overflow a naive recursive DFS — worth mentioning if asked about recursion's limits."]
        }},
      { id: "cp-9", t: "Two Heaps (Running Median)", d: "Hard",
        desc: "A max-heap for the smaller half of the data and a min-heap for the larger half, kept balanced — gives O(log n) insert and O(1) median lookup for a data stream.",
        notes: {
          explain: [
            "Maintain two heaps that split the data stream in half: a max-heap holding the smaller half (its top is the largest of the small numbers) and a min-heap holding the larger half (its top is the smallest of the large numbers). Keep them balanced in size (differing by at most 1) after every insert; the median is then either the max-heap's top (odd count) or the average of both tops (even count) — O(1) to read at any time, O(log n) to insert, versus O(n log n) to re-sort the whole stream from scratch on every query."
          ],
          code: [{ lang: "java", caption: "Insert into `small` first, then rebalance — every number lands in the correct half", src:
`class MedianFinder {
    private final PriorityQueue<Integer> small = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
    private final PriorityQueue<Integer> large = new PriorityQueue<>();                             // min-heap

    public void addNum(int num) {
        small.add(num);
        large.add(small.poll());              // rebalance: send the largest of "small" over to "large"
        if (small.size() < large.size()) {
            small.add(large.poll());           // keep small >= large in size
        }
    }

    public double findMedian() {
        if (small.size() > large.size()) return small.peek();
        return (small.peek() + large.peek()) / 2.0;
    }
}`}],
          tricks: ["The insert-then-rebalance dance (always add to `small` first, then shuffle its max into `large`, then rebalance sizes) guarantees every number lands in the correct half even though you never compared it against both heaps directly — be ready to walk through why this invariant holds, it's not obvious on first read.", "This generalizes beyond 'median': a running kth-percentile or sliding-window median is the same two-heap balancing idea with an asymmetric size ratio instead of an exact half-split."]
        }},
      { id: "cp-10", t: "Subsets / Backtracking", d: "Medium",
        desc: "Build every valid combination by choosing/un-choosing at each step (try it, recurse, undo) — the pattern behind permutations, combinations, N-Queens, and subset-sum.",
        notes: {
          explain: [
            "Backtracking explores a decision tree explicitly: at each step you make a choice, recurse into its consequences, then UNDO the choice before trying the next option at the same level — that undo step is what lets you reuse one mutable path across the whole search instead of allocating a new copy at every node. What differs between variants is just the shape of the choice: subsets choose include-or-skip per element, permutations choose which unused element goes next, combinations choose in increasing index order to avoid duplicates, and N-Queens chooses a column per row and prunes immediately on conflict."
          ],
          code: [{ lang: "java", caption: "Generate all subsets — the copy-on-record and un-choose are the two easy-to-miss details", src:
`List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), result);
    return result;
}

void backtrack(int[] nums, int start, List<Integer> path, List<List<Integer>> result) {
    result.add(new ArrayList<>(path));      // every path is a valid subset — record it on the way in
    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);                  // choose
        backtrack(nums, i + 1, path, result); // explore
        path.remove(path.size() - 1);        // un-choose — the "backtrack"
    }
}`}],
          tricks: ["`result.add(new ArrayList<>(path))` — copying `path` is not optional. Adding `path` itself stores a reference that keeps mutating as the backtracking continues, so every entry in the result silently ends up as the SAME final (usually empty) list; this is the single most common bug in backtracking solutions.", "Recognize it from the phrasing: 'all possible ...', 'every combination of ...', 'every way to ...' almost always means backtracking — the exponential state space is the point, not a sign you're missing a cleverer polynomial solution."]
        }},
      { id: "cp-11", t: "Modified Binary Search", d: "Medium",
        desc: "Binary search doesn't require a fully sorted array — it works on any array with a decidable 'which half could the answer be in' condition (rotated sorted arrays, search in an infinite stream, find peak element).",
        notes: {
          code: [{ lang: "java", caption: "Search in a rotated sorted array — one half is always properly sorted; use that to decide which half to keep", src:
`int search(int[] nums, int target) {
    int lo = 0, hi = nums.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (nums[mid] == target) return mid;
        if (nums[lo] <= nums[mid]) {           // left half is sorted
            if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
            else lo = mid + 1;
        } else {                                // right half is sorted
            if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
            else hi = mid - 1;
        }
    }
    return -1;
}`}],
          tricks: ["The generalizable insight: binary search only needs a monotonic predicate ('is the answer to the left or right of mid'), not a literally sorted array — recognizing this unlocks 'search in rotated array', 'find peak element', and 'search a 2D matrix' as the same underlying pattern."]
        }},
      { id: "cp-12", t: "Top K Elements (Heap)", d: "Medium",
        desc: "Keep a heap of size K while scanning the input — O(n log k) instead of sorting everything (O(n log n)), and the trick for 'k closest points,' 'kth largest,' and 'top k frequent.'",
        notes: {
          code: [{ lang: "java", caption: "A min-heap of size k for 'k largest' — counterintuitive but correct: the smallest of your k candidates sits on top, ready to be evicted", src:
`int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> minHeap = new PriorityQueue<>();
    for (int n : nums) {
        minHeap.add(n);
        if (minHeap.size() > k) minHeap.poll(); // evict the smallest — keep only the k largest seen so far
    }
    return minHeap.peek(); // the kth largest is now the smallest of the k survivors
}`}],
          tricks: ["The heap-size-k trick reliably surprises people the first time: for 'k LARGEST' elements you use a MIN-heap (so the smallest of your current top-k is always on top, ready to be evicted by anything bigger) — it's inverted from what most people guess."]
        }},
      { id: "cp-13", t: "K-Way Merge", d: "Medium",
        desc: "Merge K sorted lists using a heap of size K holding one 'current' element per list — generalizes the classic merge-two-sorted-lists to K lists in O(n log k).",
        notes: {
          explain: [
            "Merging K sorted lists is merge-two-sorted-lists generalized: instead of comparing just two 'current' pointers, keep a min-heap holding one current element per list (K elements total). Repeatedly pop the smallest, append it to the result, and push the next element from whichever list that smallest one came from. The heap never holds more than K elements, so each of the n total elements does one O(log k) heap operation — O(n log k) total, versus O(nk) for naively comparing all K current pointers by hand at every step, or O(n log n) for dumping everything into one list and sorting."
          ],
          code: [{ lang: "java", caption: "A min-heap of size K holding one 'current' node per list", src:
`ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> heap = new PriorityQueue<>((a, b) -> a.val - b.val);
    for (ListNode node : lists) if (node != null) heap.add(node);

    ListNode dummy = new ListNode(0), tail = dummy;
    while (!heap.isEmpty()) {
        ListNode smallest = heap.poll();
        tail.next = smallest;
        tail = tail.next;
        if (smallest.next != null) heap.add(smallest.next); // push this list's next element
    }
    return dummy.next;
}`}],
          tricks: ["The O(n log k) vs O(n log n) distinction is exactly what the heap buys you — when k (number of lists) is much smaller than n (total elements), that's a real, quotable efficiency win over 'just sort everything'; state the bound with k explicitly rather than just saying 'it's fast.'", "Works identically for arrays, not just linked lists — hold (value, listIndex, elementIndex) tuples in the heap instead of node references when merging K sorted ARRAYS, since arrays don't carry an intrinsic 'next' pointer."]
        }},
      { id: "cp-14", t: "0/1 Knapsack (Dynamic Programming)", d: "Hard",
        desc: "The DP family where each item is used at most once — subset-sum, partition-equal-subset, target-sum all reduce to this shape.",
        notes: {
          explain: [
            "Define dp[i][w] = can/best value achievable using the first i items with capacity w. Each item has exactly two choices at each step: skip it (dp[i-1][w]) or take it (dp[i-1][w - weight[i]] + value[i], only if it fits). The '0/1' name refers to each item being available 0 or 1 times — contrast with the unbounded knapsack (coin change) where items can repeat."
          ],
          code: [{ lang: "java", caption: "Bottom-up tabulation — the two-choice recurrence is the whole pattern", src:
`int knapsack(int[] weights, int[] values, int capacity) {
    int n = weights.length;
    int[][] dp = new int[n + 1][capacity + 1];
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= capacity; w++) {
            dp[i][w] = dp[i - 1][w];                          // skip item i
            if (weights[i - 1] <= w) {
                dp[i][w] = Math.max(dp[i][w],
                    dp[i - 1][w - weights[i - 1]] + values[i - 1]); // take item i
            }
        }
    }
    return dp[n][capacity];
}`}],
          tricks: ["When you see 'subset that sums to exactly X' or 'can we partition into two equal-sum halves,' recognize it as 0/1 knapsack in disguise — the 'value' being maximized is just whether the target sum is reachable at all."]
        }},
      { id: "cp-15", t: "Unbounded Knapsack / Coin Change (DP)", d: "Medium",
        desc: "Like 0/1 knapsack, but each item (coin, cut, rod segment) can be reused unlimited times — the recurrence relation stays in the SAME row instead of moving to the previous one.",
        notes: {
          explain: [
            "The only structural difference from 0/1 knapsack (cp-14) is whether taking an item advances you to the PREVIOUS row or lets you stay on the SAME row of the DP table: in 0/1 knapsack each item can be used once, so 'take it' looks back to dp[i-1][...]; in unbounded knapsack (coin change, rod cutting, unlimited-supply problems) an item can be reused, so 'take it' looks at dp[i][w - weight] — the SAME row, because that same item is still available afterward. This one-character difference in the recurrence is the entire pattern; everything else about the DP setup is identical."
          ],
          code: [{ lang: "java", caption: "Coin Change: fewest coins to make amount, each coin reusable unlimited times", src:
`int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);         // "infinity" sentinel
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int coin : coins) {
            if (coin <= a) {
                dp[a] = Math.min(dp[a], dp[a - coin] + 1); // dp[a - coin], the SAME row
            }
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}`}],
          tricks: ["A single-array `dp[amount+1]` (instead of a 2D `dp[items][amount]` table) works specifically BECAUSE items are reusable — there's no need to track 'which items have been considered so far' as a separate dimension; needing a 2D table here is a sign you've drifted back into 0/1-knapsack logic by mistake.", "Loop order is a classic bug source: iterating amount outer and coins inner (as above) is correct for 'minimum coins' / 'is it reachable,' but for 'count the number of distinct ways to make amount' you must swap the loop order (coins outer, amount inner) or you'll overcount permutations as distinct combinations."]
        }},
      { id: "cp-16", t: "Topological Sort", d: "Medium",
        desc: "Order the nodes of a directed acyclic graph so every edge points forward — the pattern for 'course prerequisites,' build-dependency ordering, and task scheduling with dependencies.",
        notes: {
          code: [{ lang: "java", caption: "Kahn's algorithm: repeatedly remove nodes with in-degree 0", src:
`List<Integer> topoSort(int n, int[][] edges) {
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[n];
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    for (int[] e : edges) { graph.get(e[0]).add(e[1]); inDegree[e[1]]++; }

    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < n; i++) if (inDegree[i] == 0) queue.add(i);

    List<Integer> order = new ArrayList<>();
    while (!queue.isEmpty()) {
        int node = queue.poll();
        order.add(node);
        for (int next : graph.get(node)) {
            if (--inDegree[next] == 0) queue.add(next); // no remaining prerequisites
        }
    }
    return order.size() == n ? order : List.of(); // fewer than n nodes processed => a cycle exists
}`}],
          tricks: ["If the final order contains fewer than n nodes, the graph has a cycle — this doubling as cycle detection is exactly why 'course schedule' problems ask both 'can you finish all courses' and 'give an order' with the same algorithm."]
        }},
      { id: "cp-17", t: "Union-Find (Disjoint Set)", d: "Medium",
        desc: "Tracks which elements belong to the same connected group with near-O(1) union/find operations — the pattern for 'number of connected components,' 'redundant connection,' and detecting cycles in an undirected graph.",
        notes: {
          tricks: ["Two optimizations turn naive O(n) union/find into near-O(1) amortized: path compression (flatten the tree toward the root every time you find()) and union by rank/size (always attach the smaller tree under the bigger one). Mentioning both unprompted is a strong signal you've actually implemented this before, not just heard the name."]
        }},
      { id: "cp-18", t: "Trie (Prefix Tree)", d: "Medium",
        desc: "A tree where each path from root spells a prefix — O(word length) lookup/insert regardless of how many words are stored, the standard structure behind autocomplete and 'word search' style problems.",
        notes: {
          explain: [
            "A trie stores strings by sharing common prefixes as shared paths from the root — each node holds up to 26 child pointers (or a HashMap<Character,Node> for a sparse alphabet) plus a boolean flag marking 'a complete word ends here.' Looking up whether a word or prefix exists walks down the tree one character at a time, costing O(word length) regardless of how many total words are stored — a HashSet<String> is also O(word length) for exact match, but a trie additionally makes PREFIX queries ('does any word start with \"pre\"') just as cheap, which a hash set can't do without scanning every entry."
          ],
          code: [{ lang: "java", caption: "Insert and prefix-search — the isWord flag is what separates a prefix from a complete word", src:
`class Trie {
    private final Trie[] children = new Trie[26];
    private boolean isWord;

    public void insert(String word) {
        Trie node = this;
        for (char c : word.toCharArray()) {
            int idx = c - 'a';
            if (node.children[idx] == null) node.children[idx] = new Trie();
            node = node.children[idx];
        }
        node.isWord = true;
    }

    public boolean startsWith(String prefix) {
        Trie node = this;
        for (char c : prefix.toCharArray()) {
            int idx = c - 'a';
            if (node.children[idx] == null) return false; // prefix path doesn't exist
            node = node.children[idx];
        }
        return true; // reached the end of the prefix — it exists, regardless of isWord
    }
}`}],
          tricks: ["The `isWord` flag separates 'this prefix exists' from 'this is a complete word' — reaching the end of a character path without checking isWord tells you the PREFIX exists, not the exact word (inserting 'apple' makes 'app' a valid prefix path but NOT a valid word unless 'app' was inserted separately).", "Recognize the pattern from 'autocomplete,' repeated prefix lookups against the same dictionary, or 'longest common prefix among many strings' — a trie's advantage only pays off across MANY prefix-shaped queries against a fixed dictionary; for a single one-off check, it's not worth building."]
        }},
      { id: "cp-19", t: "Monotonic Stack", d: "Medium",
        desc: "A stack kept strictly increasing or decreasing by popping elements that violate the order before pushing — the pattern behind 'next greater element,' daily temperatures, and largest rectangle in a histogram.",
        notes: {
          code: [{ lang: "java", caption: "Next greater element — each element is pushed and popped at most once, giving O(n) total", src:
`int[] nextGreaterElement(int[] nums) {
    int[] result = new int[nums.length];
    Arrays.fill(result, -1);
    Deque<Integer> stack = new ArrayDeque<>(); // holds INDICES, kept in decreasing value order
    for (int i = 0; i < nums.length; i++) {
        while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
            result[stack.pop()] = nums[i]; // nums[i] is the "next greater" for whatever we just popped
        }
        stack.push(i);
    }
    return result;
}`}],
          tricks: ["The O(n) claim surprises people because of the nested while loop — but each index is pushed exactly once and popped at most once across the whole run, so total work is O(n), not O(n²). Being able to justify this amortized bound out loud is worth doing explicitly in an interview."]
        }},
      { id: "cp-20", t: "Greedy Algorithms", d: "Medium",
        desc: "Make the locally-best choice at each step and trust it leads to a global optimum — works for interval scheduling and Huffman-coding-shaped problems, but always be ready to justify WHY greedy is correct here (exchange argument), since it silently fails on problems like 0/1 knapsack.",
        notes: {
          explain: [
            "A greedy algorithm makes the choice that looks best right now and never reconsiders it — no backtracking, no exploring alternatives. That's what makes greedy fast (usually a sort followed by one linear pass, O(n log n)) but it only produces a correct answer when the problem has a specific kind of optimal substructure: the locally-best choice at each step is provably never worse than any other choice, which you justify with an exchange argument (show any optimal solution can be transformed into the greedy solution by swapping elements, without making it worse).",
            "Contrast this with DP: greedy commits without looking back, whereas a problem like 0/1 knapsack (cp-14) requires weighing tradeoffs where the 'obviously best' local choice (always take the highest value/weight ratio item) can provably lead to a worse overall answer — that's exactly why knapsack needs DP and interval scheduling doesn't."
          ],
          code: [{ lang: "java", caption: "Activity selection: maximum non-overlapping intervals, sorted by END time", src:
`int maxNonOverlapping(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> a[1] - b[1]);  // greedy choice: sort by END time
    int count = 0, lastEnd = Integer.MIN_VALUE;
    for (int[] interval : intervals) {
        if (interval[0] >= lastEnd) {                // doesn't overlap the last one taken
            count++;
            lastEnd = interval[1];
        }
    }
    return count;
}`}],
          tricks: ["Sorting by END time (not start time) is the crux of interval scheduling's greedy proof: always picking the interval that finishes soonest leaves the maximum remaining room for future intervals — sorting by start time instead is a common wrong-first-instinct that fails on some inputs.", "The interview trap: greedy FEELS right for 0/1 knapsack too ('always take the best value/weight ratio item') but is provably wrong there — being able to state that knapsack requires weighing combinations, which greedy structurally can't do since it never reconsiders, is what separates real understanding from pattern-matching blindly."]
        }},
      { id: "cp-21", t: "Bit Manipulation Tricks", d: "Easy",
        desc: "XOR to find a single non-duplicate, n & (n-1) to clear the lowest set bit (and count set bits), and left/right shifts for O(1) power-of-two checks — a small, memorizable toolkit that turns a handful of problems from O(n log n) into O(n) or O(1).",
        notes: {
          explain: [
            "A handful of bit identities cover most 'clever O(1)/O(n)' interview tricks: XOR-ing a number with itself cancels to 0 and XOR-ing with 0 is a no-op, so XOR-ing every element in an array where everything is paired except one leaves exactly the unpaired element. n & (n-1) clears the lowest set bit — subtracting 1 flips every trailing zero to 1 and the lowest set bit to 0, and ANDing with the original clears exactly that bit — which gives an O(1) power-of-two check (n & (n-1) == 0 means at most one bit is set) and an O(popcount) way to count set bits, looping once per set bit instead of checking every bit position."
          ],
          code: [{ lang: "java", caption: "XOR cancellation and the n & (n-1) trick, applied to three classic questions", src:
`// XOR cancels pairs — find the single number that doesn't appear twice
int singleNumber(int[] nums) {
    int result = 0;
    for (int n : nums) result ^= n;    // every paired value XORs to 0; only the loner survives
    return result;
}

// n & (n-1) clears the lowest set bit — count set bits in O(popcount), not O(bit-width)
int countSetBits(int n) {
    int count = 0;
    while (n != 0) {
        n = n & (n - 1);
        count++;
    }
    return count;
}

boolean isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0; // exactly one bit set
}`}],
          tricks: ["XOR-based 'find the single number' only works cleanly when every other element appears exactly TWICE — a variant where elements appear three times each needs a different trick (bit-counting mod 3 across all bit positions), not a simple XOR; don't over-generalize the identity.", "`n & (n-1)` clearing the lowest set bit silently underlies three separate common questions (power-of-two check, Hamming weight/popcount, and 'steps to reduce n to 0') — recognizing it as one identity instead of three separate tricks to memorize is the efficient way to hold this pattern in your head."]
        }}
    ]}
  ]
};
