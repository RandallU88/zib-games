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

    # shot of a 4x4 stair-step
    if dev in ("iphone", "iphone-land", "ipad"):
        await pg.goto(f"{BASE}/logic-lane/", wait_until="domcontentloaded")
        await click(pg, '[data-puzzle-id="sav-s1"]', touch)
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=str(SHOTS / f"grid-4x4x2-{dev}.jpg"), type="jpeg", quality=72)

    js_ok = not errs
    ok(js_ok, "0 JS errors" if js_ok else ("JS errors: " + " | ".join(errs)[:400]), rec)
    rec["errors"] = errs
    results.append(rec)
    await ctx.close()
    return rec

async def main():
    first = "logan-s1"
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
