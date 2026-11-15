//! ABYSSBLADE — 심연의 룬검 각성
//! 무기(=룬검) 성장 × 로그라이크 엔진. std만 사용, wasm32-unknown-unknown.
//! JS는 out() 버퍼(Float32Array)를 읽어 렌더링만 한다.

#![allow(dead_code)]

use core::f32::consts::{PI, TAU};

// ---------------- 렌더 버퍼 프로토콜 ----------------
const NSEC: usize = 7;
const HDR: usize = 64;
const STRIDE: [usize; NSEC] = [9, 7, 7, 6, 6, 5, 7];

const S_ENEMY: usize = 0;
const S_PROJ: usize = 1;
const S_SLASH: usize = 2;
const S_POP: usize = 3;
const S_BURST: usize = 4;
const S_ORB: usize = 5;
const S_BEAM: usize = 6;

// header
const H_PX: usize = 0;
const H_PY: usize = 1;
const H_HP: usize = 2;
const H_MAXHP: usize = 3;
const H_GOLD: usize = 4;
const H_SHARDS: usize = 5;
const H_WAVE: usize = 6;
const H_PROG: usize = 7;
const H_LEFT: usize = 8;
const H_WLV: usize = 9;
const H_ELEM: usize = 10;
const H_DMG: usize = 11;
const H_RANGE: usize = 12;
const H_INT: usize = 13;
const H_CD: usize = 14;
const H_CDMAX: usize = 15;
const H_COST: usize = 16;
const H_PHASE: usize = 17;
const H_KILLS: usize = 18;
const H_TIME: usize = 19;
const H_GAIN: usize = 20;
const H_AIM: usize = 21;
const H_SWING: usize = 22;
const H_SHAKE: usize = 23;
const H_BOSS: usize = 24;
const H_DASH: usize = 25;
const H_CRIT: usize = 26;
const H_MSGT: usize = 27;
const H_PR: usize = 28;
const H_INV: usize = 29;
const H_RELIC: usize = 30;
const H_TOT: usize = 31;
const H_SEC: usize = 32; // 7 * 3
const H_TIER: usize = 53;
const H_LS: usize = 54;
const H_CHAIN: usize = 55;
const H_SPLIT: usize = 56;
const H_WAVEP: usize = 57;
const H_HEAL: usize = 58;
const H_DEPTHMAX: usize = 59;

// phase
const P_PLAY: u32 = 0;
const P_CARDS: u32 = 1;
const P_DEAD: u32 = 2;
const P_EVOLVE: u32 = 3;

fn clamp(v: f32, a: f32, b: f32) -> f32 {
    if v < a {
        a
    } else if v > b {
        b
    } else {
        v
    }
}

// ---------------- RNG ----------------
struct Rng(u32);
impl Rng {
    fn new(seed: u32) -> Rng {
        Rng(seed | 1)
    }
    fn next(&mut self) -> u32 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.0 = x;
        x
    }
    fn f(&mut self) -> f32 {
        ((self.next() >> 8) as f32) / 16777216.0
    }
    fn r(&mut self, a: f32, b: f32) -> f32 {
        a + (b - a) * self.f()
    }
    fn i(&mut self, n: u32) -> u32 {
        if n == 0 {
            0
        } else {
            self.next() % n
        }
    }
}

// ---------------- 상태 ----------------
#[derive(Clone, Copy)]
struct Stats {
    dmg: f32,
    aspd: f32,
    range: f32,
    crit: f32,
    critmult: f32,
    lifesteal: f32,
    speed: f32,
    gold: f32,
    burn: f32,
    slow: f32,
    cost: f32,
    split: u32,
    chain: u32,
    waves: u32,
    explode: u32,
    boss: f32,
    regen: f32,
}

impl Stats {
    fn new() -> Stats {
        Stats {
            dmg: 1.0,
            aspd: 1.0,
            range: 1.0,
            crit: 0.06,
            critmult: 1.9,
            lifesteal: 0.0,
            speed: 1.0,
            gold: 1.0,
            burn: 1.0,
            slow: 1.0,
            cost: 1.0,
            split: 0,
            chain: 0,
            waves: 0,
            explode: 0,
            boss: 1.0,
            regen: 0.0,
        }
    }
}

struct Player {
    x: f32,
    y: f32,
    hp: f32,
    max: f32,
    r: f32,
    speed: f32,
    aim: f32,
    swing: f32,
    inv: f32,
    dash: f32,
    dash_ang: f32,
    hit_flash: f32,
}

struct Enemy {
    x: f32,
    y: f32,
    hp: f32,
    max: f32,
    speed: f32,
    r: f32,
    kind: u8,
    elite: bool,
    flash: f32,
    slow_t: f32,
    slow_amt: f32,
    burn_t: f32,
    burn_dps: f32,
    atk_cd: f32,
    aim: f32,
    wob: f32,
    kx: f32,
    ky: f32,
    fire_cd: f32,
    charge_t: f32,
    charge_cd: f32,
    volley: f32,
    dmg: f32,
}

struct Projectile {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    r: f32,
    elem: u8,
    life: f32,
    hostile: bool,
    dmg: f32,
    pierce: u32,
}

struct Slash {
    x: f32,
    y: f32,
    ang: f32,
    range: f32,
    t: f32,
    life: f32,
    elem: u8,
    kind: u8, // 0 호, 1 원
}

struct Popup {
    x: f32,
    y: f32,
    val: f32,
    t: f32,
    life: f32,
    crit: bool,
    kind: u8, // 0 데미지, 1 회복, 2 텍스트
}

struct Burst {
    x: f32,
    y: f32,
    r: f32,
    t: f32,
    life: f32,
    elem: u8,
    kind: u8,
}

struct Orb {
    x: f32,
    y: f32,
    t: f32,
    val: f32,
    kind: u8, // 0 금화, 1 파편
}

struct Beam {
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
    t: f32,
    life: f32,
    elem: u8,
    w: f32,
}

struct Card {
    id: u16,
    name: String,
    desc: String,
    tag: String,
    rarity: u8,
}

struct Meta {
    atk: f32,
    hp: f32,
    spd: f32,
    gold: f32,
}

struct Game {
    rng: Rng,
    w: f32,
    h: f32,
    phase: u32,
    started: bool,

    p: Player,
    st: Stats,
    wl: u32,
    elem: u8,
    tier: u8,

    enemies: Vec<Enemy>,
    projs: Vec<Projectile>,
    slashes: Vec<Slash>,
    pops: Vec<Popup>,
    bursts: Vec<Burst>,
    orbs: Vec<Orb>,
    beams: Vec<Beam>,

    gold: f32,
    shards: f32,
    kills: u32,
    time: f32,

    wave: u32,
    spawn_left: u32,
    spawn_t: f32,
    wave_total: u32,
    boss_idx: i64,
    wave_healed: f32,

    atk_t: f32,
    spec_cd: f32,
    spec_max: f32,
    shake: f32,
    msg: String,
    msg_t: f32,
    cards: Vec<Card>,
    mode: u32, // 0 유물, 1 진화

    meta: Meta,
    out: Vec<f32>,
    wname: String,
}

impl Game {
    fn new() -> Game {
        let mut g = Game {
            rng: Rng::new(0x9e3779b9),
            w: 390.0,
            h: 620.0,
            phase: P_PLAY,
            started: false,
            p: Player {
                x: 195.0,
                y: 320.0,
                hp: 100.0,
                max: 100.0,
                r: 13.0,
                speed: 138.0,
                aim: -PI * 0.5,
                swing: 0.0,
                inv: 0.0,
                dash: 0.0,
                dash_ang: 0.0,
                hit_flash: 0.0,
            },
            st: Stats::new(),
            wl: 0,
            elem: 0,
            tier: 0,
            enemies: Vec::new(),
            projs: Vec::new(),
            slashes: Vec::new(),
            pops: Vec::new(),
            bursts: Vec::new(),
            orbs: Vec::new(),
            beams: Vec::new(),
            gold: 0.0,
            shards: 0.0,
            kills: 0,
            time: 0.0,
            wave: 1,
            spawn_left: 0,
            spawn_t: 0.0,
            wave_total: 0,
            boss_idx: -1,
            wave_healed: 0.0,
            atk_t: 0.0,
            spec_cd: 0.0,
            spec_max: 7.0,
            shake: 0.0,
            msg: String::new(),
            msg_t: 0.0,
            cards: Vec::new(),
            mode: 0,
            meta: Meta {
                atk: 0.0,
                hp: 0.0,
                spd: 0.0,
                gold: 0.0,
            },
            out: Vec::new(),
            wname: String::new(),
        };
        g.wname = g.blade_name();
        g
    }

    // ---------- 룬검 ----------
    fn blade_name(&self) -> String {
        let s: &str = match (self.elem, self.tier) {
            (0, _) => {
                if self.wl >= 3 {
                    "벼려낸 강철검"
                } else {
                    "녹슨 단검"
                }
            }
            (1, 0) => "화염의 마검",
            (1, 1) => "불꽃 군주의 대검",
            (1, _) => "태양을 삼킨 검",
            (2, 0) => "뇌전의 쌍검",
            (2, 1) => "폭풍의 쌍검",
            (2, _) => "천둥의 군주검",
            (3, 0) => "빙결의 창",
            (3, 1) => "서리 왕관의 창",
            (3, _) => "영겁의 빙검",
            (4, 0) => "핏빛 낫",
            (4, 1) => "학살자의 낫",
            (4, _) => "심연의 수확자",
            (5, 0) => "심연의 신검",
            (5, 1) => "심연을 벤 검",
            (5, _) => "종말의 검",
            _ => "녹슨 단검",
        };
        s.to_string()
    }

    fn elem_mult(&self) -> f32 {
        match self.elem {
            1 => 1.15,
            2 => 1.20,
            3 => 1.08,
            4 => 1.25,
            5 => 1.45,
            _ => 1.0,
        }
    }

    fn blade_dmg(&self) -> f32 {
        let lvl = 1.0 + 0.21 * self.wl as f32;
        let tier = 1.0 + 0.32 * self.tier as f32;
        7.0 * lvl * tier * self.st.dmg * self.elem_mult()
    }

    fn blade_range(&self) -> f32 {
        let base = 78.0 + 2.6 * self.wl as f32;
        let cap = self.w.min(self.h) * 0.46;
        (base * self.st.range).min(cap).max(48.0)
    }

    fn atk_interval(&self) -> f32 {
        let t = (0.56 / (1.0 + 0.055 * self.wl as f32)) / self.st.aspd;
        t.max(0.13)
    }

    fn enhance_cost(&self) -> f32 {
        let l = self.wl as f32;
        ((12.0 + 7.0 * l + 2.4 * l * l) * self.st.cost).floor()
    }

    // ---------- 시작 ----------
    fn start(&mut self, seed: u32) {
        let atk = self.meta.atk;
        let hp = self.meta.hp;
        let spd = self.meta.spd;
        let goldb = self.meta.gold;
        self.rng = Rng::new(seed);
        self.st = Stats::new();
        self.st.dmg = 1.0 + atk;
        self.st.speed = 1.0 + spd;
        self.st.gold = 1.0 + goldb;
        self.wl = 0;
        self.elem = 0;
        self.tier = 0;
        self.enemies.clear();
        self.projs.clear();
        self.slashes.clear();
        self.pops.clear();
        self.bursts.clear();
        self.orbs.clear();
        self.beams.clear();
        self.cards.clear();
        self.gold = 0.0;
        self.shards = 0.0;
        self.kills = 0;
        self.time = 0.0;
        self.wave = 1;
        self.spawn_left = 0;
        self.spawn_t = 0.0;
        self.boss_idx = -1;
        self.atk_t = 0.0;
        self.spec_cd = 0.0;
        self.spec_max = 7.0;
        self.shake = 0.0;
        self.phase = P_PLAY;
        self.mode = 0;
        self.wave_healed = 0.0;
        self.p.max = 110.0 + hp;
        self.p.hp = self.p.max;
        self.p.x = self.w * 0.5;
        self.p.y = self.h * 0.62;
        self.p.aim = -PI * 0.5;
        self.p.inv = 1.0;
        self.p.dash = 0.0;
        self.p.swing = 0.0;
        self.p.hit_flash = 0.0;
        self.started = true;
        self.wname = self.blade_name();
        self.say("심연 1층", 1.6);
        self.begin_wave();
    }

    fn say(&mut self, s: &str, t: f32) {
        self.msg.clear();
        self.msg.push_str(s);
        self.msg_t = t;
    }

    // ---------- 웨이브 ----------
    fn begin_wave(&mut self) {
        let boss = self.wave % 5 == 0;
        self.wave_total = if boss { 4 + self.wave } else { 5 + self.wave * 2 };
        self.spawn_left = self.wave_total;
        self.spawn_t = 0.25;
        self.boss_idx = -1;
        if boss {
            self.say(&format!("심연 {}층 · 수문장", self.wave), 1.8);
        } else if self.wave > 1 {
            self.say(&format!("심연 {}층", self.wave), 1.2);
        }
    }

    fn spawn_one(&mut self, kind: u8) {
        let w = self.w;
        let h = self.h;
        let m = 30.0;
        let side = self.rng.i(4);
        let (mut x, mut y) = match side {
            0 => (self.rng.r(m, w - m), -m),
            1 => (w + m, self.rng.r(m, h - m)),
            2 => (self.rng.r(m, w - m), h + m),
            _ => (-m, self.rng.r(m, h - m)),
        };
        if w < 10.0 || h < 10.0 {
            x = 0.0;
            y = 0.0;
        }
        let wf = self.wave as f32;
        let hps = 1.0 + 0.30 * (wf - 1.0);
        let spd = 1.0 + 0.012 * (wf - 1.0);
        let dm = 1.0 + 0.075 * (wf - 1.0);
        let (hp, speed, r, dmg, k) = match kind {
            1 => (8.0, 74.0, 9.0, 4.2, 1),
            2 => (34.0, 27.0, 18.0, 9.5, 2),
            3 => (15.0, 34.0, 12.0, 5.0, 3),
            4 => (205.0, 36.0, 31.0, 13.0, 4),
            _ => (13.0, 42.0, 12.0, 5.0, 0),
        };
        let elite = kind != 4 && self.rng.f() < (0.05 + 0.012 * wf).min(0.22);
        let mut e = Enemy {
            x,
            y,
            hp: hp * hps,
            max: hp * hps,
            speed: speed * spd.min(1.55),
            r,
            kind: k,
            elite,
            flash: 0.0,
            slow_t: 0.0,
            slow_amt: 0.0,
            burn_t: 0.0,
            burn_dps: 0.0,
            atk_cd: 0.0,
            aim: 0.0,
            wob: self.rng.r(0.0, TAU),
            kx: 0.0,
            ky: 0.0,
            fire_cd: self.rng.r(0.8, 2.2),
            charge_t: 0.0,
            charge_cd: 2.0,
            volley: 1.6,
            dmg: dmg * dm,
        };
        if elite {
            e.hp *= 2.2;
            e.max = e.hp;
            e.r *= 1.22;
            e.speed *= 0.92;
            e.dmg *= 1.35;
        }
        if kind == 4 {
            e.hp *= 1.0 + 0.10 * (wf / 5.0).floor();
            e.max = e.hp;
        }
        if self.enemies.is_empty() && kind == 4 {
            self.boss_idx = 0;
        } else if kind == 4 {
            self.boss_idx = self.enemies.len() as i64;
        }
        self.enemies.push(e);
        if kind == 4 {
            self.shake = 12.0;
            self.burst(x.min(w - 40.0).max(40.0), y.min(h - 40.0).max(40.0), 90.0, 5, 0.6);
        }
    }

    fn update_wave(&mut self, dt: f32) {
        if self.spawn_left > 0 {
            self.spawn_t -= dt;
            if self.spawn_t <= 0.0 {
                let wf = self.wave;
                let cap = 15usize;
                if self.enemies.len() < cap {
                    let roll = self.rng.i(100);
                    let kind = if self.spawn_left == self.wave_total && wf % 5 == 0 {
                        4
                    } else if wf >= 4 && roll < 12 {
                        2
                    } else if wf >= 2 && roll < 40 {
                        1
                    } else if wf >= 3 && roll < 58 {
                        3
                    } else {
                        0
                    };
                    self.spawn_one(kind);
                    self.spawn_left -= 1;
                }
                self.spawn_t = (0.78 - 0.018 * wf as f32).max(0.24);
            }
        } else if self.enemies.is_empty() && self.phase == P_PLAY {
            // 웨이브 클리어
            let bonus = 8.0 + self.wave as f32 * 5.0;
            self.gold += bonus;
            self.popup(self.p.x, self.p.y - 26.0, bonus, false, 1);
            self.wave += 1;
            if self.st.regen > 0.0 {
                let heal = self.st.regen.min(self.p.max - self.p.hp);
                if heal > 0.0 {
                    self.p.hp += heal;
                    self.popup(self.p.x, self.p.y - 44.0, heal, false, 1);
                }
            }
            self.open_cards(0);
            self.begin_wave();
            self.phase = P_CARDS;
        }
    }

    // ---------- 카드 ----------
    fn open_cards(&mut self, mode: u32) {
        self.mode = mode;
        self.cards.clear();
        if mode == 1 {
            // 진화 분기: 5개 중 3개
            let mut pool: Vec<u8> = vec![1, 2, 3, 4, 5];
            let mut picked: Vec<u8> = Vec::new();
            for _ in 0..3 {
                if pool.is_empty() {
                    break;
                }
                let i = self.rng.i(pool.len() as u32) as usize;
                picked.push(pool.remove(i));
            }
            for e in picked {
                let (name, desc) = elem_card(e, self.tier);
                self.cards.push(Card {
                    id: 100 + e as u16,
                    name: name.to_string(),
                    desc: desc.to_string(),
                    tag: "진화".to_string(),
                    rarity: 2,
                });
            }
        } else {
            let mut ids: Vec<u16> = Vec::new();
            for id in 1u16..=20 {
                if self.card_ok(id) {
                    ids.push(id);
                }
            }
            let mut picked: Vec<u16> = Vec::new();
            for _ in 0..3 {
                if ids.is_empty() {
                    break;
                }
                // 가중치 추첨
                let mut total = 0.0;
                for &id in ids.iter() {
                    total += weight_of(id);
                }
                let mut r = self.rng.f() * total;
                let mut sel = ids[0];
                for &id in ids.iter() {
                    r -= weight_of(id);
                    if r <= 0.0 {
                        sel = id;
                        break;
                    }
                }
                picked.push(sel);
                if let Some(pos) = ids.iter().position(|&x| x == sel) {
                    ids.remove(pos);
                }
            }
            for id in picked {
                let (n, d) = card_text(id);
                self.cards.push(Card {
                    id,
                    name: n.to_string(),
                    desc: d.to_string(),
                    tag: card_tag(id).to_string(),
                    rarity: card_rarity(id),
                });
            }
        }
    }

    fn card_ok(&self, id: u16) -> bool {
        match id {
            6 => self.st.split < 4,
            8 => self.st.chain < 6,
            15 => self.st.waves < 3,
            7 => self.st.explode < 3,
            16 => self.st.cost > 0.45,
            17 => self.spec_max > 3.4,
            _ => true,
        }
    }

    fn take_card(&mut self, i: usize) {
        if i >= self.cards.len() {
            return;
        }
        let id = self.cards[i].id;
        if id >= 100 {
            // 진화
            self.elem = (id - 100) as u8;
            self.tier = 0;
            match self.elem {
                1 => self.st.burn += 0.25,
                2 => self.st.chain += 1,
                3 => self.st.slow += 0.25,
                4 => self.st.lifesteal += 0.05,
                5 => {
                    self.st.burn += 0.20;
                    self.st.slow += 0.15;
                }
                _ => {}
            }
            self.phase = P_PLAY;
            self.cards.clear();
            self.mode = 0;
            self.shake = 16.0;
            self.burst(self.p.x, self.p.y, 140.0, self.elem, 0.9);
            self.wname = self.blade_name();
            let n = self.wname.clone();
            self.say(&format!("각성 · {}", n), 1.9);
            self.p.inv = 1.2;
            self.p.hp = (self.p.hp + self.p.max * 0.25).min(self.p.max);
            return;
        }
        self.apply(id);
        self.cards.clear();
        if self.phase == P_CARDS {
            self.phase = P_PLAY;
        }
    }

    fn apply(&mut self, id: u16) {
        match id {
            1 => self.st.dmg += 0.22,
            2 => self.st.aspd += 0.18,
            3 => self.st.range += 0.14,
            4 => self.st.crit = (self.st.crit + 0.09).min(0.75),
            5 => self.st.critmult += 0.45,
            6 => self.st.split += 1,
            7 => self.st.explode += 1,
            8 => self.st.chain += 1,
            9 => self.st.lifesteal += 0.03,
            10 => self.st.speed += 0.10,
            11 => {
                self.p.max += 30.0;
                self.p.hp = (self.p.hp + 30.0).min(self.p.max);
            }
            12 => self.st.gold += 0.30,
            13 => self.st.burn += 0.50,
            14 => self.st.slow += 0.20,
            15 => self.st.waves += 1,
            16 => self.st.cost *= 0.75,
            17 => self.spec_max = (self.spec_max * 0.80).max(3.4),
            18 => self.st.regen += 9.0,
            19 => self.st.boss += 0.25,
            20 => {
                self.st.range += 0.10;
                self.st.critmult += 0.25;
            }
            _ => {}
        }
    }

    // ---------- 입력 ----------
    fn enhance(&mut self) {
        if self.phase != P_PLAY || !self.started {
            return;
        }
        let cost = self.enhance_cost();
        if self.gold < cost {
            self.popup(self.p.x, self.p.y - 30.0, 0.0, false, 3);
            return;
        }
        self.gold -= cost;
        self.wl += 1;
        self.p.swing = 0.28;
        self.shake = 5.0;
        self.burst(self.p.x, self.p.y, 46.0 + self.wl as f32, self.elem, 0.42);
        self.slashes.push(Slash {
            x: self.p.x,
            y: self.p.y,
            ang: self.p.aim,
            range: self.blade_range() * 0.8,
            t: 0.0,
            life: 0.22,
            elem: self.elem,
            kind: 1,
        });
        self.wname = self.blade_name();
        if self.wl == 5 && self.elem == 0 {
            self.open_cards(1);
            self.phase = P_EVOLVE;
            self.say("룬이 갈라진다 · 검을 고르시오", 2.4);
        } else if self.wl == 10 || self.wl == 15 {
            if self.tier < 2 {
                self.tier += 1;
                self.wname = self.blade_name();
                self.shake = 14.0;
                self.say(&format!("초월 · {}", self.wname.clone()), 1.8);
                self.open_cards(0);
                self.phase = P_CARDS;
            }
        }
    }

    fn special(&mut self) {
        if self.phase != P_PLAY || !self.started || self.spec_cd > 0.0 {
            return;
        }
        self.spec_cd = self.spec_max;
        self.p.dash = 0.19;
        self.p.dash_ang = self.p.aim;
        self.p.inv = 0.55;
        self.p.swing = 0.3;
        self.shake = 15.0;
        let ang = self.p.aim;
        let rng = self.blade_range() * 1.4;
        self.slashes.push(Slash {
            x: self.p.x,
            y: self.p.y,
            ang,
            range: rng,
            t: 0.0,
            life: 0.36,
            elem: self.elem,
            kind: 1,
        });
        self.burst(self.p.x, self.p.y, rng, self.elem, 0.5);
        let dm = self.blade_dmg() * 1.9;
        let px = self.p.x;
        let py = self.p.y;
        let mut cand: Vec<usize> = Vec::new();
        for (i, e) in self.enemies.iter().enumerate() {
            let dx = e.x - px;
            let dy = e.y - py;
            let d = (dx * dx + dy * dy).sqrt();
            if d < rng + e.r {
                cand.push(i);
            }
        }
        let mut hit_any = false;
        for i in cand {
            let (dmg, crit) = self.roll(dm);
            let (ex, ey, er) = {
                let e = &mut self.enemies[i];
                e.hp -= dmg;
                e.flash = 1.0;
                let dx = e.x - px;
                let dy = e.y - py;
                let d = (dx * dx + dy * dy).sqrt().max(0.001);
                e.kx += dx / d * 260.0;
                e.ky += dy / d * 260.0;
                (e.x, e.y, e.r)
            };
            self.popup(ex, ey - er - 6.0, dmg, crit, 0);
            hit_any = true;
        }
        if hit_any {
            self.shake = 18.0;
        }
    }

    fn roll(&mut self, base: f32) -> (f32, bool) {
        let crit = self.rng.f() < self.st.crit;
        let d = if crit { base * self.st.critmult } else { base };
        (d * self.rng.r(0.94, 1.06), crit)
    }

    fn popup(&mut self, x: f32, y: f32, val: f32, crit: bool, kind: u8) {
        if self.pops.len() > 90 {
            self.pops.remove(0);
        }
        self.pops.push(Popup {
            x,
            y,
            val,
            t: 0.0,
            life: if crit { 0.95 } else { 0.7 },
            crit,
            kind,
        });
    }

    fn burst(&mut self, x: f32, y: f32, r: f32, elem: u8, life: f32) {
        if self.bursts.len() > 60 {
            self.bursts.remove(0);
        }
        self.bursts.push(Burst {
            x,
            y,
            r,
            t: 0.0,
            life,
            elem,
            kind: 0,
        });
    }

    fn aim_at_enemy(&self) -> (f32, f32, f32) {
        let mut best = f32::MAX;
        let mut bx = 0.0;
        let mut by = 0.0;
        for e in self.enemies.iter() {
            let dx = e.x - self.p.x;
            let dy = e.y - self.p.y;
            let d = dx * dx + dy * dy;
            if d < best {
                best = d;
                bx = dx;
                by = dy;
            }
        }
        if best == f32::MAX {
            (self.p.aim.cos(), self.p.aim.sin(), 9999.0)
        } else {
            (bx, by, best.sqrt())
        }
    }

    fn swing(&mut self) {
        let (dx, dy, dist) = self.aim_at_enemy();
        if dist > 9990.0 {
            return;
        }
        let ang = dy.atan2(dx);
        self.p.aim = ang;
        self.p.swing = 0.26;
        let rng = self.blade_range();
        let base = self.blade_dmg() * 0.62;
        let total = self.st.split + 1;
        let mut pend: Vec<(usize, f32, bool)> = Vec::new();
        for k in 0..total {
            let off = if k == 0 {
                0.0
            } else {
                let step = ((k + 1) / 2) as f32;
                let sgn = if k % 2 == 1 { 1.0 } else { -1.0 };
                sgn * 0.46 * step
            };
            let a = ang + off;
            let px = self.p.x;
            let py = self.p.y;
            self.slashes.push(Slash {
                x: px,
                y: py,
                ang: a,
                range: rng,
                t: 0.0,
                life: 0.26,
                elem: self.elem,
                kind: 0,
            });
            let mut cand: Vec<usize> = Vec::new();
            for (i, e) in self.enemies.iter().enumerate() {
                let ddx = e.x - px;
                let ddy = e.y - py;
                let d = (ddx * ddx + ddy * ddy).sqrt();
                if d > rng + e.r {
                    continue;
                }
                let mut diff = (ddy.atan2(ddx) - a).rem_euclid(TAU);
                if diff > PI {
                    diff = TAU - diff;
                }
                if diff > 0.62 && d > e.r + 8.0 {
                    continue;
                }
                cand.push(i);
            }
            for i in cand {
                let (dmg, crit) = self.roll(base);
                let (ex, ey, er) = {
                    let e = &mut self.enemies[i];
                    e.hp -= dmg;
                    e.flash = 1.0;
                    (e.x, e.y, e.r)
                };
                let jx = self.rng.r(-6.0, 6.0);
                self.popup(ex + jx, ey - er - 4.0, dmg, crit, 0);
                if crit {
                    self.shake = self.shake.max(4.0);
                }
                pend.push((i, dmg, crit));
            }
        }
        self.apply_element(ang, rng, base, &pend);
        if self.st.waves > 0 {
            for k in 0..self.st.waves {
                let a = ang + (k as f32 - (self.st.waves as f32 - 1.0) * 0.5) * 0.22;
                self.projs.push(Projectile {
                    x: self.p.x + a.cos() * 18.0,
                    y: self.p.y + a.sin() * 18.0,
                    vx: a.cos() * 430.0,
                    vy: a.sin() * 430.0,
                    r: 13.0,
                    elem: self.elem,
                    life: 0.55,
                    hostile: false,
                    dmg: base * 0.85,
                    pierce: 3,
                });
            }
        }
        // 흡혈
        if self.st.lifesteal > 0.0 {
            let mut heal = 0.0;
            for &(_, d, _) in pend.iter() {
                heal += d * self.st.lifesteal;
            }
            if heal > 0.5 {
                let heal = heal.min(self.p.max - self.p.hp);
                if heal > 0.5 {
                    self.p.hp += heal;
                    self.popup(self.p.x, self.p.y - 30.0, heal, false, 1);
                }
            }
        }
    }

    fn apply_element(&mut self, ang: f32, rng: f32, base: f32, pend: &[(usize, f32, bool)]) {
        let tierf = 1.0 + 0.5 * self.tier as f32;
        let elem = self.elem;
        if pend.is_empty() {
            return;
        }
        match elem {
            1 => {
                // 화염 도트
                for &(i, d, _) in pend.iter() {
                    let e = &mut self.enemies[i];
                    e.burn_t = 3.2;
                    e.burn_dps = (d * 0.30 * self.st.burn * tierf).max(1.0);
                }
                let (tx, ty) = (self.enemies[pend[0].0].x, self.enemies[pend[0].0].y);
                self.burst(tx, ty, 34.0 + 10.0 * tierf, 1, 0.34);
            }
            2 => {
                let n = 1 + self.st.chain + self.tier as u32;
                let mut from = (self.enemies[pend[0].0].x, self.enemies[pend[0].0].y);
                let mut used: Vec<usize> = pend.iter().map(|x| x.0).collect();
                for _ in 0..n {
                    let mut best = f32::MAX;
                    let mut bi: i64 = -1;
                    for (i, e) in self.enemies.iter().enumerate() {
                        if used.contains(&i) {
                            continue;
                        }
                        let dx = e.x - from.0;
                        let dy = e.y - from.1;
                        let d = dx * dx + dy * dy;
                        if d < best && d < 150.0 * 150.0 {
                            best = d;
                            bi = i as i64;
                        }
                    }
                    if bi < 0 {
                        break;
                    }
                    let i = bi as usize;
                    let dmg = base * 0.62 * tierf;
                    let (ex, ey) = (self.enemies[i].x, self.enemies[i].y);
                    self.beams.push(Beam {
                        x1: from.0,
                        y1: from.1,
                        x2: ex,
                        y2: ey,
                        t: 0.0,
                        life: 0.26,
                        elem: 2,
                        w: 2.0 + tierf,
                    });
                    let (dmg, crit) = self.roll(dmg);
                    self.enemies[i].hp -= dmg;
                    self.enemies[i].flash = 0.8;
                    self.popup(ex, ey - 10.0, dmg, crit, 0);
                    used.push(i);
                    from = (ex, ey);
                }
            }
            3 => {
                for &(i, _, _) in pend.iter() {
                    let e = &mut self.enemies[i];
                    e.slow_t = 2.6;
                    e.slow_amt = (0.38 + 0.08 * self.tier as f32) * self.st.slow;
                }
                let (tx, ty) = (self.enemies[pend[0].0].x, self.enemies[pend[0].0].y);
                self.burst(tx, ty, 30.0 + 8.0 * tierf, 3, 0.3);
            }
            5 => {
                for &(i, d, _) in pend.iter() {
                    let e = &mut self.enemies[i];
                    e.burn_t = 2.4;
                    e.burn_dps = (d * 0.18 * self.st.burn * tierf).max(1.0);
                    e.slow_t = 1.4;
                    e.slow_amt = 0.28;
                }
                let (tx, ty) = (self.enemies[pend[0].0].x, self.enemies[pend[0].0].y);
                self.burst(tx, ty, 46.0 + 14.0 * tierf, 5, 0.4);
                if self.st.waves == 0 {
                    self.projs.push(Projectile {
                        x: self.p.x + ang.cos() * 20.0,
                        y: self.p.y + ang.sin() * 20.0,
                        vx: ang.cos() * 400.0,
                        vy: ang.sin() * 400.0,
                        r: 16.0,
                        elem: 5,
                        life: 0.5,
                        hostile: false,
                        dmg: base * 0.7,
                        pierce: 2,
                    });
                }
                let _ = rng;
            }
            _ => {}
        }
    }

    // ---------- 업데이트 ----------
    fn update(&mut self, dt: f32, mx: f32, my: f32) {
        if !self.started {
            return;
        }
        let mut mlen = (mx * mx + my * my).sqrt();
        if mlen > 1.0 {
            mlen = 1.0;
        }
        let (mut nx, mut ny) = (0.0, 0.0);
        if mlen > 0.06 {
            nx = mx / mlen.max(0.0001);
            ny = my / mlen.max(0.0001);
            let l = (nx * nx + ny * ny).sqrt();
            if l > 1.0 {
                nx /= l;
                ny /= l;
            }
        }
        self.msg_t = (self.msg_t - dt).max(0.0);
        self.shake = (self.shake - dt * 42.0).max(0.0);
        self.p.hit_flash = (self.p.hit_flash - dt * 3.0).max(0.0);

        if self.phase != P_PLAY {
            // 카드 선택/사망 중에는 시간이 멈춘다 (이펙트만 천천히 흐른다)
            self.step_fx(dt * 0.35);
            return;
        }
        self.time += dt;

        // 플레이어 이동
        let spd = self.p.speed * self.st.speed * if self.p.dash > 0.0 { 4.6 } else { 1.0 };
        if mlen > 0.06 {
            self.p.aim = if self.enemies.is_empty() {
                ny.atan2(nx)
            } else {
                self.p.aim
            };
        }
        if self.p.dash > 0.0 {
            self.p.dash -= dt;
            self.p.x += self.p.dash_ang.cos() * spd * dt;
            self.p.y += self.p.dash_ang.sin() * spd * dt;
        } else {
            self.p.x += nx * spd * dt;
            self.p.y += ny * spd * dt;
        }
        self.p.x = clamp(self.p.x, self.p.r + 4.0, self.w - self.p.r - 4.0);
        self.p.y = clamp(self.p.y, self.p.r + 4.0, self.h - self.p.r - 4.0);
        self.p.inv = (self.p.inv - dt).max(0.0);
        self.p.swing = (self.p.swing - dt).max(0.0);

        // 공격
        self.atk_t -= dt;
        let (_, _, dist) = self.aim_at_enemy();
        if self.atk_t <= 0.0 && dist <= self.blade_range() + 26.0 {
            let (dx, dy, _) = self.aim_at_enemy();
            if dist < 9990.0 {
                self.p.aim = dy.atan2(dx);
                self.swing();
            }
            self.atk_t = self.atk_interval();
            if self.enemies.is_empty() {
                self.atk_t = 0.0;
            }
        }
        self.spec_cd = (self.spec_cd - dt).max(0.0);

        self.update_enemies(dt);
        self.update_projectiles(dt);
        self.update_orbs(dt);
        self.step_fx(dt);
        self.reap();
        self.update_wave(dt);
        self.wave_healed = 0.0;
    }

    fn step_fx(&mut self, dt: f32) {
        for s in self.slashes.iter_mut() {
            s.t += dt;
        }
        self.slashes.retain(|s| s.t < s.life);
        for b in self.bursts.iter_mut() {
            b.t += dt;
        }
        self.bursts.retain(|b| b.t < b.life);
        for p in self.pops.iter_mut() {
            p.t += dt;
        }
        self.pops.retain(|p| p.t < p.life);
        for b in self.beams.iter_mut() {
            b.t += dt;
        }
        self.beams.retain(|b| b.t < b.life);
        for o in self.orbs.iter_mut() {
            o.t += dt;
        }
    }

    fn update_enemies(&mut self, dt: f32) {
        let px = self.p.x;
        let py = self.p.y;
        for e in self.enemies.iter_mut() {
            e.flash = (e.flash - dt * 4.0).max(0.0);
            e.slow_t = (e.slow_t - dt).max(0.0);
            if e.burn_t > 0.0 {
                e.burn_t -= dt;
                e.hp -= e.burn_dps * dt;
            }
            let slow = if e.slow_t > 0.0 { 1.0 - e.slow_amt.min(0.7) } else { 1.0 };
            let dx = px - e.x;
            let dy = py - e.y;
            let d = (dx * dx + dy * dy).sqrt().max(0.001);
            let ux = dx / d;
            let uy = dy / d;
            e.aim = uy.atan2(ux);
            let mut sp = e.speed * slow;
            if e.kind == 3 {
                // 주술사: 거리 유지
                if d < 130.0 {
                    sp = -sp * 0.7;
                } else if d < 220.0 {
                    sp *= 0.15;
                }
                e.fire_cd -= dt;
                if e.fire_cd <= 0.0 && d < 340.0 {
                    e.fire_cd = 2.4;
                    self.projs.push(Projectile {
                        x: e.x,
                        y: e.y,
                        vx: ux * 165.0,
                        vy: uy * 165.0,
                        r: 7.0,
                        elem: 9,
                        life: 3.0,
                        hostile: true,
                        dmg: e.dmg * 0.75,
                        pierce: 0,
                    });
                }
            }
            if e.kind == 4 {
                e.volley -= dt;
                e.charge_cd -= dt;
                if e.charge_t > 0.0 {
                    e.charge_t -= dt;
                    sp = e.speed * 4.2 * slow;
                } else if e.charge_cd <= 0.0 && d < 300.0 {
                    e.charge_t = 0.55;
                    e.charge_cd = 5.5;
                }
                if e.volley <= 0.0 {
                    e.volley = 3.0;
                    let n = 8 + self.wave / 5;
                    for k in 0..n {
                        let a = e.aim + (k as f32) * TAU / n as f32 + e.wob;
                        self.projs.push(Projectile {
                            x: e.x + a.cos() * (e.r + 6.0),
                            y: e.y + a.sin() * (e.r + 6.0),
                            vx: a.cos() * 120.0,
                            vy: a.sin() * 120.0,
                            r: 8.0,
                            elem: 9,
                            life: 2.8,
                            hostile: true,
                            dmg: e.dmg * 0.42,
                            pierce: 0,
                        });
                    }
                    self.shake = self.shake.max(6.0);
                }
            }
            e.x += (ux * sp + e.kx) * dt;
            e.y += (uy * sp + e.ky) * dt;
            e.kx *= (1.0 - 7.0 * dt).max(0.0);
            e.ky *= (1.0 - 7.0 * dt).max(0.0);
            e.wob += dt * 2.0;
            // 접촉 피해
            e.atk_cd = (e.atk_cd - dt).max(0.0);
        }

        // 적끼리 밀어내기
        let n = self.enemies.len();
        for i in 0..n {
            for j in (i + 1)..n {
                let (x1, y1, r1) = (self.enemies[i].x, self.enemies[i].y, self.enemies[i].r);
                let (x2, y2, r2) = (self.enemies[j].x, self.enemies[j].y, self.enemies[j].r);
                let dx = x2 - x1;
                let dy = y2 - y1;
                let d2 = dx * dx + dy * dy;
                let min = (r1 + r2) * 0.92;
                if d2 < min * min && d2 > 0.001 {
                    let d = d2.sqrt();
                    let push = (min - d) * 0.5;
                    let ux = dx / d;
                    let uy = dy / d;
                    self.enemies[i].x -= ux * push;
                    self.enemies[i].y -= uy * push;
                    self.enemies[j].x += ux * push;
                    self.enemies[j].y += uy * push;
                }
            }
        }

        // 플레이어 접촉
        if self.p.inv <= 0.0 {
            let mut touch: Option<(usize, f32)> = None;
            for (i, e) in self.enemies.iter().enumerate() {
                let dx = e.x - self.p.x;
                let dy = e.y - self.p.y;
                let d = (dx * dx + dy * dy).sqrt();
                if d < e.r + self.p.r && e.atk_cd <= 0.0 {
                    touch = Some((i, e.dmg));
                    break;
                }
            }
            if let Some((i, dmg)) = touch {
                if i < self.enemies.len() {
                    let (dx, dy, d) = {
                        let e = &mut self.enemies[i];
                        e.atk_cd = 0.85;
                        let dx = e.x - self.p.x;
                        let dy = e.y - self.p.y;
                        let d = (dx * dx + dy * dy).sqrt().max(0.001);
                        e.kx -= dx / d * 90.0;
                        e.ky -= dy / d * 90.0;
                        (dx, dy, d)
                    };
                    let _ = (dx, dy, d);
                }
                self.hurt(dmg);
            }
        }
    }

    fn hurt(&mut self, dmg: f32) {
        if self.p.inv > 0.0 {
            return;
        }
        self.p.hp -= dmg;
        self.p.inv = 0.62;
        self.p.hit_flash = 1.0;
        self.shake = 10.0;
        self.popup(self.p.x, self.p.y - 26.0, dmg, false, 2);
        if self.p.hp <= 0.0 {
            self.p.hp = 0.0;
            self.die();
        }
    }

    fn die(&mut self) {
        self.phase = P_DEAD;
        let gain = (4.0 + self.wave as f32 * 3.0 + self.kills as f32 * 0.16).floor();
        self.shards = gain;
        self.shake = 22.0;
        self.burst(self.p.x, self.p.y, 180.0, self.elem, 1.2);
        self.say("심연이 너를 삼켰다", 3.0);
    }

    fn update_projectiles(&mut self, dt: f32) {
        let px = self.p.x;
        let py = self.p.y;
        let pr = self.p.r;
        let n = self.projs.len();
        let mut dead: Vec<usize> = Vec::new();
        let mut pops: Vec<(f32, f32, f32)> = Vec::new();
        let mut incoming: f32 = 0.0;
        for i in 0..n {
            let mut p = Projectile {
                x: self.projs[i].x,
                y: self.projs[i].y,
                vx: self.projs[i].vx,
                vy: self.projs[i].vy,
                r: self.projs[i].r,
                elem: self.projs[i].elem,
                life: self.projs[i].life,
                hostile: self.projs[i].hostile,
                dmg: self.projs[i].dmg,
                pierce: self.projs[i].pierce,
            };
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if p.life <= 0.0 {
                dead.push(i);
                continue;
            }
            if p.hostile {
                let dx = p.x - px;
                let dy = p.y - py;
                if (dx * dx + dy * dy).sqrt() < p.r + pr {
                    incoming += p.dmg;
                    dead.push(i);
                }
            } else {
                for j in 0..self.enemies.len() {
                    let (ex, ey, er) = {
                        let e = &self.enemies[j];
                        (e.x, e.y, e.r)
                    };
                    let dx = ex - p.x;
                    let dy = ey - p.y;
                    if (dx * dx + dy * dy).sqrt() < er + p.r {
                        {
                            let e = &mut self.enemies[j];
                            e.hp -= p.dmg;
                            e.flash = 0.9;
                        }
                        pops.push((ex, ey - er - 4.0, p.dmg));
                        if p.pierce == 0 {
                            dead.push(i);
                        } else {
                            p.pierce -= 1;
                        }
                        break;
                    }
                }
            }
            self.projs[i] = p;
        }
        for (x, y, d) in pops {
            self.popup(x, y, d, false, 0);
            self.burst(x, y, 18.0, self.elem, 0.22);
        }
        dead.sort_unstable();
        dead.dedup();
        for i in dead.iter().rev() {
            if *i < self.projs.len() {
                self.projs.swap_remove(*i);
            }
        }
        if incoming > 0.0 {
            self.hurt(incoming);
        }
    }

    fn update_orbs(&mut self, dt: f32) {
        let px = self.p.x;
        let py = self.p.y;
        let pull = 150.0;
        let mut got: Vec<usize> = Vec::new();
        for (i, o) in self.orbs.iter_mut().enumerate() {
            let dx = px - o.x;
            let dy = py - o.y;
            let d = (dx * dx + dy * dy).sqrt().max(0.001);
            if d < pull {
                let sp = 200.0 + (pull - d) * 3.0;
                o.x += dx / d * sp * dt;
                o.y += dy / d * sp * dt;
            }
            if d < self.p.r + 10.0 {
                got.push(i);
            } else if o.t > 14.0 {
                got.push(i);
            }
        }
        for i in got.iter().rev() {
            if *i < self.orbs.len() {
                let o = self.orbs.swap_remove(*i);
                if o.kind == 0 {
                    self.gold += o.val;
                }
            }
        }
    }

    fn reap(&mut self) {
        let mut guard = 0;
        loop {
            guard += 1;
            if guard > 6 {
                break;
            }
            let mut idx: i64 = -1;
            for (i, e) in self.enemies.iter().enumerate() {
                if e.hp <= 0.0 {
                    idx = i as i64;
                    break;
                }
            }
            if idx < 0 {
                break;
            }
            let i = idx as usize;
            let e = self.enemies.swap_remove(i);
            self.kills += 1;
            let val = match e.kind {
                4 => 70.0,
                2 => 10.0,
                1 => 4.0,
                3 => 6.0,
                _ => 5.0,
            } * if e.elite { 2.2 } else { 1.0 }
                * self.st.gold;
            self.orbs.push(Orb {
                x: e.x,
                y: e.y,
                t: 0.0,
                val,
                kind: 0,
            });
            if e.kind == 4 {
                self.shake = 20.0;
                self.burst(e.x, e.y, 150.0, self.elem, 0.9);
                self.say("수문장 처치", 1.6);
                if self.boss_idx == i as i64 {
                    self.boss_idx = -1;
                }
            }
            if self.st.explode > 0 {
                let rad = 44.0 + 10.0 * self.st.explode as f32;
                let dm = self.blade_dmg() * (0.30 + 0.12 * self.st.explode as f32);
                self.burst(e.x, e.y, rad, self.elem, 0.34);
                for o in self.enemies.iter_mut() {
                    let dx = o.x - e.x;
                    let dy = o.y - e.y;
                    if (dx * dx + dy * dy).sqrt() < rad + o.r {
                        o.hp -= dm;
                        o.flash = 0.7;
                    }
                }
            }
        }
    }

    // ---------- 렌더 버퍼 ----------
    fn build_out(&mut self) {
        let mut out = std::mem::take(&mut self.out);
        out.clear();
        out.resize(HDR, 0.0);

        let n_enemy = self.enemies.len();
        let off_enemy = out.len();
        for e in self.enemies.iter() {
            let hp01 = if e.max > 0.0 { (e.hp / e.max).clamp(0.0, 1.0) } else { 0.0 };
            out.push(e.x);
            out.push(e.y);
            out.push(hp01);
            out.push(e.r);
            out.push(e.kind as f32);
            out.push(e.flash);
            out.push(if e.slow_t > 0.0 { 1.0 } else { 0.0 });
            out.push(if e.elite { 1.0 } else { 0.0 });
            out.push(e.aim);
        }

        let off_proj = out.len();
        for p in self.projs.iter() {
            out.push(p.x);
            out.push(p.y);
            out.push(p.r);
            out.push(p.elem as f32);
            out.push((p.life / 3.0).clamp(0.0, 1.0));
            out.push(if p.hostile { 1.0 } else { 0.0 });
            out.push(p.vx);
        }
        let n_proj = self.projs.len();

        let off_slash = out.len();
        for s in self.slashes.iter() {
            out.push(s.x);
            out.push(s.y);
            out.push(s.ang);
            out.push(s.range);
            out.push((s.t / s.life).clamp(0.0, 1.0));
            out.push(s.elem as f32);
            out.push(s.kind as f32);
        }
        let n_slash = self.slashes.len();

        let off_pop = out.len();
        for p in self.pops.iter() {
            out.push(p.x);
            out.push(p.y);
            out.push(p.val);
            out.push((p.t / p.life).clamp(0.0, 1.0));
            out.push(if p.crit { 1.0 } else { 0.0 });
            out.push(p.kind as f32);
        }
        let n_pop = self.pops.len();

        let off_burst = out.len();
        for b in self.bursts.iter() {
            out.push(b.x);
            out.push(b.y);
            out.push(b.r);
            out.push((b.t / b.life).clamp(0.0, 1.0));
            out.push(b.elem as f32);
            out.push(b.kind as f32);
        }
        let n_burst = self.bursts.len();

        let off_orb = out.len();
        for o in self.orbs.iter() {
            out.push(o.x);
            out.push(o.y);
            out.push((o.t / 3.0).clamp(0.0, 1.0));
            out.push(o.val);
            out.push(o.kind as f32);
        }
        let n_orb = self.orbs.len();

        let off_beam = out.len();
        for b in self.beams.iter() {
            out.push(b.x1);
            out.push(b.y1);
            out.push(b.x2);
            out.push(b.y2);
            out.push((b.t / b.life).clamp(0.0, 1.0));
            out.push(b.elem as f32);
            out.push(b.w);
        }
        let n_beam = self.beams.len();

        // header
        out[H_PX] = self.p.x;
        out[H_PY] = self.p.y;
        out[H_HP] = self.p.hp;
        out[H_MAXHP] = self.p.max;
        out[H_GOLD] = self.gold;
        out[H_SHARDS] = self.shards;
        out[H_WAVE] = self.wave as f32;
        let spawned = self.wave_total.saturating_sub(self.spawn_left) as f32;
        out[H_PROG] = if self.wave_total > 0 {
            (spawned / self.wave_total as f32).clamp(0.0, 1.0)
        } else {
            0.0
        };
        out[H_LEFT] = (self.spawn_left + self.enemies.len() as u32) as f32;
        out[H_WLV] = self.wl as f32;
        out[H_ELEM] = self.elem as f32;
        out[H_DMG] = self.blade_dmg();
        out[H_RANGE] = self.blade_range();
        out[H_INT] = self.atk_interval();
        out[H_CD] = self.spec_cd;
        out[H_CDMAX] = self.spec_max;
        out[H_COST] = self.enhance_cost();
        out[H_PHASE] = self.phase as f32;
        out[H_KILLS] = self.kills as f32;
        out[H_TIME] = self.time;
        out[H_GAIN] = self.shards;
        out[H_AIM] = self.p.aim;
        out[H_SWING] = self.p.swing / 0.26;
        out[H_SHAKE] = self.shake;
        let mut boss = -1.0;
        for e in self.enemies.iter() {
            if e.kind == 4 {
                boss = if e.max > 0.0 { (e.hp / e.max).clamp(0.0, 1.0) } else { 0.0 };
                break;
            }
        }
        out[H_BOSS] = boss;
        out[H_DASH] = self.p.dash;
        out[H_CRIT] = self.st.crit;
        out[H_MSGT] = self.msg_t;
        out[H_PR] = self.p.r;
        out[H_INV] = self.p.inv;
        out[H_RELIC] = (self.st.split + self.st.chain + self.st.waves + self.st.explode) as f32;
        out[H_TOT] = self.wave_total as f32;
        out[H_TIER] = self.tier as f32;
        out[H_LS] = self.st.lifesteal;
        out[H_CHAIN] = self.st.chain as f32;
        out[H_SPLIT] = self.st.split as f32;
        out[H_WAVEP] = self.st.waves as f32;
        out[H_HEAL] = self.p.hit_flash;
        out[H_DEPTHMAX] = self.wave as f32;

        let secs: [(usize, usize, usize); NSEC] = [
            (S_ENEMY, off_enemy, n_enemy),
            (S_PROJ, off_proj, n_proj),
            (S_SLASH, off_slash, n_slash),
            (S_POP, off_pop, n_pop),
            (S_BURST, off_burst, n_burst),
            (S_ORB, off_orb, n_orb),
            (S_BEAM, off_beam, n_beam),
        ];
        for (i, (s, off, n)) in secs.iter().enumerate() {
            out[H_SEC + i * 3] = *s as f32;
            out[H_SEC + i * 3 + 1] = *off as f32;
            out[H_SEC + i * 3 + 2] = *n as f32;
        }

        // 유지: 다음 프레임 재사용
        self.out = out;
        self.wname = self.blade_name();
    }
}

// ---------------- 카드 데이터 ----------------
fn weight_of(id: u16) -> f32 {
    match card_rarity(id) {
        0 => 100.0,
        1 => 52.0,
        _ => 20.0,
    }
}

fn card_rarity(id: u16) -> u8 {
    match id {
        6 | 7 | 8 | 15 | 19 => 2,
        20 => 1,
        5 | 9 | 13 | 14 | 17 | 18 => 1,
        _ => 0,
    }
}

fn card_tag(id: u16) -> &'static str {
    match card_rarity(id) {
        0 => "성물",
        1 => "상급 성물",
        _ => "금단의 성물",
    }
}

fn card_text(id: u16) -> (&'static str, &'static str) {
    match id {
        1 => ("분노의 숫돌", "검기 피해 +22%"),
        2 => ("질풍의 손목", "공격 속도 +18%"),
        3 => ("확장의 룬", "사거리 +14%"),
        4 => ("치명의 눈", "치명타 확률 +9%"),
        5 => ("단두대 각도", "치명타 피해 +45%"),
        6 => ("갈라진 검기", "검기가 좌우로 갈라진다 (+1갈래)"),
        7 => ("잔해 폭발", "처치 시 폭발, 주변에 피해"),
        8 => ("전류 코일", "연쇄 번개 +1"),
        9 => ("피의 계약", "가한 피해의 3% 흡혈"),
        10 => ("가벼운 발", "이동 속도 +10%"),
        11 => ("강철 심장", "최대 체력 +30, 즉시 회복"),
        12 => ("연금술", "금화 획득 +30%"),
        13 => ("기름 항아리", "화상 피해 +50%"),
        14 => ("서리 각인", "빙결 둔화 +20%"),
        15 => ("검기 파동", "검기가 투사체로 날아간다 (+1)"),
        16 => ("대장장이의 망치", "제련 비용 -25%"),
        17 => ("심연의 박동", "심연 참격 쿨타임 -20%"),
        18 => ("피의 성찬", "층을 넘을 때마다 체력 +9 회복"),
        19 => ("수문장 사냥", "수문장에게 주는 피해 +25%"),
        20 => ("성검의 눈", "사거리 +10%, 치명타 피해 +25%"),
        _ => ("?", "?"),
    }
}

fn elem_card(e: u8, tier: u8) -> (&'static str, &'static str) {
    match e {
        1 => (
            "화염의 마검",
            "타격마다 불이 옮겨붙어 지속 피해. 검기가 주황빛으로 타오른다.",
        ),
        2 => (
            "뇌전의 쌍검",
            "명중하면 번개가 튀어 주변 적을 연쇄로 태운다.",
        ),
        3 => (
            "빙결의 창",
            "맞은 적이 얼어붙어 느려진다. 푸른 파편이 흩어진다.",
        ),
        4 => (
            "핏빛 낫",
            "가한 피해의 일부를 체력으로 되돌린다. 검붉은 궤적.",
        ),
        5 => (
            "심연의 신검",
            "검기 파동을 내보낸다. 화상과 둔화가 함께 깔린다.",
        ),
        _ => {
            let _ = tier;
            ("녹슨 단검", "")
        }
    }
}

// ---------------- 전역 상태 ----------------
static mut GAME: *mut Game = core::ptr::null_mut();

fn game() -> &'static mut Game {
    unsafe {
        if GAME.is_null() {
            GAME = Box::into_raw(Box::new(Game::new()));
        }
        &mut *GAME
    }
}

fn sptr(s: &String) -> *const u8 {
    s.as_ptr()
}

// ---------------- exports ----------------
#[no_mangle]
pub extern "C" fn bf_version() -> u32 {
    1
}

#[no_mangle]
pub extern "C" fn bf_init(seed: u32, atk: f32, hp: f32, spd: f32, gold: f32) {
    let g = game();
    g.meta.atk = atk;
    g.meta.hp = hp;
    g.meta.spd = spd;
    g.meta.gold = gold;
    g.rng = Rng::new(seed);
    g.build_out();
}

#[no_mangle]
pub extern "C" fn bf_resize(w: f32, h: f32) {
    let g = game();
    g.w = w.max(120.0);
    g.h = h.max(120.0);
    if g.started {
        g.p.x = clamp(g.p.x, g.p.r + 4.0, g.w - g.p.r - 4.0);
        g.p.y = clamp(g.p.y, g.p.r + 4.0, g.h - g.p.r - 4.0);
    } else {
        g.p.x = g.w * 0.5;
        g.p.y = g.h * 0.62;
    }
    g.build_out();
}

#[no_mangle]
pub extern "C" fn bf_start(seed: u32) {
    let g = game();
    g.start(seed);
    g.build_out();
}

#[no_mangle]
pub extern "C" fn bf_tick(dt: f32, mx: f32, my: f32) {
    let g = game();
    let d = clamp(dt, 0.0, 0.05);
    g.update(d, mx, my);
    g.build_out();
}

#[no_mangle]
pub extern "C" fn bf_enhance() {
    let g = game();
    g.enhance();
    g.build_out();
}

#[no_mangle]
pub extern "C" fn bf_special() {
    let g = game();
    g.special();
    g.build_out();
}

#[no_mangle]
pub extern "C" fn bf_choose(i: u32) {
    let g = game();
    g.take_card(i as usize);
    g.build_out();
}

#[no_mangle]
pub extern "C" fn bf_out_ptr() -> *const f32 {
    game().out.as_ptr()
}

#[no_mangle]
pub extern "C" fn bf_out_len() -> u32 {
    game().out.len() as u32
}

#[no_mangle]
pub extern "C" fn bf_card_count() -> u32 {
    game().cards.len() as u32
}

#[no_mangle]
pub extern "C" fn bf_card_name_ptr(i: u32) -> *const u8 {
    let g = game();
    match g.cards.get(i as usize) {
        Some(c) => sptr(&c.name),
        None => core::ptr::null(),
    }
}

#[no_mangle]
pub extern "C" fn bf_card_name_len(i: u32) -> u32 {
    let g = game();
    match g.cards.get(i as usize) {
        Some(c) => c.name.len() as u32,
        None => 0,
    }
}

#[no_mangle]
pub extern "C" fn bf_card_desc_ptr(i: u32) -> *const u8 {
    let g = game();
    match g.cards.get(i as usize) {
        Some(c) => sptr(&c.desc),
        None => core::ptr::null(),
    }
}

#[no_mangle]
pub extern "C" fn bf_card_desc_len(i: u32) -> u32 {
    let g = game();
    match g.cards.get(i as usize) {
        Some(c) => c.desc.len() as u32,
        None => 0,
    }
}

#[no_mangle]
pub extern "C" fn bf_card_tag_ptr(i: u32) -> *const u8 {
    let g = game();
    match g.cards.get(i as usize) {
        Some(c) => sptr(&c.tag),
        None => core::ptr::null(),
    }
}

#[no_mangle]
pub extern "C" fn bf_card_tag_len(i: u32) -> u32 {
    let g = game();
    match g.cards.get(i as usize) {
        Some(c) => c.tag.len() as u32,
        None => 0,
    }
}

#[no_mangle]
pub extern "C" fn bf_card_rarity(i: u32) -> u32 {
    let g = game();
    match g.cards.get(i as usize) {
        Some(c) => c.rarity as u32,
        None => 0,
    }
}

#[no_mangle]
pub extern "C" fn bf_name_ptr() -> *const u8 {
    let g = game();
    sptr(&g.wname)
}

#[no_mangle]
pub extern "C" fn bf_name_len() -> u32 {
    game().wname.len() as u32
}

#[no_mangle]
pub extern "C" fn bf_msg_ptr() -> *const u8 {
    let g = game();
    sptr(&g.msg)
}

#[no_mangle]
pub extern "C" fn bf_msg_len() -> u32 {
    game().msg.len() as u32
}

#[no_mangle]
pub extern "C" fn bf_mode() -> u32 {
    game().mode
}
