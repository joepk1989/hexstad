# Close-ups in het winkelcentrum: trappen, oprit, aansluitingen
import asyncio, os, json, math
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":680}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'zacht',tv:1})); localStorage.setItem('hexstad-mensen','0')}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; window.__SC().doAct('mall')}"); await pg.wait_for_timeout(5000)
        pos=await pg.evaluate("""()=>{const S=window.__SC(), ins=S.getCells().inst; const f=n=>ins.filter(I=>I.m.name.startsWith('Winkelcentrum · '+n)).map(I=>({x:9*Math.sqrt(3)*(I.q+I.r/2), z:13.5*I.r, lv:I.lv||0, rot:I.rot, mir:!!I.mir}));
          return {gtrap:f('galerij · trap'), breed:f('trap · breed'), oprit:f('oprit'), gal:f('galerij')}}""")
        print(json.dumps(pos))
        shots=[('c_gtrap0',pos['gtrap'][0],4.5,0.5,1.1,24),('c_gtrap1',pos['gtrap'][1],4.5,2.5,1.1,24),('c_breed',pos['breed'][0],4.5,1.2,1.15,26),('c_oprit',pos['oprit'][0],1.5,1.9,1.15,32),('c_gal',pos['gal'][0],6,0.3,1.0,28)]
        for name,o,y,th,ph,d in shots:
            await pg.evaluate("([x,y,z,th,ph,d])=>{const S=window.__SC(); S.orbit.target.set(x,y,z); S.orbit.phi=ph; S.orbit.dist=d; S.orbit.theta=th; S.applyOrbit();}",[o['x'],y,o['z'],th,ph,d]); await pg.wait_for_timeout(2500)
            await pg.screenshot(path=name+'.png',timeout=300000)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
