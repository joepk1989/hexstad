import asyncio, json
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1100,"height":700}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>document.querySelector('[data-act=empty]').click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("()=>{document.querySelectorAll('.pal-tab')[5].click(); [...document.querySelectorAll('.modcard')].find(c=>c.classList.contains('add')).click();}")
        await pg.wait_for_timeout(800)
        vis=await pg.evaluate("()=>!document.getElementById('mmApp').hidden"); print('maker open',vis, errs)
        # helper: world → screen in maker canvas
        async def click_w(x,z,button='left'):
            sx,sy=await pg.evaluate("([x,z])=>{const c=document.getElementById('mm_cv').getBoundingClientRect(); const E=window.__MME; const s=E.view.s; return [c.left+c.width/2+(x-E.view.x)*s, c.top+c.height/2+(z-E.view.z)*s]}",[x,z])
            await pg.mouse.click(sx,sy,button=button)
        async def drag_w(x0,z0,x1,z1):
            a=await pg.evaluate("([x,z])=>{const c=document.getElementById('mm_cv').getBoundingClientRect(); const E=window.__MME; const s=E.view.s; return [c.left+c.width/2+(x-E.view.x)*s, c.top+c.height/2+(z-E.view.z)*s]}",[x0,z0])
            b2=await pg.evaluate("([x,z])=>{const c=document.getElementById('mm_cv').getBoundingClientRect(); const E=window.__MME; const s=E.view.s; return [c.left+c.width/2+(x-E.view.x)*s, c.top+c.height/2+(z-E.view.z)*s]}",[x1,z1])
            await pg.mouse.move(*a); await pg.mouse.down(); await pg.mouse.move(*b2,steps=8); await pg.mouse.up()
        # vloer schilderen (sleep over het midden)
        await pg.keyboard.press('f'); await drag_w(-4,-3,4,3); await drag_w(-4,3,4,-3); await drag_w(-5,0,5,0)
        # muren: vierkantachtig: van punt (-3.9,-4.5)... gebruik rasterpunten: P(i,j)=(i*ts*0.866, i*ts/2+j*ts), ts=2.25
        ts=2.25; P=lambda i,j:(i*ts*0.8660254, i*ts/2+j*ts)
        await pg.keyboard.press('w')
        await drag_w(*P(-2,-1),*P(2,-3))   # richting d=5 (1,-1): van (-2,-1) 4 stappen → (2,-5)? we drag to (2,-3) → beste richting
        await drag_w(*P(-2,-1),*P(-2,3))   # d=1 omhoog 4 stappen
        await drag_w(*P(2,-3),*P(2,1))
        await drag_w(*P(-2,3),*P(2,1))
        await pg.keyboard.press('g'); await click_w(0,0)
        await pg.keyboard.press('d'); await click_w(*((P(-2,-1)[0]+P(-2,0)[0])/2,(P(-2,-1)[1]+P(-2,0)[1])/2))  # deur in linker muur
        await pg.keyboard.press('r'); await click_w(*((P(2,-3)[0]+P(2,-2)[0])/2,(P(2,-3)[1]+P(2,-2)[1])/2))
        await pg.keyboard.press('t'); await drag_w(*P(-1,0),*P(1,0))
        await pg.keyboard.press('b'); await click_w(-3,2)
        await pg.keyboard.press('PageUp'); await pg.keyboard.press('m'); await click_w(0,0); await pg.keyboard.press('g'); await click_w(0,0)
        await pg.keyboard.press('k'); await click_w(0,0)
        st=await pg.evaluate("()=>{const m=window.__MME.m; return m.lv.map(L=>({f:Object.keys(L.f).length,w:Object.keys(L.w).length,s:L.s.length,r:Object.keys(L.r).length,o:L.o.length, open:Object.values(L.w).filter(w=>w.o).map(w=>w.o)}))}")
        print(json.dumps(st))
        await pg.keyboard.press('PageDown'); await pg.wait_for_timeout(300); await pg.screenshot(path='mk2d.png')
        await pg.keyboard.press('3'); await pg.wait_for_timeout(1500); await pg.screenshot(path='mk3d.png')
        await pg.fill('#mm_name','Proefwoning'); await pg.click('#mm_bSave'); await pg.wait_for_timeout(500)
        n=await pg.evaluate("()=>window.__mods.length"); print('modules',n)
        await pg.click('#mm_bClose'); await pg.wait_for_timeout(500)
        ok=await pg.evaluate("()=>{const S=window.__SC(); const cs=[...document.querySelectorAll('.modcard')]; const c=cs.find(x=>x.title.startsWith('Proefwoning')); c.click(); return S.place(1,1)}"); print('placed',ok)
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(15,2,15); S.orbit.phi=0.9; S.orbit.dist=45; S.orbit.theta=0.8; S.applyOrbit();}")
        await pg.wait_for_timeout(2500); await pg.screenshot(path='mkcity.png')
        print(errs[:4]); await b.close()
asyncio.run(main())
