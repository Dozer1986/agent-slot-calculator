# Buy Memory, Not Machines, for Twenty Agents

Your guess is right: the middle option wins. But the spec that decides it is memory, not cores. Twenty frontier coding agents that each build and run a full test suite need about **120–180 GB of RAM in total** and the CPU of **one to one-and-a-half 16-core desktops**. The reason is the duty cycle. If each agent spends about 30% of its time building or testing, only about **6 builds run at once on average, with 9 at the 95th percentile and 11 at the 99th**; the rest of the time the agents wait on the model. In October 2026 the cheapest concurrent agent slot is a **Core Ultra 7 270K Plus or Ryzen 9 9950X desktop with 128 GB of DDR5 (4×32 GB)**. Each box carries **about 14 agents at about $200–260 of hardware per agent**, or about $305–345 per agent once three years of assumed California electricity is added. Two such boxes (about $5.6–6.3k) carry about 28 agents. The configuration in your first follow-up (two 16-core boxes with 64 GB each) runs out of memory at 5–6 agents per box and leaves about half the CPU idle. Adding a second 64 GB kit to each box is the cheapest agent capacity anywhere in the market, at about $105–115 per added agent. Used mini PCs fail on RAM ceilings, slow cores and the fact that one agent per box cannot share peaks. Threadripper fails on registered (server) memory at $35–46/GB: a $10.8k 9980X with 128 GB carries no more agents than one $3k desktop. Your Macs work best as macOS and arm64 lanes. The 2015 Proxmox host works best as a cache and services box. Above roughly $10k (40+ agents), API spend caps, rate limits and human review capacity bind before hardware does. Buy one 128 GB box now, measure your own duty cycle for three to four weeks, then decide on the second box. Waiting on RAM prices does not help, because contract DRAM prices are still rising.

## Twenty agents need about 160 GB, not twenty machines

The notes give two conflicting kinds of per-agent RAM figure, and they measure different things. Practitioner guides quote **200–400 MB per Claude Code session** ([amux](https://amux.io/guides/running-10-plus-agents/)) or **about 2 GB per agent including builds**, with 48–64 GB for 10–20+ agents ([Villega](https://perevillega.com/posts/2026-04-02-running-ai-coding-agents-on-hetzner/)). Those are fleet averages, mostly from PHP and interpreted stacks, and they spread idle agents over busy ones. The per-stack figures come from component measurements and describe the peak of one active build or test job:

- **6–8 GB** for TS/JS, Python and Ruby suites with a database container.
- **6–12 GB** for Go. Coder's `make test` peaked near 25 GB before a fix ([Coder](https://coder.com/blog/how-changing-one-constant-reduced-our-ci-memory-usage-by-70percent)).
- **12–16 GB** for Rust, C++ and Gradle. Inputs include a single Rust crate peaking at 18 GB ([Feldera](https://www.feldera.com/blog/cutting-down-rust-compile-times-from-30-to-2-minutes-with-one-thousand-crates)) and Gradle failing below a 3–4 GB heap plus a second Kotlin daemon JVM ([Bitrise](https://bitrise.io/blog/post/your-guide-to-fine-tuning-gradle-memory-allocations)).

The 2 GB figure fails in the reports themselves: Villega watched a 32 GB server run out of memory, and a 20-agent Rust experiment on a 32 GB PC exhausted RAM on cold builds before CPU ([tensorust](https://tensorust.com/articles/run-20-ai-coding-agents-on-one-pc)). Geniar's setup corroborates the per-job view: 4 agents, 2 suites at a time, a 32 GB cgroup cap on a 64 GB box ([ma.ttias.be](https://ma.ttias.be/remote-coding-environment-vps/)). That works out to about 8 GB per agent averaged across the fleet. I trust the per-job model because the failure mode is asymmetric: **"oversubscribed CPUs are non-fatal while out-of-memory conditions are fatal"** ([users.rust-lang.org](https://users.rust-lang.org/t/limiting-number-concurrent-lto-jobs-without-lowering-compilation-parallelism/108613)). The two figures reconcile once the duty cycle is added: fleet RAM equals a small per-agent resident cost plus a full per-job budget for each build that is running at the same moment.

The duty cycle is the least certain input. Two 2026 studies measured local tool execution at **39% of wall time** with a Gemini 3 Flash agent on small benchmarks ([arXiv 2609.19947](https://arxiv.org/html/2609.19947v2)) and **17.6–17.7%** for Claude Code on SWE-bench Pro and Terminal-Bench with self-hosted open models ([arXiv 2605.26297](https://arxiv.org/html/2605.26297v2)). Neither measured frontier cloud models doing full-repo builds. Tool time includes cheap commands such as grep and ls, but your full test suites run far longer than benchmark tasks. I assume these two effects roughly cancel and plan at **p = 0.3, with 0.2–0.4 as the range**. If agents are independent, concurrent builds follow a binomial distribution. Sizing RAM to the 99th percentile (OOM is fatal) and CPU to the 95th (contention only slows things) gives the following requirements for 20 agents.

| Planning duty cycle (p) | Mean concurrent builds | p95 | p99 | CPU needed at p95 (9950X-equivalents) | RAM needed (p99 × 12 GB + 20 × 1 GB + 6 GB) | Averaged per agent |
|---|---|---|---|---|---|---|
| 0.2 | 4 | 7 | 8 | ~0.9 | ~122 GB | ~6 GB |
| **0.3 (planning case)** | **6** | **9** | **11** | **~1.1** | **~158 GB** | **~8 GB** |
| 0.4 | 8 | 12 | 13 | ~1.5 | ~182 GB | ~9 GB |

*Assumptions (all mine):* one build slot is **12 GB** (a blend of your stack mix) plus one-eighth of a 9950X's multi-thread throughput, which is roughly four Zen 5 cores with SMT. Every agent also holds **1 GB** at all times for the CLI, worktree daemons and stray language servers. Hosts reserve 6 GB on Linux and 8 GB on macOS, which includes a Docker VM. On slower machines each job takes longer: I assume half of every job is serial and scales with single-thread speed, which raises that machine's effective p. Rust/C++/JVM-only fleets should use 16 GB slots (about 10 agents per 128 GB box instead of 14). Interpreted-only fleets can use 8 GB (about 17 agents per box).

The "20 agents ≠ 20 builds" result has a caveat that matters for configuration. Independence breaks when firstmate dispatches a batch of crewmates at once and they all run a cold `install` and full build together. That is a reason to stagger dispatch and cap memory per agent with cgroups. It is not a reason to cap concurrent jobs at the core count: one measured study found that CPU-aware admission made SWE-bench latency **2.76× worse** ([arXiv 2609.19947](https://arxiv.org/html/2609.19947v2)). The same arithmetic explains why small boxes waste capacity. A box hosting one agent must hold that agent's full peak budget all the time, so it sits idle about 70% of the time. A box hosting 14 agents needs room for only about 8 simultaneous peaks. Most of that pooling benefit is captured at 10–20 agents per pool. The ratio of 99th-percentile load to mean load is 2.3× at 10 agents, 1.8× at 20 and 1.6× at 40, which is why one giant Threadripper buys little extra over two desktops.

On cores per job, about four fast cores capture most of a typical suite's speedup. Jest peaked at 7 workers and was already 2.3× faster at 4 ([dev.to](https://Dev.to/vantanev/make-your-jest-tests-up-to-20-faster-by-changing-a-single-setting-i36)). parallel_tests got 1.8–3.3× at 4 processes ([parallel_tests](https://gem.sh/gems/parallel_tests/v2.1.0/readme)). Single-thread speed governs linking, `tsc`, single huge crates and test-runner main threads. Geniar found that "most agent work… is single-threaded, so per-core speed mattered more than core count" ([ma.ttias.be](https://ma.ttias.be/remote-coding-environment-vps/)).

## A 128 GB desktop is the cheapest agent slot in October 2026

The scorecard below compares new and used x86, new Macs and your existing machines on one basis. "Agents" is the number a box carries at p = 0.3 under the assumptions above. "HW $/agent" is the purchase price divided by agents. "3-yr $/agent" adds electricity. All x86 single-thread (ST) and multi-thread (MT) figures are PassMark, normalized to the 9950X (4,726 ST / 65,693 MT) ([PassMark](https://www.cpubenchmark.net/cpu.php?cpu=AMD+Ryzen+9+9950X&id=6211)). Mac MT is my estimate: Geekbench 6 multi-core scaled by the measured kernel-build gap, in which an M4 Max took 666 s for allmodconfig in Docker against 549 s on a native 9950X, about 0.82× ([OpenBenchmarking](https://mail.openbenchmarking.org/result/2605154-NE-APPLEM4MA25&grr&export=html), [Phoronix](https://www.phoronix.com/review/amd-ryzen-9-9950x3d-linux/2)). That puts Macs between PassMark's harsher 0.67× ([PassMark](https://www.cpubenchmark.net/compare/6211vs6348/AMD-Ryzen-9-9950X-vs-Apple-M4-Max-16-)) and Geekbench's near-parity.

**Electricity is an assumption.** Your Pacific time zone suggests California, so I use **$0.35/kWh**. PG&E's average bundled residential rate is 39.25¢ ([Solar.com](https://www.solar.com/learn/pge-electric-rates/)) and the EIA California average is 33.35¢ ([StarryHope](https://www.starryhope.com/minipcs/mini-pc-power-cost-24-7-2026/)). Each box is assumed to run 24/7, at full load for 35% of the time and idle otherwise. Rescale linearly if your tariff differs.

| Machine (condition, Oct 2026 price) | Cores/ threads | ST vs 9950X | MT vs 9950X | RAM now (max; cost to fill) | Idle / load W | Power $/yr | Agents @ p=0.3 (limit) | HW $/agent | 3-yr $/agent |
|---|---|---|---|---|---|---|---|---|---|
| Lenovo M920q i5-8500T, used, $210–240 | 6/6 | 0.42 | 0.12 | 16 GB (32–64; ~$390 for 32 GB SO-DIMM) | 12–15 / ~65 est. | ~$96 | 0 (RAM); 1 at 32 GB | — | — |
| Lenovo M720q i7-8700T 32 GB, used, ~$363 | 6/12 | 0.49 | 0.16 | 32 GB (64) | 11–14 / ~65 est. | ~$95 | 1 (CPU) | ~$363 | ~$650 |
| i5-10500T 1L (M90q/7080/800 G6), used, $289–350 | 6/12 | 0.48 | 0.16 | 16 GB (64; est. +$500–800) | ~11 / ~65 | ~$92 | 0 (RAM); 1 when filled | — | — |
| Beelink SER8 8845HS, new, $799 at 24 GB / ~$1.75k at 64 GB | 8/16 | 0.79 | 0.43 | 24 GB (64 GB SO-DIMM ~$1,000) | 9 / 78 | ~$102 | 1; **5** at 64 GB (CPU) | $340–360 | ~$410 |
| Beelink SER9 HX 370, new, $999–1,149 | 12/24 | 0.83 | 0.53 | 32 GB soldered | 7–9 / 76–78 | ~$100 | 2 (RAM) | $500–575 | ~$690 |
| GMKtec EVO-X2 AI Max+ 395 128 GB, new, $3,499–3,649 | 16/32 | 0.88 | 0.83 | 128 GB soldered | 11 / 165 | ~$199 | 12 (CPU) | $292–304 | ~$350 |
| Ryzen 9 5950X + 128 GB DDR4, used build (est.), $1.8–1.95k | 16/32 | 0.74 | 0.69 | 128 GB (128) | ~70 / ~225 est. | ~$381 | 9 (CPU) | $198–217 | ~$335 |
| Core Ultra 7 270K Plus + 64 GB, new build (est.), $1.9–2.2k | 24/24 | 1.07 | 1.04 | 64 GB (+$930 for 128) | ~77 / ~252 | ~$424 | 6 (RAM) | $316–367 | ~$555 |
| **Core Ultra 7 270K Plus + 128 GB**, new build (est.), $2.8–3.2k | 24/24 | 1.07 | 1.04 | 128 GB (4×32) | ~77 / ~252 | ~$424 | **14** (RAM) | **$200–229** | **~$305** |
| Ryzen 9 9950X + 64 GB, new build (est.), $2.1–2.7k | 16/32 | 1.00 | 1.00 | 64 GB (192–256) | ~80 / ~300 est. | ~$481 | 5 (RAM) | $426–540 | ~$770 |
| **Ryzen 9 9950X + 128 GB**, new build (est.), $3.1–3.7k | 16/32 | 1.00 | 1.00 | 128 GB | ~80 / ~300 est. | ~$481 | **14** (RAM) | **$219–264** | **~$345** |
| Ryzen 9 9950X + 192 GB, new build (est.), ~$5.6k | 16/32 | 1.00 | 1.00 | 192 GB | ~80 / ~300 est. | ~$481 | 17 (CPU) | ~$327 | ~$410 |
| EPYC 7B13 + H12SSL + 256 GB DDR4 RDIMM, used (est.), $4.5–4.7k | 64/128 | 0.54 | 1.23 | 256 GB (2 TB; ~$1,840 per 256 GB) | ~110 / ~350 est. | ~$595 | 16 (CPU) | $281–292 | ~$400 |
| Threadripper 9970X + 128 GB RDIMM, new (est.), $8.4–9.5k | 32/64 | 0.96 | 1.64 | 128 GB (+$3,780 per 128 GB) | 128 / ~500 | ~$792 | 14 (RAM) | $600–680 | ~$810 |
| Threadripper 9980X + 128 GB RDIMM, new (est.), ~$10.8k | 64/128 | 0.96 | 2.19 | 128 GB | 140 / 534 | ~$852 | 14 (RAM) | ~$770 | ~$950 |
| Threadripper 9980X + 256 GB RDIMM, new (est.), ~$14.6k | 64/128 | 0.96 | 2.19 | 256 GB | 140 / 534 | ~$852 | 35 (CPU) | ~$416 | ~$490 |
| Mac mini M6 32 GB, new, $1,299 | 12 | ~1.5* | ~0.67 | 32 GB fixed | 4 / 70 | ~$83 | 1 (RAM) | ~$1,300 | ~$1,550 |
| Mac mini M5 Pro 18-core 64 GB, new, $2,899 | 18 | ~1.4* | ~0.92 | 64 GB fixed | 6 / 145 | ~$168 | 6 (RAM) | ~$483 | ~$565 |
| Mac Studio M5 Max 128 GB, new, ~$4,799 | 18 | ~1.4* | ~0.95 | 128 GB fixed | 7 / 200 | ~$229 | 15 (CPU) | ~$320 | ~$365 |
| Mac Studio M1 Max 32 GB, used, $1,429–1,800 | 10 | 0.78* | ~0.40 | 32 GB fixed | 11 / 115 | ~$145 | 1 (RAM) | $1.4–1.8k | — |
| *Owned:* MacBook Pro M1 Max | 10 (8P+2E) | 0.78* | ~0.41 | 32 or 64 GB fixed | n/f | — | 1 at 32 GB; 5 at 64 GB | sunk | — |
| *Workplace:* 4× iMac M4 8-core 16 GB | 8 (4P+4E) | 1.20* | ~0.44 | 16 GB fixed | 43 / 100 incl. display | ~$193 each | 0 heavy; 1 light lane each | sunk | — |
| *Workplace:* 2× Mac Studio, generation unknown | 10–32 | 0.78–1.4* | 0.40–0.95 | 32–192 GB | 6–13 / 115–295 | $145–336 each | 1 (M1 Max 32 GB) · 6 (M4/M5 Max 64 GB) · 9 (M2 Ultra 128 GB) each | sunk | — |
| *Owned:* ~2015 Intel Proxmox (if dual E5 v4, 128 GB) | 28/56 | 0.34* | ~0.44 | unknown | 47 (vendor-tuned) to >100 / 272 | ~$145–390 | 4 in theory; use for services | sunk | — |

\*Mac and 2015-Xeon ST is Geekbench 6 single-core against the 9950X's 3,067. PassMark ST puts the M4 Max at parity with the 9950X instead (4,588 vs 4,726), so read Apple's lead as **0–50%**. All "est." build prices include an **unsourced ~$400–450 allowance** for board, PSU, case and cooler.

**Sources for the scorecard.**

- **Prices and specs:**
  - Used minis: [ComputingForGeeks](https://computingforgeeks.com/best-used-tiny-pc-homelab/).
  - New minis: [Beelink](https://www.bee-link.com/ko/products/beelink-ser8-8845hs), [StarryHope SER9](https://www.starryhope.com/minipcs/models/beelink-ser9/), [runaihome](https://runaihome.com/blog/unified-memory-ai-pc-price-surge-mid-2026-buying-guide/).
  - CPUs: [PassMark](https://www.cpubenchmark.net/compare/6296vs6326vs7114vs6403vs6714/Intel-Core-Ultra-9-285K-vs-Intel-Core-Ultra-7-265K-vs-Intel-Core-Ultra-7-270K-Plus-vs-AMD-Ryzen-AI-Max-395-vs-AMD-EPYC-4565P), [PassMark high-end list](https://www.cpubenchmark.net/high_end_cpus.html).
  - Used server parts: [eBay EPYC](https://www.ebay.com/shop/amd-epyc-7763), [eBay bundle](https://ebay.com/itm/284937355825).
  - Threadripper platform: [Newegg TRX50](https://www.newegg.com/p/pl?d=trx50), [Capital & Compute RDIMM](https://capitalandcompute.net/memory-prices/server/).
  - Macs: [EveryMac M5 Max Studio](https://everymac.com/systems/apple/mac-studio/specs/mac-studio-m5-max-18-core-cpu-32-core-gpu-2026-specs.html), [EveryMac M5 Pro mini](https://everymac.com/systems/apple/mac_mini/specs/mac-mini-m5-pro-18-core-cpu-20-core-gpu-2026-specs.html), [MacPro-LA](https://macpro-la.com/blogs/news/mac-studio-price-guide-2026).
- **Power:**
  - Apple: [Mac mini](https://support.apple.com/en-us/103253), [Mac Studio](https://support.apple.com/en-us/102027), [iMac](https://support.apple.com/HT201918).
  - Desktops and Threadripper: [LanOC 9950X3D](https://lanoc.org/review/cpus/amd-ryzen-9950x3d?start=4), [LanOC Threadripper](https://lanoc.org/review/cpus/amd-threadripper-9980x-and-9970x?start=3).
  - 2015 Xeon server: [SPECpower](https://www.spec.org/power_ssj2008/results/res2015q1/power_ssj2008-20150203-00686-power.html).
- **Benchmarks:** [Mac Geekbench averages (EveryMac)](https://everymac.com/mac-benchmarks/all-current-mac-desktop-benchmarks.html), [M1 Max Geekbench (LaptopMedia)](https://laptopmedia.com/comparisons/apple-m4-vs-m3-pro-max-vs-m2-pro-max-ultra-vs-m1-pro-max-ultra-the-ultimate-benchmark-comparison/), [2015 Xeon Geekbench](https://browser.geekbench.com/processors/intel-xeon-e5-2680-v4).

**The single roll-up figure** is about **$200–260 of hardware per concurrent agent, or $305–345 over three years including power, on a 128 GB 270K Plus or 9950X box**. That assumes p = 0.3, 12 GB and four 9950X-class cores per running build, 1 GB resident per agent, RAM sized to the 99th percentile and CPU to the 95th. The only cheaper entries are a used 5950X with 128 GB of DDR4 (about $200–217 per agent) and a used EPYC 7B13. Both trade away 26–46% of single-thread speed and pay more in electricity. The 5950X also sits on a dead AM4 platform, and its price rests on one sold-out $310 listing ([Jawa](https://www.jawa.gg/product/143403/amd-ryzen-9-5950x)). The EPYC listings are mostly China-based engineering samples or vendor-locked parts.

The losers fail for clear reasons. **Used 1L minis** cost about as much per unit of compute as new desktops, roughly $29–36 per 1,000 PassMark points against $28–32. They run serial build phases at about 40–50% of desktop speed. A 16 GB unit cannot hold even one 12 GB build plus OS headroom, and with one agent per box there is nothing to pool. Twenty agents would mean 20 boxes to patch, and the fleet's electricity would roughly equal its purchase price over three years.

**Threadripper 9000 is cheap per core but must use DDR5 RDIMM.** That memory costs **$1,300 per 32 GB stick** against about **$14.5/GB for a consumer 64 GB kit** ([Capital & Compute](https://capitalandcompute.net/memory-prices/server/), [DatacenterDisk](https://datacenterdisk.com/ram/ddr5/64gb)). A 9980X with only 128 GB is therefore RAM-bound at the same 14 agents as a $3k desktop. Its extra cores also stall on memory bandwidth: a 96-core 9995WX builds no faster than the 64-core 9980X ([Phoronix](https://www.phoronix.com/review/amd-threadripper-9995wx-trx50/2)).

**New Macs with fixed RAM** win on single-thread speed and power. They lose on RAM that cannot be upgraded and on Apple's memory pricing ($1,000 to go from 24 to 64 GB on the M5 Pro). The exception is the **Mac Studio M5 Max with 128 GB at about $320 per agent**, which is competitive if you need native macOS lanes anyway. **Used Apple Silicon** is a poor buy right now: one used 128 GB M4 Max listed above its $4,699 launch price ([refurb.me](https://www.refurb.me/refurbished/mac-studio/sku/MU963-18E)).

### Why the 270K Plus and 128 GB, and where returns diminish

The Core Ultra 7 270K Plus is a 24-core part (8P+16E with no SMT), not a 16-core one. At **$265–316** it is about $220 cheaper than the 9950X ([Club386](https://www.club386.com/?p=148509), [PassMark](https://www.cpubenchmark.net/compare/6296vs6326vs7114vs6403vs6714/Intel-Core-Ultra-9-285K-vs-Intel-Core-Ultra-7-265K-vs-Intel-Core-Ultra-7-270K-Plus-vs-AMD-Ryzen-AI-Max-395-vs-AMD-EPYC-4565P)). It also edges ahead on kernel builds (**54 s vs 56 s** on the same OpenBenchmarking profile) ([OpenBenchmarking](https://mail.openbenchmarking.org/performance/test/pts/build-linux-kernel/4d7b365c6432dfbebc8c90edbf4cf6e787e51715)) and on single-thread speed (5,073 vs 4,726). The 9950X's case is AM5's verified memory headroom: 192 GB at DDR5-6000 has been reported in practice, and ASUS BIOS support for 256 GB runs at up to 5,200 MT/s ([yomotherboard](https://yomotherboard.com/question/looking-for-am5-motherboards-that-can-handle-256gb-of-ddr5-ram/), [Level1Techs](https://forum.level1techs.com/t/am5-256gb-cudimm-nice-surprise/224685)). The LGA1851 maximum was not verified in this research. Neither socket gets a successor soon: Zen 6 and Nova Lake desktop parts are reportedly delayed to 2027 ([TweakTown](https://www.tweaktown.com/news/110232/amds-next-gen-zen-6-powered-ryzen-desktop-cpus-delayed-to-2027/index.html)). Four DIMMs force lower memory speeds, but for compiles capacity matters more: DDR5-6400 against DDR5-4800 saved only 10–12 s per LLVM build and barely moved kernel builds ([Phoronix](https://www.phoronix.com/review/threadripper-9000-ddr5-6400-4800/2)).

Returns diminish in three places. Above 128 GB per consumer box, the cost per GB rises: a 96 GB kit is **$2,049**, about $21/GB, against two 64 GB kits for $1,860–1,978 ([Tom's Hardware](https://tomshardware.com/pc-components/ram/ram-price-index-2026-lowest-price-on-ddr5-and-ddr4-memory-of-all-capacities)). That makes a 192 GB 9950X about $327 per agent against about $220. On HEDT, RDIMM pricing doubles or triples the cost per agent. And past roughly 20 agents per pool, the pooling gain flattens, so one huge box buys little over two desktops. Cost per agent stays flat from one 128 GB desktop to three. Beyond that, the ceilings are the API and human review, covered below.

### Reconciling the build-cost estimates

The notes give three prices for "a 9950X with 64 GB":

- **About $2.0k** (CPU $539, a 64 GB kit at August's $849, a 1 TB SSD and a $450 allowance) ([GuruGamer](https://gurugamer.com/pc-console/dram-prices-are-making-gaming-hardware-ridiculous-in-late-2026-27234)).
- **About $2.13k** (kit at $930, one 2 TB drive at $210, the same allowance).
- **About $2.7k** (kit at $989, two 2 TB drives at about $700, board and PSU itemized separately).

The spread comes from the RAM price date, the number of SSDs, and the board/PSU/case allowance, which is unsourced in all three. I trust **$2.1–2.4k for one 2 TB drive at October prices**, and treat the $2.7k as a two-drive build. RAM is the volatile line. The cheapest new 64 GB kit was $930 on October 22 ([DatacenterDisk](https://datacenterdisk.com/ram/ddr5/64gb)), against about $191 for a comparable kit in August 2025 (Tom's Hardware, cited on the same page). TrendForce expects contract DRAM to rise another **10–15% QoQ in 4Q26** ([Capital & Compute](https://capitalandcompute.net/memory-prices/server/), [TrendForce](https://www.trendforce.com/research/download/RP261021BP)). Price the RAM on the day you buy, and don't wait for a dip.

### Follow-up 1: are two mid-range rigs with 64 GB each the right buy?

They are the right chassis with the wrong memory. Two 16–24-core boxes with 64 GB each (about $3.8–5.4k) carry **5–6 agents per box, 10–12 in total**. Memory is the limit, and at the 95th percentile about half of each box's CPU sits idle. A second 64 GB kit per box (about $930 each) lifts each box to **about 14 agents, 28 in total**. That costs **$105–115 per added agent**, the best marginal price anywhere in the scorecard. Buy the boards with four DIMM slots and two kits each: about $5.6–6.3k for two 270K Plus boxes, or $6.2–7.4k for two 9950X boxes. If the budget stops at $5k, buy one box at 128 GB and one at 64 GB (about $4.7–5.3k, about 20 agents) and fill the second later. Between the two CPUs, pick the 270K Plus for price and single-thread speed, or the 9950X if you want AM5's verified path to 192 GB or more.

## What $2k, $5k and $10k buy

All tiers assume the existing Macs and Proxmox host carry roles as described in the next section and add capacity on top. Agent counts are at p = 0.3 for the purchased hardware only.

| Budget | Buy | Agents added (p = 0.2 / 0.3 / 0.4) | Why not the alternatives |
|---|---|---|---|
| **~$2k** | One Core Ultra 7 270K Plus, 64 GB (2×32 GB, two DIMM slots left free), 2 TB NVMe (~$1.9–2.2k est.). Alternative: a used 5950X with 128 GB of DDR4 (~$1.8–1.95k est.) if you accept 26% lower single-thread speed for 50% more agents. | 8 / 6 / 5 (5950X: 12 / 9 / 7) | 7 used 10500T minis (~$2.0k) carry 0–7 light agents at half the single-thread speed, as 7 boxes to administer. |
| **~$5k** | Two 270K Plus boxes, one at 128 GB and one at 64 GB (~$4.7–5.3k). Or stretch to both at 128 GB (~$5.6–6.3k). | 28 / 20 / 18 (both 128 GB: 40 / 28 / 26) | A used EPYC 7B13 with 256 GB (~$4.5–4.7k) carries 16 agents at 0.54× single-thread speed. Two 9950Xs with 64 GB carry 10. |
| **~$10k** | Three 270K Plus boxes with 128 GB (~$8.4–9.6k), plus a 2.5GbE switch and NVMe for the services box. If macOS lanes matter, two such boxes plus a Mac Studio M5 Max with 128 GB (~$10.4–11.1k). | 60 / 42 / 39 | A Threadripper 9980X with 128 GB (~$10.8k) carries 14 agents. A 9970X with 128 GB (~$8.4–9.5k) carries 14. Reaching 35 on a 9980X takes 256 GB at ~$14.6k. |

The $10k tier shows the diminishing-returns point plainly. Hardware per agent stays near $200–230. What changes is that 40+ agents meet ceilings hardware cannot fix: API spend caps, rate limits and review capacity. One guide estimates 20 Sonnet agents at **$5–20 per hour** ([amux](https://amux.io/guides/running-10-plus-agents/)). At working hours (176 h a month) that is about $880–3,500 a month for 20 agents. At that rate, model spend passes the cost of the ~$6k two-box fleet in about two to seven months.

## Your existing machines are lanes and services, not the fleet's core

**The MacBook Air stays the orchestrator and runs no crewmates.** Fanless Apple Silicon loses **12–21%** under 30-minute sustained loads ([TweakTown](https://www.tweaktown.com/news/87417/apple-m2-macbook-air-throttles-bad-cooled-pro-doesnt/index.html)). With firstmate, crewmates build wherever their worktree lives, so the Air should host only the primary and dispatch everything to secondmates.

**The MacBook Pro M1 Max is a macOS and arm64 lane, plus overflow.** It carries about 5 agents with 64 GB or 1 with 32 GB. Its single-thread speed is about 0.78× a 9950X on Geekbench. As a worker it needs lid-open operation or a dummy display plug, `pmset` no-sleep settings, and auto-login or a manual unlock after each reboot. FileVault blocks auto-login ([Travis Media](https://travis.media/blog/mac-homelab-ai-agent-server)). It is also one of the few Macs Asahi Linux supports: Fedora Asahi covers M1 and M2 machines ([Asahi](https://asahilinux.org/fedora/#device-support)). That makes it a candidate bare-metal arm64 Linux worker if you no longer need it as a laptop.

**The four 2026 iMacs are almost certainly 8-core M4 models** (4 performance + 4 efficiency cores, 16 GB, $1,499 since the June price rise) ([Apple](https://www.apple.com/imac/specs/), [OWC](https://eshop.macsales.com/blog/98649-the-apple-price-increases-are-upon-us-and-oof/)). Confirm the core count in About This Mac. With 16 GB, macOS and a Docker VM leave room for **one light job each**: Python, Ruby or TS unit tests, or macOS-native checks. They cannot run Asahi; M4 bring-up is still in progress ([Phoronix](https://www.phoronix.com/news/Asahi-Linux-M3-Release-Soon)). They idle at 43 W including the display. They are also people's desktops at a workplace, so whether they can be used at all is an ownership question before it is a technical one. Count them as off-hours bonus capacity, never as part of the 20.

**The two Mac Studios are the biggest unknown.** They could be any of five generations, so run About This Mac before buying anything:

- M1 Max with 32 GB: about 1 agent.
- M4 or M5 Max with 64 GB: about 6 agents each, with single-thread speed above the 9950X.
- M2 Ultra with 128 GB: about 9 agents.

Two recent-generation Studios with 64 GB would supply about 12 agents, nearly a whole desktop's worth. As workplace machines, they raise the same availability question as the iMacs.

**Docker on a Mac pays a VM tax that native Linux does not.** Every container runs inside an arm64 Linux VM:

- **Memory:** the VM idles at about **0.8 GB under OrbStack and 4.2 GB under Docker Desktop** ([thepromptshelf](https://thepromptshelf.dev/blog/orbstack-vs-docker-desktop-2026/)).
- **File I/O:** bind mounts run at **75–95% of native**, and Postgres pgbench at 76% ([OrbStack](https://orbstack.dev/blog/fast-filesystem)).
- **amd64 images:** Rosetta lacks AVX/AVX2, so some JVM, Node and database images crash with "Illegal instruction" ([docker/roadmap#384](https://github.com/docker/roadmap/issues/384)). Docker's newer VMM backend has no Rosetta support at all ([Docker docs](https://docs.docker.com/desktop/features/vmm/)), and QEMU emulation lacks inotify ([Docker known issues](https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/known-issues/)).
- **Apple `container` 1.0** has no Compose support ([Cloud Native Now](https://cloudnativenow.com/features/apple-ships-stable-1-0-of-its-native-container-tool-for-macos/)).

The practical pattern is one OrbStack or Colima Linux VM per Mac, with the agents' checkouts inside the VM so builds never cross the macOS-to-VM file boundary. CPU-bound code runs at 93–99% of native in such VMs ([Eclectic Light](https://eclecticlight.co/2024/01/22/why-does-virtualisation-run-some-code-far-slower-on-apple-silicon/)). Apple's two-VM licence limit applies only to macOS guests ([Apple forums](https://developer.apple.com/forums/thread/826102)). Route amd64-only and Docker-heavy integration suites to Linux x86 boxes. On licensing, Docker Desktop is free for a two-person company, while OrbStack is $8 per seat per month for commercial use.

**The 2015 Proxmox host becomes the services box.** Its single-thread speed is about a third of a 9950X's (Geekbench 6 about 1,000 against 3,067) ([Geekbench](https://browser.geekbench.com/processors/intel-xeon-e5-2680-v4)). Dual-Xeon machines of that era idle at **47 W when vendor-tuned and above 100 W in real homelabs** ([SPECpower](https://www.spec.org/power_ssj2008/results/res2015q1/power_ssj2008-20150203-00686-power.html), [daily.dev/XDA](https://daily.dev/posts/i-bought-cheap-server-hardware-for-my-home-lab-and-the-electricity-bill-taught-me-an-expensive-less-2tiznr3uq)). That is about $145–310 a year at idle alone at $0.35/kWh. As a build worker that is poor value, but as a services node it is fine, because the work is I/O-bound:

- A git mirror.
- Package proxies for npm, PyPI, RubyGems, crates, Go and Maven.
- A Docker Hub pull-through mirror. Unauthenticated pulls are capped at 100 per 6 hours ([Docker](https://docs.docker.com/docker-hub/usage/pulls/)).
- MinIO as a backend for sccache and Turborepo.
- A shared Postgres for template-cloned test databases.
- The fleet's native x86 lane for amd64-only images.

Run `lscpu` to see what it actually holds. A single 4-core E3 or i7 should run services only.

## Isolation, caches and targeted tests multiply each box

**Isolation is the real engineering work, wherever the boxes live.** Git worktrees "isolate file edits" only ([Claude Code docs](https://code.claude.com/docs/en/worktrees)). Published ports, shared databases, named volumes and `.env` files still collide between agents ([Penligent](https://www.penligent.ai/hackinglabs/git-worktrees-need-runtime-isolation-for-parallel-ai-agent-development/)). The proven pattern has four parts:

- **A per-worktree setup script** that allocates a port, a database name and a Compose project name under a lock ([Piechowski](https://piechowski.io/post/setup-script-git-worktrees/)).
- **Random-port test containers.** Testcontainers maps random host ports by design ([Testcontainers](https://java.testcontainers.org/features/networking/)).
- **One shared Postgres per host**, cloning a template database per test or per agent. Watch for stray connections, which caused intermittent failures in up to a quarter of merge-queue runs at one company ([Mergify](https://mergify.com/blog/postgres-database-per-test-sqlalchemy)).
- **A hard memory cap per agent cgroup**, using systemd-run scopes or Docker `--memory`.

The memory cap is not optional. Claude Code child processes have been reported at **20–26 GiB** with about 10 background subagents ([aident](https://aident.ai/blog/fix-claude-code-runaway-child-oom)). Leak reports run to tens of GB ([claude-code #11315](https://github.com/anthropics/claude-code/issues/11315)), and one runaway tsserver reached 61.5 GB ([claudeissues #87301](https://claudeissues.com/issue/87301-typescript-lsp-tsserver-spawned-with-no-memory-cap-one-per-session-runaway-insta)). Without caps, one leaking agent OOM-kills its neighbours.

If you want VM-level boundaries, use one Proxmox VM or LXC per box or per person, not per agent, since each KVM guest costs 256–512 MB ([RDEM](https://proxmox.rdem-systems.com/en/blog/docker-vm-vs-lxc-proxmox/)). Docker Sandboxes' one-microVM-per-agent model is the next step up ([Docker](https://www.docker.com/blog/why-microvms-the-architecture-behind-docker-sandboxes/)).

**Shared caches are this fleet's largest multiplier**, because 20 agents rebuild the same few repositories:

- **ccache** hits are **29–145× faster** than compiling a translation unit ([ccache](https://ccache.dev/performance.html)).
- **Content-hashed test results** served **83–85%** of checks from cache in the 20-agent Rust experiment ([tensorust](https://tensorust.com/articles/run-20-ai-coding-agents-on-one-pc)).
- **sccache** has documented limits: it cannot cache incrementally compiled or linker-invoking Rust crates, it has suffered cache poisoning, and linking remains the bottleneck ([sccache](https://github.com/mozilla/sccache), [brokenco.de](https://brokenco.de/2025/08/25/sccache-is-pretty-okay.html)).
- **Faster linkers** help with that last point: mold links Clang in 1.35 s against 42 s for GNU ld ([mold](https://github.com/rui314/mold)), and Rust 1.90's default LLD made linking about 7× faster ([Rust blog](https://blog.rust-lang.org/2025/09/01/rust-lld-on-1.90.0-stable)).
- **Test databases on tmpfs or with `fsync=off`** run inserts about 29% faster ([pythonspeed](https://pythonspeed.com/articles/faster-db-tests/)). Relaxing MySQL durability took one test slice from 121 s to 48 s ([ma.ttias.be](https://ma.ttias.be/remote-coding-environment-vps/)).

Plan for one deadline: Gradle's Build Cache Node is unsupported after **December 31, 2026** ([Develocity](https://docs.develocity.ai/bcn/21.2/)).

**Running only the affected tests is a hardware decision, because it cuts the duty cycle directly.** No source quantified test-impact skip rates; Datadog publishes none ([Datadog](https://www.datadoghq.com/blog/streamline-ci-testing-with-datadog-intelligent-test-runner/)). The model shows the payoff anyway. If agents run targeted tests while iterating and the full suite once before handoff, and that halves p from 0.3 to 0.15, then 20 agents need 7 concurrent builds at the 99th percentile instead of 11. RAM falls from about 158 GB to about 110 GB, and a 128 GB box carries **about 25 agents instead of 14**. Cheap runner fixes compound this:

- cargo-nextest is 1.4–3.4× faster than `cargo test` ([corrode.dev](https://corrode.dev/blog/tips-for-faster-rust-compile-times/)).
- Jest at `--maxWorkers=50%` is 12–21% faster than the default ([dev.to](https://Dev.to/vantanev/make-your-jest-tests-up-to-20-faster-by-changing-a-single-setting-i36)).
- Pinning BLAS to one thread per pytest-xdist worker avoided a **58× slowdown** ([astropy](https://github.com/astropy/astropy/pull/16196)).
- Sharding Vitest avoids its single-server main-thread bottleneck ([Vitest](https://vitest.dev/guide/improving-performance)).

## Sharing with Aaron pays off for caches and off-peak hours, not peak builds

**The pooling economics are modest when both people run agents at the same time, and large when they don't.** Pooling two fleets on shared boxes saves only the headroom between the sum of each fleet's own peak and the combined fleet's peak. At p = 0.3:

| Agents (you + Aaron) | Separate p99 builds | Pooled p99 | Saving | Hardware value saved (~$300 per 12 GB build slot) |
|---|---|---|---|---|
| 5 + 5 | 8 | 7 | 12% | ~$300 |
| 10 + 10 | 14 | 11 | 21% | ~$900 |
| 20 + 5 | 15 | 13 | 13% | ~$600 |
| 20 + 20, same hours | 22 | 19 | 14% | ~$900 |
| 20 + 20, non-overlapping hours | 22 | 11 | **50%** | **~$3,300 (one full box)** |

So pooling is worth it in three cases. The first is the services box: caches and mirrors are pure gain, since every cache hit Aaron's agents produce on shared dependencies speeds up yours. The second is if your agent hours differ, for example one fleet running overnight. The third is if either of you runs 10 or fewer agents, where the ratio of peak to mean load is highest. For two same-hours fleets of 20, pooling saves about one 128 GB box's worth of RAM headroom, and the costs below can eat that.

**Per-person caps belong in the kernel, not in prompts.** Give each person a dedicated Unix account on each shared box and put a systemd slice over it. The slice carries a hard `MemoryMax`, a guaranteed floor via `MemoryMin`, and a CPU share via `CPUWeight`. Inside it, each agent gets its own scope with its own memory cap. This is the same mechanism Geniar uses for his agent fleet: `CPUQuota=2560%` and a 32 GB memory cap, added after an OOM incident ([ma.ttias.be](https://ma.ttias.be/remote-coding-environment-vps/)). How hard the per-person cap is matters a great deal. A strict 50/50 `MemoryMax` split of one 128 GB box carries only **5 agents each, 10 in total**, because each half must hold its own peak headroom. The same box carries **14** when the two people share headroom. The better setup is to guarantee each person a floor with `MemoryMin` and let both burst into the shared remainder under one box-wide ceiling. Keep the hard caps per agent, not per person. Split costs by the reserved floors (for example 50/50), or meter cgroup CPU-seconds and GB-hours and split by use; the cgroups already record both. Give RAM hard guarantees, since it is fatal to oversubscribe, and give CPU soft weights, since contention only slows things down.

**firstmate's remote secondmates map onto shared boxes cleanly, with two gaps to work around.** A remote secondmate is a complete persistent firstmate home on an SSH host. It uses a dedicated remote account, key-based authentication, its own toolchain and credentials, and projects cloned from origin. Work flows through outbox and backlog files ([firstmate docs](https://github.com/kunchenguid/firstmate/blob/main/docs/remote-secondmates.md)). On a shared box that means **two secondmate homes, one per person's account**. Each runs its own crew in tmux and worktrees ([firstmate README](https://raw.githubusercontent.com/kunchenguid/firstmate/main/README.md)), each with separate GitHub credentials, which keeps your code and Aaron's apart at the account level.

The first gap is that firstmate "does not support placing an individual worker remotely or failing a remote route over to a local replacement," and its SSH transport never retries. Capacity is therefore planned per node, per person. Set each secondmate's crew size to that person's share of the box: on a shared 128 GB box with floors and burst, about 7 crewmates each at p = 0.3; under a hard 50/50 split, only about 5 each. The second gap is that two secondmates on one box are unaware of each other. The cgroup slices are what stop one person's cold-build burst from OOM-killing the other's agents. Point both accounts at the services box's git mirror and package proxies, so two sets of clones from origin don't double network and disk use.

**Pooling stops making sense in five situations:**

- **Confidentiality.** Either of you holds client code under an NDA that forbids co-tenancy. Separate accounts are not separate hardware, and a shared sccache bucket is a cross-tenant poisoning path.
- **Peak overlap.** Both fleets peak in the same hours and each already fills two or more boxes, so the saving drops below about 10%, roughly $600–900, which is less than the coordination cost.
- **Shared failure.** One box's failure would stall both businesses.
- **API quota is the real limit.** Pooling hardware does not pool API quota, so if rate limits bind first, sharing machines buys nothing.
- **Unequal growth.** One person's fleet grows much faster than the other's, and the 50/50 split stops reflecting use.

Keep sharing the services box and any burst capacity even then. Split the build boxes once you're past about 20 agents each with the same working hours.

## Renting, bursting and API limits set the outer bounds

**Renting is unusually competitive in 2026, because providers bought their RAM before the price surge.** A Hetzner AX102 (Ryzen 9 7950X3D, **128 GB DDR5 ECC**, 2×1.92 TB NVMe) lists at **€259 a month, about $290**. Limited-stock units are about $178. It has no minimum term and a €129 setup fee ([Hetzner](https://www.hetzner.com/dedicated-rootserver/ax102/), [Hetzner matrix](https://www.hetzner.com/dedicated-rootserver/matrix-ax/)). Its 128 GB alone would cost about $2,000 at retail today. The prices are not stable, though: the AX102 has risen about **2.4× within 2026** ([agentdeals.dev](https://agentdeals.dev/hetzner-pricing-2026)). Hetzner dedicated servers exist only in Germany and Finland. The 140 ms round trip from Los Angeles ([hatsnet](https://hatsnet.io/docs/network/latency/pairs/lax-fra-rtt.md)) doesn't matter for autonomous agents.

OVH's US RISE-S (Ryzen 7 9700X, 64 GB) is **$77 a month**, but US stock is unconfirmed ([OVH](https://eco.us.ovhcloud.com/rise/)). An owned 9950X with 128 GB costs about **$150–165 a month all-in over 36 months** including power. That breaks even against AX102 list pricing in about 15 months and against limited-stock pricing in about 29 months. The trade-off: owning gives the simplest answer to where client code goes, while renting hedges against having bought RAM at the 2026 peak, which is the biggest financial risk of buying.

**Burst capacity should be cheap compute for the test phase, not wall-clock sandboxes.** AWS c8a spot runs about **$0.016 per vCPU-hour** in us-west-2 ([Holori](https://calculator.holori.com/aws/ec2/c8a.12xlarge/us-west-2)). E2B and Daytona charge about $0.33 per hour for a 4 vCPU / 8 GiB agent, billed even while the agent waits on the model. That is about **$1,170 a month for 20 agents running working hours** ([Fly.io comparison](https://fly.io/learn/ai-sandbox-pricing/)), and Docker-in-sandbox support for database tests was not verified. A GitHub-hosted 16-core runner at $0.042 a minute ([GitHub](https://docs.github.com/en/enterprise-cloud@latest/billing/reference/actions-runner-pricing)) is a sensible fallback for the full-suite step when owned hardware is down.

**The API is the ceiling most likely to bind before hardware.** On Anthropic's API, the Start tier allows Opus 5.5 and Sonnet 5.5 **1,000 requests per minute, 2M input tokens per minute and 400k output tokens per minute**. Cache reads don't count toward input limits on most models. But Start and Build tiers carry **monthly spend caps of $500 and $1,000**; after the cap, requests return 429 until the next month ([Anthropic rate limits](https://platform.claude.com/docs/en/api/rate-limits)). Twenty agents exhaust those caps within days, so request a tier increase before scaling. Anthropic's Claude Code docs recommend **200–300k tokens per minute per user** for teams of 1–5 ([Claude Code costs](https://code.claude.com/docs/en/costs)).

Subscription plans meter usage in five-hour and weekly windows instead. One unconfirmed issue reports 429s in **14.3% of minutes at 6+ concurrent sessions** on a single Max account ([claudeissues #96872](https://claudeissues.com/issue/96872-bug-rate-limited-429-only-when-6-desktop-sessions-are-active-at-once-while-plan)). The notes contain no Codex concurrency data. Review capacity, not compute, is what practitioners running dozens of agents report as the bottleneck ([Simon Willison](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/), [Maggie Appleton](https://maggieappleton.com/gastown)).

## Recommendation and a four-week pilot

**Buy one 128 GB desktop now and treat the second as a decision, not a default.** The box is a Core Ultra 7 270K Plus (or a Ryzen 9 9950X if you want AM5's 192 GB+ path) with 4×32 GB DDR5, a 2 TB NVMe and 2.5GbE, for about **$2.8–3.2k**. It carries about 14 agents at p = 0.3. Make the Proxmox host the cache and services box and the x86 lane. Use the MacBook Pro and whatever the Studios turn out to be as macOS/arm64 lanes behind their own secondmates. Count the iMacs only if your workplace agrees. If the pilot confirms p ≥ 0.25, buy an identical second box. That brings you to **about 28 agents for about $5.6–6.3k total**, at **about $850 a year** in electricity for the two boxes at the assumed rate. Do not buy used mini PCs, Threadripper, 64 GB-only builds or used Apple Silicon.

| Week | Action | Measure | Decision trigger |
|---|---|---|---|
| 0 | Run About This Mac on the Studios and iMacs, and `lscpu` / `free -g` on the Proxmox host. Confirm whether the workplace Macs can be used. Check your API tier, spend cap or plan limits. | Real inventory | Fill in the scorecard's unknown rows. If the Studios are M4/M5 Max with 64 GB+, the second box may never be needed. |
| 1 | Buy box #1, or rent an AX102 month to month to defer RAM risk. Stand up the services box: git mirror, package proxies, Docker mirror, sccache/MinIO. Wrap every crewmate in a cgroup scope with a memory cap. | Cache hit rates; memory peak per scope | Fix isolation collisions (ports, databases) before scaling up. |
| 1–3 | Run 10, then 15, then 20 crewmates through one secondmate on box #1. Log the start and end of every build or test command, using Claude Code PreToolUse/PostToolUse hooks ([docs](https://code.claude.com/docs/en/costs)) or a wrapper script for other harnesses. Also try targeted tests during iteration. | Measured p; 95th/99th-percentile concurrent builds; peak GB per stack; 429s per minute; tasks merged per day | Watch whether p falls when agents run affected tests only. |
| 4 | Decide. | — | **p ≤ 0.2:** box #1 plus the Macs carries 20, so skip box #2. **p 0.2–0.35:** buy box #2 at 128 GB. **p > 0.35, or Rust/C++ peaks above 16 GB:** box #2 at 192 GB, or plan a third box. **429s or review backlog before CPU saturates:** spend on API tier and workflow, not hardware. Revisit pooling with Aaron once both duty cycles are measured. |

## Conclusion

In late 2026 agent capacity is bought by the gigabyte. CPU cores are cheap enough that every serious option has more than the duty cycle needs. Memory is priced so steeply, especially as server RDIMM, that it decides the number of agents per dollar. That inverts the usual HEDT logic: the many-core box loses not on speed but because it cannot be filled with affordable memory. The same arithmetic makes duty-cycle discipline worth real money. Targeted test runs, shared caches and staggered dispatch can nearly double agents per box, which beats any hardware upgrade on price. So the number to measure first is your own p, not anyone's benchmark.

The deeper implication is that a 20-agent fleet is a small hardware problem attached to a large API, review and isolation problem. Two well-configured desktops cost less than a few months of model spend for the agents they host. They also do less for throughput than the worktree setup script, the cgroup caps, and how quickly two people can review what 28 agents produce. Pooling with Aaron follows the same logic: share the caches and the services box freely, and share build boxes only where your peaks do not overlap.
