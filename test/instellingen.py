# Instellingen: venster openen, terrein op low poly / hoog, schaduwen uit; terrein met heuvels en een weg
import asyncio, os, time
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
cells={}
def hd(q,r): return max(abs(q),abs(r),abs(-q-r))
for q in range(-6,7):
    for r in range(-6,7):
        d=hd(q,r); n=5-d
        if n>0: cells[f"{q},{r}"]=['heuvel']*n
paths=[{'t':'weg','l':0,'r':0,'p':[[-130,-20],[130,-20]]}]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('empty'); const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true;}"); await pg.wait_for_timeout(300)
        await pg.evaluate("([c,P])=>{const S=window.__SC(); S.setCells(c); const m=S.getCells(); m.paths=P; S.buildPathNet(); S.orbit.target.set(0,4,0); S.orbit.phi=1.0; S.orbit.dist=170; S.orbit.theta=0.6; S.applyOrbit();}",[cells,paths])
        await pg.click('#menuBtn'); await pg.wait_for_timeout(300); await pg.click('#setBtn'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='set_venster.png')
        for q,lbl in [('laag','Low poly'),('hoog','Hoog'),('normaal','Normaal')]:
            t0=time.time(); await pg.click(f'#setRows .seg[aria-label=Terrein] >> text="{lbl}"'); dt=time.time()-t0
            await pg.click('#setClose'); await pg.wait_for_timeout(1200); await pg.screenshot(path=f'set_{q}.png'); print(q, 'wissel', round(dt,2),'s')
            await pg.click('#menuBtn'); await pg.wait_for_timeout(200); await pg.click('#setBtn'); await pg.wait_for_timeout(300)
        await pg.click('#setRows .seg[aria-label=Schaduwen] >> text="Uit"'); await pg.wait_for_timeout(300)
        print('opgeslagen:', await pg.evaluate("()=>localStorage.getItem('hexstad-set')"))
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
