# The Kubernetes Performance Challenge

This repository contains the benchmarking framework and entry point for the Kubernetes performance challenge. The objective is to evaluate the efficiency and throughput of Kubernetes under high-concurrency workloads.

We were interested in how far we can go with Kubernetes. While it can scale up applications to the space (beyond the clouds 😜), Kubernetes itself doesn't scale well. Or maybe do?

Think we're exaggerating? Prove us wrong!

## 📅 Contest Period

 - Starts at 2026.02.25. 18:00 GMT
 - Ends at 2026.05.25. 22:00 GMT
   
## 🚀 The Challenge

Participants are invited to execute standardized performance tests against the Kubernetes to measure latency, object reconciliation speed, and system stability.

### Score calculation

`floor(checks_total / (http_req_duration.med*0.2 + http_req_duration.p90*0.3 + http_req_duration.p95*0.5) * (1 - checks_failed / checks_total))`

> http_req_duration counted in ms

### 📜 Rules and Constraints

To ensure valid and comparable results, all participants must adhere to the following constraints:

 - **Discussion Protocol**: Upon completion of the challenge, all winners (who beat our score) will be invited to a friendly discussion regarding the results, architectural insights, and the underlying optimization strategies. This ensures a high-level technical exchange within a vetted peer group.
 - **RBAC Policy Enforcement**: Role-Based Access Control must remain enabled and fully functional. Performance gains achieved by bypassing security layers are disqualified.
 - **Feature Parity**: All core Kubernetes features, including Admission Controllers and standard API validation, must be active. No "stripping" of the environment is permitted.
 - **No Shortcuts**: Any modification to the core that compromises data consistency will result in an invalid run.
 - **Zero Tolerance for Instability**: Database or Kubernetes crash lead to immediate disqualification.

> **Integrity & Honor**: We are aware that benchmarks can be manipulated, and no amount of technical restriction can fully prevent dedicated cheating. However, this challenge is a matter of professional honor. We are not fools - any discrepancies will immediately surface during the discussion. Let’s not ruin the collective experience for 15 minutes of fame; if you can’t beat the baseline honestly, use the opportunity to learn how to improve.

### 🛠️ Getting Started

 - **Deployment**: Bring your own Kubernetes, any customization is allowed which doesn't break the rules 👆.
 - **Benchmarking**: Execute our k6 test against on your cluster.
 - **Create a PR**: Share your results via Pull-Request on the challenge repository (check example PR).

### 🔥 Benchmark Details

 - The test execution is 1 hour
 - Define concurrency on your own taste
 - Each iteration creates 6 different type of custom resources in parallel
 - Each iteration reads beck the created custom resources via label selector in parallel

## 🏆 The Grand Prize

The ultimate reward for pushing the boundaries of cloud engineering.

Every participant who achieves a higher score than our's will receive a custom-manufactured, limited-edition technical shirt.

The Design:
 - Front: Kubernetes Performance Challenge
 - Back: I BEAT HARIKUBE
 - Sleeve: Your specific performance metrics (like number of objects, latencies, and success rate) printed as a permanent record of your achievement.

## 🎖️ The "First Ten" Grant

The first 10 participants to submit a valid benchmark report (regardless of their final ranking) will receive a exclusive one-year HariKube Basic Edition License.

## 🎲 The "Second Chance" Draw

Don't be discouraged if you missed the first ten or couldn't beat our score. At the conclusion of the challenge, one additional HariKube Basic Edition License will be raffled off among all participants who submitted a valid report but haven't won through the other categories.

# ⚡ Current Leaderboard

| Score | Participant | checks_total | checks_succeeded | http_reqs/s | http_req_duration.avg | Machines |
| - | - | - | - | - | - | - |
| **1059*** | [HariKube](https://github.com/orgs/HariKube) | 429180 | 100.00% | 119.106435/s | 167.17ms | Ultra 7 165H 18 Core 4GB |

> \* Target Score To Beat

## Leader Benchmark Details

> Initial baseline set on a Laptop; awaiting a challenge to scale up, give me reason to bring my beasts!

```
    checks_total.......: 429180  119.106435/s
    checks_succeeded...: 100.00% 429180 out of 429180
    checks_failed......: 0.00%   0 out of 429180

    ✓ Status is 201
    ✓ Status is 200

    HTTP
    http_req_duration..............: avg=167.17ms min=7.75ms   med=71.06ms max=3.71s  p(90)=398ms p(95)=543.76ms
      { expected_response:true }...: avg=167.17ms min=7.75ms   med=71.06ms max=3.71s  p(90)=398ms p(95)=543.76ms
    http_req_failed................: 0.00%  0 out of 429180
    http_reqs......................: 429180 119.106435/s
```
    
## Are you interested in how we did it?

If we can dominate the leaderboard from a laptop, imagine the stability and raw power we can unleash on your datacenter.
[Technical Details](https://harikube.info/features/performance/)
