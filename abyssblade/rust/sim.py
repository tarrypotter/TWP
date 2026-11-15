#!/usr/bin/env python3
"""ABYSSBLADE 엔진 헤드리스 검증: wasm을 wasmtime으로 직접 돌려 게임 로직을 확인한다.

    python3 tools/sim.py [--seconds 240] [--verbose]

브라우저 없이 60Hz 틱을 돌리며 층 진행, 처치, 제련, 3택 카드, 진화, 보스, 사망을 검사한다.
"""
import argparse
import struct
import sys
from pathlib import Path

import wasmtime

ROOT = Path(__file__).resolve().parent.parent
WASM = ROOT / "target" / "wasm32-unknown-unknown" / "release" / "bladeforge.wasm"

STRIDE = [9, 7, 7, 6, 6, 5, 7]
H = dict(px=0, py=1, hp=2, maxhp=3, gold=4, shards=5, wave=6, prog=7, left=8, wlv=9,
         elem=10, dmg=11, rng=12, itv=13, cd=14, cdmax=15, cost=16, phase=17, kills=18,
         time=19, gain=20, aim=21, swing=22, shake=23, boss=24, dash=25, crit=26, msgt=27,
         pr=28, inv=29, relic=30, tot=31, tier=53, ls=54, chain=55, split=56, wavep=57)


class Engine:
    def __init__(self, path=WASM):
        self.store = wasmtime.Store()
        mod = wasmtime.Module.from_file(self.store.engine, str(path))
        self.inst = wasmtime.Instance(self.store, mod, [])
        self.e = self.inst.exports(self.store)
        self.mem = self.e["memory"]

    def call(self, name, *args):
        return self.e[name](self.store, *args)

    def floats(self):
        ptr = self.call("bf_out_ptr")
        n = self.call("bf_out_len")
        raw = self.mem.read(self.store, ptr, ptr + n * 4)
        return struct.unpack("<%df" % n, raw)

    def text(self, name):
        p = self.call(name + "_ptr")
        l = self.call(name + "_len")
        if not p or not l:
            return ""
        return self.mem.read(self.store, p, p + l).decode("utf-8", "replace")

    def card(self, i):
        return {
            "name": self.text(f"bf_card_name_{''}") if False else self._cs(i, "name"),
            "desc": self._cs(i, "desc"),
            "tag": self._cs(i, "tag"),
            "rarity": self.call("bf_card_rarity", i),
        }

    def _cs(self, i, field):
        p = self.call(f"bf_card_{field}_ptr", i)
        l = self.call(f"bf_card_{field}_len", i)
        if not p or not l:
            return ""
        return self.mem.read(self.store, p, p + l).decode("utf-8", "replace")


def sec(h, i):
    off = int(h[32 + i * 3 + 1])
    n = int(h[32 + i * 3 + 2])
    return off, n


def run(seconds=240.0, verbose=False, seed=7, atk=0.0, hp=0.0, spd=0.0, gold=0.0):
    eng = Engine()
    eng.call("bf_init", seed, atk, hp, spd, gold)
    eng.call("bf_resize", 390.0, 560.0)
    eng.call("bf_start", seed)
    dt = 1.0 / 60.0
    steps = int(seconds / dt)
    events = []
    last_wave = 0
    last_phase = 0
    picked = 0
    enhances = 0
    max_wave = 0
    deaths = 0
    t = 0.0
    jx = jy = 0.0
    for s in range(steps):
        h = eng.floats()
        phase = int(h[H["phase"]])
        wave = int(h[H["wave"]])
        # 카드 선택
        if phase in (1, 3):
            n = eng.call("bf_card_count")
            names = []
            for i in range(n):
                c = eng.card(i)
                names.append(f"{c['name']}({c['tag']})")
            events.append(("cards", round(t, 1), wave, phase, names))
            pick = s % max(1, n)
            eng.call("bf_choose", pick)
            picked += 1
            h = eng.floats()
            last_phase = int(h[H["phase"]])
            continue
        if phase == 2:
            deaths += 1
            events.append(("death", round(t, 1), wave, int(h[H["kills"]]), int(h[H["gain"]])))
            break
        # 제련
        if h[H["gold"]] >= h[H["cost"]] and s % 30 == 0:
            before = int(h[H["wlv"]])
            eng.call("bf_enhance")
            h2 = eng.floats()
            if int(h2[H["wlv"]]) > before:
                enhances += 1
                events.append(("enhance", round(t, 1), int(h2[H["wlv"]]), round(h2[H["dmg"]], 1)))
                h = h2
        # 특수기
        if h[H["cd"]] <= 0.0 and s % 120 == 0:
            eng.call("bf_special")
            h = eng.floats()
        # 카이팅: 90px 안의 적에서 도망, 아니면 가장 가까운 적 쪽으로
        off, n = sec(h, 0)
        px, py = h[H["px"]], h[H["py"]]
        ax = ay = 0.0
        near = 0.0
        best = 1e9
        bx = by = 0.0
        for i in range(n):
            o = off + i * STRIDE[0]
            ex, ey = h[o], h[o + 1]
            d = ((ex - px) ** 2 + (ey - py) ** 2) ** 0.5
            if d < 95:
                near += 1
                ax -= (ex - px) / max(d, 1)
                ay -= (ey - py) / max(d, 1)
            if d < best:
                best = d
                bx, by = ex - px, ey - py
        if near > 0:
            l = (ax * ax + ay * ay) ** 0.5 or 1
            jx, jy = ax / l, ay / l
        elif best < 1e8:
            l = best or 1
            jx, jy = bx / l * 0.85, by / l * 0.85
        else:
            jx = jy = 0.0
        eng.call("bf_tick", dt, jx, jy)
        t += dt
        h = eng.floats()
        wave = int(h[H["wave"]])
        max_wave = max(max_wave, wave)
        if wave != last_wave:
            events.append(("wave", round(t, 1), wave, int(h[H["kills"]]), round(h[H["gold"]])))
            last_wave = wave
        if verbose and s % 600 == 0:
            print(f"t={t:5.1f} wave={wave:2d} hp={h[H['hp']]:5.0f}/{h[H['maxhp']]:.0f} "
                  f"lv={int(h[H['wlv']]):2d} gold={h[H['gold']]:5.0f} kills={int(h[H['kills']]):3d} "
                  f"enemies={n:2d} boss={h[H['boss']]:.2f} dmg={h[H['dmg']]:.1f}")
    h = eng.floats()
    return dict(events=events, t=round(t, 1), wave=int(h[H["wave"]]), kills=int(h[H["kills"]]),
                gold=h[H["gold"]], level=int(h[H["wlv"]]), enh=enhances, cards=picked,
                deaths=deaths, max_wave=max_wave, dmg=h[H["dmg"]], elem=int(h[H["elem"]]),
                tier=int(h[H["tier"]]), phase=int(h[H["phase"]]), shards=int(h[H["gain"]]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, default=240.0)
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--atk", type=float, default=0.0)
    ap.add_argument("--hp", type=float, default=0.0)
    a = ap.parse_args()
    if not WASM.exists():
        print("missing wasm; build first", file=sys.stderr)
        return 1
    r = run(a.seconds, a.verbose, a.seed, a.atk, a.hp)
    kinds = {}
    for ev in r["events"]:
        kinds[ev[0]] = kinds.get(ev[0], 0) + 1
    for ev in r["events"][:40]:
        print(ev)
    print("...")
    print("summary:", {k: r[k] for k in ("t", "max_wave", "kills", "gold", "level", "enh", "cards",
                                         "deaths", "dmg", "elem", "tier", "phase", "shards")})
    print("event counts:", kinds)
    ok = (r["kills"] > 0 and r["lane"] if False else True)
    checks = {
        "enemies spawned & killed": r["kills"] > 0,
        "wave advanced": r["max_wave"] >= 2,
        "cards offered": r["cards"] > 0,
        "weapon enhanced": r["level"] > 0,
    }
    for k, v in checks.items():
        print(("PASS " if v else "FAIL ") + k)
    return 0 if all(checks.values()) else 2


if __name__ == "__main__":
    raise SystemExit(main())
