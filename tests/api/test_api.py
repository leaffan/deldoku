"""D02 API test: python3 -I test_api.py <base_url> <srv_dir>
Runs end-to-end flows against stats.php and checks scores against a reference model."""
import json, os, sys, threading, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

BASE, SRV = sys.argv[1], sys.argv[2]
URL = BASE + "/deldoku/api/stats.php"
TODAY = datetime.now(timezone.utc).date()
D0, D1 = TODAY.isoformat(), (TODAY - timedelta(days=1)).isoformat()
KEYS = [f"{r}-{c}" for r in range(3) for c in range(3)]
REQUEST_TIMEOUT = 10  # seconds; keeps a hung server from blocking the run
fails = 0

def req(method, query="", body=None, token=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    r = urllib.request.Request(URL + query, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("X-DelDoku-Token", token)
    try:
        with urllib.request.urlopen(r, timeout=REQUEST_TIMEOUT) as resp:
            return resp.status, json.loads(resp.read() or b"null")
    except urllib.error.HTTPError as e:
        txt = e.read()
        try:
            return e.code, json.loads(txt)
        except Exception:
            return e.code, txt.decode(errors="replace")[:200]
    except (urllib.error.URLError, TimeoutError) as e:
        # Status 0 = no HTTP response; the calling check fails and shows the reason
        return 0, f"no response: {e}"

def check(name, cond, info=""):
    global fails
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f"   -> {info}"))
    if not cond:
        fails += 1

answers = {d: json.load(open(f"{SRV}/deldoku/challenges/{d}.json"))["answers"] for d in (D0, D1)}
def sel(date, idx=0):
    """Selection using the idx-th answer of each cell (falls back to first), skipping duplicates."""
    out, used = {}, set()
    for k in KEYS:
        r, c = map(int, k.split("-"))
        opts = [p for p in answers[date][r][c] if p not in used]
        p = opts[min(idx, len(opts) - 1)]
        used.add(p); out[k] = p
    return out

# Reference model of the scoring rules
model = {D0: {k: {} for k in KEYS}, D1: {k: {} for k in KEYS}}
seen = {}
def expect(user, date, selections):
    score, correct, cells = 0, 0, {}
    for k in KEYS:
        p = selections.get(k, "")
        r, c = map(int, k.split("-"))
        if p and p in answers[date][r][c]:
            cnt = model[date][k]; tot = sum(cnt.values())
            s = 100 if tot == 0 else max(10, round(100 * (1 - cnt.get(p, 0) / tot)))
            cells[k] = s; score += s; correct += 1
        else:
            cells[k] = 0
    if correct == 9:
        score += 100
    for k in KEYS:
        p = selections.get(k, "")
        if cells[k] and p not in seen.setdefault((user, date, k), set()):
            seen[(user, date, k)].add(p)
            model[date][k][p] = model[date][k].get(p, 0) + 1
    return score, cells

# --- public GET ---
st, b = req("GET")
check("GET public empty -> 200, games 0", st == 200 and b["games"] == 0 and b["cells"] == {}, (st, b))
for q in ["?date=abc", "?date=..%2Fx", "?challengeDate=2026-13-45", "?date%5B%5D=x"]:
    st, _ = req("GET", q); check(f"GET public {q} -> 400", st == 400, st)

# Rate-limit files from earlier days: only today and yesterday may survive
REG_LIMIT = 30  # set via DELDOKU_REGISTRATION_LIMIT in run.sh
D3 = (TODAY - timedelta(days=3)).isoformat()
for d in (D3, D1):
    open(f"{SRV}/data/ratelimit_{d}.json", "w").write('{"secret":"x","counts":{}}')

# --- registration ---
A = sel(D0, 0)
st, b = req("POST", body={"date": D0, "selections": A})
check("POST new user -> 200 with userId+token", st == 200 and b.get("token") and b["userId"].startswith("u_"), (st, b))
u1, t1 = b["userId"], b["token"]
exp, _ = expect(u1, D0, A)
check(f"first game score {exp}", b["game"]["score"] == exp and b["game"]["won"], b["game"])

# --- auth ---
st, _ = req("POST", body={"date": D0, "selections": A, "userId": u1})
check("POST known user without token -> 401", st == 401, st)
st, _ = req("POST", body={"date": D0, "selections": A, "userId": u1}, token="wrong")
check("POST known user wrong token -> 401", st == 401, st)
st, _ = req("POST", body={"date": D0, "selections": A, "userId": "../../x"}, token=t1)
check("POST userId traversal -> 400", st == 400, st)
st, _ = req("GET", f"?userId={u1}")
check("GET own stats without token -> 401", st == 401, st)
st, _ = req("GET", "?userId=..%2F..%2Fx", token=t1)
check("GET userId traversal -> 400", st == 400, st)

# --- replay same players: counts unchanged ---
st, b = req("POST", body={"date": D0, "selections": A, "userId": u1}, token=t1)
exp, _ = expect(u1, D0, A)
check(f"replay same players score {exp}", st == 200 and b["game"]["score"] == exp, (st, b))
st, pub = req("GET")
check("replay same players: counts unchanged", all(sum(pub["cells"][k].values()) == 1 for k in KEYS), pub["cells"])

# --- replay new players: counts increase ---
B = sel(D0, 1)
st, b = req("POST", body={"date": D0, "selections": B, "userId": u1}, token=t1)
exp, _ = expect(u1, D0, B)
check(f"replay new players score {exp}", st == 200 and b["game"]["score"] == exp, (st, b))

# --- second user ---
st, b = req("POST", body={"date": D0, "selections": A})
u2, t2 = b["userId"], b["token"]
exp, _ = expect(u2, D0, A)
check(f"second user score {exp}", st == 200 and b["game"]["score"] == exp, (st, b))

# --- wrong + empty answers ---
W = dict(A); W["0-0"] = "1/not-a-real-player"; W["2-2"] = ""
st, b = req("POST", body={"date": D0, "selections": W, "userId": u2}, token=t2)
exp, cells = expect(u2, D0, W)
check(f"wrong+empty cells: score {exp}, correct 7, not won",
      st == 200 and b["game"]["score"] == exp and b["game"]["correct"] == 7 and not b["game"]["won"], (st, b))

# --- validation ---
D = dict(A); D["0-1"] = A["0-0"]
cases = [
    ("duplicate player", {"date": D0, "selections": D}, 400),
    ("bad player id", {"date": D0, "selections": {"0-0": "../x"}}, 400),
    ("unknown cell key", {"date": D0, "selections": {"3-3": A["0-0"]}}, 400),
    ("selections not object", {"date": D0, "selections": "x"}, 400),
    ("invalid date", {"date": "x/../../probe", "selections": A}, 400),
    ("date 2 days ago", {"date": (TODAY - timedelta(days=2)).isoformat(), "selections": A}, 400),
    ("date tomorrow", {"date": (TODAY + timedelta(days=1)).isoformat(), "selections": A}, 400),
]
for name, body, code in cases:
    st, _ = req("POST", body=body); check(f"POST {name} -> {code}", st == code, st)
st, _ = req("POST", raw=b"{not json"); check("POST invalid JSON -> 400", st == 400, st)
st, _ = req("POST", raw=b'{"x":"' + b"a" * 9000 + b'"}'); check("POST > 8 KB -> 413", st == 413, st)
# Real IDs contain dots, %-encoding and non-ASCII. An invalid userId makes the request stop right
# after selection parsing, so "invalid userId" proves the selections were accepted without storing a game.
S = {"0-0": "12390/t.j.-mulock", "0-1": "15224/daniel-wei%C3%9F", "0-2": "22333/bastian-steingroÃŸ"}
st, b = req("POST", body={"date": D0, "selections": S, "userId": "x"})
check("POST real-world player IDs pass validation", st == 400 and b.get("error") == "invalid userId", (st, b))

# --- yesterday + streak ---
Y = sel(D1, 0)
st, b = req("POST", body={"date": D1, "selections": Y, "userId": u1}, token=t1)
expect(u1, D1, Y)
check("POST yesterday -> 200", st == 200, (st, b))
st, b = req("GET", f"?userId={u1}", token=t1)
s = b["stats"]
best_today = max(g["score"] for g in s["gameHistory"] if g["date"] == D0)
best_yday = max(g["score"] for g in s["gameHistory"] if g["date"] == D1)
check("own stats: 4 games, 2 days, streak 2, totalPoints = best per day",
      st == 200 and s["totalGames"] == 4 and s["daysPlayed"] == 2 and s["currentStreak"] == 2
      and s["longestStreak"] == 2 and s["totalPoints"] == best_today + best_yday, s)
check("pointsPercent = best per day / (days played * 1000)",
      abs(s["pointsPercent"] - (best_today + best_yday) / 2000 * 100) < 0.051, s.get("pointsPercent"))

# --- daily limit ---
codes = [req("POST", body={"date": D0, "selections": A, "userId": u2}, token=t2)[0] for _ in range(19)]
check("u2: games 3..20 accepted, 21st -> 429", codes[:18] == [200] * 18 and codes[18] == 429, codes)

# --- concurrency: 20 new users in parallel ---
res = []
def worker():
    res.append(req("POST", body={"date": D1, "selections": Y})[0])
ts = [threading.Thread(target=worker) for _ in range(20)]
[t.start() for t in ts]; [t.join() for t in ts]
st, pub = req("GET", f"?date={D1}")
check("20 parallel POSTs: all 200, day games = 21", res.count(200) == 20 and pub["games"] == 21, (res, pub["games"]))

# --- registration limit per IP (22 users registered so far) ---
extra = 0
while True:
    st, _ = req("POST", body={"date": D1, "selections": Y})
    if st != 200:
        break
    extra += 1
    if extra > REG_LIMIT:
        break
check(f"registration limit: {REG_LIMIT} new users per IP, then 429", 22 + extra == REG_LIMIT and st == 429, (extra, st))
st, _ = req("POST", body={"date": D0, "selections": A, "userId": u1}, token=t1)
check("existing user can still play after registration limit", st == 200, st)
expect(u1, D0, A)
rl = open(f"{SRV}/data/ratelimit_{D0}.json").read()
rl_data = json.loads(rl)
check("rate-limit file stores only hashes, no IPs",
      not __import__("re").search(r"\d+\.\d+\.\d+\.\d+", rl) and all(len(k) == 64 for k in rl_data["counts"]), rl)
check("old rate-limit files removed, yesterday kept",
      not os.path.exists(f"{SRV}/data/ratelimit_{D3}.json") and os.path.exists(f"{SRV}/data/ratelimit_{D1}.json"))

# --- public aggregate matches model, no user data ---
st, pub = req("GET")
counts_ok = all(pub["cells"][k] == model[D0][k] for k in KEYS)
check("public counts match reference model", counts_ok, (pub["cells"], model[D0]))
check("public output has no userIds/tokens", u1 not in json.dumps(pub) and "token" not in json.dumps(pub))

# --- files on disk ---
data = f"{SRV}/data"
log_raw = open(f"{data}/games.jsonl").read()

def parse_log_line(line):
    # Malformed lines must fail a check below instead of crashing the test run
    try:
        entry = json.loads(line)
    except ValueError:
        return None
    return entry if isinstance(entry, dict) and isinstance(entry.get("userId"), str) else None

lines = log_raw.splitlines()
log = [e for e in map(parse_log_line, lines) if e is not None]
check("games.jsonl: every line is a JSON object with userId", len(log) == len(lines), len(lines) - len(log))
games = [e for e in log if e.get("type") == "game"]
regs = [e for e in log if e.get("type") == "register"]
check("games.jsonl: every line typed as game or register", len(games) + len(regs) == len(log), len(log))
check("games.jsonl has one game line per accepted game", len(games) == 6 + 18 + 20 + (REG_LIMIT - 22) + 1, len(games))
check("games.jsonl has exactly one register line per user", len(regs) == REG_LIMIT and len({r["userId"] for r in regs}) == REG_LIMIT, len(regs))
first_game = {}
for i, e in enumerate(log):
    first_game.setdefault(e["userId"], (i, e.get("type")))
check("each user's first log line is its registration", all(t == "register" for _, t in first_game.values()))
r1 = next((r for r in regs if r["userId"] == u1), {})
check("register line has tokenHash of user file, keys exactly as specified",
      set(r1) == {"type", "userId", "tokenHash", "created"}
      and r1["tokenHash"] == json.load(open(f"{data}/users/{u1}.json"))["tokenHash"], r1)
check("log contains no plaintext tokens", t1 not in log_raw and t2 not in log_raw)
ufile = open(f"{data}/users/{u1}.json").read()
check("user file stores no plaintext token", t1 not in ufile)
check("data/.htaccess denies access", open(f"{data}/.htaccess").read().strip() == "Require all denied")
outside = [p for p in os.listdir(SRV) if p not in ("data", "deldoku")]
check("nothing written outside data/", outside == [], outside)

# --- corrupt day file is kept, not overwritten ---
open(f"{data}/day_{D0}.json", "w").write("{broken")
st, _ = req("POST", body={"date": D0, "selections": A, "userId": u1}, token=t1)
check("corrupt day file -> 500 and file untouched", st == 500 and open(f"{data}/day_{D0}.json").read() == "{broken", st)

# --- fallback challenge (the regular day file for D0 is still corrupt, so it must not be touched) ---
challenges_dir = f"{SRV}/deldoku/challenges"
fb = json.load(open(f"{challenges_dir}/fallback.json"))["answers"]
F = {k: fb[int(k[0])][int(k[2])][0] for k in KEYS}
st, b = req("POST", body={"date": D0, "selections": F, "userId": u1, "challenge": "fallback"}, token=t1)
check("declared fallback: scored against fallback answers (1000)",
      st == 200 and b["game"]["score"] == 1000 and b["game"].get("challenge") == "fallback", (st, b))
check("fallback counted separately, regular day file untouched",
      os.path.exists(f"{data}/day_{D0}_fallback.json") and open(f"{data}/day_{D0}.json").read() == "{broken")
st, pub = req("GET", f"?date={D0}&challenge=fallback")
check("GET fallback day stats", st == 200 and pub["games"] == 1 and all(pub["cells"][k] == {F[k]: 1} for k in KEYS), pub)
user_file = json.load(open(f"{data}/users/{u1}.json"))
check("seen-marker for fallback kept apart from the regular challenge",
      f"{D0}:fallback" in user_file["seen"] and user_file["games"][-1].get("challenge") == "fallback", list(user_file["seen"]))
last = json.loads(open(f"{data}/games.jsonl").read().splitlines()[-1])
check("log line marks fallback game", last["type"] == "game" and last.get("challenge") == "fallback", last)

os.rename(f"{challenges_dir}/{D0}.json", f"{challenges_dir}/{D0}.json.hidden")
st, b = req("POST", body={"date": D0, "selections": F, "userId": u1}, token=t1)
check("day file missing, nothing declared: server falls back on its own (replay -> 190)",
      st == 200 and b["game"].get("challenge") == "fallback" and b["game"]["score"] == 190, (st, b))
for name, body in [("POST invalid challenge value", {"date": D0, "selections": F, "userId": u1, "challenge": "x"}),
                   ("POST challenge not a string", {"date": D0, "selections": F, "userId": u1, "challenge": 1})]:
    st, _ = req("POST", body=body, token=t1); check(f"{name} -> 400", st == 400, st)
st, _ = req("GET", f"?date={D0}&challenge=x"); check("GET invalid challenge value -> 400", st == 400, st)
os.rename(f"{challenges_dir}/fallback.json", f"{challenges_dir}/fallback.json.hidden")
st, _ = req("POST", body={"date": D0, "selections": F, "userId": u1}, token=t1)
check("neither day file nor fallback -> 404", st == 404, st)

print(f"\n{'ALL PASSED' if fails == 0 else f'{fails} FAILED'}")
sys.exit(1 if fails else 0)
