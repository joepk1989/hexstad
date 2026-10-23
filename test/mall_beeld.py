import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,"..","dist","hexstad.html"); THREE=os.path.join(HERE,"node_modules","three","build","three.min.js"); EMB=os.path.join(HERE,"out","emb.html"); open(EMB,"w",encoding="utf-8").write(open(DIST,encoding="utf-8").read().replace("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js","file://"+THREE).replace("<head>","<head><meta charset=\"utf-8\">",1)); os.chdir(os.path.join(HERE,'out'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1100,"height":700}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; window.__SC().doAct('mall')}"); await pg.wait_for_timeout(5000)
        pos=await pg.evaluate("""()=>{const S=window.__SC(), c=S.getCells(); const f=n=>c.inst.filter(I=>I.m.name.startsWith(n)).map(I=>({x:9*Math.sqrt(3)*(I.q+I.r/2), z:13.5*I.r, lv:I.lv||0, rot:I.rot, n:I.m.name})); return {oprit:f('Winkelcentrum · oprit'), trap:f('Winkelcentrum · galerij · trap'), door:f('Winkelcentrum · doorgang'), half:f('Winkelcentrum · café'), afg:f('Winkelcentrum · winkel · afgesneden'), pav:f('Winkelcentrum · dakpaviljoen')}}""")
        print(json.dumps(pos))
        shots={'oprit':(pos['oprit'][0],0.0,1.15,60,'zij'),'trap':(pos['trap'][0],1,1.2,55,'iso'),'doorgang':(pos['door'][0],1,1.1,55,'iso'),'half':(pos['half'][0],1,1.05,70,'iso'),'pav':(pos['pav'][0],2,1.0,70,'iso')}
        for name,(o,lv,ph,d,_) in shots.items():
            th=-o['rot']*3.14159/3+0.9 if name!='oprit' else 3.14159*0.5
            await pg.evaluate("([x,z,y,ph,d,th])=>{const S=window.__SC(); S.orbit.target.set(x,y,z); S.orbit.phi=ph; S.orbit.dist=d; S.orbit.theta=th; S.applyOrbit();}",[o['x'],o['z'],lv*3+2,ph,d,th]); await pg.wait_for_timeout(2000)
            await pg.screenshot(path='mall_'+name+'.png', timeout=300000)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
