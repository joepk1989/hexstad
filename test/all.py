import asyncio, json
from playwright.async_api import async_playwright
import os
HERE=os.path.dirname(os.path.abspath(__file__)); DIST=os.path.join(HERE,'..','dist','hexstad.html'); THREE=os.path.join(HERE,'node_modules','three','build','three.min.js'); EMB=os.path.join(HERE,'out','emb.html'); os.makedirs(os.path.join(HERE,'out'),exist_ok=True); os.chdir(os.path.join(HERE,'out'))
src=open(DIST,encoding='utf-8').read().replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','file://'+THREE).replace('<head>','<head><meta charset="utf-8">',1)
open(EMB,'w',encoding='utf-8').write(src)
single=['woning','kantoor','dak','park','water','pad','looppad','trap0','helling0','trappad0','hofhelling0','blok','muur0','tunnel','tribune0','zuilen','hof','kuil','heuvel']
stacks=[['blok','woning'],['zuilen','pad'],['blok','looppad'],['heuvel','park'],['zuilen','blok','kantoor'],['kuil','pad'],['woning','dak']]
cells={}
for i,t in enumerate(single): cells[f"{i-9},-3"]=[t]
for i,s in enumerate(stacks): cells[f"{i-3},-5"]=s
for q in range(-6,7): cells[f"{q},0"]=['weg']          # oude vakweg
for r in range(1,4): cells[f"0,{r}"]=['weg']
shots_done=[]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={"width":1000,"height":640}); errs=[]; cons=[]
        pg.on('pageerror',lambda e:errs.append((len(shots_done),str(e),(getattr(e,'stack','') or '')[:300]))); pg.on('console',lambda m: cons.append(m.text) if m.type=='error' and 'fonts' not in m.text and 'TUNNEL' not in m.text else None)
        await pg.goto('file://'+EMB,timeout=120000); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>document.querySelector('[data-act=empty]').click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("(c)=>window.__SC().setCells(c)",cells); await pg.wait_for_timeout(1500)
        # modules plaatsen
        await pg.evaluate("()=>document.querySelectorAll('.pal-tab')[5].click()"); await pg.wait_for_timeout(200)
        await pg.evaluate("()=>{const S=window.__SC(); const cs=document.querySelectorAll('.modcard'); for(let i=0;i<cs.length-1;i++){cs[i].click(); S.place(i-3,4);} S.cars.setOn(true); S.cars.setForce(6); S.people.setOn(true);}")
        st=await pg.evaluate("()=>{const S=window.__SC(); const c=S.getCells(); return {cells:c.size, paths:(c.paths||[]).length, inst:(c.inst||[]).length, roadCells:[...c].filter(([k,v])=>v.some(t=>t==='weg')).length}}"); print('na laden',st)
        await pg.wait_for_timeout(8000)
        for name,t,phi,dist,th in [('rijL',[-110,0,-40],0.8,95,0.3),('rijM',[-30,0,-40],0.8,95,0.3),('rijR',[50,0,-40],0.8,95,0.3),('stapels',[-47,0,-67],0.8,80,0.3),('modules',[25,0,54],0.8,90,0.3)]:
            await pg.evaluate("([t,phi,dist,th])=>{const S=window.__SC(); S.orbit.target.set(t[0],t[1],t[2]); S.orbit.phi=phi; S.orbit.dist=dist; S.orbit.theta=th; S.applyOrbit();}",[t,phi,dist,th])
            await pg.wait_for_timeout(2500); await pg.screenshot(path=f'all_{name}.png'); shots_done.append(name)
        r=await pg.evaluate("()=>{const S=window.__SC(); return {cars:S.cars.vecStats&&S.cars.vecStats(), people:S.people.vecStats&&S.people.vecStats(), cells:S.getCells().size, paths:(S.getCells().paths||[]).length}}"); print(json.dumps(r)[:400])
        bad=await pg.evaluate("()=>{const S=window.__SC(); const out=[]; S.scene.traverse(o=>{ if(o.isMesh && Array.isArray(o.material) && o.geometry.groups.some(g=>!o.material[g.materialIndex]) || (o.isMesh && o.material && Array.isArray(o.material)&&o.material.some(m=>!m))) out.push([o.type,o.name,o.userData&&Object.keys(o.userData).join(),o.position.x|0,o.position.z|0,o.parent&&o.parent.type, o.geometry&&o.geometry.type])}); return out.slice(0,10)}"); print('bad',bad)
        # lopen
        await pg.evaluate("()=>document.getElementById('modeBtn')?.click()"); await pg.wait_for_timeout(500)
        for k in ['w','d','w',' ','s']: await pg.keyboard.down(k); await pg.wait_for_timeout(400); await pg.keyboard.up(k)
        await pg.screenshot(path='all_lopen.png')
        print('errors',errs[:5],'console',cons[:5]); await b.close()
asyncio.run(main())
