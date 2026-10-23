# Bouwen en lopen op terrein: een huis op een heuvel staat op de terreinhoogte, de speler loopt over het maaiveld
import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
cells={}
def hd(q,r): return max(abs(q),abs(r),abs(-q-r))
for q in range(-4,5):
    for r in range(-4,5):
        d=hd(q,r)
        if d<=3: cells[f"{q},{r}"]=['heuvel']*(4-d)   # oude verhogingen: moeten terrein worden
cells["0,0"]=['heuvel']*4+['woning','woning']
cells["1,0"]=['heuvel']*3+['pad']
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('empty'); const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true;}"); await pg.wait_for_timeout(400)
        await pg.evaluate("c=>{const S=window.__SC(); S.setCells(c);}",cells); await pg.wait_for_timeout(800)
        r=await pg.evaluate("""()=>{const S=window.__SC(), m=S.getCells(); return {terr:m.terr, st00:m.get('0,0'), st10:m.get('1,0'), g00:S.gH(0,0), ground00:S.terrGround(0,0), ground_mid:S.terrGround(8,0)}}""")
        print(r)
        # bouw een woning op een heuvelvak
        await pg.evaluate("()=>{const S=window.__SC(); S.place(-1,1);}"); await pg.wait_for_timeout(500)
        print('woning op -1,1:', await pg.evaluate("()=>{const S=window.__SC(); return [S.getCells().get('-1,1'), S.gH(-1,1)]}"))
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(0,10,0); S.orbit.phi=1.05; S.orbit.dist=120; S.orbit.theta=0.7; S.applyOrbit();}"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='terr_bouw.png')
        # lopen
        await pg.click('#modeBtn'); await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{const S=window.__SC(); S.player.x=30; S.player.z=10; S.player.y=20; S.player.vy=0;}")
        await pg.wait_for_timeout(1500)
        print('speler:', await pg.evaluate("()=>{const S=window.__SC(); return [S.player.y.toFixed(2), S.terrGround(S.player.x,S.player.z).toFixed(2)]}"))
        await pg.screenshot(path='terr_lopen.png')
        await pg.click('#modeBtn'); await pg.wait_for_timeout(400)
        for nm,th,phi,d in [('terr_pad1',0.2,0.7,50),('terr_pad2',2.0,1.1,45)]:
            await pg.evaluate("([th,phi,d])=>{const S=window.__SC(); S.orbit.target.set(13.5,9,0); S.orbit.phi=phi; S.orbit.dist=d; S.orbit.theta=th; S.applyOrbit();}",[th,phi,d]); await pg.wait_for_timeout(1200)
            await pg.screenshot(path=nm+'.png')
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
