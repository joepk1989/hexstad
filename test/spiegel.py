# Spiegelen: module kiezen, F, plaatsen; het exemplaar is gespiegeld (trap aan de andere kant)
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","raatstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":600}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; window.__SC().doAct('empty'); [...document.querySelectorAll('.pal-tab')].find(t=>t.textContent==='Modules').click()}"); await pg.wait_for_timeout(1500)
        print('gespiegelde module nog in bibliotheek:', await pg.evaluate("()=>window.__mods.some(m=>/gespiegeld/.test(m.name))"))
        await pg.evaluate("()=>{const i=window.__mods.findIndex(m=>m.name.startsWith('Winkelcentrum · galerij · trap')); document.querySelector('.modcard[data-mi=\"'+i+'\"]').click()}"); await pg.wait_for_timeout(400)
        await pg.mouse.move(450,300); await pg.keyboard.press('KeyF'); await pg.wait_for_timeout(300)
        print('knop', await pg.evaluate("()=>[document.getElementById('mirBtn').hidden, document.getElementById('mirBtn').getAttribute('aria-pressed')]"))
        await pg.evaluate("()=>{window.__SC().place(0,0); window.__SC().place(2,0)}"); await pg.wait_for_timeout(800)
        r=await pg.evaluate("""()=>{const c=window.__SC().getCells(); return c.inst.map(I=>({mir:!!I.mir, stair:I.m.lv[0].s.map(S=>[S.a,S.d,S.off])}))}""")
        print(json.dumps(r)); print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
