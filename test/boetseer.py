# Terrein boetseren met de muis: ophogen (vasthouden + slepen), Shift = afgraven, egaliseren, gladstrijken, helling
import asyncio, os
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','raatstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{window.__SC().doAct('empty'); const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true;}"); await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(0,0,0); S.orbit.phi=0.95; S.orbit.dist=260; S.orbit.theta=0.5; S.applyOrbit();}")
        await pg.click('.pal-tab >> text=Terrein'); await pg.wait_for_timeout(200); await pg.click('#tool-tophoog'); await pg.wait_for_timeout(300)
        await pg.keyboard.press('BracketRight')
        m=pg.mouse
        # ophogen: vasthouden en langzaam slepen
        await m.move(420,330); await m.down()
        for i in range(40): await m.move(420+i*4,330+i*1.5); await pg.wait_for_timeout(60)
        await pg.wait_for_timeout(900); await m.up(); await pg.wait_for_timeout(600)
        h1=await pg.evaluate("()=>{const S=window.__SC(), t=S.getCells().terr||{}; const v=Object.values(t); return [v.length, Math.max(0,...v)]}")
        print('na ophogen: vakken, hoogste', h1)
        await m.move(500,360); await pg.wait_for_timeout(500)
        await pg.screenshot(path='boets_1.png')
        # Shift: afgraven in het midden
        await pg.keyboard.down('Shift'); await m.move(520,360); await m.down(); await pg.wait_for_timeout(600); await m.up(); await pg.keyboard.up('Shift'); await pg.wait_for_timeout(400)
        # helling
        await pg.click('#tool-thelling'); await m.move(300,500); await m.down()
        for i in range(20): await m.move(300+i*10,500-i*8); await pg.wait_for_timeout(40)
        await m.up(); await pg.wait_for_timeout(500)
        # gladstrijken
        await pg.click('#tool-tglad'); await m.move(480,350); await m.down()
        for i in range(25): await m.move(480+(i%5)*12,350+(i//5)*6); await pg.wait_for_timeout(60)
        await m.up(); await pg.wait_for_timeout(800)
        await m.move(600,300); await pg.wait_for_timeout(400)
        await pg.screenshot(path='boets_2.png')
        # weg erdoorheen trekken
        await pg.click('.pal-tab >> text=Wegen'); await pg.wait_for_timeout(200)
        await m.move(200,420); await m.down()
        for i in range(30): await m.move(200+i*22,420-i*3); await pg.wait_for_timeout(30)
        await m.up(); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.phi=1.15; S.orbit.dist=170; S.applyOrbit();}"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='boets_3.png')
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
