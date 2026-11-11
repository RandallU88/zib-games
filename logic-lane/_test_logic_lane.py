#!/usr/bin/env python3
"""Playwright tests for Logic Lane: 4 viewports, all 16 puzzles, chrome, persistence."""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("LL_BASE", "http://127.0.0.1:8891")
SHOTS = Path(os.environ.get("LL_SHOTS", "/workspace/homeschool/web-lessons/shots/arcade-puzzles"))
SHOTS.mkdir(parents=True, exist_ok=True)

DEVICES = {
    "iphone": dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2),
    "iphone-land": dict(viewport={"width": 844, "height": 390}, is_mobile=True, has_touch=True, device_scale_factor=2),
    "ipad": dict(viewport={"width": 1024, "height": 768}, is_mobile=True, has_touch=True, device_scale_factor=2),
    "desktop": dict(viewport={"width": 1280, "height": 800}),
}

results = []

ROOT = Path(__file__).resolve().parent

def check_icon_coverage():
    """Fail if any non-person item in puzzles.js lacks a real icon file."""
    rec = {"game": "logic-lane", "device": "icon-coverage", "checks": [], "fail": False}
    js = (ROOT / "puzzles.js").read_text(encoding="utf-8")
    start = js.find("root.LOGIC_LANE_DATA = ")
    end = js.find(";" + chr(10) + "  root.LOGIC_LANE_PUZZLES")
    ok(start >= 0 and end > start, "puzzles.js data payload present", rec)
    data = json.loads(js[start + len("root.LOGIC_LANE_DATA = "):end])
    missing = []
    leftover_emoji = []
    seen = 0
    for g in data["logic_grids"]:
        for cat in g["categories"]:
            for it in cat["items"]:
                if "emoji" in it:
                    leftover_emoji.append(f"{g['id']}:{it.get('id')}")
                if cat.get("id") == "people":
                    if it.get("icon"):
                        missing.append(f"{g['id']}:{it.get('id')} person should be text only")
                    continue
                seen += 1
                icon = it.get("icon") or ""
                path = ROOT / "assets" / "icons" / Path(icon).name
                if Path(icon).suffix.lower() == ".png":
                    path = path.with_suffix(".svg")
                if not icon:
                    missing.append(f"{g['id']}:{it.get('id')} {it.get('label')} has no icon")
                elif not path.is_file():
                    missing.append(f"{g['id']}:{it.get('id')} {it.get('label')} missing file {icon}")
    ok(seen >= 78, f"found {seen} non-person items", rec)
    ok(not leftover_emoji, "no emoji fields left in puzzles.js" if not leftover_emoji else "emoji left: " + ", ".join(leftover_emoji[:12]), rec)
    ok(not missing, "every non-person item has an icon" if not missing else "missing icons: " + "; ".join(missing)[:500], rec)
    results.append(rec)
    status = "FAIL" if rec["fail"] else "PASS"
    print(f"{status} icon-coverage  {sum(c.startswith('PASS') for c in rec['checks'])}/{len(rec['checks'])} checks")
    for c in rec["checks"]:
        if c.startswith("FAIL"):
            print("   ", c)
    return rec


def ok(cond, msg, rec):
    rec["checks"].append(("PASS" if cond else "FAIL") + " " + msg)
    if not cond:
        rec["fail"] = True

async def collect_errors(pg):
    errs = []
    pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    return errs

async def click(pg, sel, touch):
    loc = pg.locator(sel).first
    await loc.wait_for(state="visible", timeout=8000)
    if touch:
        await loc.tap()
    else:
        await loc.click()

async def fill_solution(pg, touch):
    # Place a check on every correct pair. Auto-X may be on or off.
    info = await pg.evaluate(
        """() => {
          const p = __logicLane.puzzle;
          const cats = p.categories;
          const people = cats[0].items;
          const others = cats.slice(1);
          const taps = [];
          function key(c1,i1,c2,i2){
            const ix = id => cats.findIndex(c => c.id === id);
            return ix(c1) <= ix(c2) ? (c1+':'+i1+'|'+c2+':'+i2) : (c2+':'+i2+'|'+c1+':'+i1);
          }
          for (const person of people) {
            for (const cat of others) {
              taps.push(key(cats[0].id, person.id, cat.id, p.solution[person.id][cat.id]));
            }
          }
          if (others.length === 2) {
            for (const person of people) {
              taps.push(key(others[0].id, p.solution[person.id][others[0].id],
                            others[1].id, p.solution[person.id][others[1].id]));
            }
          }
          const targets = __logicLane.answerTargets(p).map(t => ({cat: t.cat.id, item: t.item.id}));
          return {taps, targets, autoX: __logicLane.autoX, level: p.level, id: p.id};
        }"""
    )
    for key in info["taps"]:
        # cycle blank -> X -> check (two taps)
        sel = f'.ll-cell[data-cell="{key}"]'
        mark = await pg.locator(sel).get_attribute("data-mark")
        while mark != "check":
            await click(pg, sel, touch)
            mark = await pg.locator(sel).get_attribute("data-mark")
    return info

async def run_device(browser, dev, opts, puzzles_first):
    rec = {"game": "logic-lane", "device": dev, "checks": [], "fail": False}
    ctx = await browser.new_context(**opts)
    pg = await ctx.new_page()
    errs = await collect_errors(pg)
    touch = bool(opts.get("has_touch"))

    # Arcade cabinet
    await pg.goto(f"{BASE}/arcade/", wait_until="domcontentloaded")
    await pg.wait_for_timeout(300)
    cab = pg.locator('a.cabinet[href*="logic-lane"]')
    ok(await cab.count() == 1, "Logic Lane cabinet on arcade page", rec)
    ok(await pg.locator("a.hs-home").is_visible(), "Home visible on arcade page", rec)
    if dev in ("iphone", "ipad", "desktop"):
        await pg.screenshot(path=str(SHOTS / f"arcade-{dev}.jpg"), type="jpeg", quality=72)

    # Picker
    await pg.goto(f"{BASE}/logic-lane/", wait_until="domcontentloaded")
    await pg.wait_for_timeout(400)
    home = pg.locator("a.hs-home")
    arcade = pg.locator('a.ll-arcade-btn, a[href="../arcade/"]')
    ok(await home.is_visible(), "Home visible on picker", rec)
    ok(await home.get_attribute("href") == "../", "Home href ../", rec)
    ok(await arcade.first.is_visible(), "Back to Arcade visible on picker", rec)
    ok(await arcade.first.get_attribute("href") == "../arcade/", "Back to Arcade href", rec)
    ok(await pg.locator("[data-ll-view=picker]").count() == 1, "picker view", rec)
    count = await pg.locator("[data-puzzle-id]").count()
    ok(count == 16, f"16 puzzle cards (got {count})", rec)
    # group headings
    for name in ("Logan", "Savannah"):
        ok(await pg.locator("h2", has_text=name).count() >= 1, f"group {name}", rec)
    for name in ("Standard", "Advanced"):
        ok(await pg.locator("h3", has_text=name).count() >= 2, f"level {name} under both kids", rec)
    if dev in ("iphone", "iphone-land", "ipad", "desktop"):
        await pg.screenshot(path=str(SHOTS / f"picker-{dev}.jpg"), type="jpeg", quality=72)

    # Undo / Clear / Check on first standard puzzle, then solve it
    first_id = puzzles_first
    await click(pg, f'[data-puzzle-id="{first_id}"]', touch)
    await pg.wait_for_timeout(200)
    ok(await pg.locator("[data-ll-view=puzzle]").count() == 1, "opened puzzle", rec)
    ok(await home.is_visible(), "Home visible on puzzle", rec)
    ok(await arcade.first.is_visible(), "Back to Arcade visible on puzzle", rec)
    # Icons replace emoji on item headers and question choices; people stay text.
    col_icons = await pg.locator(".ll-colhead .ll-icon").count()
    ok(col_icons >= 3, f"column header icons present ({col_icons})", rec)
    loaded = await pg.evaluate(
        """() => Array.from(document.querySelectorAll('.ll-colhead .ll-icon')).every(
             img => img.complete && img.naturalWidth > 0)"""
    )
    ok(loaded, "column header icons loaded", rec)
    alts = await pg.evaluate(
        """() => Array.from(document.querySelectorAll('.ll-colhead .ll-icon')).map(img => [img.alt, img.closest('th').querySelector('.ll-iname')?.textContent.trim()])"""
    )
    ok(all(a[0] and a[0] == a[1] for a in alts), "header icon alt text matches item name", rec)
    people_imgs = await pg.evaluate(
        """() => {
          const people = (__logicLane.puzzle.categories[0].items || []).map(i => i.label);
          return Array.from(document.querySelectorAll('.ll-rowhead')).filter(th => {
            const lab = th.querySelector('.ll-rlabel')?.textContent.trim();
            return people.includes(lab) && th.querySelector('img');
          }).length;
        }"""
    )
    ok(people_imgs == 0, "people row headers are text only", rec)
    leftover = await pg.locator(".ll-emoji").count()
    ok(leftover == 0, "no leftover emoji slots in the grid", rec)
    auto_pressed = await pg.locator('[data-act=autoX]').get_attribute("aria-pressed")
    level = await pg.evaluate("__logicLane.puzzle.level")
    if level == "Advanced":
        ok(auto_pressed == "false", "Auto-X starts off on Advanced", rec)
    else:
        ok(auto_pressed == "true", "Auto-X starts on for Standard", rec)

    # Mark a wrong cell, Check my grid should complain without revealing
    first_cell = pg.locator(".ll-cell").first
    key = await first_cell.get_attribute("data-cell")
    await click(pg, f'.ll-cell[data-cell="{key}"]', touch)  # X
    await click(pg, '[data-act=check]', touch)
    fb = await pg.locator("#ll-feedback").inner_text()
    # An X on a random first cell may or may not be a contradiction (it might be a correct X).
    # So just require some feedback text, then Undo/Clear.
    ok(bool(fb.strip()), f"Check my grid gives feedback ({fb[:80]})", rec)
    # no answer reveal: solution item ids shouldn't be phrased as 'the answer is'
    ok("answer is" not in fb.lower() and "correct is" not in fb.lower(), "feedback does not reveal answers", rec)

    await click(pg, "[data-act=undo]", touch)
    mark = await pg.locator(f'.ll-cell[data-cell="{key}"]').get_attribute("data-mark")
    ok(mark == "blank", f"Undo restores the cell (now {mark})", rec)

    await click(pg, f'.ll-cell[data-cell="{key}"]', touch)
    await click(pg, "[data-act=clear]", touch)
    left = await pg.evaluate("Object.keys(__logicLane.cells).filter(k => __logicLane.cells[k]).length")
    ok(left == 0, "Clear empties the grid", rec)

    if dev in ("iphone", "iphone-land", "ipad"):
        await pg.screenshot(path=str(SHOTS / f"puzzle-{first_id}-{dev}.jpg"), type="jpeg", quality=72)

    # Solve this one fully
    info = await fill_solution(pg, touch)
    await click(pg, "[data-act=check]", touch)
    fb = await pg.locator("#ll-feedback").inner_text()
    ok("looks right" in fb.lower() or await pg.evaluate("__logicLane.gridFullyCorrect()"),
       f"grid checks out after solving ({fb[:80]})", rec)
    for t in info["targets"]:
        await click(pg, f'.ll-option[data-part="{t["cat"]}"][data-option="{t["item"]}"]', touch)
        await pg.wait_for_timeout(80)
    ok(await pg.locator("[data-ll-view=win]").count() == 1, "win screen after correct question", rec)
    ok(await pg.locator(".ll-win-stars").count() == 1, "stars on win screen", rec)
    ok(await pg.locator(".ll-explain").count() == 1, "explain shown after correct answer", rec)
    ok(await home.is_visible(), "Home visible on win", rec)
    ok(await pg.locator('a[href="../arcade/"]').first.is_visible(), "Back to Arcade on win", rec)
    if dev in ("iphone", "ipad", "desktop"):
        await pg.screenshot(path=str(SHOTS / f"win-{first_id}-{dev}.jpg"), type="jpeg", quality=72)

    # Persistence: reload picker, stars remain
    await pg.goto(f"{BASE}/logic-lane/", wait_until="domcontentloaded")
    await pg.wait_for_timeout(300)
    stars = await pg.locator(f'[data-puzzle-id="{first_id}"] [data-best]').get_attribute("data-best")
    ok(int(stars or "0") >= 1, f"best stars persisted ({stars})", rec)

    # Solve every remaining puzzle (and re-solve first already done; skip it)
    ids = await pg.evaluate("__logicLane.puzzles.map(p => p.id)")
    for pid in ids:
        if pid == first_id:
            continue
        await pg.goto(f"{BASE}/logic-lane/", wait_until="domcontentloaded")
        await pg.wait_for_timeout(150)
        await click(pg, f'[data-puzzle-id="{pid}"]', touch)
        await pg.wait_for_timeout(100)
        # Advanced auto-x off
        if await pg.evaluate("__logicLane.puzzle.level") == "Advanced":
            pressed = await pg.locator("[data-act=autoX]").get_attribute("aria-pressed")
            ok(pressed == "false", f"{pid} Auto-X off on Advanced", rec)
        info = await fill_solution(pg, touch)
        for t in info["targets"]:
            await click(pg, f'.ll-option[data-part="{t["cat"]}"][data-option="{t["item"]}"]', touch)
            await pg.wait_for_timeout(50)
        won = await pg.locator("[data-ll-view=win]").count()
        ok(won == 1, f"solved {pid}", rec)
        if not won:
            # capture failure
            await pg.screenshot(path=str(SHOTS / f"FAIL-{pid}-{dev}.jpg"), type="jpeg", quality=70)
            fb = await pg.evaluate("(__logicLane.feedback && __logicLane.feedback.text) || document.body.innerText.slice(0,400)")
            rec["checks"].append("INFO fail state " + pid + ": " + str(fb)[:200])

    # shot of a 4x4 stair-step, plus a clip check on Savannah Advanced
    for pid in ("s-s1", "s-a1", "s-a2", "s-a3"):
        await pg.goto(f"{BASE}/logic-lane/", wait_until="domcontentloaded")
        await click(pg, f'[data-puzzle-id="{pid}"]', touch)
        await pg.wait_for_timeout(200)
        clips = await pg.evaluate(
            """() => {
              const hits = [];
              const nodes = document.querySelectorAll('.ll-icon, .ll-iname, .ll-rlabel, .ll-chip, .ll-colhead, .ll-rowhead');
              nodes.forEach((el) => {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) return;
                let p = el.parentElement;
                while (p && p !== document.body) {
                  const st = getComputedStyle(p);
                  const clips = st.overflowX === 'hidden' || st.overflowY === 'hidden' || st.overflow === 'hidden';
                  if (clips) {
                    const pr = p.getBoundingClientRect();
                    if (r.left < pr.left - 1 || r.right > pr.right + 1 || r.top < pr.top - 1 || r.bottom > pr.bottom + 1) {
                      hits.push((el.className || el.tagName) + ' in ' + (p.className || p.tagName));
                    }
                    break;
                  }
                  p = p.parentElement;
                }
              });
              return hits.slice(0, 8);
            }"""
        )
        ok(not clips, f"{pid} no clipped headers/icons" if not clips else f"{pid} clipped: {clips}", rec)
        icons_ok = await pg.evaluate(
            """() => {
              const imgs = Array.from(document.querySelectorAll('.ll-icon'));
              return imgs.length > 0 && imgs.every(img => img.complete && img.naturalWidth > 0);
            }"""
        )
        ok(icons_ok, f"{pid} icons loaded", rec)
        if dev in ("iphone", "iphone-land", "ipad") and pid in ("s-s1", "s-a1"):
            await pg.screenshot(path=str(SHOTS / f"grid-{pid}-{dev}.jpg"), type="jpeg", quality=72)

    js_ok = not errs
    ok(js_ok, "0 JS errors" if js_ok else ("JS errors: " + " | ".join(errs)[:400]), rec)
    rec["errors"] = errs
    results.append(rec)
    await ctx.close()
    return rec

async def main():
    first = "l-s1"
    check_icon_coverage()
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for dev, opts in DEVICES.items():
            rec = await run_device(browser, dev, opts, first)
            status = "FAIL" if rec["fail"] else "PASS"
            print(f"{status} {dev}  {sum(c.startswith('PASS') for c in rec['checks'])}/{len(rec['checks'])} checks")
            for c in rec["checks"]:
                if c.startswith("FAIL"):
                    print("   ", c)
        await browser.close()
    fails = [r for r in results if r["fail"]]
    out = SHOTS / "results.json"
    out.write_text(json.dumps(results, indent=2))
    print("\n" + str(len(results) - len(fails)) + "/" + str(len(results)) + " devices passed. results:", out)
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    asyncio.run(main())
