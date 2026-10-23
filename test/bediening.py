# Bediening v100: snelbalk, catalogus, gereedschap, schakelaar, laagkiezer, ongedaan maken; bouwen en lopen; telefoon
import asyncio, os, json, sys
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1280,"height":800}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('hexstad-keys-seen','1'); localStorage.setItem('hexstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('sample')}"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='bed_bouwen.png',timeout=300000)
        # snelbalk: 3 = woning; catalogus open, kantoor kiezen → komt in vak 3
        r=[]
        await pg.keyboard.press('Digit3'); await pg.wait_for_timeout(200)
        r.append(await pg.evaluate("()=>[window.__HUD.idx, window.__HUD.slots()[window.__HUD.idx]]"))
        await pg.keyboard.press('Tab'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='bed_catalogus.png',timeout=300000)
        await pg.evaluate("()=>document.querySelector('.pal-tab:nth-child(5)').click()"); await pg.wait_for_timeout(200)
        await pg.evaluate("()=>document.getElementById('tool-tvlak').click()"); await pg.wait_for_timeout(300)
        r.append(await pg.evaluate("()=>[window.__HUD.idx, window.__HUD.slots()[window.__HUD.idx], document.getElementById('palette').hidden]"))
        # ongedaan maken: blok plaatsen en terugdraaien
        n0=await pg.evaluate("()=>window.__SC().getCells().size")
        await pg.keyboard.press('Digit4'); await pg.evaluate("()=>{const S=window.__SC(); S.place(9,9)}"); await pg.wait_for_timeout(900)
        n1=await pg.evaluate("()=>window.__SC().getCells().size")
        await pg.keyboard.press('Control+KeyZ'); await pg.wait_for_timeout(600)
        n2=await pg.evaluate("()=>window.__SC().getCells().size")
        r.append(['ongedaan', n0, n1, n2])
        # lopen
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(2500)
        await pg.keyboard.press('Digit4'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='bed_lopen.png',timeout=300000)
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(800)
        # winkelcentrum, laag 1
        await pg.evaluate("()=>{window.__SC().doAct('mall')}"); await pg.wait_for_timeout(3500)
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(2,4,4); S.orbit.dist=125; S.orbit.phi=0.85; S.orbit.theta=0.65; S.applyOrbit(); window.__HUD.setLayer(1)}"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='bed_laag1.png',timeout=300000)
        await pg.evaluate("()=>window.__HUD.setLayer(null,true)")
        print(json.dumps(r))
        # telefoon staand
        ph=await b.new_page(viewport={"width":390,"height":844}, has_touch=True, is_mobile=True); ph.on('pageerror',lambda e:errs.append(str(e)))
        await ph.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1,res:'snel'})); localStorage.setItem('hexstad-keys-seen','1')}catch(e){}")
        await ph.goto('file://'+EMB,timeout=120000); await ph.wait_for_timeout(3000)
        await ph.screenshot(path='bed_telefoon.png',timeout=300000)
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
