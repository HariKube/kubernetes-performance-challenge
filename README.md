# The Kubernetes Performance Challenge, Join to the contest!

We were interested in how far we can go with Kubernetes. While it can scale up applications to the space (beyond the clouds 😜), Kubernetes itself fails to scale gracefully. Or maybe not?

**Think your cluster is fast? Beat or cluster!**

## 🚀 The Challenge

Participants are invited to execute standardized performance tests against the Kubernetes to measure latency, throughput, and system stability.

> Participation is free and requires no purchase.

# 🏆 The Grand Prize

The ultimate reward for pushing the boundaries of cloud engineering.

Every participant who achieves a higher score than ours will receive a custom-manufactured, limited-edition technical shirt.

The Design:
 - Front: Kubernetes Performance Challenge
 - Back: I BEAT HARIKUBE
 - Sleeve: Your specific performance metrics (like number of objects, latencies, and success rate) printed as a permanent record of your achievement.

## 🎖️ The "First Ten" Grant

The first 10 participants to submit a valid benchmark report (regardless of their final ranking) will receive a exclusive one-year HariKube [Pro Edition](https://harikube.info/editions/) License.

## 🎲 The "Second Chance" Draw

Don't be discouraged if you missed the first ten or couldn't beat our score. At the conclusion of the challenge, one additional HariKube [Pro Edition](https://harikube.info/editions/) License will be raffled off among all participants who submitted a valid report but haven't won through the other categories.

### 📅 Contest Period

 - Ends at 2026.05.25. 22:00 GMT

### Score calculation

`floor(checks_total / (http_req_duration.med*0.2 + http_req_duration.p90*0.3 + http_req_duration.p95*0.5) * pow(1 - checks_failed / checks_total, 7))`

> http_req_duration counted in ms

### 📜 Rules and Constraints

To ensure valid and comparable results, all participants must adhere to the following constraints:

 - **Discussion Protocol**: Upon completion of the challenge, all winners (who beat our score) will be invited to a friendly discussion regarding the results, architectural insights, and the underlying optimization strategies. This ensures a high-level technical exchange within a vetted peer group.
 - **RBAC Policy Enforcement**: Role-Based Access Control must remain enabled and fully functional. Performance gains achieved by bypassing security layers are disqualified.
 - **Feature Parity**: All core Kubernetes features, including Admission Controllers and standard API validation, must be active. No "stripping" of the environment is permitted.
 - **No Shortcuts**: Any modification to the core that compromises data consistency will result in an invalid run.
 - **Zero Tolerance for Instability**: Database or Kubernetes crash lead to immediate disqualification.

> **Integrity & Honor**: We are aware that benchmarks can be manipulated, and no amount of technical restriction can fully prevent dedicated cheating. However, this challenge is a matter of professional honor. We are not fools - any discrepancies will immediately surface during the discussion. Let’s not ruin the collective experience for 15 minutes of fame; if you can’t beat the baseline honestly, use the opportunity to learn how to improve.

 - Winners are responsible for any local taxes or customs duties related to their prizes.
 - HariKube reserves the right to disqualify any submission that violates the spirit of the challenge. Our decision is final and non-negotiable.
 - By submitting a PR, you consent to the public display of your GitHub username on the leaderboard. Personal information for prizes will be handled temporary and will not be shared with third parties.
 - Legal Disclaimer: This is a skill-based challenge. Participation is free. By submitting your results, you acknowledge that the final validation of any score is subject to the Technical Discussion Protocol to ensure compliance with the rules.
   
### 🛠️ Getting Started

 - **Deployment**: Bring your own Kubernetes.
 - **Benchmarking**: Execute our [k6 test](k6_custom_resource_6_read_write.js) against on your cluster.
   - Run `make` command for details.
 - **Create a PR**: Share your results via Pull-Request on the challenge repository. The PR must contains:
   - The data is collected under `results/${USER}` directory
   - Summary of k6 benchmark execution, example location: `results/${USER}/1771941557_20_sum.json`
   - Collected benchmark data, example location: `results/${USER}/1771941557_20.json`
   - Updated `Current Leaderboard` in `README.md`
   - If you have the highest score; update `Leader Benchmark Details` in `README.md` based on the example

### 🕵️ Benchmark Details

 - The test execution is 1 hour
 - Define concurrency on your own taste
 - Each iteration creates 6 different type of custom resources in parallel
 - Each iteration reads back the created custom resources via label selector in parallel

# ⚡ Current Leaderboard

| score | participant | checks_total | checks_succeeded | http_reqs/s | http_req_duration.avg | specs |
| - | - | - | - | - | - | - |
| **1059*** | [mhmxs](https://github.com/mhmxs) | 429180 | 100.00% | 119.106435/s | 167.17ms | 1x Ultra 7 165H 18 Core 4GB |
| **7589*** | [daaain](https://github.com/daaain) | 1160484 | 100.00% | 322.161925/s | 61.7ms | Macbook Pro M2 Max (Colima) |

> \* Target Score To Beat

## Leader Benchmark Details

```text
checks_total.......: 1160484 322.161925/s
checks_succeeded...: 100.00% 1160484 out of 1160484
checks_failed......: 0.00%   0 out of 1160484

✓ Status is 201
✓ Status is 200

HTTP
http_req_duration..............: avg=61.7ms   min=1.07ms  med=34.07ms  max=5.29s p(90)=148.64ms p(95)=202.99ms
  { expected_response:true }...: avg=61.7ms   min=1.07ms  med=34.07ms  max=5.29s p(90)=148.64ms p(95)=202.99ms
http_req_failed................: 0.00%   0 out of 1160484
http_reqs......................: 1160484 322.161925/s
```

## 🙏 Share Feedback and Report Issues

If you encounter any issues, have a suggestion, or simply want to share your experience, we want to hear from you!

- Report Bugs: If you find a bug, please open a [GitHub Issue](https://github.com/HariKube/kubernetes-performance-challenge/issues). Include as much detail as possible, such as steps to reproduce the bug, expected behavior, and your environment (e.g., Kubernetes version).
- Discussions: For general questions or discussions, please use the [GitHub Discussions](https://github.com/HariKube/kubernetes-performance-challenge/discussions).
