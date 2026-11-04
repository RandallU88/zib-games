import re,sys,json
from playwright.sync_api import sync_playwright
B="http://127.0.0.1:8797/";OUT="/workspace/edu-game/site/shots/batch1/"
VP={"ipad-portrait":dict(viewport={"width":820,"height":1180},has_touch=True,is_mobile=True,device_scale_factor=2),
    "ipad-landscape":dict(viewport={"width":1180,"height":820},has_touch=True,is_mobile=True,device_scale_factor=2),
    "iphone":dict(viewport={"width":390,"height":844},has_touch=True,is_mobile=True,device_scale_factor=3),
    "desktop":dict(viewport={"width":1440,"height":900})}
fails=[];ok=0
def check(c,m):
    global ok
    if c: ok+=1
    else: fails.append(m);print("FAIL",m)
def tap(page,x,y,touch):
    if touch: page.touchscreen.tap(x,y)
    else: page.mouse.click(x,y)
def play_sector(page,touch,shoot_boss=True,wrong_first=True):
    # answer every question by tapping the correct asteroid; first one wrong on purpose
    did_wrong=False
    for _ in range(400):
        st=page.evaluate("()=>{const G=__sc.G;if(!G||!G.on)return null;const a=G.ast.find(a=>a.ok);const w=G.ast.find(a=>!a.ok);return {boss:!!G.boss,a:a&&__sc.screenOf(a),w:w&&__sc.screenOf(w),ax:a&&a.x,intro:G.intro}}")
        if st is None: return
        if st["intro"]>0 or st["ax"] is None or st["ax"]>1100: page.wait_for_timeout(120);continue
        tgt=st["w"] if (wrong_first and not did_wrong and st["w"]) else st["a"]
        if tgt is st["w"]: did_wrong=True
        tap(page,tgt["x"],tgt["y"],touch);page.wait_for_timeout(450)
with sync_playwright() as p:
    br=p.chromium.launch()
    for vn,opt in VP.items():
        ctx=br.new_context(**opt);page=ctx.new_page();errs=[]
        page.on("pageerror",lambda e:errs.append(str(e)));page.on("console",lambda m:errs.append(m.text) if m.type=="error" and "404" not in m.text and "Failed to load resource" not in m.text else None)
        touch=opt.get("has_touch",False)
        page.goto(B+"index.html");page.wait_for_timeout(600)
        check(page.locator("a[href='star-cadet/']").count()==1 and page.locator("a[href='hollow-oak/']").count()==1,f"{vn} home cards")
        page.screenshot(path=OUT+f"home-{vn}.png",full_page=False)
        # ---------- Star Cadet ----------
        page.goto(B+"star-cadet/");page.wait_for_timeout(500)
        check(page.locator("#profList .card").count()>=3,f"{vn} sc profiles")
        page.screenshot(path=OUT+f"star-cadet-title-{vn}.png")
        kids=["Logan","Savannah"] if vn in("ipad-landscape","desktop") else ["Logan"]
        for kid in kids:
            page.locator(f"#profList .card[data-n='{kid}']").click();page.wait_for_timeout(300)
            check(page.locator("#secList .card:not(.lock)").count()>=1,f"{vn} {kid} map")
            if kid=="Savannah":
                # generate many questions from every sector: multiplication only
                bad=page.evaluate("()=>{const out=[];__sc.SECTORS.g5.forEach(s=>{for(let i=0;i<300;i++){const[q,a]=s.g();if(!/^\\d+ × \\d+$/.test(q)||a!==eval(q.replace('×','*')))out.push(q)}});return out}")
                check(not bad,f"Savannah non-multiplication: {bad[:5]}")
            else:
                bad=page.evaluate("()=>{const out=[];__sc.SECTORS.g2.forEach(s=>{for(let i=0;i<300;i++){const[q,a]=s.g();if(a<0||a>100||/×|÷/.test(q))out.push(q+'='+a)}});return out}")
                check(not bad,f"Logan out of range: {bad[:5]}")
            if vn=="ipad-portrait" or kid=="Logan": page.screenshot(path=OUT+f"star-cadet-map-{kid.lower()}-{vn}.png")
            page.locator("#secList .card[data-i='0']").click();page.wait_for_timeout(2600);page.evaluate("()=>{__sc.G.speed=260}");page.wait_for_timeout(1500)
            if vn in("ipad-landscape","iphone") or (vn=="ipad-portrait"): page.screenshot(path=OUT+f"star-cadet-play-{kid.lower()}-{vn}.png")
            # shorten for test speed: jump near boss after a few waves
            for i in range(3):
                play_sector(page,touch,wrong_first=(i==0)) if False else None
            # play real waves until boss
            for _ in range(200):
                st=page.evaluate("()=>__sc.G&&__sc.G.on?{boss:!!__sc.G.boss}:null")
                if st is None or st["boss"]: break
                s2=page.evaluate("()=>{const G=__sc.G;if(G.intro>0)return null;const a=G.ast.find(a=>a.ok);return a&&a.x<1100?__sc.screenOf(a):null}")
                if s2: tap(page,s2["x"],s2["y"],touch);page.wait_for_timeout(450)
                else: page.wait_for_timeout(150)
            check(page.evaluate("()=>!!(__sc.G&&__sc.G.boss)"),f"{vn} {kid} reached boss")
            page.wait_for_timeout(2200);page.screenshot(path=OUT+f"star-cadet-boss-{kid.lower()}-{vn}.png")
            play_sector(page,touch,wrong_first=True)
            page.wait_for_timeout(1200)
            check(page.locator("#s-rep").is_visible() and page.locator("#repBox .r-title").count()==0 and page.locator("#rNext").count()==1,f"{vn} {kid} sector cleared")
            page.screenshot(path=OUT+f"star-cadet-report-{kid.lower()}-{vn}.png")
            check(page.evaluate(f"()=>EDU.DB.profiles['{kid}'].games.starCadet[__sc.track][0].clear===true"),f"{vn} {kid} saved")
            page.locator("#rMap").click();page.wait_for_timeout(200)
            check(page.locator("#secList .card[data-i='1']:not(.lock)").count()==1,f"{vn} {kid} sector 2 unlocked")
            check(page.locator("#secList .card[data-i='2'].lock").count()==1,f"{vn} {kid} sector 3 still locked")
            page.locator("#homeBtn").click();page.wait_for_timeout(200)
        # parent
        page.locator("#profList .card[data-n='Parent']").click();page.wait_for_timeout(200)
        for t,n in (("g2",10),("g5",15)):
            page.locator(f"#trackPick button[data-t='{t}']").click();page.wait_for_timeout(150)
            check(page.locator("#secList .card:not(.lock)").count()==n,f"{vn} parent {t} all unlocked")
        if vn=="ipad-portrait":page.screenshot(path=OUT+"star-cadet-parent-ipad-portrait.png",full_page=True)
        # ---------- Hollow Oak ----------
        page.goto(B+"hollow-oak/");page.wait_for_timeout(900)
        page.screenshot(path=OUT+f"hollow-oak-title-{vn}.png")
        for kid in kids:
            page.locator(f"#profList .prof[data-n='{kid}']").click();page.wait_for_timeout(250)
            check(page.locator("#chList .ch:not(.lock)").count()==1,f"{vn} {kid} only ch1 open")
            if kid=="Logan" and vn=="ipad-landscape":page.screenshot(path=OUT+f"hollow-oak-board-{vn}.png")
            page.locator("#chList .ch[data-i='0']").click();page.wait_for_timeout(300)
            if kid=="Logan" and vn=="ipad-landscape":page.screenshot(path=OUT+f"hollow-oak-chaptercard-{vn}.png")
            page.locator("#cardTap").click();page.wait_for_timeout(400)
            if kid=="Logan":page.screenshot(path=OUT+f"hollow-oak-dialogue-{vn}.png")
            for _ in range(10):
                if not page.locator("#dlg").is_visible():break
                page.locator("#dlg").click();page.wait_for_timeout(120)
            if kid=="Logan" or vn=="ipad-landscape":page.screenshot(path=OUT+f"hollow-oak-scene-{kid.lower()}-{vn}.png")
            tr=page.evaluate("__ho.track");P=page.evaluate(f"()=>__ho.PZ['{tr}'].farm")
            for k,pz in enumerate(P):
                page.locator(f"#spots .spot[data-k='{k}']").click(force=True);page.wait_for_timeout(250)
                if vn in ("ipad-landscape","iphone") : page.screenshot(path=OUT+f"hollow-oak-puzzle-{pz['t']}-{kid.lower()}-{vn}.png")
                t=pz["t"]
                if t=="cipher":
                    for L in pz["answer"]: page.locator(f".tiles .pbtn:not(.used):text-is('{L}')").first.click()
                    page.locator("#chk").click()
                elif t=="scale":
                    page.locator(".keys .pbtn[data-n='9']").click();page.locator("#chk").click();page.wait_for_timeout(100)
                    check("bad" in page.get_attribute("#msg","class"),f"{vn} wrong answer feedback")
                    for d in str(pz["answer"]): page.locator(f".keys .pbtn[data-n='{d}']").click()
                    page.locator("#chk").click()
                elif t=="map":
                    page.locator(f".mapg button[data-c='{pz['answer'][0]},{pz['answer'][1]}']").click();page.locator("#chk").click()
                elif t=="pattern": page.locator(f".chs2 .pbtn[data-v='{pz['answer']}']").click()
                elif t=="reading": page.locator(f".chs2 .pbtn[data-i='{pz['answer']}']").click()
                elif t=="logic":
                    for r,c in pz["sol"].items(): page.locator(f".lg button[data-k='{r}|{c}']").click()
                    if vn=="ipad-landscape":page.screenshot(path=OUT+f"hollow-oak-puzzle-logic-marked-{kid.lower()}-{vn}.png")
                    page.locator(f".chs2 .pbtn[data-v='{pz['answer']}']").click()
                page.wait_for_timeout(150)
                check(page.locator("#ok").count()==1,f"{vn} {kid} solved {t}")
                if k==0 and vn=="ipad-landscape":page.screenshot(path=OUT+f"hollow-oak-cluefound-{kid.lower()}-{vn}.png")
                page.locator("#ok").click();page.wait_for_timeout(150)
            page.wait_for_timeout(200)
            if page.locator("#dlg").is_visible():
                if vn=="ipad-landscape":page.screenshot(path=OUT+f"hollow-oak-scene-complete-{kid.lower()}-{vn}.png")
                page.locator("#dlg").click();page.wait_for_timeout(150)
            page.locator("#nbBtn").click();page.wait_for_timeout(250)
            page.screenshot(path=OUT+f"hollow-oak-notebook-{kid.lower()}-{vn}.png")
            page.locator("#ovBox .x").click()
            page.locator("#cfBtn").click(force=True);page.wait_for_timeout(800)
            check("EVIDENCE" in page.inner_text("#fileBox"),f"{vn} {kid} case file")
            page.screenshot(path=OUT+f"hollow-oak-casesolved-{kid.lower()}-{vn}.png")
            page.locator("#bd").click();page.wait_for_timeout(200)
            check(page.locator("#chList .ch[data-i='1']:not(.lock)").count()==1,f"{vn} {kid} ch2 unlocked")
            page.locator("#boardBack").click();page.wait_for_timeout(200)
        page.locator("#profList .prof[data-n='Parent']").click();page.wait_for_timeout(200)
        for t in("g2","g5"):
            page.locator(f"#trackPick .pbtn[data-t='{t}']").click();page.wait_for_timeout(100)
            check(page.locator("#chList .ch:not(.lock)").count()==3,f"{vn} parent ho {t} unlocked")
        if vn=="ipad-landscape":page.screenshot(path=OUT+"hollow-oak-parent-board-ipad-landscape.png")
        # Savannah puzzle text scan for division / word problems in math
        txt=page.evaluate("()=>JSON.stringify(__ho.PZ.g5)")
        check("÷" not in txt and "divid" not in txt.lower() and " / " not in txt,"g5 no division")
        check(not errs,f"{vn} JS errors: {errs[:3]}")
        ctx.close()
    br.close()
print("passed",ok,"failed",len(fails))
