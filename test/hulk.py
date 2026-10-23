# De Hulk: komt bij een file, tilt auto's op en gooit ze weg; de auto's beginnen opnieuw
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<title>","<meta charset=\"utf-8\"><title>",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":625}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)+' | '+str(getattr(e,'stack',''))[:400]))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1,res:'normaal'})); localStorage.setItem('hexstad-mensen','1'); localStorage.setItem('hexstad-keys-seen','1'); localStorage.setItem('hexstad.tod',JSON.stringify({tod:14,auto:false,speed:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>window.__SC().doAct('sample')"); await pg.wait_for_timeout(2500)
        ok=await pg.evaluate("()=>window.__hulk.summon()")
        print('opgeroepen', ok)
        shots=0
        for i in range(60):
            await pg.evaluate("()=>{const S=window.__SC(); for(let k=0;k<10;k++){ window.__hulk.update(0.1); S.cars.update(0.1); S.people.update(0.1);} }")
            r=await pg.evaluate("()=>{const H=window.__hulk, S=window.__SC(); const st=H.st; return {on:H.on, fase:st.fase||st.phase, done:st.done, fly:S.cars.list.filter(c=>c.fly).length, crash:S.cars.list.filter(c=>c.crash).length, x:+st.x.toFixed(0), z:+st.z.toFixed(0)}}")
            if i%5==0: print(i, json.dumps(r))
            if r['fase']=='til' and shots==0:
                await pg.evaluate("()=>{const S=window.__SC(), st=window.__hulk.st; S.orbit.target.set(st.x,3,st.z); S.orbit.dist=26; S.orbit.phi=1.15; S.orbit.theta=st.h+2.6; S.applyOrbit();}")
                await pg.wait_for_timeout(900); await pg.screenshot(path='hulk_til.png',timeout=300000); shots=1
            if r['fly']>0 and shots==1:
                await pg.wait_for_timeout(250); await pg.screenshot(path='hulk_gooi.png',timeout=300000); shots=2
            if not r['on']: break
            await pg.wait_for_timeout(100)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
