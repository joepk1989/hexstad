# Winkelcentrum: voorbeeld laden (129 modules in vier lagen), stapelen via klik op een dak, lopen over de galerij
import asyncio, os, json
from playwright.async_api import async_playwright
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1280,"height":760}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('hexstad-set',JSON.stringify({terr:'laag',shadow:'uit',tv:1}))}catch(e){}")
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{const kp=document.getElementById('keysPanel'); if(kp) kp.hidden=true;}")
        wc=await pg.evaluate("()=>window.__mods.filter(m=>m.cat==='Winkelcentrum').map(m=>m.name)"); print('bibliotheek:', len(wc), wc)
        await pg.evaluate("()=>document.getElementById('menuBtn').click()"); await pg.wait_for_timeout(300)
        await pg.evaluate("()=>document.querySelector('[data-act=mall]').click()"); await pg.wait_for_timeout(6000)
        r=await pg.evaluate("""()=>{const S=window.__SC(), c=S.getCells(); const L={}; for(const I of c.inst) L[I.lv||0]=(L[I.lv||0]||0)+1; return {n:c.inst.length, lagen:L, meshes:S.scene.children.filter(o=>o.userData&&o.userData.inst).length}}""")
        print('geladen:', json.dumps(r))
        await pg.screenshot(path='mall_overzicht.png', timeout=300000)
        # dichterbij: de passage op de eerste verdieping
        await pg.evaluate("()=>{const S=window.__SC(); S.orbit.target.set(10,6,-5); S.orbit.dist=90; S.orbit.phi=1.0; S.orbit.theta=2.4; S.applyOrbit();}"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path='mall_passage.png', timeout=300000)
        # stapelen: kies 'Winkelcentrum · winkel', klik op een dak van een module op laag 3 (via pick)
        await pg.evaluate("()=>{[...document.querySelectorAll('.pal-tab')].find(t=>t.textContent==='Modules').click()}"); await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>{const i=window.__mods.findIndex(m=>m.name==='Winkelcentrum · galerij'); document.querySelector('.modcard[data-mi=\"'+i+'\"]').click()}"); await pg.wait_for_timeout(500)
        # vind het hoogste exemplaar en bepaal schermpositie van zijn dak
        pos=await pg.evaluate("""()=>{const S=window.__SC(), c=S.getCells(); const I=c.inst.filter(x=>(x.lv||0)===3)[0]; const w=S.scene.children.find(o=>o.userData&&o.userData.inst===I); const b=new THREE.Box3().setFromObject(w); const v=new THREE.Vector3((b.min.x+b.max.x)/2,b.max.y,(b.min.z+b.max.z)/2).project(S.camera); return {x:(v.x+1)/2*innerWidth, y:(1-v.y)/2*innerHeight, q:I.q, r:I.r, top:b.max.y}}""")
        print('dak op laag 3:', pos)
        await pg.mouse.move(pos['x'],pos['y']); await pg.wait_for_timeout(600)
        print('pick:', await pg.evaluate("([x,y])=>{const S=window.__SC(); const r=S.pick(x,y); return r && {lv:r.lv, side:r.side, inst:!!r.inst, place:r.place}}",[pos['x'],pos['y']]))
        await pg.mouse.click(pos['x'],pos['y']); await pg.wait_for_timeout(1500)
        r2=await pg.evaluate("()=>{const S=window.__SC(), c=S.getCells(); const top=c.inst.filter(x=>(x.lv||0)===4); return top.map(I=>[I.m.name,I.q,I.r,I.lv])}"); print('gestapeld op laag 4:', r2)
        await pg.screenshot(path='mall_stapel.png', timeout=300000)
        # lopen: zet de speler op de galerij (laag 1) en controleer de vloerhoogte
        g=await pg.evaluate("""()=>{const S=window.__SC(), c=S.getCells(); const I=c.inst.find(x=>x.m.name==='Winkelcentrum · galerij'&&(x.lv||0)===1); if(!I) return null; const w=S.cellXZ?null:null; const cw={x:9*Math.sqrt(3)*(I.q+I.r/2), z:13.5*I.r}; S.player.x=cw.x+6.8; S.player.z=cw.z; S.player.y=20; S.player.vy=0; return [I.q,I.r,cw.x+6.8,cw.z]}""")
        print('galerij laag1:', g)
        if g:
            await pg.evaluate("()=>document.getElementById('modeBtn').click()"); await pg.wait_for_timeout(1500)
            await pg.evaluate("([x,z])=>{const S=window.__SC(); S.player.x=x; S.player.z=z; S.player.y=20; S.player.vy=0;}",[g[2],g[3]]); await pg.wait_for_timeout(3000)
            print('speler op galerij:', await pg.evaluate("()=>{const S=window.__SC(); return [S.player.x.toFixed(1),S.player.y.toFixed(2),S.player.z.toFixed(1)]}"))
            await pg.screenshot(path='mall_lopen.png', timeout=300000)
        print('fouten:',errs[:5]); await b.close()
asyncio.run(main())
