# Bordestrap in een woning: de speler loopt steek 1 op naar het bordes (1,5 m), steek 2 op naar de verdieping (3 m)
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":900,"height":600}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{document.querySelector('[data-act=empty]').click(); const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true; const S=window.__SC(); S.setCells({'0,0':['kantoor','woning','woning'],'1,0':['woning','woning'],'0,1':['pad']});}")
        await pg.wait_for_timeout(800)
        # schermafbeelding van binnen van boven (dak weg: alleen begane grond + 1 laag)
        await pg.evaluate("()=>{const S=window.__SC(); S.setCells({'0,0':['woning','woning'],'0,1':['pad']}); S.orbit.target.set(0,1.5,0); S.orbit.phi=0.75; S.orbit.dist=32; S.orbit.theta=2.4; S.applyOrbit();}")
        await pg.wait_for_timeout(1500); await pg.screenshot(path='bordes_buiten.png')
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(500)
        for nm,pos in [('bordes_binnen1',[2.5,0.25,4.5,0.62,-0.25]),('bordes_binnen2',[-3,3.25,5.5,-0.5,-0.35])]:
            await pg.evaluate("(a)=>{const p=window.__SC().player; p.x=a[0]; p.y=a[1]; p.z=a[2]; p.yaw=a[3]; p.pitch=a[4]; p.vy=0;}",pos)
            await pg.wait_for_timeout(1500); await pg.screenshot(path=nm+'.png')
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{const S=window.__SC(); S.setCells({'0,0':['woning','woning','woning'],'0,1':['pad']}); S.renderer.render=()=>{};}"); await pg.wait_for_timeout(500)
        await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(500)
        async def walk(x,z,yaw,n=12,y=None):
            await pg.evaluate("([x,z,yaw,y])=>{const p=window.__SC().player; p.x=x; p.z=z; if(y!==null) p.y=y; p.yaw=yaw; p.pitch=0;}",[x,z,yaw,y])
            await pg.keyboard.down('w'); tr=[]
            for i in range(n):
                await pg.wait_for_timeout(300); tr.append(await pg.evaluate("()=>{const p=window.__SC().player; return [+p.x.toFixed(1),+p.z.toFixed(1),+p.y.toFixed(2)]}"))
            await pg.keyboard.up('w'); return tr
        import math
        t1=await walk(-0.6, 0.3, 0.0, 14, 0.25); print('steek 1', t1)
        t2=await walk(0.6, t1[-1][1], math.pi, 16); print('steek 2', t2)
        print('fouten:',errs[:3]); await b.close()
asyncio.run(main())
