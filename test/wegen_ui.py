# Wegen via de muis: rotonde klikken, wegen erheen slepen, snelweg trekken; foutmeldingen en graaf
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{document.querySelector('[data-act=empty]').click(); const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; const S=window.__SC(); S.orbit.target.set(0,0,0); S.orbit.phi=0.5; S.orbit.dist=230; S.orbit.theta=0; S.applyOrbit();}"); await pg.wait_for_timeout(600)
        await pg.click('.pal-tab >> text=Wegen'); await pg.click('#tool-vrot'); await pg.wait_for_timeout(200)
        m=pg.mouse
        await m.click(500,330); await pg.wait_for_timeout(800)
        await pg.click('#tool-vweg')
        for (x,y) in [(500,330,),]: pass
        async def drag(a,b):
            await m.move(*a); await m.down()
            for i in range(1,16): await m.move(a[0]+(b[0]-a[0])*i/15, a[1]+(b[1]-a[1])*i/15); await pg.wait_for_timeout(30)
            await m.up(); await pg.wait_for_timeout(700)
        await drag((500,330),(820,330)); await drag((500,330),(500,90)); await drag((500,330),(260,430))
        await pg.click('#tool-vsnel'); await drag((120,600),(900,560))
        g=await pg.evaluate("()=>{const S=window.__SC(), d=S.cars.vecGraph(); return {paths:S.getCells().paths.map(p=>p.t), nodes:d.nodes.length, edges:[...d.edges.values()].map(e=>e.t)}}")
        print(json.dumps(g))
        await pg.wait_for_timeout(1500); await pg.screenshot(path='wegen_ui.png')
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
